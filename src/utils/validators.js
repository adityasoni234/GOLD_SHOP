import { isValidRate } from './gstCalculations.js';
import { toScaled, SCALE } from './decimal.js';
import { MAX_ITEMS_PER_INVOICE } from '../constants/index.js';

export const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function isValidGSTIN(v) {
  return GSTIN_REGEX.test(String(v || '').trim().toUpperCase());
}

export function isValidPhone(v) {
  return /^[6-9]\d{9}$/.test(String(v || '').replace(/[\s-]/g, '').replace(/^(\+91|0)/, ''));
}

export function isValidPIN(v) {
  return /^[1-9]\d{5}$/.test(String(v || '').trim());
}

export function isValidIFSC(v) {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(v || '').trim().toUpperCase());
}

/**
 * Validate an invoice form against its computed totals.
 * Returns a list of human-readable errors (empty = OK).
 */
export function validateInvoice(form, computed, { invoices = [] } = {}) {
  const errors = [];
  if (!String(form.customer?.name || '').trim()) errors.push('Customer name cannot be empty.');
  if (form.customer?.phone && !isValidPhone(form.customer.phone)) errors.push('Customer phone number looks invalid (10 digits).');
  if (form.customer?.gstin && !isValidGSTIN(form.customer.gstin)) errors.push('Customer GSTIN format is invalid.');
  if (!form.date) errors.push('Invoice date is required.');
  if (!form.items?.length) errors.push('Invoice must contain at least one jewellery item.');
  if (form.items?.length > MAX_ITEMS_PER_INVOICE)
    errors.push(`A single A4 invoice can hold at most ${MAX_ITEMS_PER_INVOICE} items.`);

  computed.lines.forEach((line, i) => {
    Object.values(line.errors).forEach((msg) => errors.push(`Item ${i + 1}: ${msg}.`));
  });
  computed.taxErrors?.forEach((e) => errors.push(e));
  computed.oldMetalErrors?.forEach((e) => errors.push(e));
  if (computed.grossPaise < 0)
    errors.push('Old gold/silver value is more than the bill. Reduce the old metal amount (settle the difference separately).');

  if (form.number != null && invoices.some((inv) => inv.number === form.number && inv.id !== form.id))
    errors.push(`Invoice number ${form.number} already exists.`);

  (form.payments || []).forEach((p, i) => {
    const amt = toScaled(p.amount, SCALE.MONEY, NaN);
    if (!Number.isFinite(amt)) errors.push(`Payment ${i + 1}: enter a valid amount.`);
    else if (amt < 0) errors.push(`Payment ${i + 1}: amount cannot be negative.`);
  });

  // Reconciliation: totals must equal the sum of items and taxes.
  const itemsSum = computed.lines.reduce((a, l) => a + l.totalPaise, 0);
  if (itemsSum !== computed.itemsTotalPaise) errors.push('Item totals do not reconcile.');
  if (computed.itemsTotalPaise + computed.totalTaxPaise + (computed.adjustmentPaise || 0) + computed.roundOffPaise !== computed.grossPaise)
    errors.push('Gross amount does not reconcile with item totals, taxes and old metal adjustment.');

  return errors;
}

export function validateTaxSettings(tax) {
  const errors = [];
  ['cgstRate', 'sgstRate', 'igstRate'].forEach((k) => {
    if (!isValidRate(tax[k])) errors.push(`${k.replace('Rate', '').toUpperCase()} must be a percentage between 0 and 100.`);
  });
  return errors;
}
