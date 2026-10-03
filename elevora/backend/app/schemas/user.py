from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class UserPreferences(BaseModel):
    language: str = "English"
    defaultDifficulty: Literal["easy", "medium", "hard"] = "medium"


class UserPublic(BaseModel):
    """What we ever return to the client. Never include passwordHash here."""

    id: str
    email: EmailStr
    name: str
    createdAt: datetime
    preferences: UserPreferences = Field(default_factory=UserPreferences)
