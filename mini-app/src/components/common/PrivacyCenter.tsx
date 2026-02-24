/**
 * Privacy Center Component - GDPR Data Subject Rights
 * =====================================================
 * Implements GDPR Articles 15, 17, 20 user rights:
 * - Article 15: Right of Access
 * - Article 17: Right to Erasure
 * - Article 20: Right to Data Portability
 *
 * PERFORMANCE: CSS-only animations, no motion dependency.
 *
 * Compliance:
 * - GDPR Chapter 3 (Rights of the Data Subject)
 * - Clear and plain language requirement
 *
 * @see CLAUDE.md §9.3 - GDPR Data Protection
 * @see https://gdpr-info.eu/chapter-3/
 * @module @sleepcore/mini-app/components
 */

import React, { useState } from 'react';
import { Card } from './Card';
import { useTelegram } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
import { apiClient } from '@/api';

interface UserDataExport {
  exportDate: string;
  userData: {
    id: string;
    telegramId: number;
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

export const PrivacyCenter: React.FC = () => {
  const { showAlert, showConfirm, openLink } = useTelegram();
  const { user, logout } = useAuthStore();
  const { pendingChanges, lastSyncTime, clearPendingChanges } = useSyncStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Article 15: Right of Access
   * Show user all their stored data
   */
  const handleViewData = () => {
    const userData = {
      profile: user,
      pendingChangesCount: pendingChanges.length,
      lastSync: lastSyncTime ? new Date(lastSyncTime).toLocaleString('ru-RU') : 'Никогда',
    };

    // Format for display
    const dataDisplay = user
      ? `📋 Ваши данные:\n\n` +
        `👤 ID: ${user.id}\n` +
        `📱 Telegram ID: ${user.telegramId}\n` +
        `📛 Имя: ${user.firstName}${user.lastName ? ' ' + user.lastName : ''}\n` +
        `🦉 Стадия: ${user.evolutionStage}\n` +
        `⭐ XP: ${user.xp}\n` +
        `📊 Уровень: ${user.level}\n` +
        `🔥 Streak: ${user.streak}\n\n` +
        `⏳ Ожидающих синхр.: ${userData.pendingChangesCount}\n` +
        `🔄 Последняя синхр.: ${userData.lastSync}`
      : 'Данные профиля не загружены';

    showAlert(dataDisplay);
  };

  /**
   * Article 20: Right to Data Portability
   * Export user data in machine-readable format (JSON)
   */
  const handleExportData = async () => {
    setIsExporting(true);

    try {
      const exportData: UserDataExport = {
        exportDate: new Date().toISOString(),
        userData: user,
        pendingChanges: pendingChanges.length,
        lastSyncTime: lastSyncTime ? new Date(lastSyncTime).toISOString() : null,
      };

      // Create downloadable JSON file
      const blob = new Blob(
        [JSON.stringify(exportData, null, 2)],
        { type: 'application/json' }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sleepcore-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await showAlert('✅ Данные экспортированы в JSON файл');
    } catch (error) {
      console.error('[PrivacyCenter] Export failed:', error);
      await showAlert('❌ Ошибка при экспорте данных');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Article 17: Right to Erasure ("Right to be Forgotten")
   * Delete all user data with confirmation
   */
  const handleDeleteData = async () => {
    setIsDeleting(true);

    try {
      // First confirmation
      const confirmed = await showConfirm(
        '⚠️ Вы уверены, что хотите удалить ВСЕ свои данные?\n\n' +
        'Это действие нельзя отменить. Будут удалены:\n' +
        '• Данные профиля\n' +
        '• История сессий\n' +
        '• Прогресс и достижения'
      );

      if (!confirmed) {
        setIsDeleting(false);
        return;
      }

      // Second confirmation for critical action
      const doubleConfirmed = await showConfirm(
        '🚨 ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ\n\n' +
        'После удаления восстановить данные будет невозможно.\n\n' +
        'Продолжить удаление?'
      );

      if (!doubleConfirmed) {
        setIsDeleting(false);
        return;
      }

      // Clear local storage
      clearPendingChanges();
      logout();

      // Clear all localStorage items with sleepcore prefix
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sleepcore')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // GDPR Article 17: Delete server-side data
      try {
        await apiClient.request<{ deleted: boolean; message: string }>('/user/data', {
          method: 'DELETE',
        });
        await showAlert(
          '✅ Все данные удалены\n\n' +
          'Локальные и серверные данные успешно удалены согласно GDPR Article 17.'
        );
      } catch (deleteError) {
        // Local data deleted, but server deletion failed
        console.error('[PrivacyCenter] Server deletion failed:', deleteError);
        await showAlert(
          '⚠️ Локальные данные удалены\n\n' +
          'Не удалось удалить данные с сервера. ' +
          'Свяжитесь с поддержкой через @SleepCore_Bot для полного удаления.'
        );
      }
    } catch (error) {
      console.error('[PrivacyCenter] Delete failed:', error);
      await showAlert('❌ Ошибка при удалении данных');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Open privacy policy
   */
  const handleOpenPrivacyPolicy = () => {
    // Use Telegram's standard bot privacy policy or custom URL
    openLink('https://telegram.org/privacy-tpa');
  };

  return (
    <Card className="overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={isExpanded}
        aria-controls="privacy-content"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl" aria-hidden="true">🔒</span>
          <div>
            <div className="font-medium text-night-100">Приватность и данные</div>
            <div className="text-xs text-night-400">
              Управление вашими персональными данными
            </div>
          </div>
        </div>
        <span
          className={`text-night-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>

      {/* Expandable content - CSS transition */}
      <div
        id="privacy-content"
        className={`overflow-hidden transition-all duration-200 ease-out ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
        aria-hidden={!isExpanded}
      >
        <div className="pt-4 space-y-3">
          {/* Article 15: Right of Access */}
          <button
            onClick={handleViewData}
            aria-label="Просмотреть мои сохранённые данные"
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-night-700/50 hover:bg-night-700 transition-colors text-left"
          >
            <span className="text-lg" aria-hidden="true">📋</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-night-100">Мои данные</div>
              <div className="text-xs text-night-400">
                Просмотреть сохранённые данные
              </div>
            </div>
          </button>

          {/* Article 20: Right to Data Portability */}
          <button
            onClick={handleExportData}
            disabled={isExporting}
            aria-label={isExporting ? 'Экспортируем данные' : 'Экспортировать данные в JSON'}
            aria-busy={isExporting}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-night-700/50 hover:bg-night-700 transition-colors text-left disabled:opacity-50"
          >
            <span className="text-lg" aria-hidden="true">{isExporting ? '⏳' : '📥'}</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-night-100">
                {isExporting ? 'Экспортируем...' : 'Экспорт данных'}
              </div>
              <div className="text-xs text-night-400">
                Скачать данные в формате JSON
              </div>
            </div>
          </button>

          {/* Article 17: Right to Erasure */}
          <button
            onClick={handleDeleteData}
            disabled={isDeleting}
            aria-label={isDeleting ? 'Удаляем данные' : 'Удалить все персональные данные'}
            aria-busy={isDeleting}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-900/20 hover:bg-red-900/30 transition-colors text-left disabled:opacity-50"
          >
            <span className="text-lg" aria-hidden="true">{isDeleting ? '⏳' : '🗑️'}</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-red-400">
                {isDeleting ? 'Удаляем...' : 'Удалить данные'}
              </div>
              <div className="text-xs text-night-400">
                Удалить все персональные данные
              </div>
            </div>
          </button>

          {/* Privacy Policy Link */}
          <button
            onClick={handleOpenPrivacyPolicy}
            aria-label="Открыть политику конфиденциальности"
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-night-700/50 hover:bg-night-700 transition-colors text-left"
          >
            <span className="text-lg" aria-hidden="true">📜</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-night-100">
                Политика конфиденциальности
              </div>
              <div className="text-xs text-night-400">
                Telegram Privacy Policy
              </div>
            </div>
          </button>

          {/* GDPR Notice */}
          <div className="pt-2 text-xs text-night-400 text-center">
            Согласно GDPR (ст. 15, 17, 20) вы имеете право на доступ,
            удаление и переносимость ваших данных
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PrivacyCenter;
