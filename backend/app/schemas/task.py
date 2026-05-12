import json
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models import TaskStatus, Priority, Task


# ─── Translation helpers ─────────────────────────────────────────────────────

STATUS_TO_COLUMN: dict[TaskStatus, str] = {
    TaskStatus.backlog: "Backlog",
    TaskStatus.in_progress: "In Progress",
    TaskStatus.review: "Review",
    TaskStatus.blocked: "In Progress",
    TaskStatus.done: "Done",
}

COLUMN_TO_STATUS: dict[str, TaskStatus] = {
    "Backlog": TaskStatus.backlog,
    "In Progress": TaskStatus.in_progress,
    "Review": TaskStatus.review,
    "Done": TaskStatus.done,
}

PRIORITY_OUT: dict[Priority, str] = {
    Priority.low: "low",
    Priority.medium: "med",
    Priority.high: "high",
    Priority.critical: "high",
}

PRIORITY_IN: dict[str, Priority] = {
    "low": Priority.low,
    "med": Priority.medium,
    "high": Priority.high,
}


# ─── Schemas ─────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    status: TaskStatus = TaskStatus.backlog
    priority: Priority = Priority.medium
    board_order: int = 0
    due_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[Priority] = None
    board_order: Optional[int] = None
    due_date: Optional[datetime] = None
    overdue: Optional[bool] = None
    subtask_done: Optional[int] = None
    subtask_total: Optional[int] = None
    comments: Optional[int] = None
    assignee: Optional[str] = None
    tags_json: Optional[str] = None


class TaskOut(BaseModel):
    id: int
    project_id: int
    title: str
    description: str
    status: TaskStatus
    priority: Priority
    board_order: int
    due_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class KanbanReorder(BaseModel):
    task_id: int
    new_status: TaskStatus
    new_order: int


class KanbanTaskOut(BaseModel):
    """Frontend-compatible Task shape for kanban view."""
    id: str
    title: str
    priority: str       # "low" | "med" | "high"
    due: Optional[str]
    overdue: bool
    tags: list[str]
    subtaskDone: int
    subtaskTotal: int
    comments: int
    assignee: Optional[str]

    @classmethod
    def from_orm(cls, t: Task) -> "KanbanTaskOut":
        due_str: Optional[str] = None
        if t.due_date:
            due_str = t.due_date.strftime("%b %d")
        return cls(
            id=str(t.id),
            title=t.title,
            priority=PRIORITY_OUT.get(t.priority, "med"),
            due=due_str,
            overdue=t.overdue,
            tags=json.loads(t.tags_json) if t.tags_json else [],
            subtaskDone=t.subtask_done,
            subtaskTotal=t.subtask_total,
            comments=t.comments,
            assignee=t.assignee or None,
        )


# KanbanData shape returned to frontend
KanbanOut = dict[str, list[KanbanTaskOut]]
