/**
 * /help Command - Bot Help & Navigation
 * ======================================
 * Shows all available commands with descriptions.
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
import { formatter } from './utils/MessageFormatter';
import { sonya } from '../persona';

/**
 * Command info for help display
 */
interface CommandInfo {
  name: string;
  icon: string;
  description: string;
  example?: string;
}

/**
 * /help Command Implementation
 */
export class HelpCommand implements ICommand {
  readonly name = 'help';
  readonly description = 'Справка по командам';
  readonly aliases = ['помощь', 'commands', 'menu'];
  readonly requiresSession = false;

  /**
   * All available commands
   */
  private readonly commands: CommandInfo[] = [
    {
      name: '/start',
      icon: '🚀',
      description: 'Начать программу, пройти оценку сна',
    },
    {
      name: '/diary',
      icon: '📓',
      description: 'Записать сон в дневник (3 клика)',
      example: 'Заполняйте каждое утро',
    },
    {
      name: '/today',
      icon: '📅',
      description: 'Персональное задание на сегодня',
    },
    {
      name: '/relax',
      icon: '🧘',
      description: 'Техники релаксации перед сном',
    },
    {
      name: '/mindful',
      icon: '🧠',
      description: 'Практики осознанности (MBT-I, ACT-I)',
    },
    {
      name: '/progress',
      icon: '📊',
      description: 'Ваш еженедельный прогресс',
    },
    {
      name: '/sos',
      icon: '🆘',
      description: 'Экстренная психологическая помощь',
    },
    {
      name: '/help',
      icon: '❓',
      description: 'Эта справка',
    },
  ];

  /**
   * Execute the command
   */
  async execute(ctx: ISleepCoreContext): Promise<ICommandResult> {
    return this.showHelp(ctx);
  }

  // ==================== Response Handlers ====================

  private async showHelp(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const commandsList = this.commands
      .map((cmd) => `${cmd.icon} *${cmd.name}* — ${cmd.description}`)
      .join('\n');

    const message = `
${sonya.emoji} *${sonya.name}*

Привет! Я помогу разобраться с программой.

${formatter.header('SleepCore — Справка')}

*Доступные команды:*

${commandsList}

${formatter.divider()}

*📚 О программе:*

SleepCore — цифровая терапия инсомнии на основе:
• КПТ-И (Grade A, European Guideline 2023)
• MBT-I / ACT-I (терапии третьей волны)
• POMDP-алгоритм персонализации

${formatter.divider()}

*💡 Рекомендуемый порядок:*

1️⃣ /start — пройди оценку сна
2️⃣ /diary — веди дневник 7+ дней
3️⃣ /today — получай персональные задания
4️⃣ /progress — отслеживай улучшения

${sonya.tip('Ведение дневника — ключ к успеху КПТ-И')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        { text: '🚀 Начать', callbackData: 'start:begin' },
        { text: '📓 Дневник', callbackData: 'diary:start' },
      ],
      [
        { text: '📅 Сегодня', callbackData: 'today:show' },
        { text: '📊 Прогресс', callbackData: 'progress:show' },
      ],
      [{ text: '🆘 Экстренная помощь', callbackData: 'sos:show' }],
    ];

    return {
      success: true,
      message,
      keyboard,
    };
  }
}

// Export singleton
export const helpCommand = new HelpCommand();
