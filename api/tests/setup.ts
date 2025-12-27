/**
 * Test Setup
 * ==========
 * Global test configuration and helpers.
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// Mock database module before any imports
vi.mock('../src/db/index.js', () => {
  let dbHealthy = true;
  let mockUsers: Map<number, any> = new Map();

  return {
    getDatabase: vi.fn(() => ({
      query: {
        users: {
          findFirst: vi.fn(async ({ where }: any) => {
            // Simple mock - find by telegramId
            for (const user of mockUsers.values()) {
              if (where && user.telegramId === where.telegramId) {
                return user;
              }
            }
            return undefined;
          }),
        },
      },
      insert: vi.fn(() => ({
        values: vi.fn(async (data: any) => {
          mockUsers.set(data.telegramId, data);
          return { rowsAffected: 1 };
        }),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(async () => ({ rowsAffected: 1 })),
        })),
      })),
    })),
    users: {
      telegramId: 'telegramId',
      id: 'id',
    },
    isDatabaseHealthy: vi.fn(() => dbHealthy),
    setDatabaseHealthy: (value: boolean) => { dbHealthy = value; },
    clearMockUsers: () => { mockUsers.clear(); },
    addMockUser: (user: any) => { mockUsers.set(user.telegramId, user); },
  };
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Export test bot token
export const TEST_BOT_TOKEN = '1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh';
export const TEST_JWT_SECRET = 'test-jwt-secret-key-1234567890abcdef';
