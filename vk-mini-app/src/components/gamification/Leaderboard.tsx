/**
 * Leaderboard Component - Privacy-First Social Comparison (VK)
 * ============================================================
 * Opt-in leaderboard for social comparison and motivation.
 * Uses VKUI components for native VK experience.
 *
 * Privacy Research:
 * - 88% users prefer opt-in consent mechanisms
 * - Transparency about data usage increases trust (79%)
 * - Social comparison improves motivation
 *
 * GDPR Compliance:
 * - Explicit opt-in required before showing user in rankings
 * - Anonymous display option (show as "Participant #XXX")
 * - Easy opt-out at any time (GDPR Article 7(3))
 *
 * @see CLAUDE.md - GDPR Data Protection
 * @module @sleepcore/vk-mini-app/components/gamification
 */

import React, { useState, useCallback } from 'react';
import {
  Group,
  Header,
  SimpleCell,
  Avatar,
  Div,
  Text,
  Spacing,
  Spinner,
  Button,
  FormItem,
  Checkbox,
  Card,
  Link,
} from '@vkontakte/vkui';
import {
  Icon28UsersOutline,
  Icon28FireOutline,
  Icon28LockOutline,
} from '@vkontakte/icons';
import type { LeaderboardEntry, LeaderboardSettings } from '@/api';
import { vk } from '@/services/vk';

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
  /** Is opting in progress */
  isOptingIn?: boolean;
  /** Is opting out progress */
  isOptingOut?: boolean;
}

/** Evolution stage icons */
const STAGE_ICONS: Record<string, string> = {
  owlet: '🐣',
  young_owl: '🦉',
  wise_owl: '🦉✨',
  master: '🏆🦉',
};

/** Rank badge colors */
const getRankStyle = (rank: number): { bg: string; text: string } => {
  if (rank === 1) return { bg: '#FFD700', text: '#000' }; // Gold
  if (rank === 2) return { bg: '#C0C0C0', text: '#000' }; // Silver
  if (rank === 3) return { bg: '#CD7F32', text: '#fff' }; // Bronze
  return { bg: 'var(--vkui--color_background_tertiary)', text: 'var(--vkui--color_text_secondary)' };
};

/** Get rank display */
const getRankIcon = (rank: number): string => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

/**
 * Single leaderboard entry row
 */
const LeaderboardEntryRow: React.FC<{ entry: LeaderboardEntry }> = ({ entry }) => {
  const rankStyle = getRankStyle(entry.rank);

  return (
    <SimpleCell
      before={
        <Avatar
          size={40}
          style={{
            backgroundColor: rankStyle.bg,
            color: rankStyle.text,
            fontWeight: 'bold',
            fontSize: entry.rank <= 3 ? 18 : 14,
          }}
        >
          {entry.rank <= 3 ? getRankIcon(entry.rank) : entry.rank}
        </Avatar>
      }
      after={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon28FireOutline width={16} height={16} style={{ color: '#ff6b35' }} />
          <Text weight="2" style={{ color: '#ff6b35' }}>{entry.streak}</Text>
        </div>
      }
      subtitle={`${entry.totalSessions} сессий • ${entry.totalMinutes} мин`}
      style={{
        backgroundColor: entry.isCurrentUser
          ? 'var(--vkui--color_accent_blue--hover)'
          : 'transparent',
        borderRadius: 12,
        marginBottom: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{STAGE_ICONS[entry.evolutionStage] || '🦉'}</span>
        <span style={{ fontWeight: entry.isCurrentUser ? 600 : 400 }}>
          {entry.displayName}
          {entry.isCurrentUser && ' (вы)'}
        </span>
      </div>
    </SimpleCell>
  );
};

/**
 * Opt-in prompt for users who haven't joined
 */
const OptInPrompt: React.FC<{
  onOptIn: (anonymous: boolean) => void;
  isLoading: boolean;
}> = ({ onOptIn, isLoading }) => {
  const [showAnonymous, setShowAnonymous] = useState(true);

  return (
    <Group>
      <Div style={{ textAlign: 'center', padding: '24px 16px' }}>
        <Icon28UsersOutline width={56} height={56} style={{ margin: '0 auto 16px' }} />
        <Text weight="1" style={{ fontSize: 20, marginBottom: 8 }}>
          Присоединиться к рейтингу?
        </Text>
        <Text style={{ color: 'var(--vkui--color_text_secondary)', marginBottom: 24 }}>
          Сравнивай свой прогресс с другими пользователями.
          Ты можешь выбрать анонимное участие.
        </Text>

        <FormItem style={{ padding: 0, marginBottom: 16 }}>
          <Checkbox
            checked={showAnonymous}
            onChange={(e) => setShowAnonymous(e.target.checked)}
          >
            Участвовать анонимно
          </Checkbox>
        </FormItem>

        {showAnonymous && (
          <Card mode="outline" style={{ marginBottom: 16, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Icon28LockOutline />
              <div style={{ textAlign: 'left' }}>
                <Text weight="2">Анонимное участие</Text>
                <Text style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 13 }}>
                  Твоё имя будет показано как «Участник #XXX»
                </Text>
              </div>
            </div>
          </Card>
        )}

        <Button
          size="l"
          stretched
          loading={isLoading}
          onClick={() => {
            vk.hapticFeedback('notification', 'success');
            onOptIn(showAnonymous);
          }}
        >
          Участвовать в рейтинге
        </Button>

        <Spacing size={8} />

        <Text
          style={{
            textAlign: 'center',
            color: 'var(--vkui--color_text_tertiary)',
            fontSize: 12,
          }}
        >
          Согласно GDPR, ты можешь выйти в любой момент
        </Text>
      </Div>
    </Group>
  );
};

/**
 * Loading skeleton
 */
const LoadingSkeleton: React.FC = () => (
  <Group>
    <Header>Рейтинг недели</Header>
    <Div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <Spinner size="m" />
    </Div>
  </Group>
);

/**
 * Empty state when no entries
 */
const EmptyState: React.FC = () => (
  <Div style={{ textAlign: 'center', padding: '32px 16px' }}>
    <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>🏆</span>
    <Text weight="1" style={{ fontSize: 18, marginBottom: 8 }}>
      Рейтинг пока пуст
    </Text>
    <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
      Будь первым! Начни практиковать дыхательные упражнения.
    </Text>
  </Div>
);

/**
 * Main Leaderboard component
 */
export const Leaderboard: React.FC<LeaderboardProps> = ({
  entries = [],
  settings,
  isLoading = false,
  onOptIn,
  onOptOut,
  isOptingIn = false,
  isOptingOut = false,
}) => {
  // Handle opt-in
  const handleOptIn = useCallback(
    async (anonymous: boolean) => {
      if (!onOptIn) return;
      try {
        await onOptIn(anonymous);
        vk.hapticFeedback('notification', 'success');
      } catch (error) {
        console.error('[Leaderboard] Opt-in failed:', error);
        vk.showAlert('Не удалось подключиться к рейтингу. Попробуйте позже.');
      }
    },
    [onOptIn]
  );

  // Handle opt-out
  const handleOptOut = useCallback(async () => {
    if (!onOptOut) return;

    vk.hapticFeedback('selection_change');

    try {
      await onOptOut();
      vk.hapticFeedback('notification', 'success');
    } catch (error) {
      console.error('[Leaderboard] Opt-out failed:', error);
      vk.showAlert('Не удалось выйти из рейтинга. Попробуйте позже.');
    }
  }, [onOptOut]);

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Not opted in - show prompt
  if (!settings?.isOptedIn) {
    return <OptInPrompt onOptIn={handleOptIn} isLoading={isOptingIn} />;
  }

  // Opted in - show leaderboard
  return (
    <Group>
      <Div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 0,
      }}>
        <Text weight="1" style={{ fontSize: 16 }}>Рейтинг недели</Text>
        <Link
          onClick={handleOptOut}
          disabled={isOptingOut}
          style={{
            color: 'var(--vkui--color_text_secondary)',
            fontSize: 14,
          }}
        >
          {isOptingOut ? <Spinner size="s" /> : 'Выйти'}
        </Link>
      </Div>

      {/* Anonymous notice */}
      {settings.showAnonymously && (
        <Div style={{ paddingTop: 0, paddingBottom: 8 }}>
          <Card mode="outline" style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Icon28LockOutline style={{ color: 'var(--vkui--color_icon_secondary)' }} />
              <div>
                <Text weight="2">Анонимное участие</Text>
                <Text style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 13 }}>
                  Твоё имя скрыто от других участников
                </Text>
              </div>
            </div>
          </Card>
        </Div>
      )}

      {/* Entries list */}
      {entries.length > 0 ? (
        <Div style={{ paddingTop: 0 }}>
          {entries.map((entry) => (
            <LeaderboardEntryRow
              key={`${entry.rank}-${entry.displayName}`}
              entry={entry}
            />
          ))}
        </Div>
      ) : (
        <EmptyState />
      )}
    </Group>
  );
};

export default Leaderboard;
