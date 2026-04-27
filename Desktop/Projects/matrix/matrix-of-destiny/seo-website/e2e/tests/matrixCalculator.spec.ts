import { test, expect } from '@playwright/test';
import { MatrixCalculatorPage } from '../pages/MatrixCalculatorPage';
import { TEST_DATES, ROUTES } from '../fixtures/testData';

test.describe('Matrix Calculator — Happy Path', () => {
  let calcPage: MatrixCalculatorPage;

  test.beforeEach(async ({ page }) => {
    calcPage = new MatrixCalculatorPage(page);
    await calcPage.open();
  });

  test('page loads with heading and date input', async () => {
    await expect(calcPage.heading).toContainText(/Калькулятор.*Матриц/i);
    await expect(calcPage.inputBirthDate).toBeVisible();
    await expect(calcPage.btnCalculate).toBeVisible();
  });

  test('calculate button is disabled on load (empty date)', async () => {
    await calcPage.expectButtonDisabled();
  });

  test('calculate button enables after entering a date', async () => {
    await calcPage.fillBirthDate(TEST_DATES.valid);
    await calcPage.expectButtonEnabled();
  });

  test('happy path: calculates matrix for valid birth date', async () => {
    await calcPage.calculate(TEST_DATES.valid);
    await calcPage.waitForResult();
    await calcPage.expectResultVisible();
  });

  test('calculates matrix for leap year date (2000-02-29)', async () => {
    await calcPage.calculate(TEST_DATES.edgeLeapYear);
    await calcPage.waitForResult();
    await calcPage.expectResultVisible();
  });

  test('matrix numbers are in range 1–22', async () => {
    await calcPage.calculate(TEST_DATES.valid);
    await calcPage.waitForResult();
    const numbers = await calcPage.getEnergyNumbers();
    expect(numbers.length).toBeGreaterThan(0);
    for (const n of numbers) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(22);
    }
  });

  test('same date always produces same matrix numbers', async ({ page }) => {
    await calcPage.calculate(TEST_DATES.valid);
    await calcPage.waitForResult();
    const numbers1 = await calcPage.getEnergyNumbers();

    await page.reload();
    await page.waitForLoadState('networkidle');
    await calcPage.calculate(TEST_DATES.valid);
    await calcPage.waitForResult();
    const numbers2 = await calcPage.getEnergyNumbers();

    expect(numbers1).toEqual(numbers2);
  });

  test('different dates produce different matrices', async ({ page }) => {
    await calcPage.calculate(TEST_DATES.valid);
    await calcPage.waitForResult();
    const numbers1 = await calcPage.getEnergyNumbers();

    await page.reload();
    await page.waitForLoadState('networkidle');
    await calcPage.calculate(TEST_DATES.valid2);
    await calcPage.waitForResult();
    const numbers2 = await calcPage.getEnergyNumbers();

    expect(numbers1).not.toEqual(numbers2);
  });

  test('shows breadcrumb navigation', async () => {
    await calcPage.expectBreadcrumbVisible();
  });
});

test.describe('Matrix Calculator — Validation', () => {
  let calcPage: MatrixCalculatorPage;

  test.beforeEach(async ({ page }) => {
    calcPage = new MatrixCalculatorPage(page);
    await calcPage.open();
  });

  test('button stays disabled without date input', async () => {
    // Native HTML date input prevents submitting empty — button is disabled
    await calcPage.expectButtonDisabled();
  });

  test('button enables for valid date and disables after clearing', async () => {
    await calcPage.fillBirthDate(TEST_DATES.valid);
    await calcPage.expectButtonEnabled();
    // Playwright fill('') triggers React's synthetic onChange
    await calcPage.fillBirthDate('');
    await calcPage.expectButtonDisabled();
  });

  test('browser enforces max date attribute (future dates blocked)', async ({ page }) => {
    // The input has max={today}, so future dates are invalid per HTML spec
    const maxAttr = await calcPage.inputBirthDate.getAttribute('max');
    expect(maxAttr).toBeTruthy();
    const today = new Date().toISOString().split('T')[0];
    expect(maxAttr).toBe(today);
  });
});

test.describe('Matrix Calculator — SEO', () => {
  test('page has correct title', async ({ page }) => {
    const calcPage = new MatrixCalculatorPage(page);
    await calcPage.open();
    const title = await calcPage.getTitle();
    expect(title).toMatch(/Матриц/i);
  });

  test('page has canonical link tag', async ({ page }) => {
    await page.goto(ROUTES.calculator);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain('kalkulyator-matrytsi-doli');
  });

  test('breadcrumb home link href is /uk/', async ({ page }) => {
    const calcPage = new MatrixCalculatorPage(page);
    await calcPage.open();
    const href = await calcPage.breadcrumbHomeLink.getAttribute('href');
    expect(href).toBe('/uk/');
  });

  test('breadcrumb home link navigates to home', async ({ page }) => {
    const calcPage = new MatrixCalculatorPage(page);
    await calcPage.open();
    await calcPage.breadcrumbHomeLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(ROUTES.home);
  });

  test('page has schema.org BreadcrumbList JSON-LD', async ({ page }) => {
    await page.goto(ROUTES.calculator);
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    const hasBreadcrumb = schemas.some((s) => s.includes('BreadcrumbList'));
    expect(hasBreadcrumb).toBe(true);
  });
});

test.describe('Matrix Calculator — Offline', () => {
  test('calculator works offline (client-side calc, no API)', async ({ page }) => {
    const calcPage = new MatrixCalculatorPage(page);
    await calcPage.open();
    // Matrix calc is pure client-side — should work without network
    await calcPage.goOffline();
    await calcPage.calculate(TEST_DATES.valid);
    await calcPage.waitForResult();
    await calcPage.expectResultVisible();
    await calcPage.goOnline();
  });
});
