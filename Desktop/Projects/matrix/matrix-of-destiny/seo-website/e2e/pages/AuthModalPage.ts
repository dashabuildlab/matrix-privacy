import { Page, Locator, expect } from '@playwright/test';

type AuthMode = 'login' | 'register' | 'reset';

export class AuthModalPage {
  readonly modal: Locator;
  readonly btnClose: Locator;
  readonly inputEmail: Locator;
  readonly inputPassword: Locator;
  readonly inputConfirmPassword: Locator;
  readonly btnSubmit: Locator;
  readonly btnGoogle: Locator;
  readonly btnApple: Locator;
  readonly linkForgotPassword: Locator;
  readonly linkToRegister: Locator;
  readonly linkToLogin: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly loadingSpinner: Locator;

  constructor(private page: Page) {
    // Overlay div: fixed inset-0 z-[200] — rendered only when modal is open
    this.modal = page.locator('div.fixed.inset-0').first();
    this.btnClose = this.modal.locator('button[aria-label]').first();
    this.inputEmail = this.modal.locator('input[type="email"]');
    this.inputPassword = this.modal.locator('input[type="password"]').first();
    this.inputConfirmPassword = this.modal.locator('input[type="password"]').nth(1);
    this.btnSubmit = this.modal.locator('button[type="submit"]');
    this.btnGoogle = this.modal.locator('button').filter({ hasText: /Google/ });
    this.btnApple = this.modal.locator('button').filter({ hasText: /Apple/ });
    this.linkForgotPassword = this.modal.locator('button').filter({ hasText: /Забули|Forgot/i });
    this.linkToRegister = this.modal.locator('button').filter({ hasText: /Зареєструватись|Sign up/i });
    this.linkToLogin = this.modal.locator('button[type="button"]').filter({ hasText: /Увійти|Sign in/ }).last();
    // Error: div with Tailwind red classes; Success: div with emerald classes
    this.errorMessage = this.modal.locator('div[class*="red-500"]');
    this.successMessage = this.modal.locator('div[class*="emerald-500"]');
    this.loadingSpinner = this.modal.locator('button[type="submit"]').filter({ hasText: '...' });
  }

  async waitForOpen() {
    await expect(this.modal).toBeVisible({ timeout: 5_000 });
  }

  async waitForClose() {
    await expect(this.modal).not.toBeVisible({ timeout: 5_000 });
  }

  async fillEmail(email: string) {
    await this.inputEmail.fill(email);
  }

  async fillPassword(password: string) {
    await this.inputPassword.fill(password);
  }

  async fillConfirmPassword(password: string) {
    await this.inputConfirmPassword.fill(password);
  }

  async submit() {
    await this.btnSubmit.click();
  }

  async login(email: string, password: string) {
    await this.waitForOpen();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  async register(email: string, password: string, confirmPassword?: string) {
    await this.waitForOpen();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.fillConfirmPassword(confirmPassword ?? password);
    await this.submit();
  }

  async requestPasswordReset(email: string) {
    await this.waitForOpen();
    await this.fillEmail(email);
    await this.submit();
  }

  async switchToMode(mode: AuthMode) {
    if (mode === 'register') await this.linkToRegister.click();
    if (mode === 'login') await this.linkToLogin.click();
    if (mode === 'reset') await this.linkForgotPassword.click();
    await this.page.waitForTimeout(300);
  }

  async expectError(text?: string | RegExp) {
    await expect(this.errorMessage).toBeVisible();
    if (text) await expect(this.errorMessage).toContainText(text);
  }

  async expectSuccess(text?: string | RegExp) {
    await expect(this.successMessage).toBeVisible();
    if (text) await expect(this.successMessage).toContainText(text);
  }

  async expectLoading() {
    await expect(this.loadingSpinner).toBeVisible();
  }

  async close() {
    await this.btnClose.click();
    await this.waitForClose();
  }

  async closeByOverlay() {
    // Click top-left corner of the backdrop overlay (outside the centered panel)
    await this.modal.click({ position: { x: 10, y: 10 } });
    await this.waitForClose();
  }
}
