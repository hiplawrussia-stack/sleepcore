/**
 * Privacy Center Component (VK Mini App)
 * =======================================
 * GDPR-compliant privacy management center.
 * Uses VKUI components for native VK experience.
 *
 * GDPR Compliance:
 * - Article 15: Right of Access (view data)
 * - Article 17: Right to Erasure (delete data)
 * - Article 20: Right to Data Portability (export JSON)
 * - Article 7(3): Withdrawal as easy as consent
 *
 * @see CLAUDE.md - GDPR Data Protection
 * @module @sleepcore/vk-mini-app/components/common
 */

import React, { useState, useCallback } from 'react';
import {
  Group,
  SimpleCell,
  Card,
  Div,
  Text,
  Spacing,
  Spinner,
  Button,
  ButtonGroup,
  Snackbar,
  ModalCard,
  ModalRoot,
} from '@vkontakte/vkui';
import {
  Icon28DownloadOutline,
  Icon28DeleteOutline,
  Icon28DocumentOutline,
  Icon28LockOutline,
  Icon28DoneOutline,
  Icon28CancelOutline,
  Icon28ChevronDownOutline,
  Icon28ChevronUpOutline,
} from '@vkontakte/icons';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
import { vk } from '@/services/vk';

/**
 * User data export structure
 * GDPR Article 20: machine-readable format
 */
interface UserDataExport {
  exportDate: string;
  gdprVersion: string;
  userData: {
    id: string;
    vkId: number;
    firstName: string;
    lastName?: string;
    evolutionStage: string;
    xp: number;
    level: number;
    streak?: number;
  } | null;
  pendingChanges: number;
  lastSyncTime: string | null;
}

interface PrivacyCenterProps {
  /** Callback when user requests data deletion */
  onDeleteData?: () => Promise<void>;
  /** Privacy policy URL */
  privacyPolicyUrl?: string;
}

type SnackbarType = 'success' | 'error' | null;

/**
 * Privacy Center component
 */
export const PrivacyCenter: React.FC<PrivacyCenterProps> = ({
  onDeleteData,
  privacyPolicyUrl = 'https://sleepcore.ru/privacy',
}) => {
  const { user, logout } = useAuthStore();
  const { pendingChanges, lastSyncTime, clearPendingChanges } = useSyncStore();

  // UI state
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [snackbar, setSnackbar] = useState<{ type: SnackbarType; message: string } | null>(null);

  /**
   * Export user data as JSON (GDPR Article 20)
   */
  const handleExportData = useCallback(async () => {
    setIsExporting(true);
    vk.hapticFeedback('impact', 'light');

    try {
      const exportData: UserDataExport = {
        exportDate: new Date().toISOString(),
        gdprVersion: '2.0',
        userData: user
          ? {
              id: user.id,
              vkId: user.vkId,
              firstName: user.firstName,
              lastName: user.lastName,
              evolutionStage: user.evolutionStage,
              xp: user.xp,
              level: user.level,
              streak: user.streak,
            }
          : null,
        pendingChanges: pendingChanges.length,
        lastSyncTime: lastSyncTime ? new Date(lastSyncTime).toISOString() : null,
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sleepcore-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      vk.hapticFeedback('notification', 'success');
      setSnackbar({ type: 'success', message: 'Данные экспортированы' });
    } catch (error) {
      console.error('[PrivacyCenter] Export failed:', error);
      vk.hapticFeedback('notification', 'error');
      setSnackbar({ type: 'error', message: 'Ошибка экспорта данных' });
    } finally {
      setIsExporting(false);
    }
  }, [user, pendingChanges.length, lastSyncTime]);

  /**
   * Delete all user data (GDPR Article 17)
   */
  const handleDeleteData = useCallback(async () => {
    setIsDeleting(true);
    vk.hapticFeedback('notification', 'warning');

    try {
      // Call server-side deletion if provided
      if (onDeleteData) {
        await onDeleteData();
      }

      // Clear local storage
      clearPendingChanges();

      // Clear session storage
      sessionStorage.removeItem('sleepcore-vk-auth');

      // Clear any other localStorage items
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sleepcore-vk')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Logout user
      logout();

      vk.hapticFeedback('notification', 'success');
      setSnackbar({ type: 'success', message: 'Все данные удалены' });
      setShowDeleteModal(false);
    } catch (error) {
      console.error('[PrivacyCenter] Delete failed:', error);
      vk.hapticFeedback('notification', 'error');
      setSnackbar({ type: 'error', message: 'Ошибка удаления данных' });
    } finally {
      setIsDeleting(false);
    }
  }, [onDeleteData, clearPendingChanges, logout]);

  /**
   * Open privacy policy link
   */
  const handleOpenPrivacyPolicy = useCallback(() => {
    window.open(privacyPolicyUrl, '_blank');
    vk.hapticFeedback('selection_change');
  }, [privacyPolicyUrl]);

  /**
   * Toggle expanded state
   */
  const handleToggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
    vk.hapticFeedback('selection_change');
  }, []);

  /**
   * Delete confirmation modal
   */
  const deleteModal = (
    <ModalRoot
      activeModal={showDeleteModal ? 'delete-confirm' : null}
      onClose={() => setShowDeleteModal(false)}
    >
      <ModalCard
        id="delete-confirm"
        onClose={() => setShowDeleteModal(false)}
        icon={<Icon28DeleteOutline width={56} height={56} style={{ color: '#e64646' }} />}
        actions={
          <ButtonGroup mode="horizontal" gap="s" stretched>
            <Button
              size="l"
              mode="secondary"
              stretched
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Отмена
            </Button>
            <Button
              size="l"
              mode="primary"
              appearance="negative"
              stretched
              loading={isDeleting}
              onClick={handleDeleteData}
            >
              Удалить
            </Button>
          </ButtonGroup>
        }
      >
        <Text weight="1" style={{ fontSize: 20, marginBottom: 8 }}>
          Удалить все данные?
        </Text>
        <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
          Это действие необратимо. Все ваши данные будут удалены с сервера и устройства.
        </Text>
      </ModalCard>
    </ModalRoot>
  );

  /**
   * Snackbar notification
   */
  const snackbarElement = snackbar && (
    <Snackbar
      onClose={() => setSnackbar(null)}
      before={
        snackbar.type === 'success' ? (
          <Icon28DoneOutline fill="var(--vkui--color_accent_green)" />
        ) : (
          <Icon28CancelOutline fill="var(--vkui--color_accent_red)" />
        )
      }
    >
      {snackbar.message}
    </Snackbar>
  );

  return (
    <>
      {deleteModal}

      <Group>
        <SimpleCell
          onClick={handleToggleExpanded}
          before={<Icon28LockOutline />}
          after={
            isExpanded ? (
              <Icon28ChevronUpOutline />
            ) : (
              <Icon28ChevronDownOutline />
            )
          }
          subtitle="GDPR: доступ, экспорт, удаление"
        >
          Центр приватности
        </SimpleCell>

        {isExpanded && (
          <>
            <Spacing size={8} />

            {/* Data Overview */}
            <Div>
              <Card mode="outline" style={{ padding: 16 }}>
                <Text weight="2" style={{ marginBottom: 12 }}>
                  Ваши данные
                </Text>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                      VK ID
                    </Text>
                    <Text weight="2">{user?.vkId || '—'}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                      Имя
                    </Text>
                    <Text weight="2">
                      {user ? `${user.firstName} ${user.lastName || ''}`.trim() : '—'}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                      Уровень
                    </Text>
                    <Text weight="2">{user?.level || 0}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                      Несинхронизировано
                    </Text>
                    <Text weight="2">{pendingChanges.length} изменений</Text>
                  </div>
                </div>
              </Card>
            </Div>

            <Spacing size={8} />

            {/* GDPR Actions */}
            <Div style={{ padding: '8px 16px 4px' }}>
              <Text weight="3" style={{ color: 'var(--vkui--color_text_secondary)', textTransform: 'uppercase', fontSize: 13 }}>
                Права по GDPR
              </Text>
            </Div>

            {/* Article 15: Right of Access */}
            <SimpleCell
              before={<Icon28DocumentOutline />}
              subtitle="Статья 15 GDPR"
              onClick={handleOpenPrivacyPolicy}
            >
              Политика конфиденциальности
            </SimpleCell>

            {/* Article 20: Data Portability */}
            <SimpleCell
              before={<Icon28DownloadOutline />}
              subtitle="Статья 20 GDPR"
              after={isExporting && <Spinner size="s" />}
              disabled={isExporting}
              onClick={handleExportData}
            >
              Экспортировать данные (JSON)
            </SimpleCell>

            {/* Article 17: Right to Erasure */}
            <SimpleCell
              before={<Icon28DeleteOutline style={{ color: 'var(--vkui--color_accent_red)' }} />}
              subtitle="Статья 17 GDPR"
              onClick={() => setShowDeleteModal(true)}
              style={{ color: 'var(--vkui--color_text_negative)' }}
            >
              Удалить все данные
            </SimpleCell>

            <Spacing size={8} />

            <Div>
              <Text
                style={{
                  color: 'var(--vkui--color_text_tertiary)',
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                Согласно GDPR, вы имеете право на доступ, исправление, удаление и
                переносимость ваших персональных данных.
              </Text>
            </Div>
          </>
        )}
      </Group>

      {snackbarElement}
    </>
  );
};

export default PrivacyCenter;
