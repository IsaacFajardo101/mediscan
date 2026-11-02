"""Asynchronous OCR-to-FDA medicine record linking."""

from __future__ import annotations

import re
from collections.abc import Mapping

from sqlalchemy import Column, Integer, MetaData, String, Table, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from schemas.ocr import ExtractedEntityResponse, LinkedMedicineResponse


_metadata = MetaData()
_medicines = Table(
    "test_philippine_fda_medicines",
    _metadata,
    # This lightweight table definition mirrors the existing SQL schema.
    # It does not create or alter database tables.
    *[
        Column(name, Integer if name == "fda_id" else String)
        for name in (
            "fda_id",
            "fda_registration_id",
            "fda_approval_id",
            "fda_brandname",
            "fda_genericname",
            "fda_dosage_form",
            "fda_dosage_strength",
            "fda_manufacturer",
            "fda_pharmacologic_category",
            "fda_classification",
        )
    ],
)


def _keywords(medicine_name: str | None) -> list[str]:
    if not medicine_name:
        return []
    return list(dict.fromkeys(re.findall(r"[A-Za-z0-9]+", medicine_name.casefold())))


def _row_value(row: Mapping[str, object], key: str) -> object:
    return row.get(key)


def _dosage_matches(row: Mapping[str, object], dosage: str | None) -> bool:
    if not dosage:
        return False
    expected = dosage.casefold()
    values = (
        str(_row_value(row, "fda_dosage_form") or ""),
        str(_row_value(row, "fda_dosage_strength") or ""),
    )
    return any(expected in value.casefold() or value.casefold() in expected for value in values)


def _normalized(value: object) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", str(value or "").casefold()))


def _confidence(
    row: Mapping[str, object],
    medicine_name: str | None,
    dosage_match: bool,
    matched_keywords: int,
    keyword_count: int,
) -> tuple[int, str, str]:
    extracted_name = _normalized(medicine_name)
    brand = _normalized(_row_value(row, "fda_brandname"))
    generic = _normalized(_row_value(row, "fda_genericname"))
    all_keywords_match = keyword_count > 0 and matched_keywords == keyword_count
    exact_name = (
        bool(extracted_name)
        and (extracted_name in {brand, generic} or (all_keywords_match and dosage_match))
    )

    if exact_name and dosage_match:
        return 100, "max", "Exact medicine name and dosage match."
    if exact_name:
        return 95, "high", "The medicine name matches exactly. A clearer photo of the dosage can confirm the result."
    if all_keywords_match and dosage_match:
        return 90, "high", "The brand or generic name and dosage are strong matches."
    if all_keywords_match:
        return 80, "medium", "The name is a strong match. Include a sharper photo of the dosage or strength for higher accuracy."
    if dosage_match:
        return 65, "medium", "The dosage matches, but the medicine name is partial. Capture the brand or generic name clearly."
    return 45, "low", "Use a clearer, well-lit photo showing the full brand or generic name and dosage."


def _to_response(
    row: Mapping[str, object],
    medicine_name: str | None,
    dosage_match: bool,
    matched_keywords: int,
    keyword_count: int,
) -> LinkedMedicineResponse:
    confidence_percentage, confidence_level, accuracy_guidance = _confidence(
        row,
        medicine_name,
        dosage_match,
        matched_keywords,
        keyword_count,
    )
    return LinkedMedicineResponse(
        fda_id=int(_row_value(row, "fda_id")),
        fda_registration_id=str(_row_value(row, "fda_registration_id") or ""),
        fda_approval_id=str(_row_value(row, "fda_approval_id") or ""),
        fda_brandname=_row_value(row, "fda_brandname"),
        fda_genericname=str(_row_value(row, "fda_genericname") or ""),
        fda_dosage_form=_row_value(row, "fda_dosage_form"),
        fda_dosage_strength=_row_value(row, "fda_dosage_strength"),
        fda_manufacturer=_row_value(row, "fda_manufacturer"),
        fda_pharmacologic_category=_row_value(row, "fda_pharmacologic_category"),
        fda_classification=_row_value(row, "fda_classification"),
        match_type="exact" if confidence_percentage == 100 else "fuzzy",
        match_score=confidence_percentage / 100,
        confidence_percentage=confidence_percentage,
        confidence_level=confidence_level,
        accuracy_guidance=accuracy_guidance,
    )


async def link_medicine_record(
    db: AsyncSession,
    extracted_data: ExtractedEntityResponse,
) -> LinkedMedicineResponse | None:
    """Find the best FDA medicine record for extracted OCR entities."""
    keywords = _keywords(extracted_data.medicine_name)
    if not keywords:
        return None

    keyword_filters = [
        or_(
            _medicines.c.fda_brandname.ilike(f"%{keyword}%"),
            _medicines.c.fda_genericname.ilike(f"%{keyword}%"),
        )
        for keyword in keywords
    ]
    statement = select(_medicines).where(or_(*keyword_filters))
    result = await db.execute(statement)
    rows = result.mappings().all()
    if not rows:
        return None

    def rank(row: Mapping[str, object]) -> tuple[int, int]:
        searchable = " ".join(
            str(_row_value(row, field) or "")
            for field in ("fda_brandname", "fda_genericname")
        ).casefold()
        matched_keywords = sum(keyword in searchable for keyword in keywords)
        return (_dosage_matches(row, extracted_data.dosage), matched_keywords)

    best_row = max(rows, key=rank)
    best_searchable = " ".join(
        str(_row_value(best_row, field) or "")
        for field in ("fda_brandname", "fda_genericname")
    ).casefold()
    matched_keywords = sum(keyword in best_searchable for keyword in keywords)
    dosage_match = _dosage_matches(best_row, extracted_data.dosage)
    return _to_response(
        best_row,
        extracted_data.medicine_name,
        dosage_match,
        matched_keywords,
        len(keywords),
    )
