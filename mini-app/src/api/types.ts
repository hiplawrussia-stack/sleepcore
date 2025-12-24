/**
 * API Types
 * =========
 * TypeScript interfaces for API responses and requests.
 * Matches backend schemas in api/src/types/
 */

// ========== User Types ==========

export interface UserProfile {
  id: string;
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  evolutionStage: 'owlet' | 'young_owl' | 'wise_owl' | 'master';
  xp: number;
  level: number;
  streak: number;
  badges: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EvolutionStatus {
  currentStage: string;
  stageName: string;
  stageEmoji: string;
  daysActive: number;
  progress: number;
  nextStage: string | null;
  daysToNext: number | null;
}

export interface UserSettings {
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  reminderTime?: string;
  preferredPatterns: string[];
}

// ========== Breathing Types ==========

export interface BreathingSession {
  id: string;
  userId: string;
  patternId: string;
  patternName: string;
  cycles: number;
  duration: number;
  completedAt: string;
  syncedAt?: string;
}

export interface BreathingStats {
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  favoritePattern: string | null;
  weeklyProgress: number[];
  lastSessionAt: string | null;
}

export interface LogSessionRequest {
  patternId: string;
  patternName: string;
  cycles: number;
  duration: number;
  completedAt?: string;
}

export interface LogSessionResponse {
  id: string;
  xpGain: number;
}

// ========== Gamification Types ==========

export interface Quest {
  id: string;
  questId: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  status: 'active' | 'completed' | 'expired';
  reward: number;
  startedAt: string;
  completedAt?: string;
}

export interface Badge {
  badgeId: string;
  earnedAt: string;
}

// ========== Sync Types ==========

export interface SyncChange {
  entity: 'session' | 'profile' | 'quest' | 'badge';
  action: 'create' | 'update' | 'delete';
  id: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface SyncPushRequest {
  changes: Array<{
    localId: string;
    entity: 'session' | 'profile' | 'quest' | 'badge';
    action: 'create' | 'update' | 'delete';
    data: Record<string, unknown>;
    clientTimestamp: number;
  }>;
  lastSyncTime: number;
}

export interface SyncPushResponse {
  results: Array<{
    localId: string;
    serverId: string;
    status: 'synced' | 'error';
  }>;
  serverTime: number;
}

export interface SyncChangesResponse {
  changes: SyncChange[];
  serverTime: number;
  hasMore: boolean;
}

export interface SyncStatus {
  lastSyncTime: number | null;
  counts: {
    sessions: number;
  };
}

// ========== Auth Types ==========

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    telegramId: number;
    firstName: string;
    lastName?: string;
    username?: string;
    evolutionStage: string;
    xp: number;
    level: number;
  };
}

export interface AuthUser {
  id: string;
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  evolutionStage: string;
  xp: number;
  level: number;
  streak: number;
}
