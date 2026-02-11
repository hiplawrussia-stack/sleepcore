/**
 * Leaderboard Page
 * ================
 * Full leaderboard view with opt-in flow and rankings.
 *
 * Features:
 * - GDPR-compliant opt-in
 * - Weekly/monthly/all-time periods
 * - Share to VK Stories
 * - Anonymous participation option
 *
 * @packageDocumentation
 * @module @sleepcore/vk-mini-app/pages
 */

import { useState, useCallback } from 'react';
import {
  PanelHeader,
  Group,
  Tabs,
  TabsItem,
  Div,
  Text,
  Spinner,
  Snackbar,
  Button,
} from '@vkontakte/vkui';
import {
  Icon28ShareOutline,
  Icon28DoneOutline,
} from '@vkontakte/icons';
import { Leaderboard } from '@/components/gamification/Leaderboard';
import { useLeaderboard } from '@/hooks/useEvolution';
import { vk } from '@/services/vk';

type PeriodTab = 'weekly' | 'monthly' | 'allTime';

/**
 * Leaderboard page component
 */
export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<PeriodTab>('weekly');
  const [snackbar, setSnackbar] = useState<React.ReactNode>(null);

  const {
    entries,
    settings,
    isLoading,
    isError,
    optIn,
    optOut,
    isOptingIn,
    isOptingOut,
  } = useLeaderboard();

  // Handle tab change
  const handleTabChange = useCallback((tab: PeriodTab) => {
    setActiveTab(tab);
    vk.hapticFeedback('selection_change');
  }, []);

  // Handle opt-in
  const handleOptIn = useCallback(async (anonymous: boolean) => {
    try {
      await optIn(anonymous);
      setSnackbar(
        <Snackbar
          onClose={() => setSnackbar(null)}
          before={<Icon28DoneOutline fill="var(--vkui--color_accent_green)" />}
        >
          Вы присоединились к рейтингу!
        </Snackbar>
      );
    } catch (error) {
      console.error('[LeaderboardPage] Opt-in failed:', error);
      vk.showAlert('Не удалось присоединиться к рейтингу');
    }
  }, [optIn]);

  // Handle opt-out
  const handleOptOut = useCallback(async () => {
    try {
      await optOut();
      setSnackbar(
        <Snackbar
          onClose={() => setSnackbar(null)}
          before={<Icon28DoneOutline fill="var(--vkui--color_accent_green)" />}
        >
          Вы вышли из рейтинга
        </Snackbar>
      );
    } catch (error) {
      console.error('[LeaderboardPage] Opt-out failed:', error);
      vk.showAlert('Не удалось выйти из рейтинга');
    }
  }, [optOut]);

  // Share rank to stories
  const handleShareRank = useCallback(async () => {
    const currentUserEntry = entries?.find(e => e.isCurrentUser);
    if (!currentUserEntry) return;

    vk.hapticFeedback('impact', 'medium');

    try {
      await vk.showStoryBox({
        background_type: 'none',
        attachment: {
          text: 'open',
          type: 'url',
          url: 'https://vk.com/app12345678',
        },
      });

      setSnackbar(
        <Snackbar
          onClose={() => setSnackbar(null)}
          before={<Icon28DoneOutline fill="var(--vkui--color_accent_green)" />}
        >
          История опубликована!
        </Snackbar>
      );
    } catch (error) {
      // Fallback to regular share
      await vk.share(
        `Я занимаю ${currentUserEntry.rank} место в рейтинге SleepCore! 🦉✨`
      );
    }
  }, [entries]);

  // Loading state
  if (isLoading) {
    return (
      <>
        <PanelHeader>Рейтинг</PanelHeader>
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spinner size="l" />
        </Div>
      </>
    );
  }

  // Error state
  if (isError) {
    return (
      <>
        <PanelHeader>Рейтинг</PanelHeader>
        <Div style={{ textAlign: 'center', padding: 40 }}>
          <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
            Не удалось загрузить рейтинг
          </Text>
        </Div>
      </>
    );
  }

  // Get current user for share button
  const currentUserEntry = entries?.find(e => e.isCurrentUser);

  return (
    <>
      <PanelHeader>Рейтинг</PanelHeader>

      {/* Period tabs - only show if opted in */}
      {settings?.isOptedIn && (
        <Group>
          <Tabs>
            <TabsItem
              selected={activeTab === 'weekly'}
              onClick={() => handleTabChange('weekly')}
            >
              Неделя
            </TabsItem>
            <TabsItem
              selected={activeTab === 'monthly'}
              onClick={() => handleTabChange('monthly')}
            >
              Месяц
            </TabsItem>
            <TabsItem
              selected={activeTab === 'allTime'}
              onClick={() => handleTabChange('allTime')}
            >
              Всё время
            </TabsItem>
          </Tabs>
        </Group>
      )}

      {/* Share button if user is in top and opted in */}
      {settings?.isOptedIn && currentUserEntry && currentUserEntry.rank <= 10 && (
        <Group>
          <Div>
            <Button
              size="l"
              mode="secondary"
              stretched
              before={<Icon28ShareOutline />}
              onClick={handleShareRank}
            >
              Поделиться своим местом
            </Button>
          </Div>
        </Group>
      )}

      {/* Leaderboard component */}
      <Leaderboard
        entries={entries}
        settings={settings}
        isLoading={isLoading}
        onOptIn={handleOptIn}
        onOptOut={handleOptOut}
        isOptingIn={isOptingIn}
        isOptingOut={isOptingOut}
      />

      {snackbar}
    </>
  );
}
