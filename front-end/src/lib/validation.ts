// Simple form checks na shared ng auth/profile screens.

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const MIN_PASSWORD = 8;

// "0226200" -> "02/26/200" (auto-adds the slashes while typing MM/DD/YYYY)
export function maskDate(text: string) {
  const d = text.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

// "MM/DD/YYYY" -> "YYYY-MM-DD" (backend format). Returns null if not a real past date.
export function toApiDate(mmddyyyy: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(mmddyyyy);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  const real = date.getFullYear() === Number(yyyy) && date.getMonth() === Number(mm) - 1 && date.getDate() === Number(dd);
  if (!real || date > new Date() || Number(yyyy) < 1900) return null;
  return `${yyyy}-${mm}-${dd}`;
}