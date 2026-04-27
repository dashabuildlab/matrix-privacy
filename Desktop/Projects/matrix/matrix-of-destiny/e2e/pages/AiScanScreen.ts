import { waitFor } from 'detox';
import { BaseScreen } from './BaseScreen';
import { TEST_IDS, TIMEOUTS } from '../helpers/testData';

/**
 * Page Object for app/ai-scan/index.tsx
 *
 * Add these testID props to the source component:
 *   <TouchableOpacity testID={TEST_IDS.aiScan.btnAddPhoto} ... />
 *   <TextInput testID={TEST_IDS.aiScan.inputBirthDate} ... />
 *   <TouchableOpacity testID={TEST_IDS.aiScan.btnStartScan} ... />
 *   <View testID={TEST_IDS.aiScan.processingView} ... />
 *   <View testID={TEST_IDS.aiScan.resultView} ... />
 *   <Text testID={TEST_IDS.aiScan.arcanaName} ... />
 *   <Text testID={TEST_IDS.aiScan.arcanaDescription} ... />
 *   <TouchableOpacity testID={TEST_IDS.aiScan.btnShare} ... />
 *   <TouchableOpacity testID={TEST_IDS.aiScan.btnScanAgain} ... />
 *   <Text testID={TEST_IDS.aiScan.errorMessage} ... />
 */
export class AiScanScreen extends BaseScreen {
  readonly ids = TEST_IDS.aiScan;

  async waitForScreen() {
    await this.waitForElement(this.ids.btnAddPhoto, TIMEOUTS.medium);
  }

  async fillBirthDate(date: string) {
    await this.clearAndType(this.ids.inputBirthDate, date);
  }

  async tapAddPhoto() {
    await this.tapById(this.ids.btnAddPhoto);
  }

  async startScan() {
    await this.tapById(this.ids.btnStartScan);
  }

  async waitForProcessing(timeout = TIMEOUTS.long) {
    await waitFor(this.byId(this.ids.processingView)).toBeVisible().withTimeout(TIMEOUTS.short);
    await waitFor(this.byId(this.ids.resultView)).toBeVisible().withTimeout(timeout);
  }

  async waitForResult(timeout = TIMEOUTS.long) {
    await waitFor(this.byId(this.ids.resultView)).toBeVisible().withTimeout(timeout);
  }

  async getArcanaName(): Promise<string> {
    const el = this.byId(this.ids.arcanaName);
    const attrs = await el.getAttributes();
    return 'text' in attrs ? (attrs.text as string) : '';
  }

  async tapShare() {
    await this.tapById(this.ids.btnShare);
  }

  async tapScanAgain() {
    await this.tapById(this.ids.btnScanAgain);
  }

  async expectError() {
    await this.waitForElement(this.ids.errorMessage, TIMEOUTS.short);
  }

  async expectScanButtonDisabled() {
    const el = this.byId(this.ids.btnStartScan);
    const attrs = await el.getAttributes();
    expect('enabled' in attrs ? attrs.enabled : true).toBe(false);
  }

  async expectScanButtonEnabled() {
    const el = this.byId(this.ids.btnStartScan);
    const attrs = await el.getAttributes();
    expect('enabled' in attrs ? attrs.enabled : false).toBe(true);
  }
}
