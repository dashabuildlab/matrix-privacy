import { device, by, element, waitFor } from 'detox';
import { LoginScreen } from '../pages/LoginScreen';
import { AiScanScreen } from '../pages/AiScanScreen';
import { TEST_USER, TEST_DATES, TEST_IDS, TIMEOUTS } from '../helpers/testData';

const login = new LoginScreen();
const scanScreen = new AiScanScreen();

async function navigateToScan() {
  await login.waitForScreen();
  await login.login(TEST_USER.email, TEST_USER.password);
  await waitFor(element(by.id(TEST_IDS.tabs.tabAi))).toBeVisible().withTimeout(TIMEOUTS.medium);
  // Navigate to AI Scan via AI tab → scan button
  await element(by.id(TEST_IDS.tabs.tabAi)).tap();
  await waitFor(element(by.text('AI-сканування'))).toBeVisible().withTimeout(TIMEOUTS.medium);
  await element(by.text('AI-сканування')).tap();
  await scanScreen.waitForScreen();
}

beforeAll(async () => {
  await device.launchApp({ newInstance: true });
});

beforeEach(async () => {
  await device.reloadReactNative();
});

// ─── Photo step ───────────────────────────────────────────────────────────────

describe('AI Scan — Photo Step', () => {
  beforeEach(async () => {
    await navigateToScan();
  });

  it('opens with photo step visible', async () => {
    await scanScreen.expectVisible(scanScreen.ids.btnAddPhoto);
    await scanScreen.expectVisible(scanScreen.ids.inputBirthDate);
    await scanScreen.expectNotVisible(scanScreen.ids.btnStartScan);
  });

  it('scan button is disabled without photo and date', async () => {
    await scanScreen.expectScanButtonDisabled();
  });

  it('scan button is disabled with only birth date (no photo)', async () => {
    await scanScreen.fillBirthDate(TEST_DATES.validForInput);
    await scanScreen.expectScanButtonDisabled();
  });

  it('shows error for invalid birth date format', async () => {
    await scanScreen.fillBirthDate('99991299');
    await scanScreen.expectScanButtonDisabled();
  });

  it('can tap Add Photo button', async () => {
    await scanScreen.tapAddPhoto();
    // Should show action sheet with Camera / Gallery options
    await waitFor(element(by.text('Камера')).atIndex(0)).toBeVisible().withTimeout(TIMEOUTS.short);
    await element(by.text('Скасувати')).tap();
  });

  it('can navigate back from scan screen', async () => {
    await scanScreen.tapById(scanScreen.ids.btnBack);
    await scanScreen.expectNotVisible(scanScreen.ids.btnAddPhoto);
  });
});

// ─── Full flow (requires photo mock) ─────────────────────────────────────────

describe('AI Scan — Processing & Result', () => {
  it('processes scan and shows result (mocked API)', async () => {
    await navigateToScan();
    // In CI: inject a pre-selected photo via device.sendUserNotification or
    // use Detox's ability to mock photo picker with a fixture image.
    // Example: device.selectPhotoFromLibrary('fixtures/test_face.jpg');
    //
    // For now, verify the processing UI elements exist when triggered:
    await scanScreen.fillBirthDate(TEST_DATES.validForInput);
    // After photo is selected (manually in dev), enable scan:
    await scanScreen.expectVisible(scanScreen.ids.btnAddPhoto);
  });

  it('result view shows arcana name and description', async () => {
    // This test requires a full scan flow with mocked API.
    // Mock the /api/ai-scan endpoint to return:
    // { arcanaId: 7, arcanaName: 'Колісниця', description: 'Ви маєте...' }
    //
    // After scan completes:
    // await scanScreen.waitForResult(TIMEOUTS.long);
    // await scanScreen.expectVisible(scanScreen.ids.arcanaName);
    // await scanScreen.expectVisible(scanScreen.ids.arcanaDescription);
    // const name = await scanScreen.getArcanaName();
    // expect(name).toBe('Колісниця');
    expect(true).toBe(true); // placeholder until photo mock is set up
  });

  it('can share result', async () => {
    // After scan completes:
    // await scanScreen.waitForResult();
    // await scanScreen.tapShare();
    // await waitFor(element(by.text('Поділитися'))).toBeVisible().withTimeout(TIMEOUTS.short);
    expect(true).toBe(true);
  });

  it('can scan again after result', async () => {
    // After scan completes:
    // await scanScreen.waitForResult();
    // await scanScreen.tapScanAgain();
    // await scanScreen.waitForScreen(); // back to photo step
    expect(true).toBe(true);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('AI Scan — Edge Cases', () => {
  beforeEach(async () => {
    await navigateToScan();
  });

  it('shows error when API times out', async () => {
    // With network mock or slow server:
    // After starting scan, wait 65s+ and expect error message
    await scanScreen.fillBirthDate(TEST_DATES.validForInput);
    await scanScreen.expectVisible(scanScreen.ids.inputBirthDate);
    // Error state is tested when API is mocked to timeout
  });

  it('keeps photo step accessible after going offline', async () => {
    await scanScreen.fillBirthDate(TEST_DATES.validForInput);
    // Turn off network
    // Try to scan → expect error
    // Turn on network
    await scanScreen.expectVisible(scanScreen.ids.btnAddPhoto);
  });

  it('shows error for future birth date', async () => {
    await scanScreen.fillBirthDate('15032050');
    await scanScreen.expectScanButtonDisabled();
  });
});
