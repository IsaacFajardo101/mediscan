// Formats typed digits as "MM / DD / YYYY" while the user types.
export const formatDateInput = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  const parts = [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean);
  return parts.join(' / ');
};
