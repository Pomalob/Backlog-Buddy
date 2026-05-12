from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api.deps import get_project_for_user, get_session
from app.models import Project, Risk
from app.schemas.risk import RiskCreate, RiskUpdate, RiskOut
from app.services.health_score import recalculate_project

router = APIRouter(prefix="/projects/{project_id}/risks", tags=["risks"])


@router.get("", response_model=list[RiskOut])
async def list_risks(
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    return (await session.execute(select(Risk).where(Risk.project_id == project.id))).scalars().all()


@router.post("", response_model=RiskOut, status_code=status.HTTP_201_CREATED)
async def create_risk(
    body: RiskCreate,
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    r = Risk(**body.model_dump(), project_id=project.id)
    session.add(r)
    await session.flush()
    await recalculate_project(project.id, session)
    await session.refresh(r)
    return r


@router.patch("/{risk_id}", response_model=RiskOut)
async def update_risk(
    risk_id: int,
    body: RiskUpdate,
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    r = await session.get(Risk, risk_id)
    if not r or r.project_id != project.id:
        raise HTTPException(status_code=404, detail="Risk not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(r, k, v)
    session.add(r)
    await session.flush()
    await recalculate_project(project.id, session)
    await session.refresh(r)
    return r


@router.delete("/{risk_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_risk(
    risk_id: int,
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    r = await session.get(Risk, risk_id)
    if not r or r.project_id != project.id:
        raise HTTPException(status_code=404, detail="Risk not found")
    await session.delete(r)
    await session.flush()
    await recalculate_project(project.id, session)
