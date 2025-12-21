/**
 * RelaxationEngine - Relaxation Training Implementation
 * ======================================================
 * Implements various relaxation techniques for sleep preparation.
 *
 * Techniques included:
 * - Progressive Muscle Relaxation (Jacobson, 1938)
 * - Diaphragmatic Breathing
 * - Body Scan Meditation
 * - Guided Imagery
 * - Autogenic Training
 * - Mindfulness Meditation
 * - Cognitive Shuffle (Luc Beaudoin's technique)
 *
 * @packageDocumentation
 * @module @sleepcore/cbt-i
 */

import type {
  IRelaxationEngine,
  IRelaxationSession,
  IRelaxationProtocol,
  RelaxationTechnique,
} from '../interfaces/ICBTIComponents';
import type { ISleepState } from '../../sleep/interfaces/ISleepState';

/**
 * Relaxation protocols for different contexts
 */
const PROTOCOLS: Record<string, IRelaxationProtocol> = {
  beginner_bedtime: {
    id: 'beginner_bedtime',
    name: 'Вечернее расслабление для начинающих',
    techniques: ['diaphragmatic_breathing', 'body_scan'],
    totalDuration: 15,
    targetContext: 'bedtime',
    difficulty: 'beginner',
  },
  intermediate_bedtime: {
    id: 'intermediate_bedtime',
    name: 'Полное вечернее расслабление',
    techniques: ['progressive_muscle_relaxation', 'guided_imagery'],
    totalDuration: 25,
    targetContext: 'bedtime',
    difficulty: 'intermediate',
  },
  advanced_bedtime: {
    id: 'advanced_bedtime',
    name: 'Глубокое расслабление мастера',
    techniques: ['autogenic_training', 'mindfulness_meditation', 'cognitive_shuffle'],
    totalDuration: 35,
    targetContext: 'bedtime',
    difficulty: 'advanced',
  },
  daytime_stress: {
    id: 'daytime_stress',
    name: 'Дневное снятие стресса',
    techniques: ['diaphragmatic_breathing', 'progressive_muscle_relaxation'],
    totalDuration: 10,
    targetContext: 'daytime',
    difficulty: 'beginner',
  },
  wakeup_calm: {
    id: 'wakeup_calm',
    name: 'Спокойное пробуждение',
    techniques: ['body_scan', 'mindfulness_meditation'],
    totalDuration: 10,
    targetContext: 'wakeup',
    difficulty: 'beginner',
  },
};

/**
 * Instructions for each technique
 */
const TECHNIQUE_INSTRUCTIONS: Record<RelaxationTechnique, { name: string; steps: string[] }> = {
  progressive_muscle_relaxation: {
    name: 'Прогрессивная мышечная релаксация',
    steps: [
      'Лягте удобно и закройте глаза.',
      'Начнём с ног. Напрягите мышцы стоп, сжав пальцы. Удерживайте 5 секунд...',
      'Расслабьте. Почувствуйте разницу между напряжением и расслаблением.',
      'Напрягите икроножные мышцы. Удерживайте 5 секунд...',
      'Расслабьте. Обратите внимание на ощущение тепла и тяжести.',
      'Напрягите мышцы бёдер и ягодиц. Удерживайте 5 секунд...',
      'Расслабьте. Позвольте напряжению уйти.',
      'Напрягите мышцы живота. Удерживайте 5 секунд...',
      'Расслабьте. Дышите медленно и глубоко.',
      'Сожмите кулаки и напрягите руки. Удерживайте 5 секунд...',
      'Расслабьте. Почувствуйте, как руки становятся тяжёлыми.',
      'Поднимите плечи к ушам. Удерживайте 5 секунд...',
      'Расслабьте. Отпустите всё напряжение.',
      'Напрягите мышцы лица: нахмурьтесь, зажмурьтесь. Удерживайте 5 секунд...',
      'Расслабьте. Пусть лицо станет гладким и спокойным.',
      'Просканируйте тело. Если где-то осталось напряжение — отпустите его.',
      'Оставайтесь в этом расслабленном состоянии, дыша медленно и глубоко.',
    ],
  },
  diaphragmatic_breathing: {
    name: 'Диафрагмальное дыхание',
    steps: [
      'Лягте или сядьте удобно. Положите одну руку на грудь, другую на живот.',
      'Сделайте медленный глубокий вдох через нос на 4 счёта.',
      'При вдохе живот должен подниматься, а грудь оставаться неподвижной.',
      'Задержите дыхание на 2 счёта.',
      'Медленно выдохните через рот на 6 счётов.',
      'Почувствуйте, как живот опускается.',
      'Продолжайте дышать в ритме: вдох 4, пауза 2, выдох 6.',
      'С каждым выдохом отпускайте напряжение.',
      'Сосредоточьтесь только на дыхании. Мысли приходят и уходят.',
      'Продолжайте 5-10 минут или пока не почувствуете расслабление.',
    ],
  },
  body_scan: {
    name: 'Сканирование тела',
    steps: [
      'Лягте удобно. Закройте глаза.',
      'Обратите внимание на своё дыхание. Не меняйте его, просто наблюдайте.',
      'Направьте внимание на макушку головы. Что вы чувствуете?',
      'Медленно перемещайте внимание вниз: лоб, глаза, щёки, челюсть.',
      'Отметьте любые ощущения без осуждения.',
      'Перейдите к шее и плечам. Расслабьте их.',
      'Просканируйте руки: плечи, локти, запястья, ладони, кончики пальцев.',
      'Перейдите к груди и спине. Отметьте дыхание.',
      'Просканируйте живот и поясницу.',
      'Перейдите к бёдрам, коленям, голеням, стопам, пальцам ног.',
      'Ощутите всё тело целиком. Оно расслаблено и спокойно.',
      'Оставайтесь в этом состоянии, пока не почувствуете сонливость.',
    ],
  },
  guided_imagery: {
    name: 'Направленная визуализация',
    steps: [
      'Закройте глаза и сделайте несколько глубоких вдохов.',
      'Представьте себе спокойное, безопасное место. Это может быть пляж, лес, горы.',
      'Визуализируйте каждую деталь. Какие цвета вы видите?',
      'Добавьте звуки: шум волн, пение птиц, шелест листьев.',
      'Какие запахи присутствуют? Морской воздух? Хвоя? Цветы?',
      'Почувствуйте текстуры: тёплый песок, мягкая трава, прохладный ветерок.',
      'Вы в полной безопасности. Это ваше место покоя.',
      'Погрузитесь глубже в эту сцену с каждым выдохом.',
      'Позвольте покою этого места наполнить вас.',
      'Когда будете готовы заснуть, позвольте образу мягко раствориться.',
    ],
  },
  autogenic_training: {
    name: 'Аутогенная тренировка',
    steps: [
      'Лягте удобно. Закройте глаза.',
      'Повторяйте про себя: "Моя правая рука тяжёлая... очень тяжёлая..."',
      'Почувствуйте тяжесть в правой руке.',
      '"Моя левая рука тяжёлая... очень тяжёлая..."',
      '"Обе руки тяжёлые и расслабленные..."',
      '"Мои ноги тяжёлые... очень тяжёлые..."',
      '"Всё тело тяжёлое и расслабленное..."',
      'Теперь тепло: "Моя правая рука тёплая... приятно тёплая..."',
      '"Тепло распространяется по всему телу..."',
      '"Моё сердце бьётся спокойно и ровно..."',
      '"Дыхание лёгкое и естественное..."',
      '"Мой живот мягкий и тёплый..."',
      '"Мой лоб приятно прохладный..."',
      '"Я совершенно спокоен... совершенно спокоен..."',
    ],
  },
  mindfulness_meditation: {
    name: 'Майндфулнес-медитация',
    steps: [
      'Сядьте или лягте удобно. Закройте глаза.',
      'Направьте внимание на дыхание. Не контролируйте его.',
      'Просто наблюдайте: вдох... выдох...',
      'Когда появляются мысли — это нормально.',
      'Заметьте мысль: "Вот мысль о [работе/завтра/прошлом]"',
      'Мягко верните внимание к дыханию.',
      'Не боритесь с мыслями, не цепляйтесь за них.',
      'Они как облака — приходят и уходят.',
      'Вы — небо. Мысли — облака. Они не меняют вас.',
      'Продолжайте наблюдать дыхание.',
      'С каждым выдохом всё глубже погружайтесь в настоящий момент.',
      'Здесь и сейчас всё хорошо. Вы в безопасности.',
    ],
  },
  cognitive_shuffle: {
    name: 'Когнитивный шаффл',
    steps: [
      'Лягте удобно с закрытыми глазами.',
      'Выберите любое слово из 5+ букв. Например: "ПЕРСИК".',
      'Для каждой буквы слова придумывайте случайные образы.',
      'П: Подушка. Представьте мягкую подушку. Пальма. Высокая пальма.',
      'Е: Енот. Пушистый енот. Ёлка. Зелёная ёлка.',
      'Р: Радуга. Яркая радуга. Ракета. Летящая ракета.',
      'С: Снежинка. Нежная снежинка. Солнце. Тёплое солнце.',
      'И: Игрушка. Любимая игрушка. Избушка. Маленькая избушка.',
      'К: Кот. Спящий кот. Корабль. Большой корабль.',
      'Образы должны быть случайными, не связанными логически.',
      'Это занимает "логический" мозг, позволяя заснуть.',
      'Если закончили слово — возьмите новое.',
    ],
  },
};

/**
 * Relaxation Engine Implementation
 */
export class RelaxationEngine implements IRelaxationEngine {
  /**
   * Recommend a technique based on current state and context
   */
  recommendTechnique(
    sleepState: ISleepState,
    context: 'bedtime' | 'daytime' | 'wakeup'
  ): RelaxationTechnique {
    const arousal = sleepState.cognitions.preSleepArousal;
    const anxiety = sleepState.cognitions.sleepAnxiety;

    if (context === 'bedtime') {
      // High arousal/anxiety: need structured techniques
      if (arousal > 0.7 || anxiety > 0.7) {
        return 'progressive_muscle_relaxation';
      }
      // Moderate arousal: breathing or body scan
      if (arousal > 0.4) {
        return 'diaphragmatic_breathing';
      }
      // Low arousal: can use cognitive techniques
      if (sleepState.metrics.sleepOnsetLatency > 30) {
        return 'cognitive_shuffle';
      }
      return 'guided_imagery';
    }

    if (context === 'daytime') {
      // Quick stress relief
      if (anxiety > 0.5) {
        return 'diaphragmatic_breathing';
      }
      return 'mindfulness_meditation';
    }

    // wakeup context
    return 'body_scan';
  }

  /**
   * Get a protocol for user level and context
   */
  getProtocol(
    userLevel: 'beginner' | 'intermediate' | 'advanced',
    targetContext: 'bedtime' | 'daytime' | 'wakeup'
  ): IRelaxationProtocol {
    const key = `${userLevel}_${targetContext}`;

    // Try exact match
    if (PROTOCOLS[key]) {
      return PROTOCOLS[key];
    }

    // Fallback logic
    if (targetContext === 'bedtime') {
      return PROTOCOLS[`${userLevel}_bedtime`] || PROTOCOLS.beginner_bedtime;
    }
    if (targetContext === 'daytime') {
      return PROTOCOLS.daytime_stress;
    }
    return PROTOCOLS.wakeup_calm;
  }

  /**
   * Generate step-by-step instructions for a technique
   */
  generateInstructions(technique: RelaxationTechnique, duration: number): string[] {
    const techniqueData = TECHNIQUE_INSTRUCTIONS[technique];
    if (!techniqueData) {
      return ['Закройте глаза и дышите медленно и глубоко.'];
    }

    const steps = [...techniqueData.steps];

    // If duration is short, truncate steps
    if (duration < 5) {
      return steps.slice(0, 5);
    }
    if (duration < 10) {
      return steps.slice(0, Math.min(8, steps.length));
    }

    // For longer durations, might add extra pauses or repetitions
    if (duration > 20) {
      steps.push('Продолжайте в своём темпе ещё несколько минут.');
      steps.push('Когда почувствуете готовность, позвольте себе уснуть.');
    }

    return steps;
  }

  /**
   * Calculate effectiveness of relaxation sessions
   */
  calculateEffectiveness(sessions: IRelaxationSession[]): {
    avgAnxietyReduction: number;
    mostEffectiveTechnique: RelaxationTechnique;
  } {
    if (sessions.length === 0) {
      return {
        avgAnxietyReduction: 0,
        mostEffectiveTechnique: 'diaphragmatic_breathing',
      };
    }

    // Calculate average anxiety reduction across all sessions
    let totalAnxietyReduction = 0;
    const techniqueEffectiveness: Record<string, { total: number; count: number }> = {};

    for (const session of sessions) {
      if (session.completed) {
        const anxietyReduction = session.preAnxietyLevel - session.postAnxietyLevel;
        const tensionReduction = session.preTensionLevel - session.postTensionLevel;
        const avgReduction = (anxietyReduction + tensionReduction) / 2;

        totalAnxietyReduction += anxietyReduction;

        if (!techniqueEffectiveness[session.technique]) {
          techniqueEffectiveness[session.technique] = { total: 0, count: 0 };
        }
        techniqueEffectiveness[session.technique].total += avgReduction;
        techniqueEffectiveness[session.technique].count += 1;
      }
    }

    const completedSessions = sessions.filter((s) => s.completed).length;
    const avgAnxietyReduction = completedSessions > 0 ? totalAnxietyReduction / completedSessions : 0;

    // Find most effective technique
    let mostEffectiveTechnique: RelaxationTechnique = 'diaphragmatic_breathing';
    let bestAvgReduction = -Infinity;

    for (const [technique, data] of Object.entries(techniqueEffectiveness)) {
      const avgReduction = data.count > 0 ? data.total / data.count : 0;
      if (avgReduction > bestAvgReduction) {
        bestAvgReduction = avgReduction;
        mostEffectiveTechnique = technique as RelaxationTechnique;
      }
    }

    return { avgAnxietyReduction, mostEffectiveTechnique };
  }
}
