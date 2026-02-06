/**
 * MessageFormatter Unit Tests
 * ===========================
 * Tests for bot message formatting utilities.
 *
 * @module @sleepcore/bot/commands/utils
 */

import { MessageFormatter, formatter } from '../../../../../src/bot/commands/utils/MessageFormatter';
import type { ISISeverity, SEStatus } from '../../../../../src/bot/commands/utils/MessageFormatter';

describe('MessageFormatter', () => {
  let fmt: MessageFormatter;

  beforeEach(() => {
    fmt = new MessageFormatter();
  });

  describe('progressBar', () => {
    it('should create progress bar for 0%', () => {
      const bar = fmt.progressBar(0);
      expect(bar).toContain('░░░░░░░░░░');
      expect(bar).toContain('0%');
    });

    it('should create progress bar for 100%', () => {
      const bar = fmt.progressBar(100);
      expect(bar).toContain('▓▓▓▓▓▓▓▓▓▓');
      expect(bar).toContain('100%');
    });

    it('should create progress bar for 50%', () => {
      const bar = fmt.progressBar(50);
      expect(bar).toContain('▓▓▓▓▓░░░░░');
      expect(bar).toContain('50%');
    });

    it('should clamp values above 100', () => {
      const bar = fmt.progressBar(150);
      expect(bar).toContain('100%');
    });

    it('should clamp values below 0', () => {
      const bar = fmt.progressBar(-10);
      expect(bar).toContain('0%');
    });

    it('should respect custom width', () => {
      const bar = fmt.progressBar(50, 4);
      expect(bar).toContain('▓▓░░');
    });
  });

  describe('circleProgress', () => {
    it('should return green for >= 90%', () => {
      expect(fmt.circleProgress(90)).toBe('🟢');
      expect(fmt.circleProgress(100)).toBe('🟢');
    });

    it('should return yellow for 75-89%', () => {
      expect(fmt.circleProgress(75)).toBe('🟡');
      expect(fmt.circleProgress(89)).toBe('🟡');
    });

    it('should return orange for 50-74%', () => {
      expect(fmt.circleProgress(50)).toBe('🟠');
      expect(fmt.circleProgress(74)).toBe('🟠');
    });

    it('should return red for < 50%', () => {
      expect(fmt.circleProgress(49)).toBe('🔴');
      expect(fmt.circleProgress(0)).toBe('🔴');
    });
  });

  describe('sleepEfficiency', () => {
    it('should format excellent efficiency', () => {
      const result = fmt.sleepEfficiency(92);
      expect(result).toContain('92%');
      expect(result).toContain('🌟');
      expect(result).toContain('Отлично');
    });

    it('should format good efficiency', () => {
      const result = fmt.sleepEfficiency(87);
      expect(result).toContain('87%');
      expect(result).toContain('✅');
      expect(result).toContain('Хорошо');
    });

    it('should format fair efficiency', () => {
      const result = fmt.sleepEfficiency(78);
      expect(result).toContain('78%');
      expect(result).toContain('⚠️');
    });

    it('should format poor efficiency', () => {
      const result = fmt.sleepEfficiency(65);
      expect(result).toContain('65%');
      expect(result).toContain('🔴');
    });
  });

  describe('getSEStatus', () => {
    it('should return excellent for >= 90%', () => {
      expect(fmt.getSEStatus(90)).toBe('excellent');
      expect(fmt.getSEStatus(95)).toBe('excellent');
    });

    it('should return good for 85-89%', () => {
      expect(fmt.getSEStatus(85)).toBe('good');
      expect(fmt.getSEStatus(89)).toBe('good');
    });

    it('should return fair for 75-84%', () => {
      expect(fmt.getSEStatus(75)).toBe('fair');
      expect(fmt.getSEStatus(84)).toBe('fair');
    });

    it('should return poor for < 75%', () => {
      expect(fmt.getSEStatus(74)).toBe('poor');
      expect(fmt.getSEStatus(50)).toBe('poor');
    });
  });

  describe('isiScore', () => {
    it('should format ISI score with severity', () => {
      const result = fmt.isiScore(12);
      expect(result).toContain('ISI: *12*/28');
      expect(result).toContain('Субклиническая');
    });

    it('should show no insomnia for low scores', () => {
      const result = fmt.isiScore(5);
      expect(result).toContain('🟢');
      expect(result).toContain('Нет клинической инсомнии');
    });

    it('should show severe for high scores', () => {
      const result = fmt.isiScore(25);
      expect(result).toContain('🔴');
      expect(result).toContain('Тяжёлая инсомния');
    });
  });

  describe('getISISeverity', () => {
    it('should return none for 0-7', () => {
      expect(fmt.getISISeverity(0)).toBe('none');
      expect(fmt.getISISeverity(7)).toBe('none');
    });

    it('should return subthreshold for 8-14', () => {
      expect(fmt.getISISeverity(8)).toBe('subthreshold');
      expect(fmt.getISISeverity(14)).toBe('subthreshold');
    });

    it('should return moderate for 15-21', () => {
      expect(fmt.getISISeverity(15)).toBe('moderate');
      expect(fmt.getISISeverity(21)).toBe('moderate');
    });

    it('should return severe for 22-28', () => {
      expect(fmt.getISISeverity(22)).toBe('severe');
      expect(fmt.getISISeverity(28)).toBe('severe');
    });
  });

  describe('duration', () => {
    it('should format minutes only', () => {
      expect(fmt.duration(45)).toBe('45 мин');
    });

    it('should format hours only', () => {
      expect(fmt.duration(120)).toBe('2 ч');
    });

    it('should format hours and minutes', () => {
      expect(fmt.duration(90)).toBe('1 ч 30 мин');
    });
  });

  describe('formatTime', () => {
    it('should format time as HH:MM', () => {
      const date = new Date(2025, 0, 15, 14, 30);
      const result = fmt.formatTime(date);
      expect(result).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('formatDate', () => {
    it('should format date in Russian locale', () => {
      const date = new Date(2025, 0, 15);
      const result = fmt.formatDate(date);
      expect(result).toContain('2025');
    });
  });

  describe('formatShortDate', () => {
    it('should format as DD.MM', () => {
      const date = new Date(2025, 0, 15);
      const result = fmt.formatShortDate(date);
      expect(result).toMatch(/\d{2}\.\d{2}/);
    });
  });

  describe('formatWeekday', () => {
    it('should format weekday in Russian', () => {
      const date = new Date(2025, 0, 15); // Wednesday
      const result = fmt.formatWeekday(date);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(fmt.escapeHtml('<script>')).toBe('&lt;script&gt;');
      expect(fmt.escapeHtml('a & b')).toBe('a &amp; b');
      expect(fmt.escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
    });
  });

  describe('truncate', () => {
    it('should not truncate short text', () => {
      expect(fmt.truncate('Hello', 10)).toBe('Hello');
    });

    it('should truncate long text with ellipsis', () => {
      expect(fmt.truncate('Hello World!', 8)).toBe('Hello...');
    });
  });

  describe('numberedList', () => {
    it('should create numbered list', () => {
      const result = fmt.numberedList(['A', 'B', 'C']);
      expect(result).toBe('1. A\n2. B\n3. C');
    });
  });

  describe('bulletList', () => {
    it('should create bulleted list', () => {
      const result = fmt.bulletList(['A', 'B', 'C']);
      expect(result).toBe('• A\n• B\n• C');
    });
  });

  describe('treatmentWeek', () => {
    it('should format treatment week progress', () => {
      const result = fmt.treatmentWeek(3, 6);
      expect(result).toContain('📅');
      expect(result).toContain('Неделя 3/6');
      expect(result).toContain('%');
    });
  });

  describe('sleepWindow', () => {
    it('should format sleep window', () => {
      const result = fmt.sleepWindow('23:00', '07:00', 8);
      expect(result).toContain('🛏');
      expect(result).toContain('23:00');
      expect(result).toContain('⏰');
      expect(result).toContain('07:00');
      expect(result).toContain('ч');
    });
  });

  describe('streakBadge', () => {
    it('should return empty for 0 days', () => {
      expect(fmt.streakBadge(0)).toBe('');
    });

    it('should return single fire for 1-6 days', () => {
      expect(fmt.streakBadge(3)).toContain('🔥');
      expect(fmt.streakBadge(3)).not.toContain('🔥🔥');
    });

    it('should return double fire for 7-29 days', () => {
      expect(fmt.streakBadge(14)).toContain('🔥🔥');
      expect(fmt.streakBadge(14)).not.toContain('🔥🔥🔥');
    });

    it('should return triple fire for 30+ days', () => {
      expect(fmt.streakBadge(45)).toContain('🔥🔥🔥');
    });
  });

  describe('adherence', () => {
    it('should show star for >= 80%', () => {
      expect(fmt.adherence(85)).toContain('⭐');
    });

    it('should show checkmark for 60-79%', () => {
      expect(fmt.adherence(70)).toContain('✓');
    });

    it('should show warning for < 60%', () => {
      expect(fmt.adherence(50)).toContain('⚠️');
    });
  });

  describe('message helpers', () => {
    it('success should add checkmark', () => {
      expect(fmt.success('Done')).toBe('✅ Done');
    });

    it('error should add cross', () => {
      expect(fmt.error('Failed')).toBe('❌ Failed');
    });

    it('warning should add warning icon', () => {
      expect(fmt.warning('Caution')).toBe('⚠️ Caution');
    });

    it('info should add info icon', () => {
      expect(fmt.info('Note')).toBe('ℹ️ Note');
    });

    it('tip should add lightbulb and italics', () => {
      expect(fmt.tip('Hint')).toBe('💡 _Hint_');
    });
  });

  describe('formatting helpers', () => {
    it('header should create bold header', () => {
      expect(fmt.header('Title')).toContain('*');
      expect(fmt.header('Title')).toContain('Title');
    });

    it('divider should return line', () => {
      expect(fmt.divider()).toContain('─');
    });
  });
});

describe('formatter singleton', () => {
  it('should export singleton instance', () => {
    expect(formatter).toBeInstanceOf(MessageFormatter);
  });
});
