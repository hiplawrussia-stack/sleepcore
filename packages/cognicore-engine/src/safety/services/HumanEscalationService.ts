/**
 * Human Escalation Service
 *
 * Phase 6.2: Human-in-the-Loop escalation protocol
 *
 * 2025 Research Integration:
 * - Ethical circuit breakers
 * - Confidence threshold triggers (85%)
 * - Policy engines for escalation
 * - Emotional complexity indicators
 * - HITL imperative patterns
 *
 * Based on:
 * - APA Guidelines on Human Oversight in Mental Health AI (Nov 2025)
 * - FDA Guidance on AI-Enabled Device Human Oversight
 * - UNDP Human-in-the-Loop AI Guidelines
 * - CHAI Human-AI Collaboration Standards
 */

import { randomUUID } from 'crypto';
import {
  IHumanEscalationService,
  IHumanEscalationRequest,
  IEscalationDecision,
  ISafetyContext,
  IConversationMessage,
  EscalationReason,
  EscalationStatus,
  EscalationUrgency,
  RiskLevel,
  generateSafetyId,
} from '../interfaces/ISafetyEnvelope';

// ============================================================================
// ESCALATION CONFIGURATION
// ============================================================================

/**
 * Escalation thresholds based on 2025 HITL research
 */
export const ESCALATION_THRESHOLDS = {
  // Risk-based thresholds
  risk: {
    critical: { shouldEscalate: true, urgency: 'emergency' as const },
    high: { shouldEscalate: true, urgency: 'urgent' as const },
    moderate: { shouldEscalate: false, urgency: 'priority' as const },
    low: { shouldEscalate: false, urgency: 'routine' as const },
    none: { shouldEscalate: false, urgency: 'routine' as const },
  },

  // AI confidence threshold (2025: below 85% = escalate)
  aiConfidenceThreshold: 0.85,

  // Repeated distress threshold
  repeatedDistressCount: 3,
  repeatedDistressWindow: 24 * 60 * 60 * 1000, // 24 hours

  // Session limits
  maxCrisisMessagesPerSession: 5,

  // Minor protection - always escalate crisis for minors
  minorCrisisEscalation: true,

  // 2025 additions
  emotionalComplexityThreshold: 0.7,
  regulatoryKeywordTrigger: true,
  ethicalCircuitBreakerEnabled: true,
};

/**
 * Keywords that trigger immediate escalation
 */
export const ESCALATION_KEYWORDS = {
  // Emergency - immediate human intervention needed
  emergency: [
    'хочу умереть',
    'убить себя',
    'покончить с собой',
    'не хочу жить',
    'суицид',
    'самоубийство',
    'конец жизни',
    'want to die',
    'kill myself',
    'end my life',
    'suicide',
  ],

  // Urgent - high priority escalation
  urgent: [
    'режу себя',
    'самоповреждение',
    'селфхарм',
    'причинить себе вред',
    'self-harm',
    'cutting',
    'hurt myself',
    'насилие надо мной',
    'меня бьют',
  ],

  // Priority - user requesting human
  humanRequest: [
    'хочу поговорить с человеком',
    'позови психолога',
    'мне нужен живой человек',
    'это не помогает',
    'хватит',
    'ты не понимаешь',
    'speak to a human',
    'real person',
    'talk to someone real',
  ],

  // Regulatory - triggers for compliance
  regulatory: [
    'жалоба',
    'адвокат',
    'суд',
    'права',
    'complaint',
    'lawyer',
    'rights',
  ],
};

// ============================================================================
// ESCALATION RESPONSE TEMPLATES
// ============================================================================

/**
 * Age-adaptive escalation response templates
 */
const ESCALATION_RESPONSE_TEMPLATES = {
  child: {
    emergency: `
🆘 Мне очень важна твоя безопасность!

Пожалуйста, расскажи взрослому, которому ты доверяешь — маме, папе, учителю.

Или позвони: 📞 8-800-2000-122 (это бесплатно!)

Там есть добрые люди, которые хотят помочь. 💙
    `.trim(),
    crisis: `
💙 Я слышу тебя, и мне важно, как ты себя чувствуешь.

Пожалуйста, расскажи взрослому — маме, папе, бабушке, учителю.

📞 8-800-2000-122 (бесплатно, 24/7)

Ты не один(на)!
    `.trim(),
    minorProtection: `
💙 Я забочусь о тебе!

Если тебе грустно или страшно, расскажи об этом взрослому.

📞 8-800-2000-122

Взрослые помогут!
    `.trim(),
    humanRequest: `
Я понимаю, что тебе нужен взрослый человек.

Расскажи маме, папе или другому взрослому, которому доверяешь.

📞 8-800-2000-122 — там есть добрые люди!
    `.trim(),
  },

  teen: {
    emergency: `
🚨 Я очень беспокоюсь о тебе прямо сейчас.

Пожалуйста, позвони по одному из этих номеров:
📞 8-800-2000-122 — Психологическая помощь (бесплатно, 24/7)
📞 112 — Экстренные службы

Там реально помогают. Анонимно.

Я остаюсь здесь с тобой. 💙
    `.trim(),
    crisis: `
💙 Я слышу тебя, и мне важно, как ты себя чувствуешь.

То, через что ты проходишь, очень серьёзно.

📞 8-800-2000-122 (бесплатно, 24/7)
💬 psyhelp.online

Живой специалист сможет помочь лучше, чем я.
    `.trim(),
    minorProtection: `
💙 Я хочу убедиться, что ты в безопасности.

Если тебе тяжело, важно поговорить с кем-то — взрослым, которому доверяешь, или позвонить:

📞 8-800-2000-122 (бесплатно, 24/7)

Ты не один(на).
    `.trim(),
    humanRequest: `
Я понимаю, что иногда нужен живой человек. И это нормально.

📞 8-800-2000-122 — Там реально помогают (бесплатно, анонимно)
💬 psyhelp.online — Чат с психологом

Круто, что ты знаешь, когда нужна помощь.
    `.trim(),
    safetyConcern: `
Я заметил кое-что, что меня беспокоит.

Твоя безопасность важна. Если тебе нужна поддержка:
📞 8-800-2000-122 (бесплатно, 24/7)

Хочешь рассказать подробнее, что происходит?
    `.trim(),
    repeatedDistress: `
Я заметил, что тебе было непросто в последнее время.

Мне кажется, тебе может быть полезно поговорить с профессионалом.

📞 8-800-2000-122 — Психологическая помощь

Забота о себе — это важно.
    `.trim(),
  },

  adult: {
    emergency: `
🚨 Я очень беспокоюсь о вас прямо сейчас.

Пожалуйста, позвоните по одному из этих номеров:
📞 8-800-2000-122 — Психологическая помощь (бесплатно, 24/7)
📞 112 — Экстренные службы

Ваша жизнь важна. Есть люди, которые хотят помочь.

Я остаюсь здесь с вами.
    `.trim(),
    crisis: `
💙 Я слышу вас, и мне важно, как вы себя чувствуете.

То, через что вы проходите, заслуживает профессиональной поддержки.

📞 8-800-2000-122 (бесплатно, 24/7)
💬 psyhelp.online

Специалист сможет помочь глубже, чем я.
    `.trim(),
    safetyConcern: `
Я заметил кое-что, что меня беспокоит.

Ваша безопасность важна. Если вам нужна поддержка:
📞 8-800-2000-122 (бесплатно, 24/7)

Хотите рассказать подробнее о том, что происходит?
    `.trim(),
    humanRequest: `
Я понимаю, что вам нужен живой человек.

Вот как можно получить помощь:
📞 8-800-2000-122 — Телефон доверия (24/7, бесплатно)
💬 psyhelp.online — Онлайн чат с психологом

Благодарю за честность о том, что вам нужно.
    `.trim(),
    repeatedDistress: `
Я заметил, что вам было непросто в последнее время.

Рекомендую поговорить с профессионалом, который сможет помочь глубже.

📞 8-800-2000-122 — Психологическая помощь

Забота о себе — это важно и правильно.
    `.trim(),
    aiUncertainty: `
Честно говоря, я не уверен, как лучше помочь в этой ситуации.

Я AI-помощник, и некоторые вещи требуют человеческого понимания.

Рекомендую обратиться к специалисту:
📞 8-800-2000-122 (бесплатно)
    `.trim(),
    clinicalComplexity: `
То, что вы описываете, требует профессиональной оценки.

Я AI и не могу заменить психолога или врача.

📞 8-800-2000-122 — Консультация психолога
    `.trim(),
    minorProtection: `
Забота о безопасности детей — приоритет.

Если вы беспокоитесь о ребёнке:
📞 8-800-2000-122 — Детский телефон доверия (24/7)

Специалисты помогут разобраться в ситуации.
    `.trim(),
    general: `
Мне кажется, вам может быть полезно поговорить с живым человеком.

📞 8-800-2000-122 — Телефон доверия (бесплатно, 24/7)

Я остаюсь здесь, если нужна дополнительная поддержка.
    `.trim(),
  },
};

// ============================================================================
// HUMAN ESCALATION SERVICE
// ============================================================================

/**
 * Human Escalation Service
 *
 * Manages escalation from AI to human support with 2025 HITL patterns
 */
export class HumanEscalationService implements IHumanEscalationService {
  // In-memory storage (should be database in production)
  private escalations: Map<string, IHumanEscalationRequest> = new Map();
  private userEscalationHistory: Map<number, IHumanEscalationRequest[]> = new Map();

  // ==========================================================================
  // ESCALATION DECISION
  // ==========================================================================

  /**
   * Determine if escalation is needed
   */
  shouldEscalate(context: ISafetyContext): IEscalationDecision {
    const triggers: string[] = [];
    let maxUrgency: EscalationUrgency = 'routine';
    let primaryReason: EscalationReason | undefined;

    // 1. Check risk level threshold
    const riskThreshold = ESCALATION_THRESHOLDS.risk[context.currentRiskLevel];
    if (riskThreshold.shouldEscalate) {
      triggers.push(`risk_level_${context.currentRiskLevel}`);
      primaryReason = 'crisis_detected';
      maxUrgency = this.compareUrgency(maxUrgency, riskThreshold.urgency);
    }

    // 2. Check for emergency keywords
    const inputLower = context.inputText.toLowerCase();
    for (const keyword of ESCALATION_KEYWORDS.emergency) {
      if (inputLower.includes(keyword.toLowerCase())) {
        triggers.push('emergency_keyword');
        primaryReason = 'crisis_detected';
        maxUrgency = 'emergency';
        break;
      }
    }

    // 3. Check for urgent keywords
    if (maxUrgency !== 'emergency') {
      for (const keyword of ESCALATION_KEYWORDS.urgent) {
        if (inputLower.includes(keyword.toLowerCase())) {
          triggers.push('urgent_keyword');
          primaryReason = primaryReason || 'safety_concern';
          maxUrgency = this.compareUrgency(maxUrgency, 'urgent');
          break;
        }
      }
    }

    // 4. Check for human request
    for (const keyword of ESCALATION_KEYWORDS.humanRequest) {
      if (inputLower.includes(keyword.toLowerCase())) {
        triggers.push('human_request');
        primaryReason = primaryReason || 'user_request';
        maxUrgency = this.compareUrgency(maxUrgency, 'priority');
        break;
      }
    }

    // 5. Minor protection - always escalate crisis for minors
    if (ESCALATION_THRESHOLDS.minorCrisisEscalation &&
        context.isMinor &&
        (context.currentRiskLevel === 'high' || context.currentRiskLevel === 'critical')) {
      triggers.push('minor_crisis');
      primaryReason = primaryReason || 'minor_protection';
      maxUrgency = this.compareUrgency(maxUrgency, 'urgent');
    }

    // 6. Check repeated distress
    const recentDistress = this.countRecentDistress(context.userId);
    if (recentDistress >= ESCALATION_THRESHOLDS.repeatedDistressCount) {
      triggers.push('repeated_distress');
      primaryReason = primaryReason || 'repeated_distress';
      maxUrgency = this.compareUrgency(maxUrgency, 'priority');
    }

    // 7. Check emotional complexity (2025)
    if (context.emotionalState) {
      const complexity = this.calculateEmotionalComplexity(context.emotionalState);
      if (complexity > ESCALATION_THRESHOLDS.emotionalComplexityThreshold) {
        triggers.push('emotional_complexity');
        primaryReason = primaryReason || 'clinical_complexity';
      }
    }

    // 8. Check regulatory keywords (2025)
    if (ESCALATION_THRESHOLDS.regulatoryKeywordTrigger) {
      for (const keyword of ESCALATION_KEYWORDS.regulatory) {
        if (inputLower.includes(keyword.toLowerCase())) {
          triggers.push('regulatory_keyword');
          primaryReason = primaryReason || 'regulatory_requirement';
          break;
        }
      }
    }

    // Calculate confidence
    const confidence = triggers.length > 0
      ? Math.min(0.98, 0.6 + (triggers.length * 0.1))
      : 0.2;

    // Determine if human response is required
    const humanResponseRequired = maxUrgency === 'emergency' || maxUrgency === 'urgent';

    // Calculate max wait time
    const maxWaitTime = this.getMaxWaitTime(maxUrgency);

    return {
      shouldEscalate: triggers.length > 0,
      reason: primaryReason,
      urgency: maxUrgency,
      confidence,
      triggers,
      humanResponseRequired,
      maxWaitTime,
      fallbackAction: this.getFallbackAction(maxUrgency),
    };
  }

  // ==========================================================================
  // ESCALATION CREATION
  // ==========================================================================

  /**
   * Create new escalation request
   */
  createEscalation(
    request: Omit<IHumanEscalationRequest, 'id' | 'status' | 'createdAt'>
  ): IHumanEscalationRequest {
    const escalation: IHumanEscalationRequest = {
      ...request,
      id: generateSafetyId('ESC'),
      status: 'pending',
      createdAt: new Date(),
      priorityScore: this.calculatePriorityScore(request.urgency, request.reason),
      autoResponseSent: false,
    };

    // Store escalation
    this.escalations.set(escalation.id, escalation);

    // Add to user history
    const userHistory = this.userEscalationHistory.get(request.userId) || [];
    userHistory.push(escalation);
    this.userEscalationHistory.set(request.userId, userHistory);

    return escalation;
  }

  /**
   * Create escalation from context
   */
  createEscalationFromContext(
    context: ISafetyContext,
    conversationHistory: IConversationMessage[],
    aiAssessment: IHumanEscalationRequest['aiAssessment']
  ): IHumanEscalationRequest {
    const decision = this.shouldEscalate(context);

    return this.createEscalation({
      userId: context.userId,
      sessionId: context.sessionId,
      reason: decision.reason || 'safety_concern',
      urgency: decision.urgency || 'routine',
      triggerMessage: context.inputText,
      conversationHistory,
      safetyContext: context,
      aiAssessment,
      priorityScore: 0,
    });
  }

  // ==========================================================================
  // ESCALATION MANAGEMENT
  // ==========================================================================

  /**
   * Update escalation status
   */
  updateStatus(
    escalationId: string,
    status: EscalationStatus,
    resolution?: string,
    assignedTo?: string
  ): IHumanEscalationRequest | null {
    const escalation = this.escalations.get(escalationId);
    if (!escalation) return null;

    escalation.status = status;

    if (assignedTo) {
      escalation.assignedTo = assignedTo;
    }

    if (status === 'resolved' && resolution) {
      escalation.resolution = resolution;
      escalation.resolvedAt = new Date();
    }

    this.escalations.set(escalationId, escalation);
    return escalation;
  }

  /**
   * Get escalation by ID
   */
  getEscalation(id: string): IHumanEscalationRequest | null {
    return this.escalations.get(id) || null;
  }

  /**
   * Get all pending escalations
   */
  getPendingEscalations(): IHumanEscalationRequest[] {
    return Array.from(this.escalations.values())
      .filter(e => e.status === 'pending' || e.status === 'assigned')
      .sort((a, b) => {
        // Sort by priority score (higher first)
        const priorityDiff = b.priorityScore - a.priorityScore;
        if (priorityDiff !== 0) return priorityDiff;

        // Then by creation time (older first)
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
  }

  /**
   * Get user escalation history
   */
  getUserEscalations(userId: number): IHumanEscalationRequest[] {
    return this.userEscalationHistory.get(userId) || [];
  }

  // ==========================================================================
  // RESPONSE GENERATION
  // ==========================================================================

  /**
   * Generate appropriate response for escalation scenario
   */
  generateEscalationResponse(
    reason: EscalationReason,
    urgency: EscalationUrgency,
    ageGroup: 'child' | 'teen' | 'adult'
  ): string {
    const templates = ESCALATION_RESPONSE_TEMPLATES[ageGroup];

    if (urgency === 'emergency') {
      return templates.emergency;
    }

    switch (reason) {
      case 'crisis_detected':
        return templates.crisis;
      case 'safety_concern':
        return (templates as any).safetyConcern || templates.crisis;
      case 'user_request':
        return templates.humanRequest;
      case 'minor_protection':
        return templates.minorProtection;
      case 'repeated_distress':
        return (templates as any).repeatedDistress || templates.crisis;
      case 'ai_uncertainty':
        return (templates as any).aiUncertainty || (templates as any).general || templates.crisis;
      case 'clinical_complexity':
        return (templates as any).clinicalComplexity || (templates as any).general || templates.crisis;
      case 'ethical_circuit_breaker':
        return (templates as any).general || templates.crisis;
      case 'confidence_below_threshold':
        return (templates as any).aiUncertainty || (templates as any).general || templates.crisis;
      case 'regulatory_requirement':
        return (templates as any).general || templates.crisis;
      case 'vulnerability_detected':
        return templates.crisis;
      default:
        return (templates as any).general || templates.crisis;
    }
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  /**
   * Compare urgency levels
   */
  private compareUrgency(
    current: EscalationUrgency,
    candidate: EscalationUrgency
  ): EscalationUrgency {
    const order: EscalationUrgency[] = ['routine', 'priority', 'urgent', 'emergency'];
    return order.indexOf(candidate) > order.indexOf(current) ? candidate : current;
  }

  /**
   * Count recent distress indicators for user
   */
  private countRecentDistress(userId: number): number {
    const history = this.userEscalationHistory.get(userId) || [];
    const windowStart = Date.now() - ESCALATION_THRESHOLDS.repeatedDistressWindow;

    return history.filter(e =>
      e.createdAt.getTime() > windowStart &&
      (e.reason === 'crisis_detected' || e.reason === 'safety_concern')
    ).length;
  }

  /**
   * Calculate emotional complexity score
   */
  private calculateEmotionalComplexity(emotionalState: ISafetyContext['emotionalState']): number {
    if (!emotionalState) return 0;

    let complexity = 0;

    // High intensity emotions
    if (emotionalState.intensity > 0.8) complexity += 0.3;

    // Extreme valence
    if (Math.abs(emotionalState.valence) > 0.7) complexity += 0.2;

    // High arousal
    if (emotionalState.arousal > 0.8) complexity += 0.2;

    // Volatile trend
    if (emotionalState.emotionalTrend === 'volatile') complexity += 0.3;

    // Declining trend with high intensity
    if (emotionalState.emotionalTrend === 'declining' && emotionalState.intensity > 0.6) {
      complexity += 0.2;
    }

    // PHQ-9 or anxiety indicators
    if (emotionalState.phq9Score && emotionalState.phq9Score >= 10) complexity += 0.2;
    if (emotionalState.anxietyLevel && emotionalState.anxietyLevel > 0.7) complexity += 0.1;

    return Math.min(1, complexity);
  }

  /**
   * Calculate priority score for queue ordering
   */
  private calculatePriorityScore(urgency: EscalationUrgency, reason: EscalationReason): number {
    const urgencyScores: Record<EscalationUrgency, number> = {
      emergency: 100,
      urgent: 75,
      priority: 50,
      routine: 25,
    };

    const reasonScores: Record<EscalationReason, number> = {
      crisis_detected: 20,
      safety_concern: 15,
      minor_protection: 18,
      vulnerability_detected: 12,
      user_request: 10,
      repeated_distress: 8,
      ai_uncertainty: 5,
      clinical_complexity: 5,
      ethical_circuit_breaker: 15,
      confidence_below_threshold: 5,
      regulatory_requirement: 10,
    };

    return urgencyScores[urgency] + (reasonScores[reason] || 0);
  }

  /**
   * Get max wait time for urgency level
   */
  private getMaxWaitTime(urgency: EscalationUrgency): number {
    const waitTimes: Record<EscalationUrgency, number> = {
      emergency: 5,    // 5 minutes
      urgent: 30,      // 30 minutes
      priority: 120,   // 2 hours
      routine: 480,    // 8 hours
    };
    return waitTimes[urgency];
  }

  /**
   * Get fallback action for urgency level
   */
  private getFallbackAction(urgency: EscalationUrgency): string {
    const fallbacks: Record<EscalationUrgency, string> = {
      emergency: 'Show crisis hotline immediately, continue monitoring',
      urgent: 'Provide crisis resources, offer coping techniques',
      priority: 'Send supportive message, schedule follow-up',
      routine: 'Continue conversation with enhanced monitoring',
    };
    return fallbacks[urgency];
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get escalation statistics
   */
  getStatistics(): {
    total: number;
    byStatus: Record<EscalationStatus, number>;
    byUrgency: Record<string, number>;
    byReason: Record<string, number>;
    avgResolutionTime: number;
  } {
    const all = Array.from(this.escalations.values());

    const byStatus: Record<EscalationStatus, number> = {
      pending: 0,
      assigned: 0,
      in_progress: 0,
      resolved: 0,
      escalated_further: 0,
      auto_resolved: 0,
      timed_out: 0,
      cancelled: 0,
    };

    const byUrgency: Record<string, number> = {};
    const byReason: Record<string, number> = {};
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const e of all) {
      byStatus[e.status]++;
      byUrgency[e.urgency] = (byUrgency[e.urgency] || 0) + 1;
      byReason[e.reason] = (byReason[e.reason] || 0) + 1;

      if (e.resolvedAt) {
        totalResolutionTime += e.resolvedAt.getTime() - e.createdAt.getTime();
        resolvedCount++;
      }
    }

    return {
      total: all.length,
      byStatus,
      byUrgency,
      byReason,
      avgResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const humanEscalationService = new HumanEscalationService();
