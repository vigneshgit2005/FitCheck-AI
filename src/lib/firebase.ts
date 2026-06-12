// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { getFirestore, type FirestoreError } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBN_6hzDI8lrqFayz1m3Iy8JGtnkHFssZM",
  authDomain: "fitcheckai-504db.firebaseapp.com",
  projectId: "fitcheckai-504db",
  storageBucket: "fitcheckai-504db.firebasestorage.app",
  messagingSenderId: "380684388655",
  appId: "1:380684388655:web:86da14e2be8dd6485439da",
  measurementId: "G-4NKMDCVE74",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics (browser-only)
if (typeof window !== "undefined") {
  try {
    getAnalytics(app);
  } catch {
    // Ignore analytics init failures in unsupported environments
  }
}

// Auth + Firestore exports used across the app
export const auth = getAuth(app);
export const db = getFirestore(app);

export const OperationType = {
  CREATE: "CREATE",
  LIST: "LIST",
  DELETE: "DELETE",
  UPDATE: "UPDATE",
} as const;

export type OperationType = (typeof OperationType)[keyof typeof OperationType];


export function handleFirestoreError(err: unknown, operation: OperationType, path?: string) {
  const e = err as FirestoreError;
  const code = e?.code ? String(e.code) : "unknown";
  const message = e?.message ? String(e.message) : "Unknown error";
  console.error(`Firestore error (${operation})${path ? ` at ${path}` : ""}: ${code} - ${message}`);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
}

export { signOut };

