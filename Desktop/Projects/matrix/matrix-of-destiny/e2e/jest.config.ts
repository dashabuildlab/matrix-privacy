import type { Config } from 'jest';

const config: Config = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/tests/**/*.test.ts'],
  testTimeout: 120_000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'e2e/tsconfig.json' }],
  },
};

export default config;
