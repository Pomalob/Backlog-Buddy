from datetime import datetime
from pydantic import BaseModel


class NoteUpsert(BaseModel):
    content: str


class NoteOut(BaseModel):
    id: int
    project_id: int
    content: str
    updated_at: datetime

    model_config = {"from_attributes": True}
