import { expect as detoxExpect } from 'detox';
import { BaseScreen } from './BaseScreen';
import { TEST_IDS, TIMEOUTS } from '../helpers/testData';

/**
 * Page Object for app/auth/register.tsx
 *
 * Add these testID props to the source component:
 *   <TextInput testID={TEST_IDS.register.inputName} ... />
 *   <TextInput testID={TEST_IDS.register.inputBirthDate} ... />
 *   <TextInput testID={TEST_IDS.register.inputEmail} ... />
 *   <TextInput testID={TEST_IDS.register.inputPassword} ... />
 *   <TextInput testID={TEST_IDS.register.inputConfirmPassword} ... />
 *   <TouchableOpacity testID={TEST_IDS.register.btnSubmit} ... />
 *   <TouchableOpacity testID={TEST_IDS.register.linkLogin} ... />
 *   <Text testID={TEST_IDS.register.errorMessage} ... />
 */
export class RegisterScreen extends BaseScreen {
  readonly ids = TEST_IDS.register;

  async waitForScreen() {
    await this.waitForElement(this.ids.inputEmail, TIMEOUTS.medium);
  }

  async fillName(name: string) {
    await this.clearAndType(this.ids.inputName, name);
  }

  async fillBirthDate(date: string) {
    await this.clearAndType(this.ids.inputBirthDate, date);
  }

  async fillEmail(email: string) {
    await this.clearAndType(this.ids.inputEmail, email);
  }

  async fillPassword(password: string) {
    await this.clearAndType(this.ids.inputPassword, password);
  }

  async fillConfirmPassword(password: string) {
    await this.clearAndType(this.ids.inputConfirmPassword, password);
  }

  async submit() {
    await this.tapById(this.ids.btnSubmit);
  }

  async register(params: {
    name: string;
    birthDate: string;
    email: string;
    password: string;
    confirmPassword?: string;
  }) {
    await this.waitForScreen();
    await this.fillName(params.name);
    await this.fillBirthDate(params.birthDate);
    await this.fillEmail(params.email);
    await this.fillPassword(params.password);
    await this.fillConfirmPassword(params.confirmPassword ?? params.password);
    await this.submit();
  }

  async tapBackToLogin() {
    await this.tapById(this.ids.linkLogin);
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
}
