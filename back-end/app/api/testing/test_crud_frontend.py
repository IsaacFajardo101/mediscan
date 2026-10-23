"""End-to-end checks for the local CRUD tester API used by the browser frontend."""

from __future__ import annotations

import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

APP_DIRECTORY = Path(__file__).resolve().parents[2]
if str(APP_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(APP_DIRECTORY))

from crud.crud_user import delete_account
from crud.crud_medicine import delete_fda_medicine
from main import app


client = TestClient(app)
BASE = "/api/dev/crud-tester"
UNIQUE = uuid4().hex
EMAIL = f"frontend-{UNIQUE}@example.test"
UPDATED_EMAIL = f"frontend-updated-{UNIQUE}@example.test"
TOKEN = f"frontend-token-{UNIQUE}"
UPDATED_TOKEN = f"{TOKEN}-updated"
REGISTRATION_ID = f"FE-REG-{UNIQUE[:10].upper()}"
APPROVAL_ID = f"FE-APP-{UNIQUE[:10].upper()}"
ACCOUNT_ID = None
PROFILE_ID = None
FDA_ID = None
SCHEDULE_ID = None
VAULT_ID = None
LOG_ID = None
TOKEN_ID = None
COMBINED_ACCOUNT_ID = None


def call(resource: str, operation: str, arguments: dict, expected: int = 200) -> dict:
    response = client.post(f"{BASE}/{resource}/{operation}", json=arguments)
    assert response.status_code == expected, (
        f"{resource}/{operation}: expected {expected}, "
        f"got {response.status_code}: {response.text}"
    )
    return response.json().get("result")


def test_frontend_exposes_every_allowlisted_operation() -> None:
    response = client.get(f"{BASE}/operations")
    assert response.status_code == 200
    operations = response.json()
    assert sum(len(items) for items in operations.values()) == 41


def test_frontend_api_boundary_and_input_edge_cases() -> None:
    assert client.post(f"{BASE}/unknown/create", json={}).status_code == 404
    assert client.post(f"{BASE}/accounts/unknown", json={}).status_code == 404
    assert client.post(
        f"{BASE}/accounts/get_by_id",
        json={},
    ).status_code == 422
    assert client.post(
        f"{BASE}/profiles/create",
        json={
            "account_id": "not-a-uuid",
            "profile_icon": 1,
            "profile_fullname": "Invalid date",
            "profile_displayname": "invalid",
            "profile_birthdate": "not-a-date",
        },
    ).status_code == 422
    assert client.post(
        f"{BASE}/session_tokens/create",
        json={
            "account_id": "not-a-uuid",
            "token": "invalid-date",
            "token_expires_at": "not-a-datetime",
        },
    ).status_code == 422
    assert client.post(
        f"{BASE}/medication_schedules/create",
        json={
            "account_id": "not-a-uuid",
            "profile_id": "not-a-profile",
            "fda_id": 1,
            "frequency_type": "daily",
            "reminder_times": ["not-a-time"],
            "start_date": "2026-01-01",
        },
    ).status_code == 422


def test_frontend_crud_lifecycle_and_edge_cases() -> None:
    global ACCOUNT_ID, PROFILE_ID, FDA_ID, SCHEDULE_ID, VAULT_ID, LOG_ID, TOKEN_ID
    global COMBINED_ACCOUNT_ID

    try:
        account = call(
            "accounts",
            "create",
            {"email": EMAIL, "password_hash": "frontend-test-hash"},
        )
        ACCOUNT_ID = str(account["account_id"])
        assert account["email"] == EMAIL
        assert "password_hash" not in account

        duplicate = client.post(
            f"{BASE}/accounts/create",
            json={"email": EMAIL.upper(), "password_hash": "duplicate"},
        )
        assert duplicate.status_code == 400

        combined = call(
            "accounts",
            "create_with_profile",
            {
                "email": f"combined-{UNIQUE}@example.test",
                "password_hash": "combined-hash",
                "profile_icon": 2,
                "profile_fullname": "Combined",
                "profile_displayname": "combined",
                "profile_birthdate": "1990-01-01",
            },
        )
        combined_account_id = str(combined["account"]["account_id"])
        COMBINED_ACCOUNT_ID = combined_account_id
        combined_profile_id = str(combined["profile"]["profile_id"])

        profile = call(
            "profiles",
            "create",
            {
                "account_id": ACCOUNT_ID,
                "profile_icon": 1,
                "profile_fullname": "Frontend Test",
                "profile_displayname": "frontend",
                "profile_birthdate": "1991-02-03",
            },
        )
        PROFILE_ID = str(profile["profile_id"])
        assert call("profiles", "get_by_id", {"account_id": ACCOUNT_ID, "profile_id": PROFILE_ID})[
            "profile_id"
        ] == profile["profile_id"]
        assert len(call("profiles", "list_by_account", {"account_id": ACCOUNT_ID})) == 1
        assert call(
            "profiles",
            "patch",
            {"account_id": ACCOUNT_ID, "profile_id": PROFILE_ID, "profile_displayname": "patched"},
        )["profile_displayname"] == "patched"
        assert call(
            "profiles",
            "update",
            {
                "account_id": ACCOUNT_ID,
                "profile_id": PROFILE_ID,
                "profile_icon": 3,
                "profile_fullname": "Updated Frontend",
                "profile_displayname": "updated",
                "profile_birthdate": "1992-03-04",
            },
        )["profile_fullname"] == "Updated Frontend"

        assert client.post(
            f"{BASE}/profiles/patch",
            json={"account_id": ACCOUNT_ID, "profile_id": PROFILE_ID},
        ).status_code == 400
        assert client.post(
            f"{BASE}/profiles/create",
            json={
                "account_id": ACCOUNT_ID,
                "profile_icon": 1,
                "profile_fullname": "Invalid",
                "profile_displayname": "",
                "profile_birthdate": "1990-01-01",
            },
        ).status_code == 400

        medicine = call(
            "fda_medicines",
            "create",
            {
                "registration_id": REGISTRATION_ID,
                "approval_id": APPROVAL_ID,
                "genericname": "Frontend Medicine",
                "brandname": "Frontend Brand",
                "dosage_form": "Tablet",
                "dosage_strength": "10 mg",
                "manufacturer": "Frontend Manufacturer",
                "pharmacologic_category": "Testing",
                "classification": "Over-the-Counter (OTC)",
            },
        )
        FDA_ID = medicine["fda_id"]
        assert call("fda_medicines", "get_by_id", {"fda_id": FDA_ID})["fda_id"] == FDA_ID
        assert call(
            "fda_medicines",
            "get_by_registration_id",
            {"registration_id": f" {REGISTRATION_ID.lower()} "},
        )["fda_id"] == FDA_ID
        assert call(
            "fda_medicines", "search", {"search_term": "frontend medicine", "limit": 1, "offset": 0}
        )[0]["fda_id"] == FDA_ID
        assert call(
            "fda_medicines",
            "update",
            {
                "fda_id": FDA_ID,
                "registration_id": REGISTRATION_ID,
                "approval_id": APPROVAL_ID,
                "genericname": "Updated Frontend Medicine",
                "brandname": "Updated Brand",
                "dosage_form": "Capsule",
                "dosage_strength": "20 mg",
                "manufacturer": "Updated Manufacturer",
                "pharmacologic_category": "Testing",
                "classification": "Prescription (Rx)",
            },
        )["fda_genericname"] == "Updated Frontend Medicine"
        assert client.post(
            f"{BASE}/fda_medicines/create",
            json={
                "registration_id": f"invalid-{UNIQUE}",
                "approval_id": f"invalid-{UNIQUE}",
                "genericname": "Invalid",
                "classification": "not-supported",
            },
        ).status_code == 400
        assert client.post(
            f"{BASE}/fda_medicines/search",
            json={"search_term": "frontend", "limit": 101, "offset": 0},
        ).status_code == 400

        schedule = call(
            "medication_schedules",
            "create",
            {
                "account_id": ACCOUNT_ID,
                "profile_id": PROFILE_ID,
                "fda_id": FDA_ID,
                "frequency_type": "daily",
                "reminder_times": ["08:00"],
                "start_date": "2026-01-01",
                "end_date": "2026-12-31",
                "notes": "Frontend schedule",
            },
        )
        SCHEDULE_ID = schedule["schedule_id"]
        assert call(
            "medication_schedules",
            "get_by_id",
            {"account_id": ACCOUNT_ID, "profile_id": PROFILE_ID, "schedule_id": SCHEDULE_ID},
        )["schedule_id"] == SCHEDULE_ID
        assert call(
            "medication_schedules",
            "list_by_profile",
            {"account_id": ACCOUNT_ID, "profile_id": PROFILE_ID},
        )[0]["schedule_id"] == SCHEDULE_ID
        assert call(
            "medication_schedules",
            "update",
            {
                "account_id": ACCOUNT_ID,
                "profile_id": PROFILE_ID,
                "schedule_id": SCHEDULE_ID,
                "fda_id": FDA_ID,
                "is_active": False,
                "frequency_type": "weekly",
                "reminder_times": ["09:30", "18:00"],
                "start_date": "2026-01-01",
                "end_date": "2026-12-31",
                "notes": "Updated schedule",
            },
        )["sched_frequency_type"] == "weekly"
        assert client.post(
            f"{BASE}/medication_schedules/create",
            json={
                "account_id": ACCOUNT_ID,
                "profile_id": PROFILE_ID,
                "fda_id": FDA_ID,
                "frequency_type": "monthly",
                "reminder_times": ["08:00"],
                "start_date": "2026-01-01",
            },
        ).status_code == 400
        assert client.post(
            f"{BASE}/medication_schedules/create",
            json={
                "account_id": ACCOUNT_ID,
                "profile_id": PROFILE_ID,
                "fda_id": FDA_ID,
                "frequency_type": "daily",
                "reminder_times": [],
                "start_date": "2026-01-01",
            },
        ).status_code == 400

        vault = call(
            "vault_items",
            "create",
            {
                "account_id": ACCOUNT_ID,
                "profile_id": PROFILE_ID,
                "fda_id": FDA_ID,
                "expiry_date": "2027-01-01",
            },
        )
        VAULT_ID = vault["vault_id"]
        assert call(
            "vault_items",
            "get_by_id",
            {"account_id": ACCOUNT_ID, "profile_id": PROFILE_ID, "vault_id": VAULT_ID},
        )["vault_id"] == VAULT_ID
        assert call(
            "vault_items",
            "list_by_profile",
            {"account_id": ACCOUNT_ID, "profile_id": PROFILE_ID},
        )[0]["vault_id"] == VAULT_ID
        assert call(
            "vault_items",
            "update",
            {
                "account_id": ACCOUNT_ID,
                "profile_id": PROFILE_ID,
                "vault_id": VAULT_ID,
                "fda_id": FDA_ID,
                "expiry_date": "2028-01-01",
            },
        )["vault_expiry_date"] == "2028-01-01"

        scheduled_time = datetime.now().replace(microsecond=0)
        log = call(
            "medication_logs",
            "create",
            {
                "account_id": ACCOUNT_ID,
                "profile_id": PROFILE_ID,
                "schedule_id": SCHEDULE_ID,
                "scheduled_time": scheduled_time.isoformat(),
                "log_status": "pending",
            },
        )
        LOG_ID = log["log_id"]
        assert call(
            "medication_logs",
            "get_by_id",
            {"account_id": ACCOUNT_ID, "profile_id": PROFILE_ID, "log_id": LOG_ID},
        )["log_id"] == LOG_ID
        assert call(
            "medication_logs",
            "list_by_profile",
            {
                "account_id": ACCOUNT_ID,
                "profile_id": PROFILE_ID,
                "start_date": scheduled_time.date().isoformat(),
                "end_date": scheduled_time.date().isoformat(),
                "limit": 20,
                "offset": 0,
            },
        )[0]["log_id"] == LOG_ID
        assert call(
            "medication_logs",
            "list_by_schedule",
            {
                "account_id": ACCOUNT_ID,
                "profile_id": PROFILE_ID,
                "schedule_id": SCHEDULE_ID,
                "start_date": scheduled_time.date().isoformat(),
                "end_date": scheduled_time.date().isoformat(),
                "limit": 20,
                "offset": 0,
            },
        )[0]["log_id"] == LOG_ID
        assert call(
            "medication_logs",
            "update_status",
            {
                "account_id": ACCOUNT_ID,
                "profile_id": PROFILE_ID,
                "log_id": LOG_ID,
                "log_status": "taken",
            },
        )["log_status"] == "taken"
        assert client.post(
            f"{BASE}/medication_logs/update_status",
            json={
                "account_id": ACCOUNT_ID,
                "profile_id": PROFILE_ID,
                "log_id": LOG_ID,
                "log_status": "invalid",
            },
        ).status_code == 400

        token = call(
            "session_tokens",
            "create",
            {
                "account_id": ACCOUNT_ID,
                "token": TOKEN,
                "token_expires_at": (datetime.now() + timedelta(days=1)).isoformat(),
            },
        )
        TOKEN_ID = str(token["token_id"])
        assert call("session_tokens", "get", {"token": TOKEN})["token"] == TOKEN
        assert call(
            "session_tokens",
            "update",
            {
                "token_id": TOKEN_ID,
                "token": UPDATED_TOKEN,
                "token_expires_at": (datetime.now() + timedelta(days=2)).isoformat(),
            },
        )["token"] == UPDATED_TOKEN
        assert call("session_tokens", "delete", {"token": UPDATED_TOKEN}) is True
        TOKEN_ID = None

        assert call("accounts", "update", {"account_id": ACCOUNT_ID, "email": UPDATED_EMAIL})[
            "email"
        ] == UPDATED_EMAIL
        assert call("accounts", "mark_verified", {"email": UPDATED_EMAIL})[
            "account_is_verified"
        ] is True
        assert client.post(f"{BASE}/accounts/update", json={"account_id": ACCOUNT_ID}).status_code == 400

        assert call("medication_logs", "delete", {
            "account_id": ACCOUNT_ID, "profile_id": PROFILE_ID, "log_id": LOG_ID
        }) is True
        LOG_ID = None
        assert call("vault_items", "delete", {
            "account_id": ACCOUNT_ID, "profile_id": PROFILE_ID, "vault_id": VAULT_ID
        }) is True
        VAULT_ID = None
        assert call("medication_schedules", "delete", {
            "account_id": ACCOUNT_ID, "profile_id": PROFILE_ID, "schedule_id": SCHEDULE_ID
        }) is True
        SCHEDULE_ID = None
        assert call("fda_medicines", "delete", {"fda_id": FDA_ID}) is True
        FDA_ID = None
        assert call("profiles", "delete", {"account_id": ACCOUNT_ID, "profile_id": PROFILE_ID}) is True
        PROFILE_ID = None
        deleted_account_id = ACCOUNT_ID
        assert call("accounts", "delete", {"account_id": deleted_account_id}) is True
        ACCOUNT_ID = None
        assert call("accounts", "delete", {"account_id": combined_account_id}) is True
        COMBINED_ACCOUNT_ID = None
        assert call("profiles", "delete", {
            "account_id": combined_account_id, "profile_id": combined_profile_id
        }) is False

        response = client.post(
            f"{BASE}/accounts/mark_verified",
            json={"email": UPDATED_EMAIL},
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "Email not found."

        response = client.post(
            f"{BASE}/accounts/get_by_id",
            json={"account_id": deleted_account_id},
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "Account not found."

        response = client.post(
            f"{BASE}/accounts/get_by_email",
            json={"email": UPDATED_EMAIL},
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "Account not found."

        response = client.post(
            f"{BASE}/accounts/delete",
            json={"account_id": deleted_account_id},
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "Account not found."
    finally:
        if TOKEN_ID is not None:
            call("session_tokens", "delete", {"token": TOKEN}, expected=200)
        if LOG_ID is not None:
            call("medication_logs", "delete", {
                "account_id": ACCOUNT_ID, "profile_id": PROFILE_ID, "log_id": LOG_ID
            }, expected=200)
        if SCHEDULE_ID is not None:
            call("medication_schedules", "delete", {
                "account_id": ACCOUNT_ID, "profile_id": PROFILE_ID, "schedule_id": SCHEDULE_ID
            }, expected=200)
        if VAULT_ID is not None:
            call("vault_items", "delete", {
                "account_id": ACCOUNT_ID, "profile_id": PROFILE_ID, "vault_id": VAULT_ID
            }, expected=200)
        if FDA_ID is not None:
            delete_fda_medicine(FDA_ID)
        if ACCOUNT_ID is not None:
            delete_account(ACCOUNT_ID)
        if COMBINED_ACCOUNT_ID is not None:
            delete_account(COMBINED_ACCOUNT_ID)
