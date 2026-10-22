# MediScan CRUD tester

This is a small browser workbench for calling the real CRUD functions in `crud_user.py` and `crud_medicine.py`. It covers accounts, profiles, session tokens, FDA medicines, medication schedules, vault items, and medication logs. The existing public API handlers remain unchanged.

## Run locally

1. Start PostgreSQL and make sure the repository-root `.env` has the database connection settings.
2. Enable the local-only test API in that `.env`:

   ```dotenv
   ENABLE_CRUD_TEST_API=true
   ```

3. Install backend requirements if needed and start FastAPI from the backend directory:

   ```powershell
   cd back-end
   python -m pip install -r requirements.txt
   python -m uvicorn main:app --app-dir app --reload
   ```

4. Open <http://127.0.0.1:8000/crud-tester/>.

The test API is disabled unless explicitly enabled, and it rejects non-loopback clients. It is intended only for disposable local development data: create/update/delete requests modify the configured database. Account operations accept a `password_hash` value and do not hash passwords; use test values only.

Select a table and operation to load an example JSON argument object. Replace placeholders with IDs returned by earlier requests, then run the operation. Date/time values use ISO formats (`YYYY-MM-DD`, `HH:MM`, or `YYYY-MM-DDTHH:MM:SS`). Responses and API errors are displayed in the page.
