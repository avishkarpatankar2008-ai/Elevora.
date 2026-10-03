from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be blank")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserPreferencesUpdate(BaseModel):
    language: Optional[str] = Field(default=None, min_length=2, max_length=40)
    defaultDifficulty: Optional[Literal["easy", "medium", "hard"]] = None


class UserUpdateRequest(BaseModel):
    """Payload for PATCH /auth/me. Everything optional — only what's supplied
    is changed. Email and password are deliberately out of scope here (they
    need their own verification flows, not a quiet settings-page update)."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    preferences: Optional[UserPreferencesUpdate] = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be blank")
        return v
