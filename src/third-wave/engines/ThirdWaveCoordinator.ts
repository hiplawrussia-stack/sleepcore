/**
 * ThirdWaveCoordinator - Third-Wave Therapy Integration
 * ======================================================
 * Coordinates MBT-I and ACT-I therapy selection and delivery.
 *
 * Selection Criteria:
 * - MBT-I: High cognitive arousal, racing thoughts, sleep effort
 * - ACT-I: Struggle/avoidance, low psychological flexibility, values disconnect
 * - Hybrid: Complex cases, treatment-resistant insomnia
 *
 * Integration with CBT-I:
 * - Third-wave can be standalone or adjunct to CBT-I
 * - Particularly useful for CBT-I non-responders (20-40%)
 * - Improves adherence through different mechanism
 *
 * @packageDocumentation
 * @module @sleepcore/third-wave
 */

import type {
  IThirdWaveCoordinator,
  IThirdWaveRecommendation,
  ThirdWaveApproach,
  IMBTIEngine,
  IACTIEngine,
  IMCTEngine,
} from '../interfaces/IThirdWaveTherapies';
import type { ISleepState } from '../../sleep/interfaces/ISleepState';

import { MBTIEngine } from './MBTIEngine';
import { ACTIEngine } from './ACTIEngine';
import { MCTEngine } from './MCTEngine';

/**
 * Third-Wave Therapy Coordinator
 * Now includes MBT-I, ACT-I, and MCT (Sprint 3)
 */
export class ThirdWaveCoordinator implements IThirdWaveCoordinator {
  private readonly mbtiEngine: MBTIEngine;
  private readonly actiEngine: ACTIEngine;
  private readonly mctEngine: MCTEngine;

  constructor() {
    this.mbtiEngine = new MBTIEngine();
    this.actiEngine = new ACTIEngine();
    this.mctEngine = new MCTEngine();
  }

  /**
   * Recommend approach based on patient profile
   * Updated in Sprint 3 to include MCT consideration
   */
  recommendApproach(
    sleepState: ISleepState,
    treatmentHistory?: { failedCBTI: boolean; preferences: string[] }
  ): IThirdWaveRecommendation {
    const cognitions = sleepState.cognitions;
    const insomnia = sleepState.insomnia;

    // Calculate indicators for all approaches
    const mbtiScore = this.calculateMBTIIndicators(sleepState);
    const actiScore = this.calculateACTIIndicators(sleepState);
    const mctScore = this.calculateMCTIndicators(sleepState);

    // If failed CBT-I, strongly consider third-wave
    const failedCBTI = treatmentHistory?.failedCBTI ?? false;

    // Check contraindications
    const contraindications: string[] = [];

    if (insomnia.severity === 'severe' && insomnia.isiScore > 24) {
      contraindications.push(
        'Очень тяжёлая бессонница — рассмотрите комбинацию с медикаментами'
      );
    }

    // Determine recommendation
    let recommendedApproach: ThirdWaveApproach;
    let rationale: string;
    const expectedBenefits: string[] = [];

    // MCT is indicated for high rumination/worry with metacognitive beliefs
    if (mctScore > 0.7 && mctScore > mbtiScore && mctScore > actiScore) {
      // High rumination/worry, clear MCT indication
      recommendedApproach = 'mct';
      rationale =
        'Выраженная руминация и беспокойство о сне с метакогнитивными убеждениями. MCT поможет изменить отношение к мыслям через откладывание беспокойства и отстранённую осознанность.';
      expectedBenefits.push(
        'Снижение руминации и беспокойства',
        'Контроль над процессом мышления',
        'Развитие отстранённой осознанности',
        'Изменение метакогнитивных убеждений'
      );
    } else if (mbtiScore > 0.7 && actiScore < 0.5) {
      // High arousal, clear MBT-I indication
      recommendedApproach = 'mbti';
      rationale =
        'Высокий уровень когнитивного возбуждения и беспокойства о сне. MBT-I поможет снизить ментальную активность перед сном через практики осознанности.';
      expectedBenefits.push(
        'Снижение когнитивного возбуждения',
        'Уменьшение усилий заснуть',
        'Развитие метакогнитивного осознавания'
      );
    } else if (actiScore > 0.7 && mbtiScore < 0.5) {
      // High avoidance/fusion, clear ACT-I indication
      recommendedApproach = 'acti';
      rationale =
        'Выраженная борьба с бессонницей и слияние с негативными мыслями. ACT-I поможет развить психологическую гибкость и принятие.';
      expectedBenefits.push(
        'Повышение готовности к неприятным ощущениям',
        'Дефузия от мыслей о сне',
        'Жизнь в соответствии с ценностями несмотря на бессонницу'
      );
    } else if (mbtiScore > 0.5 && actiScore > 0.5) {
      // Both indicated - hybrid approach
      recommendedApproach = 'hybrid';
      rationale =
        'Комплексная картина с элементами когнитивного возбуждения и психологической ригидности. Гибридный подход объединит преимущества обоих методов.';
      expectedBenefits.push(
        'Комплексное воздействие на разные механизмы',
        'Больше инструментов для разных ситуаций',
        'Синергетический эффект практик'
      );
    } else if (failedCBTI) {
      // CBT-I non-responder - try third-wave (prefer MCT for high rumination)
      if (mctScore > 0.5 && cognitions.preSleepArousal > 0.6) {
        recommendedApproach = 'mct';
        rationale =
          'После неэффективного CBT-I рекомендуется MCT для работы с руминацией и беспокойством на метакогнитивном уровне.';
      } else {
        recommendedApproach = mbtiScore > actiScore ? 'mbti' : 'acti';
        rationale =
          'После неэффективного CBT-I рекомендуется третья волна терапии как альтернативный механизм изменений.';
      }
      expectedBenefits.push(
        'Другой подход к той же проблеме',
        'Работа с метакогнитивным уровнем',
        'Акцент на принятии вместо контроля'
      );
    } else {
      // Low scores on all - CBT-I may be sufficient
      recommendedApproach = 'none';
      rationale =
        'Показатели не указывают на необходимость третьей волны. Стандартный CBT-I может быть достаточным.';
    }

    return {
      recommendedApproach,
      rationale,
      contraindications,
      expectedBenefits,
    };
  }

  /**
   * Get MBT-I engine
   */
  getMBTIEngine(): IMBTIEngine {
    return this.mbtiEngine;
  }

  /**
   * Get ACT-I engine
   */
  getACTIEngine(): IACTIEngine {
    return this.actiEngine;
  }

  /**
   * Get MCT engine (Sprint 3)
   */
  getMCTEngine(): IMCTEngine {
    return this.mctEngine;
  }

  /**
   * Check if third-wave approach is indicated
   */
  isThirdWaveIndicated(sleepState: ISleepState): boolean {
    const mbtiScore = this.calculateMBTIIndicators(sleepState);
    const actiScore = this.calculateACTIIndicators(sleepState);
    const mctScore = this.calculateMCTIndicators(sleepState);

    // Indicated if any score is above threshold
    return mbtiScore > 0.5 || actiScore > 0.5 || mctScore > 0.5;
  }

  /**
   * Calculate MBT-I indicators
   * High score = MBT-I recommended
   */
  private calculateMBTIIndicators(sleepState: ISleepState): number {
    const cognitions = sleepState.cognitions;
    let score = 0;
    let factors = 0;

    // High pre-sleep arousal → MBT-I
    score += cognitions.preSleepArousal;
    factors++;

    // High sleep anxiety → MBT-I
    score += cognitions.sleepAnxiety;
    factors++;

    // Sleep effort belief → MBT-I
    if (cognitions.beliefs.effortfulSleep) {
      score += 0.8;
    } else {
      score += 0.2;
    }
    factors++;

    // Low sleep self-efficacy (opposite) → MBT-I
    score += 1 - cognitions.sleepSelfEfficacy;
    factors++;

    // High SOL suggests arousal → MBT-I
    const solScore = Math.min(sleepState.metrics.sleepOnsetLatency / 60, 1);
    score += solScore;
    factors++;

    return score / factors;
  }

  /**
   * Calculate ACT-I indicators
   * High score = ACT-I recommended
   */
  private calculateACTIIndicators(sleepState: ISleepState): number {
    const cognitions = sleepState.cognitions;
    let score = 0;
    let factors = 0;

    // Catastrophizing → ACT-I (cognitive fusion)
    if (cognitions.beliefs.catastrophizing) {
      score += 0.9;
    } else {
      score += 0.1;
    }
    factors++;

    // Helplessness → ACT-I (experiential avoidance)
    if (cognitions.beliefs.helplessness) {
      score += 0.85;
    } else {
      score += 0.15;
    }
    factors++;

    // Unrealistic expectations → ACT-I
    if (cognitions.beliefs.unrealisticExpectations) {
      score += 0.7;
    } else {
      score += 0.2;
    }
    factors++;

    // Health worries → ACT-I (fusion + avoidance)
    if (cognitions.beliefs.healthWorries) {
      score += 0.8;
    } else {
      score += 0.2;
    }
    factors++;

    // High DBAS score → ACT-I
    const dbasNormalized = Math.min(cognitions.dbasScore / 10, 1);
    score += dbasNormalized;
    factors++;

    // Low self-efficacy → ACT-I
    score += 1 - cognitions.sleepSelfEfficacy;
    factors++;

    return score / factors;
  }

  /**
   * Calculate MCT indicators (Sprint 3)
   * High score = MCT recommended
   * Based on: rumination, worry, metacognitive beliefs
   */
  private calculateMCTIndicators(sleepState: ISleepState): number {
    const cognitions = sleepState.cognitions;
    let score = 0;
    let factors = 0;

    // High pre-sleep arousal (worry/rumination) → MCT
    score += cognitions.preSleepArousal;
    factors++;

    // High sleep anxiety → MCT
    score += cognitions.sleepAnxiety;
    factors++;

    // Effortful sleep belief (trying to control) → MCT
    // MCT targets the belief that thoughts must be controlled
    if (cognitions.beliefs.effortfulSleep) {
      score += 0.85;
    } else {
      score += 0.15;
    }
    factors++;

    // Catastrophizing (metacognitive fusion) → MCT
    if (cognitions.beliefs.catastrophizing) {
      score += 0.9;
    } else {
      score += 0.1;
    }
    factors++;

    // Health worries (worry about consequences) → MCT
    if (cognitions.beliefs.healthWorries) {
      score += 0.85;
    } else {
      score += 0.15;
    }
    factors++;

    // Low self-efficacy (belief in uncontrollability) → MCT
    score += 1 - cognitions.sleepSelfEfficacy;
    factors++;

    // High DBAS (dysfunctional beliefs) → MCT
    // Particularly beliefs about thought control
    const dbasNormalized = Math.min(cognitions.dbasScore / 10, 1);
    score += dbasNormalized * 0.8;
    factors++;

    return score / factors;
  }
}

/**
 * Singleton instance
 */
export const thirdWaveCoordinator = new ThirdWaveCoordinator();
