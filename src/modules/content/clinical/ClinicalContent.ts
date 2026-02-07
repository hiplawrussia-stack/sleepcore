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
// CBT-I COMPONENT DISPLAY NAMES & ICONS
// =============================================================================

/**
 * Centralized CBT-I component display names (Russian)
 * Used across TodayCommand, TherapyCommand, and other therapy-related commands
 * Source: European Insomnia Guideline 2023
 */
export const CBTI_COMPONENT_NAMES: Readonly<Record<CBTIComponent, string>> = {
  sleep_restriction: 'Ограничение сна',
  stimulus_control: 'Контроль стимулов',
  cognitive_restructuring: 'Когнитивная работа',
  sleep_hygiene: 'Гигиена сна',
  relaxation: 'Релаксация',
} as const;

/**
 * CBT-I component icons for consistent UI display
 */
export const CBTI_COMPONENT_ICONS: Readonly<Record<CBTIComponent, string>> = {
  sleep_restriction: '🛏',
  stimulus_control: '🚪',
  cognitive_restructuring: '🧠',
  sleep_hygiene: '🌙',
  relaxation: '🧘',
} as const;

/**
 * Selection reasons explaining why each CBT-I component was chosen
 * Used in TodayCommand for AI recommendation explanations
 * Source: Furukawa 2024 JAMA NMA, European Insomnia Guideline 2023
 */
export const CBTI_COMPONENT_SELECTION_REASONS: Readonly<Record<CBTIComponent, string>> = {
  sleep_restriction: `
🎯 *Ограничение сна* выбрано потому что:
• Эффективность сна ниже 85%
• Это самый эффективный компонент CBT-I (Grade A)
• Помогает сконцентрировать сон и повысить его глубину
  `.trim(),
  stimulus_control: `
🎯 *Контроль стимулов* выбран потому что:
• Есть признаки условного возбуждения в постели
• Кровать должна ассоциироваться только со сном
• Это второй по эффективности компонент CBT-I
  `.trim(),
  cognitive_restructuring: `
🎯 *Когнитивная работа* выбрана потому что:
• Обнаружены дисфункциональные убеждения о сне
• Тревога и катастрофизация мешают засыпанию
• Работа с мыслями улучшает качество сна
  `.trim(),
  sleep_hygiene: `
🎯 *Гигиена сна* выбрана потому что:
• Есть возможности для улучшения среды сна
• Базовые привычки влияют на качество сна
• Это фундамент для других техник
  `.trim(),
  relaxation: `
🎯 *Релаксация* выбрана потому что:
• Обнаружено повышенное возбуждение перед сном
• Техники расслабления снижают время засыпания
• Помогает переключиться в режим отдыха
  `.trim(),
} as const;

// =============================================================================
// CBT-I CORE SESSIONS (6-Week Program)
// =============================================================================

/**
 * Core session identifiers for 6-week CBT-I program
 * Based on SHUTi/Somryst evidence-based model
 */
export type TherapyCore =
  | 'overview'
  | 'sleep_behavior_1'
  | 'sleep_behavior_2'
  | 'sleep_education'
  | 'sleep_thoughts'
  | 'problem_prevention';

/**
 * Core session structure for CBT-I program
 */
export interface ICoreSession {
  readonly id: TherapyCore;
  readonly weekNumber: number;
  readonly title: string;
  readonly titleRu: string;
  readonly duration: string;
  readonly objectives: readonly string[];
  readonly components: readonly string[];
  readonly homework: readonly string[];
  readonly icon: string;
}

/**
 * 6-Core CBT-I Session Structure
 * Based on SHUTi/Somryst evidence-based model
 * Source: European Insomnia Guideline 2023, Spielman 1987
 */
export const CORE_SESSIONS: readonly ICoreSession[] = [
  {
    id: 'overview',
    weekNumber: 1,
    title: 'Overview',
    titleRu: 'Обзор программы',
    duration: '30-45 мин',
    icon: '📚',
    objectives: [
      'Понять природу и механизмы инсомнии',
      'Узнать о 3P-модели (Spielman)',
      'Ознакомиться со структурой программы КПТ-И',
      'Установить реалистичные ожидания от терапии',
    ],
    components: [
      'Психообразование о сне и инсомнии',
      '3P-модель (Predisposing, Precipitating, Perpetuating)',
      'Обзор 5 компонентов КПТ-И',
      'Важность ведения дневника сна',
    ],
    homework: [
      'Вести дневник сна каждый день (/diary)',
      'Прочитать материал о циркадных ритмах',
      'Определить свой хронотип (/profile)',
    ],
  },
  {
    id: 'sleep_behavior_1',
    weekNumber: 2,
    title: 'Sleep Behavior I',
    titleRu: 'Ограничение сна',
    duration: '45-60 мин',
    icon: '🛏️',
    objectives: [
      'Освоить технику ограничения сна (SRT)',
      'Понять принципы контроля стимулов (SCT)',
      'Рассчитать индивидуальное окно сна',
      'Научиться техникам выхода из кровати',
    ],
    components: [
      'Sleep Restriction Therapy (SRT): расчёт TIB',
      'Stimulus Control Instructions (Bootzin)',
      'Правило 15-20 минут',
      'Минимальный безопасный TIB: 5.5 часов',
    ],
    homework: [
      'Соблюдать рассчитанное окно сна',
      'Применять правило 15-20 минут',
      'Использовать кровать только для сна',
      'Отмечать в дневнике соблюдение режима',
    ],
  },
  {
    id: 'sleep_behavior_2',
    weekNumber: 3,
    title: 'Sleep Behavior II',
    titleRu: 'Поведенческая практика',
    duration: '30-45 мин',
    icon: '🔄',
    objectives: [
      'Закрепить навыки SRT и SCT',
      'Скорректировать окно сна по данным SE',
      'Справиться с дневной сонливостью',
      'Работать с временным ухудшением сна',
    ],
    components: [
      'Обзор прогресса за неделю 2',
      'Корректировка TIB (+15 мин при SE ≥ 85%)',
      'Управление дневной сонливостью',
      'Нормализация "парадокса улучшения"',
    ],
    homework: [
      'Продолжать SRT с скорректированным окном',
      'Избегать дневного сна (или ≤20 мин до 15:00)',
      'Техники бодрствования: яркий свет, движение',
      'Записывать уровень сонливости (1-10)',
    ],
  },
  {
    id: 'sleep_education',
    weekNumber: 4,
    title: 'Sleep Education',
    titleRu: 'Гигиена сна',
    duration: '30-45 мин',
    icon: '🌙',
    objectives: [
      'Оптимизировать среду для сна',
      'Разработать вечерний ритуал',
      'Понять влияние факторов образа жизни',
      'Создать план улучшения гигиены сна',
    ],
    components: [
      'Температура, свет, шум в спальне',
      '90-минутный буфер перед сном',
      'Влияние кофеина, алкоголя, еды',
      'Физическая активность и сон',
    ],
    homework: [
      'Провести аудит спальни (чеклист)',
      'Создать 30-минутный вечерний ритуал',
      'Прекратить кофеин за 6 часов до сна',
      'Использовать ночной режим на устройствах',
    ],
  },
  {
    id: 'sleep_thoughts',
    weekNumber: 5,
    title: 'Sleep Thoughts',
    titleRu: 'Когнитивная терапия',
    duration: '45-60 мин',
    icon: '🧠',
    objectives: [
      'Выявить дисфункциональные убеждения о сне',
      'Освоить техники когнитивной реструктуризации',
      'Снизить тревогу, связанную со сном',
      'Изменить катастрофизацию последствий',
    ],
    components: [
      'DBAS-16: дисфункциональные убеждения',
      'Когнитивные искажения при инсомнии',
      'Техника реструктуризации мыслей',
      'Парадоксальное намерение',
    ],
    homework: [
      'Вести дневник мыслей о сне',
      'Практиковать реструктуризацию 1 мысли/день',
      'Опробовать парадоксальное намерение',
      'Заполнить DBAS в конце недели',
    ],
  },
  {
    id: 'problem_prevention',
    weekNumber: 6,
    title: 'Problem Prevention',
    titleRu: 'Профилактика рецидива',
    duration: '30-45 мин',
    icon: '🛡️',
    objectives: [
      'Закрепить достигнутые результаты',
      'Подготовить план на случай обострения',
      'Определить триггеры рецидива',
      'Создать долгосрочную стратегию',
    ],
    components: [
      'Обзор прогресса ISI (до/после)',
      'Идентификация персональных триггеров',
      'План действий при обострении',
      'Поддержание навыков КПТ-И',
    ],
    homework: [
      'Составить личный план профилактики',
      'Продолжать дневник сна 1-2 раза/неделю',
      'Пройти ISI через 4 недели (неделя 10)',
      'Применять навыки при первых признаках',
    ],
  },
] as const;

/**
 * Get core session by ID
 */
export function getCoreSession(id: string): ICoreSession | null {
  return CORE_SESSIONS.find(s => s.id === id) ?? null;
}

/**
 * Get core session by week number
 */
export function getCoreSessionByWeek(week: number): ICoreSession | null {
  return CORE_SESSIONS.find(s => s.weekNumber === week) ?? null;
}

// =============================================================================
// CBT-I CORE SESSION EDUCATIONAL CONTENT
// =============================================================================

/**
 * Educational content for each core session
 * Source: European Insomnia Guideline 2023, Spielman 1987, Bootzin 1972
 */
export const CORE_SESSION_CONTENT: Readonly<Record<TherapyCore, string>> = {
  overview: `
*🧠 Что такое инсомния?*

Инсомния — это не просто "плохой сон". Это нарушение, при котором:
• Трудно заснуть или поддерживать сон
• Сон не приносит восстановления
• Это влияет на дневное функционирование

*📐 3P-модель Spielman*

1️⃣ *Predisposing* (предрасполагающие факторы):
   Генетика, темперамент, склонность к тревоге

2️⃣ *Precipitating* (провоцирующие):
   Стресс, болезнь, смена работы, развод

3️⃣ *Perpetuating* (поддерживающие):
   Привычки, которые закрепляют проблему:
   • Долгое лежание в кровати без сна
   • Нерегулярный режим
   • Дневной сон
   • Катастрофизация

*💡 КПТ-И работает на P3* — меняет поведение и мысли, поддерживающие инсомнию.
  `.trim(),

  sleep_behavior_1: `
*🛏️ Ограничение сна (Sleep Restriction Therapy)*

Парадоксально, но для улучшения сна нужно *сократить* время в кровати.

*Как это работает:*
1. Рассчитываем среднее время сна (TST) по дневнику
2. Устанавливаем TIB (время в кровати) = TST + 30 мин
3. Минимум: *5.5 часов* (безопасность)
4. Фиксируем время подъёма (якорь)

*📊 Пример:*
Если вы спите в среднем 5 часов:
• TIB = 5.5 часов (минимум)
• Подъём: 07:00
• Отбой: 01:30

*🚪 Контроль стимулов (Bootzin Instructions):*
1. Ложитесь только когда сонливы
2. Кровать = только сон (не работа, не телефон)
3. Если не спите 15-20 мин — встаньте
4. Вернитесь когда снова сонливы
5. Подъём в одно время независимо от качества сна
  `.trim(),

  sleep_behavior_2: `
*🔄 Закрепление навыков*

К этому моменту вы практикуете SRT и SCT уже неделю. Это сложно, но вы на правильном пути.

*📈 Когда корректировать TIB:*
• SE ≥ 90% три дня подряд → +15 мин TIB
• SE ≥ 85% → поддерживаем текущее
• SE < 85% → можно сократить на 15 мин (не ниже 5.5ч)

*😴 Дневная сонливость — это нормально:*
Первые 1-3 недели SRT часто вызывают усталость. Это:
• Признак работы терапии
• Создаёт "давление сна"
• Проходит к 3-4 неделе

*⚠️ Важно:*
• Не садитесь за руль если очень сонливы
• Избегайте дневного сна (или макс 20 мин до 15:00)
• Яркий свет утром помогает бодрости
  `.trim(),

  sleep_education: `
*🌙 Оптимизация среды сна*

*🌡️ Температура:*
• Идеально: 18-20°C
• Прохладнее лучше чем теплее
• Тёплая ванна за 90 мин до сна → охлаждение тела → сонливость

*💡 Свет:*
• Яркий свет утром (первые 30 мин после пробуждения)
• Приглушённый свет за 2 часа до сна
• Блокировка синего света вечером (f.lux, Night Shift)

*🔇 Шум:*
• Тишина или белый шум
• Беруши если нужно
• Избегайте резких звуков

*☕ Образ жизни:*
• Кофеин: последний за 6 часов до сна
• Алкоголь: нарушает структуру сна (избегать за 4ч)
• Еда: лёгкий ужин за 2-3 часа до сна
• Спорт: отлично, но не позже чем за 4 часа до сна
  `.trim(),

  sleep_thoughts: `
*🧠 Когнитивная реструктуризация*

Мысли о сне влияют на сон. Часто мы сами усиливаем проблему.

*❌ Типичные когнитивные искажения:*

1️⃣ *Катастрофизация:*
"Если я не высплюсь, завтра будет ужасный день"
↓
✅ "Я справлюсь, даже если поспал не идеально"

2️⃣ *Нереалистичные ожидания:*
"Я должен спать 8 часов каждую ночь"
↓
✅ "Потребность во сне индивидуальна (6-9ч)"

3️⃣ *Преувеличение последствий:*
"Бессонница разрушает моё здоровье"
↓
✅ "Тело адаптируется, и я могу это изменить"

*🎯 Техника реструктуризации:*
1. Заметить автоматическую мысль
2. Спросить: "Есть ли доказательства?"
3. Найти альтернативную интерпретацию
4. Оценить реалистично
  `.trim(),

  problem_prevention: `
*🛡️ Профилактика рецидива*

Вы прошли основную программу! Теперь важно сохранить результаты.

*⚠️ Типичные триггеры рецидива:*
• Сильный стресс (работа, отношения)
• Путешествия и смена часовых поясов
• Болезнь
• Отпуск от режима ("расслаблюсь на выходных")

*📋 Ваш план действий при обострении:*

1. *Первые признаки* (1-2 плохих ночи):
   → Не паниковать, это нормально
   → Применить SCT (правило 15 мин)

2. *Продолжение* (3-5 ночей):
   → Вернуться к строгому режиму
   → Временно сократить TIB
   → Возобновить дневник сна

3. *Затяжное* (>1 недели):
   → Пройти ISI для оценки
   → Вернуться к Core 2 (SRT/SCT)
   → Рассмотреть консультацию специалиста

*🎯 Поддержание навыков:*
• Дневник сна 1-2 раза в неделю
• ISI каждые 4 недели
• Режим ±30 мин (даже в выходные)
  `.trim(),
};

/**
 * Get educational content for a core session
 */
export function getCoreContent(sessionId: string): string {
  return CORE_SESSION_CONTENT[sessionId as TherapyCore] ?? 'Содержание сессии';
}

// =============================================================================
// CBT-I CORE SESSION EXERCISES
// =============================================================================

/**
 * Interactive exercises for each core session
 * Source: SHUTi protocol, Morin 1993
 */
export const CORE_SESSION_EXERCISES: Readonly<Record<TherapyCore, string>> = {
  overview: `
*📝 Упражнение: Анализ вашей инсомнии по 3P*

Подумайте и запишите:

1️⃣ *Predisposing* — что меня предрасполагает?
   (характер, наследственность, склонность к тревоге)
   _________________________________

2️⃣ *Precipitating* — что спровоцировало проблему?
   (когда началось, какое событие)
   _________________________________

3️⃣ *Perpetuating* — что поддерживает проблему сейчас?
   (привычки, поведение, мысли)
   _________________________________

💡 Осознание этих факторов — первый шаг к изменению.
  `.trim(),

  sleep_behavior_1: `
*📊 Упражнение: Расчёт вашего окна сна*

На основе дневника сна за последнюю неделю:

1. Запишите TST (общее время сна) за каждую ночь:
   Пн: ___ | Вт: ___ | Ср: ___ | Чт: ___ | Пт: ___ | Сб: ___ | Вс: ___

2. Рассчитайте среднее: (сумма) / 7 = ___ часов

3. Ваше начальное TIB = ___ + 30 мин = ___ часов
   (но не менее 5.5 часов!)

4. Определите время подъёма (фиксированное): ___:___

5. Рассчитайте время отбоя:
   Время подъёма минус TIB = ___:___

*📌 Ваш режим на эту неделю:*
🛏 Отбой: ___:___
⏰ Подъём: ___:___
  `.trim(),

  sleep_behavior_2: `
*📈 Упражнение: Анализ эффективности сна (SE)*

Используя данные дневника, рассчитайте SE за каждый день:

*Формула:* SE = (TST / TIB) × 100%

| День | TST (мин) | TIB (мин) | SE (%) |
|------|-----------|-----------|--------|
| Пн   |           |           |        |
| Вт   |           |           |        |
| Ср   |           |           |        |
| Чт   |           |           |        |
| Пт   |           |           |        |
| Сб   |           |           |        |
| Вс   |           |           |        |

*Средняя SE за неделю:* ____%

*Решение по TIB:*
□ SE ≥ 90% три дня → увеличить TIB на 15 мин
□ SE 85-90% → оставить текущее
□ SE < 85% → сократить на 15 мин (мин 5.5ч)
  `.trim(),

  sleep_education: `
*🏠 Упражнение: Аудит спальни*

Оцените каждый пункт (1-5, где 5 = идеально):

*Температура:*
□ Прохладно (18-20°C): ___/5

*Свет:*
□ Темнота ночью: ___/5
□ Яркий свет утром: ___/5
□ Приглушение за 2ч до сна: ___/5

*Шум:*
□ Тишина или белый шум: ___/5

*Кровать:*
□ Только для сна: ___/5
□ Комфортный матрас: ___/5

*План улучшения:*
Что улучшить в первую очередь?
1. _________________________________
2. _________________________________
3. _________________________________

*Вечерний ритуал (30 мин):*
21:30 — _________________________________
21:45 — _________________________________
22:00 — _________________________________
  `.trim(),

  sleep_thoughts: `
*🧠 Упражнение: Дневник мыслей о сне*

Когда вы не можете заснуть, записывайте мысли:

*Ситуация:* Не могу заснуть уже 30 минут

*Автоматическая мысль:*
_________________________________

*Эмоция и интенсивность (0-100):*
_________________________________

*Доказательства "за" эту мысль:*
_________________________________

*Доказательства "против":*
_________________________________

*Альтернативная мысль:*
_________________________________

*Эмоция после (0-100):*
_________________________________

💡 Практикуйте это упражнение каждый раз, когда замечаете тревожные мысли о сне.
  `.trim(),

  problem_prevention: `
*📋 Упражнение: Ваш личный план профилактики*

Заполните карточку для будущего использования:

*Мои персональные триггеры рецидива:*
1. _________________________________
2. _________________________________
3. _________________________________

*Ранние признаки ухудшения сна:*
1. _________________________________
2. _________________________________

*Мои эффективные стратегии КПТ-И:*
1. _________________________________
2. _________________________________
3. _________________________________

*При первых признаках я буду:*
□ _________________________________
□ _________________________________

*Если проблема сохраняется > 1 недели:*
□ Пройти ISI
□ Вернуться к строгому режиму
□ _________________________________

*Контакт специалиста (при необходимости):*
_________________________________
  `.trim(),
};

/**
 * Get exercise for a core session
 */
export function getCoreExercise(sessionId: string): string {
  return CORE_SESSION_EXERCISES[sessionId as TherapyCore] ?? 'Упражнение';
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
  // CBT-I Component Content
  CBTI_COMPONENT_HELP,
  CBTI_COMPONENT_NAMES,
  CBTI_COMPONENT_ICONS,
  CBTI_COMPONENT_SELECTION_REASONS,
  getCBTIComponentHelp,
  getCBTIComponentFullHelp,

  // Third-Wave Therapies
  THIRD_WAVE_THERAPIES,
  getThirdWaveTherapies,
  getThirdWaveTherapyInfo,
  isTherapyContraindicated,

  // Core Sessions (6-Week Program)
  CORE_SESSIONS,
  CORE_SESSION_CONTENT,
  CORE_SESSION_EXERCISES,
  getCoreSession,
  getCoreSessionByWeek,
  getCoreContent,
  getCoreExercise,

  // General Messages
  CLINICAL_FALLBACK_MESSAGES,
};
