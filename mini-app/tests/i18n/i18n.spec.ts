/**
 * i18n Configuration Tests
 * ========================
 * Tests for internationalization setup and translation files.
 *
 * IEC 62304 Compliance:
 * - UI localization verification per §5.5
 * - Accessibility for international users
 *
 * @module @sleepcore/mini-app/tests/i18n
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env before importing i18n
vi.mock('@/env', () => ({
  env: {
    DEV: false,
    PROD: true,
  },
}));

describe('i18n configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  describe('language support', () => {
    it('should default to Russian (ru)', async () => {
      const i18n = (await import('@/i18n')).default;

      expect(i18n.options.fallbackLng).toContain('ru');
    });

    it('should support Russian and English', async () => {
      const i18n = (await import('@/i18n')).default;

      expect(i18n.options.supportedLngs).toContain('ru');
      expect(i18n.options.supportedLngs).toContain('en');
    });

    it('should have Russian translations bundle', async () => {
      const i18n = (await import('@/i18n')).default;

      expect(i18n.hasResourceBundle('ru', 'translation')).toBe(true);
    });

    it('should have English translations bundle', async () => {
      const i18n = (await import('@/i18n')).default;

      expect(i18n.hasResourceBundle('en', 'translation')).toBe(true);
    });
  });

  describe('interpolation settings', () => {
    it('should not escape values (React handles escaping)', async () => {
      const i18n = (await import('@/i18n')).default;

      expect(i18n.options.interpolation?.escapeValue).toBe(false);
    });
  });

  describe('detection settings', () => {
    it('should cache language in localStorage', async () => {
      const i18n = (await import('@/i18n')).default;

      const detection = i18n.options.detection;
      expect(detection?.caches).toContain('localStorage');
    });

    it('should use sleepcore_language localStorage key', async () => {
      const i18n = (await import('@/i18n')).default;

      const detection = i18n.options.detection;
      expect(detection?.lookupLocalStorage).toBe('sleepcore_language');
    });

    it('should prioritize telegram language detector', async () => {
      const i18n = (await import('@/i18n')).default;

      const detection = i18n.options.detection;
      expect(detection?.order?.[0]).toBe('telegram');
    });
  });
});

describe('translation files structure', () => {
  it('should have matching top-level keys', async () => {
    const ru = await import('@/i18n/locales/ru.json');
    const en = await import('@/i18n/locales/en.json');

    const ruData = ru.default || ru;
    const enData = en.default || en;

    const ruKeys = Object.keys(ruData);
    const enKeys = Object.keys(enData);

    // Both should have the same top-level sections
    for (const key of ruKeys) {
      expect(enKeys).toContain(key);
    }
  });

  it('should have common section', async () => {
    const ru = await import('@/i18n/locales/ru.json');
    const en = await import('@/i18n/locales/en.json');

    const ruData = ru.default || ru;
    const enData = en.default || en;

    expect(ruData.common).toBeDefined();
    expect(enData.common).toBeDefined();
  });

  it('should have home section', async () => {
    const ru = await import('@/i18n/locales/ru.json');
    const en = await import('@/i18n/locales/en.json');

    const ruData = ru.default || ru;
    const enData = en.default || en;

    expect(ruData.home).toBeDefined();
    expect(enData.home).toBeDefined();
  });

  it('should have profile section', async () => {
    const ru = await import('@/i18n/locales/ru.json');
    const en = await import('@/i18n/locales/en.json');

    const ruData = ru.default || ru;
    const enData = en.default || en;

    expect(ruData.profile).toBeDefined();
    expect(enData.profile).toBeDefined();
  });

  it('should have breathing section', async () => {
    const ru = await import('@/i18n/locales/ru.json');
    const en = await import('@/i18n/locales/en.json');

    const ruData = ru.default || ru;
    const enData = en.default || en;

    expect(ruData.breathing).toBeDefined();
    expect(enData.breathing).toBeDefined();
  });

  it('should have errors section', async () => {
    const ru = await import('@/i18n/locales/ru.json');
    const en = await import('@/i18n/locales/en.json');

    const ruData = ru.default || ru;
    const enData = en.default || en;

    expect(ruData.errors).toBeDefined();
    expect(enData.errors).toBeDefined();
  });
});

describe('translation content', () => {
  it('should have valid common.error translation', async () => {
    const ru = await import('@/i18n/locales/ru.json');

    const ruData = ru.default || ru;

    expect(ruData.common?.error).toBeTruthy();
    expect(typeof ruData.common?.error).toBe('string');
  });

  it('should have valid common.retry translation', async () => {
    const ru = await import('@/i18n/locales/ru.json');

    const ruData = ru.default || ru;

    expect(ruData.common?.retry).toBeTruthy();
    expect(typeof ruData.common?.retry).toBe('string');
  });

  it('should have valid common.loading translation', async () => {
    const ru = await import('@/i18n/locales/ru.json');

    const ruData = ru.default || ru;

    expect(ruData.common?.loading).toBeTruthy();
    expect(typeof ruData.common?.loading).toBe('string');
  });

  it('should have home greeting translations', async () => {
    const ru = await import('@/i18n/locales/ru.json');

    const ruData = ru.default || ru;

    expect(ruData.home?.greeting?.morning).toBeTruthy();
    expect(ruData.home?.greeting?.afternoon).toBeTruthy();
    expect(ruData.home?.greeting?.evening).toBeTruthy();
    expect(ruData.home?.greeting?.night).toBeTruthy();
  });
});
