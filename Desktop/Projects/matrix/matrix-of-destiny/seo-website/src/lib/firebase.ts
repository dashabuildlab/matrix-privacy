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
  setPersistence,
  browserLocalPersistence,
  type User,
  type Auth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCl5ODdkLWUdwLfoLqe1zH4np4zxzb3eWg',
  authDomain: 'matrix-of-destiny-and-tarot.firebaseapp.com',
  projectId: 'matrix-of-destiny-and-tarot',
  storageBucket: 'matrix-of-destiny-and-tarot.firebasestorage.app',
  messagingSenderId: '113578995852',
  appId: '1:113578995852:web:6cc1368ee5b89e58ef0ba9',
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
