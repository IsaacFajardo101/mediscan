import sys
from pathlib import Path

import pytest

APP_DIRECTORY = Path(__file__).resolve().parents[1] / "app"
if str(APP_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(APP_DIRECTORY))

from schemas.ocr import ExtractedEntityResponse
from schemas.ocr import LinkedMedicineResponse
from services.data_linker import link_medicine_record


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def mappings(self):
        return self

    def all(self):
        return self._rows


class FakeAsyncSession:
    def __init__(self, rows):
        self.rows = rows
        self.statement = None

    async def execute(self, statement):
        self.statement = statement
        return FakeResult(self.rows)


@pytest.mark.asyncio
async def test_linker_uses_keyword_ilike_and_prioritizes_dosage():
    rows = [
        {
            "fda_id": 1,
            "fda_registration_id": "REG-1",
            "fda_approval_id": "APP-1",
            "fda_brandname": "Biogesic",
            "fda_genericname": "Paracetamol",
            "fda_dosage_form": "Tablet",
            "fda_dosage_strength": "250 mg",
        },
        {
            "fda_id": 2,
            "fda_registration_id": "REG-2",
            "fda_approval_id": "APP-2",
            "fda_brandname": "Biogesic",
            "fda_genericname": "Paracetamol",
            "fda_dosage_form": "Tablet",
            "fda_dosage_strength": "500 mg",
        },
    ]
    db = FakeAsyncSession(rows)

    result = await link_medicine_record(
        db,
        ExtractedEntityResponse(medicine_name="Biogesic Paracetamol", dosage="500 mg"),
    )

    assert result is not None
    assert result.fda_id == 2
    assert result.match_type == "exact"
    assert result.confidence_percentage == 100
    assert result.confidence_level == "max"
    assert "like" in str(db.statement).casefold()


@pytest.mark.asyncio
async def test_linker_returns_none_without_name_or_matches():
    empty_db = FakeAsyncSession([])

    assert (
        await link_medicine_record(
            empty_db,
            ExtractedEntityResponse(medicine_name=None),
        )
        is None
    )
    assert (
        await link_medicine_record(
            empty_db,
            ExtractedEntityResponse(medicine_name="Unknown Product"),
        )
        is None
    )


def test_linked_response_accepts_long_fda_text_fields():
    long_text = "Each effervescent tablet contains " + " ".join(
        ["ascorbic acid 100mg"] * 30
    )
    response = LinkedMedicineResponse(
        fda_id=1,
        fda_registration_id="REG-1",
        fda_approval_id="APP-1",
        fda_genericname=long_text,
        match_score=1.0,
        confidence_percentage=100,
        confidence_level="max",
        accuracy_guidance="Exact match.",
    )

    assert len(response.fda_genericname) > 255
