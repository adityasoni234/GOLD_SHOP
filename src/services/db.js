/**
 * Chooses the storage adapter: Firestore when configured, otherwise localStorage demo mode.
 */
import { firebaseReady } from '../firebase/firebase.js';
import * as firestoreAdapter from '../firebase/firestore.js';
import * as localAdapter from './localAdapter.js';

const adapter = firebaseReady ? firestoreAdapter : localAdapter;

export const DATA_MODE = firebaseReady ? 'firebase' : 'demo';
export const COLLECTIONS = firestoreAdapter.COLLECTIONS;

export const listAll = (col) => adapter.listAll(col);
export const getOne = (col, id) => adapter.getOne(col, id);
export const saveOne = (col, id, data) => adapter.saveOne(col, id, data);
export const removeOne = (col, id) => adapter.removeOne(col, id);
export const getCounter = () => adapter.getCounter();
export const createInvoiceWithNumber = (invoice, startNumber) => adapter.createInvoiceWithNumber(invoice, startNumber);

export const exportLocalData = localAdapter.exportAll;
export const importLocalData = localAdapter.importAll;
