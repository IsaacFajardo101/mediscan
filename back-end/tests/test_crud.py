"""Database integration tests for all MediScan CRUD modules."""

from datetime import date, datetime, time, timedelta
from uuid import uuid4

import pytest

from crud import crud_medicine as medicine_crud
from crud import crud_user as user_crud
from crud.crud_user import DuplicateError, ForeignKeyError, ValidationError


def _new_email() -> str:
    """Return a unique test email address."""
    unique_value = uuid4().hex
    return "crud-" + unique_value + "@example.test"


def _track_account(database_records, account_id) -> None:
    """Register a test account for fixture cleanup."""
    database_records["records"]["account_ids"].append(account_id)


def _track_profile(database_records, profile_id) -> None:
    """Register a test profile for fixture cleanup."""
    database_records["records"]["profile_ids"].append(profile_id)


def test_account_create_read_update_and_soft_delete(database_records):
    """Check account creation, normalized reads, updates, and soft deletion."""
    account_id = database_records["account_id"]
    email = database_records["email"]

    public_account = user_crud.get_account_by_id(account_id)
    assert public_account["email"] == email
    assert "password_hash" not in public_account
    assert user_crud.get_account_by_email("  " + email.upper() + " ")["account_id"] == account_id
    assert user_crud.get_account_for_login(email)["password_hash"] == (
        "test-hash-not-a-real-password"
    )

    updated_email = _new_email()
    updated_account = user_crud.update_account(
        account_id,
        email=updated_email.upper(),
        password_hash="updated-test-hash",
    )
    assert updated_account["email"] == updated_email
    assert "password_hash" not in updated_account
    assert user_crud.get_account_for_login(updated_email)["password_hash"] == (
        "updated-test-hash"
    )

    verified_account = user_crud.mark_account_verified(updated_email)
    assert verified_account["account_is_verified"] is True
    assert user_crud.delete_account(account_id) is True
    assert user_crud.delete_account(account_id) is False
    assert user_crud.get_account_by_id(account_id) is None
    assert user_crud.get_account_by_email(updated_email) is None
    assert user_crud.get_account_for_login(updated_email) is None
    assert user_crud.list_profiles_by_account(account_id) == []
    assert user_crud.get_session_token(database_records["token_value"]) is None


def test_create_account_with_profile_is_one_operation(database_records):
    """Check account signup helper returns both saved rows."""
    result = user_crud.create_account_with_profile(
        _new_email(),
        "already-hashed-test-value",
        2,
        "New Profile",
        "newprofile",
        date.today(),
    )
    _track_account(database_records, result["account"]["account_id"])
    _track_profile(database_records, result["profile"]["profile_id"])
    assert result["account"]["email"].endswith("@example.test")
    assert result["profile"]["account_id"] == result["account"]["account_id"]
    assert "password_hash" not in result["account"]


def test_duplicate_account_email_is_reported(database_records):
    """Check account email comparison trims and lowercases values."""
    with pytest.raises(DuplicateError):
        user_crud.create_account(
            "  " + database_records["email"].upper() + "  ",
            "another-test-hash",
        )


def test_account_update_requires_a_field(database_records):
    """Check an empty account update is rejected before querying the database."""
    with pytest.raises(ValidationError):
        user_crud.update_account(database_records["account_id"])


def test_profile_create_read_update_and_soft_delete(database_records):
    """Check profile ownership, updates, and soft-deleted read behavior."""
    account_id = database_records["account_id"]
    profile_id = database_records["profile_id"]

    profile = user_crud.get_profile_by_id(account_id, profile_id)
    assert profile["profile_fullname"] == "CRUD Test Profile"
    assert user_crud.list_profiles_by_account(account_id)[0]["profile_id"] == profile_id

    other_account = user_crud.create_account(_new_email(), "other-test-hash")
    _track_account(database_records, other_account["account_id"])
    assert user_crud.get_profile_by_id(other_account["account_id"], profile_id) is None
    assert user_crud.update_profile(
        other_account["account_id"],
        profile_id,
        4,
        "Wrong Owner",
        "wrongowner",
        date.today(),
    ) is None
    assert user_crud.delete_profile(other_account["account_id"], profile_id) is False

    updated = user_crud.patch_profile(
        account_id,
        profile_id,
        profile_icon=3,
        profile_displayname="updated",
    )
    assert updated["profile_icon"] == 3
    assert updated["profile_displayname"] == "updated"

    replaced = user_crud.update_profile(
        account_id,
        profile_id,
        5,
        "Updated Full Name",
        "updated",
        date.today(),
    )
    assert replaced["profile_fullname"] == "Updated Full Name"
    assert user_crud.delete_profile(account_id, profile_id) is True
    assert user_crud.get_profile_by_id(account_id, profile_id) is None
    assert user_crud.list_profiles_by_account(account_id) == []


def test_profile_displayname_validation(database_records):
    """Check profile display names outside one to ten characters are rejected."""
    with pytest.raises(ValidationError):
        user_crud.create_profile(
            database_records["account_id"],
            1,
            "Invalid",
            "",
            date.today(),
        )

    with pytest.raises(ValidationError):
        user_crud.patch_profile(
            database_records["account_id"],
            database_records["profile_id"],
            profile_displayname="displayname-too-long",
        )


def test_session_token_create_read_update_and_delete(database_records):
    """Check active token lookup, expiry filtering, updates, and deletes."""
    account_id = database_records["account_id"]
    token_value = database_records["token_value"]
    token = user_crud.get_session_token(token_value)
    assert token["account_id"] == account_id

    updated_value = token_value + "-updated"
    new_expiry = datetime.now() + timedelta(days=2)
    updated = user_crud.update_session_token(
        token["token_id"],
        updated_value,
        new_expiry,
    )
    assert updated["token"] == updated_value
    assert user_crud.get_session_token(token_value) is None
    assert user_crud.get_session_token(updated_value)["token_id"] == token["token_id"]
    assert user_crud.delete_session_token(updated_value) is True
    assert user_crud.delete_session_token(updated_value) is False
    assert user_crud.get_session_token(updated_value) is None


def test_expired_token_is_hidden_and_removed(database_records):
    """Check expired tokens cannot be read and can be purged."""
    account_id = database_records["account_id"]
    expired_value = database_records["token_value"] + "-expired"
    expired_at = datetime.now() - timedelta(days=1)
    expired_token = user_crud.create_session_token(
        account_id,
        expired_value,
        expired_at,
    )
    database_records["records"]["token_ids"].append(expired_token["token_id"])
    assert user_crud.get_session_token(expired_value) is None
    assert user_crud.delete_expired_session_tokens() is True
    assert user_crud.get_session_token(expired_value) is None
    assert user_crud.get_session_token(database_records["token_value"]) is not None


def test_delete_all_account_tokens(database_records):
    """Check account token cleanup reports whether it deleted a token."""
    account_id = database_records["account_id"]
    assert user_crud.delete_account_session_tokens(account_id) is True
    assert user_crud.get_session_token(database_records["token_value"]) is None


def test_fda_create_read_update_and_delete(database_records):
    """Check FDA medicine reads, search, updates, and foreign-key protected delete."""
    fda_id = database_records["fda_id"]
    medicine = medicine_crud.get_fda_medicine_by_id(fda_id)
    assert medicine["fda_genericname"] == database_records["genericname"]

    registration_id = database_records["registration_id"]
    lookup_id = registration_id.replace(" ", "")
    lookup_id = lookup_id.lower()
    found = medicine_crud.get_fda_medicine_by_registration_id(
        "  " + lookup_id + " "
    )
    assert found["fda_id"] == fda_id

    search_results = medicine_crud.search_fda_medicines(
        database_records["genericname"],
        limit=5,
        offset=0,
    )
    assert search_results[0]["fda_id"] == fda_id
    assert len(
        medicine_crud.search_fda_medicines(
            database_records["genericname"],
            limit=1,
            offset=1,
        )
    ) == 0

    updated = medicine_crud.update_fda_medicine(
        fda_id,
        registration_id,
        database_records["medicine"]["fda_approval_id"],
        database_records["genericname"] + "Updated",
        "Updated Brand",
        "Capsule",
        "20 mg",
        "Updated Manufacturer",
        "Updated Category",
        "Prescription (Rx)",
    )
    assert updated["fda_genericname"] == database_records["genericname"] + "Updated"
    assert medicine_crud.get_fda_medicine_by_id(fda_id)["fda_classification"] == (
        "Prescription (Rx)"
    )

    with pytest.raises(ForeignKeyError):
        medicine_crud.delete_fda_medicine(fda_id)

    assert medicine_crud.delete_schedule(
        database_records["account_id"],
        database_records["profile_id"],
        database_records["schedule_id"],
    ) is True
    assert medicine_crud.delete_vault_item(
        database_records["account_id"],
        database_records["profile_id"],
        database_records["vault_id"],
    ) is True
    assert medicine_crud.delete_fda_medicine(fda_id) is True
    assert medicine_crud.get_fda_medicine_by_id(fda_id) is None
    assert medicine_crud.delete_fda_medicine(fda_id) is False


def test_duplicate_fda_registration_is_reported(database_records):
    """Check duplicate FDA registration IDs become a CRUD duplicate error."""
    unique_value = uuid4().hex
    with pytest.raises(DuplicateError):
        medicine_crud.create_fda_medicine(
            database_records["registration_id"],
            "AP-" + unique_value,
            "Duplicate Medicine",
        )


def test_invalid_fda_classification_is_rejected():
    """Check an enum value outside the schema's allowed list is rejected."""
    with pytest.raises(ValidationError):
        medicine_crud.create_fda_medicine(
            "TEST-INVALID-" + uuid4().hex,
            "APPROVAL-INVALID-" + uuid4().hex,
            "Invalid Classification Medicine",
            classification="not-an-enum-value",
        )


def test_fda_search_validation():
    """Check FDA pagination limits reject values outside the allowed range."""
    with pytest.raises(ValidationError):
        medicine_crud.search_fda_medicines("medicine", limit=101)
    with pytest.raises(ValidationError):
        medicine_crud.search_fda_medicines("medicine", offset=-1)


def test_schedule_create_read_update_and_delete(database_records):
    """Check schedule joins, ownership, updates, and cascading log deletion."""
    account_id = database_records["account_id"]
    profile_id = database_records["profile_id"]
    schedule_id = database_records["schedule_id"]

    schedule = medicine_crud.get_schedule_by_id(
        account_id,
        profile_id,
        schedule_id,
    )
    assert schedule["fda_genericname"] == database_records["genericname"]
    assert schedule["fda_brandname"] == "CRUD Brand"
    assert medicine_crud.list_schedules_by_profile(
        account_id,
        profile_id,
    )[0]["schedule_id"] == schedule_id

    other_account = user_crud.create_account(_new_email(), "other-schedule-hash")
    _track_account(database_records, other_account["account_id"])
    assert medicine_crud.get_schedule_by_id(
        other_account["account_id"],
        profile_id,
        schedule_id,
    ) is None
    assert medicine_crud.update_schedule(
        other_account["account_id"],
        profile_id,
        schedule_id,
        database_records["fda_id"],
        True,
        "weekly",
        [time(9, 30)],
        database_records["start_date"],
        database_records["end_date"],
        "Not the owner",
    ) is None
    assert medicine_crud.delete_schedule(
        other_account["account_id"],
        profile_id,
        schedule_id,
    ) is False

    updated = medicine_crud.update_schedule(
        account_id,
        profile_id,
        schedule_id,
        database_records["fda_id"],
        False,
        "weekly",
        [time(9, 30), time(18, 0)],
        database_records["start_date"],
        database_records["end_date"],
        "Updated schedule",
    )
    assert updated["sched_is_active"] is False
    assert updated["sched_frequency_type"] == "weekly"
    assert updated["fda_dosage_strength"] == "10 mg"

    with pytest.raises(ValidationError):
        medicine_crud.create_schedule(
            account_id,
            profile_id,
            database_records["fda_id"],
            "daily",
            [time(8, 0)],
            database_records["start_date"],
            database_records["start_date"] - timedelta(days=1),
        )
    with pytest.raises(ValidationError):
        medicine_crud.create_schedule(
            account_id,
            profile_id,
            database_records["fda_id"],
            "daily",
            [],
            database_records["start_date"],
        )
    with pytest.raises(ValidationError):
        medicine_crud.create_schedule(
            account_id,
            profile_id,
            database_records["fda_id"],
            "monthly",
            [time(8, 0)],
            database_records["start_date"],
        )
    with pytest.raises(ForeignKeyError):
        medicine_crud.create_schedule(
            account_id,
            profile_id,
            2147483647,
            "daily",
            [time(8, 0)],
            database_records["start_date"],
        )

    assert medicine_crud.delete_schedule(
        account_id,
        profile_id,
        schedule_id,
    ) is True
    assert medicine_crud.get_schedule_by_id(
        account_id,
        profile_id,
        schedule_id,
    ) is None
    assert medicine_crud.get_medication_log_by_id(
        account_id,
        profile_id,
        database_records["log_id"],
    ) is None


def test_vault_item_create_read_update_and_delete(database_records):
    """Check vault item joins, ownership, updates, and deletes."""
    account_id = database_records["account_id"]
    profile_id = database_records["profile_id"]
    vault_id = database_records["vault_id"]

    item = medicine_crud.get_vault_item_by_id(account_id, profile_id, vault_id)
    assert item["fda_genericname"] == database_records["genericname"]
    assert item["fda_dosage_form"] == "Tablet"
    assert medicine_crud.list_vault_items_by_profile(
        account_id,
        profile_id,
    )[0]["vault_id"] == vault_id

    other_account = user_crud.create_account(_new_email(), "other-vault-hash")
    _track_account(database_records, other_account["account_id"])
    assert medicine_crud.get_vault_item_by_id(
        other_account["account_id"],
        profile_id,
        vault_id,
    ) is None
    assert medicine_crud.update_vault_item(
        other_account["account_id"],
        profile_id,
        vault_id,
        database_records["fda_id"],
        date.today() + timedelta(days=120),
    ) is None
    assert medicine_crud.delete_vault_item(
        other_account["account_id"],
        profile_id,
        vault_id,
    ) is False

    new_expiry = date.today() + timedelta(days=120)
    updated = medicine_crud.update_vault_item(
        account_id,
        profile_id,
        vault_id,
        database_records["fda_id"],
        new_expiry,
    )
    assert updated["vault_expiry_date"] == new_expiry
    assert medicine_crud.delete_vault_item(account_id, profile_id, vault_id) is True
    assert medicine_crud.get_vault_item_by_id(account_id, profile_id, vault_id) is None
    assert medicine_crud.delete_vault_item(account_id, profile_id, vault_id) is False


def test_medication_log_create_read_update_lists_and_delete(database_records):
    """Check log ownership, status timestamps, date filters, pagination, and deletes."""
    account_id = database_records["account_id"]
    profile_id = database_records["profile_id"]
    log_id = database_records["log_id"]
    schedule_id = database_records["schedule_id"]
    scheduled_date = database_records["scheduled_at"].date()

    log = medicine_crud.get_medication_log_by_id(account_id, profile_id, log_id)
    assert log["log_status"] == "pending"
    by_profile = medicine_crud.list_medication_logs_by_profile(
        account_id,
        profile_id,
        start_date=scheduled_date,
        end_date=scheduled_date,
        limit=10,
        offset=0,
    )
    assert by_profile[0]["log_id"] == log_id
    by_schedule = medicine_crud.list_medication_logs_by_schedule(
        account_id,
        profile_id,
        schedule_id,
        start_date=scheduled_date,
        end_date=scheduled_date,
    )
    assert by_schedule[0]["log_id"] == log_id
    assert medicine_crud.list_medication_logs_by_profile(
        account_id,
        profile_id,
        start_date=scheduled_date + timedelta(days=1),
        end_date=scheduled_date + timedelta(days=2),
    ) == []

    taken = medicine_crud.update_medication_log_status(
        account_id,
        profile_id,
        log_id,
        "taken",
    )
    assert taken["log_taken_at"] is not None
    skipped = medicine_crud.update_medication_log_status(
        account_id,
        profile_id,
        log_id,
        "skipped",
    )
    assert skipped["log_taken_at"] is None

    with pytest.raises(ValidationError):
        medicine_crud.update_medication_log_status(
            account_id,
            profile_id,
            log_id,
            "invalid",
        )
    with pytest.raises(ValidationError):
        medicine_crud.list_medication_logs_by_profile(
            account_id,
            profile_id,
            start_date=scheduled_date,
            end_date=scheduled_date - timedelta(days=1),
        )

    assert medicine_crud.delete_medication_log(account_id, profile_id, log_id) is True
    assert medicine_crud.get_medication_log_by_id(account_id, profile_id, log_id) is None
    assert medicine_crud.delete_medication_log(account_id, profile_id, log_id) is False


def test_log_creation_requires_schedule_ownership(database_records):
    """Check log creation does not permit a different account to use a schedule."""
    other_account = user_crud.create_account(_new_email(), "other-log-hash")
    _track_account(database_records, other_account["account_id"])
    result = medicine_crud.create_medication_log(
        other_account["account_id"],
        database_records["profile_id"],
        database_records["schedule_id"],
        datetime.now(),
    )
    assert result is None
    assert medicine_crud.delete_medication_log(
        other_account["account_id"],
        database_records["profile_id"],
        database_records["log_id"],
    ) is False
