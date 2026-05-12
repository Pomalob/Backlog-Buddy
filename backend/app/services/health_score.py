import json
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models import Project, Task, Milestone, Risk, TaskStatus, RiskLevel


def _activity_score(project: Project) -> int:
    if not project.last_activity_at:
        return 0
    days_since = (datetime.now(timezone.utc) - project.last_activity_at.replace(tzinfo=timezone.utc)).days
    if days_since <= 3:
        return 100
    if days_since <= 7:
        return 75
    if days_since <= 14:
        return 50
    if days_since <= 30:
        return 25
    return 0


def _progress_score(project: Project) -> int:
    return project.progress


def _risk_score(risks: list[Risk]) -> int:
    if not risks:
        return 100
    active = [r for r in risks if not r.mitigated]
    if not active:
        return 100
    high_risks = sum(1 for r in active if r.level == RiskLevel.high)
    med_risks = sum(1 for r in active if r.level == RiskLevel.medium)
    penalty = high_risks * 25 + med_risks * 10
    return max(0, 100 - penalty)


def _milestone_score(milestones: list[Milestone]) -> int:
    if not milestones:
        return 100
    now = datetime.now(timezone.utc)
    total = len(milestones)
    done = sum(1 for m in milestones if m.done)
    overdue = sum(
        1 for m in milestones
        if not m.done and m.due_date and m.due_date.replace(tzinfo=timezone.utc) < now
    )
    base = int(done / total * 100) if total else 100
    penalty = overdue * 20
    return max(0, base - penalty)


def calculate_health_score(
    project: Project,
    tasks: list[Task],
    milestones: list[Milestone],
    risks: list[Risk],
) -> int:
    activity = _activity_score(project)
    progress = _progress_score(project)
    risk = _risk_score(risks)
    milestone = _milestone_score(milestones)

    score = int(activity * 0.30 + progress * 0.40 + risk * 0.20 + milestone * 0.10)
    return max(0, min(100, score))


async def recalculate_project(project_id: int, session: AsyncSession, commit: bool = True) -> int:
    project = await session.get(Project, project_id)
    if not project:
        return 0

    tasks = (await session.execute(select(Task).where(Task.project_id == project_id))).scalars().all()
    milestones = (await session.execute(select(Milestone).where(Milestone.project_id == project_id))).scalars().all()
    risks = (await session.execute(select(Risk).where(Risk.project_id == project_id))).scalars().all()

    done_tasks = sum(1 for t in tasks if t.status == TaskStatus.done)
    if tasks:
        project.progress = int(done_tasks / len(tasks) * 100)

    project.health_score = calculate_health_score(project, list(tasks), list(milestones), list(risks))

    # Rebuild 12-week velocity from tasks already in memory — no extra query needed.
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    weekly = []
    for i in range(11, -1, -1):
        week_start = today - timedelta(weeks=i + 1)
        week_end = today - timedelta(weeks=i)
        count = sum(
            1 for t in tasks
            if t.status == TaskStatus.done
            and t.updated_at
            and week_start <= t.updated_at.replace(tzinfo=timezone.utc) < week_end
        )
        weekly.append(count)
    project.velocity_json = json.dumps(weekly)

    session.add(project)
    if commit:
        await session.commit()
    return project.health_score
