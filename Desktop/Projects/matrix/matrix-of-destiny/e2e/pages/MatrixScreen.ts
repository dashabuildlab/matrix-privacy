import { waitFor } from 'detox';
import { BaseScreen } from './BaseScreen';
import { TEST_IDS, TIMEOUTS } from '../helpers/testData';

/**
 * Page Object for app/(tabs)/matrix.tsx
 *
 * Add these testID props to the source component:
 *   <View testID={TEST_IDS.matrix.matrixView} ... />
 *   <TouchableOpacity testID={TEST_IDS.matrix.btnUnlock} ... />
 *   <TouchableOpacity testID={TEST_IDS.matrix.btnCompatibility} ... />
 *   <TouchableOpacity testID={TEST_IDS.matrix.btnConflict} ... />
 *   <TouchableOpacity testID={TEST_IDS.matrix.btnAiRecommendations} ... />
 *   <TouchableOpacity testID={TEST_IDS.matrix.btnDownload} ... />
 *   <Text testID={TEST_IDS.matrix.crystalBalance} ... />
 */
export class MatrixScreen extends BaseScreen {
  readonly ids = TEST_IDS.matrix;
  readonly tabIds = TEST_IDS.tabs;

  async navigateToTab() {
    await this.tapById(this.tabIds.tabMatrix);
    await this.waitForElement(this.ids.matrixView, TIMEOUTS.medium);
  }

  async waitForScreen() {
    await this.waitForElement(this.ids.matrixView, TIMEOUTS.medium);
  }

  async tapUnlock() {
    await this.tapById(this.ids.btnUnlock);
  }

  async tapCompatibility() {
    await this.tapById(this.ids.btnCompatibility);
  }

  async tapConflictAnalysis() {
    await this.tapById(this.ids.btnConflict);
  }

  async tapAiRecommendations() {
    await this.tapById(this.ids.btnAiRecommendations);
  }

  async tapDownload() {
    await this.tapById(this.ids.btnDownload);
  }

  async getCrystalBalance(): Promise<string> {
    const el = this.byId(this.ids.crystalBalance);
    const attrs = await el.getAttributes();
    return 'text' in attrs ? (attrs.text as string) : '0';
  }

  async expectMatrixVisible() {
    await this.waitForElement(this.ids.matrixView, TIMEOUTS.medium);
  }

  async expectUnlockButtonVisible() {
    await this.waitForElement(this.ids.btnUnlock, TIMEOUTS.short);
  }

  async expectUnlockButtonNotVisible() {
    await this.expectNotVisible(this.ids.btnUnlock);
  }
}
