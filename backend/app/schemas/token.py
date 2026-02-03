from datetime import datetime
from pydantic import BaseModel, Field


class TokenBase(BaseModel):
    service_type: str
    nic: str | None = None
    age: int | None = None
    gender: str | None = None
    phone: str | None = None
    language: str | None = None  # 'sinhala', 'english', 'tamil'
    disability: bool = False
    language_barrier: float = 0.0
    vulnerability_score: float = 0.0
    notes: str | None = None


class TokenCreate(TokenBase):
    pass


class TokenOut(TokenBase):
    id: int
    number: str
    counter_id: int | None = None
    status: str = Field(default="WAITING")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


