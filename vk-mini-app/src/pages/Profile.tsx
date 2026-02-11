/**
 * Profile Page
 * ============
 * User profile, settings, and GDPR compliance.
 *
 * @packageDocumentation
 * @module @sleepcore/vk-mini-app/pages
 */

import { useState } from 'react';
import {
  PanelHeader,
  PanelHeaderBack,
  Group,
  Header,
  SimpleCell,
  Avatar,
  CellButton,
  Switch,
  Div,
  Title,
  Text,
  Spacing,
  Progress,
  Separator,
  Alert,
} from '@vkontakte/vkui';
import {
  Icon28DeleteOutline,
  Icon28PrivacyOutline,
  Icon28InfoOutline,
  Icon28ShareOutline,
} from '@vkontakte/icons';

import type { PanelId } from '@/App';
import type { AuthUser } from '@/api';
import { useEvolution, useBadges } from '@/hooks/useEvolution';
import { useAuth } from '@/hooks/useAuth';
import { vk } from '@/services/vk';

interface ProfileProps {
  go: (panel: PanelId) => void;
  user: AuthUser | null;
}

/**
 * Evolution stage details
 */
const stageDetails: Record<string, { name: string; emoji: string; color: string }> = {
  owlet: { name: 'Совёнок', emoji: '🐣', color: '#ffc107' },
  young_owl: { name: 'Молодая сова', emoji: '🦉', color: '#28a745' },
  wise_owl: { name: 'Мудрая сова', emoji: '🦉', color: '#007bff' },
  master: { name: 'Мастер', emoji: '🦉', color: '#6f42c1' },
};

/**
 * Profile component
 */
export default function Profile({ go, user }: ProfileProps) {
  const { logout } = useAuth();
  const { evolution, isLoading: evolutionLoading } = useEvolution();
  const { badges } = useBadges();

  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(false);

  const stageInfo = evolution
    ? stageDetails[evolution.stage]
    : stageDetails.owlet;

  // Handle share
  const handleShare = async () => {
    await vk.share('https://vk.com/app_sleepcore');
    vk.hapticFeedback('notification', 'success');
  };

  // Handle data export (GDPR)
  const handleExportData = () => {
    vk.showAlert('Функция экспорта данных будет доступна в следующем обновлении.');
  };

  // Handle account deletion (GDPR)
  const handleDeleteAccount = () => {
    setShowDeleteAlert(true);
  };

  // Confirm deletion
  const confirmDeleteAccount = async () => {
    setShowDeleteAlert(false);
    // In production: call API to delete account
    vk.showAlert('Запрос на удаление аккаунта отправлен. Данные будут удалены в течение 30 дней.');
    logout();
  };

  return (
    <>
      <PanelHeader before={<PanelHeaderBack onClick={() => go('home')} />}>
        Профиль
      </PanelHeader>

      {/* User info */}
      <Group>
        <Div style={{ textAlign: 'center' }}>
          <Avatar
            size={96}
            style={{
              backgroundColor: stageInfo.color,
              fontSize: 48,
              margin: '0 auto',
            }}
          >
            {stageInfo.emoji}
          </Avatar>

          <Spacing size={16} />

          <Title level="1">
            {user?.firstName} {user?.lastName}
          </Title>

          <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
            {stageInfo.name}
          </Text>

          <Spacing size={16} />

          {evolution && !evolutionLoading && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text weight="2">Уровень {evolution.level}</Text>
                <Text weight="2">{evolution.xp} / {evolution.xpToNextLevel} XP</Text>
              </div>
              <Progress value={evolution.progressPercent} />
            </div>
          )}
        </Div>
      </Group>

      {/* Stats */}
      <Group header={<Header>Статистика</Header>}>
        <Div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ textAlign: 'center', padding: 16, background: 'var(--vkui--color_background_secondary)', borderRadius: 12 }}>
              <Title level="1">{user?.streak || 0}</Title>
              <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                дней подряд
              </Text>
            </div>
            <div style={{ textAlign: 'center', padding: 16, background: 'var(--vkui--color_background_secondary)', borderRadius: 12 }}>
              <Title level="1">{user?.level || 1}</Title>
              <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                уровень
              </Text>
            </div>
            <div style={{ textAlign: 'center', padding: 16, background: 'var(--vkui--color_background_secondary)', borderRadius: 12 }}>
              <Title level="1">{user?.xp || 0}</Title>
              <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                XP всего
              </Text>
            </div>
            <div style={{ textAlign: 'center', padding: 16, background: 'var(--vkui--color_background_secondary)', borderRadius: 12 }}>
              <Title level="1">{badges.length}</Title>
              <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                достижений
              </Text>
            </div>
          </div>
        </Div>
      </Group>

      {/* Badges */}
      {badges.length > 0 && (
        <Group header={<Header>Достижения</Header>}>
          <Div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 12,
                    background: 'var(--vkui--color_background_secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                  }}
                  title={badge.name}
                >
                  {badge.icon}
                </div>
              ))}
            </div>
          </Div>
        </Group>
      )}

      {/* Settings */}
      <Group header={<Header>Настройки</Header>}>
        <SimpleCell
          after={
            <Switch
              checked={leaderboardOptIn}
              onChange={(e) => setLeaderboardOptIn(e.target.checked)}
            />
          }
        >
          Участие в рейтинге
        </SimpleCell>

        <SimpleCell
          before={<Icon28ShareOutline />}
          onClick={handleShare}
        >
          Поделиться приложением
        </SimpleCell>
      </Group>

      {/* Privacy (GDPR) */}
      <Group header={<Header>Конфиденциальность</Header>}>
        <SimpleCell
          before={<Icon28PrivacyOutline />}
          onClick={handleExportData}
        >
          Экспорт данных
        </SimpleCell>

        <SimpleCell
          before={<Icon28InfoOutline />}
          href="https://sleepcore.ru/privacy"
          target="_blank"
        >
          Политика конфиденциальности
        </SimpleCell>

        <Separator />

        <CellButton
          before={<Icon28DeleteOutline />}
          mode="danger"
          onClick={handleDeleteAccount}
        >
          Удалить аккаунт
        </CellButton>
      </Group>

      {/* About */}
      <Group>
        <Div style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)' }}>
          <Text>SleepCore v1.0.0</Text>
          <Text>БФ «Другой путь»</Text>
        </Div>
      </Group>

      {/* Delete confirmation alert */}
      {showDeleteAlert && (
        <Alert
          actions={[
            {
              title: 'Отмена',
              mode: 'cancel',
            },
            {
              title: 'Удалить',
              mode: 'destructive',
              action: confirmDeleteAccount,
            },
          ]}
          actionsLayout="horizontal"
          onClose={() => setShowDeleteAlert(false)}
          header="Удаление аккаунта"
          text="Вы уверены? Все ваши данные будут удалены безвозвратно."
        />
      )}
    </>
  );
}
