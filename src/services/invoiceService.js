/**
 * Invoice lifecycle: draft -> final -> (revised with audit trail) -> cancelled.
 *
 * A finalized invoice stores complete snapshots (customer, shop details, bank,
 * terms, tax configuration, item rates and every computed figure) so it never
 * changes when settings, customer details or today's rates are updated later.
 */
import { listAll, getOne, saveOne, removeOne, createInvoiceWithNumber, COLLECTIONS } from './db.js';
import { logAudit } from './auditService.js';
import { calculateInvoice } from '../utils/calculations.js';
import { determineTaxMode } from '../utils/gstCalculations.js';
import { amountToIndianWords } from '../utils/numberToWords.js';
import { uid, clean } from '../utils/misc.js';
import { INVOICE_STATUS, PAYMENT_STATUS } from '../constants/index.js';

export async function listInvoices() {
  const all = await listAll(COLLECTIONS.INVOICES);
  return all.sort((a, b) => {
    if (a.status === INVOICE_STATUS.DRAFT && b.status !== INVOICE_STATUS.DRAFT) return -1;
    if (b.status === INVOICE_STATUS.DRAFT && a.status !== INVOICE_STATUS.DRAFT) return 1;
    return (b.number || 0) - (a.number || 0) || (a.updatedAt < b.updatedAt ? 1 : -1);
  });
}

export function getInvoice(id) {
  return getOne(COLLECTIONS.INVOICES, id);
}

/** Shop details frozen onto each invoice (the logo image is excluded to keep records small). */
export function shopSnapshot(settings) {
  const { logoDataUrl, operatorName, ...business } = settings.business;
  return clean({
    business,
    bank: settings.bank,
    terms: settings.invoice.terms,
    footerText: settings.invoice.footerText,
    dateFormat: settings.invoice.dateFormat,
    prefix: settings.invoice.prefix,
  });
}

/** Compute everything for a form using a given tax config. */
export function computeForm(form, taxConfig, shopStateCode) {
  const taxMode = determineTaxMode(shopStateCode, form.placeOfSupplyCode, form.taxModeOverride);
  return calculateInvoice(form.items, taxConfig, taxMode, form.oldMetal);
}

function slimLines(lines) {
  return lines.map(({ errors, valid, ...rest }) => rest);
}

/** Turn a form + computed result into a storable invoice record. */
export function buildRecord(form, { settings, existing = null, status }) {
  const now = new Date().toISOString();
  const shop = existing?.shop && existing.status !== INVOICE_STATUS.DRAFT ? existing.shop : shopSnapshot(settings);
  const taxConfig =
    existing?.taxConfig && existing.status !== INVOICE_STATUS.DRAFT ? existing.taxConfig : clean(settings.tax);
  const computed = computeForm(form, taxConfig, shop.business.stateCode);
  const { lines, valid, taxErrors, ...totals } = computed;

  return clean({
    id: form.id || existing?.id || uid('inv_'),
    number: existing?.number ?? null,
    prefix: existing?.prefix ?? shop.prefix ?? '',
    date: form.date,
    status,
    revision: existing?.revision || 0,
    customerId: form.customerId || null,
    customer: form.customer,
    placeOfSupply: form.placeOfSupply,
    placeOfSupplyCode: form.placeOfSupplyCode,
    taxModeOverride: form.taxModeOverride || 'auto',
    orderReference: form.orderReference || 'No',
    ewayBillDateTime: form.ewayBillDateTime || '',
    notes: form.notes || '',
    oldMetal: form.oldMetal || null,
    items: form.items,
    lines: slimLines(lines),
    totals,
    amountInWords: amountToIndianWords(totals.grossPaise),
    shop,
    taxConfig,
    amountPaidPaise: existing?.amountPaidPaise || 0,
    balancePaise: existing ? Math.max(totals.grossPaise - (existing.amountPaidPaise || 0), 0) : totals.grossPaise,
    paymentStatus: existing?.paymentStatus || PAYMENT_STATUS.UNPAID,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    finalizedAt: existing?.finalizedAt || null,
    cancelledAt: existing?.cancelledAt || null,
    cancelReason: existing?.cancelReason || '',
  });
}

export async function saveDraft(form, settings) {
  const existing = form.id ? await getInvoice(form.id) : null;
  if (existing && existing.status !== INVOICE_STATUS.DRAFT) {
    throw new Error('This invoice is already finalized. Use Edit to revise it.');
  }
  const record = buildRecord(form, { settings, existing, status: INVOICE_STATUS.DRAFT });
  return saveOne(COLLECTIONS.INVOICES, record.id, record);
}

/**
 * Finalize: allocate the next sequential number atomically and save.
 * Idempotent: if this form id was already finalized (double click / retry), the
 * existing invoice is returned and no second number is used.
 */
export async function finalizeInvoice(form, settings, { user = '' } = {}) {
  const existing = form.id ? await getInvoice(form.id) : null;
  if (existing && existing.status !== INVOICE_STATUS.DRAFT) return { invoice: existing, alreadyFinal: true };

  const record = buildRecord(form, { settings, existing, status: INVOICE_STATUS.FINAL });
  record.finalizedAt = record.updatedAt;
  const saved = await createInvoiceWithNumber(record, settings.invoice.startNumber);
  await logAudit({
    entityId: saved.id,
    action: 'finalized',
    details: `Invoice ${saved.invoiceNo} created for ${saved.customer.name}, gross ₹${(saved.totals.grossPaise / 100).toFixed(2)}`,
    user,
  });
  return { invoice: saved, alreadyFinal: false };
}

/** Revise a finalized invoice. The previous version is kept in the audit log. */
export async function reviseInvoice(form, settings, { reason, user = '' }) {
  const existing = await getInvoice(form.id);
  if (!existing) throw new Error('Invoice not found.');
  if (existing.status === INVOICE_STATUS.CANCELLED) throw new Error('Cancelled invoices cannot be edited.');
  if (!String(reason || '').trim()) throw new Error('A reason is required to edit a finalized invoice.');

  const record = buildRecord(form, { settings, existing, status: INVOICE_STATUS.FINAL });
  record.revision = (existing.revision || 0) + 1;
  record.invoiceNo = existing.invoiceNo;
  record.revisedAt = record.updatedAt;
  const saved = await saveOne(COLLECTIONS.INVOICES, record.id, record);
  await logAudit({
    entityId: saved.id,
    action: 'revised',
    reason,
    details: `Revision ${record.revision}: gross ₹${(existing.totals.grossPaise / 100).toFixed(2)} → ₹${(saved.totals.grossPaise / 100).toFixed(2)}`,
    before: existing,
    user,
  });
  return saved;
}

export async function cancelInvoice(invoice, reason, { user = '' } = {}) {
  if (!String(reason || '').trim()) throw new Error('A cancellation reason is required.');
  const now = new Date().toISOString();
  const saved = await saveOne(COLLECTIONS.INVOICES, invoice.id, {
    ...invoice,
    status: INVOICE_STATUS.CANCELLED,
    cancelReason: reason,
    cancelledAt: now,
    updatedAt: now,
  });
  await logAudit({ entityId: invoice.id, action: 'cancelled', reason, user, details: `Invoice ${invoice.invoiceNo} cancelled` });
  return saved;
}

export async function deleteDraft(invoice) {
  if (invoice.status !== INVOICE_STATUS.DRAFT) throw new Error('Only drafts can be deleted.');
  await removeOne(COLLECTIONS.INVOICES, invoice.id);
}

/** Update the paid / balance / status summary after payments change. */
export async function applyPaymentSummary(invoice, summary) {
  return saveOne(COLLECTIONS.INVOICES, invoice.id, {
    ...invoice,
    amountPaidPaise: summary.paidPaise,
    balancePaise: summary.balancePaise,
    paymentStatus: summary.status,
    updatedAt: new Date().toISOString(),
  });
}
