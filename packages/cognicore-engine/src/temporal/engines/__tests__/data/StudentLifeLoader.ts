/**
 * 📊 STUDENTLIFE EMA DATA LOADER
 * ==============================
 * Loads and processes EMA data from StudentLife dataset format
 *
 * Dataset: StudentLife (Dartmouth College, 2013)
 * - 48 undergraduates over 10 weeks
 * - Multiple EMA types: mood, stress, sleep, social
 * - Pre/post surveys: PHQ-9, UCLA loneliness, PANAS, PSS
 *
 * Reference: Wang et al., UbiComp 2014
 * "StudentLife: Assessing Mental Health, Academic Performance
 * and Behavioral Trends of College Students using Smartphones"
 *
 * © БФ "Другой путь", 2025
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Raw EMA response from StudentLife format
 */
export interface StudentLifeEMAResponse {
  /** Unix timestamp (EST) */
  timestamp: number;
  /** Location when answered (may be null for privacy) */
  location?: {
    latitude: number;
    longitude: number;
  };
  /** Response values (indices into option arrays) */
  responses: Record<string, number>;
}

/**
 * Processed EMA observation for time series analysis
 */
export interface EMAObservation {
  /** Participant ID */
  participantId: string;
  /** Observation timestamp */
  timestamp: Date;
  /** Normalized values [0, 1] */
  values: number[];
  /** Dimension labels */
  dimensions: string[];
  /** Original raw values (for reference) */
  rawValues: Record<string, number>;
}

/**
 * Participant time series
 */
export interface ParticipantTimeSeries {
  participantId: string;
  observations: EMAObservation[];
  /** Pre-survey scores */
  preSurvey?: {
    phq9?: number;
    pss?: number;
    panas_positive?: number;
    panas_negative?: number;
    loneliness?: number;
  };
  /** Post-survey scores */
  postSurvey?: {
    phq9?: number;
    pss?: number;
    panas_positive?: number;
    panas_negative?: number;
    loneliness?: number;
  };
}

/**
 * Complete dataset
 */
export interface StudentLifeDataset {
  participants: ParticipantTimeSeries[];
  metadata: {
    source: 'studentlife' | 'synthetic';
    totalParticipants: number;
    totalObservations: number;
    dateRange: {
      start: Date;
      end: Date;
    };
    dimensions: string[];
  };
}

/**
 * Loader configuration
 */
export interface StudentLifeLoaderConfig {
  /** Path to dataset root (null for synthetic) */
  dataPath: string | null;
  /** EMA types to load */
  emaTypes: ('mood' | 'stress' | 'sleep' | 'social')[];
  /** Minimum observations per participant */
  minObservations: number;
  /** Normalize values to [0, 1] */
  normalize: boolean;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_LOADER_CONFIG: StudentLifeLoaderConfig = {
  dataPath: null, // Use synthetic data
  emaTypes: ['mood', 'stress'],
  minObservations: 20,
  normalize: true,
};

// ============================================================================
// STUDENTLIFE SCALE DEFINITIONS
// ============================================================================

/**
 * EMA scale definitions based on StudentLife documentation
 */
const EMA_SCALES = {
  // PAM-based affect (1-16 scale in original, normalize to 0-1)
  mood: {
    name: 'Photographic Affect Meter',
    min: 1,
    max: 16,
    // 4x4 grid: valence (horizontal) x arousal (vertical)
    dimensions: ['valence', 'arousal'],
    mapToVA: (pamValue: number): [number, number] => {
      // PAM is 1-16, maps to 4x4 grid
      // Row = arousal (1-4), Col = valence (1-4)
      const row = Math.floor((pamValue - 1) / 4) + 1;
      const col = ((pamValue - 1) % 4) + 1;
      const valence = (col - 1) / 3; // 0-1
      const arousal = (row - 1) / 3; // 0-1
      return [valence, arousal];
    },
  },

  // Stress level (1-5 Likert)
  stress: {
    name: 'Perceived Stress',
    min: 1,
    max: 5,
    // 1 = not stressed, 5 = very stressed
    normalize: (value: number): number => (value - 1) / 4,
  },

  // Sleep quality (1-5 Likert)
  sleep: {
    name: 'Sleep Quality',
    min: 1,
    max: 5,
    // 1 = poor, 5 = excellent
    normalize: (value: number): number => (value - 1) / 4,
  },

  // Social interaction (0-5 scale)
  social: {
    name: 'Social Activity',
    min: 0,
    max: 5,
    normalize: (value: number): number => value / 5,
  },
};

// PHQ-9 scale (0-27, cutoffs: 0-4 minimal, 5-9 mild, 10-14 moderate, 15-19 mod-severe, 20-27 severe)
const PHQ9_SCALE = {
  min: 0,
  max: 27,
  normalize: (value: number): number => value / 27,
  severity: (value: number): string => {
    if (value <= 4) return 'minimal';
    if (value <= 9) return 'mild';
    if (value <= 14) return 'moderate';
    if (value <= 19) return 'moderately_severe';
    return 'severe';
  },
};

// ============================================================================
// SYNTHETIC DATA GENERATOR (StudentLife-like patterns)
// ============================================================================

/**
 * Generates synthetic EMA data mimicking StudentLife patterns
 * Based on observed patterns in literature:
 * - Circadian rhythms in mood
 * - Day-of-week effects (weekday vs weekend)
 * - Academic stress cycles (midterms, finals)
 * - Individual differences in baseline and variability
 */
export function generateSyntheticStudentLifeData(
  config: {
    numParticipants: number;
    durationWeeks: number;
    promptsPerDay: number;
    seed?: number;
  }
): StudentLifeDataset {
  const { numParticipants, durationWeeks, promptsPerDay, seed = 42 } = config;

  // Seeded random number generator
  let rngState = seed;
  const random = (): number => {
    rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
    return rngState / 0x7fffffff;
  };

  const normalRandom = (): number => {
    // Box-Muller transform for normal distribution
    // Use clamp to ensure u1 is in (0, 1) exclusive to avoid log(0) or sqrt(negative)
    const u1 = Math.max(0.0001, Math.min(0.9999, random()));
    const u2 = random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const participants: ParticipantTimeSeries[] = [];
  const startDate = new Date('2025-01-13T08:00:00'); // Monday
  const durationDays = durationWeeks * 7;

  // Academic calendar events (stress multipliers)
  const academicEvents: { dayOffset: number; stressMultiplier: number }[] = [
    { dayOffset: 14, stressMultiplier: 1.3 }, // Week 2: First assignments
    { dayOffset: 35, stressMultiplier: 1.5 }, // Week 5: Midterms
    { dayOffset: 56, stressMultiplier: 1.4 }, // Week 8: Projects due
    { dayOffset: 63, stressMultiplier: 1.6 }, // Week 9-10: Finals
  ];

  for (let p = 0; p < numParticipants; p++) {
    const participantId = `u${String(p + 1).padStart(2, '0')}`;

    // Individual parameters (between-person variation)
    const baselineMood = 0.5 + normalRandom() * 0.15;
    const baselineStress = 0.3 + normalRandom() * 0.1;
    const moodVolatility = 0.1 + random() * 0.1;
    const stressReactivity = 0.5 + random() * 0.5;
    const circadianAmplitude = 0.1 + random() * 0.1;
    const weekendEffect = 0.1 + random() * 0.1;

    // Pre-survey PHQ-9 (correlated with baseline mood)
    const prePHQ9 = Math.max(0, Math.min(27,
      Math.round((1 - baselineMood) * 20 + normalRandom() * 5)
    ));

    // Autoregression parameter
    const ar = 0.6 + random() * 0.2;

    let prevMood = baselineMood;
    let prevStress = baselineStress;

    const observations: EMAObservation[] = [];

    for (let d = 0; d < durationDays; d++) {
      // Day of week (0 = Sunday, 6 = Saturday)
      const dayOfWeek = (startDate.getDay() + d) % 7;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Academic stress effect
      let academicStress = 0;
      for (const event of academicEvents) {
        const distance = Math.abs(d - event.dayOffset);
        if (distance < 7) {
          academicStress = Math.max(academicStress,
            (event.stressMultiplier - 1) * Math.exp(-distance / 3)
          );
        }
      }

      // Response rate simulation (not all prompts answered)
      const baseResponseRate = 0.7 + random() * 0.2;

      for (let t = 0; t < promptsPerDay; t++) {
        // Skip some observations (realistic missing data)
        if (random() > baseResponseRate) continue;

        const hourOfDay = 9 + (t * 12 / promptsPerDay); // 9am to 9pm
        const timestamp = new Date(startDate.getTime() + (d * 24 + hourOfDay) * 3600000);

        // Circadian effect on mood
        const circadian = circadianAmplitude * Math.sin(
          2 * Math.PI * (hourOfDay - 14) / 24 // Peak around 2pm
        );

        // Weekend boost to mood
        const weekendBoost = isWeekend ? weekendEffect : 0;

        // Mood dynamics (AR(1) with circadian and events)
        let mood = baselineMood +
          ar * (prevMood - baselineMood) +
          circadian +
          weekendBoost -
          academicStress * 0.1 +
          normalRandom() * moodVolatility;

        // Stress dynamics
        let stress = baselineStress +
          ar * (prevStress - baselineStress) +
          academicStress * stressReactivity -
          weekendBoost * 0.5 +
          normalRandom() * moodVolatility;

        // Clamp to [0, 1]
        mood = Math.max(0, Math.min(1, mood));
        stress = Math.max(0, Math.min(1, stress));

        // Derive arousal (higher stress = higher arousal, mood affects it too)
        const arousal = Math.max(0, Math.min(1,
          0.5 + stress * 0.3 - (mood - 0.5) * 0.2 + normalRandom() * 0.1
        ));

        observations.push({
          participantId,
          timestamp,
          values: [mood, arousal, stress],
          dimensions: ['valence', 'arousal', 'stress'],
          rawValues: {
            mood_pam: Math.round(mood * 15 + 1), // 1-16 PAM scale
            stress: Math.round(stress * 4 + 1), // 1-5 Likert
          },
        });

        prevMood = mood;
        prevStress = stress;
      }
    }

    // Post-survey PHQ-9 (influenced by trajectory)
    const avgMood = observations.reduce((s, o) => s + o.values[0]!, 0) / observations.length;
    const postPHQ9 = Math.max(0, Math.min(27,
      Math.round((1 - avgMood) * 20 + normalRandom() * 5)
    ));

    participants.push({
      participantId,
      observations,
      preSurvey: { phq9: prePHQ9 },
      postSurvey: { phq9: postPHQ9 },
    });
  }

  // Calculate metadata
  const allObs = participants.flatMap(p => p.observations);
  const timestamps = allObs.map(o => o.timestamp.getTime());

  return {
    participants,
    metadata: {
      source: 'synthetic',
      totalParticipants: participants.length,
      totalObservations: allObs.length,
      dateRange: {
        start: new Date(Math.min(...timestamps)),
        end: new Date(Math.max(...timestamps)),
      },
      dimensions: ['valence', 'arousal', 'stress'],
    },
  };
}

// ============================================================================
// DATA LOADER CLASS
// ============================================================================

/**
 * StudentLife EMA Data Loader
 */
export class StudentLifeLoader {
  private readonly config: StudentLifeLoaderConfig;

  constructor(config: Partial<StudentLifeLoaderConfig> = {}) {
    this.config = { ...DEFAULT_LOADER_CONFIG, ...config };
  }

  /**
   * Load dataset (real or synthetic)
   */
  async load(): Promise<StudentLifeDataset> {
    if (this.config.dataPath) {
      return this.loadRealData(this.config.dataPath);
    }

    // Generate synthetic data
    return generateSyntheticStudentLifeData({
      numParticipants: 48, // Same as original StudentLife
      durationWeeks: 10, // Same as original
      promptsPerDay: 5, // Approximate EMA frequency
      seed: 42,
    });
  }

  /**
   * Load real StudentLife data from disk
   */
  private async loadRealData(dataPath: string): Promise<StudentLifeDataset> {
    // This would be implemented when real data is available
    // For now, throw an informative error
    throw new Error(
      `Real data loading not yet implemented. ` +
      `To use StudentLife data:\n` +
      `1. Download from: https://studentlife.cs.dartmouth.edu/dataset.html\n` +
      `2. Extract to: ${dataPath}\n` +
      `3. Expected structure: ${dataPath}/EMA/response/Mood/, ${dataPath}/EMA/response/Stress/\n` +
      `Currently using synthetic data with StudentLife-like patterns.`
    );
  }

  /**
   * Convert dataset to benchmark format
   */
  toBenchmarkFormat(dataset: StudentLifeDataset): {
    sequences: number[][][];
    timestamps: Date[][];
    participantIds: string[];
  } {
    const sequences: number[][][] = [];
    const timestamps: Date[][] = [];
    const participantIds: string[] = [];

    for (const participant of dataset.participants) {
      if (participant.observations.length < this.config.minObservations) {
        continue; // Skip participants with too few observations
      }

      const seq: number[][] = [];
      const times: Date[] = [];

      for (const obs of participant.observations) {
        seq.push([...obs.values]);
        times.push(obs.timestamp);
      }

      sequences.push(seq);
      timestamps.push(times);
      participantIds.push(participant.participantId);
    }

    return { sequences, timestamps, participantIds };
  }

  /**
   * Get depression labels for classification tasks
   */
  getDepressionLabels(dataset: StudentLifeDataset): {
    participantId: string;
    prePHQ9: number;
    postPHQ9: number;
    preLabel: string;
    postLabel: string;
  }[] {
    return dataset.participants
      .filter(p => p.preSurvey?.phq9 !== undefined && p.postSurvey?.phq9 !== undefined)
      .map(p => ({
        participantId: p.participantId,
        prePHQ9: p.preSurvey!.phq9!,
        postPHQ9: p.postSurvey!.phq9!,
        preLabel: PHQ9_SCALE.severity(p.preSurvey!.phq9!),
        postLabel: PHQ9_SCALE.severity(p.postSurvey!.phq9!),
      }));
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create data loader with optional config
 */
export function createStudentLifeLoader(
  config?: Partial<StudentLifeLoaderConfig>
): StudentLifeLoader {
  return new StudentLifeLoader(config);
}

/**
 * Quick load synthetic StudentLife-like data
 */
export async function loadSyntheticStudentLife(): Promise<StudentLifeDataset> {
  const loader = createStudentLifeLoader({ dataPath: null });
  return loader.load();
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  EMA_SCALES,
  PHQ9_SCALE,
};
