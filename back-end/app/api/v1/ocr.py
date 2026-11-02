# Front-end OCR payload ingestion endpoint
# (Chua, Joseph, Isaac)

from fastapi import APIRouter, UploadFile, File, status

from schemas.ocr import ExtractedEntityResponse
from services.nlp_service import extract_entities
from services.vision import extract_text


router = APIRouter()


@router.post(
    "/extract-label",
    response_model=ExtractedEntityResponse,
    status_code=status.HTTP_200_OK,
)
async def extract_label(file: UploadFile = File(...)):
    """Extract NER entities from an uploaded medicine-label image."""
    image_bytes = await file.read()
    raw_text = await extract_text(image_bytes)
    print(f"\n--- REAL OCR OUTPUT ---\n{raw_text}\n")
    extracted_data = await extract_entities(raw_text)
    print(f"\n--- NLP JSON RESULT ---\n{extracted_data}\n")
    return extracted_data