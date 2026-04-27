import { test, expect } from '@playwright/test';
import { AiChatPage } from '../pages/AiChatPage';
import { HeaderComponent } from '../pages/HeaderComponent';
import { AuthModalPage } from '../pages/AuthModalPage';
import { TEST_USER, AI_CHAT, ROUTES } from '../fixtures/testData';

// Skip auth-dependent tests when credentials are not configured
const hasCredentials = !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD);

test.describe('AI Chat — Guest user (no auth required)', () => {
  let chatPage: AiChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new AiChatPage(page);
    await chatPage.open();
  });

  test('page loads with heading and input', async () => {
    await expect(chatPage.heading).toBeVisible();
    await expect(chatPage.inputMessage).toBeVisible();
    await expect(chatPage.btnSend).toBeVisible();
  });

  test('shows auth banner for guest', async () => {
    await expect(chatPage.authBanner).toBeVisible();
    await expect(chatPage.btnAuthBannerLogin).toBeVisible();
  });

  test('shows guest subtitle with remaining message count', async () => {
    await chatPage.expectGuestMode();
  });

  test('quick suggestions are visible on empty chat', async () => {
    await expect(chatPage.quickSuggestions.first()).toBeVisible();
  });

  test('clicking quick suggestion fills input', async () => {
    await chatPage.clickQuickSuggestion(0);
    const value = await chatPage.inputMessage.inputValue();
    expect(value.length).toBeGreaterThan(5);
  });

  test('send button is disabled for empty input', async () => {
    await expect(chatPage.btnSend).toBeDisabled();
  });

  test('send button enables after typing', async () => {
    await chatPage.inputMessage.fill('Тест');
    await expect(chatPage.btnSend).toBeEnabled();
  });

  test('Shift+Enter inserts newline instead of sending', async () => {
    await chatPage.inputMessage.fill('Рядок 1');
    await chatPage.inputMessage.press('Shift+Enter');
    const value = await chatPage.inputMessage.inputValue();
    expect(value).toContain('\n');
  });

  test('Enter sends message', async () => {
    await chatPage.mockApiSuccess();
    await chatPage.inputMessage.fill(AI_CHAT.validMessage);
    await chatPage.inputMessage.press('Enter');
    await chatPage.waitForAssistantMessage();
  });

  test('happy path: send message and receive AI response', async () => {
    const reply = 'Число 7 символізує духовність та мудрість.';
    await chatPage.mockApiSuccess(reply);
    await chatPage.sendMessage(AI_CHAT.validMessage);
    await chatPage.waitForAssistantMessage();
    const text = await chatPage.getLastAssistantText();
    expect(text).toBe(reply);
  });

  test('does not send whitespace-only message', async ({ page }) => {
    await chatPage.inputMessage.fill('   ');
    await expect(chatPage.btnSend).toBeDisabled();
  });

  test('input is cleared after sending', async () => {
    await chatPage.mockApiSuccess();
    await chatPage.sendMessage('Тест очищення поля');
    const value = await chatPage.inputMessage.inputValue();
    expect(value).toBe('');
  });

  test('shows limit reached after exhausting daily quota', async () => {
    await chatPage.exhaustDailyLimit();
    await chatPage.expectLimitReached();
  });

  test('shows register button when limit reached', async () => {
    await chatPage.exhaustDailyLimit();
    await expect(chatPage.btnRegisterFromLimit).toBeVisible();
  });

  test('input disabled when limit reached', async () => {
    await chatPage.exhaustDailyLimit();
    await expect(chatPage.inputMessage).toBeDisabled();
  });

  test('XSS attempt: script tag rendered as text, not executed', async ({ page }) => {
    await chatPage.mockApiSuccess('Відповідь без скриптів.');
    await chatPage.sendMessage(AI_CHAT.xssAttempt);
    await chatPage.waitForAssistantMessage();
    const alerts = await page.evaluate(() => (window as any).__alertCalled ?? false);
    expect(alerts).toBeFalsy();
  });
});

test.describe('AI Chat — API mock scenarios', () => {
  let chatPage: AiChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new AiChatPage(page);
    await chatPage.open();
  });

  test('API error 500: shows fallback message in chat', async () => {
    await chatPage.mockApiError(500);
    await chatPage.sendMessage(AI_CHAT.validMessage);
    // Wait for loading to finish (dots vanish) then check message
    await chatPage.waitForResponse(10_000);
    const text = await chatPage.getLastAssistantText();
    expect(text.length).toBeGreaterThan(0);
  });

  test('offline: request fails gracefully', async ({ page }) => {
    await chatPage.goOffline();
    await chatPage.sendMessage(AI_CHAT.validMessage);
    await expect(chatPage.loadingDots).not.toBeVisible({ timeout: 15_000 });
    const text = await chatPage.getLastAssistantText();
    expect(text.length).toBeGreaterThan(0);
    await chatPage.goOnline();
  });

  test('API returns non-standard response: shows fallback text', async ({ page }) => {
    await page.route('**/api/claude**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );
    await chatPage.sendMessage(AI_CHAT.validMessage);
    await expect(chatPage.loadingDots).not.toBeVisible({ timeout: 10_000 });
    const text = await chatPage.getLastAssistantText();
    expect(text).toContain('помилка');
  });
});

test.describe('AI Chat — Authenticated user', () => {
  test.skip(!hasCredentials, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD env vars');

  test.beforeEach(async ({ page }) => {
    const header = new HeaderComponent(page);
    const modal = new AuthModalPage(page);
    await page.goto(ROUTES.home);
    await header.clickLogin();
    await modal.login(TEST_USER.email, TEST_USER.password);
    await modal.waitForClose();
  });

  test('shows unlimited access for authenticated user', async ({ page }) => {
    const chatPage = new AiChatPage(page);
    await chatPage.open();
    await chatPage.expectAuthenticatedMode();
    await expect(chatPage.authBanner).not.toBeVisible();
  });

  test('can send multiple messages without limit', async ({ page }) => {
    const chatPage = new AiChatPage(page);
    await chatPage.open();
    await chatPage.mockApiSuccess('Відповідь 1');
    await chatPage.sendMessage('Питання 1');
    await chatPage.waitForAssistantMessage();
    await chatPage.unroute();
    await chatPage.mockApiSuccess('Відповідь 2');
    await chatPage.sendMessage('Питання 2');
    await chatPage.waitForResponse();
  });
});

test.describe('AI Chat — SEO', () => {
  test('page has correct title', async ({ page }) => {
    await page.goto(ROUTES.aiChat);
    const title = await page.title();
    expect(title).toMatch(/AI/i);
  });

  test('page URL is /uk/ai-chat/', async ({ page }) => {
    await page.goto(ROUTES.aiChat);
    await expect(page).toHaveURL(/ai-chat/);
  });
});
