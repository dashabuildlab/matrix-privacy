import { by, element, expect as detoxExpect, waitFor, device } from 'detox';
import { TIMEOUTS } from '../helpers/testData';

export abstract class BaseScreen {
  protected byId(testID: string) {
    return element(by.id(testID));
  }

  protected byText(text: string) {
    return element(by.text(text));
  }

  protected byLabel(label: string) {
    return element(by.label(label));
  }

  async waitForElement(testID: string, timeout = TIMEOUTS.medium) {
    await waitFor(this.byId(testID)).toBeVisible().withTimeout(timeout);
  }

  async waitForText(text: string, timeout = TIMEOUTS.medium) {
    await waitFor(this.byText(text)).toBeVisible().withTimeout(timeout);
  }

  async tapById(testID: string) {
    await this.byId(testID).tap();
  }

  async typeText(testID: string, text: string) {
    await this.byId(testID).tap();
    await this.byId(testID).typeText(text);
  }

  async clearAndType(testID: string, text: string) {
    await this.byId(testID).clearText();
    await this.byId(testID).typeText(text);
  }

  async expectVisible(testID: string) {
    await detoxExpect(this.byId(testID)).toBeVisible();
  }

  async expectNotVisible(testID: string) {
    await detoxExpect(this.byId(testID)).not.toBeVisible();
  }

  async expectText(testID: string, text: string) {
    await detoxExpect(this.byId(testID)).toHaveText(text);
  }

  async swipeUp(testID: string) {
    await this.byId(testID).swipe('up', 'slow');
  }

  async scrollToBottom(testID: string) {
    await this.byId(testID).scroll(500, 'down');
  }

  async goBack() {
    await device.pressBack();
  }

  async reloadApp() {
    await device.reloadReactNative();
  }

  async setNetworkOffline() {
    // iOS: await device.setStatusBar({ network: 'wifi' });
    // Use network conditioning in test setup
  }
}
