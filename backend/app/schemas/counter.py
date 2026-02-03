from pydantic import BaseModel
from typing import List


class CounterBase(BaseModel):
    name: str
    service_types: List[str] = []  # List of service types this counter can handle
    active: bool = True


class CounterCreate(CounterBase):
    pass


class CounterOut(CounterBase):
    id: int

    class Config:
        from_attributes = True


class CounterUpdate(BaseModel):
    name: str | None = None
    service_types: List[str] | None = None
    active: bool | None = None
