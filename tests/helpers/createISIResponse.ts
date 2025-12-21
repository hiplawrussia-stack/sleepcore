/**
 * Test Helper: Create ISI Response
 * Factory function for generating IISIResponse test data
 */

import type { IISIResponse, ISIItemScore, ISISeverity } from '../../src/assessment/instruments/ISIRussian';

/**
 * Severity pattern for quick test data generation
 */
export type ISIPattern =
  | 'no_insomnia'      // Score 0-7
  | 'subthreshold'     // Score 8-14
  | 'moderate'         // Score 15-21
  | 'severe';          // Score 22-28

/**
 * Default ISI response (moderate insomnia)
 */
const DEFAULT_RESPONSE: IISIResponse = {
  userId: 'test-user',
  date: new Date().toISOString().split('T')[0],
  q1_fallingAsleep: 2,
  q2_stayingAsleep: 2,
  q3_earlyWaking: 2,
  q4_satisfaction: 3,
  q5_interference: 2,
  q6_noticeability: 2,
  q7_distress: 2,
};

/**
 * Pattern presets targeting specific severity ranges
 */
const PATTERN_PRESETS: Record<ISIPattern, Partial<IISIResponse>> = {
  no_insomnia: {
    q1_fallingAsleep: 0,
    q2_stayingAsleep: 1,
    q3_earlyWaking: 0,
    q4_satisfaction: 1,
    q5_interference: 1,
    q6_noticeability: 0,
    q7_distress: 1,
  },
  subthreshold: {
    q1_fallingAsleep: 1,
    q2_stayingAsleep: 2,
    q3_earlyWaking: 1,
    q4_satisfaction: 2,
    q5_interference: 2,
    q6_noticeability: 1,
    q7_distress: 2,
  },
  moderate: {
    q1_fallingAsleep: 3,
    q2_stayingAsleep: 2,
    q3_earlyWaking: 2,
    q4_satisfaction: 3,
    q5_interference: 3,
    q6_noticeability: 2,
    q7_distress: 3,
  },
  severe: {
    q1_fallingAsleep: 4,
    q2_stayingAsleep: 4,
    q3_earlyWaking: 3,
    q4_satisfaction: 4,
    q5_interference: 4,
    q6_noticeability: 3,
    q7_distress: 4,
  },
};

/**
 * Create ISI response with optional overrides
 */
export function createISIResponse(
  overrides?: Partial<IISIResponse>
): IISIResponse {
  return {
    ...DEFAULT_RESPONSE,
    ...overrides,
  };
}

/**
 * Create ISI response from severity pattern
 */
export function createISIResponseFromPattern(
  pattern: ISIPattern,
  overrides?: Partial<IISIResponse>
): IISIResponse {
  return {
    ...DEFAULT_RESPONSE,
    ...PATTERN_PRESETS[pattern],
    ...overrides,
  };
}

/**
 * Create ISI response with exact total score
 */
export function createISIResponseWithScore(
  targetScore: number,
  userId: string = 'test-user'
): IISIResponse {
  if (targetScore < 0 || targetScore > 28) {
    throw new Error('ISI score must be between 0 and 28');
  }

  // Distribute score evenly across items
  const itemCount = 7;
  const baseScore = Math.floor(targetScore / itemCount) as ISIItemScore;
  const remainder = targetScore % itemCount;

  const items: ISIItemScore[] = Array(itemCount).fill(baseScore);

  // Distribute remainder
  for (let i = 0; i < remainder; i++) {
    items[i] = Math.min(4, items[i] + 1) as ISIItemScore;
  }

  return {
    userId,
    date: new Date().toISOString().split('T')[0],
    q1_fallingAsleep: items[0],
    q2_stayingAsleep: items[1],
    q3_earlyWaking: items[2],
    q4_satisfaction: items[3],
    q5_interference: items[4],
    q6_noticeability: items[5],
    q7_distress: items[6],
  };
}

/**
 * Create series of ISI responses showing improvement
 */
export function createISIImprovementSeries(
  startPattern: ISIPattern,
  weeks: number = 8
): IISIResponse[] {
  const severityOrder: ISIPattern[] = ['severe', 'moderate', 'subthreshold', 'no_insomnia'];
  const startIndex = severityOrder.indexOf(startPattern);

  const responses: IISIResponse[] = [];

  for (let week = 0; week < weeks; week++) {
    // Gradual improvement over weeks
    const progressRatio = week / (weeks - 1);
    const targetIndex = Math.min(
      startIndex + Math.floor(progressRatio * (severityOrder.length - 1 - startIndex)),
      severityOrder.length - 1
    );

    const date = new Date();
    date.setDate(date.getDate() + week * 7);

    responses.push(createISIResponseFromPattern(severityOrder[targetIndex], {
      userId: 'test-user',
      date: date.toISOString().split('T')[0],
    }));
  }

  return responses;
}

/**
 * Calculate expected score from response
 */
export function calculateExpectedScore(response: IISIResponse): number {
  return (
    response.q1_fallingAsleep +
    response.q2_stayingAsleep +
    response.q3_earlyWaking +
    response.q4_satisfaction +
    response.q5_interference +
    response.q6_noticeability +
    response.q7_distress
  );
}

/**
 * Get expected severity from score
 */
export function getExpectedSeverity(score: number): ISISeverity {
  if (score <= 7) return 'no_insomnia';
  if (score <= 14) return 'subthreshold';
  if (score <= 21) return 'moderate';
  return 'severe';
}
