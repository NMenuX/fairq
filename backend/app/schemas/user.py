"""
User schemas with strict input validation.
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


class UserBase(BaseModel):
    """Base user schema with validation."""
    email: EmailStr = Field(..., description="User email address")
    full_name: str | None = Field(
        default=None, 
        max_length=100,
        description="Full name of the user"
    )
    is_active: bool = Field(default=True)

    class Config:
        extra = "forbid"  # Reject unexpected fields


class UserCreate(UserBase):
    """Schema for user registration with password validation."""
    password: str = Field(
        ..., 
        min_length=8, 
        max_length=128,
        description="Password (8-128 characters)"
    )
    role: str = Field(
        default="admin", 
        max_length=50,
        description="User role"
    )

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """
        Enforce password complexity.
        OWASP recommendation: min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit.
        """
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r'[A-Z]', v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r'[a-z]', v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r'\d', v):
            raise ValueError("Password must contain at least one digit")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        """Restrict allowed roles."""
        allowed_roles = {"admin", "staff", "operator"}
        if v.lower() not in allowed_roles:
            raise ValueError(f"Role must be one of: {', '.join(allowed_roles)}")
        return v.lower()


class UserOut(UserBase):
    """Schema for user responses (no password!)."""
    id: int
    role: str

    class Config:
        from_attributes = True
        extra = "ignore"


class Token(BaseModel):
    """JWT token response schema."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """JWT token payload schema."""
    email: str | None = None
