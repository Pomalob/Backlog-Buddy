from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
import json

from app.api.deps import get_current_user, get_session
from app.models import User, Project, Task, Milestone, Risk, Note

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/all")
async def export_all(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    projects = (await session.execute(
        select(Project).where(Project.owner_id == current_user.id)
    )).scalars().all()

    project_ids = [p.id for p in projects]

    if project_ids:
        tasks = (await session.execute(select(Task).where(Task.project_id.in_(project_ids)))).scalars().all()
        milestones = (await session.execute(select(Milestone).where(Milestone.project_id.in_(project_ids)))).scalars().all()
        risks = (await session.execute(select(Risk).where(Risk.project_id.in_(project_ids)))).scalars().all()
        notes = (await session.execute(select(Note).where(Note.project_id.in_(project_ids)))).scalars().all()
    else:
        tasks, milestones, risks, notes = [], [], [], []

    tasks_by: dict[int, list] = {}
    for t in tasks:
        tasks_by.setdefault(t.project_id, []).append({
            "title": t.title, "status": t.status, "priority": t.priority,
            "due_date": t.due_date.isoformat() if t.due_date else None,
        })

    milestones_by: dict[int, list] = {}
    for m in milestones:
        milestones_by.setdefault(m.project_id, []).append({
            "title": m.title, "due_date": m.due_date.isoformat() if m.due_date else None, "done": m.done,
        })

    risks_by: dict[int, list] = {}
    for r in risks:
        risks_by.setdefault(r.project_id, []).append({
            "title": r.title, "probability": r.probability, "impact": r.impact, "mitigated": r.mitigated,
        })

    notes_by: dict[int, str] = {n.project_id: n.content for n in notes}

    data = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "user": current_user.email,
        "projects": [
            {
                "name": p.name,
                "goal": p.description,
                "status": p.status,
                "health_score": p.health_score,
                "progress": p.progress,
                "tags": [t.strip() for t in p.tags.split(",") if t.strip()] if p.tags else [],
                "deadline": p.deadline.isoformat() if p.deadline else None,
                "tasks": tasks_by.get(p.id, []),
                "milestones": milestones_by.get(p.id, []),
                "risks": risks_by.get(p.id, []),
                "notes": notes_by.get(p.id, ""),
            }
            for p in projects
        ],
    }

    return Response(
        content=json.dumps(data, indent=2, default=str),
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="backlog-buddy-export.json"'},
    )
