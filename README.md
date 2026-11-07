# MediScan

MediScan is a local FastAPI backend and Expo/React Native frontend for medicine scanning, account profiles, OCR medicine matching, and a medicine vault.

## Project layout

```text
back-end/   FastAPI API, PostgreSQL access, OCR, authentication, and vault API
front-end/  Expo Router mobile/web application
01-schema.sql
.env        Local backend/database/email configuration (never commit)
```

## Requirements

- Python 3.12 recommended
- Node.js and npm
- PostgreSQL running locally
- Expo-compatible development environment for Android/iOS testing
- A verified Brevo sender and SMTP credentials for email verification

The application can be run entirely on localhost. No public network or LAN address is required for browser/web testing.

## Backend setup

From the repository root, create `.env`:

```dotenv
DATABASE_URL=postgresql://<user>:<password>@127.0.0.1:5432/mediscan_db
VERIFICATION_CODE_PEPPER=<random-secret>

BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USERNAME=<brevo-smtp-login>
BREVO_SMTP_PASSWORD=<brevo-smtp-key>
BREVO_SENDER_EMAIL=<verified-brevo-sender>
BREVO_SENDER_NAME=MediScan

# Optional: enable the local CRUD workbench only when needed.
ENABLE_CRUD_TEST_API=false
```

Do not commit `.env` or paste SMTP credentials into source control. If a credential is exposed, revoke it in Brevo and generate a replacement.

Create the database and apply the schema:

```powershell
psql -h 127.0.0.1 -U <user> -d mediscan_db -f .\01-schema.sql
```

Install backend dependencies:

```powershell
cd .\back-end
python -m pip install -r requirements.txt
```

Start the backend on localhost:

```powershell
$env:PYTHONPATH = "app"
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Useful backend URLs:

- API root: <http://127.0.0.1:8000/api/v1/>
- Health check: <http://127.0.0.1:8000/api/v1/health>
- OpenAPI documentation: <http://127.0.0.1:8000/docs>

The FDA dataset must already exist in PostgreSQL for OCR linking and vault operations. Use the repository's database import/seed scripts when setting up a fresh database.

## Frontend setup

From `front-end`, create `.env`:

```dotenv
EXPO_PUBLIC_USE_API=true
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

Install dependencies and start Expo:

```powershell
cd .\front-end
npm install
npx expo start
```

For browser testing:

```powershell
npx expo start --web
```

Open the localhost URL printed by Expo, normally <http://localhost:8081>.

Run the backend and frontend in separate terminals. If environment variables change, restart Expo with:

```powershell
npx expo start -c
```

For local browser testing, use `127.0.0.1` for both services. A physical phone cannot use the computer's `127.0.0.1` directly; use an isolated private network or an emulator configured for host access if mobile-device testing is required.

## Main integrated flows

1. Sign up through `POST /api/v1/auth/register`.
2. Receive the verification code through Brevo.
3. Verify through `POST /api/v1/auth/verify-email`.
4. Log in and select a profile.
5. Scan a medicine image through `POST /api/v1/ocr/extract-label`.
6. Save, update, list, and delete medicines through `/api/v1/accounts/me/vault`.

New accounts start with no profiles. Profiles are created from the frontend after verification. Signing up with an existing email is flagged by the frontend instead of silently creating another account; use Log In or Resend Code.

## Local CRUD workbench

The CRUD tester is intended only for local development:

```powershell
cd .\back-end
$env:PYTHONPATH = "app"
$env:ENABLE_CRUD_TEST_API = "true"
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open <http://127.0.0.1:8000/crud-tester/>.

It modifies the configured database and rejects non-loopback clients. Do not enable it on a shared or production server.

## Validation

Backend tests:

```powershell
cd .\back-end
pytest -q
```

Frontend typecheck and lint:

```powershell
cd .\front-end
npx tsc --noEmit
npx expo lint
```

The repository may contain existing Expo SDK 58 type/lint findings in unrelated screens. Changed integration files should still be checked independently when the full suite reports those pre-existing issues.

## Troubleshooting

- **`Failed to fetch`:** confirm the backend is running, `EXPO_PUBLIC_API_URL` points to `http://127.0.0.1:8000/api/v1`, and restart Expo with `npx expo start -c`.
- **API root returns 404:** use `/api/v1/health` or `/docs`; `/api/v1/` is also available in the current backend.
- **No verification email:** verify the Brevo sender, confirm the root `.env` is being used, check Brevo transactional logs, and inspect the backend terminal for SMTP errors.
- **Existing account message:** use Log In or Resend Code rather than submitting Sign Up repeatedly.
- **Empty profile list:** this is expected for a newly created account; create the first profile in the app.
