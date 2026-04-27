import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { ROUTES } from '../fixtures/testData';

export class MatrixCalculatorPage extends BasePage {
  readonly heading: Locator;
  readonly inputBirthDate: Locator;
  readonly btnCalculate: Locator;
  readonly resultBlock: Locator;
  readonly energyBadges: Locator;
  readonly breadcrumbNav: Locator;
  readonly breadcrumbHomeLink: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1 });
    // Single type="date" input — requires YYYY-MM-DD format
    this.inputBirthDate = page.locator('input[type="date"]').first();
    this.btnCalculate = page.locator('button.btn-primary').first();
    // Result appears after calculation
    this.resultBlock = page.locator('div.animate-\\[fadeIn_0\\.5s_ease\\]').first();
    // .energy-badge elements contain the arcana numbers
    this.energyBadges = page.locator('.energy-badge');
    // Breadcrumb is inside <section> (not the header nav)
    this.breadcrumbNav = page.locator('section nav').filter({ hasText: 'Калькулятор Матриці Долі' });
    this.breadcrumbHomeLink = this.breadcrumbNav.locator('a[href="/uk/"]');
  }

  async open() {
    await this.navigate(ROUTES.calculator);
  }

  async fillBirthDate(dateISO: string) {
    await this.inputBirthDate.fill(dateISO);
  }

  async calculate(dateISO: string) {
    await this.fillBirthDate(dateISO);
    await this.btnCalculate.click();
  }

  async waitForResult(timeout = 5_000) {
    await expect(this.resultBlock).toBeVisible({ timeout });
  }

  async getEnergyNumbers(): Promise<number[]> {
    const badges = await this.energyBadges.all();
    const texts = await Promise.all(badges.map((b) => b.innerText()));
    return texts
      .map((t) => parseInt(t.trim(), 10))
      .filter((n) => !isNaN(n));
  }

  async expectResultVisible() {
    await expect(this.resultBlock).toBeVisible();
    await expect(this.energyBadges.first()).toBeVisible();
  }

  async expectButtonDisabled() {
    await expect(this.btnCalculate).toBeDisabled();
  }

  async expectButtonEnabled() {
    await expect(this.btnCalculate).toBeEnabled();
  }

  async expectBreadcrumbVisible() {
    await expect(this.breadcrumbNav).toBeVisible();
    await expect(this.breadcrumbHomeLink).toBeVisible();
  }
}
