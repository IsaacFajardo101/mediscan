"""Contract-only authentication endpoints with mocked service responses."""

from datetime import date
from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field


router = APIRouter(tags=["auth"])


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
async def login(payload: LoginRequest) -> LoginResponse:
    """Return a mocked login result."""
    if payload.email == "unauthorized@example.com":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return LoginResponse(
        header=AuthHeader(
            success=True,
            code=status.HTTP_200_OK,
            message="Login successful.",
        ),
        data=LoginData(
            account_id="mock-account-id",
            access_token="mock-access-token",
            token_type="bearer",
        ),
    )