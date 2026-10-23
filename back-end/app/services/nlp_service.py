# spaCy Named Entity Recognition pipeline
# (Emil, Curien)
"""
Extract medication entities from OCR text for MediScan.

Intended call path:
    ocr.scan(base64) -> list[str]  ->  nlp_service.extract_from_ocr(...)

Entity labels map to the backend ERD:
    DRUG_BRAND   -> philippines_fda_medicines.fda_brandname
    DRUG_GENERIC -> philippines_fda_medicines.fda_genericname
    STRENGTH     -> philippines_fda_medicines.fda_dosage_strength
    DOSAGE_FORM  -> philippines_fda_medicines.fda_dosage_form
    MANUFACTURER -> philippines_fda_medicines.fda_manufacturer
    FREQUENCY    -> medication_schedules.sched_frequency_type
    TIME         -> medication_schedules.sched_reminder_time
    DATE / EXPIRY-> vault_items.vault_expiry_date / schedule dates
"""

from __future__ import annotations

import csv
import logging
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterable

import spacy
from spacy.language import Language
from spacy.matcher import PhraseMatcher
from spacy.pipeline import EntityRuler

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths / constants
# ---------------------------------------------------------------------------

_DATA_CSV = Path(__file__).resolve().parent.parent / "data" / "mediscan_dataset.csv"

# Labels produced by this service (spaCy ENT labels)
LABEL_DRUG_BRAND = "DRUG_BRAND"
LABEL_DRUG_GENERIC = "DRUG_GENERIC"
LABEL_STRENGTH = "STRENGTH"
LABEL_DOSAGE_FORM = "DOSAGE_FORM"
LABEL_MANUFACTURER = "MANUFACTURER"
LABEL_FREQUENCY = "FREQUENCY"
LABEL_TIME = "TIME"
LABEL_DATE = "DATE"
LABEL_EXPIRY = "EXPIRY"

# ERD field mapping for downstream services (search / schedules / vault)
ERD_FIELD_MAP: dict[str, str] = {
    LABEL_DRUG_BRAND: "fda_brandname",
    LABEL_DRUG_GENERIC: "fda_genericname",
    LABEL_STRENGTH: "fda_dosage_strength",
    LABEL_DOSAGE_FORM: "fda_dosage_form",
    LABEL_MANUFACTURER: "fda_manufacturer",
    LABEL_FREQUENCY: "sched_frequency_type",
    LABEL_TIME: "sched_reminder_time",
    LABEL_DATE: "sched_start_date",
    LABEL_EXPIRY: "vault_expiry_date",
}

_DOSAGE_FORMS = [
    "film-coated tablet",
    "film coated tablet",
    "coated tablet",
    "chewable tablet",
    "effervescent tablet",
    "extended-release tablet",
    "prolonged-release tablet",
    "solution for injection",
    "powder for injection",
    "powder for solution",
    "syrup",
    "suspension",
    "tablet",
    "capsule",
    "caplet",
    "cream",
    "ointment",
    "gel",
    "lotion",
    "drops",
    "eye drops",
    "ear drops",
    "nasal spray",
    "inhaler",
    "patch",
    "suppository",
    "ampoule",
    "vial",
    "sachet",
    "granules",
    "powder",
    "injection",
    "infusion",
    "emulsion",
    "liquid",
]

_FREQUENCY_PHRASES = [
    "once daily",
    "twice daily",
    "thrice daily",
    "three times daily",
    "four times daily",
    "once a day",
    "twice a day",
    "three times a day",
    "four times a day",
    "every morning",
    "every night",
    "every evening",
    "at bedtime",
    "before meals",
    "after meals",
    "with meals",
    "with food",
    "as needed",
    "when necessary",
]

# Common Rx abbreviations used in PH prescriptions / labels
_FREQUENCY_ABBREVS = [
    "OD",
    "QD",
    "BID",
    "TID",
    "QID",
    "HS",
    "PRN",
    "Q4H",
    "Q6H",
    "Q8H",
    "Q12H",
    "QAM",
    "QPM",
]


# ---------------------------------------------------------------------------
# Pipeline construction
# ---------------------------------------------------------------------------


def _strength_patterns() -> list[dict[str, Any]]:
    """Token patterns for dosage strengths (e.g. 500 mg, 50mg/500mg, 70%)."""
    unit = {
        "LOWER": {
            "IN": [
                "mg",
                "mcg",
                "µg",
                "ug",
                "g",
                "ml",
                "iu",
                "units",
                "unit",
                "%",
            ]
        }
    }
    return [
        # 500 mg | 500mg (single token sometimes from OCR)
        {
            "label": LABEL_STRENGTH,
            "pattern": [{"LIKE_NUM": True}, unit],
        },
        {
            "label": LABEL_STRENGTH,
            "pattern": [
                {
                    "TEXT": {
                        "REGEX": r"(?i)^\d+([.,]\d+)?\s?(mg|mcg|µg|ug|g|ml|iu|units?|%)$"
                    }
                }
            ],
        },
        # 50 mg / 500 mg
        {
            "label": LABEL_STRENGTH,
            "pattern": [
                {"LIKE_NUM": True},
                unit,
                {"TEXT": {"IN": ["/", "-"]}},
                {"LIKE_NUM": True},
                unit,
            ],
        },
        # 100 units/mL | 25 mg/mL
        {
            "label": LABEL_STRENGTH,
            "pattern": [
                {"LIKE_NUM": True},
                {"LOWER": {"IN": ["mg", "mcg", "µg", "ug", "g", "iu", "units", "unit"]}},
                {"TEXT": "/"},
                {"LOWER": {"IN": ["ml", "l"]}},
            ],
        },
    ]


def _form_patterns() -> list[dict[str, Any]]:
    patterns: list[dict[str, Any]] = []
    for form in _DOSAGE_FORMS:
        tokens = [{"LOWER": t} for t in form.split()]
        patterns.append({"label": LABEL_DOSAGE_FORM, "pattern": tokens})
    # Short Rx shorthand
    for short in ("tab", "tabs", "cap", "caps", "inj", "syr"):
        patterns.append({"label": LABEL_DOSAGE_FORM, "pattern": [{"LOWER": short}]})
    return patterns


def _frequency_patterns() -> list[dict[str, Any]]:
    patterns: list[dict[str, Any]] = []
    for phrase in _FREQUENCY_PHRASES:
        tokens = [{"LOWER": t} for t in phrase.split()]
        patterns.append({"label": LABEL_FREQUENCY, "pattern": tokens})
    for abbr in _FREQUENCY_ABBREVS:
        patterns.append({"label": LABEL_FREQUENCY, "pattern": [{"TEXT": {"REGEX": f"(?i)^{abbr}$"}}]})
    # every N hours | Nx daily / Nx a day
    patterns.extend(
        [
            {
                "label": LABEL_FREQUENCY,
                "pattern": [
                    {"LOWER": "every"},
                    {"LIKE_NUM": True},
                    {"LOWER": {"IN": ["hour", "hours", "hr", "hrs", "h"]}},
                ],
            },
            {
                "label": LABEL_FREQUENCY,
                "pattern": [
                    {"TEXT": {"REGEX": r"(?i)^\d+x$"}},
                    {"LOWER": {"IN": ["daily", "a", "per"]}},
                    {"LOWER": {"IN": ["day", "daily"]}, "OP": "?"},
                ],
            },
        ]
    )
    return patterns


def _time_patterns() -> list[dict[str, Any]]:
    return [
        # 8:00 AM | 8:00am | 20:30
        {
            "label": LABEL_TIME,
            "pattern": [
                {"TEXT": {"REGEX": r"^\d{1,2}:\d{2}$"}},
                {"LOWER": {"IN": ["am", "pm"]}, "OP": "?"},
            ],
        },
        {
            "label": LABEL_TIME,
            "pattern": [{"TEXT": {"REGEX": r"(?i)^\d{1,2}:\d{2}\s?(am|pm)$"}}],
        },
    ]


def _date_and_expiry_patterns() -> list[dict[str, Any]]:
    date_token = {
        "TEXT": {
            "REGEX": (
                r"(?i)^("
                r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}"  # 31/10/2029
                r"|\d{4}[/-]\d{1,2}[/-]\d{1,2}"  # 2029-10-31
                r"|\d{1,2}[/-]\d{4}"  # 10/2029
                r"|[A-Za-z]{3,9}\s?\d{4}"  # Oct 2029 / October2029
                r")$"
            )
        }
    }
    return [
        {
            "label": LABEL_EXPIRY,
            "pattern": [
                {"LOWER": {"IN": ["exp", "expiry", "expiration", "expires", "exp."]}},
                {"LOWER": {"IN": ["date", "on", ":"]}, "OP": "?"},
                {"TEXT": ":", "OP": "?"},
                date_token,
            ],
        },
        {
            "label": LABEL_DATE,
            "pattern": [date_token],
        },
        {
            "label": LABEL_EXPIRY,
            "pattern": [
                {"LOWER": {"IN": ["best", "use"]}},
                {"LOWER": {"IN": ["before", "by"]}},
                date_token,
            ],
        },
    ]


def _manufacturer_patterns() -> list[dict[str, Any]]:
    # Match title-case or ALL-CAPS company tokens (common on PH labels)
    company_token = {
        "TEXT": {"REGEX": r"^[A-Za-z][A-Za-z0-9.&'-]*$"},
        "OP": "+",
    }
    suffix = {
        "LOWER": {
            "IN": [
                "inc",
                "inc.",
                "ltd",
                "ltd.",
                "co",
                "co.",
                "corp",
                "corporation",
                "pharma",
                "laboratories",
                "labs",
                "llc",
            ]
        },
        "OP": "?",
    }
    return [
        {
            "label": LABEL_MANUFACTURER,
            "pattern": [
                {"LOWER": {"IN": ["manufactured", "mfr", "mfg", "maker"]}},
                {"LOWER": {"IN": ["by", ":"]}, "OP": "?"},
                {"TEXT": ":", "OP": "?"},
                company_token,
                {"TEXT": ",", "OP": "?"},
                suffix,
            ],
        },
    ]


def _build_ruler_patterns() -> list[dict[str, Any]]:
    # More specific labels first; EntityRuler keeps first match when overlapping
    # if overwrite_ents is False — we put EXPIRY before DATE, multi-word forms first.
    return (
        _date_and_expiry_patterns()
        + _strength_patterns()
        + _form_patterns()
        + _frequency_patterns()
        + _time_patterns()
        + _manufacturer_patterns()
    )


_STRENGTH_IN_NAME = re.compile(
    r"(?i)(\d+\s?(mg|mcg|µg|ug|g|ml|iu|units?|%)|/|\btablet\b|\bcapsule\b)"
)


def _normalize_phrase(text: str) -> str | None:
    cleaned = re.sub(r"\s+", " ", (text or "").strip())
    if len(cleaned) < 3:
        return None
    # Skip placeholder / noise brand values in the FDA dump
    if cleaned.lower() in {"unbranded", "n/a", "na", "none", "-"}:
        return None
    # Skip names that already embed strength/form so PhraseMatcher
    # does not swallow "500 mg" / "Tablet" as part of a drug span.
    if _STRENGTH_IN_NAME.search(cleaned):
        # Keep short brand codes like "Vortinex 10" only if no unit present
        if re.search(r"(?i)\b(mg|mcg|ml|iu|%|tablet|capsule)\b", cleaned):
            return None
    # Avoid extremely long combination chemical names (noisy for OCR matching)
    if len(cleaned.split()) > 8:
        return None
    return cleaned


def _load_drug_names_from_csv(
    csv_path: Path = _DATA_CSV,
    limit: int | None = None,
) -> tuple[list[str], list[str]]:
    """Return unique (brand_names, generic_names) from the FDA dataset CSV."""
    brands: set[str] = set()
    generics: set[str] = set()

    if not csv_path.is_file():
        logger.warning("FDA dataset not found at %s — drug gazetteer disabled", csv_path)
        return [], []

    with csv_path.open(newline="", encoding="utf-8", errors="replace") as fh:
        reader = csv.DictReader(fh)
        for i, row in enumerate(reader):
            if limit is not None and i >= limit:
                break
            brand = _normalize_phrase(row.get("Brand_Name") or "")
            generic = _normalize_phrase(row.get("Generic_Name") or "")
            if brand:
                brands.add(brand)
            if generic:
                generics.add(generic)

    return sorted(brands), sorted(generics)


def _add_phrase_matcher(
    nlp: Language,
    brands: Iterable[str],
    generics: Iterable[str],
) -> PhraseMatcher:
    matcher = PhraseMatcher(nlp.vocab, attr="LOWER")
    brand_docs = [nlp.make_doc(name) for name in brands]
    generic_docs = [nlp.make_doc(name) for name in generics]
    if brand_docs:
        matcher.add(LABEL_DRUG_BRAND, brand_docs)
    if generic_docs:
        matcher.add(LABEL_DRUG_GENERIC, generic_docs)
    return matcher


@lru_cache(maxsize=1)
def get_nlp() -> tuple[Language, PhraseMatcher]:
    """
    Build (and cache) a blank English spaCy pipeline with:
      - EntityRuler for strength / form / frequency / time / dates
      - PhraseMatcher gazetteer for PH FDA brand & generic names
    """
    nlp = spacy.blank("en")
    # Prefer longer matches (e.g. "film-coated tablet" over "tablet")
    ruler: EntityRuler = nlp.add_pipe(
        "entity_ruler",
        config={"overwrite_ents": True, "phrase_matcher_attr": "LOWER"},
    )
    ruler.add_patterns(_build_ruler_patterns())

    brands, generics = _load_drug_names_from_csv()
    matcher = _add_phrase_matcher(nlp, brands, generics)
    logger.info(
        "NLP ready: %d brand phrases, %d generic phrases",
        len(brands),
        len(generics),
    )
    return nlp, matcher


def reload_nlp() -> tuple[Language, PhraseMatcher]:
    """Clear the cached pipeline (e.g. after refreshing the FDA CSV)."""
    get_nlp.cache_clear()
    return get_nlp()


# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------


def _join_ocr_text(ocr_input: str | list[str]) -> str:
    if isinstance(ocr_input, list):
        return " ".join(t.strip() for t in ocr_input if t and str(t).strip())
    return (ocr_input or "").strip()


def _span_to_dict(span: spacy.tokens.Span) -> dict[str, Any]:
    return {
        "text": span.text.strip(),
        "label": span.label_,
        "start": span.start_char,
        "end": span.end_char,
        "erd_field": ERD_FIELD_MAP.get(span.label_),
    }


# Ruler labels that must not be overwritten by drug-name phrases
_PROTECTED_LABELS = {
    LABEL_STRENGTH,
    LABEL_DOSAGE_FORM,
    LABEL_FREQUENCY,
    LABEL_TIME,
    LABEL_DATE,
    LABEL_EXPIRY,
    LABEL_MANUFACTURER,
}


def _merge_phrase_matches(
    doc: spacy.tokens.Doc,
    matcher: PhraseMatcher,
) -> list[spacy.tokens.Span]:
    """
    Keep EntityRuler hits for strength/form/etc., then add gazetteer
    drug names only on tokens that are still free (longest-first).
    """
    occupied: set[int] = set()
    ruler_ents: list[spacy.tokens.Span] = []

    for ent in doc.ents:
        if ent.label_ in _PROTECTED_LABELS:
            occupied |= set(range(ent.start, ent.end))
            ruler_ents.append(ent)

    matches = matcher(doc)
    # Prefer longer drug phrases, then earlier start
    spans = sorted(matches, key=lambda m: (-(m[2] - m[1]), m[1]))

    drug_ents: list[spacy.tokens.Span] = []
    for match_id, start, end in spans:
        token_indexes = set(range(start, end))
        if occupied & token_indexes:
            continue
        occupied |= token_indexes
        drug_ents.append(spacy.tokens.Span(doc, start, end, label=match_id))

    # Any remaining non-protected ruler ents (should be none today)
    for ent in doc.ents:
        if ent.label_ in _PROTECTED_LABELS:
            continue
        if occupied & set(range(ent.start, ent.end)):
            continue
        ruler_ents.append(ent)

    all_ents = drug_ents + ruler_ents
    all_ents.sort(key=lambda s: s.start_char)
    return all_ents


def _pick_best(entities: list[dict[str, Any]], label: str) -> str | None:
    for ent in entities:
        if ent["label"] == label and ent["text"]:
            return ent["text"]
    return None


def _normalize_manufacturer(raw: str | None) -> str | None:
    if not raw:
        return None
    cleaned = re.sub(
        r"(?i)^(manufactured|mfr|mfg|maker)\s*(by)?\s*:?\s*",
        "",
        raw,
    ).strip(" ,")
    return cleaned or raw


def _normalize_expiry(raw: str | None) -> str | None:
    """Strip 'EXP' / 'Expiry' prefixes; keep the date token for vault_expiry_date."""
    if not raw:
        return None
    cleaned = re.sub(
        r"(?i)^(exp(iry|iration|ires)?|best before|use by)\s*(date)?\s*:?\s*",
        "",
        raw,
    ).strip()
    return cleaned or raw


def _structure_for_erd(entities: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Collapse entity list into fields usable for FDA lookup + schedule/vault creation.
    """
    brand = _pick_best(entities, LABEL_DRUG_BRAND)
    generic = _pick_best(entities, LABEL_DRUG_GENERIC)

    return {
        # philippines_fda_medicines lookup keys
        "fda_brandname": brand,
        "fda_genericname": generic,
        "fda_dosage_strength": _pick_best(entities, LABEL_STRENGTH),
        "fda_dosage_form": _pick_best(entities, LABEL_DOSAGE_FORM),
        "fda_manufacturer": _normalize_manufacturer(
            _pick_best(entities, LABEL_MANUFACTURER)
        ),
        # medication_schedules
        "sched_frequency_type": _pick_best(entities, LABEL_FREQUENCY),
        "sched_reminder_time": [
            e["text"] for e in entities if e["label"] == LABEL_TIME
        ],
        "sched_notes": None,
        # vault_items
        "vault_expiry_date": _normalize_expiry(
            _pick_best(entities, LABEL_EXPIRY) or _pick_best(entities, LABEL_DATE)
        ),
        # convenience
        "drug_name": brand or generic,
    }


def extract_from_ocr(ocr_input: str | list[str]) -> dict[str, Any]:
    """
    Run NER on OCR output.

    Parameters
    ----------
    ocr_input:
        Either the list[str] returned by ``ocr.scan`` or a single text string.

    Returns
    -------
    dict with:
        raw_text   – joined OCR string that was analyzed
        entities   – list of {text, label, start, end, erd_field}
        structured – ERD-aligned fields for medicines / schedules / vault
    """
    text = _join_ocr_text(ocr_input)
    if not text:
        return {
            "raw_text": "",
            "entities": [],
            "structured": _structure_for_erd([]),
        }

    nlp, matcher = get_nlp()
    doc = nlp(text)
    spans = _merge_phrase_matches(doc, matcher)
    entities = [_span_to_dict(span) for span in spans]

    return {
        "raw_text": text,
        "entities": entities,
        "structured": _structure_for_erd(entities),
    }


def extract_entities(ocr_input: str | list[str]) -> list[dict[str, Any]]:
    """Convenience wrapper that returns only the entity list."""
    return extract_from_ocr(ocr_input)["entities"]


# ---------------------------------------------------------------------------
# Manual / smoke-test entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    sample_ocr_lines = [
        "Biogesic",
        "Paracetamol",
        "500 mg",
        "Tablet",
        "Take one tablet twice daily",
        "EXP 12/2027",
        "Manufactured by UNILAB, Inc.",
    ]
    result = extract_from_ocr(sample_ocr_lines)
    print("Raw text:", result["raw_text"])
    print("Entities:")
    for ent in result["entities"]:
        print(f"  [{ent['label']}] {ent['text']!r} -> {ent['erd_field']}")
    print("Structured:", result["structured"])
