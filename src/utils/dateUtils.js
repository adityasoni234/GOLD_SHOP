import { format, parseISO, isValid } from 'date-fns';

/** yyyy-MM-dd for "today" in local time. */
export function todayISO() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function nowISO() {
  return new Date().toISOString();
}

export function formatDate(isoDate, fmt = 'dd-MM-yyyy') {
  if (!isoDate) return '';
  const d = typeof isoDate === 'string' ? parseISO(isoDate) : isoDate;
  return isValid(d) ? format(d, fmt) : '';
}

export function formatDateTime(iso, fmt = 'dd-MM-yyyy hh:mm a') {
  return formatDate(iso, fmt);
}

/** "2026-11" */
export function monthKey(isoDate) {
  return String(isoDate || '').slice(0, 7);
}

export function monthLabel(key) {
  return key ? formatDate(`${key}-01`, 'MMM yyyy') : '';
}

/** Indian financial year label for a date: 2026-11-18 -> "FY 2026-27". */
export function financialYear(isoDate) {
  const y = Number(String(isoDate).slice(0, 4));
  const m = Number(String(isoDate).slice(5, 7));
  if (!y || !m) return '';
  const start = m >= 4 ? y : y - 1;
  return `FY ${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/** Inclusive date-range check on yyyy-MM-dd strings (empty bounds are open). */
export function inDateRange(isoDate, from, to) {
  const d = String(isoDate || '').slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}
