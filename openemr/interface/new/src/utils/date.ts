/** Format a date/datetime value to a clean "YYYY-MM-DD" string for display. */
export function formatDateOnly(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const s = String(value).trim();
  if (!s) return '—';
  // Handles full ISO datetimes, "YYYY-MM-DD", and "YYYY-MM-DD HH:mm:ss" strings.
  return s.slice(0, 10);
}

/** Human-readable date, e.g. "Sep 18, 2026". */
export function formatDateHuman(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

/** Human-readable date + time, e.g. "Sep 18, 2026, 04:10 PM". */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value).replace('T', ' ').slice(0, 16);
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}
