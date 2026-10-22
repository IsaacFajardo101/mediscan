"""Contract-only profile management endpoints with mocked responses."""

from datetime import date

from fastapi import APIRouter, Header, HTTPException, Path, status
from pydantic import BaseModel, ConfigDict, Field


router = APIRouter()


class Profile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    profile_id: int
    profile_icon: int = Field(ge=0)
    profile_fullname: str = Field(min_length=1, max_length=255)
    profile_displayname: str = Field(min_length=1, max_length=10)
    profile_birthdate: date


class AccountProfiles(BaseModel):
    model_config = ConfigDict(extra="forbid")

    account_id: int
    email: str
    profiles: list[Profile] | None = None


class ProfilesResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool
    code: int
    message: str
    data: AccountProfiles


class ProfileCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    profile_icon: int = Field(ge=0)
    profile_fullname: str = Field(min_length=1, max_length=255)
    profile_birthdate: date
    profile_displayname: str = Field(min_length=1, max_length=10)


class ProfileResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool
    code: int
    message: str
    data: Profile


class ProfileUpdate(ProfileCreate):
    pass


class ProfilePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    profile_icon: int | None = Field(default=None, ge=0)
    profile_fullname: str | None = Field(default=None, min_length=1, max_length=255)
    profile_birthdate: date | None = None
    profile_displayname: str | None = Field(default=None, min_length=1, max_length=10)


class ProfileDeleteResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool
    code: int
    message: str


def _require_authorization(authorization: str | None) -> None:
    if not authorization or not authorization.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized. Please log in to access this resource.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _mock_profile(profile_id: int = 1) -> Profile:
    return Profile(
        profile_id=profile_id,
        profile_icon=1,
        profile_fullname="Alex Mediscan",
        profile_displayname="alex",
        profile_birthdate=date(1990, 1, 1),
    )


@router.get("/", response_model=ProfilesResponse, status_code=status.HTTP_200_OK)
async def get_profiles(
    authorization: str | None = Header(default=None),
) -> ProfilesResponse:
    _require_authorization(authorization)
    return ProfilesResponse(
        success=True,
        code=status.HTTP_200_OK,
        message="Profiles retrieved successfully.",
        data=AccountProfiles(
            account_id=1,
            email="mock.user@example.com",
            profiles=[_mock_profile()],
        ),
    )


@router.post(
    "/",
    response_model=ProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_profile(
    payload: ProfileCreate,
    authorization: str | None = Header(default=None),
) -> ProfileResponse:
    _require_authorization(authorization)
    return ProfileResponse(
        success=True,
        code=status.HTTP_201_CREATED,
        message="Profile created successfully.",
        data=Profile(profile_id=2, **payload.model_dump()),
    )


@router.put(
    "/{profile_id}",
    response_model=ProfileResponse,
    status_code=status.HTTP_200_OK,
)
async def replace_profile(
    payload: ProfileUpdate,
    profile_id: int = Path(ge=1),
    authorization: str | None = Header(default=None),
) -> ProfileResponse:
    _require_authorization(authorization)
    return ProfileResponse(
        success=True,
        code=status.HTTP_200_OK,
        message="Profile updated successfully.",
        data=Profile(profile_id=profile_id, **payload.model_dump()),
    )


@router.patch(
    "/{profile_id}",
    response_model=ProfileResponse,
    status_code=status.HTTP_200_OK,
)
async def patch_profile(
    payload: ProfilePatch,
    profile_id: int = Path(ge=1),
    authorization: str | None = Header(default=None),
) -> ProfileResponse:
    _require_authorization(authorization)
    profile = _mock_profile(profile_id)
    return ProfileResponse(
        success=True,
        code=status.HTTP_200_OK,
        message="Profile updated successfully.",
        data=profile.model_copy(update=payload.model_dump(exclude_unset=True)),
    )


@router.delete(
    "/{profile_id}",
    response_model=ProfileDeleteResponse,
    status_code=status.HTTP_200_OK,
)
async def delete_profile(
    profile_id: int = Path(ge=1),
    authorization: str | None = Header(default=None),
) -> ProfileDeleteResponse:
    _require_authorization(authorization)
    return ProfileDeleteResponse(
        success=True,
        code=status.HTTP_200_OK,
        message=f"Profile {profile_id} deleted successfully.",
    )