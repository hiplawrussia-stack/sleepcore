/**
 * Leaderboard Component - Privacy-First Social Comparison
 * ========================================================
 * Opt-in leaderboard for social comparison and motivation.
 *
 * PERFORMANCE: Uses AutoAnimate (2.3KB) instead of motion (18KB)
 * for list animations.
 *
 * Privacy Research:
 * - 88% users prefer opt-in consent mechanisms
 * - Transparency about data usage increases trust (79%)
 * - Social comparison improves motivation
 *
 * GDPR Compliance:
 * - Explicit opt-in required before showing user in rankings
 * - Anonymous display option (показывать как "Участник #123")
 * - Easy opt-out at any time
 *
 * @see CLAUDE.md §9.3 - GDPR Data Protection
 * @see https://pmc.ncbi.nlm.nih.gov/articles/PMC12657888/
 * @module @sleepcore/mini-app/components/gamification
 */

import React, { useState, useCallback } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Card } from '@/components/common';
import { useTelegram } from '@/hooks';
import { haptics } from '@/services/haptics';

/** Leaderboard entry type */
export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  isAnonymous: boolean;
  totalSessions: number;
  totalMinutes: number;
  streak: number;
  evolutionStage: string;
  isCurrentUser: boolean;
}

/** Leaderboard settings */
export interface LeaderboardSettings {
  isOptedIn: boolean;
  showAnonymously: boolean;
}

interface LeaderboardProps {
  /** Leaderboard entries */
  entries?: LeaderboardEntry[];
  /** Current user's settings */
  settings?: LeaderboardSettings;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when user opts in */
  onOptIn?: (anonymous: boolean) => Promise<void>;
  /** Callback when user opts out */
  onOptOut?: () => Promise<void>;
  /** Custom class name */
  className?: string;
}

/** Evolution stage icons */
const STAGE_ICONS: Record<string, string> = {
  owlet: '🐣',
  young_owl: '🦉',
  wise_owl: '🦉✨',
  master: '🏆🦉',
};

/** Rank badge icons */
const getRankIcon = (rank: number): string => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

const LeaderboardEntryRow: React.FC<{
  entry: LeaderboardEntry;
}> = ({ entry }) => (
  <div
    className={`flex items-center gap-3 p-3 rounded-xl ${
      entry.isCurrentUser
        ? 'bg-primary-500/10 border border-primary-500/30'
        : 'bg-night-800/50'
    }`}
  >
    {/* Rank */}
    <div className="w-10 text-center">
      <span className={`text-lg ${entry.rank <= 3 ? '' : 'text-night-400'}`}>
        {getRankIcon(entry.rank)}
      </span>
    </div>

    {/* User info */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-sm">
          {STAGE_ICONS[entry.evolutionStage] || '🦉'}
        </span>
        <span className={`font-medium truncate ${
          entry.isCurrentUser ? 'text-primary-400' : 'text-night-100'
        }`}>
          {entry.displayName}
          {entry.isCurrentUser && ' (вы)'}
        </span>
      </div>
      <div className="text-xs text-night-400">
        {entry.totalSessions} сессий • {entry.totalMinutes} мин
      </div>
    </div>

    {/* Streak */}
    <div className="text-right">
      <div className="text-sm font-medium text-calm-amber">
        🔥 {entry.streak}
      </div>
    </div>
  </div>
);

const OptInPrompt: React.FC<{
  onOptIn: (anonymous: boolean) => void;
  isLoading: boolean;
}> = ({ onOptIn, isLoading }) => {
  const [showAnonymous, setShowAnonymous] = useState(false);

  return (
    <Card className="text-center">
      <span className="text-4xl mb-3 block">🏆</span>
      <h3 className="text-lg font-semibold text-night-100 mb-2">
        Присоединиться к рейтингу?
      </h3>
      <p className="text-sm text-night-400 mb-4">
        Сравнивай свой прогресс с другими пользователями.
        Ты можешь выбрать анонимное участие.
      </p>

      {/* Anonymous toggle */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <button
          onClick={() => setShowAnonymous(!showAnonymous)}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            showAnonymous
              ? 'bg-primary-500 text-white'
              : 'bg-night-700 text-night-300'
          }`}
        >
          {showAnonymous ? '🔒 Анонимно' : '👤 С именем'}
        </button>
      </div>

      {showAnonymous && (
        <p className="text-xs text-night-400 mb-4">
          Твоё имя будет показано как «Участник #XXX»
        </p>
      )}

      {/* Opt-in button */}
      <button
        onClick={() => onOptIn(showAnonymous)}
        disabled={isLoading}
        className="w-full py-3 px-4 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
      >
        {isLoading ? 'Подключаем...' : 'Участвовать в рейтинге'}
      </button>

      {/* Privacy note */}
      <p className="text-xs text-night-600 mt-3">
        Согласно GDPR, ты можешь отказаться в любой момент
      </p>
    </Card>
  );
};

export const Leaderboard: React.FC<LeaderboardProps> = ({
  entries = [],
  settings,
  isLoading = false,
  onOptIn,
  onOptOut,
  className = '',
}) => {
  const { showConfirm } = useTelegram();
  const [isOptingIn, setIsOptingIn] = useState(false);
  const [isOptingOut, setIsOptingOut] = useState(false);
  const [listRef] = useAutoAnimate<HTMLDivElement>();

  // Handle opt-in
  const handleOptIn = useCallback(async (anonymous: boolean) => {
    if (!onOptIn) return;

    setIsOptingIn(true);
    haptics.impact('medium');

    try {
      await onOptIn(anonymous);
      haptics.notification('success');
    } catch (error) {
      console.error('[Leaderboard] Opt-in failed:', error);
      haptics.notification('error');
    } finally {
      setIsOptingIn(false);
    }
  }, [onOptIn]);

  // Handle opt-out
  const handleOptOut = useCallback(async () => {
    if (!onOptOut) return;

    const confirmed = await showConfirm(
      'Выйти из рейтинга?\n\nТвои данные больше не будут видны другим участникам.'
    );

    if (!confirmed) return;

    setIsOptingOut(true);
    haptics.impact('light');

    try {
      await onOptOut();
      haptics.notification('success');
    } catch (error) {
      console.error('[Leaderboard] Opt-out failed:', error);
      haptics.notification('error');
    } finally {
      setIsOptingOut(false);
    }
  }, [onOptOut, showConfirm]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl bg-night-800/50 animate-pulse"
          >
            <div className="w-10 h-6 bg-night-700 rounded" />
            <div className="flex-1">
              <div className="h-4 bg-night-700 rounded w-24 mb-1" />
              <div className="h-3 bg-night-700 rounded w-16" />
            </div>
            <div className="w-10 h-4 bg-night-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Not opted in - show prompt
  if (!settings?.isOptedIn) {
    return (
      <div className={className}>
        <OptInPrompt onOptIn={handleOptIn} isLoading={isOptingIn} />
      </div>
    );
  }

  // Opted in - show leaderboard
  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-night-100">
          Рейтинг недели
        </h3>
        <button
          onClick={handleOptOut}
          disabled={isOptingOut}
          className="text-xs text-night-400 hover:text-night-300"
        >
          {isOptingOut ? '...' : 'Выйти'}
        </button>
      </div>

      {/* Anonymous notice */}
      {settings.showAnonymously && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-night-800/50 text-xs text-night-400">
          🔒 Ты участвуешь анонимно
        </div>
      )}

      {/* Entries list - AutoAnimate handles animations */}
      {entries.length > 0 ? (
        <div ref={listRef} className="space-y-2">
          {entries.map((entry) => (
            <LeaderboardEntryRow
              key={`${entry.rank}-${entry.displayName}`}
              entry={entry}
            />
          ))}
        </div>
      ) : (
        <Card className="text-center py-6">
          <span className="text-2xl mb-2 block">🏆</span>
          <p className="text-night-400 text-sm">
            Рейтинг пока пуст. Будь первым!
          </p>
        </Card>
      )}
    </div>
  );
};

export default Leaderboard;
