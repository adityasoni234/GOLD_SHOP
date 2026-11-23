/** Random id (crypto-strong where available). */
export function uid(prefix = '') {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 20)
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}${rand}`;
}

/** Deep clone that also strips `undefined` (Firestore rejects undefined values). */
export function clean(obj) {
  return JSON.parse(JSON.stringify(obj ?? null));
}

/** Recursive merge: values in `override` win; arrays are replaced, not merged. */
export function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) return override !== undefined ? override : base;
  if (typeof base !== 'object' || base === null) return override !== undefined ? override : base;
  const out = { ...base };
  Object.keys(override || {}).forEach((k) => {
    out[k] = deepMerge(base[k], override[k]);
  });
  return out;
}

/** Build a CSV string and trigger a browser download. */
export function downloadCSV(filename, columns, rows) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((c) => esc(c.label)).join(',')];
  rows.forEach((r) => lines.push(columns.map((c) => esc(c.csv ? c.csv(r) : r[c.key])).join(',')));
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function classNames(...args) {
  return args.filter(Boolean).join(' ');
}
