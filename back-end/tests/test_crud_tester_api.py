"""Access-control tests for the local CRUD tester API."""

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

APP_DIRECTORY = Path(__file__).resolve().parents[1] / "app"
if str(APP_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(APP_DIRECTORY))

from main import app
from api.v1.auth import require_session


@pytest.fixture(autouse=True)
def authenticated_crud_tester():
    async def fake_session():
        return {
            "account_id": "test-account",
            "email": "test@example.test",
            "token_hash": "test-token-hash",
        }

    app.dependency_overrides[require_session] = fake_session
    yield
    app.dependency_overrides.pop(require_session, None)


def test_crud_tester_page_and_assets_are_served():
    client = TestClient(app)
    page = client.get("/crud-tester/")
    script = client.get("/crud-tester/app.js")

    assert page.status_code == 200
    assert "MediScan CRUD Tester" in page.text
    assert script.status_code == 200
    assert "operationDefinitions" in script.text


def test_crud_tester_api_is_disabled_by_default(monkeypatch):
    monkeypatch.setenv("ENABLE_CRUD_TEST_API", "false")
    response = TestClient(app).get("/api/v1/dev/crud-tester/operations")
    assert response.status_code == 404


def test_crud_tester_api_exposes_allowlisted_operations(monkeypatch):
    monkeypatch.setenv("ENABLE_CRUD_TEST_API", "true")
    response = TestClient(app).get("/api/v1/dev/crud-tester/operations")
    assert response.status_code == 200
    operations = response.json()
    assert set(operations) == {
        "accounts",
        "profiles",
        "session_tokens",
        "fda_medicines",
        "medication_schedules",
        "vault_items",
        "medication_logs",
    }
    assert "get_for_login" not in operations["accounts"]


def test_crud_tester_rejects_unknown_operations_without_database_access(monkeypatch):
    monkeypatch.setenv("ENABLE_CRUD_TEST_API", "true")
    response = TestClient(app).post(
        "/api/v1/dev/crud-tester/accounts/not_an_operation",
        json={},
    )
    assert response.status_code == 404


def test_crud_tester_validates_arguments_before_database_access(monkeypatch):
    monkeypatch.setenv("ENABLE_CRUD_TEST_API", "true")
    response = TestClient(app).post(
        "/api/v1/dev/crud-tester/accounts/get_by_id",
        json={},
    )
    assert response.status_code == 422


def test_crud_tester_calls_the_account_crud_function(database_records, monkeypatch):
    monkeypatch.setenv("ENABLE_CRUD_TEST_API", "true")
    response = TestClient(app).post(
        "/api/v1/dev/crud-tester/accounts/get_by_id",
        json={"account_id": str(database_records["account_id"])},
    )

    assert response.status_code == 200
    assert response.json()["result"]["email"] == database_records["email"]
