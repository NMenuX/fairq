"""
Token schemas with strict input validation.
All user inputs are validated for type, length, and format.
"""
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, field_validator
import re


class TokenBase(BaseModel):
    """
    Base token schema with strict validation.
    All string fields have length limits to prevent abuse.
    """
    service_type: str = Field(
        ..., 
        min_length=1, 
        max_length=50,
        description="Type of service requested"
    )
    nic: str | None = Field(
        default=None, 
        max_length=12,
        description="National Identity Card number (9 or 12 characters)"
    )
    age: int | None = Field(
        default=None, 
        ge=0, 
        le=150,
        description="Age in years (0-150)"
    )
    gender: str | None = Field(
        default=None, 
        max_length=10,
        description="Gender (M, F, or Other)"
    )
    phone: str | None = Field(
        default=None, 
        max_length=15,
        description="Phone number for SMS notifications"
    )
    language: Literal["sinhala", "english", "tamil"] | None = Field(
        default=None,
        description="Preferred language for service"
    )
    disability: bool = Field(
        default=False,
        description="Requires disability access"
    )
    language_barrier: float = Field(
        default=0.0, 
        ge=0.0, 
        le=1.0,
        description="Language barrier score (0.0-1.0)"
    )
    vulnerability_score: float = Field(
        default=0.0, 
        ge=0.0, 
        le=2.0,
        description="Overall vulnerability score (0.0-2.0)"
    )
    notes: str | None = Field(
        default=None, 
        max_length=500,
        description="Additional notes"
    )

    # Reject unexpected fields (OWASP: Input Validation)
    class Config:
        extra = "forbid"  # Reject any fields not defined in schema

    @field_validator("nic")
    @classmethod
    def validate_nic(cls, v: str | None) -> str | None:
        """Validate NIC format (Sri Lankan)."""
        if v is None:
            return v
        v = v.strip().upper()
        # Old format: 9 digits + V/X, New format: 12 digits
        if not re.match(r'^(\d{9}[VX]|\d{12})$', v):
            raise ValueError("Invalid NIC format. Use XXXXXXXXV or XXXXXXXXXXXX")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        """Validate phone number format."""
        if v is None:
            return v
        # Remove spaces and dashes
        v = re.sub(r'[\s\-]', '', v)
        # Basic validation: 9-15 digits, optionally starting with +
        if not re.match(r'^\+?\d{9,15}$', v):
            raise ValueError("Invalid phone number format")
        return v

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str | None) -> str | None:
        """Validate gender value."""
        if v is None:
            return v
        allowed = {"M", "F", "OTHER", "MALE", "FEMALE"}
        if v.upper() not in allowed:
            raise ValueError("Gender must be M, F, or Other")
        return v.upper()[0] if v.upper() in {"MALE", "FEMALE"} else v.upper()


class TokenCreate(TokenBase):
    """Schema for creating a new token."""
    pass


class TokenOut(TokenBase):
    """Schema for token responses."""
    id: int
    number: str = Field(max_length=20)
    counter_id: int | None = None
    status: str = Field(default="WAITING", max_length=20)
    created_at: datetime
    updated_at: datetime
    estimated_wait_minutes: int | None = Field(
        default=None, 
        description="Estimated wait time in minutes"
    )

    class Config:
        from_attributes = True
        extra = "ignore"  # Allow extra fields in output (from DB)
