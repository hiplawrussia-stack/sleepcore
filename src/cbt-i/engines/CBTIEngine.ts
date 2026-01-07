/**
 * CBTIEngine - Main CBT-I Therapy Engine
 * =======================================
 * Orchestrates the five core CBT-I components:
 * 1. Sleep Restriction Therapy (SRT)
 * 2. Stimulus Control Therapy (SCT)
 * 3. Cognitive Restructuring (CR)
 * 4. Sleep Hygiene Education (SHE)
 * 5. Relaxation Training (RT)
 *
 * Implements evidence-based CBT-I protocol following
 * Morin & Espie clinical guidelines.
 *
 * Treatment phases:
 * - Assessment (Week 1)
 * - Education (Week 1-2)
 * - Intervention (Week 2-6)
 * - Maintenance (Week 7-8)
 * - Follow-up (Post-treatment)
 *
 * @packageDocumentation
 * @module @sleepcore/cbt-i
 */

import type {
  ICBTIEngine,
  ICBTIPlan,
  ICBTIIntervention,
  CBTIPhase,
  CBTIComponent,
} from '../interfaces/ICBTIComponents';
import type { ISleepState, ISleepMetrics } from '../../sleep/interfaces/ISleepState';

import { SleepRestrictionEngine } from './SleepRestrictionEngine';
import { StimulusControlEngine } from './StimulusControlEngine';
import { CognitiveRestructuringEngine } from './CognitiveRestructuringEngine';
import { SleepHygieneEngine } from './SleepHygieneEngine';
import { RelaxationEngine } from './RelaxationEngine';

/**
 * Intervention priority weights by phase
 */
const PHASE_PRIORITIES: Record<CBTIPhase, Record<CBTIComponent, number>> = {
  assessment: {
    sleep_restriction: 1,
    stimulus_control: 1,
    cognitive_restructuring: 2,
    sleep_hygiene: 3,
    relaxation: 2,
  },
  education: {
    sleep_restriction: 2,
    stimulus_control: 2,
    cognitive_restructuring: 3,
    sleep_hygiene: 5, // High priority during education
    relaxation: 4,
  },
  intervention: {
    sleep_restriction: 5, // Highest during intervention
    stimulus_control: 5,
    cognitive_restructuring: 4,
    sleep_hygiene: 2,
    relaxation: 3,
  },
  maintenance: {
    sleep_restriction: 3,
    stimulus_control: 3,
    cognitive_restructuring: 4,
    sleep_hygiene: 3,
    relaxation: 4,
  },
  follow_up: {
    sleep_restriction: 2,
    stimulus_control: 2,
    cognitive_restructuring: 3,
    sleep_hygiene: 3,
    relaxation: 3,
  },
};

/**
 * Main CBT-I Engine
 */
export class CBTIEngine implements ICBTIEngine {
  private readonly sleepRestriction: SleepRestrictionEngine;
  private readonly stimulusControl: StimulusControlEngine;
  private readonly cognitiveRestructuring: CognitiveRestructuringEngine;
  private readonly sleepHygiene: SleepHygieneEngine;
  private readonly relaxation: RelaxationEngine;

  constructor() {
    this.sleepRestriction = new SleepRestrictionEngine();
    this.stimulusControl = new StimulusControlEngine();
    this.cognitiveRestructuring = new CognitiveRestructuringEngine();
    this.sleepHygiene = new SleepHygieneEngine();
    this.relaxation = new RelaxationEngine();
  }

  /**
   * Initialize a new CBT-I treatment plan
   */
  initializePlan(userId: string, baselineAssessment: ISleepState[]): ICBTIPlan {
    if (baselineAssessment.length < 7) {
      throw new Error('Need at least 7 days of baseline sleep data');
    }

    // Calculate baseline metrics
    const baselineMetrics = baselineAssessment.map((s) => s.metrics);
    const lastState = baselineAssessment[baselineAssessment.length - 1];

    // Get average wake time for SRT
    const avgWakeTime = this.calculateAverageWakeTime(baselineMetrics);

    // Initialize Sleep Restriction
    const sleepRestriction = this.sleepRestriction.calculateInitialWindow(
      baselineMetrics,
      avgWakeTime
    );

    // Get Stimulus Control rules
    const stimulusControl = this.stimulusControl.getRules(lastState);

    // Assess Sleep Hygiene
    const hygieneAssessment = this.sleepHygiene.assess(lastState);

    // Get Relaxation Protocol
    const relaxationProtocol = this.relaxation.getProtocol('beginner', 'bedtime');

    // Identify cognitive targets
    const cognitiveTargets = this.cognitiveRestructuring.identifyBeliefs(
      '', // Would need user input
      lastState
    );

    // Calculate baseline ISI
    const isiBaseline = lastState.insomnia.isiScore;

    // Calculate baseline SE
    const seBaseline = this.calculateAverageSE(baselineMetrics);

    return {
      userId,
      startDate: new Date().toISOString().split('T')[0],
      currentPhase: 'assessment',
      currentWeek: 1,
      totalWeeks: 8,

      activeComponents: {
        sleepRestriction,
        stimulusControl,
        cognitiveTargets,
        hygieneRecommendations: hygieneAssessment.recommendations,
        relaxationProtocol,
      },

      weeklyGoals: this.generateWeeklyGoals('assessment'),

      progress: {
        isiBaseline,
        isiCurrent: isiBaseline,
        isiTarget: 7, // Sub-clinical threshold
        sleepEfficiencyBaseline: seBaseline,
        sleepEfficiencyCurrent: seBaseline,
        completionPercentage: 0,
      },
    };
  }

  /**
   * Get next recommended intervention
   */
  getNextIntervention(plan: ICBTIPlan, currentState: ISleepState): ICBTIIntervention {
    const interventions: ICBTIIntervention[] = [];
    const priorities = PHASE_PRIORITIES[plan.currentPhase];

    // Check Sleep Restriction
    if (plan.activeComponents.sleepRestriction?.isActive) {
      const adherence = this.sleepRestriction.calculateAdherence(
        plan.activeComponents.sleepRestriction,
        [currentState.metrics]
      );

      if (adherence < 0.7) {
        interventions.push({
          component: 'sleep_restriction',
          action: `Придерживайтесь назначенного времени сна: ложитесь в ${plan.activeComponents.sleepRestriction.prescribedBedtime}, вставайте в ${plan.activeComponents.sleepRestriction.prescribedWakeTime}`,
          rationale: 'Ограничение времени в постели помогает консолидировать сон и повысить его эффективность.',
          priority: priorities.sleep_restriction,
          timing: 'tonight',
          personalizationScore: 0.9,
        });
      }
    }

    // Check Stimulus Control
    const scRules = plan.activeComponents.stimulusControl;
    if (currentState.metrics.sleepOnsetLatency > scRules.leaveThresholdMinutes) {
      interventions.push({
        component: 'stimulus_control',
        action: this.stimulusControl.generateLeaveReminder(currentState.metrics.sleepOnsetLatency),
        rationale: 'Не оставайтесь в постели, если не можете заснуть. Это укрепляет ассоциацию кровать=сон.',
        priority: priorities.stimulus_control,
        timing: 'immediate',
        personalizationScore: 0.85,
      });
    }

    // Check Cognitive issues
    if (currentState.cognitions.sleepAnxiety > 0.5) {
      const questions = this.cognitiveRestructuring.generateSocraticQuestions({
        id: 'anxiety_belief',
        category: 'consequences',
        belief: 'Если я не высплюсь, завтра будет ужасный день',
        intensity: currentState.cognitions.sleepAnxiety,
        frequency: 0.7,
        evidenceFor: [],
        evidenceAgainst: [],
        alternativeThought: '',
        isActive: true,
      });

      interventions.push({
        component: 'cognitive_restructuring',
        action: `Подумайте: ${questions[0]}`,
        rationale: 'Тревога о сне усиливает бессонницу. Попробуем пересмотреть эти мысли.',
        priority: priorities.cognitive_restructuring,
        timing: 'this_week',
        personalizationScore: 0.8,
      });
    }

    // Check Sleep Hygiene
    const hygieneAssessment = this.sleepHygiene.assess(currentState);
    if (hygieneAssessment.topIssues.length > 0) {
      const topIssue = hygieneAssessment.topIssues[0];
      const content = this.sleepHygiene.getEducationalContent(topIssue);

      interventions.push({
        component: 'sleep_hygiene',
        action: content.tips[0],
        rationale: content.content.slice(0, 100) + '...',
        priority: priorities.sleep_hygiene,
        timing: 'this_week',
        personalizationScore: 0.7,
      });
    }

    // Check Relaxation need
    if (currentState.cognitions.preSleepArousal > 0.5) {
      const technique = this.relaxation.recommendTechnique(currentState, 'bedtime');
      interventions.push({
        component: 'relaxation',
        action: `Практикуйте ${this.getTechniqueName(technique)} перед сном`,
        rationale: 'Высокий уровень возбуждения мешает засыпанию. Расслабление поможет.',
        priority: priorities.relaxation,
        timing: 'tonight',
        personalizationScore: 0.75,
      });
    }

    // Sort by priority and return highest
    interventions.sort((a, b) => b.priority - a.priority);

    return interventions[0] || {
      component: 'sleep_hygiene',
      action: 'Продолжайте придерживаться рекомендаций по гигиене сна',
      rationale: 'Стабильность — ключ к хорошему сну.',
      priority: 3,
      timing: 'this_week',
      personalizationScore: 0.5,
    };
  }

  /**
   * Update treatment plan based on recent progress
   */
  updatePlan(plan: ICBTIPlan, recentStates: ISleepState[]): ICBTIPlan {
    if (recentStates.length === 0) return plan;

    const recentMetrics = recentStates.map((s) => s.metrics);
    const lastState = recentStates[recentStates.length - 1];

    // Update Sleep Restriction prescription if needed
    let updatedSleepRestriction = plan.activeComponents.sleepRestriction;
    if (updatedSleepRestriction && recentMetrics.length >= 5) {
      updatedSleepRestriction = this.sleepRestriction.evaluateAndAdjust(
        updatedSleepRestriction,
        recentMetrics
      );
    }

    // Update Stimulus Control rules
    const updatedStimulusControl = this.stimulusControl.getRules(lastState);

    // Reassess Sleep Hygiene
    const hygieneAssessment = this.sleepHygiene.assess(lastState);

    // Calculate current metrics
    const currentSE = this.calculateAverageSE(recentMetrics);
    const currentISI = lastState.insomnia.isiScore;

    // Determine new phase based on week
    let newPhase = plan.currentPhase;
    const newWeek = plan.currentWeek + 1;

    if (newWeek === 2 && plan.currentPhase === 'assessment') {
      newPhase = 'education';
    } else if (newWeek >= 3 && plan.currentPhase === 'education') {
      newPhase = 'intervention';
    } else if (newWeek >= 7 && plan.currentPhase === 'intervention') {
      newPhase = 'maintenance';
    } else if (newWeek > 8) {
      newPhase = 'follow_up';
    }

    // Calculate completion percentage
    const completionPercentage = Math.min(100, (newWeek / plan.totalWeeks) * 100);

    return {
      ...plan,
      currentPhase: newPhase,
      currentWeek: newWeek,

      activeComponents: {
        ...plan.activeComponents,
        sleepRestriction: updatedSleepRestriction,
        stimulusControl: updatedStimulusControl,
        hygieneRecommendations: hygieneAssessment.recommendations,
      },

      weeklyGoals: this.generateWeeklyGoals(newPhase),

      progress: {
        ...plan.progress,
        isiCurrent: currentISI,
        sleepEfficiencyCurrent: currentSE,
        completionPercentage,
      },
    };
  }

  /**
   * Assess treatment response
   */
  assessResponse(plan: ICBTIPlan): {
    isResponding: boolean;
    isiChange: number;
    recommendation: 'continue' | 'intensify' | 'modify' | 'graduate';
  } {
    const isiChange = plan.progress.isiBaseline - plan.progress.isiCurrent;
    const seImprovement =
      plan.progress.sleepEfficiencyCurrent - plan.progress.sleepEfficiencyBaseline;

    // Responder criteria: ISI reduction ≥ 6 or ISI ≤ 7
    const isResponding = isiChange >= 6 || plan.progress.isiCurrent <= 7;

    let recommendation: 'continue' | 'intensify' | 'modify' | 'graduate';

    if (plan.progress.isiCurrent <= 7 && plan.progress.sleepEfficiencyCurrent >= 85) {
      recommendation = 'graduate';
    } else if (isResponding) {
      recommendation = 'continue';
    } else if (plan.currentWeek >= 4 && isiChange < 3) {
      recommendation = 'modify';
    } else if (plan.currentWeek >= 2 && isiChange < 2) {
      recommendation = 'intensify';
    } else {
      recommendation = 'continue';
    }

    return { isResponding, isiChange, recommendation };
  }

  /**
   * Generate weekly summary
   */
  generateWeeklySummary(
    plan: ICBTIPlan,
    weeklyStates: ISleepState[]
  ): {
    sleepEfficiencyAvg: number;
    totalSleepTimeAvg: number;
    adherenceScore: number;
    keyAchievements: string[];
    nextWeekFocus: string[];
  } {
    const metrics = weeklyStates.map((s) => s.metrics);

    const sleepEfficiencyAvg = this.calculateAverageSE(metrics);
    const totalSleepTimeAvg =
      metrics.reduce((sum, m) => sum + m.totalSleepTime, 0) / metrics.length;

    // Calculate adherence across components
    let adherenceScore = 0;
    let adherenceCount = 0;

    if (plan.activeComponents.sleepRestriction) {
      adherenceScore += this.sleepRestriction.calculateAdherence(
        plan.activeComponents.sleepRestriction,
        metrics
      );
      adherenceCount++;
    }

    const scAdherences = metrics.map((m) =>
      this.stimulusControl.trackAdherence(plan.activeComponents.stimulusControl, m)
    );
    adherenceScore += scAdherences.reduce((sum, a) => sum + a.overallAdherence, 0) / scAdherences.length;
    adherenceCount++;

    adherenceScore = adherenceScore / adherenceCount;

    // Generate achievements
    const keyAchievements: string[] = [];
    const nextWeekFocus: string[] = [];

    if (sleepEfficiencyAvg >= 85) {
      keyAchievements.push(`Эффективность сна достигла ${sleepEfficiencyAvg.toFixed(0)}%`);
    } else {
      nextWeekFocus.push('Повысить эффективность сна');
    }

    if (adherenceScore >= 0.8) {
      keyAchievements.push('Отличное соблюдение рекомендаций');
    } else {
      nextWeekFocus.push('Строже придерживаться режима');
    }

    const avgSOL = metrics.reduce((sum, m) => sum + m.sleepOnsetLatency, 0) / metrics.length;
    if (avgSOL <= 20) {
      keyAchievements.push('Быстрое засыпание (до 20 мин)');
    }

    if (nextWeekFocus.length === 0) {
      nextWeekFocus.push('Поддерживать достигнутые результаты');
    }

    return {
      sleepEfficiencyAvg,
      totalSleepTimeAvg,
      adherenceScore,
      keyAchievements,
      nextWeekFocus,
    };
  }

  // ============= Private Helper Methods =============

  private calculateAverageWakeTime(metrics: ISleepMetrics[]): string {
    const wakeTimes = metrics.map((m) => {
      const [h, min] = m.wakeTime.split(':').map(Number);
      return h * 60 + min;
    });
    const avgMins = Math.round(wakeTimes.reduce((a, b) => a + b, 0) / wakeTimes.length);
    const hours = Math.floor(avgMins / 60);
    const minutes = avgMins % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private calculateAverageSE(metrics: ISleepMetrics[]): number {
    return metrics.reduce((sum, m) => sum + m.sleepEfficiency, 0) / metrics.length;
  }

  private generateWeeklyGoals(phase: CBTIPhase): { component: CBTIComponent; goal: string; achieved: boolean }[] {
    const goals: { component: CBTIComponent; goal: string; achieved: boolean }[] = [];

    switch (phase) {
      case 'assessment':
        goals.push(
          { component: 'sleep_hygiene', goal: 'Вести дневник сна 7 дней', achieved: false },
          { component: 'cognitive_restructuring', goal: 'Заполнить опросники ISI и DBAS', achieved: false }
        );
        break;
      case 'education':
        goals.push(
          { component: 'sleep_hygiene', goal: 'Изучить принципы гигиены сна', achieved: false },
          { component: 'relaxation', goal: 'Освоить технику дыхания', achieved: false },
          { component: 'cognitive_restructuring', goal: 'Понять связь мыслей и сна', achieved: false }
        );
        break;
      case 'intervention':
        goals.push(
          { component: 'sleep_restriction', goal: 'Соблюдать предписанное окно сна', achieved: false },
          { component: 'stimulus_control', goal: 'Вставать если не спится > 15 мин', achieved: false },
          { component: 'relaxation', goal: 'Практиковать расслабление каждый вечер', achieved: false }
        );
        break;
      case 'maintenance':
        goals.push(
          { component: 'sleep_restriction', goal: 'Стабилизировать расширенное окно сна', achieved: false },
          { component: 'cognitive_restructuring', goal: 'Применять новые мысли о сне', achieved: false }
        );
        break;
      case 'follow_up':
        goals.push(
          { component: 'sleep_hygiene', goal: 'Поддерживать здоровые привычки', achieved: false },
          { component: 'relaxation', goal: 'Использовать техники при необходимости', achieved: false }
        );
        break;
    }

    return goals;
  }

  private getTechniqueName(technique: string): string {
    const names: Record<string, string> = {
      progressive_muscle_relaxation: 'прогрессивную мышечную релаксацию',
      diaphragmatic_breathing: 'диафрагмальное дыхание',
      body_scan: 'сканирование тела',
      guided_imagery: 'направленную визуализацию',
      autogenic_training: 'аутогенную тренировку',
      mindfulness_meditation: 'майндфулнес-медитацию',
      cognitive_shuffle: 'когнитивный шаффл',
    };
    return names[technique] || technique;
  }
}
