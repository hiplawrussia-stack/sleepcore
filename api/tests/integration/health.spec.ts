/**
 * Health Routes Integration Tests
 * ================================
 * Tests for health check endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApp } from '../../src/app.js';
import { setInitialized } from '../../src/routes/health.js';

// Control mock state
let mockDbHealthy = true;

// Mock the database module
vi.mock('../../src/db/index.js', () => {
  return {
    getDatabase: vi.fn(() => ({})),
    isDatabaseHealthy: vi.fn(() => mockDbHealthy),
    users: {},
  };
});

describe('Health Routes', () => {
  const app = createApp({
    botToken: 'test-bot-token',
    jwtSecret: 'test-jwt-secret',
  });

  beforeEach(() => {
    // Reset states before each test
    setInitialized(false);
    mockDbHealthy = true;
  });

  describe('GET /health/live', () => {
    it('should return ok status', async () => {
      const res = await app.request('/health/live');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
      expect(typeof data.timestamp).toBe('number');
    });

    it('should always return 200 regardless of other states', async () => {
      setInitialized(false);
      mockDbHealthy = false;

      const res = await app.request('/health/live');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /health/ready', () => {
    it('should return ready when database is healthy', async () => {
      mockDbHealthy = true;

      const res = await app.request('/health/ready');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('ready');
      expect(data.checks.database).toBe('connected');
    });
  });

  describe('GET /health/startup', () => {
    it('should return 503 when not initialized', async () => {
      setInitialized(false);

      const res = await app.request('/health/startup');
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data.status).toBe('starting');
    });

    it('should return 200 when initialized', async () => {
      setInitialized(true);

      const res = await app.request('/health/startup');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('started');
    });
  });

  describe('GET /health', () => {
    it('should return unhealthy when not initialized', async () => {
      setInitialized(false);
      mockDbHealthy = true;

      const res = await app.request('/health');
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.checks.initialized).toBe(false);
    });

    it('should include version and uptime fields', async () => {
      setInitialized(true);
      mockDbHealthy = true;

      const res = await app.request('/health');
      const data = await res.json();

      expect(data.version).toBeDefined();
      expect(typeof data.uptime).toBe('number');
      expect(data.uptime).toBeGreaterThanOrEqual(0);
      expect(data.checks).toBeDefined();
    });
  });

  describe('Root endpoint', () => {
    it('should return API info', async () => {
      const res = await app.request('/');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.name).toBe('SleepCore API');
      expect(data.version).toBe('1.0.0');
      expect(data.status).toBe('running');
    });
  });
});
