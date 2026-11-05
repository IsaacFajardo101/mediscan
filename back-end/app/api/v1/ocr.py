# Front-end OCR payload ingestion endpoint
# (Chua, Joseph, Isaac)

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from schemas.ocr import OCRResponse
from services.data_linker import link_medicine_record
from services.nlp_service import extract_entities
from services.vision import extract_text


router = APIRouter()


@router.post(
    "/extract-label",
    response_model=OCRResponse,
    status_code=status.HTTP_200_OK,
)
async def extract_label(
    file: UploadFile = File(
        ...,
        description="Medicine-label image for OCR and medicine matching.",
    ),
    db: AsyncSession | None = Depends(get_db),
):
    """Extract NER entities from an uploaded medicine-label image."""
    image_bytes = await file.read()
    raw_text = await extract_text(image_bytes)
    extracted_data = await extract_entities(raw_text)
    print(f"\n--- NLP JSON RESULT ---\n{extracted_data}\n")
    linked_medicine = (
        await link_medicine_record(db, extracted_data)
        if db is not None
        else None
    )
    if linked_medicine:
        print(
            "\n--- SUGGESTED MEDICINE ---\n"
            f"Name: {linked_medicine.fda_brandname or linked_medicine.fda_genericname}\n"
            f"Dosage: {linked_medicine.fda_dosage_strength or 'Not detected'}\n"
            f"Accuracy: {linked_medicine.confidence_percentage}% "
            f"({linked_medicine.confidence_level.upper()})\n"
            f"Guidance: {linked_medicine.accuracy_guidance}\n"
        )
    else:
        print(
            "\n--- SUGGESTED MEDICINE ---\n"
            "No match found\n"
            "Accuracy: 0% (LOW)\n"
            "Guidance: Use a clear, well-lit photo showing the full brand or generic name and dosage.\n"
        )
    return OCRResponse(
        success=True,
        code=status.HTTP_200_OK,
        message="OCR and medicine extraction completed.",
        entities=extracted_data,
        suggested_medicines=[linked_medicine] if linked_medicine else [],
    )
