import { device, by, element, waitFor } from 'detox';
import { LoginScreen } from '../pages/LoginScreen';
import { MatrixScreen } from '../pages/MatrixScreen';
import { PaywallScreen } from '../pages/PaywallScreen';
import { AiChatScreen } from '../pages/AiChatScreen';
import { TEST_USER, TEST_IDS, TIMEOUTS } from '../helpers/testData';

const login = new LoginScreen();
const matrix = new MatrixScreen();
const paywall = new PaywallScreen();
const chat = new AiChatScreen();

async function loginAndGoToMatrix() {
  await login.waitForScreen();
  await login.login(TEST_USER.email, TEST_USER.password);
  await waitFor(element(by.id(TEST_IDS.tabs.tabMatrix))).toBeVisible().withTimeout(TIMEOUTS.medium);
  await element(by.id(TEST_IDS.tabs.tabMatrix)).tap();
  await matrix.waitForScreen();
}

beforeAll(async () => {
  await device.launchApp({ newInstance: true });
});

beforeEach(async () => {
  await device.reloadReactNative();
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe('Matrix Screen — Navigation & Tabs', () => {
  beforeEach(async () => {
    await loginAndGoToMatrix();
  });

  it('matrix screen is accessible via tab', async () => {
    await matrix.expectMatrixVisible();
  });

  it('all 5 tabs are visible', async () => {
    await matrix.expectVisible(matrix.tabIds.tabHome);
    await matrix.expectVisible(matrix.tabIds.tabAi);
    await matrix.expectVisible(matrix.tabIds.tabMatrix);
    await matrix.expectVisible(matrix.tabIds.tabLearn);
    await matrix.expectVisible(matrix.tabIds.tabProfile);
  });

  it('can navigate between tabs', async () => {
    await element(by.id(matrix.tabIds.tabHome)).tap();
    await waitFor(element(by.id(matrix.tabIds.tabHome))).toBeVisible().withTimeout(TIMEOUTS.short);

    await element(by.id(matrix.tabIds.tabMatrix)).tap();
    await matrix.waitForScreen();
  });
});

// ─── Free user (no premium) ───────────────────────────────────────────────────

describe('Matrix Screen — Free user', () => {
  beforeEach(async () => {
    await loginAndGoToMatrix();
  });

  it('shows unlock button for non-premium user', async () => {
    // For a free user, unlock button should be visible
    await matrix.expectUnlockButtonVisible();
  });

  it('tapping unlock opens paywall', async () => {
    await matrix.tapUnlock();
    await paywall.expectVisible();
  });

  it('paywall shows monthly and yearly plans', async () => {
    await matrix.tapUnlock();
    await paywall.expectVisible();
    await paywall.expectPricesVisible();
  });

  it('paywall shows prices with currency', async () => {
    await matrix.tapUnlock();
    await paywall.expectVisible();
    const monthly = await paywall.getMonthlyPrice();
    const yearly = await paywall.getYearlyPrice();
    expect(monthly).toMatch(/\d/);
    expect(yearly).toMatch(/\d/);
  });

  it('can select yearly plan on paywall', async () => {
    await matrix.tapUnlock();
    await paywall.expectVisible();
    await paywall.selectYearlyPlan();
    await paywall.expectVisible();
  });

  it('can close paywall', async () => {
    await matrix.tapUnlock();
    await paywall.expectVisible();
    await paywall.close();
    await matrix.expectMatrixVisible();
  });

  it('tapping compatibility without premium opens paywall', async () => {
    await matrix.tapCompatibility();
    await paywall.expectVisible();
  });

  it('tapping conflict analysis without premium opens paywall', async () => {
    await matrix.tapConflictAnalysis();
    await paywall.expectVisible();
  });
});

// ─── Premium user ─────────────────────────────────────────────────────────────

describe('Matrix Screen — Premium user', () => {
  // These tests require a test account with active premium subscription.
  // Set E2E_PREMIUM_USER_EMAIL and E2E_PREMIUM_USER_PASSWORD in environment.

  it.skip('premium user sees full matrix without unlock button', async () => {
    await login.waitForScreen();
    await login.login(
      process.env.E2E_PREMIUM_USER_EMAIL ?? TEST_USER.email,
      process.env.E2E_PREMIUM_USER_PASSWORD ?? TEST_USER.password,
    );
    await element(by.id(TEST_IDS.tabs.tabMatrix)).tap();
    await matrix.waitForScreen();
    await matrix.expectUnlockButtonNotVisible();
  });

  it.skip('premium user can access compatibility calculator', async () => {
    await loginAndGoToMatrix();
    await matrix.tapCompatibility();
    // Should open compatibility modal, not paywall
    await matrix.waitForText('Сумісність', TIMEOUTS.medium);
  });

  it.skip('premium user can download matrix analysis', async () => {
    await loginAndGoToMatrix();
    await matrix.tapDownload();
    // PDF share sheet should appear
    await waitFor(element(by.text('Зберегти PDF'))).toBeVisible().withTimeout(TIMEOUTS.medium);
  });
});

// ─── AI Recommendations ───────────────────────────────────────────────────────

describe('Matrix Screen — AI Recommendations', () => {
  beforeEach(async () => {
    await loginAndGoToMatrix();
  });

  it('AI recommendations button is visible', async () => {
    await matrix.expectVisible(matrix.ids.btnAiRecommendations);
  });

  it('tapping AI recommendations opens AI chat with context', async () => {
    await matrix.tapAiRecommendations();
    await chat.waitForScreen();
    // Should open AI chat with initial message about matrix
    await chat.expectNotVisible(chat.ids.emptyState);
  });
});

// ─── Restore purchases ────────────────────────────────────────────────────────

describe('Paywall — Restore Purchases', () => {
  beforeEach(async () => {
    await loginAndGoToMatrix();
    await matrix.tapUnlock();
    await paywall.expectVisible();
  });

  it('restore purchases button is visible', async () => {
    await paywall.expectVisible();
    await paywall.expectElementVisible(paywall.ids.btnRestore);
  });

  it('tapping restore triggers RevenueCat restore flow', async () => {
    await paywall.tapRestorePurchases();
    // Should show loading or success/error message
    await paywall.waitForElement(paywall.ids.btnRestore, TIMEOUTS.medium);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('Matrix Screen — Edge Cases', () => {
  beforeEach(async () => {
    await loginAndGoToMatrix();
  });

  it('matrix persists after app reload', async () => {
    await matrix.expectMatrixVisible();
    await device.reloadReactNative();
    await login.waitForScreen();
    await login.login(TEST_USER.email, TEST_USER.password);
    await element(by.id(TEST_IDS.tabs.tabMatrix)).tap();
    await matrix.expectMatrixVisible();
  });

  it('crystal balance is displayed', async () => {
    const balance = await matrix.getCrystalBalance();
    expect(balance).toMatch(/\d+/);
  });
});
