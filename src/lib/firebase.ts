// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { getFirestore, type FirestoreError } from "firebase/firestore";

// Firebase config is expected to be provided via Vite env vars at build time.
// Using env vars avoids committing real credentials into git.
function getRequiredEnv(name: string): string {
  const v = (import.meta as any)?.env?.[name] as string | undefined;
  if (!v || typeof v !== "string") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

const firebaseConfig = {
  apiKey: getRequiredEnv("VITE_FIREBASE_API_KEY"),
  authDomain: getRequiredEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getRequiredEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getRequiredEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getRequiredEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getRequiredEnv("VITE_FIREBASE_APP_ID"),
  measurementId: getRequiredEnv("VITE_FIREBASE_MEASUREMENT_ID"),
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

