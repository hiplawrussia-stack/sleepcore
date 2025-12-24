/**
 * Breathing Patterns Configuration
 * =================================
 * Evidence-based breathing techniques with timing and metadata.
 *
 * Scientific backing:
 * - 4-7-8: Dr. Andrew Weil, parasympathetic activation
 * - Box: Navy SEALs stress management
 * - Coherent: HeartMath HRV optimization
 */

export interface BreathingPattern {
  id: string;
  name: string;
  nameRu: string;
  icon: string;
  description: string;
  descriptionRu: string;
  benefit: string;
  benefitRu: string;
  inhale: number;    // seconds
  hold: number;      // seconds (0 if no hold)
  exhale: number;    // seconds
  hold2?: number;    // seconds (for box breathing)
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'sleep' | 'stress' | 'focus' | 'energy';
  isPremium: boolean;
}

export const BREATHING_PATTERNS: BreathingPattern[] = [
  {
    id: '478',
    name: '4-7-8 Relaxing',
    nameRu: '4-7-8 Релакс',
    icon: '🌙',
    description: 'Dr. Weil\'s technique for falling asleep',
    descriptionRu: 'Техника доктора Вейла для засыпания',
    benefit: 'Activates parasympathetic nervous system, helps fall asleep',
    benefitRu: 'Активирует парасимпатическую нервную систему, помогает заснуть',
    inhale: 4,
    hold: 7,
    exhale: 8,
    difficulty: 'intermediate',
    category: 'sleep',
    isPremium: false,
  },
  {
    id: 'box',
    name: 'Box Breathing',
    nameRu: 'Квадратное дыхание',
    icon: '⬜',
    description: 'Navy SEALs focus technique',
    descriptionRu: 'Техника Navy SEALs для фокусировки',
    benefit: 'Reduces stress and improves concentration',
    benefitRu: 'Снижает стресс и улучшает концентрацию',
    inhale: 4,
    hold: 4,
    exhale: 4,
    hold2: 4,
    difficulty: 'intermediate',
    category: 'focus',
    isPremium: false,
  },
  {
    id: 'relaxing',
    name: 'Relaxing Breath',
    nameRu: 'Успокаивающее',
    icon: '🍃',
    description: 'Deep slow breathing for calm',
    descriptionRu: 'Глубокое медленное дыхание',
    benefit: 'Reduces anxiety and calms the mind',
    benefitRu: 'Снижает тревогу и успокаивает разум',
    inhale: 6,
    hold: 2,
    exhale: 8,
    difficulty: 'beginner',
    category: 'stress',
    isPremium: false,
  },
  {
    id: 'coherent',
    name: 'Coherent Breathing',
    nameRu: 'Когерентное',
    icon: '💚',
    description: '5.5 breaths/min for heart coherence',
    descriptionRu: '5.5 вдохов в минуту для сердечной когерентности',
    benefit: 'Optimizes heart rate variability (HRV)',
    benefitRu: 'Оптимизирует вариабельность сердечного ритма (HRV)',
    inhale: 5,
    hold: 0,
    exhale: 5,
    difficulty: 'beginner',
    category: 'stress',
    isPremium: false,
  },
  {
    id: 'energizing',
    name: 'Energizing Breath',
    nameRu: 'Бодрящее',
    icon: '⚡',
    description: 'Activating breath for alertness',
    descriptionRu: 'Активирующее дыхание для бодрости',
    benefit: 'Increases energy and alertness',
    benefitRu: 'Повышает энергию и бодрость',
    inhale: 4,
    hold: 0,
    exhale: 4,
    difficulty: 'beginner',
    category: 'energy',
    isPremium: false,
  },
  {
    id: 'sleep-prep',
    name: 'Sleep Preparation',
    nameRu: 'Подготовка ко сну',
    icon: '😴',
    description: 'Extended exhale for deep relaxation',
    descriptionRu: 'Удлинённый выдох для глубокого расслабления',
    benefit: 'Prepares body and mind for restful sleep',
    benefitRu: 'Готовит тело и разум к спокойному сну',
    inhale: 4,
    hold: 4,
    exhale: 10,
    difficulty: 'intermediate',
    category: 'sleep',
    isPremium: true,
  },
  {
    id: 'anxiety-relief',
    name: 'Anxiety Relief',
    nameRu: 'От тревоги',
    icon: '🧘',
    description: 'Calming breath for anxiety moments',
    descriptionRu: 'Успокаивающее дыхание при тревоге',
    benefit: 'Quick relief from anxiety symptoms',
    benefitRu: 'Быстрое облегчение симптомов тревоги',
    inhale: 4,
    hold: 7,
    exhale: 8,
    hold2: 2,
    difficulty: 'advanced',
    category: 'stress',
    isPremium: true,
  },
  {
    id: 'morning-boost',
    name: 'Morning Boost',
    nameRu: 'Утренний заряд',
    icon: '🌅',
    description: 'Invigorating breath to start the day',
    descriptionRu: 'Бодрящее дыхание для начала дня',
    benefit: 'Energizes and sharpens focus for the day',
    benefitRu: 'Заряжает энергией и повышает фокус на весь день',
    inhale: 3,
    hold: 3,
    exhale: 3,
    difficulty: 'beginner',
    category: 'energy',
    isPremium: true,
  },
];

/**
 * Get pattern by ID
 */
export const getPatternById = (id: string): BreathingPattern | undefined => {
  return BREATHING_PATTERNS.find(p => p.id === id);
};

/**
 * Get patterns by category
 */
export const getPatternsByCategory = (category: BreathingPattern['category']): BreathingPattern[] => {
  return BREATHING_PATTERNS.filter(p => p.category === category);
};

/**
 * Get free patterns only
 */
export const getFreePatterns = (): BreathingPattern[] => {
  return BREATHING_PATTERNS.filter(p => !p.isPremium);
};

/**
 * Calculate single cycle duration in seconds
 */
export const getPatternDuration = (pattern: BreathingPattern): number => {
  return pattern.inhale + pattern.hold + pattern.exhale + (pattern.hold2 || 0);
};

/**
 * Calculate total duration for N cycles
 */
export const getTotalDuration = (pattern: BreathingPattern, cycles: number): number => {
  return getPatternDuration(pattern) * cycles;
};

/**
 * Format duration in human-readable form
 */
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs} сек`;
  if (secs === 0) return `${mins} мин`;
  return `${mins} мин ${secs} сек`;
};

/**
 * Get recommended cycles for a pattern
 */
export const getRecommendedCycles = (pattern: BreathingPattern): number => {
  const cycleDuration = getPatternDuration(pattern);
  // Aim for 3-5 minute sessions
  if (cycleDuration >= 15) return 3;
  if (cycleDuration >= 10) return 5;
  return 7;
};

/**
 * Category labels in Russian
 */
export const CATEGORY_LABELS: Record<BreathingPattern['category'], string> = {
  sleep: 'Для сна',
  stress: 'От стресса',
  focus: 'Фокус',
  energy: 'Энергия',
};

/**
 * Category icons
 */
export const CATEGORY_ICONS: Record<BreathingPattern['category'], string> = {
  sleep: '🌙',
  stress: '🧘',
  focus: '🎯',
  energy: '⚡',
};
