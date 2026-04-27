// ─────────────────────────────────────────────────────────────────────────────
// Firebase Crashlytics — native only (no JS SDK equivalent)
// ─────────────────────────────────────────────────────────────────────────────

import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

let crashlytics: any = null;
let initialized = false;

export async function initCrashlytics() {
  if (initialized) return;
  initialized = true;

  if (isExpoGo) {
    console.log('[Crashlytics] skipped (Expo Go)');
    return;
  }

  try {
    const mod = require('@react-native-firebase/crashlytics');
    crashlytics = mod.default ?? mod;
    console.log('[Crashlytics] initialized');
  } catch {
    console.log('[Crashlytics] not available');
  }
}

export function setCrashlyticsUser(userId: string | null) {
  if (!crashlytics || !userId) return;
  try {
    crashlytics().setUserId(userId);
  } catch {}
}

export function setCrashlyticsEnabled(enabled: boolean) {
  if (!crashlytics) return;
  try {
    crashlytics().setCrashlyticsCollectionEnabled(enabled);
  } catch {}
}

export function setCrashlyticsAttribute(key: string, value: string) {
  if (!crashlytics) return;
  try {
    crashlytics().setAttribute(key, value);
  } catch {}
}

export function logCrashlyticsMessage(message: string) {
  if (!crashlytics) return;
  try {
    crashlytics().log(message);
  } catch {}
}

export function recordError(error: Error, context?: string) {
  if (!crashlytics) return;
  try {
    if (context) crashlytics().log(context);
    crashlytics().recordError(error);
  } catch {}
}
