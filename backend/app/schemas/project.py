import json
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, model_validator
from app.models import ProjectStatus, Project


def _relative_time(dt: Optional[datetime]) -> str:
    if not dt:
        return "never"
    delta = datetime.now(timezone.utc) - dt.replace(tzinfo=timezone.utc)
    secs = delta.total_seconds()
    if secs < 60:
        return "just now"
    if secs < 3600:
        return f"{int(secs // 60)}m ago"
    if secs < 86400:
        return f"{int(secs // 3600)}h ago"
    days = int(secs // 86400)
    return f"{days}d ago"


def _due_string(dt: Optional[datetime]) -> str:
    if not dt:
        return "—"
    return dt.strftime("%b %d")


class ProjectCreate(BaseModel):
    name: str
    emoji: str = ""
    color: str = "hsl(var(--surface-2))"
    goal: str = ""
    status: ProjectStatus = ProjectStatus.idea
    deadline: Optional[datetime] = None
    tags: list[str] = []
    velocity: list[int] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    zombie: bool = False


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    emoji: Optional[str] = None
    color: Optional[str] = None
    goal: Optional[str] = None
    status: Optional[ProjectStatus] = None
    deadline: Optional[datetime] = None
    tags: Optional[list[str]] = None


class ProjectOut(BaseModel):
    """Frontend-compatible shape — matches the TypeScript Project type."""
    id: str
    name: str
    emoji: str
    color: str
    goal: str
    status: ProjectStatus
    health: int
    progress: int
    due: str
    deadline_iso: Optional[str] = None
    tags: list[str]
    velocity: list[int]
    lastActive: str
    zombie: bool

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, p: Project) -> "ProjectOut":
        return cls(
            id=str(p.id),
            name=p.name,
            emoji=p.emoji,
            color=p.color,
            goal=p.description,
            status=p.status,
            health=p.health_score,
            progress=p.progress,
            due=_due_string(p.deadline),
            deadline_iso=p.deadline.date().isoformat() if p.deadline else None,
            tags=[t.strip() for t in p.tags.split(",") if t.strip()] if p.tags else [],
            velocity=json.loads(p.velocity_json) if p.velocity_json else [],
            lastActive=_relative_time(p.last_activity_at),
            zombie=p.zombie,
        )
