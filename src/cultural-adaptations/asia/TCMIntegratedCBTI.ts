/**
 * TCMIntegratedCBTI - Traditional Chinese Medicine Integration with CBT-I
 * ========================================================================
 *
 * Integrates evidence-based Traditional Chinese Medicine (TCM) approaches
 * with Cognitive Behavioral Therapy for Insomnia (CBT-I).
 *
 * Scientific Foundation:
 * - Umbrella review: 36 SR/MAs on TCM for insomnia (2025)
 * - Tai Chi RCT: Noninferior to CBT-I at 15 months (Hong Kong, 2025)
 * - Chinese Culturally-Adapted CBT-I (Cheng et al., 2018)
 * - TCM Clinical Practice Guidelines (China, 2023)
 * - Acupuncture + Herbal meta-analysis (2023)
 *
 * Key TCM Approaches for Insomnia:
 * 1. Acupuncture (针灸) - Most studied, strong evidence
 * 2. Chinese Herbal Medicine (中药) - Suanzaoren, Guipi Tang
 * 3. Tai Chi (太极拳) - Mind-body, comparable to CBT-I
 * 4. Qigong (气功) - Breathing and meditation
 * 5. Tuina Massage (推拿) - Meridian-based massage
 * 6. Auricular Acupressure (耳穴) - Ear acupressure
 *
 * References:
 * - PMC10019201: Acupuncture + herbal for insomnia mechanism
 * - Frontiers Neurol 2025: Bibliometric TCM insomnia study
 * - JAMA Network Open 2023: Digital CBT-I China pilot RCT
 *
 * @packageDocumentation
 * @module @sleepcore/cultural-adaptations
 */

import type { ISleepState } from '../../sleep/interfaces/ISleepState';
import type { ICBTIPlan } from '../../cbt-i/interfaces/ICBTIComponents';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

/**
 * TCM Constitution (体质) Types
 * Based on Wang Qi's 9 Constitution Theory
 */
export type TCMConstitution =
  | 'balanced'           // 平和质 - Balanced/Neutral
  | 'qi_deficiency'      // 气虚质 - Qi Deficiency
  | 'yang_deficiency'    // 阳虚质 - Yang Deficiency
  | 'yin_deficiency'     // 阴虚质 - Yin Deficiency
  | 'phlegm_dampness'    // 痰湿质 - Phlegm-Dampness
  | 'damp_heat'          // 湿热质 - Damp-Heat
  | 'blood_stasis'       // 血瘀质 - Blood Stasis
  | 'qi_stagnation'      // 气郁质 - Qi Stagnation
  | 'inherited_special'; // 特禀质 - Inherited Special

/**
 * TCM Insomnia Pattern (证型)
 * Traditional differential diagnosis
 */
export type TCMInsomniaPattern =
  | 'heart_spleen_deficiency'    // 心脾两虚 - Most common
  | 'heart_kidney_disharmony'    // 心肾不交
  | 'liver_fire'                 // 肝火扰心
  | 'phlegm_heat'                // 痰热扰心
  | 'heart_gallbladder_deficiency' // 心胆气虚
  | 'stomach_disharmony'         // 胃不和
  | 'yin_deficiency_fire';       // 阴虚火旺

/**
 * TCM Therapy Type
 */
export type TCMTherapyType =
  | 'acupuncture'          // 针灸
  | 'herbal_medicine'      // 中药
  | 'tai_chi'              // 太极拳
  | 'qigong'               // 气功
  | 'tuina'                // 推拿按摩
  | 'auricular'            // 耳穴疗法
  | 'moxibustion'          // 艾灸
  | 'cupping';             // 拔罐

/**
 * Integration Mode
 */
export type IntegrationMode =
  | 'tcm_primary'          // TCM as primary, CBT-I adjunct
  | 'cbti_primary'         // CBT-I as primary, TCM adjunct
  | 'parallel'             // Both in parallel
  | 'sequential';          // TCM then CBT-I or vice versa

/**
 * Acupoint for insomnia
 */
export interface IAcupoint {
  readonly code: string;          // e.g., "HT7"
  readonly nameEn: string;        // e.g., "Shenmen"
  readonly nameCn: string;        // e.g., "神门"
  readonly namePinyin: string;    // e.g., "Shén Mén"
  readonly location: string;
  readonly indication: string;
  readonly technique: 'needle' | 'acupressure' | 'both';
}

/**
 * Herbal Formula
 */
export interface IHerbalFormula {
  readonly nameEn: string;
  readonly nameCn: string;
  readonly namePinyin: string;
  readonly composition: string[];
  readonly indication: TCMInsomniaPattern;
  readonly dosage: string;
  readonly contraindications: string[];
  readonly evidenceLevel: 'high' | 'moderate' | 'low';
}

/**
 * Tai Chi / Qigong Protocol
 */
export interface IMindBodyProtocol {
  readonly type: 'tai_chi' | 'qigong';
  readonly name: string;
  readonly nameCn: string;
  readonly duration: number;        // minutes
  readonly frequency: string;       // e.g., "daily", "3x/week"
  readonly bestTime: 'morning' | 'evening' | 'both';
  readonly movements: string[];
  readonly breathingFocus: string;
  readonly videoUrl?: string;
}

/**
 * TCM Assessment Result
 */
export interface ITCMAssessment {
  readonly constitution: TCMConstitution;
  readonly insomniaPattern: TCMInsomniaPattern;
  readonly recommendedTherapies: TCMTherapyType[];
  readonly integrationMode: IntegrationMode;
  readonly rationale: string;
}

/**
 * TCM-CBT-I Integrated Plan
 */
export interface ITCMCBTIPlan {
  readonly userId: string;
  readonly cbtiPlan: ICBTIPlan;
  readonly tcmAssessment: ITCMAssessment;

  /** TCM components */
  readonly acupoints: IAcupoint[];
  readonly herbalFormula: IHerbalFormula | null;
  readonly mindBodyProtocol: IMindBodyProtocol | null;

  /** Integration schedule */
  readonly schedule: {
    readonly cbtiSessions: string[];      // Days/times for CBT-I
    readonly tcmSessions: string[];       // Days/times for TCM
    readonly mindBodyPractice: string[];  // Daily practice times
  };

  /** Progress tracking */
  readonly progress: {
    readonly cbtiAdherence: number;
    readonly tcmAdherence: number;
    readonly combinedEffectiveness: number;
  };
}

// =============================================================================
// EVIDENCE-BASED TCM DATA
// =============================================================================

/**
 * Primary acupoints for insomnia (most studied)
 */
export const INSOMNIA_ACUPOINTS: readonly IAcupoint[] = [
  {
    code: 'HT7',
    nameEn: 'Shenmen',
    nameCn: '神门',
    namePinyin: 'Shén Mén',
    location: 'На запястье, у лучевого края сухожилия локтевого сгибателя запястья',
    indication: 'Основная точка при бессоннице, тревоге, сердцебиении',
    technique: 'both',
  },
  {
    code: 'SP6',
    nameEn: 'Sanyinjiao',
    nameCn: '三阴交',
    namePinyin: 'Sān Yīn Jiāo',
    location: 'На 3 цуня выше верхушки внутренней лодыжки',
    indication: 'Укрепляет селезёнку, питает инь, успокаивает дух',
    technique: 'both',
  },
  {
    code: 'PC6',
    nameEn: 'Neiguan',
    nameCn: '内关',
    namePinyin: 'Nèi Guān',
    location: 'На 2 цуня выше складки запястья между сухожилиями',
    indication: 'Успокаивает сердце, устраняет беспокойство',
    technique: 'both',
  },
  {
    code: 'GV20',
    nameEn: 'Baihui',
    nameCn: '百会',
    namePinyin: 'Bǎi Huì',
    location: 'На верхушке головы, на линии соединения ушей',
    indication: 'Поднимает ян, успокаивает дух, просветляет разум',
    technique: 'both',
  },
  {
    code: 'Anmian',
    nameEn: 'Anmian (Extra)',
    nameCn: '安眠',
    namePinyin: 'Ān Mián',
    location: 'Позади уха, между точками Yifeng (TE17) и Fengchi (GB20)',
    indication: 'Специфическая точка для сна (буквально "спокойный сон")',
    technique: 'both',
  },
  {
    code: 'KI3',
    nameEn: 'Taixi',
    nameCn: '太溪',
    namePinyin: 'Tài Xī',
    location: 'Между внутренней лодыжкой и ахилловым сухожилием',
    indication: 'Питает инь почек, при бессоннице от ин-дефицита',
    technique: 'both',
  },
  {
    code: 'Yintang',
    nameEn: 'Yintang (Extra)',
    nameCn: '印堂',
    namePinyin: 'Yìn Táng',
    location: 'Между бровями, на переносице',
    indication: 'Успокаивает дух, снимает тревогу',
    technique: 'both',
  },
] as const;

/**
 * Evidence-based herbal formulas for insomnia
 */
export const HERBAL_FORMULAS: readonly IHerbalFormula[] = [
  {
    nameEn: 'Suan Zao Ren Tang',
    nameCn: '酸枣仁汤',
    namePinyin: 'Suān Zǎo Rén Tāng',
    composition: ['Suanzaoren (酸枣仁)', 'Zhimu (知母)', 'Fuling (茯苓)', 'Chuanxiong (川芎)', 'Gancao (甘草)'],
    indication: 'heart_spleen_deficiency',
    dosage: '1 пакет 2 раза в день, за 30 мин до сна',
    contraindications: ['Беременность', 'Острые инфекции'],
    evidenceLevel: 'high',
  },
  {
    nameEn: 'Gui Pi Tang',
    nameCn: '归脾汤',
    namePinyin: 'Guī Pí Tāng',
    composition: ['Huangqi (黄芪)', 'Danggui (当归)', 'Renshen (人参)', 'Baizhu (白术)', 'Longyuan (龙眼)', 'Suanzaoren (酸枣仁)'],
    indication: 'heart_spleen_deficiency',
    dosage: '1 пакет 2 раза в день',
    contraindications: ['Гипертония', 'Лихорадка'],
    evidenceLevel: 'high',
  },
  {
    nameEn: 'Tian Wang Bu Xin Dan',
    nameCn: '天王补心丹',
    namePinyin: 'Tiān Wáng Bǔ Xīn Dān',
    composition: ['Shengdi (生地)', 'Xuanshen (玄参)', 'Tianmendong (天门冬)', 'Maimendong (麦门冬)', 'Danshen (丹参)'],
    indication: 'yin_deficiency_fire',
    dosage: '9 г, 2 раза в день',
    contraindications: ['Слабость селезёнки', 'Диарея'],
    evidenceLevel: 'moderate',
  },
  {
    nameEn: 'Long Dan Xie Gan Tang',
    nameCn: '龙胆泻肝汤',
    namePinyin: 'Lóng Dǎn Xiè Gān Tāng',
    composition: ['Longdancao (龙胆草)', 'Huangqin (黄芩)', 'Zhizi (栀子)', 'Chaihu (柴胡)', 'Shengdi (生地)'],
    indication: 'liver_fire',
    dosage: '1 пакет 2 раза в день, краткий курс',
    contraindications: ['Холод селезёнки', 'Дефицит ян'],
    evidenceLevel: 'moderate',
  },
] as const;

/**
 * Tai Chi protocol (based on Hong Kong RCT 2025)
 */
export const TAI_CHI_PROTOCOL: IMindBodyProtocol = {
  type: 'tai_chi',
  name: 'Yang-style Tai Chi for Sleep',
  nameCn: '杨氏太极拳安眠套路',
  duration: 60,
  frequency: '3x/week',
  bestTime: 'evening',
  movements: [
    '1. Начальная форма (起势)',
    '2. Раздвинуть гриву дикой лошади (野马分鬃)',
    '3. Белый журавль расправляет крылья (白鹤亮翅)',
    '4. Отталкивание (搂膝拗步)',
    '5. Руки играют на лютне (手挥琵琶)',
    '6. Отступление и отражение (倒撵猴)',
    '7. Охват тигриного хвоста влево (左揽雀尾)',
    '8. Охват тигриного хвоста вправо (右揽雀尾)',
    '9. Одиночный хлыст (单鞭)',
    '10. Заключительная форма (收势)',
  ],
  breathingFocus: 'Глубокое диафрагмальное дыхание, синхронизированное с движениями. Вдох при расширении, выдох при сжатии.',
};

/**
 * Qigong protocol for insomnia
 */
export const QIGONG_PROTOCOL: IMindBodyProtocol = {
  type: 'qigong',
  name: 'Three-Circle Post Standing Qigong',
  nameCn: '三圆式站桩功',
  duration: 15,
  frequency: 'daily',
  bestTime: 'evening',
  movements: [
    '1. Исходное положение: ноги на ширине плеч, колени слегка согнуты',
    '2. Руки поднять на уровень груди, словно обнимая большое дерево',
    '3. Пальцы смотрят друг на друга, между ними 10-15 см',
    '4. Локти слегка опущены, плечи расслаблены',
    '5. Взгляд направлен прямо или слегка вниз',
    '6. Сосредоточить внимание на дыхании и ощущениях в теле',
    '7. Постепенно увеличивать время с 5 до 15-20 минут',
  ],
  breathingFocus: 'Естественное абдоминальное дыхание. Внимание на нижнем даньтянь (область ниже пупка).',
};

// =============================================================================
// TCM-CBT-I INTEGRATION ENGINE
// =============================================================================

/**
 * TCM-CBT-I Integration Engine
 */
export class TCMIntegratedCBTIEngine {
  /**
   * Assess TCM constitution and insomnia pattern
   */
  assessTCMProfile(sleepState: ISleepState): ITCMAssessment {
    const constitution = this.determineConstitution(sleepState);
    const pattern = this.determineInsomniaPattern(sleepState);

    // Determine integration mode based on severity and preferences
    const integrationMode = this.determineIntegrationMode(sleepState, pattern);

    // Recommend therapies based on pattern
    const recommendedTherapies = this.recommendTherapies(pattern, constitution);

    return {
      constitution,
      insomniaPattern: pattern,
      recommendedTherapies,
      integrationMode,
      rationale: this.generateRationale(pattern, constitution, integrationMode),
    };
  }

  /**
   * Create integrated TCM-CBT-I plan
   */
  createIntegratedPlan(
    userId: string,
    cbtiPlan: ICBTIPlan,
    tcmAssessment: ITCMAssessment
  ): ITCMCBTIPlan {
    // Select acupoints based on pattern
    const acupoints = this.selectAcupoints(tcmAssessment.insomniaPattern);

    // Select herbal formula if appropriate
    const herbalFormula = this.selectHerbalFormula(tcmAssessment.insomniaPattern);

    // Select mind-body protocol
    const mindBodyProtocol = this.selectMindBodyProtocol(tcmAssessment);

    // Create schedule
    const schedule = this.createSchedule(cbtiPlan, tcmAssessment.integrationMode);

    return {
      userId,
      cbtiPlan,
      tcmAssessment,
      acupoints,
      herbalFormula,
      mindBodyProtocol,
      schedule,
      progress: {
        cbtiAdherence: 0,
        tcmAdherence: 0,
        combinedEffectiveness: 0,
      },
    };
  }

  /**
   * Get acupressure self-treatment instructions
   */
  getAcupressureInstructions(acupoints: IAcupoint[]): string[] {
    const instructions: string[] = [
      '=== САМОМАССАЖ АКУПРЕССУРНЫХ ТОЧЕК ===',
      '',
      'Общие правила:',
      '• Выполняйте за 30-60 минут до сна',
      '• Надавливайте средней силой, без боли',
      '• Каждую точку массируйте 1-2 минуты',
      '• Дышите глубоко и спокойно',
      '',
    ];

    for (const point of acupoints) {
      instructions.push(`【${point.nameCn} / ${point.nameEn}】`);
      instructions.push(`Расположение: ${point.location}`);
      instructions.push(`Действие: ${point.indication}`);
      instructions.push('Техника: круговые движения по часовой стрелке');
      instructions.push('');
    }

    return instructions;
  }

  /**
   * Determine TCM constitution from sleep state
   */
  private determineConstitution(sleepState: ISleepState): TCMConstitution {
    const { cognitions, insomnia, behaviors } = sleepState;

    // Simplified constitution assessment
    if (cognitions.sleepAnxiety > 0.7 || cognitions.preSleepArousal > 0.7) {
      return 'qi_stagnation';  // Liver Qi stagnation often presents with anxiety
    }

    if (insomnia.isiScore > 21 && sleepState.daytimeSleepiness > 0.6) {
      return 'qi_deficiency';  // Severe fatigue suggests Qi deficiency
    }

    if (sleepState.metrics.wakeAfterSleepOnset > 30) {
      return 'yin_deficiency';  // Night waking often related to Yin deficiency
    }

    if (behaviors.caffeine.dailyMg > 300 || sleepState.morningAlertness < 0.4) {
      return 'yang_deficiency';  // Morning sluggishness suggests Yang deficiency
    }

    return 'balanced';
  }

  /**
   * Determine insomnia pattern (证型)
   */
  private determineInsomniaPattern(sleepState: ISleepState): TCMInsomniaPattern {
    const { cognitions, metrics, insomnia } = sleepState;

    // Heart-Spleen Deficiency: difficulty initiating + poor memory/concentration
    if (metrics.sleepOnsetLatency > 45 && cognitions.sleepSelfEfficacy < 0.4) {
      return 'heart_spleen_deficiency';
    }

    // Liver Fire: irritability + early morning waking
    if (metrics.wakeAfterSleepOnset < 30 && cognitions.preSleepArousal > 0.7) {
      return 'liver_fire';
    }

    // Yin Deficiency Fire: night sweats + multiple awakenings
    if (metrics.wakeAfterSleepOnset > 45 && cognitions.sleepAnxiety > 0.5) {
      return 'yin_deficiency_fire';
    }

    // Heart-Kidney Disharmony: difficulty both initiating and maintaining
    if (metrics.sleepOnsetLatency > 30 && metrics.wakeAfterSleepOnset > 30) {
      return 'heart_kidney_disharmony';
    }

    // Default: most common pattern
    return 'heart_spleen_deficiency';
  }

  /**
   * Determine integration mode
   */
  private determineIntegrationMode(
    sleepState: ISleepState,
    pattern: TCMInsomniaPattern
  ): IntegrationMode {
    // For severe insomnia, CBT-I primary with TCM adjunct
    if (sleepState.insomnia.isiScore >= 22) {
      return 'cbti_primary';
    }

    // For mild-moderate with high anxiety, parallel approach
    if (sleepState.cognitions.sleepAnxiety > 0.6) {
      return 'parallel';
    }

    // For maintenance patterns, TCM can be primary
    if (pattern === 'heart_spleen_deficiency' && sleepState.insomnia.isiScore < 15) {
      return 'tcm_primary';
    }

    return 'cbti_primary';
  }

  /**
   * Recommend therapies based on pattern
   */
  private recommendTherapies(
    pattern: TCMInsomniaPattern,
    constitution: TCMConstitution
  ): TCMTherapyType[] {
    const therapies: TCMTherapyType[] = ['acupuncture']; // Always include

    // Add Tai Chi/Qigong for most patterns
    if (constitution === 'qi_stagnation' || constitution === 'qi_deficiency') {
      therapies.push('tai_chi', 'qigong');
    }

    // Herbal medicine for deficiency patterns
    if (pattern === 'heart_spleen_deficiency' || pattern === 'yin_deficiency_fire') {
      therapies.push('herbal_medicine');
    }

    // Auricular for stress-related
    if (constitution === 'qi_stagnation') {
      therapies.push('auricular');
    }

    // Tuina for tension
    therapies.push('tuina');

    return therapies;
  }

  /**
   * Select acupoints based on pattern
   */
  private selectAcupoints(pattern: TCMInsomniaPattern): IAcupoint[] {
    // HT7 and Anmian are always included
    const points = [
      INSOMNIA_ACUPOINTS.find(p => p.code === 'HT7')!,
      INSOMNIA_ACUPOINTS.find(p => p.code === 'Anmian')!,
    ];

    switch (pattern) {
      case 'heart_spleen_deficiency':
        points.push(INSOMNIA_ACUPOINTS.find(p => p.code === 'SP6')!);
        break;
      case 'liver_fire':
        points.push(INSOMNIA_ACUPOINTS.find(p => p.code === 'PC6')!);
        break;
      case 'yin_deficiency_fire':
        points.push(INSOMNIA_ACUPOINTS.find(p => p.code === 'KI3')!);
        break;
      case 'heart_kidney_disharmony':
        points.push(INSOMNIA_ACUPOINTS.find(p => p.code === 'KI3')!);
        points.push(INSOMNIA_ACUPOINTS.find(p => p.code === 'SP6')!);
        break;
      default:
        points.push(INSOMNIA_ACUPOINTS.find(p => p.code === 'GV20')!);
    }

    // Always add Yintang for calming
    points.push(INSOMNIA_ACUPOINTS.find(p => p.code === 'Yintang')!);

    return points;
  }

  /**
   * Select herbal formula
   */
  private selectHerbalFormula(pattern: TCMInsomniaPattern): IHerbalFormula | null {
    const formula = HERBAL_FORMULAS.find(f => f.indication === pattern);
    return formula || HERBAL_FORMULAS[0]; // Default to Suanzaoren Tang
  }

  /**
   * Select mind-body protocol
   */
  private selectMindBodyProtocol(assessment: ITCMAssessment): IMindBodyProtocol {
    // Qigong for beginners or those with qi deficiency
    if (assessment.constitution === 'qi_deficiency' ||
        assessment.constitution === 'yang_deficiency') {
      return QIGONG_PROTOCOL;
    }

    // Tai Chi for those who can handle more movement
    return TAI_CHI_PROTOCOL;
  }

  /**
   * Create integrated schedule
   */
  private createSchedule(
    cbtiPlan: ICBTIPlan,
    mode: IntegrationMode
  ): ITCMCBTIPlan['schedule'] {
    switch (mode) {
      case 'tcm_primary':
        return {
          cbtiSessions: ['Понедельник', 'Четверг'],
          tcmSessions: ['Вторник', 'Пятница', 'Воскресенье'],
          mindBodyPractice: ['Ежедневно, вечер (19:00-20:00)'],
        };
      case 'cbti_primary':
        return {
          cbtiSessions: ['Понедельник', 'Среда', 'Пятница'],
          tcmSessions: ['Вторник', 'Суббота'],
          mindBodyPractice: ['Ежедневно, вечер (30 мин до сна)'],
        };
      case 'parallel':
        return {
          cbtiSessions: ['Понедельник', 'Среда', 'Пятница'],
          tcmSessions: ['Понедельник', 'Среда', 'Пятница (после CBT-I)'],
          mindBodyPractice: ['Ежедневно, утро и вечер'],
        };
      case 'sequential':
        return {
          cbtiSessions: ['Недели 5-12: 2 раза в неделю'],
          tcmSessions: ['Недели 1-4: 3 раза в неделю'],
          mindBodyPractice: ['Ежедневно с недели 1'],
        };
    }
  }

  /**
   * Generate rationale
   */
  private generateRationale(
    pattern: TCMInsomniaPattern,
    constitution: TCMConstitution,
    mode: IntegrationMode
  ): string {
    const patternNames: Record<TCMInsomniaPattern, string> = {
      heart_spleen_deficiency: 'Недостаточность Сердца и Селезёнки (心脾两虚)',
      heart_kidney_disharmony: 'Дисгармония Сердца и Почек (心肾不交)',
      liver_fire: 'Огонь Печени беспокоит Сердце (肝火扰心)',
      phlegm_heat: 'Флегма-Жар беспокоит Сердце (痰热扰心)',
      heart_gallbladder_deficiency: 'Недостаточность Сердца и Желчного Пузыря (心胆气虚)',
      stomach_disharmony: 'Дисгармония Желудка (胃不和)',
      yin_deficiency_fire: 'Пустой Огонь от недостатка Инь (阴虚火旺)',
    };

    return `Согласно ТКМ-диагностике, ваш паттерн бессонницы соответствует синдрому "${patternNames[pattern]}". ` +
      `Рекомендуется интегрированный подход с акцентом на ${mode === 'tcm_primary' ? 'ТКМ-терапию' : 'КПТ-И'}, ` +
      `дополненный ${mode === 'tcm_primary' ? 'когнитивно-поведенческими техниками' : 'традиционными китайскими методами'}. ` +
      `Согласно исследованиям 2023-2025, комбинация ТКМ и КПТ-И показывает синергетический эффект.`;
  }
}

/**
 * Export singleton
 */
export const tcmCBTIEngine = new TCMIntegratedCBTIEngine();
