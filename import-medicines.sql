-- Imports DATASET_LUMAKIN.csv into philippines_fda_medicines
-- Run inside the Postgres container (see instructions).

CREATE TEMP TABLE staging_fda (
      approval_id             TEXT
    , registration_number     TEXT
    , is_export_only          TEXT
    , brand_name              TEXT
    , product_name            TEXT
    , generic_name            TEXT
    , dosage_form             TEXT
    , dosage_strength         TEXT
    , manufacturer            TEXT
    , company_id              TEXT
    , company_detail_path     TEXT
    , registrant_name         TEXT
    , issuance_date           TEXT
    , expiry_date             TEXT
    , pharmacologic_category  TEXT
    , classification          TEXT
);

\copy staging_fda FROM '/tmp/DATASET_LUMAKIN.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

INSERT INTO philippines_fda_medicines (
      fda_registration_id
    , fda_approval_id
    , fda_brandname
    , fda_genericname
    , fda_dosage_form
    , fda_dosage_strength
    , fda_manufacturer
    , fda_pharmacologic_category
    , fda_classification
)
SELECT
      TRIM(registration_number)
    , TRIM(approval_id)
    , NULLIF(TRIM(brand_name), '')
    , COALESCE(NULLIF(TRIM(generic_name), ''), 'Unknown')
    , NULLIF(TRIM(dosage_form), '')
    , NULLIF(TRIM(dosage_strength), '')
    , NULLIF(TRIM(manufacturer), '')
    , NULLIF(TRIM(pharmacologic_category), '')
    , NULLIF(TRIM(classification), '')::fda_classification_enum
FROM staging_fda
ON CONFLICT DO NOTHING;

SELECT COUNT(*) AS total_medicines FROM philippines_fda_medicines;
