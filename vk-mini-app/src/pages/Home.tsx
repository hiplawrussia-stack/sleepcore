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
import { useEvolution } from '@/hooks/useEvolution';
import { QuestsPanel } from '@/components/gamification/QuestsPanel';

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
            <Spinner size="s" />
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
      <QuestsPanel limit={3} activeOnly compact />

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
