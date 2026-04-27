import { waitFor } from 'detox';
import { BaseScreen } from './BaseScreen';
import { TEST_IDS, TIMEOUTS } from '../helpers/testData';

/**
 * Page Object for app/paywall.tsx
 *
 * Add these testID props to the source component:
 *   <TouchableOpacity testID={TEST_IDS.paywall.planMonthly} ... />
 *   <TouchableOpacity testID={TEST_IDS.paywall.planYearly} ... />
 *   <TouchableOpacity testID={TEST_IDS.paywall.btnSubscribe} ... />
 *   <TouchableOpacity testID={TEST_IDS.paywall.btnRestore} ... />
 *   <TouchableOpacity testID={TEST_IDS.paywall.btnClose} ... />
 *   <Text testID={TEST_IDS.paywall.priceMonthly} ... />
 *   <Text testID={TEST_IDS.paywall.priceYearly} ... />
 */
export class PaywallScreen extends BaseScreen {
  readonly ids = TEST_IDS.paywall;

  async waitForScreen() {
    await this.waitForElement(this.ids.btnSubscribe, TIMEOUTS.medium);
  }

  async selectMonthlyPlan() {
    await this.tapById(this.ids.planMonthly);
  }

  async selectYearlyPlan() {
    await this.tapById(this.ids.planYearly);
  }

  async tapSubscribe() {
    await this.tapById(this.ids.btnSubscribe);
  }

  async tapRestorePurchases() {
    await this.tapById(this.ids.btnRestore);
  }

  async close() {
    await this.tapById(this.ids.btnClose);
    await waitFor(this.byId(this.ids.btnSubscribe))
      .not.toBeVisible()
      .withTimeout(TIMEOUTS.short);
  }

  async getMonthlyPrice(): Promise<string> {
    const el = this.byId(this.ids.priceMonthly);
    const attrs = await el.getAttributes();
    return 'text' in attrs ? (attrs.text as string) : '';
  }

  async getYearlyPrice(): Promise<string> {
    const el = this.byId(this.ids.priceYearly);
    const attrs = await el.getAttributes();
    return 'text' in attrs ? (attrs.text as string) : '';
  }

  async expectVisible() {
    await this.waitForElement(this.ids.btnSubscribe, TIMEOUTS.medium);
  }

  async expectPricesVisible() {
    await this.waitForElement(this.ids.priceMonthly, TIMEOUTS.short);
    await this.waitForElement(this.ids.priceYearly, TIMEOUTS.short);
  }

  async expectElementVisible(testID: string, timeout = TIMEOUTS.short) {
    await this.waitForElement(testID, timeout);
  }
}
