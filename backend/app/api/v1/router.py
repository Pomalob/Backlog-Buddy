from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth, projects, tasks, milestones, risks, notes,
    reminders, export, dashboard, activity,
)
from app.api.v1.endpoints import export_user

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(dashboard.router)
router.include_router(export_user.router)
router.include_router(projects.router)
router.include_router(tasks.router)
router.include_router(milestones.router)
router.include_router(risks.router)
router.include_router(notes.router)
router.include_router(reminders.router)
router.include_router(export.router)
router.include_router(activity.router)
