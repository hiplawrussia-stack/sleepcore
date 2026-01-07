/**
 * HubMenuService - Hub-and-Spoke Navigation Pattern
 * ==================================================
 *
 * Research-based menu architecture for Telegram bots.
 *
 * Evidence base (30+ sources):
 * - Miller's Law: 7±2 items, modern research suggests 3-5 optimal
 * - Material Design: 3-5 tabs in bottom navigation
 * - NN Group: More than 5 options hard to fit in tab bar
 * - Hub-and-spoke: Central hub reduces cognitive load
 * - Progressive disclosure: Show simple first, reveal complexity gradually
 *
 * Implementation:
 * - 5-6 commands in BotFather (quick access)
 * - /menu as central hub with sections
 * - Sections: Ежедневное, Терапия, Аналитика, Настройки
 * - Context-aware primary actions
 *
 * References:
 * - IxDF: Mobile Navigation Patterns
 * - Telegram Bot Features
 * - grammY Commands Guide
 * - Woebot/Wysa navigation patterns
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services/HubMenuService
 */

import { InlineKeyboard } from 'grammy';
import {
  adaptiveKeyboardService,
} from '../../modules/adaptive-keyboard';

// ==================== Types ====================

/**
 * Menu section configuration
 */
export interface IMenuSection {
  id: string;
  title: string;
  emoji: string;
  commands: IMenuCommand[];
}

/**
 * Menu command configuration
 */
export interface IMenuCommand {
  id: string;
  name: string;
  emoji: string;
  label: string;
  description: string;
  callbackData: string;
}

/**
 * Hub menu layout
 */
export interface IHubMenuLayout {
  title: string;
  subtitle?: string;
  sections: IMenuSection[];
  quickActions: IMenuCommand[];
}

// ==================== Section Definitions ====================

/**
 * Daily commands (high frequency, visible in BotFather)
 */
const DAILY_SECTION: IMenuSection = {
  id: 'daily',
  title: 'Ежедневное',
  emoji: '🔵',
  commands: [
    {
      id: 'diary',
      name: 'diary',
      emoji: '📓',
      label: 'Дневник',
      description: 'Записать сон',
      callbackData: 'menu:diary',
    },
    {
      id: 'mood',
      name: 'mood',
      emoji: '💭',
      label: 'Настроение',
      description: 'Проверить настроение',
      callbackData: 'menu:mood',
    },
    {
      id: 'sleep',
      name: 'sleep',
      emoji: '😴',
      label: 'Сон',
      description: 'Оценить качество сна',
      callbackData: 'hub:sleep',
    },
    {
      id: 'today',
      name: 'today',
      emoji: '☀️',
      label: 'Сегодня',
      description: 'Дневные рекомендации',
      callbackData: 'menu:today',
    },
  ],
};

/**
 * Therapy commands (CBT-I techniques)
 */
const THERAPY_SECTION: IMenuSection = {
  id: 'therapy',
  title: 'Терапия',
  emoji: '🟢',
  commands: [
    {
      id: 'relax',
      name: 'relax',
      emoji: '🧘',
      label: 'Релакс',
      description: 'Техники расслабления',
      callbackData: 'menu:relax',
    },
    {
      id: 'mindful',
      name: 'mindful',
      emoji: '🧠',
      label: 'Осознанность',
      description: 'Практики mindfulness',
      callbackData: 'menu:mindful',
    },
    {
      id: 'rehearsal',
      name: 'rehearsal',
      emoji: '🎭',
      label: 'Репетиция',
      description: 'Мысленная репетиция сна',
      callbackData: 'menu:rehearsal',
    },
    {
      id: 'recall',
      name: 'recall',
      emoji: '🎯',
      label: 'Тест памяти',
      description: 'Утренний quiz',
      callbackData: 'menu:recall',
    },
  ],
};

/**
 * Analytics commands (progress tracking)
 */
const ANALYTICS_SECTION: IMenuSection = {
  id: 'analytics',
  title: 'Аналитика',
  emoji: '📊',
  commands: [
    {
      id: 'progress',
      name: 'progress',
      emoji: '📈',
      label: 'Прогресс',
      description: 'Общий прогресс',
      callbackData: 'menu:progress',
    },
    {
      id: 'mood_week',
      name: 'mood_week',
      emoji: '📆',
      label: 'Неделя',
      description: 'Настроение за неделю',
      callbackData: 'hub:mood_week',
    },
  ],
};

/**
 * Settings commands
 */
const SETTINGS_SECTION: IMenuSection = {
  id: 'settings',
  title: 'Настройки',
  emoji: '⚙️',
  commands: [
    {
      id: 'settings',
      name: 'settings',
      emoji: '⚙️',
      label: 'Настройки',
      description: 'Параметры бота',
      callbackData: 'hub:settings',
    },
    {
      id: 'help',
      name: 'help',
      emoji: '❓',
      label: 'Справка',
      description: 'Помощь и команды',
      callbackData: 'menu:help',
    },
    {
      id: 'sos',
      name: 'sos',
      emoji: '🆘',
      label: 'SOS',
      description: 'Экстренная помощь',
      callbackData: 'menu:sos',
    },
  ],
};

/**
 * All sections in display order
 */
const ALL_SECTIONS: IMenuSection[] = [
  DAILY_SECTION,
  THERAPY_SECTION,
  ANALYTICS_SECTION,
  SETTINGS_SECTION,
];

// ==================== HubMenuService ====================

/**
 * HubMenuService - Central hub for all bot commands
 */
export class HubMenuService {
  /**
   * Get all sections
   */
  getSections(): IMenuSection[] {
    return ALL_SECTIONS;
  }

  /**
   * Get section by ID
   */
  getSection(id: string): IMenuSection | undefined {
    return ALL_SECTIONS.find((s) => s.id === id);
  }

  /**
   * Get command by ID
   */
  getCommand(id: string): IMenuCommand | undefined {
    for (const section of ALL_SECTIONS) {
      const cmd = section.commands.find((c) => c.id === id);
      if (cmd) return cmd;
    }
    return undefined;
  }

  /**
   * Generate full hub menu message
   */
  generateHubMessage(userName?: string): string {
    const name = userName || 'друг';
    let message = `📱 *Главное меню*\n`;
    message += `_Привет, ${name}! Выбери действие:_\n\n`;

    for (const section of ALL_SECTIONS) {
      message += `${section.emoji} *${section.title}*\n`;

      for (const cmd of section.commands) {
        message += `  ${cmd.emoji} /${cmd.name} — ${cmd.description}\n`;
      }

      message += '\n';
    }

    message += `───────────────\n`;
    message += `_Совет: используй кнопки ниже для быстрого доступа_`;

    return message;
  }

  /**
   * Generate compact hub menu (sections as headers, buttons below)
   */
  generateCompactHubMessage(userName?: string): string {
    const name = userName || 'друг';
    return (
      `📱 *Главное меню*\n\n` +
      `_${name}, выбери категорию или действие:_`
    );
  }

  /**
   * Build full hub keyboard with all sections
   */
  buildHubKeyboard(): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    for (const section of ALL_SECTIONS) {
      // Section header as first button in row
      // keyboard.text(`${section.emoji} ${section.title}`, `hub:section:${section.id}`);
      // keyboard.row();

      // Commands in rows of 2
      const commands = section.commands;
      for (let i = 0; i < commands.length; i += 2) {
        const cmd1 = commands[i];
        keyboard.text(`${cmd1.emoji} ${cmd1.label}`, cmd1.callbackData);

        if (i + 1 < commands.length) {
          const cmd2 = commands[i + 1];
          keyboard.text(`${cmd2.emoji} ${cmd2.label}`, cmd2.callbackData);
        }

        keyboard.row();
      }
    }

    return keyboard;
  }

  /**
   * Build section-based keyboard (Progressive Disclosure)
   * Shows section buttons first, then expands on click
   */
  buildSectionKeyboard(): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    // First row: Daily section (most used)
    keyboard.text('📓 Дневник', 'menu:diary');
    keyboard.text('💭 Настроение', 'hub:mood');
    keyboard.row();

    // Second row: Section expanders
    keyboard.text('🟢 Терапия', 'hub:section:therapy');
    keyboard.text('📊 Аналитика', 'hub:section:analytics');
    keyboard.row();

    // Third row: Quick access
    keyboard.text('❓ Справка', 'menu:help');
    keyboard.text('🆘 SOS', 'menu:sos');
    keyboard.row();

    return keyboard;
  }

  /**
   * Build keyboard for specific section
   */
  buildSectionExpandedKeyboard(sectionId: string): InlineKeyboard {
    const section = this.getSection(sectionId);
    if (!section) return new InlineKeyboard();

    const keyboard = new InlineKeyboard();

    // Section commands in rows of 2
    const commands = section.commands;
    for (let i = 0; i < commands.length; i += 2) {
      const cmd1 = commands[i];
      keyboard.text(`${cmd1.emoji} ${cmd1.label}`, cmd1.callbackData);

      if (i + 1 < commands.length) {
        const cmd2 = commands[i + 1];
        keyboard.text(`${cmd2.emoji} ${cmd2.label}`, cmd2.callbackData);
      }

      keyboard.row();
    }

    // Back button
    keyboard.text('◀️ Назад', 'hub:back');

    return keyboard;
  }

  /**
   * Generate section expanded message
   */
  generateSectionMessage(sectionId: string): string {
    const section = this.getSection(sectionId);
    if (!section) return 'Раздел не найден';

    let message = `${section.emoji} *${section.title}*\n\n`;

    for (const cmd of section.commands) {
      message += `${cmd.emoji} *${cmd.label}*\n`;
      message += `_${cmd.description}_\n\n`;
    }

    return message;
  }

  /**
   * Generate help message with all commands (for /help)
   */
  generateHelpMessage(): string {
    let message = `❓ *Справка по командам*\n\n`;

    message += `*Быстрый доступ (в меню бота):*\n`;
    message += `• /start — Начать работу\n`;
    message += `• /menu — Главное меню\n`;
    message += `• /diary — Дневник сна\n`;
    message += `• /mood — Настроение\n`;
    message += `• /sos — Экстренная помощь\n`;
    message += `• /help — Эта справка\n\n`;

    message += `───────────────\n\n`;

    for (const section of ALL_SECTIONS) {
      message += `${section.emoji} *${section.title}:*\n`;

      for (const cmd of section.commands) {
        message += `• /${cmd.name} — ${cmd.description}\n`;
      }

      message += '\n';
    }

    message += `───────────────\n`;
    message += `_Все команды также доступны через /menu_`;

    return message;
  }

  /**
   * Get commands for BotFather registration (Hub Model: 5-6 only)
   */
  getHubModelCommands(): { command: string; description: string }[] {
    return [
      { command: 'start', description: '🚀 Начать работу с ботом' },
      { command: 'menu', description: '📱 Все функции (главное меню)' },
      { command: 'diary', description: '📓 Дневник сна' },
      { command: 'mood', description: '💭 Проверка настроения' },
      { command: 'sos', description: '🆘 Экстренная помощь' },
      { command: 'help', description: '❓ Справка и все команды' },
    ];
  }
}

// ==================== Singleton Export ====================

export const hubMenu = new HubMenuService();

export default hubMenu;

// ==================== Adaptive Keyboard Integration ====================

/**
 * Build adaptive keyboard for a user
 * Uses AdaptiveKeyboardService for personalized command ordering
 *
 * @param userId - User's Telegram ID
 * @returns Personalized InlineKeyboard
 */
export async function buildAdaptiveHubKeyboard(userId: string): Promise<InlineKeyboard> {
  return adaptiveKeyboardService.generateKeyboard(userId);
}

/**
 * Record user command interaction for adaptive learning
 *
 * @param userId - User's Telegram ID
 * @param command - Command that was clicked
 * @param sessionId - Optional session identifier
 */
export async function recordHubInteraction(
  userId: string,
  command: string,
  sessionId?: string
): Promise<void> {
  await adaptiveKeyboardService.recordCommandClick(userId, command, sessionId);
}

/**
 * Get personalized keyboard layout for a user
 *
 * @param userId - User's Telegram ID
 * @returns Keyboard layout with adaptation info
 */
export async function getAdaptiveLayout(userId: string) {
  return adaptiveKeyboardService.generateLayout(userId);
}
