"""Contract-only authentication endpoints with mocked service responses."""

from datetime import date
from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

import asyncio
import hashlib
import hmac
import os
import re
import secrets
import time
from collections import deque
from datetime import datetime, timedelta, timezone
from math import ceil
from typing import Any
from uuid import uuid4

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import Depends, Header, Request
from pydantic import field_validator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from services.email_service import send_verification_code


router = APIRouter(tags=["auth"])
_password_hasher = PasswordHasher()
_dummy_password_hash = _password_hasher.hash("mediscan-invalid-login-dummy")
_rate_buckets: dict[str, deque[float]] = {}
_bearer_token_pattern = re.compile(r"^[A-Za-z0-9_-]{43}$")


class AuthHeader(BaseModel):
    """Standard response metadata for authentication operations."""

    model_config = ConfigDict(extra="forbid")

    success: bool
    code: int
    message: str


class SignupRequest(BaseModel):
    """Validated account and profile data submitted during signup."""

    model_config = ConfigDict(extra="forbid")

    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)
    profile_fullname: str = Field(min_length=1, max_length=255)
    profile_displayname: str = Field(min_length=1, max_length=10)
    profile_icon: int = Field(ge=0)
    profile_birthdate: date


class SignupData(BaseModel):
    """Mocked signup result."""

    model_config = ConfigDict(extra="forbid")

    account_id: str
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    verification_required: bool


class SignupResponse(BaseModel):
    """Successful signup response contract."""

    model_config = ConfigDict(extra="forbid")

    header: AuthHeader
    data: SignupData


class VerifyCodeRequest(BaseModel):
    """Verification code submitted after signup."""

    model_config = ConfigDict(extra="forbid")

    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    code: str = Field(pattern=r"^\d{6}$")


class VerifyCodeData(BaseModel):
    """Mocked verification result."""

    model_config = ConfigDict(extra="forbid")

    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    verified: bool


class VerifyCodeResponse(BaseModel):
    """Successful verification response contract."""

    model_config = ConfigDict(extra="forbid")

    header: AuthHeader
    data: VerifyCodeData


class LoginRequest(BaseModel):
    """Credentials submitted during login."""

    model_config = ConfigDict(extra="forbid")

    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)


class LoginData(BaseModel):
    """Mocked login result."""

    model_config = ConfigDict(extra="forbid")

    account_id: str
    access_token: str
    token_type: Literal["bearer"]


class LoginResponse(BaseModel):
    """Successful login response contract."""

    model_config = ConfigDict(extra="forbid")

    header: AuthHeader
    data: LoginData


@router.post(
    "/signup",
    response_model=SignupResponse,
    status_code=status.HTTP_201_CREATED,
)
async def signup(payload: SignupRequest) -> SignupResponse:
    """Return a mocked account creation result."""
    if payload.email == "existing@example.com":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    return SignupResponse(
        header=AuthHeader(
            success=True,
            code=status.HTTP_201_CREATED,
            message="Account created successfully. Verification required.",
        ),
        data=SignupData(
            account_id="mock-account-id",
            email=payload.email,
            verification_required=True,
        ),
    )


@router.post(
    "/verifyCode",
    response_model=VerifyCodeResponse,
    status_code=status.HTTP_200_OK,
)
async def verify_code(payload: VerifyCodeRequest) -> VerifyCodeResponse:
    """Return a mocked email-verification result."""
    if payload.code != "123456":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The verification code is invalid or expired.",
        )

    return VerifyCodeResponse(
        header=AuthHeader(
            success=True,
            code=status.HTTP_200_OK,
            message="Account verified successfully.",
        ),
        data=VerifyCodeData(email=payload.email, verified=True),
    )


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
)
async def login(
    payload: "CredentialsRequest",
    request: Request,
    db: AsyncSession | None = Depends(get_db),
) -> LoginResponse:
    """Authenticate credentials and issue a bearer session token."""
    return await _login_with_session(payload, request, db)


class CredentialsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(
        pattern=r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
    )
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: Any) -> Any:
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("password")
    @classmethod
    def reject_common_passwords(cls, value: str) -> str:
        if value.casefold() in {
            "password",
            "password123",
            "12345678",
            "qwerty123",
            "letmein123",
        }:
            raise ValueError("Choose a less common password.")
        return value


class EmailRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(pattern=r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


class VerificationRequest(EmailRequest):
    code: str = Field(pattern=r"^\d{6}$")


class AuthActionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    header: AuthHeader


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _database_required(db: AsyncSession | None) -> AsyncSession:
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication storage is unavailable.",
        )
    return db


def _utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _configured_ttl(variable: str, default: int, maximum: int) -> int:
    try:
        value = int(os.getenv(variable, str(default)))
    except ValueError:
        return default
    return min(max(value, 1), maximum)


def _throttle(
    request: Request,
    identity: str,
    *,
    identity_limit: int,
    ip_limit: int,
    window_seconds: int,
) -> None:
    now = time.monotonic()
    client_ip = request.client.host if request.client else "unknown"
    email_key = hashlib.sha256(identity.encode("utf-8")).hexdigest()
    keys = (
        (f"ip:{client_ip}:{request.url.path}", ip_limit),
        (f"identity:{email_key}:{request.url.path}", identity_limit),
    )

    for key, _ in keys:
        bucket = _rate_buckets.get(key)
        if bucket is not None:
            while bucket and now - bucket[0] >= window_seconds:
                bucket.popleft()
            if not bucket:
                _rate_buckets.pop(key, None)

    retry_after = 0
    for key, limit in keys:
        bucket = _rate_buckets.get(key)
        if bucket is not None and len(bucket) >= limit:
            retry_after = max(
                retry_after,
                ceil(window_seconds - (now - bucket[0])),
            )
    if retry_after:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )

    for key, _ in keys:
        _rate_buckets.setdefault(key, deque()).append(now)

    if len(_rate_buckets) > 10000:
        expired_keys = [
            key
            for key, bucket in _rate_buckets.items()
            if not bucket or now - bucket[-1] >= window_seconds
        ]
        for key in expired_keys:
            _rate_buckets.pop(key, None)
        while len(_rate_buckets) > 10000:
            oldest_key = min(
                _rate_buckets,
                key=lambda key: _rate_buckets[key][-1],
            )
            _rate_buckets.pop(oldest_key, None)


async def _hash_password(password: str) -> str:
    return await asyncio.to_thread(_password_hasher.hash, password)


def _matches_password(password_hash: str, password: str) -> bool:
    try:
        return _password_hasher.verify(password_hash, password)
    except VerificationError:
        return False


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("ascii")).hexdigest()


def _hash_code(code: str) -> str:
    pepper = os.getenv("VERIFICATION_CODE_PEPPER")
    if not pepper:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is not configured.",
        )
    return hmac.new(
        pepper.encode("utf-8"), code.encode("ascii"), hashlib.sha256
    ).hexdigest()


def _new_verification_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _invalid_bearer() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired session.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def _login_with_session(
    payload: LoginRequest,
    request: Request,
    database: AsyncSession | None,
) -> LoginResponse:
    email = _normalize_email(payload.email)
    _throttle(
        request,
        email,
        identity_limit=5,
        ip_limit=30,
        window_seconds=15 * 60,
    )
    db = _database_required(database)

    result = await db.execute(
        text(
            """
            SELECT account_id, password_hash, account_is_verified, account_is_deleted
            FROM accounts
            WHERE email = :email
            """
        ),
        {"email": email},
    )
    account = result.mappings().first()
    stored_hash = account["password_hash"] if account else _dummy_password_hash
    password_valid = await asyncio.to_thread(
        _matches_password, stored_hash, payload.password
    )
    await db.commit()
    if (
        account is None
        or not password_valid
        or account["account_is_deleted"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not account["account_is_verified"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in.",
        )

    token = secrets.token_urlsafe(32)
    token_hash = _hash_token(token)
    account_id = str(account["account_id"])
    expires_at = _utc_now_naive() + timedelta(
        days=_configured_ttl("SESSION_TOKEN_TTL_DAYS", 7, 30)
    )

    async with db.begin():
        account_state = await db.execute(
            text(
                """
                SELECT account_is_verified, account_is_deleted
                FROM accounts
                WHERE account_id = CAST(:account_id AS UUID)
                FOR UPDATE
                """
            ),
            {"account_id": account_id},
        )
        current_account = account_state.mappings().first()
        if (
            current_account is None
            or not current_account["account_is_verified"]
            or current_account["account_is_deleted"]
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        active = await db.execute(
            text(
                """
                SELECT token_id
                FROM session_tokens
                WHERE account_id = CAST(:account_id AS UUID)
                  AND token_expires_at > now()
                ORDER BY token_created_at DESC
                """
            ),
            {"account_id": account_id},
        )
        for row in active.mappings().all()[4:]:
            await db.execute(
                text("DELETE FROM session_tokens WHERE token_id = :token_id"),
                {"token_id": row["token_id"]},
            )
        await db.execute(
            text(
                """
                INSERT INTO session_tokens (
                    token_id, account_id, token, token_created_at, token_expires_at
                )
                VALUES (
                    CAST(:token_id AS UUID), CAST(:account_id AS UUID),
                    :token, now(), :expires_at
                )
                """
            ),
            {
                "token_id": str(uuid4()),
                "account_id": account_id,
                "token": token_hash,
                "expires_at": expires_at,
            },
        )

    return LoginResponse(
        header=AuthHeader(
            success=True,
            code=status.HTTP_200_OK,
            message="Login successful.",
        ),
        data=LoginData(
            account_id=account_id,
            access_token=token,
            token_type="bearer",
        ),
    )


@router.post(
    "/register",
    response_model=AuthActionResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def register(
    payload: CredentialsRequest,
    request: Request,
    db: AsyncSession | None = Depends(get_db),
) -> AuthActionResponse:
    email = _normalize_email(payload.email)
    _throttle(
        request,
        email,
        identity_limit=5,
        ip_limit=20,
        window_seconds=60 * 60,
    )
    session = _database_required(db)
    password_hash = await _hash_password(payload.password)
    code = _new_verification_code()
    verification_ttl = _configured_ttl(
        "VERIFICATION_CODE_TTL_MINUTES", 10, 60
    )
    account_id: str | None = None

    async with session.begin():
        result = await session.execute(
            text(
                """
                INSERT INTO accounts (
                    account_id, email, password_hash, account_is_verified,
                    account_is_deleted, account_created_at, account_updated_at
                )
                VALUES (
                    CAST(:account_id AS UUID), :email, :password_hash,
                    FALSE, FALSE, now(), now()
                )
                ON CONFLICT (email) DO NOTHING
                RETURNING account_id
                """
            ),
            {
                "account_id": str(uuid4()),
                "email": email,
                "password_hash": password_hash,
            },
        )
        created_id = result.scalar_one_or_none()
        if created_id is not None:
            account_id = str(created_id)
            await session.execute(
                text(
                    """
                    INSERT INTO email_verifications
                        (account_id, purpose, code_hash, expires_at)
                    VALUES
                        (CAST(:account_id AS UUID), 'verify_email', :code_hash,
                         :expires_at)
                    """
                ),
                {
                    "account_id": account_id,
                    "code_hash": _hash_code(code),
                    "expires_at": _utc_now_naive()
                    + timedelta(minutes=verification_ttl),
                },
            )

    if account_id is not None and not await send_verification_code(
        email, code, verification_ttl
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to send verification email. Please try again later.",
        )
    return AuthActionResponse(
        header=AuthHeader(
            success=True,
            code=status.HTTP_202_ACCEPTED,
            message="Request accepted. If eligible, further instructions will be provided.",
        )
    )


@router.post(
    "/verify-email",
    response_model=AuthActionResponse,
    status_code=status.HTTP_200_OK,
)
async def verify_email(
    payload: VerificationRequest,
    request: Request,
    db: AsyncSession | None = Depends(get_db),
) -> AuthActionResponse:
    email = _normalize_email(payload.email)
    _throttle(
        request,
        email,
        identity_limit=5,
        ip_limit=30,
        window_seconds=15 * 60,
    )
    session = _database_required(db)
    verified = False

    async with session.begin():
        result = await session.execute(
            text(
                """
                SELECT ev.verification_id, ev.account_id, ev.code_hash,
                       ev.attempts, ev.expires_at
                FROM email_verifications ev
                JOIN accounts a ON a.account_id = ev.account_id
                WHERE a.email = :email
                  AND a.account_is_deleted = FALSE
                  AND a.account_is_verified = FALSE
                  AND ev.purpose = 'verify_email'
                  AND ev.consumed_at IS NULL
                ORDER BY ev.created_at DESC
                LIMIT 1
                FOR UPDATE OF ev
                """
            ),
            {"email": email},
        )
        verification = result.mappings().first()
        if verification is not None:
            verification_id = verification["verification_id"]
            now = _utc_now_naive()
            if verification["expires_at"] <= now:
                await session.execute(
                    text(
                        """
                        UPDATE email_verifications
                        SET consumed_at = now()
                        WHERE verification_id = :verification_id
                        """
                    ),
                    {"verification_id": verification_id},
                )
            elif not secrets.compare_digest(
                _hash_code(payload.code), verification["code_hash"]
            ):
                attempts = verification["attempts"] + 1
                await session.execute(
                    text(
                        """
                        UPDATE email_verifications
                        SET attempts = :attempts,
                            consumed_at = CASE WHEN :attempts >= 5
                                               THEN now() ELSE consumed_at END
                        WHERE verification_id = :verification_id
                        """
                    ),
                    {
                        "attempts": attempts,
                        "verification_id": verification_id,
                    },
                )
            else:
                await session.execute(
                    text(
                        """
                        UPDATE email_verifications
                        SET consumed_at = now()
                        WHERE verification_id = :verification_id
                        """
                    ),
                    {"verification_id": verification_id},
                )
                await session.execute(
                    text(
                        """
                        UPDATE accounts
                        SET account_is_verified = TRUE, account_updated_at = now()
                        WHERE account_id = CAST(:account_id AS UUID)
                        """
                    ),
                    {"account_id": str(verification["account_id"])},
                )
                verified = True

    if not verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The verification code is invalid or expired.",
        )
    return AuthActionResponse(
        header=AuthHeader(
            success=True,
            code=status.HTTP_200_OK,
            message="Account verified successfully.",
        )
    )


@router.post(
    "/resend-code",
    response_model=AuthActionResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def resend_code(
    payload: EmailRequest,
    request: Request,
    db: AsyncSession | None = Depends(get_db),
) -> AuthActionResponse:
    email = _normalize_email(payload.email)
    _throttle(
        request,
        email,
        identity_limit=5,
        ip_limit=15,
        window_seconds=60 * 60,
    )
    session = _database_required(db)
    code = _new_verification_code()
    verification_ttl = _configured_ttl(
        "VERIFICATION_CODE_TTL_MINUTES", 10, 60
    )
    send_to_email = False

    async with session.begin():
        result = await session.execute(
            text(
                """
                SELECT account_id
                FROM accounts
                WHERE email = :email
                  AND account_is_verified = FALSE
                  AND account_is_deleted = FALSE
                FOR UPDATE
                """
            ),
            {"email": email},
        )
        account_id = result.scalar_one_or_none()
        if account_id is not None:
            account_id = str(account_id)
            count_result = await session.execute(
                text(
                    """
                    SELECT COUNT(*)
                    FROM email_verifications
                    WHERE account_id = CAST(:account_id AS UUID)
                      AND purpose = 'verify_email'
                      AND created_at > now() - interval '1 day'
                    """
                ),
                {"account_id": account_id},
            )
            latest_result = await session.execute(
                text(
                    """
                    SELECT created_at
                    FROM email_verifications
                    WHERE account_id = CAST(:account_id AS UUID)
                      AND purpose = 'verify_email'
                    ORDER BY created_at DESC
                    LIMIT 1
                    """
                ),
                {"account_id": account_id},
            )
            latest = latest_result.scalar_one_or_none()
            within_cooldown = (
                latest is not None
                and latest > _utc_now_naive() - timedelta(seconds=60)
            )
            if count_result.scalar_one() < 5 and not within_cooldown:
                await session.execute(
                    text(
                        """
                        UPDATE email_verifications
                        SET consumed_at = now()
                        WHERE account_id = CAST(:account_id AS UUID)
                          AND purpose = 'verify_email'
                          AND consumed_at IS NULL
                        """
                    ),
                    {"account_id": account_id},
                )
                await session.execute(
                    text(
                        """
                        INSERT INTO email_verifications
                            (account_id, purpose, code_hash, expires_at)
                        VALUES
                            (CAST(:account_id AS UUID), 'verify_email', :code_hash,
                             :expires_at)
                        """
                    ),
                    {
                        "account_id": account_id,
                        "code_hash": _hash_code(code),
                        "expires_at": _utc_now_naive()
                        + timedelta(minutes=verification_ttl),
                    },
                )
                send_to_email = True

    if send_to_email and not await send_verification_code(
        email, code, verification_ttl
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to send verification email. Please try again later.",
        )
    return AuthActionResponse(
        header=AuthHeader(
            success=True,
            code=status.HTTP_202_ACCEPTED,
            message="Request accepted. If eligible, further instructions will be provided.",
        )
    )


async def require_session(
    authorization: str | None = Header(default=None),
    db: AsyncSession | None = Depends(get_db),
) -> dict[str, str]:
    """Resolve a valid bearer token to its active account identity."""
    if not authorization:
        raise _invalid_bearer()
    scheme, separator, token = authorization.partition(" ")
    if (
        not separator
        or scheme.lower() != "bearer"
        or not _bearer_token_pattern.fullmatch(token)
    ):
        raise _invalid_bearer()
    session = _database_required(db)
    token_hash = _hash_token(token)
    result = await session.execute(
        text(
            """
            SELECT a.account_id, a.email
            FROM session_tokens st
            JOIN accounts a ON a.account_id = st.account_id
            WHERE st.token = :token
              AND st.token_expires_at > now()
              AND a.account_is_verified = TRUE
              AND a.account_is_deleted = FALSE
            """
        ),
        {"token": token_hash},
    )
    account = result.mappings().first()
    if account is None:
        raise _invalid_bearer()
    return {
        "account_id": str(account["account_id"]),
        "email": account["email"],
        "token_hash": token_hash,
    }


async def require_owned_profile(
    profile_id: str,
    account_id: str,
    db: AsyncSession | None,
) -> None:
    """Reject access to profile IDs not owned by the authenticated account."""
    session = _database_required(db)
    result = await session.execute(
        text(
            """
            SELECT 1
            FROM profiles
            WHERE profile_id = :profile_id
              AND account_id = CAST(:account_id AS UUID)
              AND profile_is_deleted = FALSE
            """
        ),
        {"profile_id": profile_id, "account_id": account_id},
    )
    if result.first() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found.",
        )


async def require_router_access(
    request: Request,
    account: dict[str, str] = Depends(require_session),
    db: AsyncSession | None = Depends(get_db),
) -> None:
    """Authenticate protected-router requests and authorize profile paths."""
    profile_id = request.path_params.get("profile_id")
    if profile_id is not None:
        await require_owned_profile(str(profile_id), account["account_id"], db)


@router.post(
    "/logout",
    response_model=AuthActionResponse,
    status_code=status.HTTP_200_OK,
)
async def logout(
    request: Request,
    account: dict[str, str] = Depends(require_session),
    db: AsyncSession | None = Depends(get_db),
) -> AuthActionResponse:
    _throttle(
        request,
        account["account_id"],
        identity_limit=30,
        ip_limit=60,
        window_seconds=60 * 60,
    )
    session = _database_required(db)
    await session.execute(
        text(
            """
            DELETE FROM session_tokens
            WHERE token = :token
              AND account_id = CAST(:account_id AS UUID)
            """
        ),
        {
            "token": account["token_hash"],
            "account_id": account["account_id"],
        },
    )
    await session.commit()
    return AuthActionResponse(
        header=AuthHeader(
            success=True,
            code=status.HTTP_200_OK,
            message="Logged out successfully.",
        )
    )


@router.post(
    "/logout-all",
    response_model=AuthActionResponse,
    status_code=status.HTTP_200_OK,
)
async def logout_all(
    request: Request,
    account: dict[str, str] = Depends(require_session),
    db: AsyncSession | None = Depends(get_db),
) -> AuthActionResponse:
    _throttle(
        request,
        account["account_id"],
        identity_limit=10,
        ip_limit=30,
        window_seconds=60 * 60,
    )
    session = _database_required(db)
    await session.execute(
        text(
            """
            DELETE FROM session_tokens
            WHERE account_id = CAST(:account_id AS UUID)
            """
        ),
        {"account_id": account["account_id"]},
    )
    await session.commit()
    return AuthActionResponse(
        header=AuthHeader(
            success=True,
            code=status.HTTP_200_OK,
            message="All sessions have been revoked.",
        )
    )