from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api.deps import get_project_for_user, get_session
from app.models import Project, Milestone
from app.schemas.milestone import MilestoneCreate, MilestoneUpdate, MilestoneOut
from app.services.health_score import recalculate_project

router = APIRouter(prefix="/projects/{project_id}/milestones", tags=["milestones"])


@router.get("", response_model=list[MilestoneOut])
async def list_milestones(
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    return (await session.execute(select(Milestone).where(Milestone.project_id == project.id))).scalars().all()


@router.post("", response_model=MilestoneOut, status_code=status.HTTP_201_CREATED)
async def create_milestone(
    body: MilestoneCreate,
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    m = Milestone(**body.model_dump(), project_id=project.id)
    session.add(m)
    await session.flush()
    await recalculate_project(project.id, session)
    await session.refresh(m)
    return m


@router.patch("/{milestone_id}", response_model=MilestoneOut)
async def update_milestone(
    milestone_id: int,
    body: MilestoneUpdate,
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    m = await session.get(Milestone, milestone_id)
    if not m or m.project_id != project.id:
        raise HTTPException(status_code=404, detail="Milestone not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(m, k, v)
    session.add(m)
    await session.flush()
    await recalculate_project(project.id, session)
    await session.refresh(m)
    return m


@router.delete("/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_milestone(
    milestone_id: int,
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    m = await session.get(Milestone, milestone_id)
    if not m or m.project_id != project.id:
        raise HTTPException(status_code=404, detail="Milestone not found")
    await session.delete(m)
    await session.flush()
    await recalculate_project(project.id, session)
