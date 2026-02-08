/**
 * Test Profile Loader Utility
 *
 * Loads semi-synthetic insomnia profiles for testing CBT-I system.
 *
 * @example
 * ```typescript
 * import { loadTestProfile, ProfileType } from './load-test-profiles';
 *
 * const severeData = await loadTestProfile('severe');
 * console.log(severeData.survey[0].ISI_1);  // 22-28
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export type ProfileType =
  | 'mild_soi'
  | 'moderate_soi'
  | 'mild_smi'
  | 'moderate_smi'
  | 'mixed'
  | 'severe'
  | 'treatment_response'
  | 'remission';

export interface SurveyRecord {
  deviceId: string;
  sex: number;
  age: number;
  marriage: number;
  occupation: number;
  smartwatch: number;
  regular: number;
  exercise: number;
  coffee: number;
  smoking: number;
  drinking: number;
  height: number;
  weight: number;
  ISI_1: number;
  PHQ9_1: number;
  GAD7_1: number;
  MEQ: number;
  ISI_2: number;
  PHQ9_2: number;
  GAD7_2: number;
  ISI_F: number;
  PHQ9_F: number;
  GAD7_F: number;
}

export interface DiaryRecord {
  userId: string;
  date: string;
  go2bed: string;
  asleep: string;
  wakeup: string;
  'wakeup@night': number;
  waso: number;
  sleep_duration: number;
  in_bed_duration: number;
  sleep_latency: number;
  sleep_efficiency: number;
}

export interface HRVRecord {
  deviceId: string;
  ts_start: number;
  ts_end: number;
  missingness_score: number;
  HR: number;
  ibi: number;
  sdnn: number;
  sdsd: number;
  rmssd: number;
  pnn20: number;
  pnn50: number;
  lf: number;
  hf: number;
  'lf/hf': number;
}

export interface ProfileMetadata {
  profile: string;
  name: string;
  description: string;
  generated: string;
  source: string;
  transformations: {
    isiRange: [number, number];
    seTarget: [number, number];
    solMultiplier: [number, number];
    wasoMultiplier: [number, number];
    rmssdMultiplier: [number, number];
    sdnnMultiplier: [number, number];
    lfHfMultiplier: [number, number];
  };
  scientificBasis: string[];
  statistics: {
    participantCount: number;
    diaryEntries: number;
    hrvSegments: number;
    avgISI: number;
    avgSE: number;
    avgRMSSD: number;
  };
}

export interface TestProfileData {
  profile: ProfileType;
  metadata: ProfileMetadata;
  survey: SurveyRecord[];
  diary: DiaryRecord[];
  hrv: HRVRecord[];
}

// ============================================================================
// LOADER
// ============================================================================

const DEFAULT_BASE_PATH = 'data/datasets/semi-synthetic';

function parseCSV<T>(content: string): T[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).filter(line => line.trim()).map(line => {
    const values = line.split(',');
    const obj: Record<string, string | number> = {};
    headers.forEach((header, i) => {
      const key = header.trim();
      const val = values[i]?.trim() || '';

      // Try to parse as number
      const numVal = parseFloat(val);
      obj[key] = isNaN(numVal) ? val : numVal;
    });
    return obj as T;
  });
}

/**
 * Load a semi-synthetic insomnia profile
 *
 * @param profileType - Profile type to load
 * @param basePath - Base path to semi-synthetic data (default: data/datasets/semi-synthetic)
 * @returns Profile data with survey, diary, and HRV records
 */
export async function loadTestProfile(
  profileType: ProfileType,
  basePath: string = DEFAULT_BASE_PATH
): Promise<TestProfileData> {
  const profileDir = path.join(basePath, profileType);

  // Read metadata
  const metadataPath = path.join(profileDir, 'metadata.json');
  const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
  const metadata: ProfileMetadata = JSON.parse(metadataContent);

  // Read survey data
  const surveyPath = path.join(profileDir, 'survey.csv');
  const surveyContent = fs.readFileSync(surveyPath, 'utf-8');
  const survey = parseCSV<SurveyRecord>(surveyContent);

  // Read diary data
  const diaryPath = path.join(profileDir, 'sleep_diary.csv');
  const diaryContent = fs.readFileSync(diaryPath, 'utf-8');
  const diary = parseCSV<DiaryRecord>(diaryContent);

  // Read HRV data
  const hrvPath = path.join(profileDir, 'sensor_hrv_filtered.csv');
  const hrvContent = fs.readFileSync(hrvPath, 'utf-8');
  const hrv = parseCSV<HRVRecord>(hrvContent);

  return {
    profile: profileType,
    metadata,
    survey,
    diary,
    hrv,
  };
}

/**
 * Load all available profiles
 */
export async function loadAllProfiles(
  basePath: string = DEFAULT_BASE_PATH
): Promise<Map<ProfileType, TestProfileData>> {
  const profiles: ProfileType[] = [
    'mild_soi',
    'moderate_soi',
    'mild_smi',
    'moderate_smi',
    'mixed',
    'severe',
    'treatment_response',
    'remission',
  ];

  const result = new Map<ProfileType, TestProfileData>();

  for (const profileType of profiles) {
    try {
      const data = await loadTestProfile(profileType, basePath);
      result.set(profileType, data);
    } catch (error) {
      console.warn(`Failed to load profile ${profileType}:`, error);
    }
  }

  return result;
}

/**
 * Get diary entries for a specific participant
 */
export function getDiaryForParticipant(
  data: TestProfileData,
  participantId: string
): DiaryRecord[] {
  return data.diary.filter(d => d.userId === participantId);
}

/**
 * Get HRV records for a specific participant
 */
export function getHRVForParticipant(
  data: TestProfileData,
  participantId: string
): HRVRecord[] {
  return data.hrv.filter(h => h.deviceId === participantId);
}

/**
 * Get survey record for a specific participant
 */
export function getSurveyForParticipant(
  data: TestProfileData,
  participantId: string
): SurveyRecord | undefined {
  return data.survey.find(s => s.deviceId === participantId);
}

/**
 * Calculate average sleep efficiency for a participant
 */
export function calculateAverageSE(diaryRecords: DiaryRecord[]): number {
  if (diaryRecords.length === 0) return 0;
  const sum = diaryRecords.reduce((acc, r) => acc + r.sleep_efficiency, 0);
  return sum / diaryRecords.length;
}

/**
 * Calculate average SOL for a participant (in hours)
 */
export function calculateAverageSOL(diaryRecords: DiaryRecord[]): number {
  if (diaryRecords.length === 0) return 0;
  const sum = diaryRecords.reduce((acc, r) => acc + r.sleep_latency, 0);
  return sum / diaryRecords.length;
}

/**
 * Calculate average RMSSD for a participant
 */
export function calculateAverageRMSSD(hrvRecords: HRVRecord[]): number {
  if (hrvRecords.length === 0) return 0;
  const sum = hrvRecords.reduce((acc, r) => acc + r.rmssd, 0);
  return sum / hrvRecords.length;
}

// ============================================================================
// CLI
// ============================================================================

if (require.main === module) {
  // Demo usage
  (async () => {
    console.log('Loading test profiles...\n');

    const profiles = await loadAllProfiles();

    for (const [type, data] of profiles) {
      console.log(`Profile: ${data.metadata.name}`);
      console.log(`  Description: ${data.metadata.description}`);
      console.log(`  Participants: ${data.survey.length}`);
      console.log(`  Avg ISI: ${data.metadata.statistics.avgISI}`);
      console.log(`  Avg SE: ${(data.metadata.statistics.avgSE * 100).toFixed(1)}%`);
      console.log(`  Avg RMSSD: ${data.metadata.statistics.avgRMSSD}ms`);
      console.log('');
    }
  })();
}
