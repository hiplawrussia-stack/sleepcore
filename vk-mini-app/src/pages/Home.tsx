/**
 * Home Page
 * =========
 * Main page with quick actions and evolution display.
 *
 * @packageDocumentation
 * @module @sleepcore/vk-mini-app/pages
 */

import {
  PanelHeader,
  Group,
  Header,
  Card,
  CardGrid,
  SimpleCell,
  Avatar,
  Progress,
  Spinner,
  Div,
  Title,
  Text,
  Spacing,
} from '@vkontakte/vkui';
import {
  Icon28MoonOutline,
  Icon28HeartCircleOutline,
  Icon28UserOutline,
  Icon28StatisticsOutline,
} from '@vkontakte/icons';

import type { PanelId } from '@/App';
import type { AuthUser } from '@/api';
import { useEvolution, useQuests } from '@/hooks/useEvolution';

interface HomeProps {
  go: (panel: PanelId) => void;
  user: AuthUser | null;
}

/**
 * Evolution stage icons/emojis
 */
const stageIcons: Record<string, string> = {
  owlet: '🦉',
  young_owl: '🦉',
  wise_owl: '🦉',
  master: '🦉',
};

/**
 * Evolution stage names
 */
const stageNames: Record<string, string> = {
  owlet: 'Совёнок',
  young_owl: 'Молодая сова',
  wise_owl: 'Мудрая сова',
  master: 'Мастер',
};

/**
 * Home component
 */
export default function Home({ go, user }: HomeProps) {
  const { evolution, isLoading: evolutionLoading } = useEvolution();
  const { quests, isLoading: questsLoading } = useQuests();

  const activeQuests = quests.filter((q) => q.status === 'active');

  return (
    <>
      <PanelHeader>SleepCore</PanelHeader>

      {/* User greeting & evolution */}
      <Group>
        <Div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar
              size={64}
              style={{ backgroundColor: '#5181b8', fontSize: 32 }}
            >
              {evolution ? stageIcons[evolution.stage] : '🦉'}
            </Avatar>
            <div style={{ flex: 1 }}>
              <Title level="2">
                Привет, {user?.firstName || 'Пользователь'}!
              </Title>
              <Text weight="2" style={{ color: 'var(--vkui--color_text_secondary)' }}>
                {evolution ? stageNames[evolution.stage] : 'Совёнок'}
              </Text>
            </div>
          </div>

          <Spacing size={16} />

          {evolutionLoading ? (
            <Spinner size="small" />
          ) : evolution ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text weight="2">Уровень {evolution.level}</Text>
                <Text weight="2">{evolution.xp} / {evolution.xpToNextLevel} XP</Text>
              </div>
              <Progress value={evolution.progressPercent} />
            </div>
          ) : null}
        </Div>
      </Group>

      {/* Quick actions */}
      <Group header={<Header>Быстрые действия</Header>}>
        <CardGrid size="m">
          <Card mode="shadow" onClick={() => go('breathing')}>
            <Div style={{ textAlign: 'center' }}>
              <Icon28MoonOutline
                width={48}
                height={48}
                style={{ color: 'var(--vkui--color_accent_blue)' }}
              />
              <Spacing size={8} />
              <Text weight="2">Дыхание</Text>
            </Div>
          </Card>

          <Card mode="shadow" onClick={() => go('profile')}>
            <Div style={{ textAlign: 'center' }}>
              <Icon28UserOutline
                width={48}
                height={48}
                style={{ color: 'var(--vkui--color_accent_blue)' }}
              />
              <Spacing size={8} />
              <Text weight="2">Профиль</Text>
            </Div>
          </Card>
        </CardGrid>
      </Group>

      {/* Active quests */}
      <Group header={<Header>Активные задания</Header>}>
        {questsLoading ? (
          <Div style={{ textAlign: 'center' }}>
            <Spinner size="regular" />
          </Div>
        ) : activeQuests.length > 0 ? (
          activeQuests.slice(0, 3).map((quest) => (
            <SimpleCell
              key={quest.id}
              before={
                <Avatar size={40} style={{ backgroundColor: '#ffc107', fontSize: 20 }}>
                  {quest.type === 'daily' ? '📅' : quest.type === 'weekly' ? '📆' : '🏆'}
                </Avatar>
              }
              after={
                <Text weight="2" style={{ color: 'var(--vkui--color_accent_green)' }}>
                  +{quest.reward} XP
                </Text>
              }
              subtitle={`${quest.progress}/${quest.target}`}
            >
              {quest.title}
            </SimpleCell>
          ))
        ) : (
          <SimpleCell
            before={
              <Avatar size={40} style={{ backgroundColor: '#e1e3e6', fontSize: 20 }}>
                ✓
              </Avatar>
            }
          >
            Все задания выполнены!
          </SimpleCell>
        )}
      </Group>

      {/* Stats preview */}
      <Group header={<Header>Статистика</Header>}>
        <CardGrid size="l">
          <Card mode="outline">
            <Div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Icon28HeartCircleOutline
                width={32}
                height={32}
                style={{ color: 'var(--vkui--color_accent_red)' }}
              />
              <div>
                <Title level="2">{user?.streak || 0}</Title>
                <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                  дней подряд
                </Text>
              </div>
            </Div>
          </Card>

          <Card mode="outline">
            <Div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Icon28StatisticsOutline
                width={32}
                height={32}
                style={{ color: 'var(--vkui--color_accent_green)' }}
              />
              <div>
                <Title level="2">{user?.xp || 0}</Title>
                <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                  XP всего
                </Text>
              </div>
            </Div>
          </Card>
        </CardGrid>
      </Group>
    </>
  );
}
