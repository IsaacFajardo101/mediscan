# spaCy Named Entity Recognition pipeline
# (Emil, Curien)

from __future__ import annotations

import re

from starlette.concurrency import run_in_threadpool

from schemas.ocr import ExtractedEntityResponse


_DOSAGE_PATTERN = re.compile(
    r"\b\d+(?:\.\d+)?\s?(?:mcg|mg|g|ml|iu|%)\b",
    re.IGNORECASE,
)
_FREQUENCY_PATTERN = re.compile(
    r"\b(?:once|twice|three times|four times)\s+daily\b"
    r"|\b(?:once|twice|three times|four times|daily|weekly|"
    r"every\s+\d+\s+\w+)\b",
    re.IGNORECASE,
)
_EXPIRY_PATTERN = re.compile(
    r"\b(?:exp(?:iry)?|use\s+by)\s*[:\-]?\s*"
    r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2})\b",
    re.IGNORECASE,
)
_PACKAGING_WORDS = {
    "CAPLET",
    "CAPLETS",
    "CAPSULE",
    "CAPSULES",
    "TABLET",
    "TABLETS",
    "SOFTGEL",
    "SOFTGELS",
    "SYRUP",
    "SOLUTION",
    "INJECTION",
}
_CHEMICAL_BLACKLIST = [
    "ACETAMINOPHEN",
    "AMLODIPINE",
    "AMOXICILLIN",
    "ASPIRIN",
    "CARBOCISTEINE",
    "CELECOXIB",
    "DICLOFENAC",
    "DIPHENHYDRAMINE",
    "GUAIFENESIN",
    "IBUPROFEN",
    "MEFENAMIC ACID",
    "MEFENAMIC",
    "NAPROXEN",
    "PARACETAMOL",
    "PHENIRAMINE",
    "PHENYLEPHRINE",
    "PHENYLEPHRINE HCL",
    "SALBUTAMOL",
]
_CHEMICAL_TERMS = {
    "ACID",
    "HCL",
    "HYDROCHLORIDE",
    "SODIUM",
    "SUCCINATE",
    "SULFATE",
}
_MANUFACTURER_TERMS = {
    "CORP",
    "CORPORATION",
    "INC",
    "INCORPORATED",
    "LABORATORIES",
    "LABORATORY",
    "LTD",
    "MANUFACTURER",
    "PHARMA",
    "PHARMACEUTICAL",
    "PHARMACEUTICALS",
}
_KNOWN_MANUFACTURERS = {"UNILAB"}
_WARNING_TERMS = {
    "CAUTION",
    "DANGER",
    "WARNING",
    "POISON",
    "REACH",
    "CHILDREN",
    "SEALED",
}
_BOILERPLATE_PATTERN = re.compile(
    r"\b(?:manufactured|distributed|marketed|registered|packed)\s+by\b",
    re.IGNORECASE,
)
_ACTIVE_INGREDIENT_PATTERN = re.compile(
    r"\b(?:"
    + "|".join(
        re.escape(term).replace(r"\ ", r"\s+")
        for term in sorted(_CHEMICAL_BLACKLIST, key=len, reverse=True)
    )
    + r")\b",
    re.IGNORECASE,
)
_CHEMICAL_BLOCK_PATTERN = re.compile(
    r"\b(?:"
    r"[A-Za-z]+(?:cillin|caine|mycin|cycline|pril|sartan|statin|"
    r"olol|azole|tadine|lukast|prazole|profen|fenac|setron)"
    r")\b",
    re.IGNORECASE,
)


def _dosages_from_text(raw_text: str) -> str | None:
    """Return all distinct dosage expressions in their source order."""
    dosages: list[str] = []
    for match in _DOSAGE_PATTERN.finditer(raw_text):
        dosage = " ".join(match.group(0).split())
        if dosage.casefold() not in {item.casefold() for item in dosages}:
            dosages.append(dosage)
    return " / ".join(dosages) or None


def _medicine_name_from_text(raw_text: str) -> str | None:
    """Extract useful brand and generic medicine names from OCR text."""
    lines = [" ".join(line.split()).strip(" :-") for line in raw_text.splitlines()]
    generic_candidates: list[str] = []
    brand_candidates: list[tuple[int, str]] = []

    for line in lines:
        if not line or not re.search(r"[A-Za-z]", line):
            continue

        candidate = _DOSAGE_PATTERN.sub(" ", line)
        candidate = re.sub(
            r"\b(?:exp(?:iry)?|use\s+by)\b.*$",
            "",
            candidate,
            flags=re.IGNORECASE,
        )
        if not candidate.strip():
            continue

        line_words = set(re.findall(r"[A-Za-z]+", candidate.casefold()))
        if line_words & {term.casefold() for term in _WARNING_TERMS}:
            continue

        brand_words: list[str] = []
        generic_words: list[str] = []
        for word in candidate.split():
            normalized = word.strip(".,:;!?()[]{}\u00AE\u2122")
            if not normalized or normalized.isdigit():
                continue
            upper_word = normalized.upper()
            if upper_word in _PACKAGING_WORDS or upper_word in _KNOWN_MANUFACTURERS:
                continue
            if normalized.casefold() in {"mg", "mcg", "g", "ml", "iu"}:
                continue
            if not re.search(r"[A-Za-z]", normalized):
                continue
            if upper_word in _CHEMICAL_BLACKLIST or upper_word in _CHEMICAL_TERMS:
                generic_words.append(normalized)
            else:
                brand_words.append(normalized)

        if not brand_words and not generic_words:
            continue
        if set(word.upper() for word in brand_words) & _MANUFACTURER_TERMS:
            continue
        if _BOILERPLATE_PATTERN.search(candidate):
            continue

        if generic_words:
            generic_candidates.append(" ".join(generic_words))

        if brand_words:
            brand_candidate = " ".join(brand_words)
            score = min(len(brand_candidate), 40)
            if re.search(r"[\u00AE\u2122]", line):
                score += 10000
            if all(word.isupper() for word in brand_words):
                score += 100
            if any(word[:1].isupper() and word[1:].islower() for word in brand_words):
                score += 200
            if len(brand_words) <= 4:
                score += 50
            brand_candidates.append((score, brand_candidate))

    if not brand_candidates and not generic_candidates:
        return None

    brand = max(brand_candidates, key=lambda item: item[0])[1] if brand_candidates else None
    generic = " ".join(dict.fromkeys(generic_candidates)) or None
    if brand and generic and generic.casefold() not in brand.casefold():
        return f"{brand} {generic}"
    return brand or generic

def _extract_entities_sync(raw_text: str) -> ExtractedEntityResponse:
    frequency_match = _FREQUENCY_PATTERN.search(raw_text)
    expiry_match = _EXPIRY_PATTERN.search(raw_text)

    return ExtractedEntityResponse(
        medicine_name=_medicine_name_from_text(raw_text),
        dosage=_dosages_from_text(raw_text),
        frequency=frequency_match.group(0) if frequency_match else None,
        expiry_date=expiry_match.group(1) if expiry_match else None,
    )


async def extract_entities(raw_text: str) -> ExtractedEntityResponse:
    """Extract medicine-label entities without blocking the event loop."""
    return await run_in_threadpool(_extract_entities_sync, raw_text)
