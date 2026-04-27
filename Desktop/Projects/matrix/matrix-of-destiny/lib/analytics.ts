// ─────────────────────────────────────────────────────────────────────────────
// Firebase Analytics — native SDK only
// ─────────────────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

let analytics: any = null;
let initialized = false;

// ── Init ────────────────────────────────────────────────────────────────────

export async function initAnalytics() {
  if (initialized) return;
  initialized = true;

  if (isExpoGo || Platform.OS === 'web') {
    console.log('[Analytics] skipped (Expo Go or web)');
    return;
  }

  try {
    const mod = require('@react-native-firebase/analytics');
    analytics = mod.default ?? mod;
    console.log('[Analytics] initialized: native');
  } catch {
    console.log('[Analytics] not available');
  }
}

function track(event: string, params?: Record<string, any>) {
  if (!analytics) return;
  try {
    analytics().logEvent(event, params);
  } catch {}
}

// ── User Properties ─────────────────────────────────────────────────────────

export function setAnalyticsUser(userId: string | null) {
  if (!analytics || !userId) return;
  try {
    analytics().setUserId(userId);
  } catch {}
}

export function updateUserProperties(props: {
  premium_status?: boolean;
  crystal_balance?: number;
  user_level?: number;
  zodiac_sign?: string;
  app_language?: string;
}) {
  if (!analytics) return;
  try {
    const data: Record<string, string> = {
      premium_status: String(props.premium_status ?? false),
      crystal_balance: String(props.crystal_balance ?? 0),
      user_level: String(props.user_level ?? 1),
    };
    if (props.zodiac_sign) data.zodiac_sign = props.zodiac_sign;
    if (props.app_language) data.app_language = props.app_language;

    const a = analytics();
    Object.entries(data).forEach(([k, v]) => a.setUserProperty(k, v));
  } catch {}
}

// ── Zodiac helper ───────────────────────────────────────────────────────────

export function getZodiacSign(birthDate: string): string {
  const [y, m, d] = birthDate.split('-').map(Number);
  if (!m || !d) return 'unknown';
  const signs = [
    [20, 'aquarius'], [19, 'pisces'], [20, 'aries'], [20, 'taurus'],
    [21, 'gemini'], [21, 'cancer'], [22, 'leo'], [23, 'virgo'],
    [23, 'libra'], [22, 'scorpio'], [22, 'sagittarius'], [22, 'capricorn'],
  ];
  return d < (signs[m - 1][0] as number) ? signs[(m + 10) % 12][1] as string : signs[m - 1][1] as string;
}

// ═════════════════════════════════════════════════════════════════════════════
// APP OPEN
// ═════════════════════════════════════════════════════════════════════════════

export function trackAppOpen(language: string, openSource: 'organic' | 'push' = 'organic', isFirstOpen: boolean = false, appVersion: string = '1.0.0') {
  track('app_open', { language, open_source: openSource, is_first_open: String(isFirstOpen), app_version: appVersion });
}

// ═════════════════════════════════════════════════════════════════════════════
// ONBOARDING (granular per-screen)
// ═════════════════════════════════════════════════════════════════════════════

// General
export function trackOnboardingStart() { track('onboarding_start'); }
export function trackOnboardingComplete(variant: string, durationSec: number) {
  track('onboarding_completed', { variant, duration_sec: durationSec });
}

// Splash
export function trackSplashShown() { track('splash_shown'); }

// Welcome
export function trackWelcomeShown() { track('welcome_shown'); }
export function trackWelcomeContinue() { track('welcome_continue_tapped'); }
export function trackWelcomeSignIn() { track('welcome_signin_tapped'); }

// Intent
export function trackIntentScreenShown() { track('intent_screen_shown'); }
export function trackIntentSelected(intentType: string) { track('intent_selected', { intent_type: intentType }); }
export function trackIntentContinue() { track('intent_continue_tapped'); }

// Focus
export function trackFocusScreenShown() { track('focus_screen_shown'); }
export function trackFocusSelected(focusType: string) { track('focus_selected', { focus_type: focusType }); }
export function trackFocusSkipped() { track('focus_skipped'); }
export function trackFocusContinue() { track('focus_continue_tapped'); }

// DOB
export function trackDobScreenShown() { track('dob_screen_shown'); }
export function trackDobSelected(ageBucket: string) { track('dob_selected', { age_bucket: ageBucket }); }
export function trackDobContinue() { track('dob_continue_tapped'); }

// Generating
export function trackMatrixGenerationStarted() { track('matrix_generation_started'); }
export function trackMatrixGenerationCompleted() { track('matrix_generation_completed'); }
export function trackMatrixGenerationDuration(durationMs: number) { track('matrix_generation_duration', { duration_ms: durationMs }); }
export function trackMatrixGenerationFailed() { track('matrix_generation_failed'); }

// Aha Teaser
export function trackAhaScreenShown() { track('aha_screen_shown'); }
export function trackAhaCardImpression() { track('aha_card_impression'); }
export function trackAhaCtaTapped(timeSpentSec?: number) {
  track('aha_cta_tapped', { ...(timeSpentSec !== undefined ? { time_spent_sec: timeSpentSec } : {}) });
}
export function trackAhaTimeSpent(seconds: number) { track('aha_time_spent', { seconds }); }

// ═════════════════════════════════════════════════════════════════════════════
// PAYWALL
// ═════════════════════════════════════════════════════════════════════════════

export function trackPaywallShown(opts: { paywall_id?: string; placement?: string; experiment_id?: string } = {}) {
  track('paywall_shown', {
    paywall_id: opts.paywall_id ?? 'pw_01',
    placement: opts.placement ?? 'main',
    ...(opts.experiment_id ? { experiment_id: opts.experiment_id } : {}),
  });
}

export function trackPaywallCtaTapped(productId: string, placement: string, timeSpentSec?: number) {
  track('paywall_cta_tapped', { product_id: productId, placement, ...(timeSpentSec !== undefined ? { time_spent_sec: timeSpentSec } : {}) });
}

export function trackPaywallDismissed(productId?: string, timeSpentSec?: number) {
  track('paywall_dismissed', { product_id: productId ?? 'none', ...(timeSpentSec !== undefined ? { time_spent_sec: timeSpentSec } : {}) });
}

// subscription_renewed, subscription_canceled, subscription_expired, trial_converted
// — handled by RevenueCat, not tracked in our code

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE USED (unified — covers ALL app features)
// access_type: 'free' | 'premium' | 'gift'
// ═════════════════════════════════════════════════════════════════════════════

export type AccessType = 'free' | 'premium' | 'gift';

export function trackFeatureUsed(featureName: string, sourceScreen: string, accessType: AccessType = 'free') {
  track('feature_used', {
    feature_name: featureName,
    source_screen: sourceScreen,
    access_type: accessType,
  });
}

// Feature name constants for consistency
export const FEATURES = {
  DAILY_MATRIX: 'daily_matrix',
  COMPATIBILITY: 'compatibility',
  AI_CHAT: 'ai_chat',
  AI_CONFLICT: 'ai_conflict',
  MEDITATION: 'meditation',
  DAILY_CARD: 'daily_card',
  MATRIX_CREATE: 'matrix_create',
  MATRIX_VIEW: 'matrix_view',
  ENCYCLOPEDIA: 'encyclopedia',
  QUIZ: 'quiz',
  GUESS_GAME: 'guess_game',
  MATCH_GAME: 'match_game',
  MEMORY_GAME: 'memory_game',
  TRUEFALSE_GAME: 'truefalse_game',
  HISTORY: 'history_opened',
  PDF_ANALYSIS: 'pdf_analysis',
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ═════════════════════════════════════════════════════════════════════════════

export function trackPushPermissionPrompt() { track('push_permission_prompt'); }
export function trackPushPermissionResult(result: 'granted' | 'denied') {
  track('push_permission_result', { result });
}
export function trackNotificationOpen(pushId?: string, pushType?: string) {
  track('notification_open', { push_id: pushId ?? 'unknown', push_type: pushType ?? 'unknown' });
}

// Push gift flow
export function trackPushLandingView(pushId: string) { track('push_landing_view', { push_id: pushId }); }
export function trackPushClaimTap() { track('push_claim_tap'); }
export function trackPushClaimSuccess(actionType: string) { track('push_claim_success', { action_type: actionType }); }
export function trackPushClaimFailed(error: string) { track('push_claim_failed', { error_code: error }); }
export function trackPushExpiredView(pushId: string) { track('push_expired_view', { push_id: pushId }); }

// ═════════════════════════════════════════════════════════════════════════════
// AI TECHNICAL (monitoring — not feature usage)
// ═════════════════════════════════════════════════════════════════════════════

export function trackAiError(errorType: string) { track('ai_error', { error_type: errorType }); }
export function trackAiLatency(durationMs: number, feature: string) { track('ai_latency', { duration_ms: durationMs, feature }); }

// ═════════════════════════════════════════════════════════════════════════════
// ECONOMY (virtual currency)
// ═════════════════════════════════════════════════════════════════════════════

export function trackSpendCurrency(itemName: string, value: number) {
  track('spend_virtual_currency', { item_name: itemName, value, virtual_currency_name: 'crystals' });
}
export function trackEarnCurrency(source: string, value: number) {
  track('earn_virtual_currency', { source, value, virtual_currency_name: 'crystals' });
}

// ═════════════════════════════════════════════════════════════════════════════
// GAMIFICATION
// ═════════════════════════════════════════════════════════════════════════════

export function trackLevelUp(level: number) { track('level_up', { level }); }
export function trackAchievementUnlocked(id: string, title: string) {
  track('achievement_unlocked', { achievement_id: id, achievement_title: title });
}
export function trackStreakUpdate(count: number) { track('streak_update', { streak_count: count }); }

// ═════════════════════════════════════════════════════════════════════════════
// ACCOUNT
// ═════════════════════════════════════════════════════════════════════════════

export function trackAccountSwitch(fromUserId: string, toUserId: string) {
  track('account_switch', { from_user_id: fromUserId, to_user_id: toUserId });
}
export function trackAccountDelete(userId: string, premiumStatus: boolean) {
  track('account_delete', { user_id: userId, premium_status: String(premiumStatus) });
}
