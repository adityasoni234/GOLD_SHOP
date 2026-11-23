/**
 * Firestore storage adapter. Same interface as services/localAdapter.js.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { clean } from '../utils/misc.js';

export const COLLECTIONS = Object.freeze({
  INVOICES: 'invoices',
  CUSTOMERS: 'customers',
  PRODUCTS: 'products',
  GOLD_RATES: 'goldRates',
  SILVER_RATES: 'silverRates',
  SETTINGS: 'settings',
  PAYMENTS: 'payments',
  AUDIT_LOGS: 'auditLogs',
});

const COUNTER_DOC = ['settings', 'counters'];

export async function listAll(col) {
  const snap = await getDocs(collection(db, col));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getOne(col, id) {
  const snap = await getDoc(doc(db, col, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveOne(col, id, data) {
  const payload = clean({ ...data, id });
  await setDoc(doc(db, col, id), payload);
  return payload;
}

export async function removeOne(col, id) {
  await deleteDoc(doc(db, col, id));
}

export async function getCounter() {
  const snap = await getDoc(doc(db, ...COUNTER_DOC));
  return snap.exists() ? snap.data().lastInvoiceNumber || 0 : 0;
}

/**
 * Atomically allocate the next invoice number and write the invoice.
 * A reservation document invoiceNumbers/{number} guarantees uniqueness even
 * when several counters/devices bill at the same time.
 */
export async function createInvoiceWithNumber(invoice, startNumber) {
  const counterRef = doc(db, ...COUNTER_DOC);
  return runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const last = counterSnap.exists() ? counterSnap.data().lastInvoiceNumber || 0 : 0;
    let number = Math.max(last + 1, Number(startNumber) || 1);
    const numRef = doc(db, 'invoiceNumbers', String(number));
    const numSnap = await tx.get(numRef);
    if (numSnap.exists()) {
      throw new Error(`Invoice number ${number} is already reserved. Please retry.`);
    }
    const record = clean({ ...invoice, number, invoiceNo: `${invoice.prefix || ''}${number}` });
    tx.set(counterRef, { lastInvoiceNumber: number }, { merge: true });
    tx.set(numRef, { invoiceId: invoice.id, createdAt: invoice.createdAt });
    tx.set(doc(db, COLLECTIONS.INVOICES, invoice.id), record);
    return record;
  });
}
