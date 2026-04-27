// ─────────────────────────────────────────────────────────────────────────────
// RevenueCat Purchases — wraps react-native-purchases for iOS/Android
// Falls back to mock in Expo Go where native module is unavailable
// ─────────────────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAppStore } from '@/stores/useAppStore';
import { recordError } from '@/lib/crashlytics';

const isExpoGo = Constants.appOwnership === 'expo';

const REVENUECAT_IOS_KEY = 'appl_hJrxoQgGEcZqkGfSrtEKvYjgcFb';
const REVENUECAT_ANDROID_KEY = 'goog_VQRGrDajmesTXEdvwCYKEuuCGyJ';

let Purchases: any = null;
let initialized = false;

// ── Init ────────────────────────────────────────────────────────────────────

export async function initPurchases(): Promise<boolean> {
  if (initialized) return !!Purchases;
  if (isExpoGo || Platform.OS === 'web') {
    console.log('[Purchases] Skipped — Expo Go or web');
    initialized = true;
    return false;
  }

  try {
    const mod = require('react-native-purchases');
    Purchases = mod.default ?? mod;

    const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
    if (!apiKey) {
      console.warn('[Purchases] No API key for platform:', Platform.OS);
      initialized = true;
      return false;
    }

    await Purchases.configure({ apiKey });

    // Sync user ID with RevenueCat
    const userId = useAppStore.getState().userId;
    if (userId) {
      await Purchases.logIn(userId).catch(() => {});
    }

    console.log('[Purchases] Initialized for', Platform.OS);
    initialized = true;
    return true;
  } catch (e) {
    console.warn('[Purchases] Init failed:', e);
    initialized = true;
    return false;
  }
}

export function isRevenueCatAvailable(): boolean {
  return !!Purchases && initialized;
}

/** Call after login / register to link Firebase UID to RevenueCat.
 *  Without this, purchase restore & attribution break for users who authenticate
 *  after the initial app launch. */
export async function syncPurchasesUser(userId: string): Promise<void> {
  if (!Purchases) return;
  try {
    await Purchases.logIn(userId);
  } catch (e) {
    console.warn('[Purchases] logIn failed:', e);
  }
}

// ── Offerings ───────────────────────────────────────────────────────────────

export interface PlanPackage {
  identifier: string;
  planType: 'weekly' | 'monthly' | 'yearly';
  price: string;        // Localized price string e.g. "$9.99"
  priceNumber: number;  // Raw number e.g. 9.99
  currencyCode: string;
  title: string;
  rcPackage: any;       // Original RevenueCat package object
}

export async function getOfferings(): Promise<PlanPackage[]> {
  if (!Purchases) return [];
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return [];

    const packages: PlanPackage[] = [];
    const pkgs = current.availablePackages ?? [];

    for (const pkg of pkgs) {
      const product = pkg.product;
      let planType: 'weekly' | 'monthly' | 'yearly' | null = null;

      // Determine plan type from RC package identifier ($rc_weekly, $rc_monthly, $rc_annual)
      const pType = pkg.packageType;
      const pkgId = pkg.identifier ?? '';
      if (pType === 'WEEKLY' || pkgId === '$rc_weekly' || product.identifier?.includes('weekly')) planType = 'weekly';
      else if (pType === 'MONTHLY' || pkgId === '$rc_monthly' || product.identifier?.includes('monthly')) planType = 'monthly';
      else if (pType === 'ANNUAL' || pkgId === '$rc_annual' || product.identifier?.includes('yearly') || product.identifier?.includes('annual')) planType = 'yearly';

      if (planType) {
        packages.push({
          identifier: product.identifier,
          planType,
          // Use RevenueCat's localised price string (already has correct currency symbol)
          // Fall back to raw price with dollar sign only if unavailable
          price: product.priceString ?? `$${(product.price ?? 0).toFixed(2)}`,
          priceNumber: product.price ?? 0,
          currencyCode: product.currencyCode ?? 'USD',
          title: product.title ?? planType,
          rcPackage: pkg,
        });
      }
    }

    return packages;
  } catch (e) {
    console.warn('[Purchases] getOfferings error:', e);
    return [];
  }
}

// ── Purchase ────────────────────────────────────────────────────────────────

export interface PurchaseResult {
  success: boolean;
  plan?: 'weekly' | 'monthly' | 'yearly';
  cancelled?: boolean;
  error?: string;
}

export async function purchasePackage(pkg: PlanPackage): Promise<PurchaseResult> {
  if (!Purchases) return { success: false, error: 'RevenueCat not available' };

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg.rcPackage);
    const isActive = checkEntitlements(customerInfo);

    if (isActive) {
      // Update app state
      useAppStore.getState().setPremium(true, pkg.planType);
      return { success: true, plan: pkg.planType };
    }

    // Payment succeeded on store level but entitlement not yet active —
    // try restore once before giving up (RC may need a moment to process)
    console.warn('[Purchases] Entitlement not active right after purchase — trying restore');
    await new Promise(r => setTimeout(r, 2000)); // give RC 2s to process
    try {
      const restored = await Purchases.restorePurchases();
      if (checkEntitlements(restored)) {
        const plan = detectPlanFromEntitlements(restored) ?? pkg.planType;
        useAppStore.getState().setPremium(true, plan);
        return { success: true, plan };
      }
    } catch {}

    return { success: false, error: 'entitlement_not_active' };
  } catch (e: any) {
    if (e.userCancelled) {
      return { success: false, cancelled: true };
    }
    console.warn('[Purchases] Purchase error:', e.message);
    recordError(e instanceof Error ? e : new Error(String(e.message)), 'purchase');
    return { success: false, error: e.message ?? 'Purchase failed' };
  }
}

// ── Restore ─────────────────────────────────────────────────────────────────

export async function restorePurchases(): Promise<PurchaseResult> {
  if (!Purchases) return { success: false, error: 'RevenueCat not available' };

  try {
    const customerInfo = await Purchases.restorePurchases();
    const isActive = checkEntitlements(customerInfo);

    if (isActive) {
      const plan = detectPlanFromEntitlements(customerInfo) ?? undefined;
      useAppStore.getState().setPremium(true, plan);
      return { success: true, plan };
    }

    return { success: false, error: 'No active subscription found' };
  } catch (e: any) {
    console.warn('[Purchases] Restore error:', e.message);
    recordError(e instanceof Error ? e : new Error(String(e.message)), 'restore_purchase');
    return { success: false, error: e.message ?? 'Restore failed' };
  }
}

// ── Check Status ────────────────────────────────────────────────────────────

export async function checkSubscriptionStatus(): Promise<boolean> {
  if (!Purchases) return false;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isActive = checkEntitlements(customerInfo);

    if (isActive) {
      const plan = detectPlanFromEntitlements(customerInfo) ?? undefined;
      useAppStore.getState().setPremium(true, plan);
    } else {
      // Only downgrade if store says premium but RevenueCat says no
      if (useAppStore.getState().isPremium) {
        useAppStore.getState().setPremium(false);
      }
    }

    return isActive;
  } catch (e) {
    console.warn('[Purchases] Check status error:', e);
    return false;
  }
}

// ── Listener ────────────────────────────────────────────────────────────────

export function addCustomerInfoListener() {
  if (!Purchases) return;
  try {
    Purchases.addCustomerInfoUpdateListener((info: any) => {
      const isActive = checkEntitlements(info);
      const plan = isActive ? detectPlanFromEntitlements(info) : null;
      useAppStore.getState().setPremium(isActive, plan ?? undefined);
    });
  } catch {}
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ENTITLEMENT_ID = 'premium'; // Must match RevenueCat dashboard

function checkEntitlements(customerInfo: any): boolean {
  if (!customerInfo?.entitlements?.active) return false;
  return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
}

function detectPlanFromEntitlements(customerInfo: any): 'weekly' | 'monthly' | 'yearly' | null {
  const active = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
  if (!active) return null;

  const productId = active.productIdentifier ?? '';
  if (productId.includes('weekly')) return 'weekly';
  if (productId.includes('monthly')) return 'monthly';
  if (productId.includes('yearly') || productId.includes('annual')) return 'yearly';
  return 'monthly'; // fallback
}
