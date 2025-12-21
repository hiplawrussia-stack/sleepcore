/**
 * /mindful Command - Mindfulness & Third-Wave Therapies
 * ======================================================
 * Provides MBT-I and ACT-I exercises.
 *
 * Based on 2025 research:
 * - Third-wave therapies trending in insomnia treatment
 * - Calm/Headspace patterns for engagement
 * - ACT defusion techniques for sleep anxiety
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

/**
 * Mindfulness practice type
 */
interface PracticeInfo {
  name: string;
  icon: string;
  duration: number;
  type: 'mbti' | 'acti';
  description: string;
  instructions: string[];
}

/**
 * /mindful Command Implementation
 */
export class MindfulCommand implements ICommand {
  readonly name = 'mindful';
  readonly description = 'Практики осознанности';
  readonly aliases = ['mindfulness', 'meditation', 'осознанность'];
  readonly requiresSession = false;

  /**
   * Available practices
   */
  private readonly practices: Record<string, PracticeInfo> = {
    breath_awareness: {
      name: 'Осознанное дыхание',
      icon: '🧘',
      duration: 5,
      type: 'mbti',
      description: 'Базовая практика внимательности к дыханию',
      instructions: [
        'Сядьте или лягте удобно',
        'Закройте глаза или опустите взгляд',
        'Направьте внимание на дыхание',
        'Замечайте вдох... и выдох...',
        'Когда мысли уводят — мягко возвращайтесь',
        'Не пытайтесь изменить дыхание',
        'Просто наблюдайте с любопытством',
        'Продолжайте 5-10 минут',
      ],
    },
    leaves_on_stream: {
      name: 'Листья на ручье',
      icon: '🍃',
      duration: 10,
      type: 'acti',
      description: 'ACT-техника дефузии от навязчивых мыслей',
      instructions: [
        'Представьте ручей с плывущими листьями',
        'Наблюдайте, как вода несёт их мимо',
        'Когда возникает мысль — поместите её на лист',
        'Наблюдайте, как лист уплывает вдаль',
        'Не держите и не отталкивайте мысли',
        'Позвольте им приходить и уходить',
        'Если "застряли" — вернитесь к наблюдению за ручьём',
        'Мысли — это просто мысли, не факты',
      ],
    },
    acceptance: {
      name: 'Принятие бессонницы',
      icon: '🌙',
      duration: 10,
      type: 'acti',
      description: 'Парадоксальное принятие: меньше борьбы — лучше сон',
      instructions: [
        'Лёжа в постели, признайте: "Сейчас я не сплю"',
        'Вместо борьбы — примите этот момент',
        'Скажите себе: "Я могу не спать и быть в порядке"',
        'Отпустите давление "надо заснуть"',
        'Наблюдайте за телесными ощущениями',
        'Замечайте комфорт постели, температуру',
        'Позвольте сну прийти, когда он готов',
        'Отдых в постели тоже восстанавливает',
      ],
    },
    thought_defusion: {
      name: 'Я замечаю, что думаю...',
      icon: '💭',
      duration: 5,
      type: 'acti',
      description: 'Дистанцирование от тревожных мыслей о сне',
      instructions: [
        'Когда возникает тревожная мысль о сне...',
        'Вместо "Я не засну" скажите:',
        '"Я замечаю, что у меня мысль: я не засну"',
        'Это создаёт расстояние между вами и мыслью',
        'Попробуйте пропеть мысль на мотив песни',
        'Или произнести голосом мультперсонажа',
        'Мысль теряет силу, когда вы её наблюдаете',
        'Вы — не ваши мысли',
      ],
    },
    body_anchor: {
      name: 'Якорь в теле',
      icon: '⚓',
      duration: 5,
      type: 'mbti',
      description: 'Возвращение в настоящий момент через тело',
      instructions: [
        'Почувствуйте контакт тела с поверхностью',
        'Ощутите вес тела, гравитацию',
        'Найдите точки опоры: спина, ноги, руки',
        'Это ваш якорь в настоящем моменте',
        'Когда мысли уносят — возвращайтесь к ощущениям',
        'Тело всегда здесь и сейчас',
        'Используйте его как якорь от тревоги',
      ],
    },
  };

  /**
   * Execute the command
   */
  async execute(ctx: ISleepCoreContext, args?: string): Promise<ICommandResult> {
    if (args) {
      const practice = this.practices[args.toLowerCase()];
      if (practice) {
        return this.showPractice(ctx, args.toLowerCase(), practice);
      }
    }

    // Check if user has MBT-I/ACT-I plan
    const session = ctx.sleepCore.getSession(ctx.userId);
    const hasPlan = session?.mbtiPlan || session?.actiPlan;

    if (hasPlan) {
      return this.showPersonalizedMenu(ctx, session);
    }

    return this.showMenu(ctx);
  }

  // ==================== Response Handlers ====================

  private async showMenu(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const message = `
${formatter.header('Практики осознанности')}

<b>MBT-I</b> (Mindfulness-Based Therapy for Insomnia):
🧘 Осознанное дыхание — базовая практика
⚓ Якорь в теле — заземление

<b>ACT-I</b> (Acceptance & Commitment Therapy):
🍃 Листья на ручье — отпускание мыслей
💭 Дефузия — дистанция от мыслей
🌙 Принятие — парадоксальный подход

${formatter.tip('ACT показывает 48% снижение тревоги о сне')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        { text: '🧘 Дыхание (5м)', callbackData: 'mindful:show:breath_awareness' },
        { text: '⚓ Якорь (5м)', callbackData: 'mindful:show:body_anchor' },
      ],
      [
        { text: '🍃 Листья (10м)', callbackData: 'mindful:show:leaves_on_stream' },
        { text: '💭 Дефузия (5м)', callbackData: 'mindful:show:thought_defusion' },
      ],
      [{ text: '🌙 Принятие бессонницы', callbackData: 'mindful:show:acceptance' }],
    ];

    return {
      success: true,
      message,
      keyboard,
    };
  }

  private async showPersonalizedMenu(
    ctx: ISleepCoreContext,
    session: { mbtiPlan?: unknown; actiPlan?: unknown }
  ): Promise<ICommandResult> {
    // Get personalized practice if available
    let recommendedPractice = 'breath_awareness';
    try {
      const practice = ctx.sleepCore.getMindfulnessPractice(ctx.userId, 'bedtime', 10);
      if (practice) {
        recommendedPractice = practice.practice;
      }
    } catch {
      // Use default
    }

    const recommended = this.practices[recommendedPractice];

    const message = `
${formatter.header('Практики осознанности')}

${formatter.success('У вас активный план терапии!')}

<b>Рекомендовано сегодня:</b>
${recommended.icon} ${recommended.name} (${recommended.duration} мин)

<i>${recommended.description}</i>

${formatter.divider()}

Другие практики доступны ниже.
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: `${recommended.icon} Начать рекомендованную`, callbackData: `mindful:show:${recommendedPractice}` }],
      [
        { text: '🧘 Дыхание', callbackData: 'mindful:show:breath_awareness' },
        { text: '🍃 Листья', callbackData: 'mindful:show:leaves_on_stream' },
      ],
      [
        { text: '💭 Дефузия', callbackData: 'mindful:show:thought_defusion' },
        { text: '🌙 Принятие', callbackData: 'mindful:show:acceptance' },
      ],
    ];

    return {
      success: true,
      message,
      keyboard,
    };
  }

  private async showPractice(
    ctx: ISleepCoreContext,
    id: string,
    practice: PracticeInfo
  ): Promise<ICommandResult> {
    const typeLabel = practice.type === 'mbti' ? 'MBT-I' : 'ACT-I';
    const steps = formatter.numberedList(practice.instructions);

    const message = `
${formatter.header(practice.name)}

${practice.icon} <b>${practice.name}</b>
⏱ ${practice.duration} минут | ${typeLabel}

<i>${practice.description}</i>

${formatter.divider()}

${steps}

${formatter.divider()}

${formatter.tip('Регулярная практика улучшает сон за 2-4 недели')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '⏱ Запустить таймер', callbackData: `mindful:timer:${id}:${practice.duration}` }],
      [{ text: '✅ Выполнено', callbackData: 'mindful:done' }],
      [{ text: '◀️ К списку', callbackData: 'mindful:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { practice: id, type: practice.type },
    };
  }
}

// Export singleton
export const mindfulCommand = new MindfulCommand();
