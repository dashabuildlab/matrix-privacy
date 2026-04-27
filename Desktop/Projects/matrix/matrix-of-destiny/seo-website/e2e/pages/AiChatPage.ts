import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { ROUTES, AI_CHAT } from '../fixtures/testData';

// API goes to yourmatrixofdestiny.com when running on localhost
const API_URL = '**/api/claude**';

export class AiChatPage extends BasePage {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly authBanner: Locator;
  readonly btnAuthBannerLogin: Locator;
  readonly inputMessage: Locator;
  readonly btnSend: Locator;
  readonly quickSuggestions: Locator;
  readonly limitReachedBlock: Locator;
  readonly btnRegisterFromLimit: Locator;
  readonly loadingDots: Locator;
  readonly messagesArea: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.locator('h1').filter({ hasText: 'AI-провідник' });
    this.subtitle = page.locator('p.text-sm').filter({ hasText: /безкоштовних|Безліміт|\.\.\./ }).first();
    // Auth banner: yellow tinted box with invite text
    this.authBanner = page.locator('div').filter({ hasText: 'Увійдіть для безлімітного доступу' }).first();
    this.btnAuthBannerLogin = page.getByRole('button', { name: 'Увійти / Зареєструватись' });
    this.inputMessage = page.locator('textarea');
    this.btnSend = page.locator('button[aria-label="Надіслати"]');
    // Quick suggestions: buttons inside the empty-state grid
    this.quickSuggestions = page.locator('button').filter({ hasText: /Матриц|карм|призначен/i });
    // Loading: the 3 bouncing dots appear when `loading = true`
    this.loadingDots = page.locator('span.animate-bounce').first();
    // Limit reached block
    this.limitReachedBlock = page.locator('div').filter({ hasText: 'Денний ліміт вичерпано' }).first();
    this.btnRegisterFromLimit = page.getByRole('button', { name: 'Зареєструватись безкоштовно' });
    this.messagesArea = page.locator('div.flex-1.flex.flex-col');
  }

  async open() {
    await this.navigate(ROUTES.aiChat);
    // Wait for auth state to resolve (user=undefined → null or User)
    await this.page.waitForFunction(() => {
      const subtitle = document.querySelector('p.text-sm');
      return subtitle && subtitle.textContent !== '...';
    }, { timeout: 10_000 }).catch(() => {});
  }

  async sendMessage(text: string) {
    await this.inputMessage.fill(text);
    await this.btnSend.click();
  }

  async sendMessageWithEnter(text: string) {
    await this.inputMessage.fill(text);
    await this.inputMessage.press('Enter');
  }

  async waitForResponse(timeout = 20_000) {
    // Wait until loading indicator disappears (it may appear and vanish very fast)
    await expect(this.loadingDots).not.toBeVisible({ timeout });
  }

  async waitForAssistantMessage(timeout = 20_000) {
    // The loading indicator also has div.flex.justify-start, so we exclude it
    // by waiting for a bubble that contains text (not just bouncing dots)
    await expect(this.loadingDots).not.toBeVisible({ timeout }).catch(() => {});
    // Then wait for a real assistant text bubble
    const realBubble = this.page.locator(
      'div.flex.justify-start div[class*="rounded-2xl"][class*="rounded-bl-md"]:not(:has(span))',
    );
    await expect(realBubble.first()).toBeVisible({ timeout: 5_000 });
  }

  async getLastAssistantText(): Promise<string> {
    // Exclude loading indicator (has span.animate-bounce inside)
    const bubbles = this.page.locator(
      'div.flex.justify-start div[class*="rounded-2xl"][class*="rounded-bl-md"]:not(:has(span))',
    );
    const all = await bubbles.all();
    if (all.length === 0) return '';
    return all[all.length - 1].innerText();
  }

  async clickQuickSuggestion(index = 0) {
    await this.quickSuggestions.nth(index).click();
  }

  async exhaustDailyLimit() {
    await this.page.evaluate(
      ([key, limit]) => {
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(key, JSON.stringify({ count: limit, date: today }));
      },
      [AI_CHAT.storageKey, AI_CHAT.dailyLimit] as [string, number],
    );
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
    // Wait for auth state to resolve
    await this.page.waitForTimeout(1_000);
  }

  async expectLimitReached() {
    await expect(this.limitReachedBlock).toBeVisible({ timeout: 5_000 });
    await expect(this.inputMessage).toBeDisabled();
  }

  async expectGuestMode() {
    await expect(this.subtitle).toContainText(/безкоштовних/i);
  }

  async expectAuthenticatedMode() {
    await expect(this.subtitle).toContainText(/Безліміт/i);
  }

  async mockApiSuccess(responseText = 'Це тестова відповідь AI-провідника.') {
    await this.page.route(API_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [{ type: 'text', text: responseText }],
        }),
      }),
    );
  }

  async mockApiError(urlPatternOrStatus: string | RegExp | number = API_URL, status = 500) {
    const resolvedStatus = typeof urlPatternOrStatus === 'number' ? urlPatternOrStatus : status;
    await this.page.route(API_URL, (route) =>
      route.fulfill({
        status: resolvedStatus,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      }),
    );
  }

  async unroute() {
    await this.page.unroute(API_URL);
  }
}
