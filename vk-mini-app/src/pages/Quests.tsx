/**
 * Quests Page
 * ===========
 * Full quests view with filtering and detailed progress.
 *
 * Features:
 * - Tab filtering (all/active/completed)
 * - Quest progress visualization
 * - Reward display
 * - Share achievements to VK Stories
 *
 * @packageDocumentation
 * @module @sleepcore/vk-mini-app/pages
 */

import { useState, useMemo, useCallback } from 'react';
import {
  PanelHeader,
  Group,
  Tabs,
  TabsItem,
  SimpleCell,
  Avatar,
  Progress,
  Spinner,
  Div,
  Text,
  Title,
  Spacing,
  Badge,
  Snackbar,
  HorizontalScroll,
  Card,
} from '@vkontakte/vkui';
import {
  Icon28DoneOutline,
  Icon28ShareOutline,
} from '@vkontakte/icons';
import type { Quest } from '@/api';
import { useQuests } from '@/hooks/useEvolution';
import { vk } from '@/services/vk';

type TabId = 'all' | 'active' | 'completed';

/**
 * Quest type configuration
 */
const QUEST_CONFIG: Record<Quest['type'], { icon: string; color: string; label: string }> = {
  daily: { icon: '📅', color: '#4bb34b', label: 'Ежедневное' },
  weekly: { icon: '📆', color: '#5181b8', label: 'Недельное' },
  milestone: { icon: '🏆', color: '#ffc107', label: 'Достижение' },
};

/**
 * Single quest card component
 */
const QuestCard: React.FC<{
  quest: Quest;
  onShare?: (quest: Quest) => void;
}> = ({ quest, onShare }) => {
  const config = QUEST_CONFIG[quest.type];
  const progressPercent = Math.round((quest.progress / quest.target) * 100);
  const isCompleted = quest.status === 'completed';

  return (
    <Card mode="outline" style={{ marginBottom: 12 }}>
      <Div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Avatar
            size={48}
            style={{
              backgroundColor: isCompleted ? 'var(--vkui--color_accent_green)' : config.color,
              fontSize: 24,
            }}
          >
            {isCompleted ? '✓' : config.icon}
          </Avatar>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text weight="2" style={{ fontSize: 16 }}>
                {quest.title}
              </Text>
              {!isCompleted && (
                <Badge mode="prominent">+{quest.reward} XP</Badge>
              )}
            </div>

            <Spacing size={4} />

            <Text style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 14 }}>
              {quest.description}
            </Text>

            <Spacing size={8} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text
                weight="3"
                style={{
                  color: 'var(--vkui--color_text_secondary)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                }}
              >
                {config.label}
              </Text>
              {quest.expiresAt && !isCompleted && (
                <Text style={{ color: 'var(--vkui--color_text_tertiary)', fontSize: 12 }}>
                  до {new Date(quest.expiresAt).toLocaleDateString('ru-RU')}
                </Text>
              )}
            </div>

            <Spacing size={8} />

            {/* Progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 13 }}>
                  Прогресс
                </Text>
                <Text weight="2" style={{ fontSize: 13 }}>
                  {quest.progress}/{quest.target} ({progressPercent}%)
                </Text>
              </div>
              <Progress value={progressPercent} />
            </div>

            {/* Share button for completed quests */}
            {isCompleted && onShare && (
              <>
                <Spacing size={12} />
                <SimpleCell
                  before={<Icon28ShareOutline />}
                  onClick={() => onShare(quest)}
                  style={{
                    margin: '0 -12px -12px',
                    backgroundColor: 'var(--vkui--color_background_secondary)',
                    borderRadius: '0 0 8px 8px',
                  }}
                >
                  Поделиться в истории
                </SimpleCell>
              </>
            )}
          </div>
        </div>
      </Div>
    </Card>
  );
};

/**
 * Stats summary card
 */
const QuestStats: React.FC<{ quests: Quest[] }> = ({ quests }) => {
  const stats = useMemo(() => {
    const active = quests.filter(q => q.status === 'active').length;
    const completed = quests.filter(q => q.status === 'completed').length;
    const totalXP = quests
      .filter(q => q.status === 'completed')
      .reduce((sum, q) => sum + q.reward, 0);

    return { active, completed, totalXP };
  }, [quests]);

  return (
    <Group>
      <Div>
        <HorizontalScroll>
          <div style={{ display: 'flex', gap: 12 }}>
            <Card mode="outline" style={{ minWidth: 100, padding: 12, textAlign: 'center' }}>
              <Title level="1" style={{ color: 'var(--vkui--color_accent_blue)' }}>
                {stats.active}
              </Title>
              <Text style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 13 }}>
                Активных
              </Text>
            </Card>

            <Card mode="outline" style={{ minWidth: 100, padding: 12, textAlign: 'center' }}>
              <Title level="1" style={{ color: 'var(--vkui--color_accent_green)' }}>
                {stats.completed}
              </Title>
              <Text style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 13 }}>
                Выполнено
              </Text>
            </Card>

            <Card mode="outline" style={{ minWidth: 100, padding: 12, textAlign: 'center' }}>
              <Title level="1" style={{ color: 'var(--vkui--color_accent_orange)' }}>
                {stats.totalXP}
              </Title>
              <Text style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 13 }}>
                XP получено
              </Text>
            </Card>
          </div>
        </HorizontalScroll>
      </Div>
    </Group>
  );
};

/**
 * Quests page component
 */
export default function Quests() {
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [snackbar, setSnackbar] = useState<React.ReactNode>(null);
  const { quests, isLoading, isError, refetch } = useQuests();

  // Filter quests by tab
  const filteredQuests = useMemo(() => {
    let filtered = [...quests];

    if (activeTab === 'active') {
      filtered = filtered.filter(q => q.status === 'active');
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(q => q.status === 'completed');
    }

    // Sort: active first, then by progress
    filtered.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'active' ? -1 : 1;
      }
      return (b.progress / b.target) - (a.progress / a.target);
    });

    return filtered;
  }, [quests, activeTab]);

  // Share quest to VK Stories
  const handleShareQuest = useCallback(async (quest: Quest) => {
    vk.hapticFeedback('impact', 'medium');

    try {
      await vk.showStoryBox({
        background_type: 'image',
        stickers: [
          {
            sticker_type: 'renderable',
            sticker: {
              content_type: 'image',
              blob: '', // Would be generated achievement image
            },
          },
        ],
        attachment: {
          text: 'open',
          type: 'url',
          url: 'https://vk.com/app12345678', // App URL
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
      console.error('[Quests] Share failed:', error);
      // Fallback to regular share
      await vk.share(`Я выполнил задание "${quest.title}" в SleepCore! 🦉`);
    }
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    vk.hapticFeedback('selection_change');
  }, []);

  if (isLoading) {
    return (
      <>
        <PanelHeader>Задания</PanelHeader>
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spinner size="l" />
        </Div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PanelHeader>Задания</PanelHeader>
        <Div style={{ textAlign: 'center', padding: 40 }}>
          <Text style={{ color: 'var(--vkui--color_text_secondary)', marginBottom: 16 }}>
            Не удалось загрузить задания
          </Text>
          <SimpleCell onClick={() => refetch()}>Повторить</SimpleCell>
        </Div>
      </>
    );
  }

  return (
    <>
      <PanelHeader>Задания</PanelHeader>

      {/* Stats summary */}
      <QuestStats quests={quests} />

      {/* Tabs */}
      <Group>
        <Tabs>
          <TabsItem
            selected={activeTab === 'all'}
            onClick={() => handleTabChange('all')}
          >
            Все ({quests.length})
          </TabsItem>
          <TabsItem
            selected={activeTab === 'active'}
            onClick={() => handleTabChange('active')}
          >
            Активные ({quests.filter(q => q.status === 'active').length})
          </TabsItem>
          <TabsItem
            selected={activeTab === 'completed'}
            onClick={() => handleTabChange('completed')}
          >
            Выполненные ({quests.filter(q => q.status === 'completed').length})
          </TabsItem>
        </Tabs>
      </Group>

      {/* Quest list */}
      <Group>
        <Div>
          {filteredQuests.length > 0 ? (
            filteredQuests.map(quest => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onShare={quest.status === 'completed' ? handleShareQuest : undefined}
              />
            ))
          ) : (
            <Div style={{ textAlign: 'center', padding: 24 }}>
              <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>
                {activeTab === 'completed' ? '🎯' : '✨'}
              </span>
              <Text weight="1" style={{ fontSize: 18, marginBottom: 8 }}>
                {activeTab === 'completed'
                  ? 'Нет выполненных заданий'
                  : 'Нет активных заданий'}
              </Text>
              <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                {activeTab === 'completed'
                  ? 'Выполняй задания, чтобы получать XP!'
                  : 'Скоро появятся новые задания!'}
              </Text>
            </Div>
          )}
        </Div>
      </Group>

      {snackbar}
    </>
  );
}
