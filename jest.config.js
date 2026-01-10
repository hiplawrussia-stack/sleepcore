/**
 * Jest Configuration for SleepCore
 * Based on byte-bot patterns, adapted for SleepCore DTx
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    // Exclude interfaces (no logic to test)
    '!src/**/interfaces/**/*.ts',
    // Exclude database infrastructure (requires real DB connections)
    // Note: Database integration tests are separate from unit tests
    '!src/infrastructure/database/**/*.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 50,
      lines: 45,
      statements: 45,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testTimeout: 10000,
  moduleNameMapper: {
    '^@sleepcore/(.*)$': '<rootDir>/src/$1',
    '^@cognicore/engine$': '<rootDir>/packages/cognicore-engine/dist/index.js',
  },
  // Verbose output for debugging
  verbose: true,
};
