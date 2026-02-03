from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Token(Base):
    __tablename__ = "tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    number: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    service_type: Mapped[str] = mapped_column(String(50), nullable=False)
    nic: Mapped[str | None] = mapped_column(String(12), nullable=True)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(1), nullable=True)
    disability: Mapped[bool] = mapped_column(Boolean, default=False)
    language_barrier: Mapped[float] = mapped_column(Float, default=0.0)
    vulnerability_score: Mapped[float] = mapped_column(Float, default=0.0)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    counter_id: Mapped[int | None] = mapped_column(ForeignKey("counters.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="WAITING", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class Counter(Base):
    __tablename__ = "counters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    service_types: Mapped[str] = mapped_column(String(500), default="")  # Comma-separated service types
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    def get_service_types_list(self) -> list[str]:
        """Parse comma-separated service types into a list"""
        if not self.service_types:
            return []
        return [s.strip() for s in self.service_types.split(",") if s.strip()]
    
    def set_service_types_list(self, service_types: list[str]):
        """Set service types from a list"""
        self.service_types = ",".join(service_types)



class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    role: Mapped[str] = mapped_column(String(50), default="admin")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
