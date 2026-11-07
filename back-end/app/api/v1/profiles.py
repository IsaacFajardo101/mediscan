"""Authenticated account-profile management endpoints."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Path, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict, Field

from api.v1.auth import require_router_access, require_session
from crud.crud_user import (
    ForeignKeyError,
    create_profile as create_profile_record,
    delete_profile as delete_profile_record,
    list_profiles_by_account,
    patch_profile as patch_profile_record,
    update_profile as update_profile_record,
)


router = APIRouter()
router.dependencies.append(Depends(require_router_access))


class Profile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    profile_id: str
    profile_icon: int = Field(ge=0)
    profile_fullname: str = Field(min_length=1, max_length=255)
    profile_displayname: str = Field(min_length=1, max_length=10)
    profile_birthdate: date


class AccountProfiles(BaseModel):
    model_config = ConfigDict(extra="forbid")

    account_id: str
    email: str
    profiles: list[Profile]


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


def _profile(row: dict) -> Profile:
    return Profile(
        profile_id=str(row["profile_id"]),
        profile_icon=int(row["profile_icon"]),
        profile_fullname=str(row["profile_fullname"]),
        profile_displayname=str(row["profile_displayname"]),
        profile_birthdate=row["profile_birthdate"],
    )


@router.get("/", response_model=ProfilesResponse)
async def get_profiles(
    account: dict[str, str] = Depends(require_session),
) -> ProfilesResponse:
    profiles = await run_in_threadpool(list_profiles_by_account, account["account_id"])
    return ProfilesResponse(
        success=True,
        code=status.HTTP_200_OK,
        message="Profiles retrieved successfully.",
        data=AccountProfiles(
            account_id=account["account_id"],
            email=account["email"],
            profiles=[_profile(row) for row in profiles],
        ),
    )


@router.post("/", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    payload: ProfileCreate,
    account: dict[str, str] = Depends(require_session),
) -> ProfileResponse:
    try:
        profile = await run_in_threadpool(
            create_profile_record,
            account["account_id"],
            payload.profile_icon,
            payload.profile_fullname,
            payload.profile_displayname,
            payload.profile_birthdate,
        )
    except ForeignKeyError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")
    return ProfileResponse(
        success=True,
        code=status.HTTP_201_CREATED,
        message="Profile created successfully.",
        data=_profile(profile),
    )


@router.put("/{profile_id}", response_model=ProfileResponse)
async def replace_profile(
    payload: ProfileUpdate,
    profile_id: str = Path(min_length=1),
    account: dict[str, str] = Depends(require_session),
) -> ProfileResponse:
    profile = await run_in_threadpool(
        update_profile_record,
        account["account_id"],
        profile_id,
        payload.profile_icon,
        payload.profile_fullname,
        payload.profile_displayname,
        payload.profile_birthdate,
    )
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return ProfileResponse(
        success=True,
        code=status.HTTP_200_OK,
        message="Profile updated successfully.",
        data=_profile(profile),
    )


@router.patch("/{profile_id}", response_model=ProfileResponse)
async def patch_profile(
    payload: ProfilePatch,
    profile_id: str = Path(min_length=1),
    account: dict[str, str] = Depends(require_session),
) -> ProfileResponse:
    profile = await run_in_threadpool(
        patch_profile_record,
        account["account_id"],
        profile_id,
        payload.profile_icon,
        payload.profile_fullname,
        payload.profile_displayname,
        payload.profile_birthdate,
    )
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return ProfileResponse(
        success=True,
        code=status.HTTP_200_OK,
        message="Profile updated successfully.",
        data=_profile(profile),
    )


@router.delete("/{profile_id}", response_model=ProfileDeleteResponse)
async def delete_profile(
    profile_id: str = Path(min_length=1),
    account: dict[str, str] = Depends(require_session),
) -> ProfileDeleteResponse:
    deleted = await run_in_threadpool(delete_profile_record, account["account_id"], profile_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return ProfileDeleteResponse(
        success=True,
        code=status.HTTP_200_OK,
        message=f"Profile {profile_id} deleted successfully.",
    )
