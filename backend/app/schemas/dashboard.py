from pydantic import BaseModel
from app.schemas.project import ProjectOut


class HealthSnapshot(BaseModel):
    healthy: int
    at_risk: int
    critical: int
    zombie: int


class ThisWeekTask(BaseModel):
    id: str
    title: str
    project: str
    due: str
    overdue: bool
    priority: str


class DashboardOut(BaseModel):
    total_projects: int
    active_projects: int
    total_tasks_done: int
    health_snapshot: HealthSnapshot
    velocity: list[int]  # tasks completed per day, last 28 days
    top_projects: list[ProjectOut]
    zombie_projects: list[ProjectOut]
    tasks_this_week: list[ThisWeekTask]
