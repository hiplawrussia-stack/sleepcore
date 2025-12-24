/**
 * API Types
 * =========
 * Request/Response types for API endpoints.
 */

// User Profile
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

// Breathing Session
export interface BreathingSession {
  id: string;
  oderId: string;
  patternId: string;
  patternName: string;
  cycles: number;
  duration: number;
  completedAt: string;
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

// Sync
export interface SyncChange {
  entity: 'session' | 'profile' | 'quest' | 'badge';
  action: 'create' | 'update' | 'delete';
  id: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface SyncChangesResponse {
  changes: SyncChange[];
  serverTime: number;
  hasMore: boolean;
}

export interface SyncPushRequest {
  changes: Array<{
    localId: string;
    entity: string;
    action: string;
    data: Record<string, unknown>;
    clientTimestamp: number;
  }>;
  lastSyncTime: number;
}

// Evolution
export interface EvolutionStatus {
  currentStage: string;
  stageName: string;
  stageEmoji: string;
  daysActive: number;
  progress: number;
  nextStage: string | null;
  daysToNext: number | null;
}

// Quest
export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'streak' | 'cumulative' | 'improvement';
  target: number;
  progress: number;
  reward: number;
  expiresAt: string | null;
  status: 'available' | 'active' | 'completed';
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}
