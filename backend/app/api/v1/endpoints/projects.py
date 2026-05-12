import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api.deps import get_current_user, get_project_for_user, get_session
from app.models import User, Project, Task, Milestone, Risk, Note, Reminder
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut
from app.services.health_score import recalculate_project

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectOut])
async def list_projects(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    projects = (await session.execute(
        select(Project)
        .where(Project.owner_id == current_user.id)
        .order_by(Project.updated_at.desc())
    )).scalars().all()
    return [ProjectOut.from_orm(p) for p in projects]


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    project = Project(
        owner_id=current_user.id,
        name=body.name,
        emoji=body.emoji or body.name[:2].upper(),
        color=body.color,
        description=body.goal,
        status=body.status,
        deadline=body.deadline,
        tags=",".join(body.tags),
        velocity_json=json.dumps(body.velocity),
        zombie=body.zombie,
        last_activity_at=datetime.now(timezone.utc),
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return ProjectOut.from_orm(project)


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project: Project = Depends(get_project_for_user)):
    return ProjectOut.from_orm(project)


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    body: ProjectUpdate,
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    if body.name is not None:
        project.name = body.name
    if body.emoji is not None:
        project.emoji = body.emoji
    if body.color is not None:
        project.color = body.color
    if body.goal is not None:
        project.description = body.goal
    if body.status is not None:
        project.status = body.status
    if body.deadline is not None:
        project.deadline = body.deadline
    if body.tags is not None:
        project.tags = ",".join(body.tags)

    project.updated_at = datetime.now(timezone.utc)
    project.last_activity_at = datetime.now(timezone.utc)
    session.add(project)
    await session.flush()
    await recalculate_project(project.id, session)
    await session.refresh(project)
    return ProjectOut.from_orm(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    pid = project.id
    await session.execute(sa_delete(Reminder).where(Reminder.project_id == pid))
    await session.execute(sa_delete(Note).where(Note.project_id == pid))
    await session.execute(sa_delete(Risk).where(Risk.project_id == pid))
    await session.execute(sa_delete(Milestone).where(Milestone.project_id == pid))
    await session.execute(sa_delete(Task).where(Task.project_id == pid))
    await session.delete(project)
    await session.commit()
