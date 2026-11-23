import { listAll, saveOne, removeOne, COLLECTIONS } from './db.js';
import { uid } from '../utils/misc.js';

export const EMPTY_PRODUCT = {
  name: '',
  category: 'Necklace',
  hsn: '7113',
  huid: '',
  metal: 'Gold',
  purity: '22K',
  makingType: 'percent',
  makingValue: '',
  additionalType: 'fixed',
  additionalValue: '',
  description: '',
};

export async function listProducts() {
  const all = await listAll(COLLECTIONS.PRODUCTS);
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveProduct(product) {
  const now = new Date().toISOString();
  const id = product.id || uid('prd_');
  return saveOne(COLLECTIONS.PRODUCTS, id, {
    ...EMPTY_PRODUCT,
    ...product,
    createdAt: product.createdAt || now,
    updatedAt: now,
  });
}

export async function deleteProduct(id) {
  return removeOne(COLLECTIONS.PRODUCTS, id);
}
