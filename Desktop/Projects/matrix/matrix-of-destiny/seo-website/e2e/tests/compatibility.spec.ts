import { test, expect } from '@playwright/test';
import { CompatibilityCalculatorPage } from '../pages/CompatibilityCalculatorPage';
import { TEST_DATES, ROUTES } from '../fixtures/testData';

test.describe('Compatibility Calculator — Happy Path', () => {
  let calcPage: CompatibilityCalculatorPage;

  test.beforeEach(async ({ page }) => {
    calcPage = new CompatibilityCalculatorPage(page);
    await calcPage.open();
  });

  test('page loads with heading and two date inputs', async () => {
    await expect(calcPage.heading).toBeVisible();
    await expect(calcPage.inputPerson1Date).toBeVisible();
    await expect(calcPage.inputPerson2Date).toBeVisible();
    await expect(calcPage.btnCalculate).toBeVisible();
  });

  test('button is disabled on load (both dates empty)', async () => {
    await calcPage.expectButtonDisabled();
  });

  test('button stays disabled with only one date', async () => {
    await calcPage.fillPerson1(TEST_DATES.valid);
    await calcPage.expectButtonDisabled();
  });

  test('button enables when both dates are filled', async () => {
    await calcPage.fillPerson1(TEST_DATES.valid);
    await calcPage.fillPerson2(TEST_DATES.valid2);
    await calcPage.expectButtonEnabled();
  });

  test('happy path: calculates compatibility for two valid dates', async () => {
    await calcPage.calculate(TEST_DATES.valid, TEST_DATES.valid2);
    await calcPage.waitForResult();
    await calcPage.expectResultVisible();
  });

  test('compatibility scores are in range 1–22', async () => {
    await calcPage.calculate(TEST_DATES.valid, TEST_DATES.valid2);
    await calcPage.waitForResult();
    const scores = await calcPage.getCompatibilityScores();
    expect(scores.length).toBeGreaterThan(0);
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(22);
    }
  });

  test('same pair always produces same result', async ({ page }) => {
    await calcPage.calculate(TEST_DATES.valid, TEST_DATES.valid2);
    await calcPage.waitForResult();
    const scores1 = await calcPage.getCompatibilityScores();

    await page.reload();
    await page.waitForLoadState('networkidle');
    await calcPage.calculate(TEST_DATES.valid, TEST_DATES.valid2);
    await calcPage.waitForResult();
    const scores2 = await calcPage.getCompatibilityScores();

    expect(scores1).toEqual(scores2);
  });

  test('self-compatibility: same date for both people', async () => {
    await calcPage.calculate(TEST_DATES.valid, TEST_DATES.valid);
    await calcPage.waitForResult();
    await calcPage.expectResultVisible();
  });

  test('different pairs produce different results', async ({ page }) => {
    await calcPage.calculate(TEST_DATES.valid, TEST_DATES.valid2);
    await calcPage.waitForResult();
    const scores1 = await calcPage.getCompatibilityScores();

    await page.reload();
    await page.waitForLoadState('networkidle');
    await calcPage.calculate('1990-01-01', '2000-12-31');
    await calcPage.waitForResult();
    const scores2 = await calcPage.getCompatibilityScores();

    expect(scores1).not.toEqual(scores2);
  });
});

test.describe('Compatibility Calculator — Validation', () => {
  let calcPage: CompatibilityCalculatorPage;

  test.beforeEach(async ({ page }) => {
    calcPage = new CompatibilityCalculatorPage(page);
    await calcPage.open();
  });

  test('button disabled: no dates', async () => {
    await calcPage.expectButtonDisabled();
  });

  test('button disabled: only first date filled', async () => {
    await calcPage.fillPerson1(TEST_DATES.valid);
    await calcPage.expectButtonDisabled();
  });

  test('button disabled: only second date filled', async () => {
    await calcPage.fillPerson2(TEST_DATES.valid2);
    await calcPage.expectButtonDisabled();
  });

  test('both inputs have max attribute set to today', async () => {
    const today = new Date().toISOString().split('T')[0];
    const max1 = await calcPage.inputPerson1Date.getAttribute('max');
    const max2 = await calcPage.inputPerson2Date.getAttribute('max');
    expect(max1).toBe(today);
    expect(max2).toBe(today);
  });
});

test.describe('Compatibility Calculator — SEO', () => {
  test('page has correct title', async ({ page }) => {
    const calcPage = new CompatibilityCalculatorPage(page);
    await calcPage.open();
    const title = await calcPage.getTitle();
    expect(title).toMatch(/Сумісн/i);
  });

  test('page URL is correct', async ({ page }) => {
    await page.goto(ROUTES.compatibility);
    await expect(page).toHaveURL(/kalkulyator-sumisnosti/);
  });
});

test.describe('Compatibility Calculator — Offline', () => {
  test('calculates offline (client-side, no API)', async ({ page }) => {
    const calcPage = new CompatibilityCalculatorPage(page);
    await calcPage.open();
    await calcPage.goOffline();
    await calcPage.calculate(TEST_DATES.valid, TEST_DATES.valid2);
    await calcPage.waitForResult();
    await calcPage.expectResultVisible();
    await calcPage.goOnline();
  });
});
