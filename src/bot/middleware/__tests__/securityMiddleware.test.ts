/**
 * Security Middleware Tests
 * =========================
 * Tests for OWASP 2025 security controls.
 *
 * @packageDocumentation
 * @module @sleepcore/bot/middleware/__tests__
 */

import {
  sanitizeInput,
  validateAdminIds,
  isValidAdmin,
  verifySessionBinding,
  clearSessionBinding,
  getSessionBindingStats,
  verifyReplyToMessage,
  securityAuditLog,
  DEFAULT_SECURITY_CONFIG,
} from '../securityMiddleware';

describe('securityMiddleware', () => {
  beforeEach(() => {
    // Clear session bindings between tests
    clearSessionBinding('test-user-1');
    clearSessionBinding('test-user-2');
  });

  // ==========================================================================
  // Input Sanitization
  // ==========================================================================
  describe('sanitizeInput', () => {
    it('should pass through normal text unchanged', () => {
      const result = sanitizeInput('Hello, this is normal text');
      expect(result.sanitized).toBe('Hello, this is normal text');
      expect(result.wasModified).toBe(false);
      expect(result.detectedPatterns).toHaveLength(0);
    });

    it('should handle empty input', () => {
      const result = sanitizeInput('');
      expect(result.sanitized).toBe('');
      expect(result.wasModified).toBe(false);
    });

    it('should handle null/undefined input', () => {
      const result1 = sanitizeInput(null as unknown as string);
      expect(result1.sanitized).toBe('');

      const result2 = sanitizeInput(undefined as unknown as string);
      expect(result2.sanitized).toBe('');
    });

    it('should detect and remove script injection', () => {
      const result = sanitizeInput('Hello <script>alert("xss")</script>');
      expect(result.wasModified).toBe(true);
      expect(result.detectedPatterns).toContain('<script');
      expect(result.sanitized).not.toContain('<script');
    });

    it('should detect javascript: protocol', () => {
      const result = sanitizeInput('Click javascript:void(0)');
      expect(result.wasModified).toBe(true);
      expect(result.detectedPatterns.length).toBeGreaterThan(0);
    });

    it('should detect SQL injection patterns', () => {
      const result = sanitizeInput("' OR '1'='1");
      expect(result.wasModified).toBe(true);
    });

    it('should detect path traversal', () => {
      const result = sanitizeInput('../../etc/passwd');
      expect(result.wasModified).toBe(true);
      expect(result.detectedPatterns.length).toBeGreaterThan(0);
    });

    it('should remove control characters', () => {
      const result = sanitizeInput('Hello\x00World\x1F');
      expect(result.wasModified).toBe(true);
      expect(result.sanitized).toBe('HelloWorld');
      expect(result.detectedPatterns).toContain('control_chars');
    });

    it('should truncate overly long messages', () => {
      const longText = 'a'.repeat(5000);
      const result = sanitizeInput(longText);
      expect(result.wasModified).toBe(true);
      expect(result.sanitized.length).toBe(DEFAULT_SECURITY_CONFIG.maxMessageLength);
      expect(result.detectedPatterns).toContain('length_exceeded');
    });

    it('should preserve Russian text', () => {
      const russianText = 'Привет, как дела? Мне нужна помощь с бессонницей.';
      const result = sanitizeInput(russianText);
      expect(result.sanitized).toBe(russianText);
      expect(result.wasModified).toBe(false);
    });

    it('should preserve emojis', () => {
      const emojiText = 'Хорошо сплю 😴💤✨';
      const result = sanitizeInput(emojiText);
      expect(result.sanitized).toBe(emojiText);
      expect(result.wasModified).toBe(false);
    });
  });

  // ==========================================================================
  // Admin ID Validation
  // ==========================================================================
  describe('validateAdminIds', () => {
    it('should validate numeric IDs', () => {
      const result = validateAdminIds('123456789,987654321');
      expect(result.validIds).toEqual(['123456789', '987654321']);
      expect(result.invalidIds).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });

    it('should reject non-numeric IDs', () => {
      const result = validateAdminIds('admin123,test,999');
      expect(result.validIds).toEqual(['999']);
      expect(result.invalidIds).toEqual(['admin123', 'test']);
      expect(result.isValid).toBe(false);
    });

    it('should handle empty input', () => {
      const result = validateAdminIds('');
      expect(result.validIds).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });

    it('should handle undefined input', () => {
      const result = validateAdminIds(undefined);
      expect(result.validIds).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });

    it('should trim whitespace', () => {
      const result = validateAdminIds('  123  ,  456  ');
      expect(result.validIds).toEqual(['123', '456']);
    });

    it('should reject negative numbers', () => {
      const result = validateAdminIds('-123,456');
      expect(result.validIds).toEqual(['456']);
      expect(result.invalidIds).toEqual(['-123']);
    });

    it('should reject IDs with special characters', () => {
      const result = validateAdminIds('123abc,456!,789');
      expect(result.validIds).toEqual(['789']);
      expect(result.invalidIds).toEqual(['123abc', '456!']);
    });
  });

  // ==========================================================================
  // isValidAdmin
  // ==========================================================================
  describe('isValidAdmin', () => {
    it('should return true for valid admin', () => {
      expect(isValidAdmin('123456789', ['123456789', '987654321'])).toBe(true);
    });

    it('should return false for non-admin', () => {
      expect(isValidAdmin('555555555', ['123456789', '987654321'])).toBe(false);
    });

    it('should return false for invalid userId format', () => {
      expect(isValidAdmin('not-numeric', ['123456789'])).toBe(false);
    });

    it('should return false for empty adminIds', () => {
      expect(isValidAdmin('123456789', [])).toBe(false);
    });

    it('should return false for empty userId', () => {
      expect(isValidAdmin('', ['123456789'])).toBe(false);
    });
  });

  // ==========================================================================
  // Session Binding
  // ==========================================================================
  describe('verifySessionBinding', () => {
    it('should create binding on first interaction', () => {
      const result = verifySessionBinding('user-1', 'chat-1');
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should validate matching chat', () => {
      verifySessionBinding('user-1', 'chat-1');
      const result = verifySessionBinding('user-1', 'chat-1');
      expect(result.valid).toBe(true);
    });

    it('should detect mismatched chat', () => {
      verifySessionBinding('user-1', 'chat-1');
      const result = verifySessionBinding('user-1', 'chat-2');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('different chat');
    });

    it('should allow different users in different chats', () => {
      verifySessionBinding('user-1', 'chat-1');
      const result = verifySessionBinding('user-2', 'chat-2');
      expect(result.valid).toBe(true);
    });
  });

  describe('clearSessionBinding', () => {
    it('should clear binding', () => {
      verifySessionBinding('user-1', 'chat-1');
      clearSessionBinding('user-1');
      // After clearing, new binding should be created
      const result = verifySessionBinding('user-1', 'chat-2');
      expect(result.valid).toBe(true);
    });
  });

  describe('getSessionBindingStats', () => {
    it('should return stats', () => {
      verifySessionBinding('user-1', 'chat-1');
      verifySessionBinding('user-2', 'chat-2');
      const stats = getSessionBindingStats();
      expect(stats.activeSessions).toBeGreaterThanOrEqual(2);
      expect(stats.oldestSession).not.toBeNull();
    });
  });

  // ==========================================================================
  // Security Audit Log
  // ==========================================================================
  describe('securityAuditLog', () => {
    it('should log events', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      securityAuditLog.log({
        type: 'suspicious_input',
        userId: 'test-user',
        chatId: 'test-chat',
        details: 'Test event',
        severity: 'warning',
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log critical events to console.error', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      securityAuditLog.log({
        type: 'session_mismatch',
        userId: 'test-user',
        chatId: 'test-chat',
        details: 'Critical test event',
        severity: 'critical',
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should get events for user', () => {
      securityAuditLog.log({
        type: 'suspicious_input',
        userId: 'test-user-events',
        chatId: 'test-chat',
        details: 'Test',
        severity: 'info',
      });

      const events = securityAuditLog.getEventsForUser('test-user-events');
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it('should get stats', () => {
      const stats = securityAuditLog.getStats();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('critical');
      expect(stats).toHaveProperty('warning');
      expect(stats).toHaveProperty('byType');
    });
  });

  // ==========================================================================
  // Reply-to-Message Verification
  // ==========================================================================
  describe('verifyReplyToMessage', () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const botId = 123456789;

    it('should validate reply to bot message in same chat', () => {
      const replyToMessage = {
        from: { id: botId, is_bot: true },
        chat: { id: 100 },
        date: currentTime - 60, // 1 minute ago
      };

      const result = verifyReplyToMessage(replyToMessage, 100, botId, 24);
      expect(result.valid).toBe(true);
      expect(result.isStale).toBeUndefined();
      expect(result.isToNonBot).toBeUndefined();
    });

    it('should detect reply to different chat', () => {
      const replyToMessage = {
        from: { id: botId, is_bot: true },
        chat: { id: 200 }, // Different chat
        date: currentTime - 60,
      };

      const result = verifyReplyToMessage(replyToMessage, 100, botId, 24);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('different chat');
    });

    it('should flag reply to non-bot message', () => {
      const replyToMessage = {
        from: { id: 999, is_bot: false }, // User, not bot
        chat: { id: 100 },
        date: currentTime - 60,
      };

      const result = verifyReplyToMessage(replyToMessage, 100, botId, 24);
      expect(result.valid).toBe(true); // Still valid, just flagged
      expect(result.isToNonBot).toBe(true);
    });

    it('should flag stale reply', () => {
      const replyToMessage = {
        from: { id: botId, is_bot: true },
        chat: { id: 100 },
        date: currentTime - (25 * 60 * 60), // 25 hours ago
      };

      const result = verifyReplyToMessage(replyToMessage, 100, botId, 24);
      expect(result.valid).toBe(true); // Still valid, just flagged
      expect(result.isStale).toBe(true);
      expect(result.reason).toContain('old message');
    });

    it('should accept reply within time limit', () => {
      const replyToMessage = {
        from: { id: botId, is_bot: true },
        chat: { id: 100 },
        date: currentTime - (23 * 60 * 60), // 23 hours ago (within 24h limit)
      };

      const result = verifyReplyToMessage(replyToMessage, 100, botId, 24);
      expect(result.valid).toBe(true);
      expect(result.isStale).toBeUndefined();
    });

    it('should work without bot ID', () => {
      const replyToMessage = {
        from: { id: 999, is_bot: true },
        chat: { id: 100 },
        date: currentTime - 60,
      };

      const result = verifyReplyToMessage(replyToMessage, 100, undefined, 24);
      expect(result.valid).toBe(true);
    });

    it('should work with message without from field', () => {
      const replyToMessage = {
        chat: { id: 100 },
        date: currentTime - 60,
      };

      const result = verifyReplyToMessage(replyToMessage, 100, botId, 24);
      expect(result.valid).toBe(true);
    });
  });
});
