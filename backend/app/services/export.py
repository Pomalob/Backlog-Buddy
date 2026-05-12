import csv
import io
import json
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models import Project, Task, Milestone, Risk


async def export_project_json(project_id: int, session: AsyncSession) -> dict:
    project = await session.get(Project, project_id)
    if not project:
        return {}

    tasks = (await session.execute(select(Task).where(Task.project_id == project_id))).scalars().all()
    milestones = (await session.execute(select(Milestone).where(Milestone.project_id == project_id))).scalars().all()
    risks = (await session.execute(select(Risk).where(Risk.project_id == project_id))).scalars().all()

    def _dt(v: datetime | None) -> str | None:
        return v.isoformat() if v else None

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "project": {
            "id": project.id,
            "name": project.name,
            "status": project.status,
            "progress": project.progress,
            "health_score": project.health_score,
            "deadline": _dt(project.deadline),
            "tags": project.tags,
            "description": project.description,
        },
        "tasks": [
            {"id": t.id, "title": t.title, "status": t.status, "priority": t.priority, "due_date": _dt(t.due_date)}
            for t in tasks
        ],
        "milestones": [
            {"id": m.id, "title": m.title, "done": m.done, "due_date": _dt(m.due_date)}
            for m in milestones
        ],
        "risks": [
            {"id": r.id, "title": r.title, "level": r.level, "probability": r.probability, "impact": r.impact, "mitigated": r.mitigated}
            for r in risks
        ],
    }


async def export_tasks_csv(project_id: int, session: AsyncSession) -> str:
    tasks = (await session.execute(select(Task).where(Task.project_id == project_id))).scalars().all()
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=["id", "title", "status", "priority", "board_order", "due_date", "created_at"])
    writer.writeheader()
    for t in tasks:
        writer.writerow({
            "id": t.id,
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "board_order": t.board_order,
            "due_date": t.due_date.isoformat() if t.due_date else "",
            "created_at": t.created_at.isoformat(),
        })
    return buf.getvalue()
