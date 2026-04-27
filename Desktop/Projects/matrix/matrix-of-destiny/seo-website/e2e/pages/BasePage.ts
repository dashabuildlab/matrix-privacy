import { Page, expect } from '@playwright/test';

export abstract class BasePage {
  constructor(protected page: Page) {}

  async navigate(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForText(text: string, timeout = 10_000) {
    await expect(this.page.getByText(text).first()).toBeVisible({ timeout });
  }

  async expectUrl(pattern: string | RegExp) {
    await expect(this.page).toHaveURL(pattern);
  }

  async getTitle() {
    return this.page.title();
  }

  async scrollToBottom() {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  async clearLocalStorage() {
    await this.page.evaluate(() => localStorage.clear());
  }

  async setLocalStorage(key: string, value: string) {
    await this.page.evaluate(
      ([k, v]) => localStorage.setItem(k, v),
      [key, value],
    );
  }

  async getLocalStorage(key: string): Promise<string | null> {
    return this.page.evaluate((k) => localStorage.getItem(k), key);
  }

  async goOffline() {
    await this.page.context().setOffline(true);
  }

  async goOnline() {
    await this.page.context().setOffline(false);
  }

  async mockApiError(urlPattern: string | RegExp, status = 500) {
    await this.page.route(urlPattern, (route) =>
      route.fulfill({ status, body: JSON.stringify({ error: 'Internal Server Error' }) }),
    );
  }

  async mockEmptyApiResponse(urlPattern: string | RegExp) {
    await this.page.route(urlPattern, (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({}) }),
    );
  }
}
