import { element, by, expect as detoxExpect, waitFor } from 'detox';
import { BaseScreen } from './BaseScreen';
import { TEST_IDS, TIMEOUTS } from '../helpers/testData';

/**
 * Page Object for app/auth/login.tsx
 *
 * Add these testID props to the source component:
 *   <TextInput testID={TEST_IDS.login.inputEmail} ... />
 *   <TextInput testID={TEST_IDS.login.inputPassword} ... />
 *   <TouchableOpacity testID={TEST_IDS.login.btnSubmit} ... />
 *   <TouchableOpacity testID={TEST_IDS.login.btnGoogle} ... />
 *   <TouchableOpacity testID={TEST_IDS.login.btnApple} ... />
 *   <TouchableOpacity testID={TEST_IDS.login.btnForgotPassword} ... />
 *   <TouchableOpacity testID={TEST_IDS.login.linkRegister} ... />
 *   <TouchableOpacity testID={TEST_IDS.login.btnGuest} ... />
 *   <Text testID={TEST_IDS.login.errorMessage} ... />
 *   <TouchableOpacity testID={TEST_IDS.login.btnShowPassword} ... />
 */
export class LoginScreen extends BaseScreen {
  readonly ids = TEST_IDS.login;

  async waitForScreen() {
    await this.waitForElement(this.ids.inputEmail, TIMEOUTS.medium);
  }

  async fillEmail(email: string) {
    await this.clearAndType(this.ids.inputEmail, email);
  }

  async fillPassword(password: string) {
    await this.clearAndType(this.ids.inputPassword, password);
  }

  async submit() {
    await this.tapById(this.ids.btnSubmit);
  }

  async login(email: string, password: string) {
    await this.waitForScreen();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  async tapForgotPassword() {
    await this.tapById(this.ids.btnForgotPassword);
  }

  async tapRegister() {
    await this.tapById(this.ids.linkRegister);
  }

  async tapGuestMode() {
    await this.tapById(this.ids.btnGuest);
  }

  async tapGoogleSignIn() {
    await this.tapById(this.ids.btnGoogle);
  }

  async tapAppleSignIn() {
    await this.tapById(this.ids.btnApple);
  }

  async togglePasswordVisibility() {
    await this.tapById(this.ids.btnShowPassword);
  }

  async submitResetPassword(email: string) {
    await this.tapForgotPassword();
    await waitFor(this.byId(this.ids.resetEmailInput)).toBeVisible().withTimeout(TIMEOUTS.short);
    await this.clearAndType(this.ids.resetEmailInput, email);
    await this.tapById(this.ids.resetSubmitBtn);
  }

  async expectError(partialText?: string) {
    await this.waitForElement(this.ids.errorMessage, TIMEOUTS.short);
    if (partialText) {
      await detoxExpect(this.byId(this.ids.errorMessage)).toHaveText(
        expect.stringContaining(partialText) as unknown as string,
      );
    }
  }

  async expectLoading() {
    await this.waitForElement(this.ids.loadingIndicator, TIMEOUTS.short);
  }

  async expectResetSuccessMessage() {
    await this.waitForElement(this.ids.resetSuccessMsg, TIMEOUTS.medium);
  }
}
