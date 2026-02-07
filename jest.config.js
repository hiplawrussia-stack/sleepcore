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
    // Exclude database connection implementations (requires real DB)
    '!src/infrastructure/database/sqlite/**/*.ts',
    '!src/infrastructure/database/postgres/**/*.ts',
    // Keep repositories and security in coverage (unit testable with mocks)
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
    '^uuid$': '<rootDir>/packages/cognicore-engine/src/__mocks__/uuid.ts',
  },
  // Verbose output for debugging
  verbose: true,
};
