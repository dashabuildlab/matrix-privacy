/**
 * Firebase Authentication wrapper
 * Uses @react-native-firebase/auth (native SDK — consistent with analytics/crashlytics)
 * Lazy-loaded to avoid RNFBAppModule not found error in Expo Go
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

const isExpoGo = Constants.appOwnership === 'expo';

// ── Lazy auth getter ──────────────────────────────────────────────────────────

let _auth: typeof import('@react-native-firebase/auth').default | null = null;

function getAuth() {
  if (isExpoGo || Platform.OS === 'web') {
    throw new Error('Firebase Auth is not available in Expo Go or web');
  }
  if (!_auth) {
    _auth = require('@react-native-firebase/auth').default;
  }
  return _auth!;
}

// ── Google Sign-In config (lazy) ──────────────────────────────────────────────

let googleSigninConfigured = false;

function getGoogleSignin() {
  if (isExpoGo || Platform.OS === 'web') {
    throw new Error('Google Sign-In is not available in Expo Go');
  }
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  if (!googleSigninConfigured) {
    GoogleSignin.configure({
      webClientId: '113578995852-q3q4pvclfgctr8sgeof3olblm7tchhve.apps.googleusercontent.com',
      iosClientId: '149808950885-05t7pen074j9iv2fmf8l1rv52fpklgln.apps.googleusercontent.com',
      offlineAccess: false,
    });
    googleSigninConfigured = true;
  }
  return GoogleSignin;
}

// ── Email / Password ──────────────────────────────────────────────────────────

export async function registerWithEmail(
  email: string,
  password: string,
): Promise<FirebaseAuthTypes.User> {
  const auth = getAuth();
  const { user } = await auth().createUserWithEmailAndPassword(email.trim().toLowerCase(), password);
  return user;
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<FirebaseAuthTypes.User> {
  const auth = getAuth();
  const { user } = await auth().signInWithEmailAndPassword(email.trim().toLowerCase(), password);
  return user;
}

/** Sends a password-reset email. Returns true on success. */
export async function sendPasswordReset(email: string): Promise<void> {
  const auth = getAuth();
  await auth().sendPasswordResetEmail(email.trim().toLowerCase());
}

// ── Google Sign-In ────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<FirebaseAuthTypes.User> {
  const auth = getAuth();
  const GoogleSignin = getGoogleSignin();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const signInResult = await GoogleSignin.signIn();
  const idToken = signInResult.data?.idToken ?? (signInResult as any).idToken;
  if (!idToken) throw new Error('Google Sign-In: no idToken');
  const credential = (auth as any).GoogleAuthProvider.credential(idToken);
  const { user } = await auth().signInWithCredential(credential);
  return user;
}

// ── Apple Sign-In (iOS only) ──────────────────────────────────────────────────

export async function signInWithApple(): Promise<FirebaseAuthTypes.User> {
  if (Platform.OS !== 'ios') throw new Error('Apple Sign-In is only available on iOS');
  const auth = getAuth();
  const AppleAuthentication = require('expo-apple-authentication');
  const Crypto = require('expo-crypto');

  // Generate a cryptographically secure raw nonce; Apple receives the SHA256 hash,
  // Firebase receives the raw value so it can verify the hash server-side.
  const rawNonce = Crypto.randomUUID() as string;
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  ) as string;

  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });
  const { identityToken } = appleCredential;
  if (!identityToken) throw new Error('Apple Sign-In: no identityToken');
  const credential = (auth as any).AppleAuthProvider.credential(identityToken, rawNonce);
  const { user } = await auth().signInWithCredential(credential);
  return user;
}

// ── Session ───────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  if (isExpoGo || Platform.OS === 'web') return;
  try {
    const auth = getAuth();
    await auth().signOut();
  } catch {}
}

export function getCurrentUser(): FirebaseAuthTypes.User | null {
  if (isExpoGo || Platform.OS === 'web') return null;
  try {
    return getAuth()().currentUser;
  } catch {
    return null;
  }
}

/** Get current user's Firebase ID token for API requests. */
export async function getIdToken(): Promise<string | null> {
  if (isExpoGo || Platform.OS === 'web') return null;
  try {
    const user = getAuth()().currentUser;
    if (!user) return null;
    return user.getIdToken();
  } catch {
    return null;
  }
}

/** Subscribe to auth state changes. Returns unsubscribe function. */
export function onAuthStateChanged(
  callback: (user: FirebaseAuthTypes.User | null) => void,
): () => void {
  if (isExpoGo || Platform.OS === 'web') {
    // No-op in Expo Go — return empty unsubscribe
    return () => {};
  }
  try {
    return getAuth()().onAuthStateChanged(callback);
  } catch {
    return () => {};
  }
}

// ── Error helpers ─────────────────────────────────────────────────────────────

export function getAuthErrorMessage(code: string, isUk: boolean): string {
  const msgs: Record<string, { uk: string; en: string }> = {
    'auth/email-already-in-use':          { uk: 'Ця пошта вже зареєстрована',              en: 'This email is already registered' },
    'auth/invalid-email':                 { uk: 'Невірний формат email',                   en: 'Invalid email format' },
    'auth/weak-password':                 { uk: 'Пароль занадто слабкий (мін. 6 символів)', en: 'Password too weak (min. 6 chars)' },
    'auth/user-not-found':                { uk: 'Акаунт з такою поштою не знайдено',        en: 'No account found with this email' },
    'auth/wrong-password':                { uk: 'Невірний пароль',                          en: 'Incorrect password' },
    'auth/invalid-credential':            { uk: 'Невірний email або пароль',                en: 'Invalid email or password' },
    'auth/too-many-requests':             { uk: 'Забагато спроб. Спробуйте пізніше',        en: 'Too many attempts. Try again later' },
    'auth/network-request-failed':        { uk: 'Немає з\'єднання з інтернетом',            en: 'No internet connection' },
    'auth/user-disabled':                 { uk: 'Акаунт заблоковано',                       en: 'Account has been disabled' },
    'auth/operation-not-allowed':         { uk: 'Вхід через email/пароль не підтримується', en: 'Email/password sign-in is not enabled' },
    'auth/account-exists-with-different-credential': { uk: 'Ця пошта вже прив\'язана до іншого методу входу', en: 'This email is linked to a different sign-in method' },
    'auth/requires-recent-login':         { uk: 'Будь ласка, увійдіть знову',               en: 'Please sign in again to continue' },
    'auth/popup-closed-by-user':          { uk: 'Вікно входу було закрито',                  en: 'Sign-in window was closed' },
    'auth/cancelled-popup-request':       { uk: 'Запит скасовано',                           en: 'Request was cancelled' },
    'auth/expired-action-code':           { uk: 'Посилання застаріло',                        en: 'Link has expired' },
    'auth/invalid-action-code':           { uk: 'Невірне посилання',                          en: 'Invalid link' },
    'auth/missing-email':                 { uk: 'Введіть email',                              en: 'Please enter an email' },
    'auth/quota-exceeded':                { uk: 'Перевищено ліміт запитів',                  en: 'Request quota exceeded' },
    'auth/app-not-authorized':            { uk: 'Додаток не авторизований',                  en: 'App not authorized for Firebase' },
    'auth/invalid-api-key':               { uk: 'Помилка конфігурації',                      en: 'Configuration error' },
    'auth/internal-error':                { uk: 'Внутрішня помилка. Спробуйте ще раз.',      en: 'Internal error. Please try again.' },
  };
  const found = msgs[code];
  if (found) return isUk ? found.uk : found.en;
  // Include code in message to help diagnose unexpected errors
  const suffix = code ? ` (${code})` : '';
  return isUk
    ? `Щось пішло не так. Спробуйте ще раз.${suffix}`
    : `Something went wrong. Please try again.${suffix}`;
}
