// Small helpers for medicines: dates, forms, search/filter/sort.
// No React here, so these can be reused anywhere (Upcoming Alerts, Scan Results, etc.).
import type {
  MedicineForm, SortOrder, StatusFilter, UrgencyFilter, VaultMedicine,
} from '@/types/medicine';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

// 'YYYY-MM-DD' -> Date at local midnight (avoids timezone shifts from new Date('YYYY-MM-DD'))
export function parseDate(ymd: string | null | undefined): Date | null {
  if (!ymd) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

export function toYMD(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Today +/- n days, as 'YYYY-MM-DD'
export function daysFromToday(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return toYMD(d);
}

// "December 25, 2026"
export function formatLongDate(ymdOrIso: string | null | undefined): string {
  const d = parseDate(ymdOrIso ?? null);
  if (!d) return '—';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// "Aug 13, 2026"
export function formatShortDate(ymdOrIso: string | null | undefined): string {
  const d = parseDate(ymdOrIso ?? null);
  if (!d) return '—';
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
}

// "8:00 AM" from "08:00:00"
export function formatTime(hms: string): string {
  const [hStr, mStr = '00'] = hms.split(':');
  const h = Number(hStr);
  if (isNaN(h)) return hms;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr.padStart(2, '0')} ${suffix}`;
}

// Days from today until the expiry date (negative = already expired, null = no date)
export function daysUntilExpiry(m: Pick<VaultMedicine, 'vault_expiry_date'>, now = new Date()): number | null {
  const exp = parseDate(m.vault_expiry_date);
  if (!exp) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((exp.getTime() - today.getTime()) / 86400000);
}

export function isExpired(m: Pick<VaultMedicine, 'vault_expiry_date'>, now = new Date()): boolean {
  const d = daysUntilExpiry(m, now);
  return d !== null && d < 0;
}

// Expiring soon = not expired yet, and expires within `days` days (Home "Expiring" card uses 30)
export function isExpiringWithin(m: Pick<VaultMedicine, 'vault_expiry_date'>, days: number, now = new Date()): boolean {
  const d = daysUntilExpiry(m, now);
  return d !== null && d >= 0 && d <= days;
}

// "Expires on December 25, 2026" / "Expired on ..." / "No expiry date"
export function expiryLabel(m: Pick<VaultMedicine, 'vault_expiry_date'>): string {
  if (!m.vault_expiry_date) return 'No expiry date';
  return `${isExpired(m) ? 'Expired on' : 'Expires on'} ${formatLongDate(m.vault_expiry_date)}`;
}

// Turns the long FDA dosage form ("Film-Coated Tablet", "Solution for Injection (IV)")
// into one of the short forms used by the icons and filter chips.
export function getMedicineForm(dosageForm: string | null | undefined): MedicineForm {
  const f = (dosageForm ?? '').toLowerCase();
  if (f.includes('capsule')) return 'Capsule';
  if (f.includes('tablet') || f.includes('caplet')) return 'Tablet';
  if (f.includes('inhal') || f.includes('aerosol')) return 'Inhaler';
  if (f.includes('drop')) return 'Drops';
  if (f.includes('inject') || f.includes('infusion') || f.includes('(iv') || f.includes('i.v.')) return 'Injection';
  if (f.includes('syrup') || f.includes('suspension') || f.includes('oral solution') || f.includes('liquid') || f.includes('elixir')) return 'Syrup';
  return 'Other';
}

export const MEDICINE_FORMS: MedicineForm[] = ['Tablet', 'Capsule', 'Syrup', 'Drops', 'Inhaler', 'Injection', 'Other'];

export function medicineName(m: Pick<VaultMedicine, 'fda_brandname' | 'fda_genericname'>): string {
  return m.fda_brandname?.trim() || m.fda_genericname?.trim() || 'Unnamed medicine';
}

// ---------- search / filter / sort ----------

export type ListQuery = {
  search: string;
  status: StatusFilter;
  sort: SortOrder;
  forms: MedicineForm[];       // empty = all forms
  urgency: UrgencyFilter;
  customFrom: string | null;   // 'YYYY-MM-DD'
  customTo: string | null;     // 'YYYY-MM-DD'
};

export const DEFAULT_QUERY: ListQuery = {
  search: '', status: 'all', sort: 'az', forms: [], urgency: 'none', customFrom: null, customTo: null,
};

export function matchesSearch(m: VaultMedicine, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [m.fda_brandname, m.fda_genericname, m.fda_dosage_form, m.fda_dosage_strength, m.vault_note]
    .some((v) => (v ?? '').toLowerCase().includes(q));
}

export function matchesStatus(m: VaultMedicine, status: StatusFilter, now = new Date()): boolean {
  switch (status) {
    case 'all': return true;
    case 'expired': return isExpired(m, now);
    default: return m.vault_status === status;
  }
}

export function matchesUrgency(m: VaultMedicine, q: ListQuery, now = new Date()): boolean {
  switch (q.urgency) {
    case 'none': return true;
    case 'within7': return isExpiringWithin(m, 7, now);
    case 'within30': return isExpiringWithin(m, 30, now);
    case 'expired': return isExpired(m, now);
    case 'custom': {
      const exp = parseDate(m.vault_expiry_date);
      if (!exp) return false;
      const from = parseDate(q.customFrom);
      const to = parseDate(q.customTo);
      if (from && exp < from) return false;
      if (to && exp > to) return false;
      return true;
    }
  }
}

export function applyQuery(list: VaultMedicine[], q: ListQuery, now = new Date()): VaultMedicine[] {
  const out = list.filter((m) =>
    matchesSearch(m, q.search) &&
    matchesStatus(m, q.status, now) &&
    (q.forms.length === 0 || q.forms.includes(getMedicineForm(m.fda_dosage_form))) &&
    matchesUrgency(m, q, now),
  );
  out.sort((a, b) => {
    const r = medicineName(a).localeCompare(medicineName(b), undefined, { sensitivity: 'base' });
    return q.sort === 'az' ? r : -r;
  });
  return out;
}

// How many sheet filters are on (for the little dot/number on the filter button)
export function activeSheetFilterCount(q: ListQuery): number {
  return (q.forms.length > 0 ? 1 : 0) + (q.urgency !== 'none' ? 1 : 0);
}

// Counts for the Home "Medicine Overview" cards
export function overviewCounts(list: VaultMedicine[], now = new Date()) {
  return {
    total: list.length,
    verified: list.filter((m) => m.vault_status === 'verified').length,
    needsVerification: list.filter((m) => m.vault_status === 'needs_verification').length,
    expiring: list.filter((m) => isExpiringWithin(m, 30, now)).length,
    expired: list.filter((m) => isExpired(m, now)).length,
  };
}

// "MM/DD/YYYY" typed by the user -> 'YYYY-MM-DD' (null if invalid)
export function mdyToYMD(text: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  if (d.getMonth() !== Number(m[1]) - 1 || d.getDate() !== Number(m[2])) return null; // e.g. 02/31
  return toYMD(d);
}

export function ymdToMDY(ymd: string | null): string {
  const d = parseDate(ymd);
  if (!d) return '';
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}
