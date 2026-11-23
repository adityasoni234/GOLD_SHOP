/**
 * Payments are stored in their own collection, linked by invoiceId.
 * Recording a payment never changes an invoice's GST calculation; it only
 * updates the invoice's paid/balance/status summary.
 */
import { listAll, saveOne, removeOne, COLLECTIONS } from './db.js';
import { uid } from '../utils/misc.js';
import { PAYMENT_STATUS } from '../constants/index.js';

export async function listPayments() {
  const all = await listAll(COLLECTIONS.PAYMENTS);
  return all.sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1));
}

/** payment: { invoiceId, invoiceNumber, customerName, date, mode, amountPaise, reference, note } */
export async function savePayment(payment) {
  const id = payment.id || uid('pay_');
  return saveOne(COLLECTIONS.PAYMENTS, id, {
    ...payment,
    createdAt: payment.createdAt || new Date().toISOString(),
  });
}

export async function deletePayment(id) {
  return removeOne(COLLECTIONS.PAYMENTS, id);
}

export function paymentStatusFor(grossPaise, paidPaise) {
  if (paidPaise <= 0) return PAYMENT_STATUS.UNPAID;
  if (paidPaise >= grossPaise) return PAYMENT_STATUS.PAID;
  return PAYMENT_STATUS.PARTIAL;
}

export function summarisePayments(grossPaise, payments) {
  const paidPaise = payments.reduce((a, p) => a + (p.amountPaise || 0), 0);
  return {
    paidPaise,
    balancePaise: Math.max(grossPaise - paidPaise, 0),
    excessPaise: Math.max(paidPaise - grossPaise, 0),
    status: paymentStatusFor(grossPaise, paidPaise),
  };
}
