"""CRUD operations for accounts, profiles, and session tokens."""

from datetime import date, datetime

from psycopg2.errors import ForeignKeyViolation, UniqueViolation

from db.database import connection_cursor

class DuplicateError(Exception):
    """Raised when a unique database value already exists."""

class ForeignKeyError(Exception):
    """Raised when a database operation violates a foreign key."""

class ValidationError(ValueError):
    """Raised when a CRUD input does not meet database rules."""

def validate_profile_displayname(displayname: str) -> None:
    """Require a profile display name between one and ten characters."""
    if not isinstance(displayname, str):
        raise ValidationError("Profile display name must be text.")
    if len(displayname) < 1 or len(displayname) > 10:
        raise ValidationError(
            "Profile display name must contain between 1 and 10 characters."
        )

def _clean_email(email: str) -> str:
    """Strip whitespace and lowercase an email address."""
    cleaned_email = email.strip()
    cleaned_email = cleaned_email.lower()
    return cleaned_email

def create_account(email: str, password_hash: str) -> dict | None:
    """Create an account from an email and pre-hashed password and return its public fields."""
    cleaned_email = _clean_email(email)
    try:
        with connection_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO accounts (email, password_hash)
                VALUES (%s, %s)
                RETURNING account_id, email, account_is_verified,
                          account_is_deleted, account_created_at,
                          account_updated_at
                """,
                (cleaned_email, password_hash),
            )
            account = cursor.fetchone()
        return account
    except UniqueViolation as error:
        raise DuplicateError("An account with this email already exists.") from error
    except ForeignKeyViolation as error:
        raise ForeignKeyError("The account references a missing record.") from error

def create_account_with_profile(
    email: str,
    password_hash: str,
    profile_icon: int,
    profile_fullname: str,
    profile_displayname: str,
    profile_birthdate: date,
) -> dict:
    """Create an account and its first profile in one transaction and return both rows."""
    cleaned_email = _clean_email(email)
    validate_profile_displayname(profile_displayname)

    try:
        with connection_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO accounts (email, password_hash)
                VALUES (%s, %s)
                RETURNING account_id, email, account_is_verified,
                          account_is_deleted, account_created_at,
                          account_updated_at
                """,
                (cleaned_email, password_hash),
            )
            account = cursor.fetchone()
            account_id = account["account_id"]

            cursor.execute(
                """
                INSERT INTO profiles (
                    account_id, profile_icon, profile_fullname,
                    profile_displayname, profile_birthdate
                )
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    account_id,
                    profile_icon,
                    profile_fullname,
                    profile_displayname,
                    profile_birthdate,
                ),
            )
            profile = cursor.fetchone()
        result = {"account": account, "profile": profile}
        return result
    except UniqueViolation as error:
        raise DuplicateError("An account with this email already exists.") from error
    except ForeignKeyViolation as error:
        raise ForeignKeyError("The account or profile references a missing record.") from error

def get_account_by_id(account_id: str) -> dict | None:
    """Get a non-deleted account by its UUID without returning its password hash."""
    with connection_cursor() as cursor:
        cursor.execute(
            """
            SELECT account_id, email, account_is_verified, account_is_deleted,
                   account_created_at, account_updated_at
            FROM accounts
            WHERE account_id = %s
              AND account_is_deleted = FALSE
            """,
            (account_id,),
        )
        account = cursor.fetchone()
    return account

def get_account_by_email(email: str) -> dict | None:
    """Get a non-deleted account by normalized email without returning its password hash."""
    cleaned_email = _clean_email(email)
    with connection_cursor() as cursor:
        cursor.execute(
            """
            SELECT account_id, email, account_is_verified, account_is_deleted,
                   account_created_at, account_updated_at
            FROM accounts
            WHERE email = %s
              AND account_is_deleted = FALSE
            """,
            (cleaned_email,),
        )
        account = cursor.fetchone()
    return account

def get_account_for_login(email: str) -> dict | None:
    """Get login fields including the password hash for a normalized email."""
    cleaned_email = _clean_email(email)
    with connection_cursor() as cursor:
        cursor.execute(
            """
            SELECT account_id, email, password_hash, account_is_verified,
                   account_is_deleted, account_created_at, account_updated_at
            FROM accounts
            WHERE email = %s
              AND account_is_deleted = FALSE
            """,
            (cleaned_email,),
        )
        account = cursor.fetchone()
    return account

def update_account(
    account_id: str,
    email: str | None = None,
    password_hash: str | None = None,
) -> dict | None:
    """Update an account email or pre-hashed password and return its public fields."""
    if email is None and password_hash is None:
        raise ValidationError("Provide an email or password hash to update.")

    cleaned_email = None
    if email is not None:
        cleaned_email = _clean_email(email)

    try:
        with connection_cursor() as cursor:
            cursor.execute(
                """
                UPDATE accounts
                SET email = COALESCE(%s, email),
                    password_hash = COALESCE(%s, password_hash),
                    account_updated_at = CURRENT_TIMESTAMP
                WHERE account_id = %s
                  AND account_is_deleted = FALSE
                RETURNING account_id, email, account_is_verified,
                          account_is_deleted, account_created_at,
                          account_updated_at
                """,
                (cleaned_email, password_hash, account_id),
            )
            account = cursor.fetchone()
        return account
    except UniqueViolation as error:
        raise DuplicateError("An account with this email already exists.") from error
    except ForeignKeyViolation as error:
        raise ForeignKeyError("The account references a missing record.") from error

def mark_account_verified(email: str) -> dict | None:
    """Mark a non-deleted account verified by normalized email and return public fields."""
    cleaned_email = _clean_email(email)
    with connection_cursor() as cursor:
        cursor.execute(
            """
            UPDATE accounts
            SET account_is_verified = TRUE,
                account_updated_at = CURRENT_TIMESTAMP
            WHERE email = %s
              AND account_is_deleted = FALSE
            RETURNING account_id, email, account_is_verified, account_is_deleted,
                      account_created_at, account_updated_at
            """,
            (cleaned_email,),
        )
        account = cursor.fetchone()
    return account

def delete_account(account_id: str) -> bool:
    """Soft-delete a non-deleted account and return whether a row was updated."""
    with connection_cursor() as cursor:
        cursor.execute(
            """
            UPDATE accounts
            SET account_is_deleted = TRUE,
                account_updated_at = CURRENT_TIMESTAMP
            WHERE account_id = %s
              AND account_is_deleted = FALSE
            """,
            (account_id,),
        )
        deleted = cursor.rowcount > 0
    return deleted

def create_profile(
    account_id: str,
    profile_icon: int,
    profile_fullname: str,
    profile_displayname: str,
    profile_birthdate: date,
) -> dict | None:
    """Create a profile for an active account and return the profile row."""
    validate_profile_displayname(profile_displayname)
    try:
        with connection_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO profiles (
                    account_id, profile_icon, profile_fullname,
                    profile_displayname, profile_birthdate
                )
                SELECT account_id, %s, %s, %s, %s
                FROM accounts
                WHERE account_id = %s
                  AND account_is_deleted = FALSE
                RETURNING *
                """,
                (
                    profile_icon,
                    profile_fullname,
                    profile_displayname,
                    profile_birthdate,
                    account_id,
                ),
            )
            profile = cursor.fetchone()
        return profile
    except ForeignKeyViolation as error:
        raise ForeignKeyError("The profile references a missing account.") from error

def get_profile_by_id(account_id: str, profile_id: str) -> dict | None:
    """Get a non-deleted profile by ID when it belongs to the active account."""
    with connection_cursor() as cursor:
        cursor.execute(
            """
            SELECT profiles.*
            FROM profiles
            JOIN accounts
              ON accounts.account_id = profiles.account_id
            WHERE profiles.account_id = %s
              AND profiles.profile_id = %s
              AND profiles.profile_is_deleted = FALSE
              AND accounts.account_is_deleted = FALSE
            """,
            (account_id, profile_id),
        )
        profile = cursor.fetchone()
    return profile

def list_profiles_by_account(account_id: str) -> list[dict]:
    """List non-deleted profiles for one active account."""
    with connection_cursor() as cursor:
        cursor.execute(
            """
            SELECT profiles.*
            FROM profiles
            JOIN accounts
              ON accounts.account_id = profiles.account_id
            WHERE profiles.account_id = %s
              AND profiles.profile_is_deleted = FALSE
              AND accounts.account_is_deleted = FALSE
            ORDER BY profiles.profile_created_at, profiles.profile_id
            """,
            (account_id,),
        )
        profiles = cursor.fetchall()
    return profiles

def update_profile(
    account_id: str,
    profile_id: str,
    profile_icon: int,
    profile_fullname: str,
    profile_displayname: str,
    profile_birthdate: date,
) -> dict | None:
    """Replace profile fields for its owning account and return the updated row."""
    validate_profile_displayname(profile_displayname)
    with connection_cursor() as cursor:
        cursor.execute(
            """
            UPDATE profiles
            SET profile_icon = %s,
                profile_fullname = %s,
                profile_displayname = %s,
                profile_birthdate = %s,
                profile_updated_at = CURRENT_TIMESTAMP
            WHERE account_id = %s
              AND profile_id = %s
              AND profile_is_deleted = FALSE
              AND EXISTS (
                  SELECT 1
                  FROM accounts
                  WHERE accounts.account_id = profiles.account_id
                    AND accounts.account_is_deleted = FALSE
              )
            RETURNING *
            """,
            (
                profile_icon,
                profile_fullname,
                profile_displayname,
                profile_birthdate,
                account_id,
                profile_id,
            ),
        )
        profile = cursor.fetchone()
    return profile

def patch_profile(
    account_id: str,
    profile_id: str,
    profile_icon: int | None = None,
    profile_fullname: str | None = None,
    profile_displayname: str | None = None,
    profile_birthdate: date | None = None,
) -> dict | None:
    """Update provided fields for an owned profile and return the updated row."""
    if (
        profile_icon is None
        and profile_fullname is None
        and profile_displayname is None
        and profile_birthdate is None
    ):
        raise ValidationError("Provide at least one profile field to update.")
    if profile_displayname is not None:
        validate_profile_displayname(profile_displayname)

    with connection_cursor() as cursor:
        cursor.execute(
            """
            UPDATE profiles
            SET profile_icon = COALESCE(%s, profile_icon),
                profile_fullname = COALESCE(%s, profile_fullname),
                profile_displayname = COALESCE(%s, profile_displayname),
                profile_birthdate = COALESCE(%s, profile_birthdate),
                profile_updated_at = CURRENT_TIMESTAMP
            WHERE account_id = %s
              AND profile_id = %s
              AND profile_is_deleted = FALSE
              AND EXISTS (
                  SELECT 1
                  FROM accounts
                  WHERE accounts.account_id = profiles.account_id
                    AND accounts.account_is_deleted = FALSE
              )
            RETURNING *
            """,
            (
                profile_icon,
                profile_fullname,
                profile_displayname,
                profile_birthdate,
                account_id,
                profile_id,
            ),
        )
        profile = cursor.fetchone()
    return profile

def delete_profile(account_id: str, profile_id: str) -> bool:
    """Soft-delete an owned profile and return whether a row was updated."""
    with connection_cursor() as cursor:
        cursor.execute(
            """
            UPDATE profiles
            SET profile_is_deleted = TRUE,
                profile_updated_at = CURRENT_TIMESTAMP
            WHERE account_id = %s
              AND profile_id = %s
              AND profile_is_deleted = FALSE
              AND EXISTS (
                  SELECT 1
                  FROM accounts
                  WHERE accounts.account_id = profiles.account_id
                    AND accounts.account_is_deleted = FALSE
              )
            """,
            (account_id, profile_id),
        )
        deleted = cursor.rowcount > 0
    return deleted

def create_session_token(
    account_id: str,
    token: str,
    token_expires_at: datetime,
) -> dict | None:
    """Create a token for a non-deleted account and return the token row."""
    try:
        with connection_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO session_tokens (account_id, token, token_expires_at)
                SELECT account_id, %s, %s
                FROM accounts
                WHERE account_id = %s
                  AND account_is_deleted = FALSE
                RETURNING *
                """,
                (token, token_expires_at, account_id),
            )
            session_token = cursor.fetchone()
        return session_token
    except ForeignKeyViolation as error:
        raise ForeignKeyError("The session token references a missing account.") from error

def get_session_token(token: str) -> dict | None:
    """Get an unexpired token only when its account is not soft-deleted."""
    with connection_cursor() as cursor:
        cursor.execute(
            """
            SELECT session_tokens.token_id, session_tokens.account_id,
                   session_tokens.token, session_tokens.token_created_at,
                   session_tokens.token_expires_at
            FROM session_tokens
            JOIN accounts
              ON accounts.account_id = session_tokens.account_id
            WHERE session_tokens.token = %s
              AND session_tokens.token_expires_at > CURRENT_TIMESTAMP
              AND accounts.account_is_deleted = FALSE
            ORDER BY session_tokens.token_created_at DESC, session_tokens.token_id
            LIMIT 1
            """,
            (token,),
        )
        session_token = cursor.fetchone()
    return session_token

def update_session_token(
    token_id: str,
    token: str,
    token_expires_at: datetime,
) -> dict | None:
    """Replace a token value and expiry by token UUID and return the saved row."""
    try:
        with connection_cursor() as cursor:
            cursor.execute(
                """
                UPDATE session_tokens
                SET token = %s,
                    token_expires_at = %s
                WHERE token_id = %s
                RETURNING *
                """,
                (token, token_expires_at, token_id),
            )
            session_token = cursor.fetchone()
        return session_token
    except ForeignKeyViolation as error:
        raise ForeignKeyError("The session token references a missing account.") from error

def delete_session_token(token: str) -> bool:
    """Delete one token by value and return whether a row was deleted."""
    with connection_cursor() as cursor:
        cursor.execute(
            "DELETE FROM session_tokens WHERE token = %s",
            (token,),
        )
        deleted = cursor.rowcount > 0
    return deleted

def delete_account_session_tokens(account_id: str) -> bool:
    """Delete all session tokens for an account and return whether any were deleted."""
    with connection_cursor() as cursor:
        cursor.execute(
            "DELETE FROM session_tokens WHERE account_id = %s",
            (account_id,),
        )
        deleted = cursor.rowcount > 0
    return deleted

def delete_expired_session_tokens() -> bool:
    """Delete expired session tokens and return whether any were deleted."""
    with connection_cursor() as cursor:
        cursor.execute(
            """
            DELETE FROM session_tokens
            WHERE token_expires_at <= CURRENT_TIMESTAMP
            """
        )
        deleted = cursor.rowcount > 0
    return deleted
