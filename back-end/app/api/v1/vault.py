"""Authenticated vault-item endpoints for the mobile client."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict, Field

from api.v1.auth import require_session
from crud.crud_medicine import (
    ForeignKeyError,
    create_vault_item,
    delete_vault_item,
    get_vault_item_by_id,
    list_vault_items_by_profile,
    update_vault_item,
)


router = APIRouter(prefix="/accounts/me/vault", tags=["vault"])


class VaultItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    vault_id: int
    profile_id: int
    fda_id: int
    vault_expiry_date: date | None = None
    vault_created_at: str | None = None
    vault_updated_at: str | None = None
    fda_genericname: str
    fda_brandname: str | None = None
    fda_approval_id: str
    fda_registration_id: str
    fda_dosage_form: str | None = None
    fda_dosage_strength: str | None = None


class VaultListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool
    code: int
    message: str
    data: list[VaultItem]


class VaultItemResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool
    code: int
    message: str
    data: VaultItem


class VaultCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    profile_id: int = Field(ge=1)
    fda_id: int = Field(ge=1)
    vault_expiry_date: date | None = None


class VaultUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fda_id: int = Field(ge=1)
    vault_expiry_date: date | None = None


class VaultDeleteResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool
    code: int
    message: str


def _serialize(item: dict) -> VaultItem:
    return VaultItem(
        vault_id=int(item["vault_id"]),
        profile_id=int(item["profile_id"]),
        fda_id=int(item["fda_id"]),
        vault_expiry_date=item.get("vault_expiry_date"),
        vault_created_at=(
            item["vault_created_at"].isoformat()
            if item.get("vault_created_at") is not None
            else None
        ),
        vault_updated_at=(
            item["vault_updated_at"].isoformat()
            if item.get("vault_updated_at") is not None
            else None
        ),
        fda_genericname=str(item.get("fda_genericname") or ""),
        fda_brandname=item.get("fda_brandname"),
        fda_approval_id=str(item.get("fda_approval_id") or ""),
        fda_registration_id=str(item.get("fda_registration_id") or ""),
        fda_dosage_form=item.get("fda_dosage_form"),
        fda_dosage_strength=item.get("fda_dosage_strength"),
    )


def _require_item(item: dict | None) -> dict:
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vault item not found.",
        )
    return item


@router.get("/", response_model=VaultListResponse)
async def list_vault(
    profile_id: int = Query(ge=1),
    account: dict[str, str] = Depends(require_session),
) -> VaultListResponse:
    items = await run_in_threadpool(
        list_vault_items_by_profile,
        account["account_id"],
        str(profile_id),
    )
    return VaultListResponse(
        success=True,
        code=status.HTTP_200_OK,
        message="Vault items retrieved successfully.",
        data=[_serialize(item) for item in items],
    )


@router.post("/", response_model=VaultItemResponse, status_code=status.HTTP_201_CREATED)
async def create_vault(
    payload: VaultCreateRequest,
    account: dict[str, str] = Depends(require_session),
) -> VaultItemResponse:
    try:
        item = await run_in_threadpool(
            create_vault_item,
            account["account_id"],
            str(payload.profile_id),
            payload.fda_id,
            payload.vault_expiry_date,
        )
    except ForeignKeyError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    item = _require_item(item)
    return VaultItemResponse(
        success=True,
        code=status.HTTP_201_CREATED,
        message="Vault item created successfully.",
        data=_serialize(item),
    )


@router.put("/{vault_id}", response_model=VaultItemResponse)
async def update_vault(
    payload: VaultUpdateRequest,
    vault_id: int = Path(ge=1),
    profile_id: int = Query(ge=1),
    account: dict[str, str] = Depends(require_session),
) -> VaultItemResponse:
    try:
        item = await run_in_threadpool(
            update_vault_item,
            account["account_id"],
            str(profile_id),
            vault_id,
            payload.fda_id,
            payload.vault_expiry_date,
        )
    except ForeignKeyError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    item = _require_item(item)
    return VaultItemResponse(
        success=True,
        code=status.HTTP_200_OK,
        message="Vault item updated successfully.",
        data=_serialize(item),
    )


@router.delete("/{vault_id}", response_model=VaultDeleteResponse)
async def delete_vault(
    vault_id: int = Path(ge=1),
    profile_id: int = Query(ge=1),
    account: dict[str, str] = Depends(require_session),
) -> VaultDeleteResponse:
    deleted = await run_in_threadpool(
        delete_vault_item,
        account["account_id"],
        str(profile_id),
        vault_id,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vault item not found.",
        )
    return VaultDeleteResponse(
        success=True,
        code=status.HTTP_200_OK,
        message="Vault item deleted successfully.",
    )
