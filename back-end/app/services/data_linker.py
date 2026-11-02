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


def _to_response(row: Mapping[str, object], dosage_match: bool) -> LinkedMedicineResponse:
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
        match_type="exact" if dosage_match else "fuzzy",
        match_score=1.0 if dosage_match else 0.75,
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
    return _to_response(best_row, _dosage_matches(best_row, extracted_data.dosage))
