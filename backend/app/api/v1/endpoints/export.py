from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.api.deps import get_project_for_user, get_session
from app.models import Project
from app.services.export import export_project_json, export_tasks_csv

router = APIRouter(prefix="/projects/{project_id}/export", tags=["export"])


@router.get("/json")
async def export_json(
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    data = await export_project_json(project.id, session)
    return Response(
        content=json.dumps(data, indent=2, default=str),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{project.name}.json"'},
    )


@router.get("/csv")
async def export_csv(
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    content = await export_tasks_csv(project.id, session)
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{project.name}-tasks.csv"'},
    )
