from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api.deps import get_current_user, get_session
from app.models import Activity, User
from pydantic import BaseModel

router = APIRouter(prefix="/activity", tags=["activity"])


def _relative(dt: datetime) -> str:
    delta = datetime.now(timezone.utc) - dt.replace(tzinfo=timezone.utc)
    secs = delta.total_seconds()
    if secs < 60:
        return "just now"
    if secs < 3600:
        return f"{int(secs // 60)}m"
    if secs < 86400:
        return f"{int(secs // 3600)}h"
    return f"{int(secs // 86400)}d ago"


def _to_dict(a: Activity) -> dict:
    return {
        "who": "you",
        "action": a.action,
        "what": a.what,
        "to": a.to_col,
        "project": a.project_name,
        "when": _relative(a.created_at),
    }


class ActivityIn(BaseModel):
    action: str
    what: str
    to: Optional[str] = None
    project: str = ""
    projectId: Optional[str] = None  # string project id from frontend


@router.get("")
async def list_activity(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    items = (await session.execute(
        select(Activity)
        .where(Activity.user_id == current_user.id)
        .order_by(Activity.created_at.desc())
        .limit(20)
    )).scalars().all()
    return [_to_dict(a) for a in items]


@router.post("")
async def create_activity(
    body: ActivityIn,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    project_id: Optional[int] = None
    if body.projectId and body.projectId.isdigit():
        project_id = int(body.projectId)

    item = Activity(
        user_id=current_user.id,
        project_id=project_id,
        project_name=body.project,
        action=body.action,
        what=body.what,
        to_col=body.to,
    )
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return _to_dict(item)
