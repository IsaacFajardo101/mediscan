import io
import sys
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

APP_DIRECTORY = Path(__file__).resolve().parents[1] / "app"
if str(APP_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(APP_DIRECTORY))

from api.v1 import ocr
from db.database import get_db
from main import app
from schemas.ocr import ExtractedEntityResponse, LinkedMedicineResponse


def test_extract_label_returns_entities_and_linked_medicine(monkeypatch):
    async def fake_extract_text(_image_bytes):
        return "BIOGESIC PARACETAMOL 500 mg"

    async def fake_extract_entities(_raw_text):
        return ExtractedEntityResponse(
            medicine_name="BIOGESIC PARACETAMOL",
            dosage="500 mg",
        )

    async def fake_link(_db, _extracted_data):
        return LinkedMedicineResponse(
            fda_id=1,
            fda_registration_id="REG-1",
            fda_approval_id="APP-1",
            fda_brandname="Biogesic",
            fda_genericname="Paracetamol",
            fda_dosage_form="Tablet",
            fda_dosage_strength="500 mg",
            match_type="exact",
            match_score=1.0,
        )

    async def fake_db():
        yield object()

    monkeypatch.setattr(ocr, "extract_text", fake_extract_text)
    monkeypatch.setattr(ocr, "extract_entities", fake_extract_entities)
    monkeypatch.setattr(ocr, "link_medicine_record", fake_link)
    app.dependency_overrides[get_db] = fake_db

    try:
        image_bytes = io.BytesIO()
        Image.new("RGB", (10, 10), "white").save(image_bytes, format="PNG")
        response = TestClient(app).post(
            "/api/v1/ocr/extract-label",
            files={"file": ("label.png", image_bytes.getvalue(), "image/png")},
        )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 200
    payload = response.json()
    assert "raw_text" not in payload
    assert payload["entities"]["medicine_name"] == "BIOGESIC PARACETAMOL"
    assert payload["suggested_medicines"][0]["fda_brandname"] == "Biogesic"
