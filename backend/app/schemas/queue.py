from pydantic import BaseModel
from typing import List


class QueueOverviewItem(BaseModel):
    token_id: int
    number: str
    service_type: str
    status: str
    vulnerability_score: float
    wait_minutes: float


class QueueOverview(BaseModel):
    items: List[QueueOverviewItem]


