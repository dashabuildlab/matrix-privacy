export const TEST_USER = {
  email: process.env.E2E_USER_EMAIL ?? 'test+e2e@matrixofdestiny.com',
  password: process.env.E2E_USER_PASSWORD ?? 'TestPass123!',
  wrongPassword: 'WrongPassword99!',
  invalidEmail: 'not-an-email',
  shortPassword: '12345',
  newEmail: `test+${Date.now()}@matrixofdestiny.com`,
};

export const TEST_DATES = {
  valid: '15.03.1992',
  validForInput: '15031992',
  invalidFormat: '1992/03/15',
  futureYear: '15.03.2050',
  leapYear: '29.02.2000',
  nonLeapYear: '29.02.2001',
};

export const TIMEOUTS = {
  short: 3_000,
  medium: 10_000,
  long: 30_000,
  animation: 1_000,
  networkMock: 5_000,
};

// testID values to add to source components
export const TEST_IDS = {
  // Login screen — app/auth/login.tsx
  login: {
    inputEmail: 'login-email-input',
    inputPassword: 'login-password-input',
    btnSubmit: 'login-submit-btn',
    btnGoogle: 'login-google-btn',
    btnApple: 'login-apple-btn',
    btnForgotPassword: 'login-forgot-btn',
    linkRegister: 'login-register-link',
    btnGuest: 'login-guest-btn',
    errorMessage: 'login-error-msg',
    loadingIndicator: 'login-loading',
    btnShowPassword: 'login-show-password-btn',
    // Reset password modal
    resetModal: 'reset-modal',
    resetEmailInput: 'reset-email-input',
    resetSubmitBtn: 'reset-submit-btn',
    resetSuccessMsg: 'reset-success-msg',
  },
  // Register screen — app/auth/register.tsx
  register: {
    inputName: 'register-name-input',
    inputBirthDate: 'register-birthdate-input',
    inputEmail: 'register-email-input',
    inputPassword: 'register-password-input',
    inputConfirmPassword: 'register-confirm-password-input',
    btnSubmit: 'register-submit-btn',
    linkLogin: 'register-login-link',
    errorMessage: 'register-error-msg',
    loadingIndicator: 'register-loading',
  },
  // AI Chat — app/ai/chat.tsx
  aiChat: {
    inputMessage: 'chat-input',
    btnSend: 'chat-send-btn',
    messagesList: 'chat-messages-list',
    assistantMessage: 'chat-assistant-message',
    userMessage: 'chat-user-message',
    typingIndicator: 'chat-typing-indicator',
    btnRenameTitle: 'chat-rename-title-btn',
    renameModal: 'chat-rename-modal',
    renameInput: 'chat-rename-input',
    renameSaveBtn: 'chat-rename-save-btn',
    renameCancelBtn: 'chat-rename-cancel-btn',
    btnHistory: 'chat-history-btn',
    btnBack: 'chat-back-btn',
    btnSpeak: 'chat-speak-btn',
    btnCopy: 'chat-copy-btn',
    btnPaywall: 'chat-paywall-btn',
    emptyState: 'chat-empty-state',
  },
  // AI Scan — app/ai-scan/index.tsx
  aiScan: {
    btnAddPhoto: 'scan-add-photo-btn',
    inputBirthDate: 'scan-birthdate-input',
    btnStartScan: 'scan-start-btn',
    processingView: 'scan-processing-view',
    resultView: 'scan-result-view',
    arcanaName: 'scan-arcana-name',
    arcanaDescription: 'scan-description',
    btnShare: 'scan-share-btn',
    btnScanAgain: 'scan-again-btn',
    btnBack: 'scan-back-btn',
    errorMessage: 'scan-error-msg',
  },
  // Matrix screen — app/(tabs)/matrix.tsx
  matrix: {
    matrixView: 'matrix-view',
    btnUnlock: 'matrix-unlock-btn',
    btnCompatibility: 'matrix-compatibility-btn',
    btnConflict: 'matrix-conflict-btn',
    btnAiRecommendations: 'matrix-ai-recommendations-btn',
    btnDownload: 'matrix-download-btn',
    crystalBalance: 'matrix-crystal-balance',
  },
  // Paywall — app/paywall.tsx
  paywall: {
    planMonthly: 'paywall-plan-monthly',
    planYearly: 'paywall-plan-yearly',
    btnSubscribe: 'paywall-subscribe-btn',
    btnRestore: 'paywall-restore-btn',
    btnClose: 'paywall-close-btn',
    priceMonthly: 'paywall-price-monthly',
    priceYearly: 'paywall-price-yearly',
  },
  // Tab bar — app/(tabs)/_layout.tsx
  tabs: {
    tabHome: 'tab-home',
    tabAi: 'tab-ai',
    tabMatrix: 'tab-matrix',
    tabLearn: 'tab-learn',
    tabProfile: 'tab-profile',
  },
};
