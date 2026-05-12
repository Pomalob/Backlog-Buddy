from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api.deps import get_project_for_user, get_session
from app.models import Project, Reminder
from app.schemas.reminder import ReminderCreate, ReminderOut

router = APIRouter(prefix="/projects/{project_id}/reminders", tags=["reminders"])


@router.get("", response_model=list[ReminderOut])
async def list_reminders(
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    return (await session.execute(
        select(Reminder).where(Reminder.project_id == project.id).order_by(Reminder.fire_at)
    )).scalars().all()


@router.post("", response_model=ReminderOut, status_code=status.HTTP_201_CREATED)
async def create_reminder(
    body: ReminderCreate,
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    r = Reminder(**body.model_dump(), project_id=project.id)
    session.add(r)
    await session.commit()
    await session.refresh(r)
    return r


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reminder(
    reminder_id: int,
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    r = await session.get(Reminder, reminder_id)
    if not r or r.project_id != project.id:
        raise HTTPException(status_code=404, detail="Reminder not found")
    await session.delete(r)
    await session.commit()
