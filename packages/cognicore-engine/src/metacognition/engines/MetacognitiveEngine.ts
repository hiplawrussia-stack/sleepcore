/**
 * METACOGNITIVE THERAPY ENGINE
 * =============================
 * Core Implementation of Wells' MCT for CogniCore
 *
 * Scientific Foundation:
 * - S-REF Model (Wells & Matthews, 1994, 1996)
 * - Metacognitive Therapy (Wells, 2009)
 * - MCQ-30 Assessment (Wells & Cartwright-Hatton, 2004)
 * - CAS Detection (Wells, 2009)
 *
 * Key Features:
 * - Real-time CAS detection
 * - MCQ-30 scoring
 * - ATT session management
 * - Worry postponement protocol
 * - Detached mindfulness guidance
 *
 * БФ "Другой путь" | CogniCore Phase 4.2
 */

import type {
  IMetacognitiveState,
  MCQ30Subscales,
  MCQ30Subscale,
  CognitiveAttentionalSyndrome,
  CASWorryRumination,
  CASThreatMonitoring,
  CASMaladaptiveCoping,
  MetacognitiveBeliefs,
  BeliefCluster,
  SpecificBelief,
  TreatmentTarget,
  TreatmentTargetType,
  MCTIntervention,
  WorryRuminationTheme,
  MaladaptiveStrategy,
  MaladaptiveStrategyType
} from '../interfaces/IMetacognitiveState';

import {
  MCQ30_ITEMS,
  WORRY_PATTERNS,
  RUMINATION_PATTERNS,
  POSITIVE_WORRY_BELIEF_PATTERNS,
  UNCONTROLLABILITY_PATTERNS,
  MCQ30_CLINICAL_CUTOFFS,
  CAS_SEVERITY_THRESHOLDS
} from '../interfaces/IMetacognitiveState';

import type {
  IMetacognitiveTherapyEngine,
  MCTContext,
  CASDetectionResult,
  MCQ30ItemScore,
  MCQ30Result,
  ATTSession,
  ATTSessionType,
  ATTPreferences,
  ATTInstruction,
  ATTSessionFeedback,
  DetachedMindfulnessExercise,
  DMTarget,
  DMPreferences,
  DMExerciseType,
  WorryPostponementProtocol,
  ScheduledWorryTime,
  PostponedWorry,
  WorryOutcome,
  VerbalReattribution,
  SocraticQuestion,
  MCTResponse
} from '../interfaces/IMetacognitiveTherapy';

import {
  ATT_ABBREVIATED_INSTRUCTIONS,
  DM_METAPHORS,
  MCT_SOCRATIC_QUESTIONS
} from '../interfaces/IMetacognitiveTherapy';

// ============================================================
// METACOGNITIVE ENGINE IMPLEMENTATION
// ============================================================

export class MetacognitiveEngine implements IMetacognitiveTherapyEngine {
  // ============================================================
  // ASSESSMENT METHODS
  // ============================================================

  /**
   * Detect CAS activity in text
   */
  async detectCAS(text: string, context?: MCTContext): Promise<CASDetectionResult> {
    const lowerText = text.toLowerCase();
    const lang = context?.language ?? 'en';

    // Detect worry
    const worryScore = this.detectWorry(lowerText, lang);

    // Detect rumination
    const ruminationScore = this.detectRumination(lowerText, lang);

    // Detect metacognitive beliefs activation
    const beliefActivation = this.detectMetacognitiveBeliefActivation(lowerText, lang);

    // Detect themes
    const themes = this.detectThemes(lowerText, lang);

    // Determine type and intensity
    const worryIntensity = worryScore.intensity;
    const ruminationIntensity = ruminationScore.intensity;
    const maxIntensity = Math.max(worryIntensity, ruminationIntensity);

    let type: 'worry' | 'rumination' | 'threat_monitoring' | 'mixed' | 'none' = 'none';
    if (worryIntensity > 0.3 && ruminationIntensity > 0.3) {
      type = 'mixed';
    } else if (worryIntensity > ruminationIntensity && worryIntensity > 0.3) {
      type = 'worry';
    } else if (ruminationIntensity > 0.3) {
      type = 'rumination';
    }

    const detected = type !== 'none';
    const confidence = detected ? Math.min(0.95, maxIntensity + 0.2) : 0.3;

    // Recommend intervention
    let recommendedIntervention: MCTIntervention = 'metacognitive_profiling';
    if (detected) {
      if (beliefActivation.positive_worry) {
        recommendedIntervention = 'advantages_disadvantages';
      } else if (beliefActivation.uncontrollability) {
        recommendedIntervention = 'attention_training_technique';
      } else if (type === 'worry') {
        recommendedIntervention = 'worry_postponement';
      } else if (type === 'rumination') {
        recommendedIntervention = 'detached_mindfulness';
      }
    }

    return {
      detected,
      type,
      confidence,
      intensity: maxIntensity,
      themes,
      triggerText: text,
      metacognitiveBeliefActivated: beliefActivation.primary,
      recommendedIntervention
    };
  }

  /**
   * Score MCQ-30 item
   */
  scoreMCQ30Item(itemId: number, response: number): MCQ30ItemScore {
    const item = MCQ30_ITEMS.find(i => i.id === itemId);
    if (!item) {
      throw new Error(`Invalid MCQ-30 item ID: ${itemId}`);
    }

    // MCQ-30 uses 1-4 scale: 1=do not agree, 4=agree very much
    const rawScore = Math.max(1, Math.min(4, response));

    return {
      itemId,
      rawScore,
      subscale: item.subscale
    };
  }

  /**
   * Calculate full MCQ-30 from responses
   */
  calculateMCQ30(responses: Map<number, number>): MCQ30Result {
    const subscaleScores = {
      positiveWorryBeliefs: 0,
      negativeUncontrollabilityDanger: 0,
      cognitiveConfidence: 0,
      needToControlThoughts: 0,
      cognitiveSelfConsciousness: 0
    };

    // Calculate subscale scores
    for (const item of MCQ30_ITEMS) {
      const response = responses.get(item.id);
      if (response !== undefined) {
        const score = Math.max(1, Math.min(4, response));
        subscaleScores[item.subscale] += score;
      }
    }

    const totalScore = Object.values(subscaleScores).reduce((sum, s) => sum + s, 0);

    // Identify clinical flags
    const clinicalFlags: string[] = [];
    let primaryConcern: string | undefined;

    if (subscaleScores.positiveWorryBeliefs > MCQ30_CLINICAL_CUTOFFS.positiveWorryBeliefs) {
      clinicalFlags.push('Elevated positive beliefs about worry');
      primaryConcern = 'positive_worry_beliefs';
    }
    if (subscaleScores.negativeUncontrollabilityDanger > MCQ30_CLINICAL_CUTOFFS.negativeUncontrollabilityDanger) {
      clinicalFlags.push('Elevated beliefs about uncontrollability and danger');
      if (!primaryConcern) primaryConcern = 'uncontrollability_danger';
    }
    if (subscaleScores.cognitiveConfidence > MCQ30_CLINICAL_CUTOFFS.cognitiveConfidence) {
      clinicalFlags.push('Low cognitive confidence');
    }
    if (subscaleScores.needToControlThoughts > MCQ30_CLINICAL_CUTOFFS.needToControlThoughts) {
      clinicalFlags.push('Elevated need to control thoughts');
    }
    if (subscaleScores.cognitiveSelfConsciousness > MCQ30_CLINICAL_CUTOFFS.cognitiveSelfConsciousness) {
      clinicalFlags.push('High cognitive self-consciousness');
    }
    if (totalScore > MCQ30_CLINICAL_CUTOFFS.totalScore) {
      clinicalFlags.push('Elevated overall metacognitive dysfunction');
    }

    return {
      subscales: subscaleScores,
      totalScore,
      clinicalFlags,
      primaryConcern
    };
  }

  /**
   * Update metacognitive state
   */
  updateState(
    currentState: IMetacognitiveState,
    newData: Partial<IMetacognitiveState>
  ): IMetacognitiveState {
    return {
      ...currentState,
      ...newData,
      timestamp: new Date()
    };
  }

  // ============================================================
  // ATT METHODS
  // ============================================================

  /**
   * Create ATT session
   */
  createATTSession(
    userId: string | number,
    type: ATTSessionType,
    preferences?: ATTPreferences
  ): ATTSession {
    const instructions = this.getATTInstructions(type);
    const totalDuration = instructions.reduce((sum, i) => sum + i.durationSeconds, 0) / 60;

    return {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      type,
      durationMinutes: Math.ceil(totalDuration),
      phases: instructions.map(i => ({
        type: i.phase,
        durationSeconds: i.durationSeconds,
        instructions: i.textEn,
        instructionsRu: i.textRu
      })),
      instructions,
      state: 'not_started',
      progress: 0
    };
  }

  /**
   * Get next ATT instruction
   */
  getNextATTInstruction(session: ATTSession): ATTInstruction | null {
    const currentIndex = Math.floor(session.progress * session.instructions.length);
    if (currentIndex >= session.instructions.length) {
      return null;
    }
    return session.instructions[currentIndex];
  }

  /**
   * Complete ATT session
   */
  completeATTSession(
    session: ATTSession,
    feedback: ATTSessionFeedback
  ): ATTSession {
    return {
      ...session,
      state: 'completed',
      progress: 1,
      completedAt: new Date(),
      feedback
    };
  }

  private getATTInstructions(type: ATTSessionType): ATTInstruction[] {
    switch (type) {
      case 'abbreviated':
        return ATT_ABBREVIATED_INSTRUCTIONS;
      case 'full':
        // Full version would be longer - for now use abbreviated
        return ATT_ABBREVIATED_INSTRUCTIONS;
      case 'practice':
        // Just the attention switching phase
        return ATT_ABBREVIATED_INSTRUCTIONS.filter(i =>
          i.phase === 'attention_switching' || i.phase === 'closing'
        );
      case 'introduction':
        // Just psychoeducation and brief practice
        return ATT_ABBREVIATED_INSTRUCTIONS.filter(i =>
          i.phase === 'psychoeducation' || i.phase === 'selective_attention'
        );
      default:
        return ATT_ABBREVIATED_INSTRUCTIONS;
    }
  }

  // ============================================================
  // DETACHED MINDFULNESS METHODS
  // ============================================================

  /**
   * Create DM exercise
   */
  createDMExercise(
    target: DMTarget,
    preferences?: DMPreferences
  ): DetachedMindfulnessExercise {
    // Select appropriate metaphor
    const suitableMetaphors = DM_METAPHORS.filter(m =>
      m.suitableFor.includes(target.type)
    );

    let selectedMetaphor = suitableMetaphors[0];
    if (preferences?.preferredMetaphor) {
      const preferred = suitableMetaphors.find(m => m.id === preferences.preferredMetaphor);
      if (preferred) selectedMetaphor = preferred;
    }

    // Build instructions
    const instructions = this.buildDMInstructions(selectedMetaphor, target, preferences);

    return {
      id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: selectedMetaphor.id as DMExerciseType,
      target,
      instructions,
      metaphors: [selectedMetaphor],
      estimatedDuration: instructions.reduce((sum, i) => sum + i.duration, 0) / 60,
      prerequisites: ['Ability to visualize', 'Quiet environment'],
      contraindications: ['Active psychosis', 'Severe dissociation']
    };
  }

  private buildDMInstructions(
    metaphor: typeof DM_METAPHORS[0],
    target: DMTarget,
    preferences?: DMPreferences
  ): DetachedMindfulnessExercise['instructions'] {
    const isExtended = preferences?.preferredLength === 'extended';
    const baseDuration = isExtended ? 45 : 30;

    return [
      {
        order: 1,
        textEn: "Find a comfortable position. Close your eyes if that feels comfortable, or soften your gaze.",
        textRu: 'Найдите удобное положение. Закройте глаза, если это комфортно, или смягчите взгляд.',
        duration: 10,
        pause: true
      },
      {
        order: 2,
        textEn: metaphor.scriptEn,
        textRu: metaphor.scriptRu,
        duration: baseDuration,
        pause: true
      },
      {
        order: 3,
        textEn: "Notice that you can observe your thoughts without being caught up in them. They are just mental events, separate from you.",
        textRu: 'Заметьте, что вы можете наблюдать за мыслями, не погружаясь в них. Это просто ментальные события, отдельные от вас.',
        duration: 15,
        pause: false
      },
      {
        order: 4,
        textEn: "When you're ready, gently bring your attention back to the present moment.",
        textRu: 'Когда будете готовы, мягко верните внимание в настоящий момент.',
        duration: 10,
        pause: true
      }
    ];
  }

  // ============================================================
  // WORRY POSTPONEMENT METHODS
  // ============================================================

  /**
   * Setup worry postponement protocol
   */
  setupWorryPostponement(
    userId: string | number,
    schedule: ScheduledWorryTime
  ): WorryPostponementProtocol {
    return {
      userId,
      scheduledWorryTime: schedule,
      postponedWorries: [],
      sessionsCompleted: 0,
      startedAt: new Date(),
      isActive: true,
      effectiveness: {
        worryReduction: 0,
        postponementSuccessRate: 0,
        avgDissipationMinutes: 0,
        resolvedBeforeWorryTime: 0,
        totalWorriesProcessed: 0
      }
    };
  }

  /**
   * Record postponed worry
   */
  recordPostponedWorry(
    protocol: WorryPostponementProtocol,
    worry: Omit<PostponedWorry, 'id' | 'capturedAt' | 'processedDuringWorryTime'>
  ): WorryPostponementProtocol {
    const newWorry: PostponedWorry = {
      ...worry,
      id: `worry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      capturedAt: new Date(),
      processedDuringWorryTime: false
    };

    return {
      ...protocol,
      postponedWorries: [...protocol.postponedWorries, newWorry]
    };
  }

  /**
   * Process worry during worry time
   */
  processWorryDuringWorryTime(
    protocol: WorryPostponementProtocol,
    worryId: string,
    outcome: WorryOutcome
  ): WorryPostponementProtocol {
    const updatedWorries = protocol.postponedWorries.map(w => {
      if (w.id === worryId) {
        return {
          ...w,
          processedDuringWorryTime: true,
          processedAt: new Date(),
          outcome
        };
      }
      return w;
    });

    // Update effectiveness metrics
    const processed = updatedWorries.filter(w => w.processedDuringWorryTime);
    const resolvedBefore = processed.filter(w => !w.outcome?.stillRelevant).length;

    return {
      ...protocol,
      postponedWorries: updatedWorries,
      effectiveness: {
        ...protocol.effectiveness,
        totalWorriesProcessed: processed.length,
        resolvedBeforeWorryTime: resolvedBefore,
        postponementSuccessRate: processed.length > 0 ? resolvedBefore / processed.length : 0
      }
    };
  }

  // ============================================================
  // BELIEF WORK METHODS
  // ============================================================

  /**
   * Generate Socratic questions for belief
   */
  generateSocraticQuestions(
    belief: SpecificBelief,
    context: MCTContext
  ): SocraticQuestion[] {
    // Determine belief type
    let beliefType: SocraticQuestion['targetBeliefType'] = 'positive_worry';

    const content = belief.content.toLowerCase();
    if (content.includes('control') || content.includes('контролировать')) {
      beliefType = 'need_to_control';
    } else if (content.includes('danger') || content.includes('опасно') || content.includes('crazy') || content.includes('сума')) {
      beliefType = 'danger';
    } else if (content.includes('stop') || content.includes('остановить') || content.includes('uncontrol')) {
      beliefType = 'uncontrollability';
    }

    // Filter relevant questions
    return MCT_SOCRATIC_QUESTIONS.filter(q => q.targetBeliefType === beliefType);
  }

  /**
   * Create verbal reattribution plan
   */
  createReattributionPlan(
    belief: SpecificBelief,
    state: IMetacognitiveState
  ): VerbalReattribution {
    const questions = this.generateSocraticQuestions(belief, {
      state,
      recentMessages: [],
      language: 'en',
      ageGroup: 'adult'
    });

    return {
      targetBelief: belief,
      socraticQuestions: questions,
      evidencePrompts: [
        {
          id: 'ep_1',
          promptEn: 'What evidence supports this belief?',
          promptRu: 'Какие доказательства поддерживают это убеждение?',
          forOrAgainst: 'for',
          targetBelief: belief.content
        },
        {
          id: 'ep_2',
          promptEn: 'What evidence contradicts this belief?',
          promptRu: 'Какие доказательства противоречат этому убеждению?',
          forOrAgainst: 'against',
          targetBelief: belief.content
        }
      ],
      alternatives: [],
      experiments: []
    };
  }

  /**
   * Suggest behavioral experiment
   */
  suggestBehavioralExperiment(
    belief: SpecificBelief,
    context: MCTContext
  ): VerbalReattribution['experiments'] {
    const experiments: VerbalReattribution['experiments'] = [];

    // Worry-related experiment
    if (belief.content.toLowerCase().includes('worry') || belief.content.toLowerCase().includes('беспок')) {
      experiments.push({
        id: 'be_worry_reduction',
        nameEn: 'Worry Reduction Experiment',
        nameRu: 'Эксперимент по снижению беспокойства',
        beliefTested: belief.content,
        prediction: 'If I worry less, bad things will happen',
        procedure: [
          'Choose one day to consciously reduce worrying by 50%',
          'Use worry postponement technique',
          'At end of day, record what actually happened',
          'Compare predictions to reality'
        ],
        procedureRu: [
          'Выберите один день для осознанного снижения беспокойства на 50%',
          'Используйте технику откладывания беспокойства',
          'В конце дня запишите, что на самом деле произошло',
          'Сравните предсказания с реальностью'
        ],
        possibleOutcomes: [
          {
            outcome: 'Bad things did not happen',
            interpretation: 'Worry does not prevent negative outcomes',
            implicationForBelief: 'contradicts'
          },
          {
            outcome: 'Something negative happened',
            interpretation: 'Would worrying have changed this outcome?',
            implicationForBelief: 'neutral'
          }
        ],
        safetyConsiderations: ['Ensure basic responsibilities are still met', 'Do not apply to genuine safety concerns']
      });
    }

    return experiments;
  }

  // ============================================================
  // STRATEGY METHODS
  // ============================================================

  /**
   * Recommend intervention based on state
   */
  recommendIntervention(state: IMetacognitiveState): MCTIntervention {
    // Priority order based on MCT protocol
    const priorities = this.getInterventionPriority(state);
    return priorities[0] || 'metacognitive_profiling';
  }

  /**
   * Get intervention priority
   */
  getInterventionPriority(state: IMetacognitiveState): MCTIntervention[] {
    const priorities: MCTIntervention[] = [];

    // 1. If high CAS, start with ATT or DM
    if (state.cas.severity > CAS_SEVERITY_THRESHOLDS.moderate) {
      if (state.attentionalControl < 0.5) {
        priorities.push('attention_training_technique');
      }
      if (state.cas.worryRumination.predominantType === 'worry') {
        priorities.push('worry_postponement');
      } else if (state.cas.worryRumination.predominantType === 'rumination') {
        priorities.push('detached_mindfulness');
      }
    }

    // 2. Address positive worry beliefs
    if (state.mcq30.positiveWorryBeliefs.clinicallySignificant) {
      priorities.push('advantages_disadvantages');
      priorities.push('verbal_reattribution');
    }

    // 3. Address uncontrollability beliefs
    if (state.mcq30.negativeUncontrollabilityDanger.clinicallySignificant) {
      priorities.push('behavioral_experiment');
      priorities.push('attention_training_technique');
    }

    // 4. Default: metacognitive profiling
    if (priorities.length === 0) {
      priorities.push('metacognitive_profiling');
    }

    return priorities;
  }

  /**
   * Generate response to CAS
   */
  generateCASResponse(
    detection: CASDetectionResult,
    context: MCTContext
  ): MCTResponse {
    const lang = context.language;

    if (!detection.detected) {
      return {
        type: 'encouragement',
        textEn: "You seem to be in a calm state of mind right now. That's good!",
        textRu: 'Похоже, вы сейчас в спокойном состоянии ума. Это хорошо!'
      };
    }

    // Respond based on type
    switch (detection.type) {
      case 'worry':
        return {
          type: 'intervention_offer',
          textEn: 'I notice you may be worrying about something. Would you like to try postponing this worry to a scheduled worry time? This technique helps many people reduce the impact of worry.',
          textRu: 'Замечаю, что вы, возможно, беспокоитесь о чём-то. Хотите попробовать отложить это беспокойство на запланированное время для беспокойства? Эта техника помогает многим людям уменьшить влияние тревоги.',
          intervention: 'worry_postponement',
          followUpQuestions: [
            lang === 'ru' ? 'Что конкретно вас беспокоит?' : 'What specifically are you worried about?',
            lang === 'ru' ? 'Как долго вы об этом думаете?' : 'How long have you been thinking about this?'
          ]
        };

      case 'rumination':
        return {
          type: 'intervention_offer',
          textEn: "It sounds like you might be going over past events in your mind. Would you like to try a brief exercise to help you step back from these thoughts?",
          textRu: 'Похоже, вы можете прокручивать в голове прошлые события. Хотите попробовать короткое упражнение, чтобы отстраниться от этих мыслей?',
          intervention: 'detached_mindfulness',
          followUpQuestions: [
            lang === 'ru' ? 'О каком событии вы думаете?' : 'What event are you thinking about?',
            lang === 'ru' ? 'Что вы надеетесь понять, размышляя об этом?' : 'What do you hope to understand by thinking about this?'
          ]
        };

      case 'mixed':
        return {
          type: 'psychoeducation',
          textEn: 'Your mind seems to be quite active with thoughts about both the past and future. This is a common pattern called the Cognitive Attentional Syndrome. Let me share a technique that can help you regain control over your attention.',
          textRu: 'Ваш ум, похоже, довольно активен с мыслями о прошлом и будущем. Это распространённый паттерн, называемый когнитивно-внимательным синдромом. Позвольте мне поделиться техникой, которая поможет вернуть контроль над вниманием.',
          intervention: 'attention_training_technique'
        };

      default:
        return {
          type: 'psychoeducation',
          textEn: "I'm here to help you understand and manage your thinking patterns. Would you like to learn more about how your thoughts affect your wellbeing?",
          textRu: 'Я здесь, чтобы помочь вам понять и управлять паттернами мышления. Хотите узнать больше о том, как ваши мысли влияют на ваше самочувствие?',
          intervention: 'metacognitive_profiling'
        };
    }
  }

  // ============================================================
  // PRIVATE DETECTION METHODS
  // ============================================================

  private detectWorry(text: string, lang: 'ru' | 'en'): { intensity: number; keywords: string[] } {
    const keywords: string[] = [];
    let intensity = 0;

    const worryKeywords = lang === 'ru' ? WORRY_PATTERNS.keywords.ru : WORRY_PATTERNS.keywords.en;
    const futureWords = lang === 'ru' ? WORRY_PATTERNS.futureOrientation.ru : WORRY_PATTERNS.futureOrientation.en;

    // Check worry keywords
    for (const keyword of worryKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        keywords.push(keyword);
        intensity += 0.15;
      }
    }

    // Check future orientation
    for (const word of futureWords) {
      if (text.includes(word.toLowerCase())) {
        intensity += 0.1;
      }
    }

    return {
      intensity: Math.min(1, intensity),
      keywords
    };
  }

  private detectRumination(text: string, lang: 'ru' | 'en'): { intensity: number; keywords: string[] } {
    const keywords: string[] = [];
    let intensity = 0;

    const ruminationKeywords = lang === 'ru' ? RUMINATION_PATTERNS.keywords.ru : RUMINATION_PATTERNS.keywords.en;
    const pastWords = lang === 'ru' ? RUMINATION_PATTERNS.pastOrientation.ru : RUMINATION_PATTERNS.pastOrientation.en;

    // Check rumination keywords
    for (const keyword of ruminationKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        keywords.push(keyword);
        intensity += 0.15;
      }
    }

    // Check past orientation
    for (const word of pastWords) {
      if (text.includes(word.toLowerCase())) {
        intensity += 0.1;
      }
    }

    return {
      intensity: Math.min(1, intensity),
      keywords
    };
  }

  private detectMetacognitiveBeliefActivation(
    text: string,
    lang: 'ru' | 'en'
  ): { positive_worry: boolean; uncontrollability: boolean; primary?: string } {
    const positivePatterns = lang === 'ru' ? POSITIVE_WORRY_BELIEF_PATTERNS.ru : POSITIVE_WORRY_BELIEF_PATTERNS.en;
    const uncontrollabilityPatterns = lang === 'ru' ? UNCONTROLLABILITY_PATTERNS.ru : UNCONTROLLABILITY_PATTERNS.en;

    let positive_worry = false;
    let uncontrollability = false;

    for (const pattern of positivePatterns) {
      if (text.includes(pattern.toLowerCase())) {
        positive_worry = true;
        break;
      }
    }

    for (const pattern of uncontrollabilityPatterns) {
      if (text.includes(pattern.toLowerCase())) {
        uncontrollability = true;
        break;
      }
    }

    let primary: string | undefined;
    if (positive_worry) primary = 'Positive worry belief';
    else if (uncontrollability) primary = 'Uncontrollability belief';

    return { positive_worry, uncontrollability, primary };
  }

  private detectThemes(text: string, lang: 'ru' | 'en'): WorryRuminationTheme[] {
    const themes: WorryRuminationTheme[] = [];
    const lowerText = text.toLowerCase();

    const themeKeywords: Record<WorryRuminationTheme, { en: string[]; ru: string[] }> = {
      health: { en: ['health', 'sick', 'disease', 'symptom'], ru: ['здоровье', 'болезнь', 'симптом', 'боль'] },
      relationships: { en: ['relationship', 'friend', 'partner', 'family'], ru: ['отношения', 'друг', 'партнёр', 'семья'] },
      performance: { en: ['work', 'job', 'school', 'exam', 'presentation'], ru: ['работа', 'экзамен', 'презентация', 'учёба'] },
      finances: { en: ['money', 'financial', 'debt', 'afford'], ru: ['деньги', 'финансы', 'долг'] },
      safety: { en: ['safe', 'danger', 'accident'], ru: ['безопасность', 'опасность', 'авария'] },
      social_evaluation: { en: ['judge', 'think of me', 'embarrass', 'opinion'], ru: ['судят', 'думают обо мне', 'стыдно', 'мнение'] },
      future_uncertainty: { en: ['future', 'uncertain', 'what will happen'], ru: ['будущее', 'неопределённость', 'что будет'] },
      past_mistakes: { en: ['mistake', 'should have', 'regret', 'wrong'], ru: ['ошибка', 'надо было', 'жалею', 'неправильно'] },
      digital_usage: { en: ['phone', 'screen', 'social media', 'game'], ru: ['телефон', 'экран', 'соцсети', 'игра'] },
      self_worth: { en: ['worthless', 'not good enough', 'failure'], ru: ['никчёмный', 'недостаточно хорош', 'неудачник'] },
      control: { en: ['control', 'helpless', 'powerless'], ru: ['контроль', 'беспомощн', 'бессил'] },
      other: { en: [], ru: [] }
    };

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      const langKeywords = lang === 'ru' ? keywords.ru : keywords.en;
      for (const keyword of langKeywords) {
        if (lowerText.includes(keyword)) {
          themes.push(theme as WorryRuminationTheme);
          break;
        }
      }
    }

    return themes.length > 0 ? themes : ['other'];
  }
}

// ============================================================
// STATE FACTORY
// ============================================================

export class MetacognitiveStateFactory {
  /**
   * Create initial state for new user
   */
  createInitial(userId: string | number): IMetacognitiveState {
    return {
      id: `mcs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      mcq30: this.createDefaultMCQ30(),
      cas: this.createDefaultCAS(),
      beliefs: this.createDefaultBeliefs(),
      attentionalControl: 0.5,
      detachedMindfulnessCapacity: 0.5,
      metaAwareness: 0.5,
      treatmentTargets: [],
      recommendedInterventions: ['metacognitive_profiling'],
      timestamp: new Date(),
      confidence: 0.3,
      dataQuality: 0.3
    };
  }

  private createDefaultMCQ30(): MCQ30Subscales {
    const defaultSubscale: MCQ30Subscale = {
      score: 12,
      normalized: 0.5,
      clinicallySignificant: false,
      confidence: 0.3
    };

    return {
      positiveWorryBeliefs: { ...defaultSubscale },
      negativeUncontrollabilityDanger: { ...defaultSubscale },
      cognitiveConfidence: { ...defaultSubscale },
      needToControlThoughts: { ...defaultSubscale },
      cognitiveSelfConsciousness: { ...defaultSubscale },
      totalScore: 60,
      assessedAt: new Date(),
      source: 'inferred'
    };
  }

  private createDefaultCAS(): CognitiveAttentionalSyndrome {
    return {
      worryRumination: {
        worryIntensity: 0,
        ruminationIntensity: 0,
        predominantType: 'none',
        estimatedDailyMinutes: 0,
        perceivedControllability: 0.5,
        themes: [],
        detectedEpisodes: []
      },
      threatMonitoring: {
        hypervigilance: 0,
        selfFocusedAttention: 0.5,
        externalThreatScanning: 0,
        attentionFlexibility: 0.5,
        monitoredDomains: []
      },
      maladaptiveCoping: {
        thoughtSuppression: 0,
        avoidance: 0,
        reassuranceSeeking: 0,
        safetyBehaviors: 0,
        substanceUse: 0,
        digitalEscapism: 0,
        checking: 0,
        identifiedStrategies: []
      },
      severity: 0,
      activeNow: false,
      triggers: []
    };
  }

  private createDefaultBeliefs(): MetacognitiveBeliefs {
    const defaultCluster: BeliefCluster = {
      strength: 0,
      beliefs: [],
      confidence: 0.3,
      lastUpdated: new Date()
    };

    return {
      positiveWorryBeliefs: { ...defaultCluster },
      positiveRuminationBeliefs: { ...defaultCluster },
      negativeThoughtBeliefs: { ...defaultCluster },
      cognitiveCompetenceBeliefs: { ...defaultCluster },
      thoughtControlBeliefs: { ...defaultCluster },
      emotionalControlBeliefs: { ...defaultCluster }
    };
  }
}

// ============================================================
// EXPORTS
// ============================================================

export default MetacognitiveEngine;
