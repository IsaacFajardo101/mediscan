// Types for medicines, reminders and profiles used by Home + Vault (and Scan Results).
// The FDA fields match the shared mock data (Mockdata/response_2_multiple.json).

// One medicine from the FDA dataset, exactly as the backend sends it.
export type FdaMedicine = {
  fda_approval_id: string;
  fda_registration_id: string;
  fda_brandname: string;
  fda_genericname: string;
  fda_dosage_form: string;
  fda_dosage_strength: string;
  fda_manufacturer: string | null;
  fda_pharmacologic_category: string | null;
  fda_classification: string | null;
};

export type VerificationStatus = 'verified' | 'needs_verification';
export type MedicineSource = 'scan' | 'manual';

// A medicine saved in the user's vault = FDA info + the user's own info.
// TEMP: the vault_* fields are NOT in the API schema yet. Rename them once backend
// shares the real "saved medicine" schema. Only this file and src/mock/ need to change.
export type VaultMedicine = FdaMedicine & {
  vault_id: string;                  // local id of this saved item
  vault_expiry_date: string | null;  // 'YYYY-MM-DD'
  vault_status: VerificationStatus;  // scan = verified, manual entry = needs_verification
  vault_source: MedicineSource;
  vault_confidence: number | null;   // 0-100, scans only
  vault_note: string;                // personal note ("" if none)
  vault_saved_at: string;            // ISO date-time when it was saved
  vault_common_uses?: string | null; // optional, shown in Medicine Details if present
  vault_warnings?: string | null;    // optional, shown in Medicine Details if present
};

// What Scan Results / Manual Entry pass in before the medicine is saved (no id yet).
export type NewMedicine = Omit<VaultMedicine, 'vault_id' | 'vault_saved_at' | 'vault_note'> & {
  vault_note?: string;
};

// Short medicine form used for icons and the filter chips.
export type MedicineForm = 'Tablet' | 'Capsule' | 'Syrup' | 'Drops' | 'Inhaler' | 'Injection' | 'Other';

export type StatusFilter = 'all' | 'verified' | 'needs_verification' | 'expired';
export type UrgencyFilter = 'none' | 'within7' | 'within30' | 'expired' | 'custom';
export type SortOrder = 'az' | 'za';

// Reminder schedule, as in Mockdata/response_1_reminder_fetch.json
export type ReminderSchedule = {
  schedule_id: number;
  profile_id: string | number;
  fda_registration_id: string;
  sched_is_active: boolean;
  sched_frequency_type: string;
  sched_reminder_time: string[]; // 'HH:mm:ss'
  sched_start_date: string;      // 'YYYY-MM-DD'
  sched_end_date: string | null;
  sched_notes: string | null;
  sched_created_at: string;
  sched_updated_at: string;
};

// Profile, as in Mockdata/Profiles/Response/Fetch Profile.json
export type Profile = {
  profile_id: number;
  profile_icon: number;
  profile_fullname: string;
  profile_birthdate: string;
  profile_relationship?: string;
};
