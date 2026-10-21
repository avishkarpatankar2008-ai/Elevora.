from datetime import datetime, timezone
from typing import Any

from app.schemas.user import UserPublic


def new_user_document(name: str, email: str, hashed_password: str) -> dict[str, Any]:
    return {
        "name": name,
        "email": email.lower(),
        "passwordHash": hashed_password,
        "createdAt": datetime.now(timezone.utc),
<<<<<<< HEAD
        "preferences": {
            "language": "English",
            "defaultDifficulty": "medium",
            "aiProcessing": "private",
        },
=======
        "preferences": {"language": "English", "defaultDifficulty": "medium"},
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
    }


def user_doc_to_public(doc: dict[str, Any]) -> UserPublic:
    return UserPublic(
        id=str(doc["_id"]),
        email=doc["email"],
        name=doc["name"],
        createdAt=doc["createdAt"],
        preferences=doc.get("preferences", {}),
    )
