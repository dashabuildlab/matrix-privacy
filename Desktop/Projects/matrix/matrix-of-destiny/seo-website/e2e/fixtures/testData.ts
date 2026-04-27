export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test+e2e@matrixofdestiny.com',
  password: process.env.TEST_USER_PASSWORD || 'TestPass123!',
  invalidEmail: 'notexist@randomdomain-e2e-xyz.com', // valid format so browser validation passes; Firebase returns user-not-found
  invalidPassword: '123',
  wrongPassword: 'WrongPass999!',
  newUserEmail: `test+${Date.now()}@matrixofdestiny.com`,
};

export const ROUTES = {
  home: '/uk/',
  calculator: '/uk/kalkulyator-matrytsi-doli/',
  compatibility: '/uk/kalkulyator-sumisnosti/',
  aiChat: '/uk/ai-chat/',
  wiki: '/uk/wiki/',
  privacy: '/uk/privacy/',
  dailyMatrix: '/uk/matrytsya-dnya/',
};

// HTML type="date" inputs require YYYY-MM-DD format
export const TEST_DATES = {
  valid: '1992-03-15',
  valid2: '1985-07-20',
  futureDate: '2050-03-15',
  tooOld: '1800-01-01',
  edgeLeapYear: '2000-02-29',
  nonLeapYear: '2001-02-28',
};

export const AI_CHAT = {
  validMessage: 'Що означає число 7 в Матриці Долі?',
  longMessage: 'А'.repeat(2001),
  emptyMessage: '   ',
  xssAttempt: '<script>alert("xss")</script>',
  sqlAttempt: "' OR 1=1; DROP TABLE users;--",
  dailyLimit: 5,
  storageKey: 'mod_ai_chat_usage',
};

export const TIMEOUTS = {
  short: 3_000,
  medium: 10_000,
  long: 30_000,
  apiResponse: 20_000,
};
