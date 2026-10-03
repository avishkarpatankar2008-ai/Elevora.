from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class UserPreferences(BaseModel):
    """Practice defaults applied when a new interview is configured.

    Deliberately small: every field here is something the product actually
    reads back and acts on. Adding a switch the UI ignores would be a lie.
    """

    language: str = "English"
    defaultDifficulty: Literal["easy", "medium", "hard"] = "medium"
    autoPlayQuestion: bool = False
    """Speak each new question automatically when it appears."""
    cameraEnabledByDefault: bool = True
    """Start the interview room with the self-view camera on."""


class UserPublic(BaseModel):
    """What we ever return to the client. Never include passwordHash here."""

    id: str
    email: EmailStr
    name: str
    createdAt: datetime
    preferences: UserPreferences = Field(default_factory=UserPreferences)
