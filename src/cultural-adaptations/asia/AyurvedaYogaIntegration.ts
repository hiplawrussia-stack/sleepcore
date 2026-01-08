/**
 * AyurvedaYogaIntegration - Ayurveda & Yoga Nidra for Insomnia (India)
 * =====================================================================
 *
 * Integrates evidence-based Ayurvedic approaches and Yoga Nidra
 * with CBT-I for the South Asian population.
 *
 * Scientific Foundation:
 * - Yoga vs Ayurveda RCT: S-VYASA & Uttarakhand Ayurved University (2023)
 * - Yoga Nidra for insomnia: 89% sleep induction rate (Pandi-Perumal, 2022)
 * - Prakriti-based sleep quality prediction (PMC4448595)
 * - Shirodhara for anxiety-insomnia (Dhuri et al., 2023)
 *
 * Key Ayurvedic Approaches:
 * 1. Prakriti Assessment - Constitutional typing (Vata/Pitta/Kapha)
 * 2. Yoga Nidra - Yogic sleep meditation
 * 3. Shirodhara - Oil-pouring therapy
 * 4. Nasya Karma - Nasal therapy
 * 5. Herbal Preparations - Ashwagandha, Brahmi, Jatamansi
 * 6. Dinacharya - Daily routine optimization
 *
 * @packageDocumentation
 * @module @sleepcore/cultural-adaptations
 */

import type { ISleepState } from '../../sleep/interfaces/ISleepState';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

/**
 * Dosha types (Tridosha)
 */
export type Dosha = 'vata' | 'pitta' | 'kapha';

/**
 * Prakriti (Constitutional Type)
 */
export type Prakriti =
  | 'vata'           // Vata dominant
  | 'pitta'          // Pitta dominant
  | 'kapha'          // Kapha dominant
  | 'vata_pitta'     // Vata-Pitta dual
  | 'vata_kapha'     // Vata-Kapha dual
  | 'pitta_kapha'    // Pitta-Kapha dual
  | 'tridoshic';     // Balanced all three

/**
 * Vikriti (Current Imbalance)
 */
export interface IVikriti {
  readonly primaryDosha: Dosha;
  readonly secondaryDosha: Dosha | null;
  readonly imbalanceLevel: 'mild' | 'moderate' | 'severe';
}

/**
 * Ayurvedic Insomnia Type (Anidra classification)
 */
export type AnidraType =
  | 'vata_anidra'         // Difficulty falling asleep, light sleep
  | 'pitta_anidra'        // Waking at night (2-4 AM), vivid dreams
  | 'kapha_anidra'        // Oversleeping but unrefreshed
  | 'mixed_anidra';       // Combined patterns

/**
 * Yoga Nidra Stage
 */
export type YogaNidraStage =
  | 'preparation'         // Settling, intention
  | 'body_rotation'       // Rotation of consciousness
  | 'breath_awareness'    // Pranayama focus
  | 'opposite_feelings'   // Pairs of sensations
  | 'visualization'       // Imagery
  | 'sankalpa'            // Resolution/intention
  | 'externalization';    // Return to wakefulness

/**
 * Ayurvedic Therapy Type
 */
export type AyurvedicTherapy =
  | 'yoga_nidra'          // Yogic sleep
  | 'shirodhara'          // Oil pouring on forehead
  | 'abhyanga'            // Self-massage with oil
  | 'nasya'               // Nasal therapy
  | 'padabhyanga'         // Foot massage
  | 'herbal_internal'     // Internal herbs
  | 'herbal_external';    // External herbs

/**
 * Ayurvedic Herb for Sleep
 */
export interface IAyurvedicHerb {
  readonly nameSanskrit: string;
  readonly nameHindi: string;
  readonly nameEnglish: string;
  readonly latinName: string;
  readonly doshaEffect: Record<Dosha, 'reduces' | 'neutral' | 'increases'>;
  readonly indication: AnidraType[];
  readonly dosage: string;
  readonly preparation: string;
  readonly contraindications: string[];
  readonly evidenceLevel: 'high' | 'moderate' | 'low';
}

/**
 * Yoga Nidra Protocol
 */
export interface IYogaNidraProtocol {
  readonly duration: number;  // minutes
  readonly stages: YogaNidraStage[];
  readonly bestTime: 'afternoon' | 'evening' | 'bedtime';
  readonly frequency: string;
  readonly instructions: string[];
  readonly audioUrl?: string;
}

/**
 * Dinacharya (Daily Routine) Recommendation
 */
export interface IDinacharya {
  readonly wakeTime: string;
  readonly morningRoutine: string[];
  readonly eveningRoutine: string[];
  readonly sleepTime: string;
  readonly dietaryGuidelines: string[];
  readonly doshaSpecific: boolean;
}

/**
 * Ayurvedic Assessment Result
 */
export interface IAyurvedicAssessment {
  readonly prakriti: Prakriti;
  readonly vikriti: IVikriti;
  readonly anidraType: AnidraType;
  readonly recommendedTherapies: AyurvedicTherapy[];
  readonly herbs: IAyurvedicHerb[];
  readonly yogaNidraProtocol: IYogaNidraProtocol;
  readonly dinacharya: IDinacharya;
  readonly rationale: string;
}

// =============================================================================
// EVIDENCE-BASED AYURVEDIC DATA
// =============================================================================

/**
 * Ayurvedic herbs for insomnia
 */
export const SLEEP_HERBS: readonly IAyurvedicHerb[] = [
  {
    nameSanskrit: 'अश्वगन्धा',
    nameHindi: 'अश्वगंधा',
    nameEnglish: 'Ashwagandha',
    latinName: 'Withania somnifera',
    doshaEffect: { vata: 'reduces', pitta: 'neutral', kapha: 'reduces' },
    indication: ['vata_anidra', 'mixed_anidra'],
    dosage: '300-600 мг стандартизированного экстракта перед сном',
    preparation: 'С тёплым молоком или водой',
    contraindications: ['Беременность', 'Гипертиреоз', 'Аутоиммунные заболевания'],
    evidenceLevel: 'high',
  },
  {
    nameSanskrit: 'ब्राह्मी',
    nameHindi: 'ब्राह्मी',
    nameEnglish: 'Brahmi',
    latinName: 'Bacopa monnieri',
    doshaEffect: { vata: 'reduces', pitta: 'reduces', kapha: 'neutral' },
    indication: ['vata_anidra', 'pitta_anidra'],
    dosage: '300-450 мг стандартизированного экстракта',
    preparation: 'С медом или гхи',
    contraindications: ['Брадикардия', 'Язва желудка'],
    evidenceLevel: 'moderate',
  },
  {
    nameSanskrit: 'जटामांसी',
    nameHindi: 'जटामांसी',
    nameEnglish: 'Jatamansi',
    latinName: 'Nardostachys jatamansi',
    doshaEffect: { vata: 'reduces', pitta: 'reduces', kapha: 'reduces' },
    indication: ['vata_anidra', 'pitta_anidra', 'mixed_anidra'],
    dosage: '250-500 мг порошка корня',
    preparation: 'С тёплой водой или молоком перед сном',
    contraindications: ['Беременность', 'Кормление грудью'],
    evidenceLevel: 'moderate',
  },
  {
    nameSanskrit: 'तगर',
    nameHindi: 'तगर',
    nameEnglish: 'Tagara (Indian Valerian)',
    latinName: 'Valeriana wallichii',
    doshaEffect: { vata: 'reduces', pitta: 'neutral', kapha: 'reduces' },
    indication: ['vata_anidra'],
    dosage: '250-500 мг за 30 мин до сна',
    preparation: 'С тёплой водой',
    contraindications: ['Не принимать с седативными препаратами'],
    evidenceLevel: 'moderate',
  },
  {
    nameSanskrit: 'शंखपुष्पी',
    nameHindi: 'शंखपुष्पी',
    nameEnglish: 'Shankhpushpi',
    latinName: 'Convolvulus pluricaulis',
    doshaEffect: { vata: 'reduces', pitta: 'reduces', kapha: 'neutral' },
    indication: ['vata_anidra', 'pitta_anidra'],
    dosage: '3-6 г порошка или 2-4 чайные ложки сиропа',
    preparation: 'С молоком или водой',
    contraindications: ['Беременность'],
    evidenceLevel: 'low',
  },
] as const;

/**
 * Standard Yoga Nidra protocol (based on Satyananda tradition)
 */
export const YOGA_NIDRA_PROTOCOL: IYogaNidraProtocol = {
  duration: 30,
  stages: [
    'preparation',
    'sankalpa',
    'body_rotation',
    'breath_awareness',
    'opposite_feelings',
    'visualization',
    'sankalpa',
    'externalization',
  ],
  bestTime: 'bedtime',
  frequency: 'Ежедневно',
  instructions: [
    '=== ЙОГА НИДРА ДЛЯ СНА (30 минут) ===',
    '',
    '【Подготовка】(2-3 мин)',
    '• Лягте на спину в Шавасану',
    '• Руки вдоль тела ладонями вверх',
    '• Ноги слегка разведены',
    '• Закройте глаза, расслабьте лицо',
    '',
    '【Санкальпа】(1-2 мин)',
    '• Сформулируйте намерение коротко и позитивно',
    '• Например: "Я засыпаю легко и сплю крепко"',
    '• Повторите мысленно 3 раза с убеждённостью',
    '',
    '【Ротация сознания】(10-12 мин)',
    '• Переносите внимание по частям тела по очереди',
    '• Правая сторона: большой палец руки, второй палец...',
    '• Затем левая сторона, спина, передняя часть тела',
    '• Не двигайтесь, только направляйте осознавание',
    '',
    '【Осознание дыхания】(3-4 мин)',
    '• Наблюдайте естественное дыхание',
    '• Считайте выдохи в обратном порядке: 27, 26, 25...',
    '• Если сбились, начните снова с 27',
    '',
    '【Пары ощущений】(3-4 мин)',
    '• Тяжесть-лёгкость',
    '• Холод-тепло',
    '• Не создавайте ощущения, просто вспоминайте их',
    '',
    '【Визуализация】(4-5 мин)',
    '• Представьте спокойное озеро в лунную ночь',
    '• Или любое место, дарящее покой',
    '• Позвольте образам приходить и уходить',
    '',
    '【Санкальпа】(1 мин)',
    '• Повторите ваше намерение 3 раза',
    '',
    '【Выход / Засыпание】',
    '• Осознайте дыхание, тело, комнату',
    '• Если практикуете перед сном — позвольте себе заснуть',
  ],
};

/**
 * Dinacharya templates by dosha
 */
export const DINACHARYA_TEMPLATES: Record<Dosha, IDinacharya> = {
  vata: {
    wakeTime: '6:00-7:00',
    morningRoutine: [
      'Проснуться до восхода солнца',
      'Выпить стакан тёплой воды с лимоном',
      'Опорожнение кишечника',
      'Абхьянга (самомассаж) с кунжутным маслом',
      'Тёплый душ',
      'Медитация или пранаяма (10-15 мин)',
      'Тёплый питательный завтрак',
    ],
    eveningRoutine: [
      'Лёгкий ужин до 19:00',
      'Прогулка после ужина',
      'Падабхьянга (массаж стоп) с кунжутным маслом',
      'Йога Нидра (20-30 мин)',
      'Тёплое молоко с мускатным орехом',
      'Отход ко сну до 22:00',
    ],
    sleepTime: '21:30-22:00',
    dietaryGuidelines: [
      'Тёплая, приготовленная, маслянистая пища',
      'Избегать сухих, холодных, сырых продуктов',
      'Регулярное время приёма пищи',
      'Специи: имбирь, кумин, корица',
    ],
    doshaSpecific: true,
  },
  pitta: {
    wakeTime: '5:30-6:00',
    morningRoutine: [
      'Проснуться до восхода',
      'Выпить стакан прохладной воды',
      'Опорожнение кишечника',
      'Абхьянга с кокосовым маслом (охлаждающее)',
      'Прохладный душ',
      'Успокаивающая медитация (15-20 мин)',
      'Завтрак без острого и кислого',
    ],
    eveningRoutine: [
      'Умеренный ужин до 19:00',
      'Прогулка у воды или в прохладном месте',
      'Масло брами для массажа стоп и головы',
      'Шитали пранаяма (охлаждающее дыхание)',
      'Йога Нидра',
      'Отход ко сну до 22:30',
    ],
    sleepTime: '22:00-22:30',
    dietaryGuidelines: [
      'Охлаждающая, сладкая, горькая пища',
      'Избегать острого, кислого, солёного',
      'Молочные продукты, сладкие фрукты',
      'Травы: мята, кориандр, фенхель',
    ],
    doshaSpecific: true,
  },
  kapha: {
    wakeTime: '5:00-6:00',
    morningRoutine: [
      'Раннее пробуждение обязательно (до 6:00)',
      'Стакан тёплой воды с мёдом и лимоном',
      'Энергичные упражнения (йога, бег)',
      'Сухая щётка или гаршана',
      'Контрастный душ',
      'Активная пранаяма (капалабхати)',
      'Лёгкий тёплый завтрак',
    ],
    eveningRoutine: [
      'Очень лёгкий ужин до 18:30',
      'Активная прогулка',
      'Стимулирующий массаж с горчичным маслом',
      'Динамичная Йога Нидра',
      'Нет еды после 19:00',
      'Отход ко сну до 22:00',
    ],
    sleepTime: '21:30-22:00',
    dietaryGuidelines: [
      'Лёгкая, сухая, тёплая пища',
      'Избегать тяжёлого, маслянистого, сладкого',
      'Много специй: имбирь, чёрный перец, куркума',
      'Горькие овощи, бобовые',
    ],
    doshaSpecific: true,
  },
};

// =============================================================================
// AYURVEDA-YOGA INTEGRATION ENGINE
// =============================================================================

/**
 * Ayurveda-Yoga Integration Engine
 */
export class AyurvedaYogaEngine {
  /**
   * Assess Ayurvedic profile from sleep state
   */
  assessAyurvedicProfile(sleepState: ISleepState): IAyurvedicAssessment {
    const prakriti = this.assessPrakriti(sleepState);
    const vikriti = this.assessVikriti(sleepState);
    const anidraType = this.determineAnidraType(sleepState, vikriti);

    const recommendedTherapies = this.recommendTherapies(anidraType, vikriti);
    const herbs = this.selectHerbs(anidraType, prakriti);
    const yogaNidraProtocol = this.customizeYogaNidra(anidraType);
    const dinacharya = this.createDinacharya(prakriti, vikriti);

    return {
      prakriti,
      vikriti,
      anidraType,
      recommendedTherapies,
      herbs,
      yogaNidraProtocol,
      dinacharya,
      rationale: this.generateRationale(prakriti, vikriti, anidraType),
    };
  }

  /**
   * Assess constitutional type (Prakriti)
   */
  private assessPrakriti(sleepState: ISleepState): Prakriti {
    const { cognitions, behaviors, metrics } = sleepState;

    let vataScore = 0;
    let pittaScore = 0;
    let kaphaScore = 0;

    // Sleep onset > 30 min suggests Vata
    if (metrics.sleepOnsetLatency > 30) vataScore += 2;

    // Night waking 2-4 AM suggests Pitta
    if (metrics.wakeAfterSleepOnset > 20 && metrics.wakeAfterSleepOnset < 60) pittaScore += 2;

    // Excessive sleep but unrefreshed suggests Kapha
    if (metrics.totalSleepTime > 480 && sleepState.morningAlertness < 0.5) kaphaScore += 2;

    // High anxiety suggests Vata imbalance
    if (cognitions.sleepAnxiety > 0.6) vataScore += 2;

    // High arousal can be Pitta
    if (cognitions.preSleepArousal > 0.7) pittaScore += 1;

    // Caffeine sensitivity (Vata trait)
    if (behaviors.caffeine.dailyMg > 200) vataScore += 1;

    // Determine dominant
    if (vataScore > pittaScore && vataScore > kaphaScore) {
      if (pittaScore > kaphaScore && pittaScore > vataScore / 2) return 'vata_pitta';
      return 'vata';
    } else if (pittaScore > vataScore && pittaScore > kaphaScore) {
      if (kaphaScore > vataScore && kaphaScore > pittaScore / 2) return 'pitta_kapha';
      return 'pitta';
    } else if (kaphaScore > vataScore && kaphaScore > pittaScore) {
      if (vataScore > pittaScore && vataScore > kaphaScore / 2) return 'vata_kapha';
      return 'kapha';
    }

    return 'tridoshic';
  }

  /**
   * Assess current imbalance (Vikriti)
   */
  private assessVikriti(sleepState: ISleepState): IVikriti {
    const { insomnia, cognitions } = sleepState;

    // Vata imbalance indicators: anxiety, variable sleep, racing mind
    const vataImbalance = cognitions.sleepAnxiety + cognitions.preSleepArousal;

    // Pitta imbalance indicators: irritability, waking 2-4 AM
    const pittaImbalance = cognitions.beliefs.catastrophizing ? 0.7 : 0.3;

    // Kapha imbalance: sluggishness, oversleeping
    const kaphaImbalance = sleepState.daytimeSleepiness;

    let primary: Dosha;
    let secondary: Dosha | null = null;

    if (vataImbalance >= pittaImbalance && vataImbalance >= kaphaImbalance) {
      primary = 'vata';
      secondary = pittaImbalance > kaphaImbalance ? 'pitta' : null;
    } else if (pittaImbalance >= vataImbalance && pittaImbalance >= kaphaImbalance) {
      primary = 'pitta';
      secondary = vataImbalance > kaphaImbalance ? 'vata' : null;
    } else {
      primary = 'kapha';
      secondary = null;
    }

    const severity = insomnia.isiScore >= 22 ? 'severe' :
                     insomnia.isiScore >= 15 ? 'moderate' : 'mild';

    return {
      primaryDosha: primary,
      secondaryDosha: secondary,
      imbalanceLevel: severity,
    };
  }

  /**
   * Determine Anidra type
   */
  private determineAnidraType(sleepState: ISleepState, vikriti: IVikriti): AnidraType {
    const { metrics } = sleepState;

    // Vata Anidra: difficulty initiating, light fragmented sleep
    if (metrics.sleepOnsetLatency > 45 && vikriti.primaryDosha === 'vata') {
      return 'vata_anidra';
    }

    // Pitta Anidra: waking between 2-4 AM (Pitta time)
    if (metrics.wakeAfterSleepOnset > 30 && vikriti.primaryDosha === 'pitta') {
      return 'pitta_anidra';
    }

    // Kapha Anidra: excessive sleep but unrefreshed
    if (vikriti.primaryDosha === 'kapha') {
      return 'kapha_anidra';
    }

    return 'mixed_anidra';
  }

  /**
   * Recommend therapies
   */
  private recommendTherapies(anidra: AnidraType, _vikriti: IVikriti): AyurvedicTherapy[] {
    const therapies: AyurvedicTherapy[] = ['yoga_nidra']; // Always recommended

    switch (anidra) {
      case 'vata_anidra':
        therapies.push('abhyanga', 'padabhyanga', 'shirodhara', 'herbal_internal');
        break;
      case 'pitta_anidra':
        therapies.push('shirodhara', 'padabhyanga', 'herbal_internal');
        break;
      case 'kapha_anidra':
        therapies.push('nasya', 'herbal_internal');
        break;
      case 'mixed_anidra':
        therapies.push('shirodhara', 'abhyanga', 'herbal_internal');
        break;
    }

    return therapies;
  }

  /**
   * Select herbs
   */
  private selectHerbs(anidra: AnidraType, _prakriti: Prakriti): IAyurvedicHerb[] {
    return SLEEP_HERBS.filter(herb =>
      herb.indication.includes(anidra) ||
      (anidra === 'mixed_anidra' && herb.indication.length > 1)
    ).slice(0, 3); // Return top 3 herbs
  }

  /**
   * Customize Yoga Nidra protocol
   */
  private customizeYogaNidra(anidra: AnidraType): IYogaNidraProtocol {
    const base = { ...YOGA_NIDRA_PROTOCOL };

    // Adjust based on type
    if (anidra === 'vata_anidra') {
      // Longer body rotation for grounding
      return {
        ...base,
        duration: 35,
        instructions: [
          ...base.instructions,
          '',
          '【Дополнение для Вата-типа】',
          '• Особое внимание на ощущение тяжести и заземления',
          '• Используйте тёплое одеяло',
          '• Можно включить спокойную музыку',
        ],
      };
    }

    if (anidra === 'pitta_anidra') {
      return {
        ...base,
        duration: 25,
        instructions: [
          ...base.instructions,
          '',
          '【Дополнение для Питта-типа】',
          '• Акцент на охлаждающие визуализации (луна, вода)',
          '• Помещение должно быть прохладным',
          '• Избегать активных ментальных усилий',
        ],
      };
    }

    return base;
  }

  /**
   * Create personalized dinacharya
   */
  private createDinacharya(prakriti: Prakriti, vikriti: IVikriti): IDinacharya {
    // Get template based on vikriti (current imbalance takes priority)
    const dosha = vikriti.primaryDosha;
    const template = DINACHARYA_TEMPLATES[dosha];

    // Customize based on prakriti
    return {
      ...template,
      dietaryGuidelines: [
        ...template.dietaryGuidelines,
        `Учитывайте вашу конституцию (${prakriti}) при долгосрочном планировании диеты`,
      ],
    };
  }

  /**
   * Generate rationale
   */
  private generateRationale(prakriti: Prakriti, vikriti: IVikriti, anidra: AnidraType): string {
    const doshaNames: Record<Dosha, string> = {
      vata: 'Вата (воздух + эфир)',
      pitta: 'Питта (огонь + вода)',
      kapha: 'Капха (вода + земля)',
    };

    const anidraNames: Record<AnidraType, string> = {
      vata_anidra: 'Вата-анидра (бессонница от возбуждения ума)',
      pitta_anidra: 'Питта-анидра (пробуждения среди ночи)',
      kapha_anidra: 'Капха-анидра (тяжёлый неосвежающий сон)',
      mixed_anidra: 'Смешанная анидра',
    };

    return `Согласно Аюрведической диагностике, ваша Пракрити (конституция) — ${prakriti}, ` +
      `с текущим дисбалансом ${doshaNames[vikriti.primaryDosha]}. ` +
      `Тип бессонницы: ${anidraNames[anidra]}. ` +
      `Рекомендуемый подход включает Йога Нидру для глубокой релаксации, ` +
      `Диначарью (режим дня) для балансировки дош, и травяную поддержку. ` +
      `Исследование S-VYASA (2023) показало эффективность Йоги и Аюрведы при острой бессоннице.`;
  }

  /**
   * Get Yoga Nidra instructions for bedtime
   */
  getYogaNidraInstructions(): string[] {
    return YOGA_NIDRA_PROTOCOL.instructions;
  }
}

/**
 * Export singleton
 */
export const ayurvedaYogaEngine = new AyurvedaYogaEngine();
