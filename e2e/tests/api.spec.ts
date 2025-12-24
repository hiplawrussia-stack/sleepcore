/**
 * API E2E Tests
 * =============
 * Direct API endpoint tests.
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:3001';

test.describe('API Health', () => {
  test('should return healthy status', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('healthy');
  });
});

test.describe('API Authentication', () => {
  test('should reject request without auth', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/user/profile`);

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test('should reject invalid initData', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/auth/telegram`, {
      data: {
        initData: 'invalid_init_data',
      },
    });

    // Should return 401 for invalid data
    expect(response.status()).toBe(401);
  });
});

test.describe('API Breathing Endpoints', () => {
  // These tests require authentication
  // In a real scenario, we'd need to set up auth first

  test('should require auth for stats', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/breathing/stats`);
    expect(response.status()).toBe(401);
  });

  test('should require auth for history', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/breathing/history`);
    expect(response.status()).toBe(401);
  });

  test('should require auth for session logging', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/breathing/session`, {
      data: {
        patternId: 'box-breathing',
        patternName: 'Box Breathing',
        cycles: 4,
        duration: 240,
      },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe('API User Endpoints', () => {
  test('should require auth for profile', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/user/profile`);
    expect(response.status()).toBe(401);
  });

  test('should require auth for evolution', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/user/evolution`);
    expect(response.status()).toBe(401);
  });

  test('should require auth for quests', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/user/quests`);
    expect(response.status()).toBe(401);
  });

  test('should require auth for badges', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/user/badges`);
    expect(response.status()).toBe(401);
  });
});

test.describe('API Sync Endpoints', () => {
  test('should require auth for sync status', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/sync/status`);
    expect(response.status()).toBe(401);
  });

  test('should require auth for sync changes', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/sync/changes`);
    expect(response.status()).toBe(401);
  });

  test('should require auth for sync push', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/sync/push`, {
      data: {
        changes: [],
        lastSyncTime: 0,
      },
    });
    expect(response.status()).toBe(401);
  });
});
