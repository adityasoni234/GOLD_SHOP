/**
 * Invoice numbering helpers.
 * Allocation itself happens inside the storage adapter (Firestore transaction or
 * the localStorage adapter) so that numbers are never duplicated.
 */

export function formatInvoiceNumber(number, prefix = '') {
  if (number === null || number === undefined || number === '') return '';
  return `${prefix || ''}${number}`;
}

/**
 * Next number = max(last allocated + 1, configured start, highest existing + 1).
 * Skips any number that already exists.
 */
export function computeNextInvoiceNumber({ lastAllocated = 0, startNumber = 1, existingNumbers = [] }) {
  const existing = new Set(existingNumbers.filter((n) => Number.isInteger(n)));
  const highest = existing.size ? Math.max(...existing) : 0;
  let next = Math.max(Number(lastAllocated) + 1, Number(startNumber) || 1, highest + 1);
  while (existing.has(next)) next += 1;
  return next;
}

export function isInvoiceNumberUnique(number, invoices, ignoreId) {
  return !invoices.some((inv) => inv.number === number && inv.id !== ignoreId);
}
