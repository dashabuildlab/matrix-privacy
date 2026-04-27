'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  setPersistence,
  browserLocalPersistence,
  type User,
  type Auth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _persistenceSet = false;

function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getFirebaseApp());
    if (!_persistenceSet) {
      setPersistence(_auth, browserLocalPersistence).catch(() => {});
      _persistenceSet = true;
    }
  }
  return _auth;
}

export async function registerWithEmail(email: string, password: string) {
  const { user } = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim().toLowerCase(),
    password,
  );
  return user;
}

export async function loginWithEmail(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim().toLowerCase(),
    password,
  );
  return user;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim().toLowerCase());
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const { user } = await signInWithPopup(getFirebaseAuth(), provider);
  return user;
}

export async function signInWithApple() {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  const { user } = await signInWithPopup(getFirebaseAuth(), provider);
  return user;
}

export async function signOut(): Promise<void> {
  try {
    await fbSignOut(getFirebaseAuth());
  } catch {}
}

export function onAuthStateChanged(callback: (u: User | null) => void): () => void {
  try {
    return fbOnAuthStateChanged(getFirebaseAuth(), callback);
  } catch {
    return () => {};
  }
}

export type { User };
