/**
 * Jest Setup File for SleepCore
 * Runs before all tests
 */

// Set test environment
beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_TYPE = 'sqlite';
  process.env.SQLITE_PATH = ':memory:';
});

// Cleanup after all tests
afterAll(async () => {
  // Clean up any global resources
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

// Custom matcher for range checking
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

export {};
