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
 * Command category for organized display
 */
interface CommandCategory {
  title: string;
  icon: string;
  commands: CommandInfo[];
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
   * All available commands organized by category.
   *
   * IEC 62366-1: Safety-critical commands (/sos, /safety, /aereport)
   * MUST be in primary disclosure tier — not hidden behind secondary navigation.
   * ISO 14971: Undiscoverable safety features = unacceptable risk.
   */
  private readonly categories: CommandCategory[] = [
    {
      title: 'Экстренная помощь',
      icon: '🚨',
      commands: [
        {
          name: '/sos',
          icon: '🆘',
          description: 'Экстренная психологическая помощь',
        },
        {
          name: '/safety',
          icon: '🛡️',
          description: 'Статус безопасности и мониторинг',
        },
        {
          name: '/aereport',
          icon: '⚠️',
          description: 'Сообщить о проблеме или побочном эффекте',
        },
      ],
    },
    {
      title: 'Основная программа',
      icon: '📋',
      commands: [
        {
          name: '/start',
          icon: '🚀',
          description: 'Начать программу, пройти оценку сна',
        },
        {
          name: '/diary',
          icon: '📓',
          description: 'Записать сон в дневник',
          example: 'Заполняйте каждое утро',
        },
        {
          name: '/today',
          icon: '📅',
          description: 'Задание на сегодня',
        },
        {
          name: '/therapy',
          icon: '💊',
          description: 'Терапевтические сессии КПТ-И',
        },
        {
          name: '/progress',
          icon: '📊',
          description: 'Ваш прогресс за неделю',
        },
      ],
    },
    {
      title: 'Техники и практики',
      icon: '🧘',
      commands: [
        {
          name: '/relax',
          icon: '🧘',
          description: 'Техники релаксации',
        },
        {
          name: '/mindful',
          icon: '🧠',
          description: 'Практики осознанности (MBT-I, ACT-I)',
        },
        {
          name: '/rehearsal',
          icon: '🌙',
          description: 'Вечерняя репетиция сна',
        },
        {
          name: '/recall',
          icon: '☀️',
          description: 'Утренний тест памяти',
        },
      ],
    },
    {
      title: 'Аналитика и AI',
      icon: '🤖',
      commands: [
        {
          name: '/insights',
          icon: '🔍',
          description: 'Персональный анализ сна',
        },
        {
          name: '/predict',
          icon: '🔮',
          description: 'Прогноз сна на 7 дней',
        },
        {
          name: '/explain',
          icon: '💡',
          description: 'Объяснение рекомендаций AI',
        },
        {
          name: '/whatif',
          icon: '🧪',
          description: 'Моделирование сценариев',
        },
        {
          name: '/twin',
          icon: '👤',
          description: 'Цифровой двойник',
        },
        {
          name: '/chronotype',
          icon: '🕐',
          description: 'Определить хронотип (жаворонок/сова)',
        },
        {
          name: '/smart_tips',
          icon: '✨',
          description: 'Умные рекомендации',
        },
      ],
    },
    {
      title: 'Игровые элементы',
      icon: '🎮',
      commands: [
        {
          name: '/quest',
          icon: '⚔️',
          description: 'Квесты и задания',
        },
        {
          name: '/badges',
          icon: '🏅',
          description: 'Бейджи и достижения',
        },
        {
          name: '/profile',
          icon: '👤',
          description: 'Профиль игрока',
        },
        {
          name: '/sonya',
          icon: '🌟',
          description: 'Эволюция Сони',
        },
      ],
    },
    {
      title: 'Сервис',
      icon: '⚙️',
      commands: [
        {
          name: '/help',
          icon: '❓',
          description: 'Эта справка',
        },
      ],
    },
  ];

  /**
   * Execute the command
   */
  async execute(ctx: ISleepCoreContext): Promise<ICommandResult> {
    return this.showHelp(ctx);
  }

  // ==================== Response Handlers ====================

  private async showHelp(_ctx: ISleepCoreContext): Promise<ICommandResult> {
    const categorySections = this.categories
      .map((cat) => {
        const cmds = cat.commands
          .map((cmd) => `${cmd.icon} *${cmd.name}* — ${cmd.description}`)
          .join('\n');
        return `*${cat.icon} ${cat.title}*\n${cmds}`;
      })
      .join('\n\n');

    const message = `
${sonya.emoji} *${sonya.name}*

Привет! Я помогу разобраться с программой.

${formatter.header('SleepCore — Справка')}

${categorySections}

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
