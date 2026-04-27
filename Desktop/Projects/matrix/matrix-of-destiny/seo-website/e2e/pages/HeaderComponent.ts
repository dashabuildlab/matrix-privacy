import { Page, Locator, expect } from '@playwright/test';

export class HeaderComponent {
  readonly logo: Locator;
  readonly navCalculator: Locator;
  readonly navCompatibility: Locator;
  readonly navDailyMatrix: Locator;
  readonly navAiChat: Locator;
  readonly navWiki: Locator;
  readonly btnLogin: Locator;
  readonly btnRegister: Locator;
  readonly btnMobileMenu: Locator;
  readonly userAvatar: Locator;
  readonly userDropdown: Locator;
  readonly btnLogout: Locator;

  constructor(private page: Page) {
    this.logo = page.locator('nav a').filter({ hasText: /Matrix/ }).first();
    this.navCalculator = page.locator('nav a').filter({ hasText: /Калькулятор|Calculator/ }).first();
    this.navCompatibility = page.locator('nav a').filter({ hasText: /Сумісн|Compatib/ }).first();
    this.navDailyMatrix = page.locator('nav a').filter({ hasText: /Щоденн|Daily/ }).first();
    this.navAiChat = page.locator('nav a').filter({ hasText: /AI/ }).first();
    this.navWiki = page.locator('nav a').filter({ hasText: /Wiki/ }).first();
    this.btnLogin = page.locator('nav button').filter({ hasText: /Увійти|Sign in/ }).first();
    this.btnRegister = page.locator('nav button').filter({ hasText: /Реєстрація|Sign up/ }).first();
    this.btnMobileMenu = page.locator('nav button[aria-label]').first();
    // Avatar button contains an inner div with initials (w-7 h-7 rounded-full); Register button does not
    this.userAvatar = page.locator('nav button:has(div.rounded-full)').first();
    this.userDropdown = page.locator('nav div').filter({ hasText: /Вийти|Sign out/ }).last();
    this.btnLogout = page.locator('nav button').filter({ hasText: /Вийти|Sign out/ }).last();
  }

  async clickLogin() {
    await this.btnLogin.click();
  }

  async clickRegister() {
    await this.btnRegister.click();
  }

  async navigateToCalculator() {
    await this.navCalculator.click();
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToCompatibility() {
    await this.navCompatibility.click();
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToAiChat() {
    await this.navAiChat.click();
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToWiki() {
    await this.navWiki.click();
    await this.page.waitForLoadState('networkidle');
  }

  async logout() {
    await this.userAvatar.click();
    await this.userDropdown.waitFor({ state: 'visible' });
    await this.btnLogout.click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoggedIn(email?: string) {
    await expect(this.userAvatar).toBeVisible();
    await expect(this.btnLogin).not.toBeVisible();
    if (email) {
      await this.userAvatar.click();
      await expect(this.page.getByText(email)).toBeVisible();
      await this.page.keyboard.press('Escape');
    }
  }

  async expectLoggedOut() {
    await expect(this.btnLogin).toBeVisible();
    await expect(this.userAvatar).not.toBeVisible();
  }

  async openMobileMenu() {
    await this.btnMobileMenu.click();
    await this.page.waitForTimeout(300);
  }
}
