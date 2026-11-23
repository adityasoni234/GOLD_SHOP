/**
 * localStorage storage adapter used in DEMO MODE (no Firebase credentials).
 * Same async interface as firebase/firestore.js so services do not care which is active.
 *
 * Note: data lives only in this browser profile. Clearing site data erases it.
 */
import { clean } from '../utils/misc.js';
import { computeNextInvoiceNumber } from '../utils/invoiceNumber.js';

const PREFIX = 'abs-billing:v1:';
const COUNTER_KEY = `${PREFIX}meta:counters`;

function readCollection(col) {
  try {
    const raw = localStorage.getItem(PREFIX + col);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCollection(col, map) {
  try {
    localStorage.setItem(PREFIX + col, JSON.stringify(map));
  } catch (err) {
    throw new Error(
      err?.name === 'QuotaExceededError'
        ? 'Browser storage is full. Remove the uploaded logo or connect Firebase.'
        : 'Could not save to browser storage.',
    );
  }
}

export async function listAll(col) {
  return Object.values(readCollection(col));
}

export async function getOne(col, id) {
  return readCollection(col)[id] || null;
}

export async function saveOne(col, id, data) {
  const map = readCollection(col);
  const payload = clean({ ...data, id });
  map[id] = payload;
  writeCollection(col, map);
  return payload;
}

export async function removeOne(col, id) {
  const map = readCollection(col);
  delete map[id];
  writeCollection(col, map);
}

export async function getCounter() {
  try {
    return JSON.parse(localStorage.getItem(COUNTER_KEY) || '{}').lastInvoiceNumber || 0;
  } catch {
    return 0;
  }
}

/** Allocate the next number and write the invoice in one synchronous step. */
export async function createInvoiceWithNumber(invoice, startNumber) {
  const map = readCollection('invoices');
  const existingNumbers = Object.values(map)
    .map((i) => i.number)
    .filter((n) => Number.isInteger(n));
  const number = computeNextInvoiceNumber({
    lastAllocated: await getCounter(),
    startNumber,
    existingNumbers,
  });
  const record = clean({ ...invoice, number, invoiceNo: `${invoice.prefix || ''}${number}` });
  map[invoice.id] = record;
  writeCollection('invoices', map);
  localStorage.setItem(COUNTER_KEY, JSON.stringify({ lastInvoiceNumber: number }));
  return record;
}

/** Export / import everything (used by Settings > Backup). */
export function exportAll() {
  const out = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (k.startsWith(PREFIX)) out[k] = localStorage.getItem(k);
  }
  return out;
}

export function importAll(data) {
  Object.entries(data || {}).forEach(([k, v]) => {
    if (k.startsWith(PREFIX)) localStorage.setItem(k, v);
  });
}
