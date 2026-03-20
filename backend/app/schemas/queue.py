from pydantic import BaseModel
from typing import List


class QueueOverviewItem(BaseModel):
    token_id: int
    number: str
    service_type: str
    status: str
    vulnerability_score: float = 0.0
    wait_minutes: float = 0.0
    counter_id: int | None = None


class QueueOverview(BaseModel):
    items: List[QueueOverviewItem]
