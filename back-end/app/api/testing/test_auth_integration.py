"""Local authentication integration checks.

Run the guarded real-flow test only after configuring:

    RUN_REAL_AUTH_TESTS=true
    AUTH_TEST_EMAIL=an inbox you control
    AUTH_TEST_VERIFICATION_CODE=the code received from Brevo
    VERIFICATION_CODE_PEPPER=...
    BREVO_SMTP_USERNAME=...
    BREVO_SMTP_PASSWORD=...
    BREVO_SENDER_EMAIL=...

The code is supplied after the registration email arrives so no mailbox
credentials or provider-specific IMAP logic are required.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

APP_DIRECTORY = Path(__file__).resolve().parents[2]
if str(APP_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(APP_DIRECTORY))

from crud.crud_user import get_account_by_email, get_session_token
from main import app


AUTH_BASE = "/api/v1/auth"
PROTECTED_ENDPOINTS = (
    ("/api/v1/accounts/me/profiles/", "get"),
    ("/api/v1/medicines/", "get"),
)


def _real_auth_enabled() -> bool:
    return os.getenv("RUN_REAL_AUTH_TESTS", "").strip().lower() == "true"


def _required_real_auth_settings() -> list[str]:
    names = (
        "AUTH_TEST_EMAIL",
        "VERIFICATION_CODE_PEPPER",
        "BREVO_SMTP_USERNAME",
        "BREVO_SMTP_PASSWORD",
        "BREVO_SENDER_EMAIL",
    )
    return [name for name in names if not os.getenv(name)]


def test_auth_routes_require_valid_input_and_bearer_sessions() -> None:
    client = TestClient(app)

    assert client.post(
        f"{AUTH_BASE}/register",
        json={"email": "invalid", "password": "short"},
    ).status_code == 422
    assert client.post(
        f"{AUTH_BASE}/login",
        json={"email": "invalid", "password": "short"},
    ).status_code == 422

    for path, method in PROTECTED_ENDPOINTS:
        response = getattr(client, method)(path)
        assert response.status_code == 401
        assert response.headers["www-authenticate"] == "Bearer"

        malformed = client.get(path, headers={"Authorization": "Basic invalid"})
        assert malformed.status_code == 401


@pytest.mark.skipif(
    not _real_auth_enabled(),
    reason="Set RUN_REAL_AUTH_TESTS=true to run Brevo/database integration flow.",
)
def test_real_auth_session_works_with_protected_endpoints_and_crud() -> None:
    missing = _required_real_auth_settings()
    if missing:
        pytest.fail(
            "Real auth tests require missing environment variables: "
            + ", ".join(missing)
        )

    email = os.environ["AUTH_TEST_EMAIL"].strip().lower()
    password = os.getenv("AUTH_TEST_PASSWORD", "AuthIntegration-Password-2026!")
    code = os.getenv("AUTH_TEST_VERIFICATION_CODE")
    if not code:
        pytest.fail(
            "Set AUTH_TEST_VERIFICATION_CODE to the six-digit code received "
            "after registration, then rerun this test."
        )

    client = TestClient(app)
    account_id = None
    try:
        registration = client.post(
            f"{AUTH_BASE}/register",
            json={"email": email, "password": password},
        )
        assert registration.status_code == 202, registration.text

        verification = client.post(
            f"{AUTH_BASE}/verify-email",
            json={"email": email, "code": code},
        )
        assert verification.status_code == 200, verification.text

        login = client.post(
            f"{AUTH_BASE}/login",
            json={"email": email, "password": password},
        )
        assert login.status_code == 200, login.text
        login_data = login.json()["data"]
        token = login_data["access_token"]
        assert login_data["token_type"] == "bearer"
        assert len(token) == 43

        account = get_account_by_email(email)
        assert account is not None
        account_id = str(account["account_id"])
        assert account["account_is_verified"] is True

        authorization = {"Authorization": f"Bearer {token}"}
        for path, method in PROTECTED_ENDPOINTS:
            response = getattr(client, method)(path, headers=authorization)
            assert response.status_code == 200, f"{path}: {response.text}"

        logout = client.post(f"{AUTH_BASE}/logout", headers=authorization)
        assert logout.status_code == 200, logout.text
        assert client.get(
            "/api/v1/accounts/me/profiles/",
            headers=authorization,
        ).status_code == 401

        # The auth route stores a SHA-256 token while the legacy CRUD helper
        # expects a raw token. This assertion documents that interoperability
        # requirement instead of treating a missing CRUD lookup as success.
        assert get_session_token(token) is None
    finally:
        if account_id is not None:
            _delete_test_account(account_id)


def _delete_test_account(account_id: str) -> None:
    """Remove an integration account using the existing PostgreSQL pool."""
    from db.database import connection_cursor

    with connection_cursor() as cursor:
        cursor.execute(
            "DELETE FROM accounts WHERE account_id = %s",
            (account_id,),
        )
