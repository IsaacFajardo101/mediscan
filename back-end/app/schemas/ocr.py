"""Pydantic contracts for OCR, NER, and medicine-linking responses."""

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ImageUploadRequest(BaseModel):
    """Base64 image payload for clients that do not use multipart uploads."""

    model_config = ConfigDict(extra="forbid")

    image_base64: str = Field(
        min_length=1,
        description="Base64-encoded medicine-label image without a data URI prefix.",
    )
    filename: str | None = Field(default=None, max_length=255)
    content_type: Literal["image/jpeg", "image/png", "image/webp"] = "image/jpeg"


class ExtractedEntityResponse(BaseModel):
    """Entities identified in the OCR text by the NER service."""

    model_config = ConfigDict(extra="forbid")

    medicine_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    expiry_date: Optional[str] = None


class LinkedMedicineResponse(BaseModel):
    """A suggested match from the FDA medicine registry."""

    model_config = ConfigDict(extra="forbid")

    fda_id: int = Field(ge=1)
    fda_registration_id: str = Field(min_length=1)
    fda_approval_id: str = Field(min_length=1)
    fda_brandname: str | None = None
    fda_genericname: str = Field(min_length=1)
    fda_dosage_form: str | None = None
    fda_dosage_strength: str | None = None
    fda_manufacturer: str | None = None
    fda_pharmacologic_category: str | None = None
    fda_classification: str | None = None
    match_type: Literal["exact", "fuzzy"] = "exact"
    match_score: float = Field(ge=0, le=1)
    confidence_percentage: int = Field(default=0, ge=0, le=100)
    confidence_level: Literal["max", "high", "medium", "low"] = "low"
    accuracy_guidance: str = Field(
        default="Use a clear, well-lit photo showing the full brand or generic name and dosage.",
        min_length=1,
        max_length=500,
    )


class OCRResponse(BaseModel):
    """Final OCR/NER response returned to an API or mobile client."""

    model_config = ConfigDict(extra="forbid")

    success: bool
    code: int = Field(ge=100, le=599)
    message: str = Field(min_length=1, max_length=500)
    entities: ExtractedEntityResponse
    suggested_medicines: list[LinkedMedicineResponse] = Field(default_factory=list)
