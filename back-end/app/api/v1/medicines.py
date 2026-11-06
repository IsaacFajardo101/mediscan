"""Contract-only medicine-assigned profile endpoints with mocked responses."""

from datetime import date

from fastapi import APIRouter, HTTPException, Path, status
from fastapi import Depends
from pydantic import BaseModel, ConfigDict, Field

from api.v1.auth import require_router_access


router = APIRouter()
router.dependencies.append(Depends(require_router_access))


class MedicineProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    profile_id: int
    profile_icon: int = Field(ge=0)
    profile_fullname: str = Field(min_length=1, max_length=255)
    profile_birthdate: date
    profile_relationship: str = Field(min_length=1, max_length=100)


class MedicineProfilesAccount(BaseModel):
    model_config = ConfigDict(extra="forbid")

    account_id: int
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    profiles: list[MedicineProfile]


class MedicineProfilesResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool
    code: int
    message: str
    data: MedicineProfilesAccount


class MedicineProfileCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    profile_icon: int = Field(ge=0)
    profile_fullname: str = Field(min_length=1, max_length=255)
    profile_birthdate: date
    profile_relationship: str = Field(min_length=1, max_length=100)


class MedicineProfileResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool
    code: int
    message: str
    data: MedicineProfile


class MedicineProfileUpdate(MedicineProfileCreate):
    pass


class MedicineProfilePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    profile_icon: int | None = Field(default=None, ge=0)
    profile_fullname: str | None = Field(default=None, min_length=1, max_length=255)
    profile_birthdate: date | None = None
    profile_relationship: str | None = Field(default=None, min_length=1, max_length=100)


class MedicineProfileDeleteResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool
    code: int
    message: str


def _mock_profile(profile_id: int = 1) -> MedicineProfile:
    return MedicineProfile(
        profile_id=profile_id,
        profile_icon=1,
        profile_fullname="Alex Mediscan",
        profile_birthdate=date(1990, 1, 1),
        profile_relationship="self",
    )


@router.get("/", response_model=MedicineProfilesResponse, status_code=status.HTTP_200_OK)
async def get_medicine_profiles(
) -> MedicineProfilesResponse:
    return MedicineProfilesResponse(
        success=True,
        code=status.HTTP_200_OK,
        message="Medicine profiles retrieved successfully.",
        data=MedicineProfilesAccount(
            account_id=1,
            email="mock.user@example.com",
            profiles=[_mock_profile()],
        ),
    )


@router.post(
    "/",
    response_model=MedicineProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_medicine_profile(
    payload: MedicineProfileCreate,
) -> MedicineProfileResponse:
    return MedicineProfileResponse(
        success=True,
        code=status.HTTP_201_CREATED,
        message="Medicine profile created successfully.",
        data=MedicineProfile(profile_id=2, **payload.model_dump()),
    )


@router.put(
    "/{profile_id}",
    response_model=MedicineProfileResponse,
    status_code=status.HTTP_200_OK,
)
async def replace_medicine_profile(
    payload: MedicineProfileUpdate,
    profile_id: int = Path(ge=1),
) -> MedicineProfileResponse:
    return MedicineProfileResponse(
        success=True,
        code=status.HTTP_200_OK,
        message="Medicine profile updated successfully.",
        data=MedicineProfile(profile_id=profile_id, **payload.model_dump()),
    )


@router.patch(
    "/{profile_id}",
    response_model=MedicineProfileResponse,
    status_code=status.HTTP_200_OK,
)
async def patch_medicine_profile(
    payload: MedicineProfilePatch,
    profile_id: int = Path(ge=1),
) -> MedicineProfileResponse:
    profile = _mock_profile(profile_id)
    return MedicineProfileResponse(
        success=True,
        code=status.HTTP_200_OK,
        message="Medicine profile updated successfully.",
        data=profile.model_copy(update=payload.model_dump(exclude_unset=True)),
    )


@router.delete(
    "/{profile_id}",
    response_model=MedicineProfileDeleteResponse,
    status_code=status.HTTP_200_OK,
)
async def delete_medicine_profile(
    profile_id: int = Path(ge=1),
) -> MedicineProfileDeleteResponse:
    return MedicineProfileDeleteResponse(
        success=True,
        code=status.HTTP_200_OK,
        message=f"Medicine profile {profile_id} deleted successfully.",
    )