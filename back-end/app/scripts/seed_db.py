"""Safely seed a cloned FDA medicines table from a CSV file."""

from __future__ import annotations

import argparse
import asyncio
import csv
import sys
from pathlib import Path
from typing import Any

from sqlalchemy import text

APP_DIRECTORY = Path(__file__).resolve().parents[2]
if str(APP_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(APP_DIRECTORY))

from db.database import SessionLocal


SOURCE_TABLE = "philippines_fda_medicines"
TEST_TABLE = "test_philippine_fda_medicines"
DEFAULT_CSV_PATH = Path(__file__).resolve().parents[3] / "DATASET_LUMAKIN.csv"
INSERT_BATCH_SIZE = 1000

# Add future CSV headers here as needed. Unmapped CSV columns are discarded.
HEADER_MAP = {
    "Approval_ID": "fda_approval_id",
    "Registration_Number": "fda_registration_id",
    "Brand_Name": "fda_brandname",
    "Generic_Name": "fda_genericname",
    "Dosage_Form": "fda_dosage_form",
    "Dosage_Strength": "fda_dosage_strength",
    "Manufacturer": "fda_manufacturer",
    "Pharmacologic_Category": "fda_pharmacologic_category",
    "Classification": "fda_classification",
}

TARGET_COLUMNS = tuple(dict.fromkeys(HEADER_MAP.values()))
REQUIRED_COLUMNS = {"fda_approval_id", "fda_registration_id", "fda_genericname"}


def _clean_value(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def read_csv_rows(csv_path: Path) -> list[dict[str, str | None]]:
    """Read and map CSV rows without retaining unmapped source columns."""
    with csv_path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        if reader.fieldnames is None:
            raise ValueError("The CSV file does not contain a header row.")

        missing_headers = set(HEADER_MAP) - set(reader.fieldnames)
        if missing_headers:
            raise ValueError(
                "The CSV is missing mapped headers: "
                + ", ".join(sorted(missing_headers))
            )

        rows: list[dict[str, str | None]] = []
        for line_number, source_row in enumerate(reader, start=2):
            mapped_row = {
                destination: _clean_value(source_row.get(source))
                for source, destination in HEADER_MAP.items()
            }
            if not mapped_row.get("fda_genericname"):
                mapped_row["fda_genericname"] = (
                    _clean_value(source_row.get("Product_Name"))
                    or _clean_value(source_row.get("Brand_Name"))
                )
            missing_required = [
                column
                for column in REQUIRED_COLUMNS
                if not mapped_row.get(column)
            ]
            if missing_required:
                raise ValueError(
                    f"CSV line {line_number} is missing required values: "
                    + ", ".join(sorted(missing_required))
                )
            rows.append(mapped_row)

    return rows


async def _recreate_test_table(session: Any) -> None:
    """Replace only the cloned test table using the production table structure."""
    await session.execute(text(f'DROP TABLE IF EXISTS "{TEST_TABLE}" CASCADE'))
    await session.execute(
        text(
            f'CREATE TABLE "{TEST_TABLE}" '
            f'(LIKE "{SOURCE_TABLE}" INCLUDING ALL)'
        )
    )


async def _insert_rows(session: Any, rows: list[dict[str, str | None]]) -> None:
    if not rows:
        return

    column_sql = ", ".join(f'"{column}"' for column in TARGET_COLUMNS)
    values_sql = ", ".join(f":{column}" for column in TARGET_COLUMNS)
    statement = text(
        f'INSERT INTO "{TEST_TABLE}" ({column_sql}) VALUES ({values_sql})'
    )
    for start in range(0, len(rows), INSERT_BATCH_SIZE):
        await session.execute(statement, rows[start : start + INSERT_BATCH_SIZE])


async def seed_database(csv_path: Path = DEFAULT_CSV_PATH) -> int:
    """Clone the FDA table and insert mapped CSV rows into the clone."""
    if SessionLocal is None:
        raise RuntimeError(
            "Database configuration is missing. Set DATABASE_URL before seeding."
        )

    rows = read_csv_rows(csv_path)
    async with SessionLocal() as session:
        async with session.begin():
            await _recreate_test_table(session)
            await _insert_rows(session, rows)

    return len(rows)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed a cloned FDA medicine table from a CSV file."
    )
    parser.add_argument(
        "csv_path",
        nargs="?",
        type=Path,
        default=DEFAULT_CSV_PATH,
        help="Path to the CSV dataset.",
    )
    return parser.parse_args()


async def _main() -> None:
    args = _parse_args()
    inserted = await seed_database(args.csv_path)
    print(f"Inserted {inserted} rows into {TEST_TABLE}.")


if __name__ == "__main__":
    asyncio.run(_main())
