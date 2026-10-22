"""Shared fixtures for PostgreSQL CRUD tests."""

import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path
from uuid import uuid4

import pytest

TEST_FILE = Path(__file__)
TEST_DIRECTORY = TEST_FILE.resolve()
APP_DIRECTORY = TEST_DIRECTORY.parents[1] / "app"
sys.path.insert(0, str(APP_DIRECTORY))

from crud import crud_medicine as medicine_crud
from crud import crud_user as user_crud
from db.database import connection_cursor


def _require_row(row, description: str) -> dict:
    """Return a created row or stop fixture setup with a useful error."""
    if row is None:
        raise RuntimeError(description + " was not created.")
    return row


@pytest.fixture
def database_records():
    """Create related rows for all seven tables and remove them after one test."""
    records = {
        "account_ids": [],
        "profile_ids": [],
        "fda_ids": [],
        "schedule_ids": [],
        "vault_ids": [],
        "log_ids": [],
        "token_ids": [],
    }

    try:
        unique_value = uuid4().hex
        email = "crud-" + unique_value + "@example.test"
        account = _require_row(
            user_crud.create_account(email, "test-hash-not-a-real-password"),
            "Account",
        )
        account_id = account["account_id"]
        records["account_ids"].append(account_id)

        profile = _require_row(
            user_crud.create_profile(
                account_id,
                1,
                "CRUD Test Profile",
                "crudtest",
                date.today(),
            ),
            "Profile",
        )
        profile_id = profile["profile_id"]
        records["profile_ids"].append(profile_id)

        registration_id = "DR-XY " + unique_value[:8].upper()
        approval_id = "AP-" + unique_value[:8].upper()
        genericname = "CrudMedicine" + unique_value[:8]
        medicine = _require_row(
            medicine_crud.create_fda_medicine(
                registration_id,
                approval_id,
                genericname,
                "CRUD Brand",
                "Tablet",
                "10 mg",
                "CRUD Manufacturer",
                "Test Category",
                "Over-the-Counter (OTC)",
            ),
            "FDA medicine",
        )
        fda_id = medicine["fda_id"]
        records["fda_ids"].append(fda_id)

        scheduled_at = datetime.now()
        start_date = date.today()
        end_date = start_date + timedelta(days=30)
        schedule = _require_row(
            medicine_crud.create_schedule(
                account_id,
                profile_id,
                fda_id,
                "daily",
                [time(8, 0)],
                start_date,
                end_date,
                "Fixture schedule",
            ),
            "Medication schedule",
        )
        schedule_id = schedule["schedule_id"]
        records["schedule_ids"].append(schedule_id)

        vault_item = _require_row(
            medicine_crud.create_vault_item(
                account_id,
                profile_id,
                fda_id,
                start_date + timedelta(days=90),
            ),
            "Vault item",
        )
        vault_id = vault_item["vault_id"]
        records["vault_ids"].append(vault_id)

        log = _require_row(
            medicine_crud.create_medication_log(
                account_id,
                profile_id,
                schedule_id,
                scheduled_at,
            ),
            "Medication log",
        )
        log_id = log["log_id"]
        records["log_ids"].append(log_id)

        token_value = "crud-token-" + unique_value
        token = _require_row(
            user_crud.create_session_token(
                account_id,
                token_value,
                scheduled_at + timedelta(days=1),
            ),
            "Session token",
        )
        token_id = token["token_id"]
        records["token_ids"].append(token_id)

        yield {
            "account": account,
            "account_id": account_id,
            "email": email,
            "profile": profile,
            "profile_id": profile_id,
            "medicine": medicine,
            "fda_id": fda_id,
            "registration_id": registration_id,
            "genericname": genericname,
            "schedule": schedule,
            "schedule_id": schedule_id,
            "vault_item": vault_item,
            "vault_id": vault_id,
            "log": log,
            "log_id": log_id,
            "token": token,
            "token_value": token_value,
            "scheduled_at": scheduled_at,
            "start_date": start_date,
            "end_date": end_date,
            "records": records,
        }
    finally:
        if any(records.values()):
            with connection_cursor() as cursor:
                for log_id in records["log_ids"]:
                    cursor.execute(
                        "DELETE FROM medication_logs WHERE log_id = %s",
                        (log_id,),
                    )
                for schedule_id in records["schedule_ids"]:
                    cursor.execute(
                        "DELETE FROM medication_schedules WHERE schedule_id = %s",
                        (schedule_id,),
                    )
                for vault_id in records["vault_ids"]:
                    cursor.execute(
                        "DELETE FROM vault_items WHERE vault_id = %s",
                        (vault_id,),
                    )
                for token_id in records["token_ids"]:
                    cursor.execute(
                        "DELETE FROM session_tokens WHERE token_id = %s",
                        (token_id,),
                    )
                for profile_id in records["profile_ids"]:
                    cursor.execute(
                        "DELETE FROM profiles WHERE profile_id = %s",
                        (profile_id,),
                    )
                for account_id in records["account_ids"]:
                    cursor.execute(
                        "DELETE FROM accounts WHERE account_id = %s",
                        (account_id,),
                    )
                for fda_id in records["fda_ids"]:
                    cursor.execute(
                        "DELETE FROM philippines_fda_medicines WHERE fda_id = %s",
                        (fda_id,),
                    )
