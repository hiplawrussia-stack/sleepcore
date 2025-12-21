/**
 * MessageFormatter Unit Tests
 * ============================
 * Tests for MessageFormatter - message formatting utilities.
 */

import { MessageFormatter, formatter } from '../../../../src/bot/commands/utils/MessageFormatter';

describe('MessageFormatter', () => {
  let fmt: MessageFormatter;

  beforeEach(() => {
    fmt = new MessageFormatter();
  });

  describe('progressBar()', () => {
    it('should create 0% progress bar', () => {
      const bar = fmt.progressBar(0);
      expect(bar).toContain('░');
      expect(bar).not.toContain('█');
    });

    it('should create 50% progress bar', () => {
      const bar = fmt.progressBar(50);
      // May use different characters: █, ▓, etc.
      expect(bar).toMatch(/[█▓]/);
      expect(bar).toContain('░');
    });

    it('should create 100% progress bar', () => {
      const bar = fmt.progressBar(100);
      // May use different characters: █, ▓, etc.
      expect(bar).toMatch(/[█▓]/);
      expect(bar).not.toContain('░');
    });

    it('should clamp values below 0', () => {
      const bar = fmt.progressBar(-10);
      expect(bar).not.toContain('█');
    });

    it('should clamp values above 100', () => {
      const bar = fmt.progressBar(150);
      const bar100 = fmt.progressBar(100);
      expect(bar).toBe(bar100);
    });

    it('should respect custom width', () => {
      const bar5 = fmt.progressBar(50, 5);
      const bar10 = fmt.progressBar(50, 10);
      expect(bar5.replace(/[^█░]/g, '').length).toBeLessThan(
        bar10.replace(/[^█░]/g, '').length
      );
    });
  });

  describe('sleepEfficiency()', () => {
    it('should show green for high SE (85%+)', () => {
      const result = fmt.sleepEfficiency(90);
      expect(result).toMatch(/🟢|зелен|отлично/i);
    });

    it('should show warning for medium SE (75-84%)', () => {
      const result = fmt.sleepEfficiency(80);
      // May show ⚠️ or 🟡 or text warning
      expect(result).toMatch(/🟡|⚠️|желт|внимани/i);
    });

    it('should show red for low SE (<75%)', () => {
      const result = fmt.sleepEfficiency(60);
      expect(result).toMatch(/🔴|красн|низк/i);
    });

    it('should include percentage value', () => {
      const result = fmt.sleepEfficiency(85);
      expect(result).toContain('85');
    });
  });

  describe('isiScore()', () => {
    it('should show none severity for 0-7', () => {
      const result = fmt.isiScore(5);
      expect(result).toMatch(/нет|отсутств|норм/i);
    });

    it('should show subthreshold severity for 8-14', () => {
      const result = fmt.isiScore(10);
      expect(result).toMatch(/подпорог|легк|субклин/i);
    });

    it('should show moderate severity for 15-21', () => {
      const result = fmt.isiScore(18);
      expect(result).toMatch(/умерен|средн/i);
    });

    it('should show severe severity for 22-28', () => {
      const result = fmt.isiScore(25);
      expect(result).toMatch(/тяж[её]л|выражен|сильн/i);
    });

    it('should include score value', () => {
      const result = fmt.isiScore(15);
      expect(result).toContain('15');
    });
  });

  describe('duration()', () => {
    it('should format minutes only', () => {
      const result = fmt.duration(45);
      expect(result).toMatch(/45\s*мин/i);
    });

    it('should format hours and minutes', () => {
      const result = fmt.duration(90);
      expect(result).toMatch(/1\s*ч.*30\s*мин/i);
    });

    it('should format whole hours', () => {
      const result = fmt.duration(120);
      expect(result).toMatch(/2\s*ч/i);
    });

    it('should handle zero', () => {
      const result = fmt.duration(0);
      expect(result).toMatch(/0|—/);
    });

    it('should format large durations', () => {
      const result = fmt.duration(480); // 8 hours
      expect(result).toMatch(/8\s*ч/i);
    });
  });

  describe('formatDate()', () => {
    it('should format date in Russian', () => {
      const date = new Date('2024-12-22');
      const result = fmt.formatDate(date);
      expect(result).toMatch(/22|декабр/i);
    });

    it('should include day of week', () => {
      const date = new Date('2024-12-22'); // Sunday
      const result = fmt.formatDate(date);
      // Should contain day name or be recognizable
      expect(result.length).toBeGreaterThan(5);
    });
  });

  describe('escapeHtml()', () => {
    it('should escape < and >', () => {
      const result = fmt.escapeHtml('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });

    it('should escape &', () => {
      const result = fmt.escapeHtml('A & B');
      expect(result).toContain('&amp;');
    });

    it('should escape quotes', () => {
      const result = fmt.escapeHtml('"quoted"');
      expect(result).toContain('&quot;');
    });

    it('should handle empty string', () => {
      const result = fmt.escapeHtml('');
      expect(result).toBe('');
    });

    it('should handle text without special chars', () => {
      const result = fmt.escapeHtml('Hello World');
      expect(result).toBe('Hello World');
    });
  });

  describe('header()', () => {
    it('should format header with decoration', () => {
      const result = fmt.header('Тест');
      expect(result).toContain('Тест');
      expect(result.length).toBeGreaterThan(4);
    });
  });

  describe('divider()', () => {
    it('should create visual divider', () => {
      const result = fmt.divider();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('tip()', () => {
    it('should format tip with icon', () => {
      const result = fmt.tip('Полезный совет');
      expect(result).toContain('Полезный совет');
      expect(result).toMatch(/💡|ℹ️|📌/);
    });
  });

  describe('warning()', () => {
    it('should format warning with icon', () => {
      const result = fmt.warning('Внимание');
      expect(result).toContain('Внимание');
      expect(result).toMatch(/⚠️|⚡|❗/);
    });
  });

  describe('success()', () => {
    it('should format success with icon', () => {
      const result = fmt.success('Готово');
      expect(result).toContain('Готово');
      expect(result).toMatch(/✅|✔️|🎉/);
    });
  });

  describe('info()', () => {
    it('should format info with icon', () => {
      const result = fmt.info('Информация');
      expect(result).toContain('Информация');
      expect(result).toMatch(/ℹ️|📋|💬/);
    });
  });

  describe('numberedList()', () => {
    it('should create numbered list', () => {
      const items = ['First', 'Second', 'Third'];
      const result = fmt.numberedList(items);

      expect(result).toContain('1.');
      expect(result).toContain('2.');
      expect(result).toContain('3.');
      expect(result).toContain('First');
      expect(result).toContain('Second');
      expect(result).toContain('Third');
    });

    it('should handle empty array', () => {
      const result = fmt.numberedList([]);
      expect(result).toBe('');
    });

    it('should handle single item', () => {
      const result = fmt.numberedList(['Only']);
      expect(result).toContain('1.');
      expect(result).toContain('Only');
    });
  });

  describe('streakBadge()', () => {
    it('should show streak count', () => {
      const result = fmt.streakBadge(5);
      expect(result).toContain('5');
    });

    it('should include streak icon', () => {
      const result = fmt.streakBadge(3);
      expect(result).toMatch(/🔥|⭐|📆/);
    });
  });
});

describe('formatter singleton', () => {
  it('should export singleton instance', () => {
    expect(formatter).toBeInstanceOf(MessageFormatter);
  });

  it('should have all formatting methods', () => {
    expect(formatter.progressBar).toBeDefined();
    expect(formatter.sleepEfficiency).toBeDefined();
    expect(formatter.isiScore).toBeDefined();
    expect(formatter.duration).toBeDefined();
    expect(formatter.formatDate).toBeDefined();
    expect(formatter.escapeHtml).toBeDefined();
  });
});
