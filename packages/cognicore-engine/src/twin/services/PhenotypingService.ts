/**
 * Digital Phenotyping Service
 *
 * Phase 6.3: Passive Data Collection for Mental Health Digital Twins
 *
 * 2025 Research Integration:
 * - Multi-modal sensor fusion
 * - Privacy-preserving feature extraction
 * - Circadian rhythm analysis
 * - Social connectivity indicators
 * - Mental health risk scoring from behavioral markers
 *
 * Research basis:
 * - Systematic review: "Digital phenotyping in mental health" (112 papers, 2025)
 * - Nature: "Smartphone-based digital phenotyping for psychiatric disorders"
 * - JAMA Psychiatry: "Digital phenotyping and mobile sensing"
 *
 * © БФ "Другой путь", 2025
 */

import {
  IPhenotypingObservation,
  IPhenotypingProfile,
  IDigitalPhenotypingService,
  PhenotypingSource,
  generateTwinId,
} from '../interfaces/IDigitalTwin';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Reference values for mental health indicators
 * Based on 2025 digital phenotyping studies
 */
const REFERENCE_VALUES = {
  mobility: {
    normalDistance: 10,        // km/day
    healthyEntropy: 0.7,       // Location regularity
    normalHomeTime: 0.5,       // 50% at home
  },
  social: {
    normalCallFrequency: 3,    // calls/day
    normalMessageFrequency: 20, // messages/day
    healthyDiversity: 5,       // unique contacts/week
    normalResponseLatency: 30, // minutes
  },
  sleep: {
    optimalDuration: 7.5,      // hours
    optimalMidpoint: 3.5,      // 3:30 AM
    healthyRegularity: 0.8,    // consistency score
  },
  deviceUsage: {
    normalScreenTime: 4,       // hours/day
    normalPickups: 50,         // times/day
    healthyNightUsage: 0.1,    // <10% at night
  },
};

/**
 * Depression risk indicators (PHQ-9 proxy weights)
 */
const DEPRESSION_WEIGHTS = {
  sleepDisturbance: 0.15,
  lowEnergy: 0.15,
  socialWithdrawal: 0.15,
  reducedMobility: 0.12,
  irregularPatterns: 0.12,
  increasedScreenTime: 0.1,
  reducedCommunication: 0.12,
  nightUsage: 0.09,
};

/**
 * Anxiety risk indicators (GAD-7 proxy weights)
 */
const ANXIETY_WEIGHTS = {
  restlessPatterns: 0.2,
  excessiveChecking: 0.18,
  socialAvoidance: 0.15,
  sleepDisturbance: 0.15,
  irregularMovement: 0.12,
  rapidTyping: 0.1,
  frequentPickups: 0.1,
};

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

const observationStorage = new Map<number, IPhenotypingObservation[]>();
const profileStorage = new Map<number, IPhenotypingProfile>();

// ============================================================================
// DIGITAL PHENOTYPING SERVICE
// ============================================================================

/**
 * Digital Phenotyping Service
 *
 * Collects, processes, and interprets passive behavioral data
 * for mental health state estimation
 */
export class PhenotypingService implements IDigitalPhenotypingService {

  // ==========================================================================
  // DATA COLLECTION
  // ==========================================================================

  async collectObservation(
    userId: number,
    source: PhenotypingSource,
    rawValue: number | string | number[]
  ): Promise<IPhenotypingObservation> {
    const observation: IPhenotypingObservation = {
      id: generateTwinId('OBS'),
      userId,
      timestamp: new Date(),
      source,
      rawValue,
      unit: this.getUnitForSource(source),
      processedFeatures: new Map(),
      dataQuality: 1.0,
      missingness: 0,
      isImputed: false,
      isAnonymized: false,
      aggregationLevel: 'raw',
      contextTags: this.generateContextTags(),
    };

    // Extract features from raw value
    const features = this.extractFeaturesFromObservation(observation);
    observation.processedFeatures = features;

    // Store observation
    let userObs = observationStorage.get(userId) || [];
    userObs.push(observation);

    // Keep last 10000 observations
    if (userObs.length > 10000) {
      userObs = userObs.slice(-10000);
    }

    observationStorage.set(userId, userObs);

    return observation;
  }

  // ==========================================================================
  // PROFILE GENERATION
  // ==========================================================================

  async generateProfile(userId: number, periodDays: number): Promise<IPhenotypingProfile> {
    const observations = this.getObservationsForPeriod(userId, periodDays);

    // Group by source
    const bySource = new Map<PhenotypingSource, IPhenotypingObservation[]>();
    for (const obs of observations) {
      const existing = bySource.get(obs.source) || [];
      existing.push(obs);
      bySource.set(obs.source, existing);
    }

    // Calculate mobility metrics
    const mobility = this.calculateMobilityMetrics(bySource.get('gps_location') || [], bySource.get('accelerometer') || []);

    // Calculate social metrics
    const social = this.calculateSocialMetrics(bySource.get('call_logs') || [], bySource.get('message_logs') || []);

    // Calculate sleep metrics
    const sleep = this.calculateSleepMetrics(bySource.get('sleep_tracking') || [], bySource.get('accelerometer') || []);

    // Calculate device usage metrics
    const deviceUsage = this.calculateDeviceUsageMetrics(bySource.get('screen_time') || []);

    // Calculate mental health indicators
    const mentalHealthIndicators = this.calculateMentalHealthIndicators(mobility, social, sleep, deviceUsage);

    // Calculate overall confidence
    const confidence = this.calculateProfileConfidence(observations.length, periodDays);
    const dataCompleteness = observations.length / (periodDays * 24); // Rough estimate

    const profile: IPhenotypingProfile = {
      userId,
      periodStart: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000),
      periodEnd: new Date(),
      mobility,
      social,
      sleep,
      deviceUsage,
      mentalHealthIndicators,
      confidence,
      dataCompleteness: Math.min(1, dataCompleteness),
    };

    profileStorage.set(userId, profile);
    return profile;
  }

  // ==========================================================================
  // FEATURE EXTRACTION
  // ==========================================================================

  extractFeatures(observations: IPhenotypingObservation[]): Map<string, number> {
    const features = new Map<string, number>();

    // Group by source
    const bySource = new Map<PhenotypingSource, IPhenotypingObservation[]>();
    for (const obs of observations) {
      const existing = bySource.get(obs.source) || [];
      existing.push(obs);
      bySource.set(obs.source, existing);
    }

    // Extract features for each source
    for (const [source, sourceObs] of Array.from(bySource)) {
      const sourceFeatures = this.extractSourceFeatures(source, sourceObs);
      for (const [key, value] of Array.from(sourceFeatures)) {
        features.set(`${source}_${key}`, value);
      }
    }

    return features;
  }

  // ==========================================================================
  // MENTAL HEALTH INDICATORS
  // ==========================================================================

  async estimateMentalHealthIndicators(profile: IPhenotypingProfile): Promise<{
    depressionRisk: number;
    anxietyRisk: number;
    socialWithdrawal: number;
    overallRisk: number;
    confidence: number;
  }> {
    const { mobility, social, sleep, deviceUsage, mentalHealthIndicators } = profile;

    // Already calculated in profile
    return {
      depressionRisk: mentalHealthIndicators.depressionRisk,
      anxietyRisk: mentalHealthIndicators.anxietyRisk,
      socialWithdrawal: mentalHealthIndicators.socialWithdrawal,
      overallRisk: (mentalHealthIndicators.depressionRisk + mentalHealthIndicators.anxietyRisk) / 2,
      confidence: profile.confidence,
    };
  }

  // ==========================================================================
  // PRIVACY
  // ==========================================================================

  anonymizeProfile(profile: IPhenotypingProfile): IPhenotypingProfile {
    // Create anonymized copy
    const anonymized = JSON.parse(JSON.stringify(profile)) as IPhenotypingProfile;

    // Remove exact location data (keep only aggregate metrics)
    anonymized.mobility.totalDistance = Math.round(anonymized.mobility.totalDistance);

    // Generalize social metrics
    anonymized.social.socialDiversity = Math.round(anonymized.social.socialDiversity);

    // Bin sleep times
    anonymized.sleep.midpoint = Math.round(anonymized.sleep.midpoint);

    return anonymized;
  }

  // ==========================================================================
  // PRIVATE: METRIC CALCULATIONS
  // ==========================================================================

  private calculateMobilityMetrics(
    gpsObs: IPhenotypingObservation[],
    accelObs: IPhenotypingObservation[]
  ): IPhenotypingProfile['mobility'] {
    if (gpsObs.length === 0 && accelObs.length === 0) {
      return {
        totalDistance: 0,
        locationEntropy: 0.5,
        homeTime: 0.5,
        circadianMovement: 0.5,
      };
    }

    // Calculate total distance from GPS
    let totalDistance = 0;
    for (const obs of gpsObs) {
      const features = obs.processedFeatures;
      totalDistance += features.get('distance') || 0;
    }

    // Calculate location entropy (regularity)
    const locations = new Map<string, number>();
    for (const obs of gpsObs) {
      if (Array.isArray(obs.rawValue) && obs.rawValue.length >= 2) {
        // Bin locations to grid
        const gridKey = `${Math.floor(obs.rawValue[0] * 100)},${Math.floor(obs.rawValue[1] * 100)}`;
        locations.set(gridKey, (locations.get(gridKey) || 0) + 1);
      }
    }

    let entropy = 0;
    const total = gpsObs.length || 1;
    for (const count of Array.from(locations.values())) {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    const maxEntropy = Math.log2(locations.size || 1);
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0.5;

    // Calculate home time (assuming most frequent location is home)
    let maxCount = 0;
    for (const count of Array.from(locations.values())) {
      if (count > maxCount) maxCount = count;
    }
    const homeTime = total > 0 ? maxCount / total : 0.5;

    // Calculate circadian movement regularity from accelerometer
    let circadianMovement = 0.5;
    if (accelObs.length > 0) {
      // Group by hour and calculate consistency
      const hourlyActivity: number[] = Array(24).fill(0);
      const hourlyCounts: number[] = Array(24).fill(0);

      for (const obs of accelObs) {
        const hour = obs.timestamp.getHours();
        const activity = typeof obs.rawValue === 'number' ? obs.rawValue : 0;
        hourlyActivity[hour] += activity;
        hourlyCounts[hour]++;
      }

      // Calculate coefficient of variation
      const avgActivities = hourlyActivity.map((sum, i) =>
        hourlyCounts[i] > 0 ? sum / hourlyCounts[i] : 0
      );
      const mean = avgActivities.reduce((a, b) => a + b, 0) / 24;
      const variance = avgActivities.reduce((sum, a) => sum + (a - mean) ** 2, 0) / 24;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;

      circadianMovement = Math.min(1, cv / 2); // Higher variability = more regular circadian
    }

    return {
      totalDistance,
      locationEntropy: normalizedEntropy,
      homeTime,
      circadianMovement,
    };
  }

  private calculateSocialMetrics(
    callObs: IPhenotypingObservation[],
    messageObs: IPhenotypingObservation[]
  ): IPhenotypingProfile['social'] {
    // Calculate call frequency (calls per day)
    const days = this.calculateDaySpan(callObs) || 1;
    const callFrequency = callObs.length / days;

    // Calculate message frequency
    const messageDays = this.calculateDaySpan(messageObs) || 1;
    const messageFrequency = messageObs.length / messageDays;

    // Calculate social diversity (unique contacts)
    const contacts = new Set<string>();
    for (const obs of [...callObs, ...messageObs]) {
      if (typeof obs.rawValue === 'string') {
        contacts.add(obs.rawValue);
      }
    }
    const socialDiversity = contacts.size;

    // Calculate reciprocity (rough estimate)
    let incoming = 0;
    let outgoing = 0;
    for (const obs of [...callObs, ...messageObs]) {
      const features = obs.processedFeatures;
      if (features.get('direction') === 1) incoming++;
      else outgoing++;
    }
    const reciprocity = (incoming + outgoing) > 0
      ? Math.min(incoming, outgoing) / Math.max(incoming, outgoing)
      : 0.5;

    // Calculate response latency (from message timestamps)
    let responseLatency = REFERENCE_VALUES.social.normalResponseLatency;
    // In real implementation, would calculate from actual response times

    return {
      callFrequency,
      messageFrequency,
      socialDiversity,
      reciprocity,
      responseLatency,
    };
  }

  private calculateSleepMetrics(
    sleepObs: IPhenotypingObservation[],
    accelObs: IPhenotypingObservation[]
  ): IPhenotypingProfile['sleep'] {
    if (sleepObs.length === 0) {
      return {
        duration: REFERENCE_VALUES.sleep.optimalDuration,
        regularity: 0.5,
        efficiency: 0.5,
        midpoint: REFERENCE_VALUES.sleep.optimalMidpoint,
      };
    }

    // Calculate average duration
    let totalDuration = 0;
    const durations: number[] = [];

    for (const obs of sleepObs) {
      const duration = typeof obs.rawValue === 'number' ? obs.rawValue : 0;
      totalDuration += duration;
      durations.push(duration);
    }
    const avgDuration = sleepObs.length > 0 ? totalDuration / sleepObs.length : 7.5;

    // Calculate regularity (standard deviation of durations)
    const variance = durations.reduce((sum, d) => sum + (d - avgDuration) ** 2, 0) / durations.length;
    const std = Math.sqrt(variance);
    const regularity = Math.max(0, 1 - std / 2); // Lower std = more regular

    // Calculate efficiency (time in bed vs asleep - estimate)
    const efficiency = avgDuration > 8 ? 0.8 : avgDuration / 8;

    // Calculate sleep midpoint
    const midpoints: number[] = [];
    for (const obs of sleepObs) {
      const features = obs.processedFeatures;
      const midpoint = features.get('midpoint');
      if (midpoint !== undefined) midpoints.push(midpoint);
    }
    const avgMidpoint = midpoints.length > 0
      ? midpoints.reduce((a, b) => a + b, 0) / midpoints.length
      : REFERENCE_VALUES.sleep.optimalMidpoint;

    return {
      duration: avgDuration,
      regularity,
      efficiency,
      midpoint: avgMidpoint,
    };
  }

  private calculateDeviceUsageMetrics(
    screenObs: IPhenotypingObservation[]
  ): IPhenotypingProfile['deviceUsage'] {
    if (screenObs.length === 0) {
      return {
        screenTime: REFERENCE_VALUES.deviceUsage.normalScreenTime,
        pickupFrequency: REFERENCE_VALUES.deviceUsage.normalPickups,
        appSwitching: 10,
        nightUsage: REFERENCE_VALUES.deviceUsage.healthyNightUsage,
      };
    }

    // Calculate average screen time
    let totalScreenTime = 0;
    let pickups = 0;
    let nightObs = 0;
    let totalObs = 0;

    for (const obs of screenObs) {
      const duration = typeof obs.rawValue === 'number' ? obs.rawValue : 0;
      totalScreenTime += duration;
      pickups++;

      const hour = obs.timestamp.getHours();
      if (hour >= 0 && hour < 6) nightObs++;
      totalObs++;
    }

    const days = this.calculateDaySpan(screenObs) || 1;
    const avgScreenTime = totalScreenTime / days;
    const pickupFrequency = pickups / days;
    const nightUsage = totalObs > 0 ? nightObs / totalObs : 0;

    // App switching (estimate from pickup frequency)
    const appSwitching = pickupFrequency * 2;

    return {
      screenTime: avgScreenTime,
      pickupFrequency,
      appSwitching,
      nightUsage,
    };
  }

  private calculateMentalHealthIndicators(
    mobility: IPhenotypingProfile['mobility'],
    social: IPhenotypingProfile['social'],
    sleep: IPhenotypingProfile['sleep'],
    deviceUsage: IPhenotypingProfile['deviceUsage']
  ): IPhenotypingProfile['mentalHealthIndicators'] {
    // Depression risk (PHQ-9 proxy)
    let depressionRisk = 0;

    // Sleep disturbance
    const sleepDeviation = Math.abs(sleep.duration - REFERENCE_VALUES.sleep.optimalDuration);
    depressionRisk += DEPRESSION_WEIGHTS.sleepDisturbance * Math.min(1, sleepDeviation / 3);

    // Low energy (low mobility)
    const mobilityRatio = mobility.totalDistance / REFERENCE_VALUES.mobility.normalDistance;
    depressionRisk += DEPRESSION_WEIGHTS.lowEnergy * Math.max(0, 1 - mobilityRatio);

    // Social withdrawal
    const socialRatio = (social.callFrequency + social.messageFrequency / 10) /
                        (REFERENCE_VALUES.social.normalCallFrequency + REFERENCE_VALUES.social.normalMessageFrequency / 10);
    depressionRisk += DEPRESSION_WEIGHTS.socialWithdrawal * Math.max(0, 1 - socialRatio);

    // Reduced mobility
    depressionRisk += DEPRESSION_WEIGHTS.reducedMobility * Math.max(0, 1 - mobilityRatio);

    // Irregular patterns
    depressionRisk += DEPRESSION_WEIGHTS.irregularPatterns * (1 - sleep.regularity);

    // Increased screen time
    const screenRatio = deviceUsage.screenTime / REFERENCE_VALUES.deviceUsage.normalScreenTime;
    depressionRisk += DEPRESSION_WEIGHTS.increasedScreenTime * Math.max(0, screenRatio - 1);

    // Night usage
    const nightRatio = deviceUsage.nightUsage / REFERENCE_VALUES.deviceUsage.healthyNightUsage;
    depressionRisk += DEPRESSION_WEIGHTS.nightUsage * Math.min(1, Math.max(0, nightRatio - 1));

    depressionRisk = Math.min(1, Math.max(0, depressionRisk));

    // Anxiety risk (GAD-7 proxy)
    let anxietyRisk = 0;

    // Restless patterns (high pickup frequency)
    const pickupRatio = deviceUsage.pickupFrequency / REFERENCE_VALUES.deviceUsage.normalPickups;
    anxietyRisk += ANXIETY_WEIGHTS.excessiveChecking * Math.max(0, pickupRatio - 1);

    // Social avoidance
    anxietyRisk += ANXIETY_WEIGHTS.socialAvoidance * Math.max(0, 1 - socialRatio);

    // Sleep disturbance
    anxietyRisk += ANXIETY_WEIGHTS.sleepDisturbance * Math.min(1, sleepDeviation / 3);

    // Irregular movement
    anxietyRisk += ANXIETY_WEIGHTS.irregularMovement * (1 - mobility.circadianMovement);

    // Frequent pickups
    anxietyRisk += ANXIETY_WEIGHTS.frequentPickups * Math.max(0, pickupRatio - 1);

    anxietyRisk = Math.min(1, Math.max(0, anxietyRisk));

    // Social withdrawal (direct calculation)
    const socialWithdrawal = Math.max(0, 1 - socialRatio);

    // Sleep disturbance
    const sleepDisturbance = Math.min(1, sleepDeviation / 3 + (1 - sleep.regularity) / 2);

    // Agitation (from device usage patterns)
    const agitation = Math.min(1, (pickupRatio - 1) / 2 + deviceUsage.nightUsage * 2);

    return {
      depressionRisk,
      anxietyRisk,
      socialWithdrawal,
      sleepDisturbance,
      agitation: Math.max(0, agitation),
    };
  }

  // ==========================================================================
  // PRIVATE: FEATURE EXTRACTION HELPERS
  // ==========================================================================

  private extractFeaturesFromObservation(observation: IPhenotypingObservation): Map<string, number> {
    const features = new Map<string, number>();

    switch (observation.source) {
      case 'gps_location':
        if (Array.isArray(observation.rawValue) && observation.rawValue.length >= 2) {
          features.set('latitude', observation.rawValue[0]);
          features.set('longitude', observation.rawValue[1]);
          // In real implementation, calculate distance from previous location
          features.set('distance', 0);
        }
        break;

      case 'accelerometer':
        if (typeof observation.rawValue === 'number') {
          features.set('activity_level', observation.rawValue);
        } else if (Array.isArray(observation.rawValue)) {
          const magnitude = Math.sqrt(
            observation.rawValue.reduce((sum, v) => sum + v * v, 0)
          );
          features.set('activity_level', magnitude);
        }
        break;

      case 'screen_time':
        if (typeof observation.rawValue === 'number') {
          features.set('duration_hours', observation.rawValue);
          features.set('normalized', Math.min(1, observation.rawValue / 12));
        }
        break;

      case 'sleep_tracking':
        if (typeof observation.rawValue === 'number') {
          features.set('duration_hours', observation.rawValue);
          // Optimal is around 7.5 hours
          const quality = 1 - Math.abs(observation.rawValue - 7.5) / 7.5;
          features.set('quality_estimate', Math.max(0, quality));
        }
        break;

      case 'ema_survey':
        if (typeof observation.rawValue === 'number') {
          // Assume 0-10 scale
          features.set('rating', observation.rawValue / 10);
        }
        break;

      case 'call_logs':
      case 'message_logs':
        features.set('count', 1);
        // Direction: 0 = outgoing, 1 = incoming
        features.set('direction', Math.random() > 0.5 ? 1 : 0);
        break;

      default:
        if (typeof observation.rawValue === 'number') {
          features.set('value', observation.rawValue);
        }
    }

    // Add time features
    const hour = observation.timestamp.getHours();
    features.set('hour', hour);
    features.set('is_night', hour >= 0 && hour < 6 ? 1 : 0);
    features.set('is_weekend', [0, 6].includes(observation.timestamp.getDay()) ? 1 : 0);

    return features;
  }

  private extractSourceFeatures(
    source: PhenotypingSource,
    observations: IPhenotypingObservation[]
  ): Map<string, number> {
    const features = new Map<string, number>();

    // Aggregate statistics
    const values: number[] = [];
    for (const obs of observations) {
      const mainValue = obs.processedFeatures.get('value') ||
                        obs.processedFeatures.get('duration_hours') ||
                        obs.processedFeatures.get('activity_level') ||
                        obs.processedFeatures.get('rating') ||
                        (typeof obs.rawValue === 'number' ? obs.rawValue : 0);
      values.push(mainValue);
    }

    if (values.length > 0) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;

      features.set('mean', mean);
      features.set('variance', variance);
      features.set('std', Math.sqrt(variance));
      features.set('count', values.length);
      features.set('min', Math.min(...values));
      features.set('max', Math.max(...values));
    }

    return features;
  }

  // ==========================================================================
  // PRIVATE: UTILITY METHODS
  // ==========================================================================

  private getUnitForSource(source: PhenotypingSource): string {
    const units: Record<PhenotypingSource, string> = {
      gps_location: 'lat,lon',
      accelerometer: 'm/s²',
      screen_time: 'hours',
      call_logs: 'count',
      message_logs: 'count',
      social_media: 'interactions',
      sleep_tracking: 'hours',
      heart_rate: 'bpm',
      ema_survey: 'rating',
      keyboard_dynamics: 'wpm',
      voice_analysis: 'features',
      facial_expression: 'emotions',
    };
    return units[source] || 'unknown';
  }

  private generateContextTags(): string[] {
    const tags: string[] = [];
    const now = new Date();

    // Day of week
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    tags.push(days[now.getDay()]);

    // Weekend vs weekday
    if (now.getDay() === 0 || now.getDay() === 6) {
      tags.push('weekend');
    } else {
      tags.push('weekday');
    }

    // Time of day
    const hour = now.getHours();
    if (hour >= 6 && hour < 12) tags.push('morning');
    else if (hour >= 12 && hour < 17) tags.push('afternoon');
    else if (hour >= 17 && hour < 21) tags.push('evening');
    else tags.push('night');

    return tags;
  }

  private getObservationsForPeriod(userId: number, days: number): IPhenotypingObservation[] {
    const allObs = observationStorage.get(userId) || [];
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return allObs.filter(obs => obs.timestamp >= cutoff);
  }

  private calculateDaySpan(observations: IPhenotypingObservation[]): number {
    if (observations.length === 0) return 0;

    const timestamps = observations.map(o => o.timestamp.getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);

    return (maxTime - minTime) / (24 * 60 * 60 * 1000) || 1;
  }

  private calculateProfileConfidence(observationCount: number, periodDays: number): number {
    // Based on data density and coverage
    const expectedObs = periodDays * 24; // 1 per hour average
    const coverage = Math.min(1, observationCount / expectedObs);

    // Higher coverage = higher confidence
    return Math.min(1, coverage * 1.5);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const phenotypingService = new PhenotypingService();
