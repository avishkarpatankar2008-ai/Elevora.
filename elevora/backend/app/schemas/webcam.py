<<<<<<< HEAD
from typing import Optional

from pydantic import BaseModel, Field, StrictBool


class WebcamMetrics(BaseModel):
    """Validated client-derived signals; raw camera frames never reach this API.

    Legacy face metrics remain accepted for compatibility. Optional pose fields
    describe visible geometry only; they must not be interpreted as honesty,
    emotion, intelligence, personality, engagement, or job suitability.
    ``sittingPostureRate`` is only a rough camera-visible upright-torso proxy,
    not proof that a person is sitting or that any posture is medically correct.
    """
=======
from pydantic import BaseModel, Field


class WebcamMetrics(BaseModel):
    """Aggregate observable signals computed CLIENT-SIDE over the session
    (spec's own preferred architecture: Camera -> Browser -> MediaPipe ->
    Metrics -> Backend, never raw frames uploaded). All rates are 0.0-1.0
    fractions of the measured session, not percentages.

    Deliberately just these three. The spec is explicit that only
    observable signals belong here — no emotion, confidence, or attention
    "detection" of any kind, and these three are the ones a face/pose
    landmarker can measure without pretending to read intent."""
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7

    faceVisibleRate: float = Field(ge=0.0, le=1.0)
    lookingAwayRate: float = Field(ge=0.0, le=1.0)
    movementRate: float = Field(ge=0.0, le=1.0)
<<<<<<< HEAD
    sampledFrames: int = Field(ge=0, le=100_000)
    # The UI must submit explicit per-session consent. The route rejects omitted/false consent.
    consentGiven: StrictBool = False

    postureSamples: int = Field(default=0, ge=0, le=100_000)
    sittingPostureRate: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    headShoulderAlignmentRate: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    torsoAlignmentRate: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    postureChangeRate: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    cameraFramingRate: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    landmarkConfidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
=======
    sampledFrames: int = Field(ge=0)
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
