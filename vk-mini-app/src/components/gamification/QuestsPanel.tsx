/**
 * Quests Panel Component (VK Mini App)
 * ====================================
 * Reusable quest display with VKUI styling.
 * Shows active quests with progress bars and rewards.
 *
 * Features:
 * - Loading skeleton
 * - Empty state
 * - Progress visualization
 * - Quest type icons (daily/weekly/milestone)
 * - Compact mode for dashboard widgets
 *
 * Gamification research:
 * - Progress bars increase motivation (Self-determination theory)
 * - XP rewards provide immediate feedback
 * - Quest types create varied engagement loops
 *
 * @module @sleepcore/vk-mini-app/components/gamification
 */

import React, { useMemo } from 'react';
import {
  Group,
  Header,
  SimpleCell,
  Avatar,
  Progress,
  Spinner,
  Div,
  Text,
} from '@vkontakte/vkui';
import type { Quest } from '@/api';
import { useQuests } from '@/hooks/useEvolution';

/**
 * Quest type to icon/color mapping
 */
const QUEST_TYPE_CONFIG: Record<
  Quest['type'],
  { icon: string; color: string; label: string }
> = {
  daily: {
    icon: '📅',
    color: '#4bb34b',
    label: 'Ежедневное',
  },
  weekly: {
    icon: '📆',
    color: '#5181b8',
    label: 'Недельное',
  },
  milestone: {
    icon: '🏆',
    color: '#ffc107',
    label: 'Достижение',
  },
};

interface QuestsPanelProps {
  /** Maximum number of quests to show */
  limit?: number;
  /** Only show active quests */
  activeOnly?: boolean;
  /** Compact mode for dashboard widgets */
  compact?: boolean;
  /** Show header */
  showHeader?: boolean;
  /** Custom header text */
  headerText?: string;
  /** Callback when quest is clicked */
  onQuestClick?: (quest: Quest) => void;
}

/**
 * Loading skeleton for quests
 */
const QuestsSkeleton: React.FC = () => (
  <Group>
    <Header>Задания</Header>
    <Div style={{ textAlign: 'center', padding: 24 }}>
      <Spinner size="m" />
    </Div>
  </Group>
);

/**
 * Empty state when no quests
 */
const EmptyQuests: React.FC = () => (
  <SimpleCell
    before={
      <Avatar
        size={40}
        style={{
          backgroundColor: 'var(--vkui--color_background_secondary)',
          fontSize: 20,
        }}
      >
        ✓
      </Avatar>
    }
    subtitle="Отличная работа!"
  >
    Все задания выполнены
  </SimpleCell>
);

/**
 * Single quest row component
 */
const QuestRow: React.FC<{
  quest: Quest;
  compact?: boolean;
  onClick?: () => void;
}> = ({ quest, compact, onClick }) => {
  const config = QUEST_TYPE_CONFIG[quest.type];
  const progressPercent = Math.round((quest.progress / quest.target) * 100);
  const isCompleted = quest.status === 'completed';

  return (
    <SimpleCell
      onClick={onClick}
      before={
        <Avatar
          size={compact ? 36 : 40}
          style={{
            backgroundColor: isCompleted
              ? 'var(--vkui--color_background_secondary)'
              : config.color,
            fontSize: compact ? 16 : 20,
            opacity: isCompleted ? 0.6 : 1,
          }}
        >
          {isCompleted ? '✓' : config.icon}
        </Avatar>
      }
      after={
        !isCompleted && (
          <Text
            weight="2"
            style={{
              color: 'var(--vkui--color_accent_green)',
              fontSize: compact ? 13 : 14,
            }}
          >
            +{quest.reward} XP
          </Text>
        )
      }
      subtitle={
        <div style={{ marginTop: 4 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 4,
              fontSize: 12,
              color: 'var(--vkui--color_text_secondary)',
            }}
          >
            <span>{config.label}</span>
            <span>
              {quest.progress}/{quest.target}
            </span>
          </div>
          <Progress
            value={progressPercent}
            style={{
              height: compact ? 4 : 6,
              opacity: isCompleted ? 0.5 : 1,
            }}
          />
        </div>
      }
      style={{
        opacity: isCompleted ? 0.7 : 1,
      }}
    >
      <Text
        weight={isCompleted ? '3' : '2'}
        style={{
          textDecoration: isCompleted ? 'line-through' : 'none',
        }}
      >
        {quest.title}
      </Text>
    </SimpleCell>
  );
};

/**
 * QuestsPanel component
 *
 * @example
 * // Basic usage
 * <QuestsPanel />
 *
 * @example
 * // Dashboard widget with limit
 * <QuestsPanel limit={3} compact activeOnly />
 *
 * @example
 * // Full page with all quests
 * <QuestsPanel showHeader headerText="Все задания" />
 */
export const QuestsPanel: React.FC<QuestsPanelProps> = ({
  limit,
  activeOnly = false,
  compact = false,
  showHeader = true,
  headerText = 'Активные задания',
  onQuestClick,
}) => {
  const { quests, isLoading, isError } = useQuests();

  // Filter and sort quests
  const displayedQuests = useMemo(() => {
    let filtered = [...quests];

    // Filter by status
    if (activeOnly) {
      filtered = filtered.filter((q) => q.status === 'active');
    }

    // Sort: active first, then by progress percentage (descending)
    filtered.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'active' ? -1 : 1;
      }
      const progressA = a.progress / a.target;
      const progressB = b.progress / b.target;
      return progressB - progressA;
    });

    // Apply limit
    if (limit && limit > 0) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }, [quests, activeOnly, limit]);

  // Loading state
  if (isLoading) {
    return <QuestsSkeleton />;
  }

  // Error state
  if (isError) {
    return (
      <Group>
        {showHeader && <Header>{headerText}</Header>}
        <Div style={{ textAlign: 'center', padding: 16 }}>
          <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
            Не удалось загрузить задания
          </Text>
        </Div>
      </Group>
    );
  }

  return (
    <Group>
      {showHeader && <Header>{headerText}</Header>}

      {displayedQuests.length > 0 ? (
        displayedQuests.map((quest) => (
          <QuestRow
            key={quest.id}
            quest={quest}
            compact={compact}
            onClick={onQuestClick ? () => onQuestClick(quest) : undefined}
          />
        ))
      ) : (
        <EmptyQuests />
      )}
    </Group>
  );
};

export default QuestsPanel;
