/**
 * Oura Ring API Types
 * ===================
 * Type definitions for Oura API v2 integration.
 *
 * @see https://cloud.ouraring.com/v2/docs
 * @packageDocumentation
 * @module api/integrations/oura
 */

/**
 * OAuth2 token response from Oura
 */
export interface OuraTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  scope?: string;
}

/**
 * Stored OAuth2 credentials
 */
export interface OuraCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string[];
}

/**
 * Oura API scopes
 * @see https://cloud.ouraring.com/docs/authentication
 */
export type OuraScope =
  | 'personal'
  | 'daily'
  | 'heartrate'
  | 'workout'
  | 'tag'
  | 'session'
  | 'sleep'
  | 'spo2';

/**
 * Required scopes for SleepCore integration
 */
export const SLEEPCORE_REQUIRED_SCOPES: OuraScope[] = [
  'sleep',
  'daily',
  'heartrate',
  'personal',
];

/**
 * Oura Sleep document
 * @see https://cloud.ouraring.com/v2/docs#tag/Sleep-Routes
 */
export interface OuraSleepDocument {
  id: string;
  average_breath: number | null;
  average_heart_rate: number | null;
  average_hrv: number | null;
  awake_time: number | null;
  bedtime_end: string;
  bedtime_start: string;
  day: string;
  deep_sleep_duration: number | null;
  efficiency: number | null;
  heart_rate: OuraTimeSeriesData | null;
  hrv: OuraHrvData | null;
  latency: number | null;
  light_sleep_duration: number | null;
  low_battery_alert: boolean;
  lowest_heart_rate: number | null;
  movement_30_sec: string | null;
  period: number;
  readiness: OuraReadinessData | null;
  readiness_score_delta: number | null;
  rem_sleep_duration: number | null;
  restless_periods: number | null;
  sleep_phase_5_min: string | null;
  sleep_score_delta: number | null;
  time_in_bed: number | null;
  total_sleep_duration: number | null;
  type: 'deleted' | 'sleep' | 'long_sleep' | 'late_nap' | 'rest';
}

/**
 * Oura time series data point
 */
export interface OuraTimeSeriesData {
  interval: number;
  items: (number | null)[];
  timestamp: string;
}

/**
 * Oura HRV data
 */
export interface OuraHrvData {
  interval: number;
  items: (number | null)[];
  timestamp: string;
}

/**
 * Oura readiness data
 */
export interface OuraReadinessData {
  contributors: {
    activity_balance: number | null;
    body_temperature: number | null;
    hrv_balance: number | null;
    previous_day_activity: number | null;
    previous_night: number | null;
    recovery_index: number | null;
    resting_heart_rate: number | null;
    sleep_balance: number | null;
  };
  score: number | null;
  temperature_deviation: number | null;
  temperature_trend_deviation: number | null;
}

/**
 * Oura Daily Sleep summary
 */
export interface OuraDailySleep {
  id: string;
  contributors: {
    deep_sleep: number | null;
    efficiency: number | null;
    latency: number | null;
    rem_sleep: number | null;
    restfulness: number | null;
    timing: number | null;
    total_sleep: number | null;
  };
  day: string;
  score: number | null;
  timestamp: string;
}

/**
 * Oura Heart Rate data point
 */
export interface OuraHeartRate {
  bpm: number;
  source: 'awake' | 'rest' | 'sleep' | 'session' | 'live' | 'workout';
  timestamp: string;
}

/**
 * Oura Personal Info
 */
export interface OuraPersonalInfo {
  id: string;
  age: number | null;
  weight: number | null;
  height: number | null;
  biological_sex: 'male' | 'female' | 'not_provided' | null;
  email: string | null;
}

/**
 * Oura API paginated response
 */
export interface OuraPaginatedResponse<T> {
  data: T[];
  next_token: string | null;
}

/**
 * Oura API error response
 */
export interface OuraApiError {
  detail: string;
  status?: number;
}

/**
 * Sync result for a single session
 */
export interface OuraSyncResult {
  sessionsProcessed: number;
  sessionsSkipped: number;
  errors: Array<{ sessionId: string; error: string }>;
  lastSyncedDate: string | null;
}

/**
 * Oura connection status
 */
export interface OuraConnectionStatus {
  connected: boolean;
  lastSyncAt: string | null;
  tokenExpiresAt: string | null;
  membershipActive: boolean | null;
  scopesGranted: string[];
}
