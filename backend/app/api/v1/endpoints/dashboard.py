from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.api.deps import get_current_user, get_session
from app.models import User, Project, Task, ProjectStatus, TaskStatus, Priority
from app.schemas.dashboard import DashboardOut, HealthSnapshot, ThisWeekTask
from app.schemas.project import ProjectOut
from app.schemas.task import PRIORITY_OUT

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardOut)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    projects = (await session.execute(
        select(Project).where(Project.owner_id == current_user.id)
    )).scalars().all()

    project_ids = [p.id for p in projects]

    def tasks_filter():
        if project_ids:
            return Task.project_id.in_(project_ids)
        return Task.project_id == -1

    active = [p for p in projects if p.status == ProjectStatus.active]
    done_tasks_count = (await session.execute(
        select(func.count(Task.id)).where(
            tasks_filter(),
            Task.status == TaskStatus.done,
        )
    )).scalar() or 0

    cutoff_zombie = datetime.now(timezone.utc) - timedelta(days=14)

    healthy = sum(1 for p in active if p.health_score >= 70)
    at_risk = sum(1 for p in active if 40 <= p.health_score < 70)
    critical = sum(1 for p in active if p.health_score < 40)
    zombie = sum(
        1 for p in active
        if p.last_activity_at and p.last_activity_at.replace(tzinfo=timezone.utc) < cutoff_zombie
    )

    # velocity: tasks completed per day for last 28 days
    velocity = []
    for i in range(27, -1, -1):
        day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        count = (await session.execute(
            select(func.count(Task.id)).where(
                tasks_filter(),
                Task.status == TaskStatus.done,
                Task.updated_at >= day_start,
                Task.updated_at < day_end,
            )
        )).scalar() or 0
        velocity.append(count)

    # tasks due this week (Mon–Sun of current week, not yet done)
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=7)

    week_tasks_rows = []
    if project_ids:
        week_tasks_rows = (await session.execute(
            select(Task, Project).join(Project, Task.project_id == Project.id).where(
                Task.project_id.in_(project_ids),
                Task.status != TaskStatus.done,
                Task.due_date >= week_start,
                Task.due_date < week_end,
            ).order_by(Task.due_date)
        )).all()

    project_name_map = {p.id: p.name for p in projects}
    tasks_this_week = [
        ThisWeekTask(
            id=str(t.id),
            title=t.title,
            project=project_name_map.get(t.project_id, ""),
            due=t.due_date.strftime("%a %b %d") if t.due_date else "",
            overdue=t.overdue or (t.due_date.replace(tzinfo=timezone.utc) < today if t.due_date else False),
            priority=PRIORITY_OUT.get(t.priority, "med"),
        )
        for t, _ in week_tasks_rows
    ]

    top = sorted(active, key=lambda p: p.health_score, reverse=True)[:5]
    zombies = [
        p for p in active
        if p.last_activity_at and p.last_activity_at.replace(tzinfo=timezone.utc) < cutoff_zombie
    ]

    return DashboardOut(
        total_projects=len(projects),
        active_projects=len(active),
        total_tasks_done=done_tasks_count,
        health_snapshot=HealthSnapshot(healthy=healthy, at_risk=at_risk, critical=critical, zombie=zombie),
        velocity=velocity,
        top_projects=[ProjectOut.from_orm(p) for p in top],
        zombie_projects=[ProjectOut.from_orm(p) for p in zombies],
        tasks_this_week=tasks_this_week,
    )
