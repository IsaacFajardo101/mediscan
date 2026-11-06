"""CRUD operations for FDA medicines, schedules, vault items, and logs."""

import re
from datetime import date, datetime, time

from psycopg2.errors import ForeignKeyViolation, UniqueViolation

from crud.crud_user import DuplicateError, ForeignKeyError, ValidationError
from db.database import connection_cursor

FREQUENCY_TYPES = ("daily", "weekly", "as_needed")

LOG_STATUSES = ("pending", "taken", "missed", "skipped")

FDA_CLASSIFICATIONS = (
    "Unclassified / Dosage Form",
    "Traditional/Herbal",
    "Prescription (Rx)",
    "Over-the-Counter (OTC)",
    "Household Remedy (HR)",
)

def _validate_classification(classification: str | None) -> None:
    """Reject a non-null classification that is not in the database enum."""
    if classification is not None and classification not in FDA_CLASSIFICATIONS:
        raise ValidationError("The FDA classification value is not supported.")

def _validate_page(limit: int, offset: int) -> None:
    """Require a medicine page limit between one and one hundred and a nonnegative offset."""
    if limit < 1 or limit > 100:
        raise ValidationError("FDA medicine limit must be between 1 and 100.")
    if offset < 0:
        raise ValidationError("FDA medicine offset cannot be negative.")

def get_fda_medicine_by_id(fda_id: int) -> dict | None:
    """Get one FDA medicine by its integer ID."""
    with connection_cursor() as cursor:
        cursor.execute(
            """
            SELECT *
            FROM philippines_fda_medicines
            WHERE fda_id = %s
            """,
            (fda_id,),
        )
        medicine = cursor.fetchone()
    return medicine

def get_fda_medicine_by_registration_id(registration_id: str) -> dict | None:
    """Find a medicine by registration ID after normalizing input and stored whitespace."""
    cleaned_id = re.sub(r"\s+", "", registration_id)
    cleaned_id = cleaned_id.upper()

    with connection_cursor() as cursor:
        cursor.execute(
            r"""
            SELECT *
            FROM philippines_fda_medicines
            WHERE UPPER(fda_registration_id) = %s
               OR UPPER(REGEXP_REPLACE(fda_registration_id, '\s+', '', 'g')) = %s
            ORDER BY fda_id
            LIMIT 1
            """,
            (cleaned_id, cleaned_id),
        )
        medicine = cursor.fetchone()
    return medicine

def search_fda_medicines(
    search_term: str,
    limit: int = 20,
    offset: int = 0,
) -> list[dict]:
    """Search generic, brand, and manufacturer names with a stable paginated result."""
    _validate_page(limit, offset)
    term = search_term.strip()

    with connection_cursor() as cursor:
        cursor.execute(
            """
            SELECT *
            FROM philippines_fda_medicines
            WHERE fda_genericname ILIKE '%%' || %s || '%%'
               OR fda_brandname ILIKE '%%' || %s || '%%'
               OR fda_manufacturer ILIKE '%%' || %s || '%%'
            ORDER BY fda_genericname, fda_id
            LIMIT %s
            OFFSET %s
            """,
            (term, term, term, limit, offset),
        )
        medicines = cursor.fetchall()
    return medicines

def create_fda_medicine(
    registration_id: str,
    approval_id: str,
    genericname: str,
    brandname: str | None = None,
    dosage_form: str | None = None,
    dosage_strength: str | None = None,
    manufacturer: str | None = None,
    pharmacologic_category: str | None = None,
    classification: str | None = None,
) -> dict | None:
    """Create an FDA medicine after validating its classification and return the row."""
    _validate_classification(classification)
    try:
        with connection_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO philippines_fda_medicines (
                    fda_registration_id, fda_approval_id, fda_genericname,
                    fda_brandname, fda_dosage_form, fda_dosage_strength,
                    fda_manufacturer, fda_pharmacologic_category,
                    fda_classification
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    registration_id,
                    approval_id,
                    genericname,
                    brandname,
                    dosage_form,
                    dosage_strength,
                    manufacturer,
                    pharmacologic_category,
                    classification,
                ),
            )
            medicine = cursor.fetchone()
        return medicine
    except UniqueViolation as error:
        raise DuplicateError("The FDA registration or approval ID already exists.") from error

def update_fda_medicine(
    fda_id: int,
    registration_id: str,
    approval_id: str,
    genericname: str,
    brandname: str | None,
    dosage_form: str | None,
    dosage_strength: str | None,
    manufacturer: str | None,
    pharmacologic_category: str | None,
    classification: str | None,
) -> dict | None:
    """Replace FDA medicine fields and return the updated row."""
    _validate_classification(classification)
    try:
        with connection_cursor() as cursor:
            cursor.execute(
                """
                UPDATE philippines_fda_medicines
                SET fda_registration_id = %s,
                    fda_approval_id = %s,
                    fda_genericname = %s,
                    fda_brandname = %s,
                    fda_dosage_form = %s,
                    fda_dosage_strength = %s,
                    fda_manufacturer = %s,
                    fda_pharmacologic_category = %s,
                    fda_classification = %s,
                    fda_updated_at = CURRENT_TIMESTAMP
                WHERE fda_id = %s
                RETURNING *
                """,
                (
                    registration_id,
                    approval_id,
                    genericname,
                    brandname,
                    dosage_form,
                    dosage_strength,
                    manufacturer,
                    pharmacologic_category,
                    classification,
                    fda_id,
                ),
            )
            medicine = cursor.fetchone()
        return medicine
    except UniqueViolation as error:
        raise DuplicateError("The FDA registration or approval ID already exists.") from error
    except ForeignKeyViolation as error:
        raise ForeignKeyError("The FDA medicine is in use by another record.") from error

def delete_fda_medicine(fda_id: int) -> bool:
    """Delete an FDA medicine and return whether a row was removed."""
    try:
        with connection_cursor() as cursor:
            cursor.execute(
                "DELETE FROM philippines_fda_medicines WHERE fda_id = %s",
                (fda_id,),
            )
            deleted = cursor.rowcount > 0
        return deleted
    except ForeignKeyViolation as error:
        raise ForeignKeyError(
            "The FDA medicine is used by a schedule or vault item."
        ) from error

def _validate_schedule_fields(
    frequency_type: str,
    reminder_times: list[time],
    start_date: date,
    end_date: date | None,
) -> None:
    """Validate schedule frequency, reminder times, and date range."""
    if frequency_type not in FREQUENCY_TYPES:
        raise ValidationError("The schedule frequency type is not supported.")
    if not isinstance(reminder_times, list) or len(reminder_times) == 0:
        raise ValidationError("A schedule must have at least one reminder time.")
    for reminder_time in reminder_times:
        if not isinstance(reminder_time, time):
            raise ValidationError("Reminder times must be datetime.time values.")
    if end_date is not None and end_date < start_date:
        raise ValidationError("The schedule end date cannot be before its start date.")

def _profile_is_owned(cursor, account_id: str, profile_id: str) -> bool:
    """Check whether an active profile belongs to an active account."""
    cursor.execute(
        """
        SELECT profiles.profile_id
        FROM profiles
        JOIN accounts
          ON accounts.account_id = profiles.account_id
        WHERE profiles.profile_id = %s
          AND profiles.account_id = %s
          AND profiles.profile_is_deleted = FALSE
          AND accounts.account_is_deleted = FALSE
        """,
        (profile_id, account_id),
    )
    profile = cursor.fetchone()
    return profile is not None

def _medicine_exists(cursor, fda_id: int) -> bool:
    """Check whether an FDA medicine exists."""
    cursor.execute(
        "SELECT fda_id FROM philippines_fda_medicines WHERE fda_id = %s",
        (fda_id,),
    )
    medicine = cursor.fetchone()
    return medicine is not None

def create_schedule(
    account_id: str,
    profile_id: str,
    fda_id: int,
    frequency_type: str,
    reminder_times: list[time],
    start_date: date,
    end_date: date | None = None,
    notes: str | None = None,
) -> dict | None:
    """Create a schedule for an owned profile and return it with medicine details."""
    _validate_schedule_fields(frequency_type, reminder_times, start_date, end_date)

    try:
        with connection_cursor() as cursor:
            if not _profile_is_owned(cursor, account_id, profile_id):
                return None
            if not _medicine_exists(cursor, fda_id):
                raise ForeignKeyError("The FDA medicine does not exist.")

            cursor.execute(
                """
                WITH inserted AS (
                    INSERT INTO medication_schedules (
                        profile_id, fda_id, sched_frequency_type,
                        sched_reminder_time, sched_start_date,
                        sched_end_date, sched_notes
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                )
                SELECT inserted.*,
                       medicines.fda_genericname,
                       medicines.fda_brandname,
                       medicines.fda_dosage_form,
                       medicines.fda_dosage_strength
                FROM inserted
                JOIN philippines_fda_medicines AS medicines
                  ON medicines.fda_id = inserted.fda_id
                """,
                (
                    profile_id,
                    fda_id,
                    frequency_type,
                    reminder_times,
                    start_date,
                    end_date,
                    notes,
                ),
            )
            schedule = cursor.fetchone()
        return schedule
    except ForeignKeyViolation as error:
        raise ForeignKeyError(
            "The schedule references a missing profile or medicine."
        ) from error

def get_schedule_by_id(
    account_id: str,
    profile_id: str,
    schedule_id: int,
) -> dict | None:
    """Get an owned schedule with generic name, brand, form, and strength."""
    with connection_cursor() as cursor:
        cursor.execute(
            """
            SELECT schedules.*,
                   medicines.fda_genericname,
                   medicines.fda_brandname,
                   medicines.fda_dosage_form,
                   medicines.fda_dosage_strength
            FROM medication_schedules AS schedules
            JOIN philippines_fda_medicines AS medicines
              ON medicines.fda_id = schedules.fda_id
            JOIN profiles
              ON profiles.profile_id = schedules.profile_id
            JOIN accounts
              ON accounts.account_id = profiles.account_id
            WHERE schedules.schedule_id = %s
              AND schedules.profile_id = %s
              AND profiles.account_id = %s
              AND profiles.profile_is_deleted = FALSE
              AND accounts.account_is_deleted = FALSE
            """,
            (schedule_id, profile_id, account_id),
        )
        schedule = cursor.fetchone()
    return schedule

def list_schedules_by_profile(
    account_id: str,
    profile_id: str,
) -> list[dict]:
    """List owned schedules with their FDA medicine details."""
    with connection_cursor() as cursor:
        cursor.execute(
            """
            SELECT schedules.*,
                   medicines.fda_genericname,
                   medicines.fda_brandname,
                   medicines.fda_dosage_form,
                   medicines.fda_dosage_strength
            FROM medication_schedules AS schedules
            JOIN philippines_fda_medicines AS medicines
              ON medicines.fda_id = schedules.fda_id
            JOIN profiles
              ON profiles.profile_id = schedules.profile_id
            JOIN accounts
              ON accounts.account_id = profiles.account_id
            WHERE schedules.profile_id = %s
              AND profiles.account_id = %s
              AND profiles.profile_is_deleted = FALSE
              AND accounts.account_is_deleted = FALSE
            ORDER BY schedules.sched_start_date, schedules.schedule_id
            """,
            (profile_id, account_id),
        )
        schedules = cursor.fetchall()
    return schedules

def update_schedule(
    account_id: str,
    profile_id: str,
    schedule_id: int,
    fda_id: int,
    is_active: bool,
    frequency_type: str,
    reminder_times: list[time],
    start_date: date,
    end_date: date | None,
    notes: str | None,
) -> dict | None:
    """Replace an owned schedule and return it with medicine details."""
    _validate_schedule_fields(frequency_type, reminder_times, start_date, end_date)

    try:
        with connection_cursor() as cursor:
            if not _profile_is_owned(cursor, account_id, profile_id):
                return None
            if not _medicine_exists(cursor, fda_id):
                raise ForeignKeyError("The FDA medicine does not exist.")

            cursor.execute(
                """
                WITH updated AS (
                    UPDATE medication_schedules
                    SET fda_id = %s,
                        sched_is_active = %s,
                        sched_frequency_type = %s,
                        sched_reminder_time = %s,
                        sched_start_date = %s,
                        sched_end_date = %s,
                        sched_notes = %s,
                        sched_updated_at = CURRENT_TIMESTAMP
                    WHERE schedule_id = %s
                      AND profile_id = %s
                    RETURNING *
                )
                SELECT updated.*,
                       medicines.fda_genericname,
                       medicines.fda_brandname,
                       medicines.fda_dosage_form,
                       medicines.fda_dosage_strength
                FROM updated
                JOIN philippines_fda_medicines AS medicines
                  ON medicines.fda_id = updated.fda_id
                """,
                (
                    fda_id,
                    is_active,
                    frequency_type,
                    reminder_times,
                    start_date,
                    end_date,
                    notes,
                    schedule_id,
                    profile_id,
                ),
            )
            schedule = cursor.fetchone()
        return schedule
    except ForeignKeyViolation as error:
        raise ForeignKeyError(
            "The schedule references a missing profile or medicine."
        ) from error

def delete_schedule(
    account_id: str,
    profile_id: str,
    schedule_id: int,
) -> bool:
    """Delete an owned schedule and return whether a row was deleted."""
    with connection_cursor() as cursor:
        cursor.execute(
            """
            DELETE FROM medication_schedules AS schedules
            WHERE schedules.schedule_id = %s
              AND schedules.profile_id = %s
              AND EXISTS (
                  SELECT 1
                  FROM profiles
                  JOIN accounts
                    ON accounts.account_id = profiles.account_id
                  WHERE profiles.profile_id = schedules.profile_id
                    AND profiles.account_id = %s
                    AND profiles.profile_is_deleted = FALSE
                    AND accounts.account_is_deleted = FALSE
              )
            """,
            (schedule_id, profile_id, account_id),
        )
        deleted = cursor.rowcount > 0
    return deleted

def create_vault_item(
    account_id: str,
    profile_id: str,
    fda_id: int,
    expiry_date: date,
) -> dict | None:
    """Create an item for an owned profile and return it with medicine details."""
    try:
        with connection_cursor() as cursor:
            if not _profile_is_owned(cursor, account_id, profile_id):
                return None
            if not _medicine_exists(cursor, fda_id):
                raise ForeignKeyError("The FDA medicine does not exist.")

            cursor.execute(
                """
                WITH inserted AS (
                    INSERT INTO vault_items (profile_id, fda_id, vault_expiry_date)
                    VALUES (%s, %s, %s)
                    RETURNING *
                )
                SELECT inserted.*,
                       medicines.fda_genericname,
                       medicines.fda_brandname,
                       medicines.fda_dosage_form,
                       medicines.fda_dosage_strength
                FROM inserted
                JOIN philippines_fda_medicines AS medicines
                  ON medicines.fda_id = inserted.fda_id
                """,
                (profile_id, fda_id, expiry_date),
            )
            item = cursor.fetchone()
        return item
    except ForeignKeyViolation as error:
        raise ForeignKeyError(
            "The vault item references a missing profile or medicine."
        ) from error

def get_vault_item_by_id(
    account_id: str,
    profile_id: str,
    vault_id: int,
) -> dict | None:
    """Get an owned vault item with generic name, brand, form, and strength."""
    with connection_cursor() as cursor:
        cursor.execute(
            """
            SELECT items.*,
                   medicines.fda_genericname,
                   medicines.fda_brandname,
                   medicines.fda_dosage_form,
                   medicines.fda_dosage_strength
            FROM vault_items AS items
            JOIN philippines_fda_medicines AS medicines
              ON medicines.fda_id = items.fda_id
            JOIN profiles
              ON profiles.profile_id = items.profile_id
            JOIN accounts
              ON accounts.account_id = profiles.account_id
            WHERE items.vault_id = %s
              AND items.profile_id = %s
              AND profiles.account_id = %s
              AND profiles.profile_is_deleted = FALSE
              AND accounts.account_is_deleted = FALSE
            """,
            (vault_id, profile_id, account_id),
        )
        item = cursor.fetchone()
    return item

def list_vault_items_by_profile(
    account_id: str,
    profile_id: str,
) -> list[dict]:
    """List owned vault items with FDA medicine details."""
    with connection_cursor() as cursor:
        cursor.execute(
            """
            SELECT items.*,
                   medicines.fda_genericname,
                   medicines.fda_brandname,
                   medicines.fda_dosage_form,
                   medicines.fda_dosage_strength
            FROM vault_items AS items
            JOIN philippines_fda_medicines AS medicines
              ON medicines.fda_id = items.fda_id
            JOIN profiles
              ON profiles.profile_id = items.profile_id
            JOIN accounts
              ON accounts.account_id = profiles.account_id
            WHERE items.profile_id = %s
              AND profiles.account_id = %s
              AND profiles.profile_is_deleted = FALSE
              AND accounts.account_is_deleted = FALSE
            ORDER BY items.vault_created_at, items.vault_id
            """,
            (profile_id, account_id),
        )
        items = cursor.fetchall()
    return items

def update_vault_item(
    account_id: str,
    profile_id: str,
    vault_id: int,
    fda_id: int,
    expiry_date: date,
) -> dict | None:
    """Update an owned vault item's medicine and expiry, then return joined details."""
    try:
        with connection_cursor() as cursor:
            if not _profile_is_owned(cursor, account_id, profile_id):
                return None
            if not _medicine_exists(cursor, fda_id):
                raise ForeignKeyError("The FDA medicine does not exist.")

            cursor.execute(
                """
                WITH updated AS (
                    UPDATE vault_items
                    SET fda_id = %s,
                        vault_expiry_date = %s,
                        vault_updated_at = CURRENT_TIMESTAMP
                    WHERE vault_id = %s
                      AND profile_id = %s
                    RETURNING *
                )
                SELECT updated.*,
                       medicines.fda_genericname,
                       medicines.fda_brandname,
                       medicines.fda_dosage_form,
                       medicines.fda_dosage_strength
                FROM updated
                JOIN philippines_fda_medicines AS medicines
                  ON medicines.fda_id = updated.fda_id
                """,
                (fda_id, expiry_date, vault_id, profile_id),
            )
            item = cursor.fetchone()
        return item
    except ForeignKeyViolation as error:
        raise ForeignKeyError(
            "The vault item references a missing profile or medicine."
        ) from error

def delete_vault_item(
    account_id: str,
    profile_id: str,
    vault_id: int,
) -> bool:
    """Delete an owned vault item and return whether a row was deleted."""
    with connection_cursor() as cursor:
        cursor.execute(
            """
            DELETE FROM vault_items AS items
            WHERE items.vault_id = %s
              AND items.profile_id = %s
              AND EXISTS (
                  SELECT 1
                  FROM profiles
                  JOIN accounts
                    ON accounts.account_id = profiles.account_id
                  WHERE profiles.profile_id = items.profile_id
                    AND profiles.account_id = %s
                    AND profiles.profile_is_deleted = FALSE
                    AND accounts.account_is_deleted = FALSE
              )
            """,
            (vault_id, profile_id, account_id),
        )
        deleted = cursor.rowcount > 0
    return deleted

def _validate_status(log_status: str) -> None:
    """Require a medication log status from the shared allowed values."""
    if log_status not in LOG_STATUSES:
        raise ValidationError("The medication log status is not supported.")

def _validate_log_page(limit: int, offset: int) -> None:
    """Require a page limit between one and one hundred and a nonnegative offset."""
    if limit < 1 or limit > 100:
        raise ValidationError("Log limit must be between 1 and 100.")
    if offset < 0:
        raise ValidationError("Log offset cannot be negative.")

def _validate_date_range(
    start_date: date | None,
    end_date: date | None,
) -> None:
    """Reject a date range whose end date is earlier than its start date."""
    if start_date is not None and end_date is not None and end_date < start_date:
        raise ValidationError("The end date cannot be before the start date.")

def create_medication_log(
    account_id: str,
    profile_id: str,
    schedule_id: int,
    scheduled_time: datetime,
    log_status: str = "pending",
) -> dict | None:
    """Create a log only when the schedule belongs to the profile and return its row."""
    _validate_status(log_status)
    try:
        with connection_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO medication_logs (
                    schedule_id, profile_id, log_scheduled_time,
                    log_taken_at, log_status
                )
                SELECT schedules.schedule_id, schedules.profile_id, %s,
                       CASE WHEN %s = 'taken' THEN CURRENT_TIMESTAMP ELSE NULL END,
                       %s
                FROM medication_schedules AS schedules
                JOIN profiles
                  ON profiles.profile_id = schedules.profile_id
                JOIN accounts
                  ON accounts.account_id = profiles.account_id
                WHERE schedules.schedule_id = %s
                  AND schedules.profile_id = %s
                  AND profiles.account_id = %s
                  AND profiles.profile_is_deleted = FALSE
                  AND accounts.account_is_deleted = FALSE
                RETURNING *
                """,
                (
                    scheduled_time,
                    log_status,
                    log_status,
                    schedule_id,
                    profile_id,
                    account_id,
                ),
            )
            log = cursor.fetchone()
        return log
    except ForeignKeyViolation as error:
        raise ForeignKeyError("The medication log references a missing schedule or profile.") from error

def get_medication_log_by_id(
    account_id: str,
    profile_id: str,
    log_id: int,
) -> dict | None:
    """Get one log only when it belongs to the active account and profile."""
    with connection_cursor() as cursor:
        cursor.execute(
            """
            SELECT logs.*
            FROM medication_logs AS logs
            JOIN profiles
              ON profiles.profile_id = logs.profile_id
            JOIN accounts
              ON accounts.account_id = profiles.account_id
            WHERE logs.log_id = %s
              AND logs.profile_id = %s
              AND profiles.account_id = %s
              AND profiles.profile_is_deleted = FALSE
              AND accounts.account_is_deleted = FALSE
            """,
            (log_id, profile_id, account_id),
        )
        log = cursor.fetchone()
    return log

def list_medication_logs_by_profile(
    account_id: str,
    profile_id: str,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[dict]:
    """List profile logs in a date range with pagination."""
    _validate_log_page(limit, offset)
    _validate_date_range(start_date, end_date)

    with connection_cursor() as cursor:
        cursor.execute(
            """
            SELECT logs.*
            FROM medication_logs AS logs
            JOIN profiles
              ON profiles.profile_id = logs.profile_id
            JOIN accounts
              ON accounts.account_id = profiles.account_id
            WHERE logs.profile_id = %s
              AND profiles.account_id = %s
              AND profiles.profile_is_deleted = FALSE
              AND accounts.account_is_deleted = FALSE
              AND (%s::date IS NULL OR logs.log_scheduled_time >= %s::date)
              AND (
                  %s::date IS NULL
                  OR logs.log_scheduled_time < (%s::date + INTERVAL '1 day')
              )
            ORDER BY logs.log_scheduled_time, logs.log_id
            LIMIT %s
            OFFSET %s
            """,
            (
                profile_id,
                account_id,
                start_date,
                start_date,
                end_date,
                end_date,
                limit,
                offset,
            ),
        )
        logs = cursor.fetchall()
    return logs

def list_medication_logs_by_schedule(
    account_id: str,
    profile_id: str,
    schedule_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[dict]:
    """List schedule logs in a date range with pagination."""
    _validate_log_page(limit, offset)
    _validate_date_range(start_date, end_date)

    with connection_cursor() as cursor:
        cursor.execute(
            """
            SELECT logs.*
            FROM medication_logs AS logs
            JOIN medication_schedules AS schedules
              ON schedules.schedule_id = logs.schedule_id
            JOIN profiles
              ON profiles.profile_id = schedules.profile_id
            JOIN accounts
              ON accounts.account_id = profiles.account_id
            WHERE logs.profile_id = %s
              AND schedules.schedule_id = %s
              AND schedules.profile_id = %s
              AND profiles.account_id = %s
              AND profiles.profile_is_deleted = FALSE
              AND accounts.account_is_deleted = FALSE
              AND (%s::date IS NULL OR logs.log_scheduled_time >= %s::date)
              AND (
                  %s::date IS NULL
                  OR logs.log_scheduled_time < (%s::date + INTERVAL '1 day')
              )
            ORDER BY logs.log_scheduled_time, logs.log_id
            LIMIT %s
            OFFSET %s
            """,
            (
                profile_id,
                schedule_id,
                profile_id,
                account_id,
                start_date,
                start_date,
                end_date,
                end_date,
                limit,
                offset,
            ),
        )
        logs = cursor.fetchall()
    return logs

def update_medication_log_status(
    account_id: str,
    profile_id: str,
    log_id: int,
    log_status: str,
) -> dict | None:
    """Update an owned log status and set taken time only for the taken status."""
    _validate_status(log_status)
    with connection_cursor() as cursor:
        cursor.execute(
            """
            UPDATE medication_logs AS logs
            SET log_status = %s,
                log_taken_at = CASE
                    WHEN %s = 'taken' THEN CURRENT_TIMESTAMP
                    ELSE NULL
                END
            WHERE logs.log_id = %s
              AND logs.profile_id = %s
              AND EXISTS (
                  SELECT 1
                  FROM profiles
                  JOIN accounts
                    ON accounts.account_id = profiles.account_id
                  WHERE profiles.profile_id = logs.profile_id
                    AND profiles.account_id = %s
                    AND profiles.profile_is_deleted = FALSE
                    AND accounts.account_is_deleted = FALSE
              )
            RETURNING logs.*
            """,
            (log_status, log_status, log_id, profile_id, account_id),
        )
        log = cursor.fetchone()
    return log

def delete_medication_log(
    account_id: str,
    profile_id: str,
    log_id: int,
) -> bool:
    """Delete an owned medication log and return whether a row was deleted."""
    with connection_cursor() as cursor:
        cursor.execute(
            """
            DELETE FROM medication_logs AS logs
            WHERE logs.log_id = %s
              AND logs.profile_id = %s
              AND EXISTS (
                  SELECT 1
                  FROM profiles
                  JOIN accounts
                    ON accounts.account_id = profiles.account_id
                  WHERE profiles.profile_id = logs.profile_id
                    AND profiles.account_id = %s
                    AND profiles.profile_is_deleted = FALSE
                    AND accounts.account_is_deleted = FALSE
              )
            """,
            (log_id, profile_id, account_id),
        )
        deleted = cursor.rowcount > 0
    return deleted
