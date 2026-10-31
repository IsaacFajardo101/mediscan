// Mock data for Home + Vault.
// The JSON files in this folder are copies of the SHARED mock data from the Drive
// (don't edit them; replace them if the shared mock changes).
//
// TEMP: the shared medicine mock only has FDA fields. The Vault design also needs
// expiry date, status, date saved, confidence and note, which are not in the API schema yet.
// VAULT_EXTRAS below fills those in so the screens can be built and tested.
// When the real endpoint is ready (Sprint 4), delete VAULT_EXTRAS and map the real fields here.
import type { FdaMedicine, Profile, ReminderSchedule, VaultMedicine } from '@/types/medicine';
import { daysFromToday } from '@/utils/medicine';
import medicinesResponse from './medicine/response_2_multiple.json';
import profilesResponse from './profile/fetch_profile.json';
import remindersResponse from './reminder/response_1_reminder_fetch.json';

type Extra = {
  source: 'scan' | 'manual';
  confidence: number | null;
  expiresInDays: number;   // relative to today, so the demo always shows expired / expiring items
  savedDaysAgo: number;
  note?: string;
};

// Keyed by fda_registration_id.
// Rule from the doc: everything from a scan = verified, everything from manual entry = needs verification.
const VAULT_EXTRAS: Record<string, Extra> = {
  'BR-1005': { source: 'scan', confidence: 96, expiresInDays: 140, savedDaysAgo: 2 },
  'BR-1004': { source: 'manual', confidence: null, expiresInDays: 13, savedDaysAgo: 4 },
  'BR-1053': { source: 'scan', confidence: 91, expiresInDays: 23, savedDaysAgo: 8 },
  'BR-1093': { source: 'scan', confidence: 88, expiresInDays: -28, savedDaysAgo: 46 },
  'BR-1026': { source: 'manual', confidence: null, expiresInDays: 216, savedDaysAgo: 53 },
  'BR-1048': { source: 'scan', confidence: 94, expiresInDays: 95, savedDaysAgo: 61 },
  'BR-1091': { source: 'scan', confidence: 85, expiresInDays: -27, savedDaysAgo: 76 },
  'BR-1068': { source: 'scan', confidence: 97, expiresInDays: 291, savedDaysAgo: 92 },
  'DRP-16105': { source: 'scan', confidence: 99, expiresInDays: 423, savedDaysAgo: 105, note: 'Take after breakfast.' },
  'DRP-16102': { source: 'manual', confidence: null, expiresInDays: 470, savedDaysAgo: 147 },
};

const DEFAULT_EXTRA: Extra = { source: 'scan', confidence: 90, expiresInDays: 180, savedDaysAgo: 1 };

// Builds the starting vault (used only the very first time the app opens, when nothing is saved yet).
export function buildMockVault(): VaultMedicine[] {
  const data = (medicinesResponse.data ?? []) as FdaMedicine[];
  return data.map((fda) => {
    const x = VAULT_EXTRAS[fda.fda_registration_id] ?? DEFAULT_EXTRA;
    return {
      ...fda,
      vault_id: `mock-${fda.fda_approval_id}`,
      vault_expiry_date: daysFromToday(x.expiresInDays),
      vault_status: x.source === 'scan' ? 'verified' : 'needs_verification',
      vault_source: x.source,
      vault_confidence: x.confidence,
      vault_note: x.note ?? '',
      vault_saved_at: `${daysFromToday(-x.savedDaysAgo)}T09:00:00`,
      vault_common_uses: null,
      vault_warnings: null,
    };
  });
}

export function getMockProfiles(): Profile[] {
  return (profilesResponse.data?.profiles ?? []) as Profile[];
}

// TEMP: the reminder mock uses profile_id "PROF123456789012" but the profile mock uses 1 and 2.
// Until backend fixes the mock, treat that id as profile 1 so Upcoming Reminders has something to show.
const MOCK_PROFILE_ALIAS: Record<string, number> = { PROF123456789012: 1 };

export function getMockReminders(): ReminderSchedule[] {
  const data = (remindersResponse.data ?? []) as ReminderSchedule[];
  return data.map((r) => ({
    ...r,
    profile_id: MOCK_PROFILE_ALIAS[String(r.profile_id)] ?? r.profile_id,
  }));
}
