/**
 * Firebase bootstrap.
 *
 * Credentials come ONLY from Vite env variables (.env.local, never committed).
 * If they are missing, the app runs in demo mode on localStorage and this module
 * exports nulls - nothing here throws.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const env = import.meta.env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
export const requireAuth = isFirebaseConfigured && String(env.VITE_FIREBASE_REQUIRE_AUTH).toLowerCase() === 'true';

let app = null;
let db = null;
let auth = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (err) {
    // Fall back to demo mode rather than crash the UI.
    console.error('Firebase initialisation failed; running in demo mode.', err);
    app = null;
    db = null;
    auth = null;
  }
}

export { app, db, auth };
export const firebaseReady = Boolean(db);
