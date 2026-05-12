"""Seed dev database with sample data. Runs on startup only if DB is empty."""
import json
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.security import hash_password
from app.models import (
    Activity, Milestone, Note, Priority, Project, ProjectStatus,
    Risk, RiskLevel, Task, TaskStatus, User,
)


async def seed(session: AsyncSession) -> None:
    if (await session.execute(select(User))).scalars().first():
        return  # already seeded

    # ── Dev user ──────────────────────────────────────────────────────────────
    user = User(
        email="dev@backlogbuddy.local",
        hashed_password=hash_password("dev-password"),
        display_name="Mira K.",
    )
    session.add(user)
    await session.flush()
    uid = user.id

    now = datetime.now(timezone.utc)

    # ── Projects ──────────────────────────────────────────────────────────────
    projects_data = [
        dict(name="Backlog Buddy", emoji="BB", description="Ship a calmer PM tool for solo devs — MVP launches end of Q2 with auth, projects, and Kanban.", status=ProjectStatus.active, health_score=82, progress=64, deadline=now + timedelta(days=46), tags="saas,react,side-project", velocity_json=json.dumps([3,5,4,6,8,7,9,5,6,8,4,7]), last_activity_at=now - timedelta(hours=2)),
        dict(name="Recipe Nook",   emoji="RN", description="iOS app for archiving family recipes with offline-first sync.", status=ProjectStatus.active, health_score=56, progress=38, deadline=now + timedelta(days=95), tags="ios,swift", velocity_json=json.dumps([2,3,4,2,1,3,2,1,0,2,3,1]), last_activity_at=now - timedelta(days=1)),
        dict(name="Tidegraph",     emoji="TG", description="Tide & weather dashboard for surfers, scraping NOAA into a daily forecast.", status=ProjectStatus.paused, health_score=32, progress=22, tags="data-viz", velocity_json=json.dumps([1,0,0,2,1,0,0,0,0,0,0,0]), last_activity_at=now - timedelta(days=23), zombie=True),
        dict(name="Forestpath",    emoji="FP", description="GPS tracker for trail running with offline maps and elevation profiles.", status=ProjectStatus.idea, health_score=78, progress=8, tags="mobile,maps", velocity_json=json.dumps([0,0,1,2,3,4,3,2,5,4,6,5]), last_activity_at=now - timedelta(hours=5)),
        dict(name="Loopback",      emoji="LP", description="Browser extension for capturing and replaying API requests during dev.", status=ProjectStatus.active, health_score=71, progress=52, deadline=now + timedelta(days=82), tags="devtool", velocity_json=json.dumps([4,5,6,4,3,5,7,6,4,5,4,6]), last_activity_at=now - timedelta(hours=6)),
        dict(name="Quartzboard",   emoji="QZ", description="Mechanical-keyboard build journal with parts inventory and timeline.", status=ProjectStatus.paused, health_score=41, progress=30, tags="hobby,static-site", velocity_json=json.dumps([3,2,1,0,1,0,0,1,0,0,0,1]), last_activity_at=now - timedelta(days=16), zombie=True),
    ]

    created_projects: list[Project] = []
    for pd in projects_data:
        p = Project(owner_id=uid, **pd)
        session.add(p)
        created_projects.append(p)

    await session.flush()
    bb_id = created_projects[0].id

    # ── Kanban tasks for Backlog Buddy ────────────────────────────────────────
    tasks_data = [
        # Backlog
        dict(title="Design Risk Matrix component with hover tooltips", status=TaskStatus.backlog,  priority=Priority.medium,  board_order=0, tags_json=json.dumps(["design"]),                  subtask_total=3),
        dict(title="Sketch onboarding flow for first-time users",       status=TaskStatus.backlog,  priority=Priority.low,     board_order=1, tags_json=json.dumps(["onboarding"]),              comments=1),
        dict(title="Add Telegram bot integration for Quick Capture",    status=TaskStatus.backlog,  priority=Priority.high,    board_order=2, tags_json=json.dumps(["integration", "bot"]),       subtask_total=5),
        dict(title="Research dnd-kit accessibility patterns",           status=TaskStatus.backlog,  priority=Priority.low,     board_order=3, tags_json=json.dumps(["research"])),
        # In Progress
        dict(title="Implement health-score calculation worker",         status=TaskStatus.in_progress, priority=Priority.high,  board_order=0, tags_json=json.dumps(["backend"]),              subtask_done=2, subtask_total=4, comments=3, assignee="M"),
        dict(title="Wire up Kanban drag handle to dnd-kit sensors",    status=TaskStatus.in_progress, priority=Priority.medium, board_order=1, tags_json=json.dumps(["frontend"]),             subtask_done=1, subtask_total=3, comments=1, assignee="M", overdue=True, due_date=now - timedelta(days=5)),
        # Review
        dict(title="Risk matrix data model + zod schema",              status=TaskStatus.review,   priority=Priority.medium,  board_order=0, tags_json=json.dumps(["backend"]),               subtask_done=3, subtask_total=3, comments=2, assignee="M"),
        dict(title="Dashboard velocity chart (recharts)",              status=TaskStatus.review,   priority=Priority.low,     board_order=1, tags_json=json.dumps(["frontend", "viz"]),        subtask_done=4, subtask_total=4, assignee="M"),
        # Done
        dict(title="Set up Tailwind + shadcn theme tokens",            status=TaskStatus.done,     priority=Priority.low,     board_order=0, tags_json=json.dumps(["setup"]),                  subtask_done=1, subtask_total=1, assignee="M"),
        dict(title="Auth via magic link",                              status=TaskStatus.done,     priority=Priority.high,    board_order=1, tags_json=json.dumps(["auth"]),                    subtask_done=5, subtask_total=5, comments=4, assignee="M"),
        dict(title="Project CRUD endpoints",                           status=TaskStatus.done,     priority=Priority.medium,  board_order=2, tags_json=json.dumps(["backend"]),               subtask_done=6, subtask_total=6, comments=1, assignee="M"),
    ]
    for td in tasks_data:
        session.add(Task(project_id=bb_id, **td))

    # ── Notes for Backlog Buddy ───────────────────────────────────────────────
    session.add(Note(
        project_id=bb_id,
        content="# MVP scope decisions\n\nCutting team features for v1. Solo-dev only — single-tenant DB, no invitations, no roles.\n\n## What's in\n- Projects with health score + zombie detection\n- Kanban (4 cols, drag & drop)\n- Quick capture via hotkey + Telegram bot\n- Weekly velocity rollup email (Sunday)\n\n## Code snippet\n```js\nfunction healthScore(p) {\n  const recency  = decay(p.lastActive, 14);\n  const velocity = bound(p.tasksDoneLast4w, 20);\n  const stale    = p.openTasksOver30d * -3;\n  return clamp(recency + velocity + stale, 0, 100);\n}\n```",
    ))

    # ── Activity ──────────────────────────────────────────────────────────────
    activity_data = [
        dict(action="moved",    what="Wire up Kanban drag handle", to_col="In Progress", project_name="Backlog Buddy", created_at=now - timedelta(minutes=12)),
        dict(action="completed", what="Auth via magic link",        project_name="Backlog Buddy", created_at=now - timedelta(hours=2)),
        dict(action="added 3 ideas to", what="Loopback",           project_name="Loopback",       created_at=now - timedelta(hours=6)),
        dict(action="paused",   what="Tidegraph",                   project_name="Tidegraph",      created_at=now - timedelta(days=23)),
        dict(action="created",  what="Forestpath",                  project_name="Forestpath",     created_at=now - timedelta(days=1)),
    ]
    for ad in activity_data:
        session.add(Activity(user_id=uid, project_id=bb_id, **ad))

    await session.commit()
    print("✓ Database seeded.")
