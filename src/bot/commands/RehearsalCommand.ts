/**
 * /rehearsal Command - Pre-sleep Mental Rehearsal
 * ================================================
 * Evening mental rehearsal of sleep rules for memory consolidation.
 *
 * Scientific Foundation (2025):
 * - Neuron 2025: cAMP oscillations during NREM optimize plasticity
 * - Science Advances: Rehearsal + sleep = long-term memory
 * - Pre-sleep learning protected from interference
 *
 * Usage:
 * - /rehearsal - Start evening rehearsal session
 * - /rehearsal 23:00 - Specify bedtime
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands
 */

import type {
  ICommand,
  ISleepCoreContext,
  ICommandResult,
  IInlineButton,
} from './interfaces/ICommand';
import {
  createSmartMemoryWindowEngine,
  type ISmartMemoryWindowEngine,
  type IRehearsalSession,
} from '../../cognitive';
import { sonya } from '../persona';

/**
 * /rehearsal Command Implementation
 */
export class RehearsalCommand implements ICommand {
  readonly name = 'rehearsal';
  readonly description = 'Вечерняя репетиция сна';
  readonly aliases = ['репетиция', 'вечер', 'memory'];
  readonly requiresSession = false;

  private engine: ISmartMemoryWindowEngine;

  // Store active sessions for callback handling
  private activeSessions: Map<string, IRehearsalSession> = new Map();

  constructor() {
    this.engine = createSmartMemoryWindowEngine();
  }

  /**
   * Execute rehearsal command
   */
  async execute(
    ctx: ISleepCoreContext,
    args?: string
  ): Promise<ICommandResult> {
    const userId = ctx.userId;

    // Parse bedtime from args or use default
    const bedtime = this.parseBedtime(args) || '23:00';

    // Check if it's appropriate time for rehearsal
    const now = new Date();
    const hour = now.getHours();

    if (hour < 18 || hour > 23) {
      return {
        success: true,
        message: this.formatEarlyMessage(hour),
        keyboard: [[
          { text: '🌙 Всё равно начать', callbackData: 'rehearsal:force' },
        ]],
      };
    }

    return this.startRehearsal(userId, bedtime);
  }

  /**
   * Start rehearsal session
   */
  private async startRehearsal(
    userId: string,
    bedtime: string
  ): Promise<ICommandResult> {
    const session = await this.engine.getEveningRehearsal(userId, bedtime);
    this.activeSessions.set(userId, session);

    const message = this.formatRehearsalMessage(session);

    return {
      success: true,
      message,
      keyboard: [
        [
          { text: '🧠 Визуализация', callbackData: 'rehearsal:visualize:0' },
        ],
        [
          { text: '✨ Установить намерение', callbackData: 'rehearsal:intention' },
        ],
        [
          { text: '📊 Мой прогресс', callbackData: 'rehearsal:progress' },
        ],
      ],
    };
  }

  /**
   * Handle callback queries
   */
  async handleCallback(
    ctx: ISleepCoreContext,
    data: string,
    _state: Record<string, unknown>
  ): Promise<ICommandResult> {
    const userId = ctx.userId;
    const parts = data.split(':');
    const action = parts[1];

    switch (action) {
      case 'force':
        return this.startRehearsal(userId, '23:00');

      case 'visualize':
        return this.showVisualization(userId, parseInt(parts[2] || '0', 10));

      case 'next_viz':
        return this.showVisualization(userId, parseInt(parts[2] || '0', 10) + 1);

      case 'intention':
        return this.setIntention(userId);

      case 'progress':
        return this.showProgress(userId);

      default:
        return {
          success: false,
          error: 'Неизвестное действие',
        };
    }
  }

  /**
   * Show visualization for a rule
   */
  private async showVisualization(
    userId: string,
    ruleIndex: number
  ): Promise<ICommandResult> {
    const session = this.activeSessions.get(userId);

    if (!session || ruleIndex >= session.rules.length) {
      return {
        success: true,
        message:
          '✅ *Все визуализации пройдены!*\n\n' +
          'Теперь установите намерение запомнить эти правила.',
        keyboard: [[
          { text: '✨ Установить намерение', callbackData: 'rehearsal:intention' },
        ]],
      };
    }

    const rule = session.rules[ruleIndex];
    const visualization = this.engine.rehearsal.generateVisualization(rule);

    const keyboard: IInlineButton[][] = [];

    if (ruleIndex + 1 < session.rules.length) {
      keyboard.push([
        { text: '➡️ Следующая', callbackData: `rehearsal:next_viz:${ruleIndex}` },
      ]);
    } else {
      keyboard.push([
        { text: '✨ Установить намерение', callbackData: 'rehearsal:intention' },
      ]);
    }

    return {
      success: true,
      message:
        `*Правило ${ruleIndex + 1}/${session.rules.length}*\n\n` +
        `📌 *${rule.statement}*\n\n` +
        visualization,
      keyboard,
    };
  }

  /**
   * Set learning intention
   */
  private async setIntention(userId: string): Promise<ICommandResult> {
    const session = this.activeSessions.get(userId);

    if (session) {
      // Mark session as intention set
      this.activeSessions.set(userId, {
        ...session,
        intentionSet: true,
        visualizationCompleted: true,
      });
    }

    return {
      success: true,
      message:
        '✨ *Намерение установлено*\n\n' +
        '💬 Скажите себе:\n' +
        '_"Я запомню эти правила сна. Утром я проверю себя."_\n\n' +
        'Ваш мозг теперь знает, что эта информация важна, ' +
        'и будет консолидировать её во время NREM-сна.\n\n' +
        '🌙 *Спокойной ночи!*\n\n' +
        '_Утром используйте /recall для проверки памяти._',
    };
  }

  /**
   * Show consolidation progress
   */
  private async showProgress(userId: string): Promise<ICommandResult> {
    const analytics = await this.engine.getProgress(userId);
    const report = this.engine.analytics.generateProgressReport(analytics);

    return {
      success: true,
      message: report,
      keyboard: [[
        { text: '🌙 К репетиции', callbackData: 'rehearsal:force' },
      ]],
    };
  }

  /**
   * Format main rehearsal message
   */
  private formatRehearsalMessage(session: IRehearsalSession): string {
    const greeting = sonya.greet({ timeOfDay: 'evening' });

    const lines: string[] = [
      `${sonya.emoji} *${sonya.name}*`,
      '',
      `${greeting.text}`,
      '',
      '🌙 *Вечерняя репетиция сна*',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `⏰ До сна: ~${session.minutesBeforeBed} мин`,
      '',
      '📚 *Правила на сегодня:*',
      '',
    ];

    session.rules.forEach((rule, index) => {
      lines.push(`${index + 1}. *${rule.statement}*`);
      lines.push(`   _${rule.rationale}_`);
      lines.push('');
    });

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');
    lines.push('💡 *Как это работает:*');
    lines.push('1️⃣ Прочитай правила');
    lines.push('2️⃣ Пройди визуализацию');
    lines.push('3️⃣ Установи намерение запомнить');
    lines.push('4️⃣ Твой мозг консолидирует во сне');
    lines.push('5️⃣ Утром проверь себя (/recall)');

    return lines.join('\n');
  }

  /**
   * Format early time message
   */
  private formatEarlyMessage(hour: number): string {
    if (hour < 18) {
      return (
        '☀️ *Ещё рано для вечерней репетиции*\n\n' +
        'Оптимальное время — за 30-60 минут до сна.\n\n' +
        'Сейчас лучше:\n' +
        '• /today — рекомендация дня\n' +
        '• /progress — ваш прогресс\n' +
        '• /relax — техники расслабления\n\n' +
        '_Или нажмите кнопку, чтобы начать сейчас._'
      );
    } else {
      return (
        '🌃 *Уже поздно?*\n\n' +
        'Если вы ложитесь спать, лучше не нагружать мозг.\n' +
        'Но если до сна ещё 30+ минут — можно начать.\n\n' +
        '_Нажмите кнопку, если хотите продолжить._'
      );
    }
  }

  /**
   * Parse bedtime from args
   */
  private parseBedtime(args?: string): string | null {
    if (!args) return null;

    const match = args.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }

    return null;
  }
}

/**
 * Command instance
 */
export const rehearsalCommand = new RehearsalCommand();
