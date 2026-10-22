CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUM TYPES
CREATE TYPE fda_classification_enum AS 
    ENUM (
        'Unclassified / Dosage Form', 
        'Traditional/Herbal', 
        'Prescription (Rx)', 
        'Over-the-Counter (OTC)', 
        'Household Remedy (HR)'
    );

-- ENTITY TABLE DEFINITIONS
-- I. USER MANAGEMENT
--    1. Accounts
CREATE TABLE accounts (
      account_id                    UUID                            NOT NULL DEFAULT gen_random_uuid()
    , email                         TEXT                            NOT NULL
    , password_hash                 TEXT                            NOT NULL
    , account_is_verified           BOOLEAN                         NOT NULL DEFAULT FALSE
    , account_is_deleted            BOOLEAN                         NOT NULL DEFAULT FALSE
    , account_created_at            TIMESTAMP                       NOT NULL DEFAULT CURRENT_TIMESTAMP
    , account_updated_at            TIMESTAMP                       NOT NULL DEFAULT CURRENT_TIMESTAMP
    , PRIMARY KEY (account_id)
);

--    2. Session Tokens
CREATE TABLE session_tokens (
      token_id                      UUID                            NOT NULL DEFAULT gen_random_uuid()
    , account_id                    UUID                            NOT NULL
    , token                         TEXT                            NOT NULL
    , token_created_at              TIMESTAMP                       NOT NULL DEFAULT CURRENT_TIMESTAMP
    , token_expires_at              TIMESTAMP                       NOT NULL
    , PRIMARY KEY (token_id)
);

--    3. Profiles
CREATE TABLE profiles (
      profile_id                    VARCHAR(16)                     NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex')
    , account_id                    UUID                            NOT NULL
    , profile_is_deleted            BOOLEAN                         NOT NULL DEFAULT FALSE
    , profile_fullname              TEXT                            NOT NULL
    , profile_displayname           VARCHAR(10)                     NOT NULL
    , profile_icon                  SMALLINT                        NOT NULL
    , profile_birthdate             DATE                            NOT NULL
    , profile_created_at            TIMESTAMP                       NOT NULL DEFAULT CURRENT_TIMESTAMP
    , profile_updated_at            TIMESTAMP                       NOT NULL DEFAULT CURRENT_TIMESTAMP
    , PRIMARY KEY (profile_id)
);

-- II. MEDICINE VAULT & FDA REGISTRY
--    1. Philippines FDA Medicines
CREATE TABLE philippines_fda_medicines (
      fda_id                        SERIAL                          NOT NULL
    , fda_registration_id           TEXT                            NOT NULL
    , fda_approval_id               TEXT                            NOT NULL
    , fda_brandname                 TEXT                                NULL
    , fda_genericname               TEXT                            NOT NULL
    , fda_dosage_form               TEXT                                NULL
    , fda_dosage_strength           TEXT                                NULL
    , fda_manufacturer              TEXT                                NULL
    , fda_pharmacologic_category    TEXT                                NULL
    , fda_classification            fda_classification_enum             NULL
    , fda_created_at                TIMESTAMP                       NOT NULL DEFAULT CURRENT_TIMESTAMP
    , fda_updated_at                TIMESTAMP                       NOT NULL DEFAULT CURRENT_TIMESTAMP
    , PRIMARY KEY (fda_id)
);

-- III. SCHEDULING & LOGS
--    1. Medication Schedules
CREATE TABLE medication_schedules (
      schedule_id                   SERIAL                          NOT NULL
    , profile_id                    VARCHAR(16)                     NOT NULL
    , fda_id                        INTEGER                         NOT NULL
    , sched_is_active               BOOLEAN                         NOT NULL DEFAULT TRUE
    , sched_frequency_type          TEXT                            NOT NULL
    , sched_reminder_time           TIME[]                          NOT NULL
    , sched_start_date              DATE                            NOT NULL
    , sched_end_date                DATE                                NULL
    , sched_notes                   TEXT                                NULL
    , sched_created_at              TIMESTAMP                       NOT NULL DEFAULT CURRENT_TIMESTAMP
    , sched_updated_at              TIMESTAMP                       NOT NULL DEFAULT CURRENT_TIMESTAMP
    , PRIMARY KEY (schedule_id)
);

--    2. Vault Items
CREATE TABLE vault_items (
      vault_id                      SERIAL                          NOT NULL
    , profile_id                    VARCHAR(16)                     NOT NULL
    , fda_id                        INTEGER                         NOT NULL
    , vault_expiry_date             DATE                            NOT NULL
    , vault_created_at              TIMESTAMP                       NOT NULL DEFAULT CURRENT_TIMESTAMP
    , vault_updated_at              TIMESTAMP                       NOT NULL DEFAULT CURRENT_TIMESTAMP
    , PRIMARY KEY (vault_id)
);

--    3. Medication Logs
CREATE TABLE medication_logs (
      log_id                        SERIAL                          NOT NULL
    , schedule_id                   INTEGER                         NOT NULL
    , profile_id                    VARCHAR(16)                     NOT NULL
    , log_scheduled_time            TIMESTAMP                       NOT NULL
    , log_taken_at                  TIMESTAMP                           NULL
    , log_status                    TEXT                            NOT NULL
    , PRIMARY KEY (log_id)
);

-- CONSTRAINTS
-- I. USER MANAGEMENT
ALTER TABLE accounts
    ADD CONSTRAINT uq_accounts_email
        UNIQUE (email),
    ADD CONSTRAINT chk_accounts_email_format
        CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    ADD CONSTRAINT chk_accounts_email_lower
        CHECK (email = LOWER(email));

ALTER TABLE session_tokens
    ADD CONSTRAINT fk_session_tokens_account
        FOREIGN KEY (account_id)
        REFERENCES accounts(account_id)
        ON DELETE CASCADE;

ALTER TABLE profiles
    ADD CONSTRAINT fk_profiles_account
        FOREIGN KEY (account_id)
        REFERENCES accounts(account_id)
        ON DELETE CASCADE;

-- II. MEDICINE VAULT & FDA REGISTRY
ALTER TABLE philippines_fda_medicines
    ADD CONSTRAINT uq_fda_registration_id
        UNIQUE (fda_registration_id),
    ADD CONSTRAINT uq_fda_approval_id
        UNIQUE (fda_approval_id);

-- III. SCHEDULING & LOGS
ALTER TABLE medication_schedules
    ADD CONSTRAINT fk_med_sched_profile
        FOREIGN KEY (profile_id)
        REFERENCES profiles(profile_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_med_sched_fda
        FOREIGN KEY (fda_id)
        REFERENCES philippines_fda_medicines(fda_id);

ALTER TABLE vault_items
    ADD CONSTRAINT fk_vault_profile
        FOREIGN KEY (profile_id)
        REFERENCES profiles(profile_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_vault_fda
        FOREIGN KEY (fda_id)
        REFERENCES philippines_fda_medicines(fda_id);

ALTER TABLE medication_logs
    ADD CONSTRAINT fk_logs_schedule
        FOREIGN KEY (schedule_id)
        REFERENCES medication_schedules(schedule_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_logs_profile
        FOREIGN KEY (profile_id)
        REFERENCES profiles(profile_id)
        ON DELETE CASCADE;

-- INDEXES
CREATE INDEX idx_fda_registration_trgm ON philippines_fda_medicines USING gin (fda_registration_id gin_trgm_ops);
CREATE INDEX idx_fda_genericname_trgm ON philippines_fda_medicines USING gin (fda_genericname gin_trgm_ops);
CREATE INDEX idx_fda_brandname_trgm ON philippines_fda_medicines USING gin (fda_brandname gin_trgm_ops);
CREATE INDEX idx_fda_manufacturer_trgm ON philippines_fda_medicines USING gin (fda_manufacturer gin_trgm_ops);