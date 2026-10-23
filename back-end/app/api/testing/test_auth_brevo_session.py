"""Deterministic Brevo and session-token tests for the authentication module."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

APP_DIRECTORY = Path(__file__).resolve().parents[2]
if str(APP_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(APP_DIRECTORY))

from api.v1 import auth
from services import email_service


class _FakeResult:
    def __init__(self, row: dict[str, str] | None):
        self.row = row

    def mappings(self) -> "_FakeResult":
        return self

    def first(self) -> dict[str, str] | None:
        return self.row

    def scalar_one_or_none(self) -> str | None:
        return self.row.get("account_id") if self.row else None


class _FakeSession:
    def __init__(self, row: dict[str, str] | None):
        self.row = row
        self.queries: list[object] = []

    async def execute(self, query: object, params: dict[str, str]) -> _FakeResult:
        self.queries.append((query, params))
        return _FakeResult(self.row)


def test_brevo_smtp_success_builds_expected_message(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sent: list[tuple[str, int, str, str, object]] = []

    def fake_send(host, port, username, password, message):
        sent.append((host, port, username, password, message))
        return True

    monkeypatch.setenv("BREVO_SMTP_HOST", "smtp.example.test")
    monkeypatch.setenv("BREVO_SMTP_PORT", "2525")
    monkeypatch.setenv("BREVO_SMTP_USERNAME", "smtp-user@example.test")
    monkeypatch.setenv("BREVO_SMTP_PASSWORD", "smtp-password")
    monkeypatch.setenv("BREVO_SENDER_EMAIL", "sender@example.test")
    monkeypatch.setenv("BREVO_SENDER_NAME", "Test MediScan")
    monkeypatch.setattr(email_service, "_send_smtp_message", fake_send)

    delivered = asyncio.run(
        email_service.send_verification_code(
            "recipient@example.test",
            "123456",
            expires_in_minutes=7,
        )
    )

    assert delivered is True
    assert len(sent) == 1
    host, port, username, password, message = sent[0]
    assert (host, port, username, password) == (
        "smtp.example.test",
        2525,
        "smtp-user@example.test",
        "smtp-password",
    )
    assert message["From"] == "Test MediScan <sender@example.test>"
    assert message["To"] == "recipient@example.test"
    assert message["Subject"] == "Your MediScan verification code"
    assert "123456" in message.get_body(("plain", "html")).get_content()
    assert "7 minutes" in message.get_body(("plain", "html")).get_content()


def test_brevo_smtp_failure_is_reported_as_delivery_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("BREVO_SMTP_USERNAME", "smtp-user@example.test")
    monkeypatch.setenv("BREVO_SMTP_PASSWORD", "smtp-password")
    monkeypatch.setenv("BREVO_SENDER_EMAIL", "sender@example.test")
    monkeypatch.setattr(
        email_service,
        "_send_smtp_message",
        lambda *args: False,
    )

    delivered = asyncio.run(
        email_service.send_verification_code(
            "recipient@example.test",
            "123456",
        )
    )

    assert delivered is False


def test_brevo_smtp_missing_configuration_fails_closed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("BREVO_SMTP_USERNAME", raising=False)
    monkeypatch.delenv("BREVO_SMTP_PASSWORD", raising=False)
    monkeypatch.delenv("BREVO_SENDER_EMAIL", raising=False)

    assert asyncio.run(
        email_service.send_verification_code(
            "recipient@example.test",
            "123456",
        )
    ) is False


def test_code_hash_requires_pepper_and_is_deterministic(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("VERIFICATION_CODE_PEPPER", raising=False)
    with pytest.raises(HTTPException) as error:
        auth._hash_code("123456")
    assert error.value.status_code == 503

    monkeypatch.setenv("VERIFICATION_CODE_PEPPER", "test-pepper")
    first = auth._hash_code("123456")
    second = auth._hash_code("123456")
    assert first == second
    assert first != auth._hash_code("654321")


def test_session_token_hash_and_bearer_shape() -> None:
    raw_token = "a" * 43
    hashed = auth._hash_token(raw_token)
    assert len(hashed) == 64
    assert auth._bearer_token_pattern.fullmatch(raw_token)
    assert not auth._bearer_token_pattern.fullmatch("short-token")
    assert not auth._bearer_token_pattern.fullmatch(raw_token + "!")


def test_require_session_accepts_active_session() -> None:
    account_id = "account-1"
    session = _FakeSession({"account_id": account_id, "email": "user@example.test"})
    request = SimpleNamespace()

    result = asyncio.run(
        auth.require_session(
            authorization=f"Bearer {'a' * 43}",
            db=session,
        )
    )

    assert result["account_id"] == account_id
    assert result["email"] == "user@example.test"
    assert len(result["token_hash"]) == 64


@pytest.mark.parametrize(
    "authorization",
    [None, "", "Basic abc", "Bearer short", "Bearer " + ("a" * 42)],
)
def test_require_session_rejects_malformed_bearers(
    authorization: str | None,
) -> None:
    with pytest.raises(HTTPException) as error:
        asyncio.run(
            auth.require_session(
                authorization=authorization,
                db=_FakeSession(None),
            )
        )
    assert error.value.status_code == 401
    assert error.value.headers["WWW-Authenticate"] == "Bearer"


def test_require_session_rejects_missing_expired_or_revoked_session() -> None:
    with pytest.raises(HTTPException) as error:
        asyncio.run(
            auth.require_session(
                authorization=f"Bearer {'b' * 43}",
                db=_FakeSession(None),
            )
        )
    assert error.value.status_code == 401


def test_throttle_returns_retry_after_after_identity_limit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    auth._rate_buckets.clear()
    request = SimpleNamespace(
        client=SimpleNamespace(host="127.0.0.1"),
        url=SimpleNamespace(path="/api/v1/auth/login"),
    )

    for _ in range(5):
        auth._throttle(
            request,
            "user@example.test",
            identity_limit=5,
            ip_limit=100,
            window_seconds=900,
        )

    with pytest.raises(HTTPException) as error:
        auth._throttle(
            request,
            "user@example.test",
            identity_limit=5,
            ip_limit=100,
            window_seconds=900,
        )
    assert error.value.status_code == 429
    assert int(error.value.headers["Retry-After"]) > 0
    auth._rate_buckets.clear()
