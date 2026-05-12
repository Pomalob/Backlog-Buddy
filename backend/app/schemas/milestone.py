from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class MilestoneCreate(BaseModel):
    title: str
    due_date: Optional[datetime] = None
    done: bool = False


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    due_date: Optional[datetime] = None
    done: Optional[bool] = None


class MilestoneOut(BaseModel):
    id: int
    project_id: int
    title: str
    due_date: Optional[datetime]
    done: bool
    created_at: datetime

    model_config = {"from_attributes": True}
