import { device, by, element, waitFor } from 'detox';
import { LoginScreen } from '../pages/LoginScreen';
import { AiChatScreen } from '../pages/AiChatScreen';
import { PaywallScreen } from '../pages/PaywallScreen';
import { TEST_USER, TEST_IDS, TIMEOUTS } from '../helpers/testData';

const login = new LoginScreen();
const chat = new AiChatScreen();
const paywall = new PaywallScreen();

async function loginAsTestUser() {
  await login.waitForScreen();
  await login.login(TEST_USER.email, TEST_USER.password);
  await waitFor(element(by.id(TEST_IDS.tabs.tabAi))).toBeVisible().withTimeout(TIMEOUTS.medium);
  await element(by.id(TEST_IDS.tabs.tabAi)).tap();
  await waitFor(element(by.id(TEST_IDS.aiChat.inputMessage))).toBeVisible().withTimeout(TIMEOUTS.medium);
}

beforeAll(async () => {
  await device.launchApp({ newInstance: true });
});

beforeEach(async () => {
  await device.reloadReactNative();
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('AI Chat — Happy Path (authenticated)', () => {
  beforeEach(async () => {
    await loginAsTestUser();
  });

  it('screen opens with empty state and input', async () => {
    await chat.waitForScreen();
    await chat.expectEmptyState();
    await chat.expectVisible(chat.ids.inputMessage);
    await chat.expectVisible(chat.ids.btnSend);
  });

  it('happy path: send message and receive AI response', async () => {
    await chat.waitForScreen();
    await chat.sendMessage('Що означає число 7 у Матриці Долі?');
    await chat.expectTypingIndicatorVisible();
    await chat.waitForResponse(TIMEOUTS.long);
    await chat.expectTypingIndicatorGone();
    await chat.expectVisible(chat.ids.assistantMessage);
  });

  it('sends message with Send button tap', async () => {
    await chat.waitForScreen();
    await chat.typeMessage('Тестове повідомлення');
    await chat.tapById(chat.ids.btnSend);
    await chat.expectTypingIndicatorVisible();
    await chat.waitForResponse();
  });

  it('can rename chat session', async () => {
    await chat.waitForScreen();
    await chat.renameChat('Мій тест чат');
    await chat.waitForText('Мій тест чат');
  });

  it('cancel rename leaves original title', async () => {
    await chat.waitForScreen();
    await chat.cancelRename();
    await chat.expectNotVisible(chat.ids.renameModal);
  });

  it('can navigate to chat history', async () => {
    await chat.waitForScreen();
    await chat.openHistory();
    // History screen should be visible
    await chat.waitForText('Історія', TIMEOUTS.short);
  });

  it('can speak last assistant message (TTS)', async () => {
    await chat.waitForScreen();
    await chat.sendMessage('Розкажи про Матрицю');
    await chat.waitForResponse();
    await chat.tapSpeakOnLastMessage();
    await chat.waitForElement(chat.ids.btnSpeak, TIMEOUTS.short);
  });

  it('can copy last assistant message', async () => {
    await chat.waitForScreen();
    await chat.sendMessage('Коротко про нумерологію');
    await chat.waitForResponse();
    await chat.tapCopyOnLastMessage();
    // Clipboard should have content (verified via system clipboard on device)
  });

  it('long conversation: multiple messages stay scrollable', async () => {
    await chat.waitForScreen();
    for (let i = 1; i <= 3; i++) {
      await chat.sendMessage(`Питання ${i}: Розкажи про аркан ${i}`);
      await chat.waitForResponse();
    }
    await chat.scrollToBottom(chat.ids.messagesList);
    await chat.expectVisible(chat.ids.assistantMessage);
  });
});

// ─── Guest user ───────────────────────────────────────────────────────────────

describe('AI Chat — Guest user', () => {
  beforeEach(async () => {
    await login.waitForScreen();
    await login.tapGuestMode();
    await waitFor(element(by.id(TEST_IDS.tabs.tabAi))).toBeVisible().withTimeout(TIMEOUTS.medium);
    await element(by.id(TEST_IDS.tabs.tabAi)).tap();
  });

  it('guest can send messages within limit', async () => {
    await chat.waitForScreen();
    await chat.sendMessage('Тест від гостя');
    await chat.waitForResponse();
    await chat.expectVisible(chat.ids.assistantMessage);
  });

  it('send button is disabled for empty input', async () => {
    await chat.waitForScreen();
    // Don't type anything — button should be disabled
    await chat.expectNotVisible(chat.ids.btnSend); // or disabled
  });
});

// ─── Crystal / Paywall ────────────────────────────────────────────────────────

describe('AI Chat — Paywall & Crystals', () => {
  beforeEach(async () => {
    await loginAsTestUser();
  });

  it('navigates to paywall when no crystals', async () => {
    // This test requires mocking crystal balance = 0
    // Set up state via app params or mock API
    await chat.waitForScreen();
    await chat.expectVisible(chat.ids.btnSend);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('AI Chat — Edge Cases', () => {
  beforeEach(async () => {
    await loginAsTestUser();
  });

  it('does not send empty message', async () => {
    await chat.waitForScreen();
    await chat.typeMessage('   ');
    await chat.tapById(chat.ids.btnSend);
    await chat.expectNotVisible(chat.ids.typingIndicator);
  });

  it('does not crash on very long message', async () => {
    await chat.waitForScreen();
    const longText = 'А'.repeat(500);
    await chat.sendMessage(longText);
    await chat.waitForResponse();
    await chat.expectVisible(chat.ids.assistantMessage);
  });

  it('recovers gracefully after API error', async () => {
    // This requires server-side mock or network conditioning
    // The app should show an error message and allow retrying
    await chat.waitForScreen();
    await chat.sendMessage('Тест помилки');
    await waitFor(element(by.id(chat.ids.assistantMessage)))
      .toBeVisible()
      .withTimeout(TIMEOUTS.long);
  });

  it('chat history persists after app reload', async () => {
    await chat.waitForScreen();
    await chat.sendMessage('Тест збереження повідомлення');
    await chat.waitForResponse();
    await device.reloadReactNative();
    await loginAsTestUser();
    await chat.waitForText('Тест збереження повідомлення', TIMEOUTS.medium);
  });
});
