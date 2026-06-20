import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  type Auth,
} from "firebase/auth";
import { initializeFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** True when all required Firebase keys are present. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

/**
 * When the keys are missing we run in DEMO mode. We must NOT call
 * getAuth()/getFirestore() in that case — they throw "auth/invalid-api-key"
 * at import time and crash the app to a blank screen. So everything below is
 * initialised only when configured; in demo mode the data layer routes to the
 * in-memory backend instead (see src/lib/demo/backend.ts).
 */
let app: FirebaseApp | undefined;
let auth = undefined as unknown as Auth;
let db = undefined as unknown as Firestore;
let googleProvider = undefined as unknown as GoogleAuthProvider;

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  // ignoreUndefinedProperties lets us pass optional fields as `undefined`
  // (e.g. an unset meetLink or phone) without Firestore throwing.
  db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });
  setPersistence(auth, browserLocalPersistence).catch(() => {
    /* non-fatal */
  });
}

export { auth, db, googleProvider };
export default app;
