/**
 * QuestsPanel Component - Gamification Quests Display
 * ====================================================
 * Displays active and available quests with progress tracking.
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
import { motion, AnimatePresence } from 'motion/react';
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
  index: number;
}

const QuestCard: React.FC<QuestCardProps> = ({ quest, index }) => {
  const progressPercent = Math.min(100, (quest.progress / quest.target) * 100);
  const isCompleted = quest.status === 'completed';
  const isExpired = quest.status === 'expired';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card
        variant={isCompleted ? 'glass' : 'default'}
        className={`${isExpired ? 'opacity-60' : ''}`}
      >
        <div className="flex items-start gap-3">
          {/* Category icon */}
          <div className="text-2xl">
            {getCategoryIcon(quest.questId)}
          </div>

          {/* Quest content */}
          <div className="flex-1 min-w-0">
            {/* Title and status */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-medium text-night-100 truncate">
                {quest.title}
              </h4>
              <span className="text-sm shrink-0">
                {STATUS_ICONS[quest.status]}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-night-400 mb-2 line-clamp-2">
              {quest.description}
            </p>

            {/* Progress bar */}
            {!isExpired && (
              <div className="mb-2">
                <div className="flex justify-between text-xs text-night-500 mb-1">
                  <span>{quest.progress} / {quest.target}</span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
                <div className="h-2 bg-night-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                    className={`h-full rounded-full ${
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
              <span className="text-xs text-night-500">
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
    </motion.div>
  );
};

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
  const { quests, isLoading, isError, refetch } = useQuests();

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
          <span className="text-2xl mb-2 block">😕</span>
          <p className="text-night-400 text-sm mb-3">
            Не удалось загрузить задания
          </p>
          <button
            onClick={handleRefresh}
            className="text-primary-400 text-sm hover:underline"
          >
            Попробовать снова
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
          <span className="text-2xl mb-2 block">🎯</span>
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
            Задания
          </h3>
          <button
            onClick={handleRefresh}
            className="text-sm text-night-400 hover:text-night-300"
          >
            Обновить
          </button>
        </div>
      )}

      {/* Quest list */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredQuests.map((quest, index) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              index={index}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Show more link */}
      {limit && quests && quests.length > limit && !compact && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-3"
        >
          <span className="text-sm text-night-500">
            +{quests.length - limit} ещё
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default QuestsPanel;
