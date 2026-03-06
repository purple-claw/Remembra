import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const fallbackConfig = {
  apiKey: 'AIzaSyB-npafdB8Y3FEpQDeIk68UBkRMGJo77Ko',
  authDomain: 'remembra-8e791.firebaseapp.com',
  projectId: 'remembra-8e791',
  storageBucket: 'remembra-8e791.firebasestorage.app',
  messagingSenderId: '200205133502',
  appId: '1:200205133502:web:f25dd31cce173fe0a6a0ef',
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || fallbackConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || fallbackConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || fallbackConfig.appId,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every((value) => !!value);

if (!isFirebaseConfigured) {
  console.warn('Firebase is not fully configured. Check VITE_FIREBASE_* environment variables.');
}

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

let authReadyPromise: Promise<void> | null = null;

export const waitForAuthInitialization = async (): Promise<void> => {
  if (auth.currentUser) return;
  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, () => {
        unsubscribe();
        resolve();
      });
    });
  }
  await authReadyPromise;
};

export const getCurrentUserId = async (): Promise<string | null> => {
  const immediateUser = auth.currentUser;
  if (immediateUser) {
    return immediateUser.uid;
  }

  await waitForAuthInitialization();
  const initializedUser = auth.currentUser;
  return initializedUser ? initializedUser.uid : null;
};

export const requireAuth = async (): Promise<string> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('Authentication required');
  }
  return userId;
};
