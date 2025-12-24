/**
 * /relax Command - Relaxation Techniques
 * =======================================
 * Provides guided relaxation exercises based on CBT-I relaxation component.
 *
 * Techniques (European Guideline 2023):
 * - Progressive Muscle Relaxation (PMR)
 * - Diaphragmatic Breathing
 * - Body Scan
 * - Guided Imagery
 * - Autogenic Training
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
 * Relaxation technique details
 */
interface TechniqueInfo {
  name: string;
  icon: string;
  duration: number;
  description: string;
  steps: string[];
}

/**
 * /relax Command Implementation
 */
export class RelaxCommand implements ICommand {
  readonly name = 'relax';
  readonly description = 'Техники релаксации';
  readonly aliases = ['relaxation', 'calm', 'расслабление'];
  readonly requiresSession = false;

  /**
   * Available relaxation techniques
   */
  private readonly techniques: Record<string, TechniqueInfo> = {
    breathing: {
      name: 'Диафрагмальное дыхание',
      icon: '🌬',
      duration: 5,
      description: 'Глубокое дыхание активирует парасимпатическую нервную систему',
      steps: [
        'Лягте или сядьте удобно',
        'Положите руку на живот',
        'Вдохните через нос на 4 счёта — живот поднимается',
        'Задержите на 2 счёта',
        'Выдохните через рот на 6 счётов — живот опускается',
        'Повторяйте 5-10 минут',
      ],
    },
    pmr: {
      name: 'Прогрессивная мышечная релаксация',
      icon: '💪',
      duration: 15,
      description: 'Последовательное напряжение и расслабление мышц снимает физическое напряжение',
      steps: [
        'Лягте удобно и закройте глаза',
        'Начните со стоп: напрягите на 5 секунд, расслабьте',
        'Икры: напрягите на 5 секунд, расслабьте',
        'Бёдра: напрягите на 5 секунд, расслабьте',
        'Живот: напрягите на 5 секунд, расслабьте',
        'Кисти и руки: напрягите на 5 секунд, расслабьте',
        'Плечи: поднимите к ушам, задержите, расслабьте',
        'Лицо: напрягите все мышцы, расслабьте',
        'Почувствуйте волну расслабления по всему телу',
      ],
    },
    body_scan: {
      name: 'Сканирование тела',
      icon: '🧘',
      duration: 10,
      description: 'Осознанное внимание к телесным ощущениям',
      steps: [
        'Лягте удобно, закройте глаза',
        'Направьте внимание на макушку',
        'Медленно "сканируйте" вниз: лоб, глаза, щёки, челюсть',
        'Шея, плечи, руки до кончиков пальцев',
        'Грудь, живот, спина',
        'Бёдра, колени, голени, стопы',
        'Отмечайте ощущения без оценки',
        'Расслабляйте напряжённые области',
      ],
    },
    imagery: {
      name: 'Управляемые образы',
      icon: '🏝',
      duration: 10,
      description: 'Визуализация спокойного места',
      steps: [
        'Закройте глаза и расслабьтесь',
        'Представьте спокойное место (пляж, лес, горы)',
        'Визуализируйте детали: цвета, формы',
        'Добавьте звуки: шум волн, пение птиц',
        'Почувствуйте запахи: морской воздух, хвоя',
        'Ощутите текстуры: тёплый песок, мягкая трава',
        'Погрузитесь в ощущение покоя и безопасности',
        'Оставайтесь в этом месте, пока не почувствуете сонливость',
      ],
    },
    shuffle: {
      name: 'Когнитивный шаффл',
      icon: '🎲',
      duration: 10,
      description: 'Техника отвлечения от тревожных мыслей (Dr. Luc Beaudoin)',
      steps: [
        'Выберите случайное слово (например, "ДЕРЕВО")',
        'Для каждой буквы придумывайте случайные образы:',
        'Д — дом, дельфин, дождь, диван...',
        'Е — ель, енот, единорог...',
        'Р — река, радуга, робот...',
        'Е — ежевика, еда, единица...',
        'В — волна, ваза, велосипед...',
        'О — облако, остров, окно...',
        'Образы должны быть несвязанными и случайными',
      ],
    },
  };

  /**
   * Execute the command
   */
  async execute(ctx: ISleepCoreContext, args?: string): Promise<ICommandResult> {
    if (args) {
      // Show specific technique
      const technique = this.techniques[args.toLowerCase()];
      if (technique) {
        return this.showTechnique(ctx, args.toLowerCase(), technique);
      }
    }

    // Show technique menu
    return this.showMenu(ctx);
  }

  // ==================== Response Handlers ====================

  private async showMenu(ctx: ISleepCoreContext): Promise<ICommandResult> {
    // Get personalized recommendation if available
    let recommendation = '';
    try {
      const rec = ctx.sleepCore.getRelaxationRecommendation(ctx.userId, 'bedtime');
      recommendation = `\n${sonya.tip(`Рекомендую: ${rec.technique}`)}`;
    } catch {
      // No personalized recommendation available
    }

    const message = `
${sonya.emoji} *${sonya.name}*

Расслабление — важная часть подготовки ко сну.

${formatter.header('Техники релаксации')}

Выбери технику для практики:

🌬 *Дыхание* — 5 мин, быстрый эффект
💪 *PMR* — 15 мин, глубокое расслабление
🧘 *Сканирование* — 10 мин, осознанность
🏝 *Образы* — 10 мин, визуализация
🎲 *Шаффл* — 10 мин, от тревожных мыслей
${recommendation}

${sonya.tip('Практикуй за 30-60 минут до сна')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        { text: '🌬 Дыхание (5м)', callbackData: 'relax:show:breathing' },
        { text: '💪 PMR (15м)', callbackData: 'relax:show:pmr' },
      ],
      [
        { text: '🧘 Сканирование', callbackData: 'relax:show:body_scan' },
        { text: '🏝 Образы', callbackData: 'relax:show:imagery' },
      ],
      [{ text: '🎲 Когнитивный шаффл', callbackData: 'relax:show:shuffle' }],
    ];

    return {
      success: true,
      message,
      keyboard,
    };
  }

  private async showTechnique(
    ctx: ISleepCoreContext,
    id: string,
    technique: TechniqueInfo
  ): Promise<ICommandResult> {
    const steps = formatter.numberedList(technique.steps);

    const message = `
${sonya.emoji} *${sonya.name}*

${sonya.say('Отличный выбор! Начинаем практику.')}

${formatter.header(technique.name)}

${technique.icon} *${technique.name}*
⏱ ${technique.duration} минут

_${technique.description}_

${formatter.divider()}

${steps}

${formatter.divider()}

${sonya.tip('Используй эту технику каждый вечер для закрепления навыка')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '⏱ Запустить таймер', callbackData: `relax:timer:${id}:${technique.duration}` }],
      [{ text: '✅ Выполнено', callbackData: 'relax:done' }],
      [{ text: '◀️ К списку', callbackData: 'relax:menu' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { technique: id },
    };
  }
}

// Export singleton
export const relaxCommand = new RelaxCommand();
