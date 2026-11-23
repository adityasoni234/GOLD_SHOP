import { listAll, saveOne, removeOne, COLLECTIONS } from './db.js';
import { uid } from '../utils/misc.js';

export const EMPTY_CUSTOMER = {
  name: '',
  phone: '',
  address: '',
  city: '',
  state: 'Rajasthan',
  stateCode: '08',
  pin: '',
  gstin: '',
  panAadhaar: '',
};

export async function listCustomers() {
  const all = await listAll(COLLECTIONS.CUSTOMERS);
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveCustomer(customer) {
  const now = new Date().toISOString();
  const id = customer.id || uid('cus_');
  return saveOne(COLLECTIONS.CUSTOMERS, id, {
    ...EMPTY_CUSTOMER,
    ...customer,
    name: String(customer.name || '').trim(),
    gstin: String(customer.gstin || '').trim().toUpperCase(),
    createdAt: customer.createdAt || now,
    updatedAt: now,
  });
}

export async function deleteCustomer(id) {
  return removeOne(COLLECTIONS.CUSTOMERS, id);
}

/**
 * Find an existing customer by id, or by phone (preferred) / exact name, else create one.
 * Used when an invoice is finalised so that every invoice is linked to a customer record.
 */
export async function upsertCustomerFromInvoice(snapshot, customers) {
  const phone = String(snapshot.phone || '').replace(/\D/g, '');
  let existing = snapshot.id ? customers.find((c) => c.id === snapshot.id) : null;
  if (!existing && phone) existing = customers.find((c) => String(c.phone || '').replace(/\D/g, '') === phone);
  if (!existing)
    existing = customers.find(
      (c) => !c.phone && !phone && c.name.trim().toLowerCase() === String(snapshot.name).trim().toLowerCase(),
    );
  const { id: _ignored, ...fields } = snapshot;
  return saveCustomer({ ...(existing || {}), ...fields, id: existing?.id });
}
