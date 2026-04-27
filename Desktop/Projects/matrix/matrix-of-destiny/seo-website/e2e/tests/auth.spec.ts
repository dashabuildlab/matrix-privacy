import { test, expect } from '@playwright/test';
import { HeaderComponent } from '../pages/HeaderComponent';
import { AuthModalPage } from '../pages/AuthModalPage';
import { TEST_USER, ROUTES } from '../fixtures/testData';

// Serial mode prevents Firebase rate-limiting when multiple workers login simultaneously
test.describe.configure({ mode: 'serial' });

test.describe('Auth — Login', () => {
  let header: HeaderComponent;
  let modal: AuthModalPage;

  test.beforeEach(async ({ page }) => {
    header = new HeaderComponent(page);
    modal = new AuthModalPage(page);
    await page.goto(ROUTES.home);
  });

  test('happy path: login with valid credentials', async ({ page }) => {
    await header.clickLogin();
    await modal.login(TEST_USER.email, TEST_USER.password);
    await modal.waitForClose();
    await header.expectLoggedIn(TEST_USER.email);
  });

  test('shows error for wrong password', async () => {
    await header.clickLogin();
    await modal.login(TEST_USER.email, TEST_USER.wrongPassword);
    await modal.expectError(/невірний|invalid|wrong|incorrect/i);
  });

  test('shows error for invalid email format', async () => {
    await header.clickLogin();
    await modal.fillEmail(TEST_USER.invalidEmail);
    await modal.fillPassword(TEST_USER.password);
    await modal.submit();
    await modal.expectError(/пошт|email|не знайд|невірн/i);
  });

  test('shows error for empty email', async () => {
    await header.clickLogin();
    await modal.submit();
    await modal.expectError(/заповн|fill/i);
  });

  test('disables submit button while loading', async ({ page }) => {
    await page.route('**/identitytoolkit**', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.continue();
    });
    await header.clickLogin();
    await modal.fillEmail(TEST_USER.email);
    await modal.fillPassword(TEST_USER.password);
    await modal.submit();
    await expect(modal.btnSubmit).toBeDisabled();
  });

  test('can close modal with X button', async () => {
    await header.clickLogin();
    await modal.waitForOpen();
    await modal.close();
    await header.expectLoggedOut();
  });

  test('can close modal by clicking overlay', async () => {
    await header.clickLogin();
    await modal.waitForOpen();
    await modal.closeByOverlay();
    await header.expectLoggedOut();
  });

  test('switches to register mode', async () => {
    await header.clickLogin();
    await modal.waitForOpen();
    await modal.switchToMode('register');
    await expect(modal.inputConfirmPassword).toBeVisible();
  });

  test('switches to reset password mode', async () => {
    await header.clickLogin();
    await modal.waitForOpen();
    await modal.switchToMode('reset');
    await expect(modal.inputPassword).not.toBeVisible();
    await expect(modal.inputEmail).toBeVisible();
  });
});

test.describe('Auth — Register', () => {
  let header: HeaderComponent;
  let modal: AuthModalPage;

  test.beforeEach(async ({ page }) => {
    header = new HeaderComponent(page);
    modal = new AuthModalPage(page);
    await page.goto(ROUTES.home);
    await header.clickRegister();
    await modal.waitForOpen();
  });

  test('happy path: register new user', async () => {
    await modal.register(TEST_USER.newUserEmail, TEST_USER.password);
    await modal.waitForClose();
    await header.expectLoggedIn();
  });

  test('shows error when passwords do not match', async () => {
    await modal.fillEmail(TEST_USER.newUserEmail);
    await modal.fillPassword('Password123!');
    await modal.fillConfirmPassword('DifferentPass!');
    await modal.submit();
    await modal.expectError(/збігаютьс|match|співпадає/i);
  });

  test('shows error for short password', async () => {
    await modal.fillEmail(TEST_USER.newUserEmail);
    await modal.fillPassword(TEST_USER.invalidPassword);
    await modal.fillConfirmPassword(TEST_USER.invalidPassword);
    await modal.submit();
    await modal.expectError(/6|короткий|short/i);
  });

  test('shows error for already used email', async () => {
    await modal.register(TEST_USER.email, TEST_USER.password);
    await modal.expectError(/вже зареєстр|already registered|in use/i);
  });

  test('shows error for empty fields', async () => {
    await modal.submit();
    await modal.expectError();
  });
});

test.describe('Auth — Password Reset', () => {
  let header: HeaderComponent;
  let modal: AuthModalPage;

  test.beforeEach(async ({ page }) => {
    header = new HeaderComponent(page);
    modal = new AuthModalPage(page);
    await page.goto(ROUTES.home);
    await header.clickLogin();
    await modal.waitForOpen();
    await modal.switchToMode('reset');
  });

  test('happy path: request password reset', async () => {
    await modal.requestPasswordReset(TEST_USER.email);
    await modal.expectSuccess(/надіслано|sent/i);
  });

  test.skip('shows error for non-existing email', async () => {
    // Firebase does not return an error for non-existing emails in reset flow (security feature)
    await modal.requestPasswordReset('nonexistent@example.com');
    await modal.expectError(/не знайд|not found|no user/i);
  });

  test.skip('shows error for invalid email format', async () => {
    // Firebase password reset silently succeeds regardless of email existence (security feature)
    await modal.requestPasswordReset(TEST_USER.invalidEmail);
    await modal.expectError(/email/i);
  });
});

test.describe('Auth — Logout', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated state via localStorage/cookie mock
    await page.goto(ROUTES.home);
    const header = new HeaderComponent(page);
    const modal = new AuthModalPage(page);
    await header.clickLogin();
    await modal.login(TEST_USER.email, TEST_USER.password);
    await modal.waitForClose();
  });

  test('happy path: logout successfully', async ({ page }) => {
    const header = new HeaderComponent(page);
    await header.logout();
    await header.expectLoggedOut();
  });

  test('redirects to home after logout', async ({ page }) => {
    const header = new HeaderComponent(page);
    await header.logout();
    await expect(page).toHaveURL(ROUTES.home);
  });
});

test.describe('Auth — Google OAuth', () => {
  test('Google button is visible in login modal', async ({ page }) => {
    const header = new HeaderComponent(page);
    const modal = new AuthModalPage(page);
    await page.goto(ROUTES.home);
    await header.clickLogin();
    await modal.waitForOpen();
    await expect(modal.btnGoogle).toBeVisible();
  });
});
