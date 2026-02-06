/**
 * ClinicalContent - Centralized Clinical Content Repository
 * ==========================================================
 *
 * This module centralizes all clinical text content used in commands.
 * Per CLAUDE.md §13.4, clinical content should NOT be hardcoded in commands.
 *
 * Benefits:
 * - Single source of truth for clinical messaging
 * - Easier clinical review and updates
 * - Supports future i18n/localization
 * - Clear separation of code and clinical content
 *
 * Scientific Foundation:
 * - CBT-I: Spielman 1987, Bootzin 1972, Morin 1993
 * - MBT-I: Ong et al. 2014
 * - ACT-I: Meadows 2014, Lundh & Broman 2000
 * - MCT: Wells 2009
 *
 * @packageDocumentation
 * @module @sleepcore/modules/content/clinical
 */

// =============================================================================
// CBT-I COMPONENT CONTENT
// =============================================================================

/**
 * CBT-I therapy component identifiers
 */
export type CBTIComponent =
  | 'sleep_restriction'
  | 'stimulus_control'
  | 'cognitive_restructuring'
  | 'sleep_hygiene'
  | 'relaxation';

/**
 * Help messages for each CBT-I component
 * Used when users need guidance during therapy
 */
export interface ICBTIComponentHelp {
  readonly component: CBTIComponent;
  readonly helpMessage: string;
  readonly tips: readonly string[];
  readonly commonChallenges: readonly string[];
  readonly encouragement: string;
}

/**
 * CBT-I component help content
 * Source: European Insomnia Guideline 2023, Spielman 1987
 */
export const CBTI_COMPONENT_HELP: Readonly<Record<CBTIComponent, ICBTIComponentHelp>> = {
  sleep_restriction: {
    component: 'sleep_restriction',
    helpMessage: 'Ограничение сна может быть сложным первые дни. Главное - не ложиться раньше расчётного времени.',
    tips: [
      'Строго соблюдайте расчётное время подъёма',
      'Не ложитесь раньше назначенного времени',
      'Избегайте дневного сна',
      'Дневная сонливость — это нормально и временно',
    ],
    commonChallenges: [
      'Сильная дневная сонливость',
      'Трудно не лечь раньше',
      'Кажется нелогичным меньше спать',
    ],
    encouragement: 'Эффективность сна улучшится через 1-2 недели. Вы на правильном пути!',
  },

  stimulus_control: {
    component: 'stimulus_control',
    helpMessage: 'Если не можете уснуть 20 минут - встаньте. Вернитесь когда почувствуете сонливость.',
    tips: [
      'Кровать только для сна (и интимной близости)',
      'Вставайте если не спите 15-20 минут',
      'Возвращайтесь только при явной сонливости',
      'Делайте что-то спокойное вне кровати',
    ],
    commonChallenges: [
      'Не хочется вставать ночью',
      'Страх что станет хуже',
      'Холодно/неуютно вставать',
    ],
    encouragement: 'Так кровать снова станет ассоциироваться только со сном.',
  },

  cognitive_restructuring: {
    component: 'cognitive_restructuring',
    helpMessage: 'Запишите тревожные мысли в дневник. Мы разберём их вместе.',
    tips: [
      'Записывайте автоматические мысли о сне',
      'Ищите искажения мышления',
      'Формулируйте альтернативные мысли',
      'Проверяйте катастрофические предсказания',
    ],
    commonChallenges: [
      'Мысли кажутся абсолютно верными',
      'Трудно поймать автоматические мысли',
      'Альтернативы не убеждают',
    ],
    encouragement: 'Изменение мышления требует практики. Каждый шаг важен.',
  },

  sleep_hygiene: {
    component: 'sleep_hygiene',
    helpMessage: 'Начните с одного изменения. Маленькие шаги ведут к большим результатам.',
    tips: [
      'Ограничьте кофеин после 14:00',
      'Создайте тёмную прохладную спальню',
      'Избегайте экранов за час до сна',
      'Регулярные физические упражнения (не вечером)',
    ],
    commonChallenges: [
      'Слишком много правил сразу',
      'Сложно отказаться от привычек',
      'Не вижу быстрого эффекта',
    ],
    encouragement: 'Гигиена сна — фундамент. Изменения накапливаются.',
  },

  relaxation: {
    component: 'relaxation',
    helpMessage: 'Попробуйте технику прямо сейчас. Я проведу вас через неё.',
    tips: [
      'Практикуйте технику ежедневно',
      'Начинайте расслабление до сильной сонливости',
      'Не ожидайте мгновенного засыпания',
      'Используйте как ритуал перед сном',
    ],
    commonChallenges: [
      'Не могу расслабиться',
      'Мысли отвлекают',
      'Становится скучно',
    ],
    encouragement: 'Расслабление — навык. С практикой становится легче.',
  },
};

/**
 * Get help message for a CBT-I component
 */
export function getCBTIComponentHelp(component: string): string {
  const help = CBTI_COMPONENT_HELP[component as CBTIComponent];
  return help?.helpMessage ?? 'Я здесь, чтобы помочь. Опишите вашу ситуацию.';
}

/**
 * Get full help content for a CBT-I component
 */
export function getCBTIComponentFullHelp(component: string): ICBTIComponentHelp | null {
  return CBTI_COMPONENT_HELP[component as CBTIComponent] ?? null;
}

// =============================================================================
// THIRD-WAVE THERAPY CONTENT
// =============================================================================

/**
 * Third-wave therapy identifiers
 */
export type ThirdWaveTherapyId = 'mbti' | 'acti' | 'mct';

/**
 * Third-wave therapy session metadata
 * Contains static descriptive content (not patient-specific)
 */
export interface IThirdWaveTherapyInfo {
  readonly id: ThirdWaveTherapyId;
  readonly title: string;
  readonly titleRu: string;
  readonly description: string;
  readonly sessions: number;
  readonly icon: string;
  readonly bestFor: readonly string[];
  readonly contraindications: readonly string[];
  readonly scientificBasis: string;
  readonly keyTechniques: readonly string[];
}

/**
 * Third-wave therapy metadata
 *
 * Sources:
 * - MBT-I: Ong et al. 2014, effect size d=1.32
 * - ACT-I: Meadows 2014, Dalrymple 2010, effect size d=0.68
 * - MCT: Wells 2009, Papageorgiou & Wells 2003, effect size d=0.54
 */
export const THIRD_WAVE_THERAPIES: Readonly<Record<ThirdWaveTherapyId, IThirdWaveTherapyInfo>> = {
  mbti: {
    id: 'mbti',
    title: 'MBT-I (Mindfulness-Based Therapy)',
    titleRu: 'Осознанность для сна (MBT-I)',
    description: 'Терапия на основе осознанности, разработанная Jason Ong. Интегрирует медитацию с поведенческими техниками сна.',
    sessions: 8,
    icon: '🧘',
    bestFor: [
      'Когнитивное возбуждение (racing thoughts)',
      'Соматическое напряжение',
      'Усилие уснуть (trying too hard)',
    ],
    contraindications: ['Психоз', 'Тяжёлая депрессия', 'Острое ПТСР'],
    scientificBasis: 'Ong et al. 2014: RCT показал d=1.32 для снижения ISI',
    keyTechniques: [
      'Осознанное дыхание',
      'Сканирование тела',
      'Сидячая медитация',
      '3-минутное дыхательное пространство',
    ],
  },

  acti: {
    id: 'acti',
    title: 'ACT-I (Acceptance & Commitment Therapy)',
    titleRu: 'Принятие и приверженность (ACT-I)',
    description: 'Терапия принятия и приверженности для инсомнии. Фокус на психологической гибкости вместо контроля сна.',
    sessions: 6,
    icon: '🌿',
    bestFor: [
      'Избегающее поведение',
      'Борьба с мыслями',
      'Трудности с приверженностью CBT-I',
    ],
    contraindications: ['Острое суицидальное состояние'],
    scientificBasis: 'Meadows 2014, Dalrymple 2010: d=0.68 для ISI',
    keyTechniques: [
      'Принятие (acceptance)',
      'Когнитивная дефузия',
      'Присутствие в моменте',
      'Ценности и приверженные действия',
    ],
  },

  mct: {
    id: 'mct',
    title: 'MCT (Metacognitive Therapy)',
    titleRu: 'Метакогнитивная терапия (MCT)',
    description: 'Терапия Adrian Wells, направленная на изменение отношения к мыслям. Включает откладывание беспокойства и тренировку внимания.',
    sessions: 8,
    icon: '🎯',
    bestFor: [
      'Хроническое беспокойство',
      'Руминация о последствиях бессонницы',
      'Метакогнитивные убеждения ("я должен контролировать мысли")',
    ],
    contraindications: ['Когнитивные нарушения', 'Психоз', 'Тяжёлая депрессия'],
    scientificBasis: 'Wells 2009, Papageorgiou & Wells 2003: d=0.54',
    keyTechniques: [
      'Откладывание беспокойства (worry postponement)',
      'Отстранённая осознанность (detached mindfulness)',
      'Тренировка внимания (ATT)',
      'Оспаривание метакогниций',
    ],
  },
};

/**
 * Get all third-wave therapy infos as array
 */
export function getThirdWaveTherapies(): readonly IThirdWaveTherapyInfo[] {
  return Object.values(THIRD_WAVE_THERAPIES);
}

/**
 * Get third-wave therapy info by ID
 */
export function getThirdWaveTherapyInfo(id: string): IThirdWaveTherapyInfo | null {
  return THIRD_WAVE_THERAPIES[id as ThirdWaveTherapyId] ?? null;
}

/**
 * Check if therapy is contraindicated for a condition
 */
export function isTherapyContraindicated(
  therapyId: ThirdWaveTherapyId,
  conditions: string[]
): boolean {
  const therapy = THIRD_WAVE_THERAPIES[therapyId];
  if (!therapy) return false;

  return therapy.contraindications.some(contra =>
    conditions.some(cond =>
      cond.toLowerCase().includes(contra.toLowerCase())
    )
  );
}

// =============================================================================
// GENERAL CLINICAL MESSAGES
// =============================================================================

/**
 * Default fallback messages for when specific content is not available
 */
export const CLINICAL_FALLBACK_MESSAGES = {
  /** When no specific intervention is available */
  noIntervention: 'Я здесь, чтобы помочь. Опишите вашу ситуацию.',

  /** When no alternatives are available */
  noAlternatives: 'Попробуйте выполнить текущее задание или свяжитесь с нами для обсуждения.',

  /** General support message */
  generalSupport: 'Вы делаете важную работу над своим сном. Продолжайте!',

  /** When user reports difficulty */
  difficultyAcknowledgment: 'Я понимаю, что это непросто. Давайте разберёмся вместе.',
} as const;

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  CBTI_COMPONENT_HELP,
  THIRD_WAVE_THERAPIES,
  CLINICAL_FALLBACK_MESSAGES,
  getCBTIComponentHelp,
  getCBTIComponentFullHelp,
  getThirdWaveTherapies,
  getThirdWaveTherapyInfo,
  isTherapyContraindicated,
};
