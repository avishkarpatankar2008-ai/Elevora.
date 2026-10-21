from datetime import datetime
<<<<<<< HEAD
from typing import Literal, Optional
=======
from typing import Literal
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7

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
<<<<<<< HEAD
    aiProcessing: Literal["private", "external"] = "private"
    """``private`` (default): nothing you provide is sent to an external AI
    provider. ``external``: resume/JD text, answers, and transcripts may be sent
    to the configured providers, and only after you consented."""
    externalAiConsentAt: Optional[datetime] = None
    cameraEnabledByDefault: bool = False
    """Legacy preference retained for API compatibility; camera access always requires explicit per-session consent."""
=======
    cameraEnabledByDefault: bool = True
    """Start the interview room with the self-view camera on."""
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7


class UserPublic(BaseModel):
    """What we ever return to the client. Never include passwordHash here."""

    id: str
    email: EmailStr
    name: str
    createdAt: datetime
    preferences: UserPreferences = Field(default_factory=UserPreferences)
