from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from sqlmodel import Field, Relationship, SQLModel


# ─── Enums ───────────────────────────────────────────────────────────────────

class ProjectStatus(str, Enum):
    idea = "idea"
    active = "active"
    paused = "paused"
    done = "done"
    archived = "archived"


class TaskStatus(str, Enum):
    backlog = "backlog"
    in_progress = "in_progress"
    review = "review"
    blocked = "blocked"
    done = "done"


class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class RiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class ReminderType(str, Enum):
    deadline = "deadline"
    resurrection = "resurrection"
    custom = "custom"


# ─── User ────────────────────────────────────────────────────────────────────

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    display_name: str = ""
    avatar_url: str = ""
    telegram_chat_id: str = ""
    notify_telegram: bool = True
    notify_email: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    projects: list["Project"] = Relationship(back_populates="owner")
    refresh_tokens: list["RefreshToken"] = Relationship(back_populates="user")


class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_tokens"

    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(unique=True, index=True)
    user_id: int = Field(foreign_key="users.id")
    expires_at: datetime
    revoked: bool = False

    user: Optional[User] = Relationship(back_populates="refresh_tokens")


# ─── Project ─────────────────────────────────────────────────────────────────

class Project(SQLModel, table=True):
    __tablename__ = "projects"

    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="users.id")
    name: str
    emoji: str = ""
    color: str = "hsl(var(--surface-2))"
    description: str = ""          # shown as "goal" on frontend
    status: ProjectStatus = ProjectStatus.idea
    progress: int = 0              # 0-100, auto-calculated
    health_score: int = 50         # 0-100, auto-calculated
    deadline: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    tags: str = ""                 # comma-separated
    velocity_json: str = "[0,0,0,0,0,0,0,0,0,0,0,0]"  # JSON list[int], 12 weeks
    zombie: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    owner: Optional[User] = Relationship(back_populates="projects")
    tasks: list["Task"] = Relationship(back_populates="project")
    milestones: list["Milestone"] = Relationship(back_populates="project")
    risks: list["Risk"] = Relationship(back_populates="project")
    notes: list["Note"] = Relationship(back_populates="project")
    reminders: list["Reminder"] = Relationship(back_populates="project")


# ─── Task ────────────────────────────────────────────────────────────────────

class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="projects.id")
    title: str
    description: str = ""
    status: TaskStatus = TaskStatus.backlog
    priority: Priority = Priority.medium
    board_order: int = 0
    due_date: Optional[datetime] = None
    overdue: bool = False
    tags_json: str = "[]"          # JSON list[str]
    subtask_done: int = 0
    subtask_total: int = 0
    comments: int = 0
    assignee: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    project: Optional[Project] = Relationship(back_populates="tasks")


# ─── Activity ────────────────────────────────────────────────────────────────

class Activity(SQLModel, table=True):
    __tablename__ = "activities"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    project_id: Optional[int] = Field(default=None)  # no FK — survives deletion
    project_name: str = ""
    action: str                    # "moved", "created", "captured", …
    what: str                      # task or project name
    to_col: Optional[str] = None   # destination column for card moves
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ─── Milestone ───────────────────────────────────────────────────────────────

class Milestone(SQLModel, table=True):
    __tablename__ = "milestones"

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="projects.id")
    title: str
    due_date: Optional[datetime] = None
    done: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    project: Optional[Project] = Relationship(back_populates="milestones")


# ─── Risk ────────────────────────────────────────────────────────────────────

class Risk(SQLModel, table=True):
    __tablename__ = "risks"

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="projects.id")
    title: str
    description: str = ""
    level: RiskLevel = RiskLevel.medium
    probability: int = 50
    impact: int = 50
    mitigated: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    project: Optional[Project] = Relationship(back_populates="risks")


# ─── Note ────────────────────────────────────────────────────────────────────

class Note(SQLModel, table=True):
    __tablename__ = "notes"

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="projects.id")
    content: str = ""
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    project: Optional[Project] = Relationship(back_populates="notes")


# ─── Reminder ────────────────────────────────────────────────────────────────

class Reminder(SQLModel, table=True):
    __tablename__ = "reminders"

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="projects.id")
    type: ReminderType = ReminderType.custom
    message: str = ""
    fire_at: datetime
    sent: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    project: Optional[Project] = Relationship(back_populates="reminders")
