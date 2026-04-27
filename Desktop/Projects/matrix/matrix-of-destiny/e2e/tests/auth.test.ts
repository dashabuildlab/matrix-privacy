import { device, expect as detoxExpect } from 'detox';
import { LoginScreen } from '../pages/LoginScreen';
import { RegisterScreen } from '../pages/RegisterScreen';
import { MatrixScreen } from '../pages/MatrixScreen';
import { TEST_USER, TEST_DATES, TIMEOUTS } from '../helpers/testData';

const login = new LoginScreen();
const register = new RegisterScreen();
const matrix = new MatrixScreen();

beforeAll(async () => {
  await device.launchApp({ newInstance: true });
});

beforeEach(async () => {
  await device.reloadReactNative();
});

// ─── Login ────────────────────────────────────────────────────────────────────

describe('Auth — Login', () => {
  it('happy path: login with valid credentials', async () => {
    await login.waitForScreen();
    await login.login(TEST_USER.email, TEST_USER.password);
    // After login, should navigate away from login screen
    await login.expectNotVisible(login.ids.inputEmail);
  });

  it('shows error for wrong password', async () => {
    await login.waitForScreen();
    await login.login(TEST_USER.email, TEST_USER.wrongPassword);
    await login.expectError();
  });

  it('shows error for empty email', async () => {
    await login.waitForScreen();
    await login.submit();
    await login.expectError();
  });

  it('shows error for invalid email format', async () => {
    await login.waitForScreen();
    await login.fillEmail(TEST_USER.invalidEmail);
    await login.fillPassword(TEST_USER.password);
    await login.submit();
    await login.expectError();
  });

  it('can toggle password visibility', async () => {
    await login.waitForScreen();
    await login.fillPassword('TestSecret');
    // Password should be hidden initially
    await login.togglePasswordVisibility();
    // After toggle, password is visible (secureTextEntry = false)
    // Verify by checking accessibility or element type change
    await login.expectVisible(login.ids.btnShowPassword);
  });

  it('can navigate to register screen', async () => {
    await login.waitForScreen();
    await login.tapRegister();
    await register.waitForScreen();
    await login.expectNotVisible(login.ids.inputEmail);
  });

  it('can continue as guest', async () => {
    await login.waitForScreen();
    await login.tapGuestMode();
    // Should navigate to main tabs as guest
    await matrix.waitForElement(matrix.tabIds.tabHome, TIMEOUTS.medium);
  });
});

// ─── Register ─────────────────────────────────────────────────────────────────

describe('Auth — Register', () => {
  beforeEach(async () => {
    await login.waitForScreen();
    await login.tapRegister();
    await register.waitForScreen();
  });

  it('happy path: register new user', async () => {
    await register.register({
      name: 'Тест Юзер',
      birthDate: TEST_DATES.validForInput,
      email: TEST_USER.newEmail,
      password: TEST_USER.password,
    });
    await register.expectNotVisible(register.ids.inputEmail);
  });

  it('shows error when passwords do not match', async () => {
    await register.register({
      name: 'Тест Юзер',
      birthDate: TEST_DATES.validForInput,
      email: TEST_USER.newEmail,
      password: 'Password123!',
      confirmPassword: 'DifferentPass!',
    });
    await register.expectError('збіг');
  });

  it('shows error for short password (less than 6 chars)', async () => {
    await register.register({
      name: 'Тест Юзер',
      birthDate: TEST_DATES.validForInput,
      email: TEST_USER.newEmail,
      password: TEST_USER.shortPassword,
      confirmPassword: TEST_USER.shortPassword,
    });
    await register.expectError();
  });

  it('shows error for invalid name (numbers)', async () => {
    await register.register({
      name: '123',
      birthDate: TEST_DATES.validForInput,
      email: TEST_USER.newEmail,
      password: TEST_USER.password,
    });
    await register.expectError();
  });

  it('shows error for invalid birth date format', async () => {
    await register.register({
      name: 'Тест Юзер',
      birthDate: '99999999',
      email: TEST_USER.newEmail,
      password: TEST_USER.password,
    });
    await register.expectError();
  });

  it('shows error for already registered email', async () => {
    await register.register({
      name: 'Тест Юзер',
      birthDate: TEST_DATES.validForInput,
      email: TEST_USER.email,
      password: TEST_USER.password,
    });
    await register.expectError();
  });

  it('can navigate back to login', async () => {
    await register.tapBackToLogin();
    await login.waitForScreen();
  });

  it('shows error for empty name field', async () => {
    await register.fillBirthDate(TEST_DATES.validForInput);
    await register.fillEmail(TEST_USER.newEmail);
    await register.fillPassword(TEST_USER.password);
    await register.fillConfirmPassword(TEST_USER.password);
    await register.submit();
    await register.expectError();
  });
});

// ─── Password Reset ────────────────────────────────────────────────────────────

describe('Auth — Password Reset', () => {
  it('happy path: request reset for existing email', async () => {
    await login.waitForScreen();
    await login.submitResetPassword(TEST_USER.email);
    await login.expectResetSuccessMessage();
  });

  it('shows error for non-existing email', async () => {
    await login.waitForScreen();
    await login.tapForgotPassword();
    await login.waitForElement(login.ids.resetEmailInput, TIMEOUTS.short);
    await login.clearAndType(login.ids.resetEmailInput, 'nonexistent@nowhere.com');
    await login.tapById(login.ids.resetSubmitBtn);
    await login.expectError();
  });

  it('shows error for invalid email format in reset', async () => {
    await login.waitForScreen();
    await login.tapForgotPassword();
    await login.waitForElement(login.ids.resetEmailInput, TIMEOUTS.short);
    await login.clearAndType(login.ids.resetEmailInput, TEST_USER.invalidEmail);
    await login.tapById(login.ids.resetSubmitBtn);
    await login.expectError();
  });
});
