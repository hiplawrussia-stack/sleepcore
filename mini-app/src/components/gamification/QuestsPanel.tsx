/**
 * QuestsPanel Component - Gamification Quests Display
 * ====================================================
 * Displays active and available quests with progress tracking.
 *
 * PERFORMANCE: Uses AutoAnimate (2.3KB) instead of motion (18KB)
 * for list animations. CSS transitions for progress bars.
 *
 * UX Research:
 * - Short-term challenges add motivation (daily/weekly)
 * - Progress bars visualize advancement toward goals
 * - Immediate feedback via animations and haptics
 *
 * @see CLAUDE.md §13 - Gamification module
 * @see https://pmc.ncbi.nlm.nih.gov/articles/PMC8855282/
 * @module @sleepcore/mini-app/components/gamification
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Card } from '@/components/common';
import { useQuests } from '@/hooks/useEvolution';
import { haptics } from '@/services/haptics';
import type { Quest } from '@/api';

/** Quest status icons */
const STATUS_ICONS: Record<string, string> = {
  active: '🎯',
  completed: '✅',
  expired: '⏰',
};

/** Quest category icons based on questId prefix */
const getCategoryIcon = (questId: string): string => {
  if (questId.startsWith('streak')) return '🔥';
  if (questId.startsWith('sessions')) return '🧘';
  if (questId.startsWith('minutes')) return '⏱️';
  if (questId.startsWith('patterns')) return '🌬️';
  if (questId.startsWith('weekly')) return '📅';
  if (questId.startsWith('daily')) return '☀️';
  return '🎯';
};

interface QuestCardProps {
  quest: Quest;
}

/** Memoized quest card to prevent re-renders in list */
const QuestCard: React.FC<QuestCardProps> = React.memo(({ quest }) => {
  const progressPercent = Math.min(100, (quest.progress / quest.target) * 100);
  const isCompleted = quest.status === 'completed';
  const isExpired = quest.status === 'expired';

  return (
    <Card
      variant={isCompleted ? 'glass' : 'default'}
      className={`${isExpired ? 'opacity-60' : ''}`}
      aria-label={`${quest.title}: ${quest.progress} / ${quest.target}`}
    >
      <div className="flex items-start gap-3">
        {/* Category icon */}
        <div className="text-2xl" aria-hidden="true">
          {getCategoryIcon(quest.questId)}
        </div>

        {/* Quest content */}
        <div className="flex-1 min-w-0">
          {/* Title and status */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-medium text-night-100 truncate">
              {quest.title}
            </h4>
            <span className="text-sm shrink-0" aria-hidden="true">
              {STATUS_ICONS[quest.status]}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-night-400 mb-2 line-clamp-2">
            {quest.description}
          </p>

          {/* Progress bar - CSS transition instead of motion */}
          {!isExpired && (
            <div className="mb-2">
              <div className="flex justify-between text-xs text-night-400 mb-1">
                <span>{quest.progress} / {quest.target}</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div
                className="h-2 bg-night-700 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={quest.progress}
                aria-valuemin={0}
                aria-valuemax={quest.target}
                aria-label={`${quest.title}: ${Math.round(progressPercent)}%`}
              >
                <div
                  style={{ width: `${progressPercent}%` }}
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    isCompleted
                      ? 'bg-gradient-to-r from-calm-green to-calm-blue'
                      : 'bg-gradient-to-r from-primary-500 to-calm-purple'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Reward */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-night-400">
              {isCompleted ? 'Получено' : isExpired ? 'Истекло' : 'Награда'}
            </span>
            <span className={`text-sm font-medium ${
              isCompleted ? 'text-calm-green' : 'text-primary-400'
            }`}>
              +{quest.reward} XP
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
});

QuestCard.displayName = 'QuestCard';

interface QuestsPanelProps {
  /** Maximum number of quests to display */
  limit?: number;
  /** Show only active quests */
  activeOnly?: boolean;
  /** Compact mode for home page */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

export const QuestsPanel: React.FC<QuestsPanelProps> = ({
  limit,
  activeOnly = false,
  compact = false,
  className = '',
}) => {
  const { t } = useTranslation();
  const { quests, isLoading, isError, refetch } = useQuests();
  const [listRef] = useAutoAnimate<HTMLDivElement>();

  // Filter quests
  const filteredQuests = React.useMemo(() => {
    if (!quests) return [];

    let result = [...quests];

    if (activeOnly) {
      result = result.filter(q => q.status === 'active');
    }

    // Sort: active first, then completed, then expired
    result.sort((a, b) => {
      const statusOrder = { active: 0, completed: 1, expired: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    });

    if (limit) {
      result = result.slice(0, limit);
    }

    return result;
  }, [quests, activeOnly, limit]);

  // Handle refresh
  const handleRefresh = async () => {
    haptics.selectionChanged();
    await refetch();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-night-700 rounded" />
              <div className="flex-1">
                <div className="h-4 bg-night-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-night-700 rounded w-1/2 mb-3" />
                <div className="h-2 bg-night-700 rounded w-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card className={className}>
        <div className="text-center py-4">
          <span className="text-2xl mb-2 block" aria-hidden="true">😕</span>
          <p className="text-night-400 text-sm mb-3">
            {t('errors.generic')}
          </p>
          <button
            onClick={handleRefresh}
            aria-label={t('a11y.quests.refreshQuests')}
            className="text-primary-400 text-sm hover:underline"
          >
            {t('common.retry')}
          </button>
        </div>
      </Card>
    );
  }

  // Empty state
  if (!filteredQuests.length) {
    return (
      <Card className={className}>
        <div className="text-center py-4">
          <span className="text-2xl mb-2 block" aria-hidden="true">🎯</span>
          <p className="text-night-400 text-sm">
            {activeOnly
              ? 'Нет активных заданий'
              : 'Задания пока недоступны'}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-night-100">
            {t('quests.title')}
          </h3>
          <button
            onClick={handleRefresh}
            aria-label={t('a11y.quests.refreshQuests')}
            className="text-sm text-night-400 hover:text-night-300"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Quest list - AutoAnimate handles enter/exit/reorder */}
      <div ref={listRef} className="space-y-3">
        {filteredQuests.map((quest) => (
          <QuestCard key={quest.id} quest={quest} />
        ))}
      </div>

      {/* Show more link */}
      {limit && quests && quests.length > limit && !compact && (
        <div className="text-center mt-3 animate-fade-in">
          <span className="text-sm text-night-400">
            +{quests.length - limit} ещё
          </span>
        </div>
      )}
    </div>
  );
};

export default QuestsPanel;
