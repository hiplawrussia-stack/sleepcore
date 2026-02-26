/**
 * URL Validation Tests
 * ====================
 * Tests for XSS prevention via URL protocol allowlist.
 *
 * Test categories:
 * 1. Valid URLs (should pass)
 * 2. Dangerous protocols (should block)
 * 3. Bypass techniques (should block)
 * 4. Edge cases
 * 5. Telegram-specific validation
 *
 * @see OWASP Unvalidated Redirects Cheat Sheet
 * @see Beyond XSS: javascript: protocol attacks
 */

import { describe, it, expect } from 'vitest';
import {
  validateUrl,
  validateTelegramUrl,
  isUrlSafe,
  isTelegramUrlSafe,
  sanitizeUrl,
  ALLOWED_PROTOCOLS,
  TELEGRAM_ALLOWED_PROTOCOLS,
  TELEGRAM_ALLOWED_HOSTS,
  SAFE_URL_FALLBACK,
} from '@/utils/url';

describe('URL Validation', () => {
  // ========== Valid URLs ==========

  describe('Valid URLs (should pass)', () => {
    it('accepts https URLs', () => {
      const result = validateUrl('https://example.com');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toBe('https://example.com');
      expect(result.protocol).toBe('https:');
    });

    it('accepts http URLs', () => {
      const result = validateUrl('http://example.com');
      expect(result.isValid).toBe(true);
      expect(result.protocol).toBe('http:');
    });

    it('accepts mailto URLs', () => {
      const result = validateUrl('mailto:test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.protocol).toBe('mailto:');
    });

    it('accepts tel URLs', () => {
      const result = validateUrl('tel:+1234567890');
      expect(result.isValid).toBe(true);
      expect(result.protocol).toBe('tel:');
    });

    it('accepts tg deep links', () => {
      const result = validateUrl('tg://resolve?domain=SleepCore_Bot');
      expect(result.isValid).toBe(true);
      expect(result.protocol).toBe('tg:');
    });

    it('accepts URLs with paths and query params', () => {
      const result = validateUrl('https://example.com/path?query=value&foo=bar');
      expect(result.isValid).toBe(true);
    });

    it('accepts URLs with ports', () => {
      const result = validateUrl('https://example.com:8080/path');
      expect(result.isValid).toBe(true);
    });

    it('accepts URLs with fragments', () => {
      const result = validateUrl('https://example.com/page#section');
      expect(result.isValid).toBe(true);
    });

    it('accepts URLs with authentication', () => {
      const result = validateUrl('https://user:pass@example.com');
      expect(result.isValid).toBe(true);
    });
  });

  // ========== Dangerous Protocols ==========

  describe('Dangerous protocols (should block)', () => {
    it('blocks javascript: protocol', () => {
      const result = validateUrl('javascript:alert(1)');
      expect(result.isValid).toBe(false);
      expect(result.sanitizedUrl).toBe(SAFE_URL_FALLBACK);
      expect(result.reason).toContain('not in allowlist');
    });

    it('blocks javascript: with complex payload', () => {
      const result = validateUrl('javascript:alert(document.cookie)');
      expect(result.isValid).toBe(false);
    });

    it('blocks data: protocol', () => {
      const result = validateUrl('data:text/html,<script>alert(1)</script>');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('not in allowlist');
    });

    it('blocks data: base64 encoded payload', () => {
      const result = validateUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==');
      expect(result.isValid).toBe(false);
    });

    it('blocks vbscript: protocol', () => {
      const result = validateUrl('vbscript:msgbox(1)');
      expect(result.isValid).toBe(false);
    });

    it('blocks file: protocol', () => {
      const result = validateUrl('file:///etc/passwd');
      expect(result.isValid).toBe(false);
    });

    it('blocks ftp: protocol', () => {
      const result = validateUrl('ftp://ftp.example.com/file');
      expect(result.isValid).toBe(false);
    });

    it('blocks blob: protocol', () => {
      const result = validateUrl('blob:https://example.com/uuid');
      expect(result.isValid).toBe(false);
    });
  });

  // ========== Bypass Techniques ==========

  describe('Bypass techniques (should block)', () => {
    it('blocks case variations: JAVASCRIPT:', () => {
      const result = validateUrl('JAVASCRIPT:alert(1)');
      expect(result.isValid).toBe(false);
    });

    it('blocks case variations: JaVaScRiPt:', () => {
      const result = validateUrl('JaVaScRiPt:alert(1)');
      expect(result.isValid).toBe(false);
    });

    it('blocks case variations: jAvAsCrIpT:', () => {
      const result = validateUrl('jAvAsCrIpT:alert(1)');
      expect(result.isValid).toBe(false);
    });

    it('handles URL with leading whitespace', () => {
      const result = validateUrl('  https://example.com');
      expect(result.isValid).toBe(true);
    });

    it('handles URL with trailing whitespace', () => {
      const result = validateUrl('https://example.com  ');
      expect(result.isValid).toBe(true);
    });

    it('blocks javascript: with leading whitespace', () => {
      const result = validateUrl('  javascript:alert(1)');
      expect(result.isValid).toBe(false);
    });

    // Note: URL constructor handles URL encoding automatically
    it('handles URL-encoded safe URLs', () => {
      const result = validateUrl('https://example.com/path%20with%20spaces');
      expect(result.isValid).toBe(true);
    });
  });

  // ========== Edge Cases ==========

  describe('Edge cases', () => {
    it('blocks empty string', () => {
      const result = validateUrl('');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Empty');
    });

    it('blocks whitespace only', () => {
      const result = validateUrl('   ');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Empty');
    });

    it('blocks null-like values', () => {
      // @ts-expect-error - testing runtime safety
      expect(validateUrl(null).isValid).toBe(false);
      // @ts-expect-error - testing runtime safety
      expect(validateUrl(undefined).isValid).toBe(false);
    });

    it('blocks non-string values', () => {
      // @ts-expect-error - testing runtime safety
      expect(validateUrl(123).isValid).toBe(false);
      // @ts-expect-error - testing runtime safety
      expect(validateUrl({}).isValid).toBe(false);
    });

    it('blocks malformed URLs', () => {
      const result = validateUrl('not-a-valid-url');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Invalid URL syntax');
    });

    it('blocks URLs without protocol', () => {
      const result = validateUrl('example.com');
      expect(result.isValid).toBe(false);
    });

    it('blocks protocol-relative URLs', () => {
      const result = validateUrl('//example.com');
      expect(result.isValid).toBe(false);
    });
  });

  // ========== Custom Protocol List ==========

  describe('Custom protocol allowlist', () => {
    it('accepts custom protocol list', () => {
      const result = validateUrl('ftp://example.com', ['ftp:', 'sftp:']);
      expect(result.isValid).toBe(true);
    });

    it('rejects protocols not in custom list', () => {
      const result = validateUrl('https://example.com', ['ftp:']);
      expect(result.isValid).toBe(false);
    });
  });
});

// ========== Telegram URL Validation ==========

describe('Telegram URL Validation', () => {
  describe('Valid Telegram URLs', () => {
    it('accepts t.me links', () => {
      const result = validateTelegramUrl('https://t.me/SleepCore_Bot');
      expect(result.isValid).toBe(true);
    });

    it('accepts telegram.me links', () => {
      const result = validateTelegramUrl('https://telegram.me/SleepCore_Bot');
      expect(result.isValid).toBe(true);
    });

    it('accepts telegram.org links', () => {
      const result = validateTelegramUrl('https://telegram.org/privacy');
      expect(result.isValid).toBe(true);
    });

    it('accepts tg: deep links', () => {
      const result = validateTelegramUrl('tg://resolve?domain=SleepCore_Bot');
      expect(result.isValid).toBe(true);
    });

    it('accepts tg: with various parameters', () => {
      const result = validateTelegramUrl('tg://join?invite=abcdef');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Invalid Telegram URLs', () => {
    it('blocks non-Telegram https hosts', () => {
      const result = validateTelegramUrl('https://example.com');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('not allowed for Telegram');
    });

    it('blocks http protocol', () => {
      const result = validateTelegramUrl('http://t.me/SleepCore_Bot');
      expect(result.isValid).toBe(false);
    });

    it('blocks javascript: protocol', () => {
      const result = validateTelegramUrl('javascript:alert(1)');
      expect(result.isValid).toBe(false);
    });

    it('blocks spoofed Telegram hosts', () => {
      const result = validateTelegramUrl('https://t.me.evil.com/bot');
      expect(result.isValid).toBe(false);
    });

    it('blocks subdomain spoofing', () => {
      const result = validateTelegramUrl('https://fake.t.me.com/bot');
      expect(result.isValid).toBe(false);
    });
  });
});

// ========== Helper Functions ==========

describe('Helper Functions', () => {
  describe('isUrlSafe', () => {
    it('returns true for safe URLs', () => {
      expect(isUrlSafe('https://example.com')).toBe(true);
    });

    it('returns false for dangerous URLs', () => {
      expect(isUrlSafe('javascript:alert(1)')).toBe(false);
    });
  });

  describe('isTelegramUrlSafe', () => {
    it('returns true for valid Telegram URLs', () => {
      expect(isTelegramUrlSafe('https://t.me/bot')).toBe(true);
    });

    it('returns false for non-Telegram URLs', () => {
      expect(isTelegramUrlSafe('https://example.com')).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    it('returns original URL if safe', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('returns about:blank for dangerous URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('about:blank');
    });
  });
});

// ========== Constants ==========

describe('Constants', () => {
  it('ALLOWED_PROTOCOLS contains expected values', () => {
    expect(ALLOWED_PROTOCOLS).toContain('https:');
    expect(ALLOWED_PROTOCOLS).toContain('http:');
    expect(ALLOWED_PROTOCOLS).toContain('tg:');
    expect(ALLOWED_PROTOCOLS).toContain('mailto:');
    expect(ALLOWED_PROTOCOLS).toContain('tel:');
    expect(ALLOWED_PROTOCOLS).not.toContain('javascript:');
  });

  it('TELEGRAM_ALLOWED_PROTOCOLS is restrictive', () => {
    expect(TELEGRAM_ALLOWED_PROTOCOLS).toContain('https:');
    expect(TELEGRAM_ALLOWED_PROTOCOLS).toContain('tg:');
    expect(TELEGRAM_ALLOWED_PROTOCOLS).not.toContain('http:');
  });

  it('TELEGRAM_ALLOWED_HOSTS contains Telegram domains', () => {
    expect(TELEGRAM_ALLOWED_HOSTS).toContain('t.me');
    expect(TELEGRAM_ALLOWED_HOSTS).toContain('telegram.me');
    expect(TELEGRAM_ALLOWED_HOSTS).toContain('telegram.org');
  });

  it('SAFE_URL_FALLBACK is about:blank', () => {
    expect(SAFE_URL_FALLBACK).toBe('about:blank');
  });
});
