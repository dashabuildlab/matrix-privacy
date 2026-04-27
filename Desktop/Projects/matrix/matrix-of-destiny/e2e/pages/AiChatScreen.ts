import { element, by, expect as detoxExpect, waitFor } from 'detox';
import { BaseScreen } from './BaseScreen';
import { TEST_IDS, TIMEOUTS } from '../helpers/testData';

/**
 * Page Object for app/ai/chat.tsx
 *
 * Add these testID props to the source component:
 *   <TextInput testID={TEST_IDS.aiChat.inputMessage} ... />
 *   <TouchableOpacity testID={TEST_IDS.aiChat.btnSend} ... />
 *   <ScrollView testID={TEST_IDS.aiChat.messagesList} ... />
 *   <View testID={TEST_IDS.aiChat.assistantMessage} ... /> (per message)
 *   <View testID={TEST_IDS.aiChat.userMessage} ... /> (per message)
 *   <View testID={TEST_IDS.aiChat.typingIndicator} ... />
 *   <TouchableOpacity testID={TEST_IDS.aiChat.btnRenameTitle} ... />
 *   <View testID={TEST_IDS.aiChat.renameModal} ... />
 *   <TextInput testID={TEST_IDS.aiChat.renameInput} ... />
 *   <TouchableOpacity testID={TEST_IDS.aiChat.renameSaveBtn} ... />
 *   <TouchableOpacity testID={TEST_IDS.aiChat.renameCancelBtn} ... />
 *   <TouchableOpacity testID={TEST_IDS.aiChat.btnHistory} ... />
 *   <View testID={TEST_IDS.aiChat.emptyState} ... />
 */
export class AiChatScreen extends BaseScreen {
  readonly ids = TEST_IDS.aiChat;

  async waitForScreen() {
    await this.waitForElement(this.ids.inputMessage, TIMEOUTS.medium);
  }

  async typeMessage(text: string) {
    await this.clearAndType(this.ids.inputMessage, text);
  }

  async sendMessage(text: string) {
    await this.typeMessage(text);
    await this.tapById(this.ids.btnSend);
  }

  async waitForResponse(timeout = TIMEOUTS.long) {
    await waitFor(this.byId(this.ids.typingIndicator))
      .toBeVisible()
      .withTimeout(TIMEOUTS.short);
    await waitFor(this.byId(this.ids.typingIndicator))
      .not.toBeVisible()
      .withTimeout(timeout);
  }

  async getLastAssistantMessage() {
    const messages = element(by.id(this.ids.assistantMessage));
    return messages;
  }

  async renameChat(newTitle: string) {
    await this.tapById(this.ids.btnRenameTitle);
    await waitFor(this.byId(this.ids.renameModal)).toBeVisible().withTimeout(TIMEOUTS.short);
    await this.clearAndType(this.ids.renameInput, newTitle);
    await this.tapById(this.ids.renameSaveBtn);
    await waitFor(this.byId(this.ids.renameModal)).not.toBeVisible().withTimeout(TIMEOUTS.short);
  }

  async cancelRename() {
    await this.tapById(this.ids.btnRenameTitle);
    await waitFor(this.byId(this.ids.renameModal)).toBeVisible().withTimeout(TIMEOUTS.short);
    await this.tapById(this.ids.renameCancelBtn);
  }

  async openHistory() {
    await this.tapById(this.ids.btnHistory);
  }

  async expectEmptyState() {
    await this.waitForElement(this.ids.emptyState, TIMEOUTS.short);
  }

  async expectTypingIndicatorVisible() {
    await this.waitForElement(this.ids.typingIndicator, TIMEOUTS.short);
  }

  async expectTypingIndicatorGone(timeout = TIMEOUTS.long) {
    await waitFor(this.byId(this.ids.typingIndicator))
      .not.toBeVisible()
      .withTimeout(timeout);
  }

  async tapSpeakOnLastMessage() {
    await this.tapById(this.ids.btnSpeak);
  }

  async tapCopyOnLastMessage() {
    await this.tapById(this.ids.btnCopy);
  }
}
