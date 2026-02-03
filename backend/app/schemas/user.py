from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str
    role: str = "admin"

class UserOut(UserBase):
    id: int
    role: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None
