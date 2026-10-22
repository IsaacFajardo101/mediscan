"""Local-only endpoints for exercising the standalone CRUD functions."""

import inspect
import ipaddress
import os
from datetime import date, datetime, time
from pathlib import Path
from typing import Any, Callable

from dotenv import load_dotenv
from fastapi import APIRouter, Body, HTTPException, Request, status

from crud.crud_medicine import (
    create_fda_medicine,
    create_medication_log,
    create_schedule,
    create_vault_item,
    delete_fda_medicine,
    delete_medication_log,
    delete_schedule,
    delete_vault_item,
    get_fda_medicine_by_id,
    get_fda_medicine_by_registration_id,
    get_medication_log_by_id,
    get_schedule_by_id,
    get_vault_item_by_id,
    list_medication_logs_by_profile,
    list_medication_logs_by_schedule,
    list_schedules_by_profile,
    list_vault_items_by_profile,
    search_fda_medicines,
    update_fda_medicine,
    update_medication_log_status,
    update_schedule,
    update_vault_item,
)
from crud.crud_user import (
    DuplicateError,
    ForeignKeyError,
    ValidationError,
    create_account,
    create_account_with_profile,
    create_profile,
    create_session_token,
    delete_account,
    delete_account_session_tokens,
    delete_expired_session_tokens,
    delete_profile,
    delete_session_token,
    get_account_by_email,
    get_account_by_id,
    get_profile_by_id,
    get_session_token,
    list_profiles_by_account,
    mark_account_verified,
    patch_profile,
    update_account,
    update_profile,
    update_session_token,
)


router = APIRouter(prefix="/api/dev/crud-tester", tags=["CRUD tester"])
_REPOSITORY_DIRECTORY = Path(__file__).resolve().parents[4]
_ENVIRONMENT_FILE = _REPOSITORY_DIRECTORY / ".env"

_OPERATIONS: dict[str, dict[str, Callable[..., Any]]] = {
    "accounts": {
        "create": create_account,
        "create_with_profile": create_account_with_profile,
        "get_by_id": get_account_by_id,
        "get_by_email": get_account_by_email,
        "update": update_account,
        "mark_verified": mark_account_verified,
        "delete": delete_account,
    },
    "profiles": {
        "create": create_profile,
        "get_by_id": get_profile_by_id,
        "list_by_account": list_profiles_by_account,
        "update": update_profile,
        "patch": patch_profile,
        "delete": delete_profile,
    },
    "session_tokens": {
        "create": create_session_token,
        "get": get_session_token,
        "update": update_session_token,
        "delete": delete_session_token,
        "delete_for_account": delete_account_session_tokens,
        "delete_expired": delete_expired_session_tokens,
    },
    "fda_medicines": {
        "create": create_fda_medicine,
        "get_by_id": get_fda_medicine_by_id,
        "get_by_registration_id": get_fda_medicine_by_registration_id,
        "search": search_fda_medicines,
        "update": update_fda_medicine,
        "delete": delete_fda_medicine,
    },
    "medication_schedules": {
        "create": create_schedule,
        "get_by_id": get_schedule_by_id,
        "list_by_profile": list_schedules_by_profile,
        "update": update_schedule,
        "delete": delete_schedule,
    },
    "vault_items": {
        "create": create_vault_item,
        "get_by_id": get_vault_item_by_id,
        "list_by_profile": list_vault_items_by_profile,
        "update": update_vault_item,
        "delete": delete_vault_item,
    },
    "medication_logs": {
        "create": create_medication_log,
        "get_by_id": get_medication_log_by_id,
        "list_by_profile": list_medication_logs_by_profile,
        "list_by_schedule": list_medication_logs_by_schedule,
        "update_status": update_medication_log_status,
        "delete": delete_medication_log,
    },
}


def _require_local_test_mode(request: Request) -> None:
    """Require explicit opt-in and a loopback client before any CRUD test action."""
    load_dotenv(dotenv_path=_ENVIRONMENT_FILE)
    if os.getenv("ENABLE_CRUD_TEST_API", "").strip().lower() != "true":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CRUD tester API is disabled. Set ENABLE_CRUD_TEST_API=true to enable it.",
        )

    client_host = request.client.host if request.client else ""
    if client_host == "testclient":
        return
    try:
        is_local = ipaddress.ip_address(client_host).is_loopback
    except ValueError:
        is_local = False
    if not is_local:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CRUD tester API only accepts local connections.",
        )


def _convert_json_values(values: dict[str, Any]) -> dict[str, Any]:
    """Convert ISO date/time strings from JSON into Python values used by psycopg2."""
    converted = dict(values)
    for key in ("profile_birthdate", "start_date", "end_date", "expiry_date"):
        value = converted.get(key)
        if isinstance(value, str) and value:
            converted[key] = date.fromisoformat(value)

    for key in ("token_expires_at", "scheduled_time"):
        value = converted.get(key)
        if isinstance(value, str) and value:
            converted[key] = datetime.fromisoformat(value)

    reminder_times = converted.get("reminder_times")
    if isinstance(reminder_times, list):
        converted["reminder_times"] = [
            time.fromisoformat(value) if isinstance(value, str) else value
            for value in reminder_times
        ]
    return converted


@router.get("/operations")
def list_operations(request: Request) -> dict[str, list[str]]:
    """Return the allowed tester operations without exposing sensitive login reads."""
    _require_local_test_mode(request)
    return {resource: sorted(operations) for resource, operations in _OPERATIONS.items()}


@router.post("/{resource}/{operation}")
def run_operation(
    resource: str,
    operation: str,
    request: Request,
    arguments: dict[str, Any] = Body(default={}),
) -> dict[str, Any]:
    """Run one explicitly allowlisted CRUD function with JSON arguments."""
    _require_local_test_mode(request)

    resource_operations = _OPERATIONS.get(resource)
    function = resource_operations.get(operation) if resource_operations else None
    if function is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unknown CRUD resource or operation.",
        )

    try:
        converted_arguments = _convert_json_values(arguments)
    except (TypeError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid date or time value: {error}",
        ) from error

    try:
        inspect.signature(function).bind(**converted_arguments)
    except TypeError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error

    try:
        result = function(**converted_arguments)
    except (DuplicateError, ForeignKeyError, ValidationError) as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    return {"result": result}
