import { initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB-npafdB8Y3FEpQDeIk68UBkRMGJo77Ko",
  authDomain: "remembra-8e791.firebaseapp.com",
  projectId: "remembra-8e791",
  storageBucket: "remembra-8e791.firebasestorage.app",
  messagingSenderId: "200205133502",
  appId: "1:200205133502:web:f25dd31cce173fe0a6a0ef",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Firebase is always configured (hardcoded config)
export const isFirebaseConfigured = true;

// Helper to get current user ID
export const getCurrentUserId = (): string | null => {
  return auth.currentUser?.uid ?? null;
};

// Helper to require authentication
export const requireAuth = (): string => {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('Authentication required');
  }
  return userId;
};
