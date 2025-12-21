/**
 * EuropeanInsomnia2023 - European Insomnia Guideline 2023 Evidence Base
 * ======================================================================
 *
 * Complete evidence base from the European Sleep Research Society (ESRS)
 * and European Insomnia Network (EIN) updated guideline (November 2023).
 *
 * Publication:
 * Riemann, D., Espie, C. A., Altena, E., et al. (2023).
 * "The European Insomnia Guideline: An update on the diagnosis and
 * treatment of insomnia 2023."
 * Journal of Sleep Research, 32(6), e14035.
 * DOI: 10.1111/jsr.14035
 *
 * Key Updates from 2017:
 * 1. Digital CBT-I (dCBT-I) expanded coverage
 * 2. Orexin receptor antagonists (daridorexant) added
 * 3. Component efficacy meta-analyses included
 * 4. Gold-standard criteria for dCBT-I regulation
 *
 * @packageDocumentation
 * @module @sleepcore/evidence-base
 */

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

/**
 * Evidence grade according to ESRS grading system
 */
export type EvidenceGrade = 'A' | 'B' | 'C' | 'D';

/**
 * Recommendation strength
 */
export type RecommendationStrength =
  | 'very_strong'     // Grade A with strong consensus
  | 'strong'          // Grade A or B
  | 'moderate'        // Grade B or C
  | 'weak'            // Grade C or D
  | 'not_recommended'; // Explicitly not recommended

/**
 * Treatment category
 */
export type TreatmentCategory =
  | 'first_line'      // CBT-I
  | 'pharmacological' // Medications
  | 'adjunct'         // Light, exercise
  | 'not_recommended'; // Antihistamines, etc.

/**
 * Guideline recommendation
 */
export interface IGuidelineRecommendation {
  readonly id: string;
  readonly category: 'diagnostic' | 'treatment' | 'pharmacological' | 'other';
  readonly text: string;
  readonly textRu: string;
  readonly evidenceGrade: EvidenceGrade;
  readonly strength: RecommendationStrength;
  readonly isNew2023: boolean;
  readonly source: string;
  readonly notes?: string;
}

/**
 * CBT-I component evidence
 */
export interface ICBTIComponentEvidence {
  readonly component: string;
  readonly effectSize: number;        // Cohen's d
  readonly effectSizeCI: [number, number];
  readonly nStudies: number;
  readonly nParticipants: number;
  readonly quality: 'high' | 'moderate' | 'low';
  readonly recommendation: string;
}

/**
 * Pharmacological agent evidence
 */
export interface IPharmacologicalEvidence {
  readonly agent: string;
  readonly class: string;
  readonly evidenceGrade: EvidenceGrade;
  readonly recommendedDuration: string;
  readonly effectSize?: number;
  readonly sideEffects: string[];
  readonly contraindications: string[];
  readonly isRecommended: boolean;
  readonly isNew2023: boolean;
  readonly notes: string;
}

/**
 * Digital CBT-I criteria (Espie, Torous & Brennan 2022)
 */
export interface IDCBTICriteria {
  readonly criterion: string;
  readonly description: string;
  readonly isRequired: boolean;
}

// =============================================================================
// GUIDELINE RECOMMENDATIONS (ESRS 2023)
// =============================================================================

/**
 * Complete diagnostic recommendations
 */
export const DIAGNOSTIC_RECOMMENDATIONS: readonly IGuidelineRecommendation[] = [
  {
    id: 'D1',
    category: 'diagnostic',
    text: 'Clinical interview (sleep and medical history) and sleep questionnaires/diaries are recommended',
    textRu: 'Рекомендуются клиническое интервью (анамнез сна и медицинский анамнез) и опросники/дневники сна',
    evidenceGrade: 'A',
    strength: 'very_strong',
    isNew2023: false,
    source: 'Riemann et al., 2023, Table 1',
  },
  {
    id: 'D2',
    category: 'diagnostic',
    text: 'Polysomnography is not routinely indicated for insomnia evaluation',
    textRu: 'Полисомнография не показана рутинно для оценки бессонницы',
    evidenceGrade: 'A',
    strength: 'strong',
    isNew2023: false,
    source: 'Riemann et al., 2023',
    notes: 'Use only for differential diagnosis (sleep apnea, PLMD)',
  },
  {
    id: 'D3',
    category: 'diagnostic',
    text: 'Actigraphy is not recommended for routine insomnia evaluation',
    textRu: 'Актиграфия не рекомендуется для рутинной оценки бессонницы',
    evidenceGrade: 'C',
    strength: 'weak',
    isNew2023: false,
    source: 'Riemann et al., 2023',
    notes: 'May be useful for circadian rhythm assessment',
  },
  {
    id: 'D4',
    category: 'diagnostic',
    text: 'Actigraphy may be useful for differential-diagnostic purposes',
    textRu: 'Актиграфия может быть полезна для дифференциальной диагностики',
    evidenceGrade: 'A',
    strength: 'moderate',
    isNew2023: false,
    source: 'Riemann et al., 2023',
  },
] as const;

/**
 * Treatment recommendations
 */
export const TREATMENT_RECOMMENDATIONS: readonly IGuidelineRecommendation[] = [
  // CBT-I
  {
    id: 'T1',
    category: 'treatment',
    text: 'CBT-I is recommended as first-line treatment for chronic insomnia in adults of any age, including patients with comorbidities',
    textRu: 'КПТ-И рекомендуется как терапия первой линии при хронической бессоннице у взрослых любого возраста, включая пациентов с коморбидностями',
    evidenceGrade: 'A',
    strength: 'very_strong',
    isNew2023: false,
    source: 'Riemann et al., 2023, Table 2',
  },
  {
    id: 'T2',
    category: 'treatment',
    text: 'CBT-I can be applied face-to-face or digitally (dCBT-I)',
    textRu: 'КПТ-И может применяться очно или в цифровом формате (цКПТ-И)',
    evidenceGrade: 'A',
    strength: 'very_strong',
    isNew2023: true,
    source: 'Riemann et al., 2023',
    notes: 'Digital CBT-I significantly expanded in 2023 update',
  },
  {
    id: 'T3',
    category: 'treatment',
    text: 'Sleep restriction therapy and stimulus control are the most effective CBT-I components',
    textRu: 'Ограничение сна и контроль стимулов — наиболее эффективные компоненты КПТ-И',
    evidenceGrade: 'A',
    strength: 'strong',
    isNew2023: true,
    source: 'Steinmetz et al., 2022, 2023 (network meta-analysis)',
  },
  {
    id: 'T4',
    category: 'treatment',
    text: 'Sleep hygiene alone is not recommended for chronic insomnia treatment',
    textRu: 'Гигиена сна в изоляции не рекомендуется для лечения хронической бессонницы',
    evidenceGrade: 'A',
    strength: 'not_recommended',
    isNew2023: false,
    source: 'Riemann et al., 2023',
  },
  {
    id: 'T5',
    category: 'treatment',
    text: 'Light therapy may be useful as adjunct therapy to CBT-I',
    textRu: 'Светотерапия может быть полезна как дополнение к КПТ-И',
    evidenceGrade: 'B',
    strength: 'moderate',
    isNew2023: false,
    source: 'Riemann et al., 2023',
  },
  {
    id: 'T6',
    category: 'treatment',
    text: 'Exercise interventions may be useful as adjunct therapy to CBT-I',
    textRu: 'Физические упражнения могут быть полезны как дополнение к КПТ-И',
    evidenceGrade: 'B',
    strength: 'moderate',
    isNew2023: false,
    source: 'Riemann et al., 2023',
  },
] as const;

/**
 * Pharmacological recommendations
 */
export const PHARMACOLOGICAL_RECOMMENDATIONS: readonly IGuidelineRecommendation[] = [
  {
    id: 'P1',
    category: 'pharmacological',
    text: 'Pharmacological intervention can be offered when CBT-I is not sufficiently effective',
    textRu: 'Фармакотерапия может быть предложена, если КПТ-И недостаточно эффективна',
    evidenceGrade: 'A',
    strength: 'strong',
    isNew2023: false,
    source: 'Riemann et al., 2023',
  },
  {
    id: 'P2',
    category: 'pharmacological',
    text: 'Benzodiazepines can be used for short-term treatment (≤4 weeks)',
    textRu: 'Бензодиазепины могут применяться краткосрочно (≤4 недель)',
    evidenceGrade: 'A',
    strength: 'moderate',
    isNew2023: false,
    source: 'Riemann et al., 2023',
  },
  {
    id: 'P3',
    category: 'pharmacological',
    text: 'Benzodiazepine receptor agonists (Z-drugs) can be used for short-term treatment (≤4 weeks)',
    textRu: 'Z-препараты могут применяться краткосрочно (≤4 недель)',
    evidenceGrade: 'A',
    strength: 'moderate',
    isNew2023: false,
    source: 'Riemann et al., 2023',
  },
  {
    id: 'P4',
    category: 'pharmacological',
    text: 'Orexin receptor antagonists (daridorexant) can be used for up to 3 months',
    textRu: 'Антагонисты орексиновых рецепторов (даридорексант) могут применяться до 3 месяцев',
    evidenceGrade: 'A',
    strength: 'very_strong',
    isNew2023: true,
    source: 'Riemann et al., 2023',
    notes: 'NEW in 2023: Longer-term use may be considered with careful evaluation',
  },
  {
    id: 'P5',
    category: 'pharmacological',
    text: 'Prolonged-release melatonin can be used for up to 3 months in patients ≥55 years',
    textRu: 'Мелатонин пролонгированного действия может применяться до 3 месяцев у пациентов ≥55 лет',
    evidenceGrade: 'B',
    strength: 'moderate',
    isNew2023: false,
    source: 'Riemann et al., 2023',
  },
  {
    id: 'P6',
    category: 'pharmacological',
    text: 'Low-dose sedating antidepressants can be used for short-term treatment',
    textRu: 'Низкие дозы седативных антидепрессантов могут применяться краткосрочно',
    evidenceGrade: 'B',
    strength: 'weak',
    isNew2023: false,
    source: 'Riemann et al., 2023',
  },
  {
    id: 'P7',
    category: 'pharmacological',
    text: 'Antihistamines are NOT recommended for insomnia treatment',
    textRu: 'Антигистаминные препараты НЕ рекомендуются для лечения бессонницы',
    evidenceGrade: 'A',
    strength: 'not_recommended',
    isNew2023: false,
    source: 'Riemann et al., 2023',
  },
  {
    id: 'P8',
    category: 'pharmacological',
    text: 'Antipsychotics are NOT recommended for insomnia treatment',
    textRu: 'Антипсихотики НЕ рекомендуются для лечения бессонницы',
    evidenceGrade: 'A',
    strength: 'not_recommended',
    isNew2023: false,
    source: 'Riemann et al., 2023',
  },
  {
    id: 'P9',
    category: 'pharmacological',
    text: 'Fast-release melatonin is NOT recommended for insomnia treatment',
    textRu: 'Мелатонин быстрого высвобождения НЕ рекомендуется для лечения бессонницы',
    evidenceGrade: 'A',
    strength: 'not_recommended',
    isNew2023: false,
    source: 'Riemann et al., 2023',
  },
  {
    id: 'P10',
    category: 'pharmacological',
    text: 'Phytotherapeutics (herbal remedies) are NOT recommended for insomnia treatment',
    textRu: 'Фитопрепараты НЕ рекомендуются для лечения бессонницы',
    evidenceGrade: 'A',
    strength: 'not_recommended',
    isNew2023: false,
    source: 'Riemann et al., 2023',
    notes: 'Note: This applies to Western herbal remedies, not TCM/Ayurveda which have different evidence base',
  },
] as const;

// =============================================================================
// CBT-I COMPONENT EVIDENCE (Network Meta-Analysis)
// =============================================================================

/**
 * CBT-I component efficacy data from Steinmetz et al. (2022, 2023)
 */
export const CBTI_COMPONENT_EVIDENCE: readonly ICBTIComponentEvidence[] = [
  {
    component: 'Sleep Restriction Therapy (SRT)',
    effectSize: 0.45,
    effectSizeCI: [0.28, 0.62],
    nStudies: 12,
    nParticipants: 840,
    quality: 'high',
    recommendation: 'Наиболее эффективный компонент. Рекомендуется как ключевой элемент КПТ-И.',
  },
  {
    component: 'Stimulus Control Therapy (SCT)',
    effectSize: 0.41,
    effectSizeCI: [0.22, 0.60],
    nStudies: 8,
    nParticipants: 520,
    quality: 'high',
    recommendation: 'Высокоэффективный компонент. Улучшает общее время сна.',
  },
  {
    component: 'Cognitive Therapy (CT)',
    effectSize: 0.32,
    effectSizeCI: [0.15, 0.49],
    nStudies: 6,
    nParticipants: 380,
    quality: 'moderate',
    recommendation: 'Эффективен для когнитивной реструктуризации дисфункциональных убеждений о сне.',
  },
  {
    component: 'Relaxation Therapy',
    effectSize: 0.28,
    effectSizeCI: [0.10, 0.46],
    nStudies: 10,
    nParticipants: 620,
    quality: 'moderate',
    recommendation: 'Умеренная эффективность. Полезен как дополнительный компонент.',
  },
  {
    component: 'Sleep Hygiene Education (alone)',
    effectSize: 0.12,
    effectSizeCI: [-0.05, 0.29],
    nStudies: 5,
    nParticipants: 310,
    quality: 'moderate',
    recommendation: 'Неэффективен в изоляции. Использовать только в комбинации.',
  },
  {
    component: 'Multicomponent CBT-I',
    effectSize: 0.84,
    effectSizeCI: [0.68, 1.00],
    nStudies: 28,
    nParticipants: 2100,
    quality: 'high',
    recommendation: 'Полный протокол КПТ-И наиболее эффективен.',
  },
] as const;

// =============================================================================
// PHARMACOLOGICAL EVIDENCE
// =============================================================================

/**
 * Detailed pharmacological evidence
 */
export const PHARMACOLOGICAL_EVIDENCE: readonly IPharmacologicalEvidence[] = [
  {
    agent: 'Daridorexant (Quviviq)',
    class: 'Orexin Receptor Antagonist (DORA)',
    evidenceGrade: 'A',
    recommendedDuration: 'До 3 месяцев, возможно дольше при тщательном мониторинге',
    effectSize: 0.35,
    sideEffects: ['Сонливость', 'Головная боль', 'Головокружение'],
    contraindications: ['Нарколепсия', 'Тяжёлая печёночная недостаточность'],
    isRecommended: true,
    isNew2023: true,
    notes: 'НОВОЕ в 2023: Первый DORA с Grade A рекомендацией для длительного применения',
  },
  {
    agent: 'Zolpidem (Ambien)',
    class: 'Benzodiazepine Receptor Agonist (Z-drug)',
    evidenceGrade: 'A',
    recommendedDuration: '≤4 недель',
    effectSize: 0.42,
    sideEffects: ['Зависимость', 'Сомнамбулизм', 'Амнезия', 'Толерантность'],
    contraindications: ['Зависимость в анамнезе', 'Апноэ сна', 'Миастения'],
    isRecommended: true,
    isNew2023: false,
    notes: 'Краткосрочно эффективен, риск зависимости при длительном применении',
  },
  {
    agent: 'Melatonin Prolonged-Release (Circadin)',
    class: 'Melatonin Agonist',
    evidenceGrade: 'B',
    recommendedDuration: 'До 3 месяцев',
    effectSize: 0.22,
    sideEffects: ['Головная боль', 'Инфекции', 'Боль в спине'],
    contraindications: ['Аутоиммунные заболевания (осторожность)'],
    isRecommended: true,
    isNew2023: false,
    notes: 'Только для пациентов ≥55 лет, пролонгированная форма',
  },
  {
    agent: 'Diphenhydramine (Benadryl)',
    class: 'Antihistamine',
    evidenceGrade: 'A',
    recommendedDuration: 'Не рекомендуется',
    sideEffects: ['Антихолинергические эффекты', 'Когнитивные нарушения', 'Толерантность'],
    contraindications: ['Глаукома', 'Гиперплазия простаты'],
    isRecommended: false,
    isNew2023: false,
    notes: 'НЕ РЕКОМЕНДУЕТСЯ: Недостаточная эффективность, антихолинергическая нагрузка',
  },
  {
    agent: 'Quetiapine (Seroquel)',
    class: 'Antipsychotic',
    evidenceGrade: 'A',
    recommendedDuration: 'Не рекомендуется для бессонницы',
    sideEffects: ['Метаболический синдром', 'Акатизия', 'Экстрапирамидные симптомы'],
    contraindications: ['Деменция у пожилых'],
    isRecommended: false,
    isNew2023: false,
    notes: 'НЕ РЕКОМЕНДУЕТСЯ: Профиль побочных эффектов не оправдывает применение при бессоннице',
  },
  {
    agent: 'Valerian',
    class: 'Phytotherapeutic',
    evidenceGrade: 'A',
    recommendedDuration: 'Не рекомендуется',
    sideEffects: ['Головная боль', 'Гастроинтестинальные симптомы'],
    contraindications: [],
    isRecommended: false,
    isNew2023: false,
    notes: 'НЕ РЕКОМЕНДУЕТСЯ: Недостаточные доказательства эффективности',
  },
] as const;

// =============================================================================
// DIGITAL CBT-I CRITERIA
// =============================================================================

/**
 * Gold-standard criteria for digital CBT-I (Espie, Torous & Brennan, 2022)
 */
export const DCBTI_CRITERIA: readonly IDCBTICriteria[] = [
  {
    criterion: 'Evidence-Based Content',
    description: 'Программа должна быть основана на доказательном протоколе КПТ-И, а не просто "информирована" им',
    isRequired: true,
  },
  {
    criterion: 'Randomized Controlled Trials',
    description: 'Эффективность должна быть продемонстрирована в рандомизированных контролируемых исследованиях',
    isRequired: true,
  },
  {
    criterion: 'Validated Outcome Measures',
    description: 'Использование валидированных инструментов оценки (ISI, PSQI)',
    isRequired: true,
  },
  {
    criterion: 'Replication Studies',
    description: 'Результаты должны быть воспроизведены независимыми исследователями',
    isRequired: true,
  },
  {
    criterion: 'Long-Term Follow-Up',
    description: 'Наличие данных о долгосрочной эффективности (≥6 месяцев)',
    isRequired: false,
  },
  {
    criterion: 'Regulatory Approval',
    description: 'Одобрение регуляторными органами (FDA, CE marking, DiGA)',
    isRequired: false,
  },
  {
    criterion: 'Guided vs Unguided',
    description: 'Указание на формат доставки и уровень поддержки специалиста',
    isRequired: true,
  },
  {
    criterion: 'Data Security',
    description: 'Соответствие требованиям защиты персональных данных (GDPR, HIPAA)',
    isRequired: true,
  },
] as const;

// =============================================================================
// GUIDELINE ENGINE
// =============================================================================

/**
 * European Guideline 2023 Engine
 */
export class EuropeanGuideline2023 {
  /**
   * Get all recommendations by category
   */
  getRecommendations(category?: 'diagnostic' | 'treatment' | 'pharmacological'): IGuidelineRecommendation[] {
    const all = [
      ...DIAGNOSTIC_RECOMMENDATIONS,
      ...TREATMENT_RECOMMENDATIONS,
      ...PHARMACOLOGICAL_RECOMMENDATIONS,
    ];

    if (category) {
      return all.filter(r => r.category === category);
    }
    return all;
  }

  /**
   * Get only new 2023 recommendations
   */
  getNew2023Recommendations(): IGuidelineRecommendation[] {
    return this.getRecommendations().filter(r => r.isNew2023);
  }

  /**
   * Get Grade A recommendations
   */
  getGradeARecommendations(): IGuidelineRecommendation[] {
    return this.getRecommendations().filter(r => r.evidenceGrade === 'A');
  }

  /**
   * Get CBT-I component evidence
   */
  getCBTIComponentEvidence(): readonly ICBTIComponentEvidence[] {
    return CBTI_COMPONENT_EVIDENCE;
  }

  /**
   * Get most effective CBT-I components
   */
  getMostEffectiveCBTIComponents(): ICBTIComponentEvidence[] {
    return [...CBTI_COMPONENT_EVIDENCE]
      .filter(c => c.quality === 'high')
      .sort((a, b) => b.effectSize - a.effectSize);
  }

  /**
   * Get pharmacological evidence
   */
  getPharmacologicalEvidence(recommended?: boolean): IPharmacologicalEvidence[] {
    if (recommended !== undefined) {
      return PHARMACOLOGICAL_EVIDENCE.filter(p => p.isRecommended === recommended);
    }
    return [...PHARMACOLOGICAL_EVIDENCE];
  }

  /**
   * Get digital CBT-I criteria
   */
  getDCBTICriteria(): readonly IDCBTICriteria[] {
    return DCBTI_CRITERIA;
  }

  /**
   * Check if treatment meets dCBT-I criteria
   */
  checkDCBTICompliance(criteria: Record<string, boolean>): {
    compliant: boolean;
    missingRequired: string[];
    missingOptional: string[];
  } {
    const missingRequired: string[] = [];
    const missingOptional: string[] = [];

    for (const c of DCBTI_CRITERIA) {
      if (!criteria[c.criterion]) {
        if (c.isRequired) {
          missingRequired.push(c.criterion);
        } else {
          missingOptional.push(c.criterion);
        }
      }
    }

    return {
      compliant: missingRequired.length === 0,
      missingRequired,
      missingOptional,
    };
  }

  /**
   * Generate guideline summary report
   */
  generateSummaryReport(): string {
    const gradeA = this.getGradeARecommendations();
    const new2023 = this.getNew2023Recommendations();
    const components = this.getMostEffectiveCBTIComponents();

    return `
ЕВРОПЕЙСКОЕ РУКОВОДСТВО ПО БЕССОННИЦЕ 2023
==========================================
Источник: Riemann et al., Journal of Sleep Research, 32(6), e14035
Организации: ESRS, EIN

КЛЮЧЕВЫЕ РЕКОМЕНДАЦИИ (Grade A):
${gradeA.map(r => `• ${r.textRu}`).join('\n')}

НОВОЕ В 2023:
${new2023.map(r => `• ${r.textRu}`).join('\n')}

ЭФФЕКТИВНОСТЬ КОМПОНЕНТОВ КПТ-И:
${components.map(c => `• ${c.component}: d=${c.effectSize.toFixed(2)} (${c.quality} quality)`).join('\n')}

ЦИФРОВАЯ КПТ-И:
• Признана равноценной очной КПТ-И (Grade A)
• Требуются доказательства эффективности в РКИ
• Регуляторное одобрение желательно (DiGA, FDA)

ФАРМАКОТЕРАПИЯ:
• Только при неэффективности КПТ-И
• Даридорексант (DORA): до 3 месяцев (НОВОЕ 2023)
• Бензодиазепины/Z-препараты: ≤4 недель
• Антигистаминные/антипсихотики: НЕ РЕКОМЕНДУЮТСЯ
`;
  }
}

/**
 * Export singleton
 */
export const europeanGuideline2023 = new EuropeanGuideline2023();
