/**
 * Gold & silver rates are entered manually by the shopkeeper.
 * Each update is stored as a new history record; nothing is overwritten,
 * and finalized invoices keep their own copy of the rate used.
 */
import { listAll, saveOne, COLLECTIONS } from './db.js';
import { uid } from '../utils/misc.js';

const byNewest = (a, b) => (a.effectiveAt < b.effectiveAt ? 1 : -1);

export async function listGoldRates() {
  return (await listAll(COLLECTIONS.GOLD_RATES)).sort(byNewest);
}

export async function listSilverRates() {
  return (await listAll(COLLECTIONS.SILVER_RATES)).sort(byNewest);
}

/** rates: { '24K': '13850.00', '22K': '12700.00', ... } (₹ per gram) */
export async function saveRateEntry(metal, rates, { note = '', user = '' } = {}) {
  const col = metal === 'Silver' ? COLLECTIONS.SILVER_RATES : COLLECTIONS.GOLD_RATES;
  const clean = Object.fromEntries(Object.entries(rates).filter(([, v]) => String(v ?? '').trim() !== ''));
  const id = uid('rate_');
  return saveOne(col, id, { metal, rates: clean, note, user, effectiveAt: new Date().toISOString() });
}

/** Latest rate for a purity label, searching newest entries first. */
export function findLatestRate(entries, purity) {
  for (const e of entries) {
    if (e.rates && String(e.rates[purity] ?? '').trim() !== '') return { rate: e.rates[purity], effectiveAt: e.effectiveAt };
  }
  return null;
}
