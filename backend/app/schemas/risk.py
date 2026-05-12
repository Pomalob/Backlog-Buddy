from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models import RiskLevel


class RiskCreate(BaseModel):
    title: str
    description: str = ""
    level: RiskLevel = RiskLevel.medium
    probability: int = 50
    impact: int = 50


class RiskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    level: Optional[RiskLevel] = None
    probability: Optional[int] = None
    impact: Optional[int] = None
    mitigated: Optional[bool] = None


class RiskOut(BaseModel):
    id: int
    project_id: int
    title: str
    description: str
    level: RiskLevel
    probability: int
    impact: int
    mitigated: bool
    created_at: datetime

    model_config = {"from_attributes": True}
