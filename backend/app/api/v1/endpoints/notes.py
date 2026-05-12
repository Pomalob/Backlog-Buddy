from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api.deps import get_project_for_user, get_session
from app.models import Project, Note
from app.schemas.note import NoteUpsert, NoteOut

router = APIRouter(prefix="/projects/{project_id}/notes", tags=["notes"])


@router.get("", response_model=NoteOut | None)
async def get_note(
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    note = (await session.execute(select(Note).where(Note.project_id == project.id))).scalars().first()
    return note


@router.put("", response_model=NoteOut)
async def upsert_note(
    body: NoteUpsert,
    project: Project = Depends(get_project_for_user),
    session: AsyncSession = Depends(get_session),
):
    note = (await session.execute(select(Note).where(Note.project_id == project.id))).scalars().first()
    if note:
        note.content = body.content
        note.updated_at = datetime.now(timezone.utc)
    else:
        note = Note(project_id=project.id, content=body.content)
    session.add(note)
    await session.commit()
    await session.refresh(note)
    return note
