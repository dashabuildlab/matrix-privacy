import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { ROUTES } from '../fixtures/testData';

export class CompatibilityCalculatorPage extends BasePage {
  readonly heading: Locator;
  readonly inputPerson1Date: Locator;
  readonly inputPerson2Date: Locator;
  readonly btnCalculate: Locator;
  readonly resultBlock: Locator;
  readonly energyBadges: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1 });
    // Two type="date" inputs — requires YYYY-MM-DD format
    this.inputPerson1Date = page.locator('input[type="date"]').first();
    this.inputPerson2Date = page.locator('input[type="date"]').nth(1);
    // Button is disabled={!date1 || !date2} — no error messages, only disabled state
    this.btnCalculate = page.locator('button.btn-primary').first();
    this.resultBlock = page.locator('h2').filter({ hasText: /Результат|Result/i });
    this.energyBadges = page.locator('.energy-badge');
  }

  async open() {
    await this.navigate(ROUTES.compatibility);
  }

  async fillPerson1(dateISO: string) {
    await this.inputPerson1Date.fill(dateISO);
  }

  async fillPerson2(dateISO: string) {
    await this.inputPerson2Date.fill(dateISO);
  }

  async calculate(date1ISO: string, date2ISO: string) {
    await this.fillPerson1(date1ISO);
    await this.fillPerson2(date2ISO);
    await this.btnCalculate.click();
  }

  async waitForResult(timeout = 5_000) {
    await expect(this.energyBadges.first()).toBeVisible({ timeout });
  }

  async getCompatibilityScores(): Promise<number[]> {
    const badges = await this.energyBadges.all();
    const texts = await Promise.all(badges.map((b) => b.innerText()));
    return texts.map((t) => parseInt(t.trim(), 10)).filter((n) => !isNaN(n));
  }

  async expectResultVisible() {
    await expect(this.energyBadges.first()).toBeVisible();
  }

  async expectButtonDisabled() {
    await expect(this.btnCalculate).toBeDisabled();
  }

  async expectButtonEnabled() {
    await expect(this.btnCalculate).toBeEnabled();
  }
}
