from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models import ReminderType


class ReminderCreate(BaseModel):
    type: ReminderType = ReminderType.custom
    message: str = ""
    fire_at: datetime


class ReminderOut(BaseModel):
    id: int
    project_id: int
    type: ReminderType
    message: str
    fire_at: datetime
    sent: bool
    created_at: datetime

    model_config = {"from_attributes": True}
