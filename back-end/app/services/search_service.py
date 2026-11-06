from __future__ import annotations

import csv
import logging
import re
import unicodedata
from dataclasses import asdict, dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterable, Sequence

logger = logging.getLogger(__name__)

_DATA_CSV = Path(__file__).resolve().parent.parent / "data" / "mediscan_dataset.csv"

# PH FDA registration prefixes seen in mediscan_dataset.csv
_REG_PREFIXES = (
    "DRP",
    "DRHR",
    "DRMO",
    "HMRP",
    "THPRP",
    "HRP",
    "BRP",
    "HMR",
    "THPR",
    "FDA",
    "DPR",
    "DMRO",
    "BR",
    "DR",
)

# Longest-first so DRHR matches before DR, BRP before BR, etc.
_REG_PREFIX_ALT = "|".join(
    sorted(_REG_PREFIXES, key=len, reverse=True)
)

# e.g. DRP-16105, DR-XY49263, BR-1005, DRP-1425-10, DR-153
_REG_ID_RE = re.compile(
    rf"(?i)\b(?P<reg>(?:{_REG_PREFIX_ALT})[\s\-]*[A-Z]{{0,4}}[\s\-]*\d{{1,6}}"
    rf"(?:[\s\-]*\d{{1,4}})*)\b"
)

# Weights for multi-field fallback (must sum-friendly; brand/generic dominate)
_FIELD_WEIGHTS: dict[str, float] = {
    "fda_brandname": 0.40,
    "fda_genericname": 0.30,
    "fda_dosage_strength": 0.15,
    "fda_dosage_form": 0.10,
    "fda_manufacturer": 0.05,
}

_DEFAULT_TOP_K = 5
_MIN_FALLBACK_SCORE = 0.35


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class FdaMedicineHit:
    """One FDA row returned to the API / FE."""

    registration_number: str
    brand_name: str | None
    generic_name: str | None
    dosage_strength: str | None
    dosage_form: str | None
    manufacturer: str | None
    product_name: str | None = None
    classification: str | None = None
    pharmacologic_category: str | None = None
    approval_id: str | None = None
    score: float = 1.0
    match_method: str = "registration_id"  # or "field_score"
    matched_fields: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class FdaQueryResult:
    """Full algorithm output."""

    matches: list[FdaMedicineHit]
    registration_id_found: str | None
    early_exit: bool
    query_fields: dict[str, Any]
    message: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "matches": [m.to_dict() for m in self.matches],
            "registration_id_found": self.registration_id_found,
            "early_exit": self.early_exit,
            "query_fields": self.query_fields,
            "message": self.message,
        }


# ---------------------------------------------------------------------------
# Normalization helpers
# ---------------------------------------------------------------------------


def _normalize(text: str | None) -> str:
    if not text:
        return ""
    text = unicodedata.normalize("NFKC", str(text)).strip().lower()
    text = text.replace("–", "-").replace("—", "-")
    text = re.sub(r"\s+", " ", text)
    return text


def _normalize_reg_id(raw: str) -> str:
    """Canonical form: PREFIX-REST with no spaces (uppercase)."""
    cleaned = re.sub(r"[\s_]+", "", raw.strip().upper())
    # Insert hyphen after alphabetic prefix if OCR dropped it: DRP16105 -> DRP-16105
    m = re.match(r"^([A-Z]+)[\-]?(.+)$", cleaned)
    if not m:
        return cleaned
    prefix, rest = m.group(1), m.group(2).lstrip("-")
    return f"{prefix}-{rest}"


def _normalize_strength(text: str | None) -> str:
    s = _normalize(text)
    if not s:
        return ""
    s = s.replace(",", "")
    s = re.sub(r"\s*/\s*", "/", s)
    s = re.sub(r"\s+", "", s)
    return s


def _tokenize(text: str) -> set[str]:
    return {t for t in re.split(r"[^a-z0-9+]+", text) if len(t) > 1}


def _token_overlap(a: str, b: str) -> float:
    """Jaccard-ish overlap on tokens; 1.0 if either is substring of the other."""
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    if a in b or b in a:
        return 0.9
    ta, tb = _tokenize(a), _tokenize(b)
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    if inter == 0:
        return 0.0
    return inter / max(len(ta), len(tb))


# ---------------------------------------------------------------------------
# Dataset load (CSV stand-in until crud_medicine / Postgres is ready)
# ---------------------------------------------------------------------------


def _row_to_record(row: dict[str, str]) -> dict[str, Any]:
    reg = _normalize_reg_id(row.get("Registration_Number") or "")
    return {
        "approval_id": (row.get("Approval_ID") or "").strip() or None,
        "registration_number": reg,
        "brand_name": (row.get("Brand_Name") or "").strip() or None,
        "product_name": (row.get("Product_Name") or "").strip() or None,
        "generic_name": (row.get("Generic_Name") or "").strip() or None,
        "dosage_form": (row.get("Dosage_Form") or "").strip() or None,
        "dosage_strength": (row.get("Dosage_Strength") or "").strip() or None,
        "manufacturer": (row.get("Manufacturer") or "").strip() or None,
        "classification": (row.get("Classification") or "").strip() or None,
        "pharmacologic_category": (row.get("Pharmacologic_Category") or "").strip()
        or None,
        # pre-normalized for scoring
        "_n_brand": _normalize(row.get("Brand_Name")),
        "_n_generic": _normalize(row.get("Generic_Name")),
        "_n_strength": _normalize_strength(row.get("Dosage_Strength")),
        "_n_form": _normalize(row.get("Dosage_Form")),
        "_n_mfr": _normalize(row.get("Manufacturer")),
    }


@lru_cache(maxsize=1)
def _load_fda_index() -> tuple[dict[str, dict[str, Any]], tuple[dict[str, Any], ...]]:
    """
    Build (reg_id -> record, all_records).

    Swap this for ``crud_medicine`` Postgres lookups once Sting/Dwayne land CRUD.
    """
    by_reg: dict[str, dict[str, Any]] = {}
    records: list[dict[str, Any]] = []

    if not _DATA_CSV.exists():
        logger.warning("FDA dataset missing at %s", _DATA_CSV)
        return {}, ()

    with _DATA_CSV.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            rec = _row_to_record(row)
            if not rec["registration_number"]:
                continue
            records.append(rec)
            # First wins if duplicates; keep map for O(1) reg lookup
            by_reg.setdefault(rec["registration_number"], rec)

    logger.info(
        "FDA index ready: %d rows, %d unique registration numbers",
        len(records),
        len(by_reg),
    )
    return by_reg, tuple(records)


def reload_fda_index() -> None:
    """Clear cached CSV index (call after dataset refresh / import)."""
    _load_fda_index.cache_clear()


# ---------------------------------------------------------------------------
# Registration ID extraction
# ---------------------------------------------------------------------------


def extract_registration_ids(
    *,
    structured: dict[str, Any] | None = None,
    entities: Sequence[dict[str, Any]] | None = None,
    raw_text: str | None = None,
) -> list[str]:
    """
    Collect candidate registration IDs from NER output + OCR text.

    Priority sources:
      1. structured['fda_registration_number'] (once NER adds the field)
      2. entities labeled REGISTRATION / REG_ID / REGISTRATION_NUMBER
      3. regex scan of raw_text
    """
    found: list[str] = []
    seen: set[str] = set()

    def _add(value: str | None) -> None:
        if not value:
            return
        canon = _normalize_reg_id(value)
        if canon and canon not in seen and _REG_ID_RE.search(canon):
            seen.add(canon)
            found.append(canon)

    structured = structured or {}
    for key in (
        "fda_registration_number",
        "registration_number",
        "reg_id",
        "Registration_Number",
    ):
        val = structured.get(key)
        if isinstance(val, str):
            _add(val)
        elif isinstance(val, (list, tuple)):
            for item in val:
                _add(str(item) if item is not None else None)

    for ent in entities or []:
        label = (ent.get("label") or "").upper()
        if label in {"REGISTRATION", "REG_ID", "REGISTRATION_NUMBER", "FDA_REG"}:
            _add(ent.get("text"))

    if raw_text:
        for m in _REG_ID_RE.finditer(raw_text):
            _add(m.group("reg"))

    return found


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------


def _score_record(
    record: dict[str, Any],
    query: dict[str, str],
) -> tuple[float, list[str]]:
    total = 0.0
    weight_sum = 0.0
    matched: list[str] = []

    field_map = (
        ("fda_brandname", "_n_brand", _normalize),
        ("fda_genericname", "_n_generic", _normalize),
        ("fda_dosage_strength", "_n_strength", _normalize_strength),
        ("fda_dosage_form", "_n_form", _normalize),
        ("fda_manufacturer", "_n_mfr", _normalize),
    )

    for q_key, r_key, norm_fn in field_map:
        q_raw = query.get(q_key) or ""
        if not q_raw:
            continue
        weight = _FIELD_WEIGHTS[q_key]
        weight_sum += weight
        q_norm = norm_fn(q_raw)
        r_norm = record.get(r_key) or ""
        sim = _token_overlap(q_norm, r_norm)
        if sim >= 0.5:
            matched.append(q_key)
        total += weight * sim

    if weight_sum == 0:
        return 0.0, []
    return total / weight_sum, matched


def _record_to_hit(
    record: dict[str, Any],
    *,
    score: float,
    match_method: str,
    matched_fields: Iterable[str] | None = None,
) -> FdaMedicineHit:
    return FdaMedicineHit(
        registration_number=record["registration_number"],
        brand_name=record.get("brand_name"),
        generic_name=record.get("generic_name"),
        dosage_strength=record.get("dosage_strength"),
        dosage_form=record.get("dosage_form"),
        manufacturer=record.get("manufacturer"),
        product_name=record.get("product_name"),
        classification=record.get("classification"),
        pharmacologic_category=record.get("pharmacologic_category"),
        approval_id=record.get("approval_id"),
        score=round(score, 4),
        match_method=match_method,
        matched_fields=list(matched_fields or []),
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def query_fda(
    ner_result: dict[str, Any] | None = None,
    *,
    structured: dict[str, Any] | None = None,
    entities: Sequence[dict[str, Any]] | None = None,
    raw_text: str | None = None,
    top_k: int = _DEFAULT_TOP_K,
    min_score: float = _MIN_FALLBACK_SCORE,
) -> FdaQueryResult:
    """
    Query FDA medicines from NER output.

    Parameters
    ----------
    ner_result:
        Full dict from ``extract_from_ocr`` (preferred). Keys used:
        ``structured``, ``entities``, ``raw_text``.
    structured / entities / raw_text:
        Optional overrides if you already unpacked the NER result.
    top_k:
        Max candidates for the multi-field fallback path.
    min_score:
        Minimum normalized score to keep a fallback candidate.

    Returns
    -------
    FdaQueryResult
        ``early_exit=True`` when a registration ID matched — algorithm stops
        and returns that row (ready for the FE / vault save step).
    """
    if ner_result:
        structured = structured or ner_result.get("structured") or {}
        entities = entities if entities is not None else ner_result.get("entities") or []
        raw_text = raw_text if raw_text is not None else ner_result.get("raw_text")

    structured = dict(structured or {})
    entities = list(entities or [])
    raw_text = raw_text or ""

    query_fields = {
        "fda_brandname": structured.get("fda_brandname"),
        "fda_genericname": structured.get("fda_genericname"),
        "fda_dosage_strength": structured.get("fda_dosage_strength"),
        "fda_dosage_form": structured.get("fda_dosage_form"),
        "fda_manufacturer": structured.get("fda_manufacturer"),
    }

    by_reg, all_records = _load_fda_index()
    reg_candidates = extract_registration_ids(
        structured=structured,
        entities=entities,
        raw_text=raw_text,
    )

    # ------------------------------------------------------------------
    # Path A — Registration ID found → exact match → END algorithm
    # ------------------------------------------------------------------
    for reg_id in reg_candidates:
        hit_row = by_reg.get(reg_id)
        if hit_row is None:
            # soft match: OCR may mangle hyphens / XY segment
            hit_row = _fuzzy_reg_lookup(reg_id, by_reg)
        if hit_row is not None:
            hit = _record_to_hit(
                hit_row,
                score=1.0,
                match_method="registration_id",
                matched_fields=["fda_registration_number"],
            )
            return FdaQueryResult(
                matches=[hit],
                registration_id_found=reg_id,
                early_exit=True,
                query_fields=query_fields,
                message=(
                    f"Registration ID {reg_id} matched - "
                    "algorithm ended early; save this FDA record."
                ),
            )

    if reg_candidates:
        # Had a reg ID string but nothing in the dataset
        return FdaQueryResult(
            matches=[],
            registration_id_found=reg_candidates[0],
            early_exit=True,
            query_fields=query_fields,
            message=(
                f"Registration ID {reg_candidates[0]} detected but not found "
                "in the FDA dataset."
            ),
        )

    # ------------------------------------------------------------------
    # Path B — No reg ID → multi-field scored search
    # ------------------------------------------------------------------
    usable = {k: v for k, v in query_fields.items() if v}
    if not usable:
        return FdaQueryResult(
            matches=[],
            registration_id_found=None,
            early_exit=False,
            query_fields=query_fields,
            message="No registration ID or usable NER fields for FDA lookup.",
        )

    # Require at least brand or generic to avoid noise
    if not (usable.get("fda_brandname") or usable.get("fda_genericname")):
        return FdaQueryResult(
            matches=[],
            registration_id_found=None,
            early_exit=False,
            query_fields=query_fields,
            message="Need brand or generic name from NER to search without a reg ID.",
        )

    scored: list[FdaMedicineHit] = []
    for rec in all_records:
        score, matched = _score_record(rec, query_fields)
        if score < min_score:
            continue
        # Prefer rows that hit brand or generic
        if not (
            "fda_brandname" in matched or "fda_genericname" in matched
        ):
            continue
        scored.append(
            _record_to_hit(
                rec,
                score=score,
                match_method="field_score",
                matched_fields=matched,
            )
        )

    scored.sort(key=lambda h: h.score, reverse=True)
    top = scored[: max(1, top_k)]

    return FdaQueryResult(
        matches=top,
        registration_id_found=None,
        early_exit=False,
        query_fields=query_fields,
            message=(
                f"No registration ID - returned {len(top)} scored candidate(s) "
                "from NER fields."
            ),
    )


def _fuzzy_reg_lookup(
    reg_id: str,
    by_reg: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    """
    Tolerate minor OCR noise: missing hyphens already normalized;
    try stripping the middle letter segment (DR-XY49263 vs DRXY49263).
    """
    compact = reg_id.replace("-", "")
    for key, rec in by_reg.items():
        if key.replace("-", "") == compact:
            return rec
    return None


def match_from_ocr_ner(ner_result: dict[str, Any], **kwargs: Any) -> dict[str, Any]:
    """Convenience wrapper returning a plain dict for API / FE forwarding."""
    return query_fda(ner_result, **kwargs).to_dict()


# ---------------------------------------------------------------------------
# Smoke test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Path A — reg ID present → early exit
    sample_with_reg = {
        "raw_text": "Biogesic Paracetamol 500 mg Tablet Reg. No. DR-XY39670",
        "entities": [],
        "structured": {
            "fda_brandname": "Biogesic",
            "fda_genericname": "Paracetamol",
            "fda_dosage_strength": "500 mg",
            "fda_dosage_form": "Tablet",
            "fda_manufacturer": None,
        },
    }
    print("=== Path A: registration ID ===")
    print(match_from_ocr_ner(sample_with_reg))

    # Path B — no reg ID → field score
    sample_no_reg = {
        "raw_text": "Biogesic Paracetamol 500 mg Tablet Manufactured by UNILAB",
        "entities": [],
        "structured": {
            "fda_brandname": "Biogesic",
            "fda_genericname": "Paracetamol",
            "fda_dosage_strength": "500 mg",
            "fda_dosage_form": "Tablet",
            "fda_manufacturer": "United Laboratories, Inc.",
        },
    }
    print("\n=== Path B: field score ===")
    print(match_from_ocr_ner(sample_no_reg))
