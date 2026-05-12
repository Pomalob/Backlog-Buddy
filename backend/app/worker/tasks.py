import asyncio
from datetime import datetime, timedelta, timezone

from sqlmodel import select

from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models import Project, Reminder, User, ProjectStatus
from app.services.health_score import recalculate_project
from app.services.notifications import send_telegram, send_email


@celery_app.task(name="app.worker.tasks.recalculate_all_health_scores")
def recalculate_all_health_scores():
    async def _inner():
        async with AsyncSessionLocal() as session:
            projects = (await session.execute(
                select(Project).where(Project.status.in_([ProjectStatus.active, ProjectStatus.paused]))
            )).scalars().all()
            for p in projects:
                await recalculate_project(p.id, session)
    asyncio.run(_inner())


@celery_app.task(name="app.worker.tasks.send_deadline_reminders")
def send_deadline_reminders():
    async def _inner():
        now = datetime.now(timezone.utc)
        soon = now + timedelta(days=7)
        async with AsyncSessionLocal() as session:
            rows = (await session.execute(
                select(Project, User).join(User, Project.owner_id == User.id).where(
                    Project.deadline != None,
                    Project.deadline <= soon,
                    Project.deadline >= now,
                    Project.status == ProjectStatus.active,
                )
            )).all()
            for p, owner in rows:
                if not owner.telegram_chat_id:
                    continue
                days_left = (p.deadline.replace(tzinfo=timezone.utc) - now).days
                msg = f"⏰ <b>{p.name}</b> — deadline in <b>{days_left} days</b>!"
                await send_telegram(msg, chat_id=owner.telegram_chat_id)
    asyncio.run(_inner())


@celery_app.task(name="app.worker.tasks.send_resurrection_alerts")
def send_resurrection_alerts():
    async def _inner():
        cutoff = datetime.now(timezone.utc) - timedelta(days=14)
        async with AsyncSessionLocal() as session:
            rows = (await session.execute(
                select(Project, User).join(User, Project.owner_id == User.id).where(
                    Project.status == ProjectStatus.active,
                    Project.last_activity_at <= cutoff,
                )
            )).all()
            for p, owner in rows:
                if not owner.telegram_chat_id:
                    continue
                days = (datetime.now(timezone.utc) - p.last_activity_at.replace(tzinfo=timezone.utc)).days
                msg = f"🧟 <b>{p.name}</b> has been inactive for <b>{days} days</b>. Resurrect it?"
                await send_telegram(msg, chat_id=owner.telegram_chat_id)
    asyncio.run(_inner())


@celery_app.task(name="app.worker.tasks.send_weekly_digest")
def send_weekly_digest():
    async def _inner():
        async with AsyncSessionLocal() as session:
            rows = (await session.execute(
                select(Project, User).join(User, Project.owner_id == User.id).where(
                    Project.status == ProjectStatus.active
                )
            )).all()
            # group by owner
            by_owner: dict[int, tuple[User, list[Project]]] = {}
            for p, owner in rows:
                if owner.id not in by_owner:
                    by_owner[owner.id] = (owner, [])
                by_owner[owner.id][1].append(p)
            for owner, projects in by_owner.values():
                if not owner.telegram_chat_id:
                    continue
                lines = [f"📊 <b>Weekly Digest</b> — {datetime.now(timezone.utc).strftime('%b %d')}\n"]
                for p in projects:
                    state = "🟢" if p.health_score >= 70 else "🟡" if p.health_score >= 40 else "🔴"
                    lines.append(f"{state} <b>{p.name}</b> — health {p.health_score}, progress {p.progress}%")
                await send_telegram("\n".join(lines), chat_id=owner.telegram_chat_id)
    asyncio.run(_inner())


@celery_app.task(name="app.worker.tasks.fire_pending_reminders")
def fire_pending_reminders():
    async def _inner():
        now = datetime.now(timezone.utc)
        async with AsyncSessionLocal() as session:
            reminders = (await session.execute(
                select(Reminder).where(Reminder.fire_at <= now, Reminder.sent == False)
            )).scalars().all()
            for r in reminders:
                await send_telegram(r.message or f"🔔 Reminder for project #{r.project_id}")
                r.sent = True
                session.add(r)
            await session.commit()
    asyncio.run(_inner())
