const operationDefinitions = {
  accounts: {
    create: {
      help: "Creates an account. password_hash should be a test value only.",
      sample: { email: "tester@example.test", password_hash: "test-hash" },
    },
    create_with_profile: {
      help: "Creates an account and its first profile in one transaction.",
      sample: { email: "tester@example.test", password_hash: "test-hash", profile_icon: 1, profile_fullname: "Test Person", profile_displayname: "tester", profile_birthdate: "1990-01-01" },
    },
    get_by_id: { help: "Reads a non-deleted account by UUID.", sample: { account_id: "ACCOUNT_UUID" } },
    get_by_email: { help: "Reads a non-deleted account by email.", sample: { email: "tester@example.test" } },
    update: { help: "Updates email and/or a pre-hashed password by account UUID.", sample: { account_id: "ACCOUNT_UUID", email: "updated@example.test" } },
    mark_verified: { help: "Marks an account verified by email.", sample: { email: "tester@example.test" } },
    delete: { help: "Soft-deletes an account by UUID.", sample: { account_id: "ACCOUNT_UUID" } },
  },
  profiles: {
    create: { help: "Creates a profile owned by an active account.", sample: { account_id: "ACCOUNT_UUID", profile_icon: 1, profile_fullname: "Test Person", profile_displayname: "tester", profile_birthdate: "1990-01-01" } },
    get_by_id: { help: "Reads a profile using both owner UUID and profile ID.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID" } },
    list_by_account: { help: "Lists active profiles for an account.", sample: { account_id: "ACCOUNT_UUID" } },
    update: { help: "Replaces the profile fields for the owning account.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID", profile_icon: 2, profile_fullname: "Updated Person", profile_displayname: "updated", profile_birthdate: "1990-01-01" } },
    patch: { help: "Updates only supplied fields for an owned profile.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID", profile_displayname: "edited" } },
    delete: { help: "Soft-deletes an owned profile.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID" } },
  },
  session_tokens: {
    create: { help: "Creates a session token for an active account.", sample: { account_id: "ACCOUNT_UUID", token: "test-token", token_expires_at: "2030-01-01T12:00:00" } },
    get: { help: "Reads a token only if it has not expired.", sample: { token: "test-token" } },
    update: { help: "Replaces a token value and expiry by token UUID.", sample: { token_id: "TOKEN_UUID", token: "updated-token", token_expires_at: "2030-01-01T12:00:00" } },
    delete: { help: "Deletes a token by value.", sample: { token: "test-token" } },
    delete_for_account: { help: "Deletes all session tokens for an account.", sample: { account_id: "ACCOUNT_UUID" } },
    delete_expired: { help: "Purges all expired session tokens. No arguments required.", sample: {} },
  },
  fda_medicines: {
    create: { help: "Creates an FDA medicine. Classification must match a schema enum value.", sample: { registration_id: "TEST-REG-001", approval_id: "TEST-APP-001", genericname: "Example medicine", brandname: "Example brand", dosage_form: "Tablet", dosage_strength: "10 mg", manufacturer: "Example company", pharmacologic_category: "Test", classification: "Over-the-Counter (OTC)" } },
    get_by_id: { help: "Reads an FDA medicine by integer ID.", sample: { fda_id: 1 } },
    get_by_registration_id: { help: "Finds an FDA medicine by registration ID.", sample: { registration_id: "TEST-REG-001" } },
    search: { help: "Searches generic, brand, and manufacturer names. Limit is 1–100.", sample: { search_term: "medicine", limit: 20, offset: 0 } },
    update: { help: "Replaces all FDA medicine fields by integer ID.", sample: { fda_id: 1, registration_id: "TEST-REG-001", approval_id: "TEST-APP-001", genericname: "Example medicine", brandname: "Example brand", dosage_form: "Tablet", dosage_strength: "10 mg", manufacturer: "Example company", pharmacologic_category: "Test", classification: "Over-the-Counter (OTC)" } },
    delete: { help: "Deletes a medicine only when no schedule or vault item references it.", sample: { fda_id: 1 } },
  },
  medication_schedules: {
    create: { help: "Creates a schedule for an owned profile and existing FDA medicine.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID", fda_id: 1, frequency_type: "daily", reminder_times: ["08:00"], start_date: "2026-01-01", end_date: "2026-12-31", notes: "Test schedule" } },
    get_by_id: { help: "Reads an owned schedule with FDA medicine details.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID", schedule_id: 1 } },
    list_by_profile: { help: "Lists schedules for an owned profile.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID" } },
    update: { help: "Replaces all fields on an owned schedule.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID", schedule_id: 1, fda_id: 1, is_active: true, frequency_type: "daily", reminder_times: ["08:00"], start_date: "2026-01-01", end_date: "2026-12-31", notes: "Updated schedule" } },
    delete: { help: "Deletes an owned schedule and its dependent logs.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID", schedule_id: 1 } },
  },
  vault_items: {
    create: { help: "Adds an FDA medicine to an owned profile's vault.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID", fda_id: 1, expiry_date: "2027-01-01" } },
    get_by_id: { help: "Reads an owned vault item with medicine details.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID", vault_id: 1 } },
    list_by_profile: { help: "Lists vault items for an owned profile.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID" } },
    update: { help: "Updates the medicine and expiry date on an owned vault item.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID", vault_id: 1, fda_id: 1, expiry_date: "2027-01-01" } },
    delete: { help: "Deletes an owned vault item.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID", vault_id: 1 } },
  },
  medication_logs: {
    create: { help: "Adds a log for a schedule owned by the given profile.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID", schedule_id: 1, scheduled_time: "2026-01-01T08:00:00", log_status: "pending" } },
    get_by_id: { help: "Reads one log for an owned profile.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID", log_id: 1 } },
    list_by_profile: { help: "Lists profile logs; optional dates use YYYY-MM-DD.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID", start_date: "2026-01-01", end_date: "2026-12-31", limit: 20, offset: 0 } },
    list_by_schedule: { help: "Lists logs for one schedule with optional date and page filters.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID", schedule_id: 1, start_date: "2026-01-01", end_date: "2026-12-31", limit: 20, offset: 0 } },
    update_status: { help: "Updates a log status: pending, taken, missed, or skipped.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID", log_id: 1, log_status: "taken" } },
    delete: { help: "Deletes a log belonging to the specified account and profile.", sample: { account_id: "ACCOUNT_UUID", profile_id: "PROFILE_ID", log_id: 1 } },
  },
};

const resourceSelect = document.querySelector("#resource-select");
const operationSelect = document.querySelector("#operation-select");
const argumentsInput = document.querySelector("#arguments-input");
const operationHelp = document.querySelector("#operation-help");
const endpointLabel = document.querySelector("#endpoint-label");
const submitButton = document.querySelector("#submit-button");
const responseOutput = document.querySelector("#response-output");
const responseStatus = document.querySelector("#response-status");
const apiStatus = document.querySelector("#api-status");
const accessTokenInput = document.querySelector("#access-token-input");

accessTokenInput.value = sessionStorage.getItem("mediscan_access_token") || "";
accessTokenInput.addEventListener("input", () => {
  sessionStorage.setItem("mediscan_access_token", accessTokenInput.value.trim());
});

function authHeaders() {
  const token = accessTokenInput.value.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function selectedOperation() {
  return operationDefinitions[resourceSelect.value][operationSelect.value];
}

function updateOperation() {
  const operations = operationDefinitions[resourceSelect.value];
  operationSelect.replaceChildren();
  for (const name of Object.keys(operations)) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name.replaceAll("_", " ");
    operationSelect.append(option);
  }
  updateSample();
}

function updateSample() {
  const selected = selectedOperation();
  operationHelp.textContent = selected.help;
  argumentsInput.value = JSON.stringify(selected.sample, null, 2);
  endpointLabel.textContent = `POST /api/v1/dev/crud-tester/${resourceSelect.value}/${operationSelect.value}`;
}

for (const name of Object.keys(operationDefinitions)) {
  const option = document.createElement("option");
  option.value = name;
  option.textContent = name.replaceAll("_", " ");
  resourceSelect.append(option);
}

resourceSelect.addEventListener("change", updateOperation);
operationSelect.addEventListener("change", updateSample);
document.querySelector("#format-button").addEventListener("click", () => {
  try {
    argumentsInput.value = JSON.stringify(JSON.parse(argumentsInput.value), null, 2);
  } catch {
    responseStatus.textContent = "Invalid JSON";
    responseStatus.className = "response-status error";
  }
});

async function checkApi() {
  try {
    const response = await fetch("/api/v1/dev/crud-tester/operations", {
      headers: authHeaders(),
    });
    if (response.ok) {
      apiStatus.textContent = "API ready";
      apiStatus.classList.add("ready");
    } else if (response.status === 404) {
      apiStatus.textContent = "API disabled";
    } else {
      apiStatus.textContent = `API returned ${response.status}`;
    }
  } catch {
    apiStatus.textContent = "API unavailable";
  }
}

submitButton.addEventListener("click", async () => {
  let argumentsObject;
  try {
    argumentsObject = JSON.parse(argumentsInput.value);
    if (!argumentsObject || Array.isArray(argumentsObject) || typeof argumentsObject !== "object") {
      throw new Error("Arguments must be a JSON object.");
    }
  } catch (error) {
    responseStatus.textContent = "Invalid JSON";
    responseStatus.className = "response-status error";
    responseOutput.textContent = error.message;
    return;
  }

  const endpoint = `/api/v1/dev/crud-tester/${resourceSelect.value}/${operationSelect.value}`;
  endpointLabel.textContent = `POST ${endpoint}`;
  submitButton.disabled = true;
  responseStatus.textContent = "Running…";
  responseStatus.className = "response-status";
  responseOutput.textContent = "Waiting for the API…";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(argumentsObject),
    });
    const result = await response.json();
    responseStatus.textContent = `${response.status} ${response.statusText}`;
    responseStatus.className = `response-status ${response.ok ? "success" : "error"}`;
    responseOutput.textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    responseStatus.textContent = "Request failed";
    responseStatus.className = "response-status error";
    responseOutput.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

updateOperation();
checkApi();
