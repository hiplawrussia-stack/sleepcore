/**
 * PrivacyCenter Component Tests
 * ==============================
 * Tests for GDPR data subject rights UI (Articles 15, 17, 20).
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - GDPR Art. 15: Right of access verification
 * - GDPR Art. 17: Right to erasure verification
 * - GDPR Art. 20: Data portability verification
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Use vi.hoisted() to create mock functions that can be used in vi.mock()
const { mockShowAlert, mockShowConfirm, mockOpenLink, mockLogout, mockClearPendingChanges, mockDeleteUserData, mockUserState, mockSyncState } = vi.hoisted(() => ({
  mockShowAlert: vi.fn().mockResolvedValue(undefined),
  mockShowConfirm: vi.fn().mockResolvedValue(true),
  mockOpenLink: vi.fn(),
  mockLogout: vi.fn(),
  mockClearPendingChanges: vi.fn(),
  mockDeleteUserData: vi.fn().mockResolvedValue({ success: true }),
  mockUserState: {
    user: {
      id: 'user-123',
      telegramId: 12345,
      firstName: 'Test',
      lastName: 'User',
      evolutionStage: 'owlet',
      xp: 100,
      level: 2,
      streak: 5,
    } as {
      id: string;
      telegramId: number;
      firstName: string;
      lastName?: string;
      evolutionStage: string;
      xp: number;
      level: number;
      streak: number;
    } | null,
  },
  mockSyncState: {
    pendingChanges: [] as unknown[],
    lastSyncTime: Date.now() as number | null,
  },
}));

// Mock useTelegram hook
vi.mock('../../src/hooks/useTelegram', () => ({
  useTelegram: () => ({
    showAlert: mockShowAlert,
    showConfirm: mockShowConfirm,
    openLink: mockOpenLink,
  }),
}));

// Mock stores
vi.mock('../../src/store/authStore', () => ({
  useAuthStore: () => ({
    user: mockUserState.user,
    logout: mockLogout,
  }),
}));

vi.mock('../../src/store/syncStore', () => ({
  useSyncStore: () => ({
    pendingChanges: mockSyncState.pendingChanges,
    lastSyncTime: mockSyncState.lastSyncTime,
    clearPendingChanges: mockClearPendingChanges,
  }),
}));

// Mock api service
vi.mock('../../src/services/api', () => ({
  api: {
    deleteUserData: mockDeleteUserData,
  },
}));

// Import after mocks
import { PrivacyCenter } from '../../src/components/common/PrivacyCenter';

describe('PrivacyCenter', () => {
  // Store original URL methods
  const originalCreateObjectURL = globalThis.URL.createObjectURL;
  const originalRevokeObjectURL = globalThis.URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock state
    mockUserState.user = {
      id: 'user-123',
      telegramId: 12345,
      firstName: 'Test',
      lastName: 'User',
      evolutionStage: 'owlet',
      xp: 100,
      level: 2,
      streak: 5,
    } as any;
    mockSyncState.pendingChanges = [];
    mockSyncState.lastSyncTime = Date.now();

    // Reset mock implementations
    mockShowAlert.mockResolvedValue(undefined);
    mockShowConfirm.mockResolvedValue(true);
    mockDeleteUserData.mockResolvedValue({ success: true });

    // Mock URL methods for jsdom
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    globalThis.URL.createObjectURL = originalCreateObjectURL;
    globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
    vi.resetAllMocks();
  });

  describe('rendering', () => {
    it('should render privacy center header', () => {
      render(<PrivacyCenter />);

      expect(screen.getByText('Приватность и данные')).toBeInTheDocument();
      expect(screen.getByText('Управление вашими персональными данными')).toBeInTheDocument();
    });

    it('should be collapsed by default', () => {
      const { container } = render(<PrivacyCenter />);

      // Content container should have collapsed CSS classes (max-h-0 opacity-0)
      const expandableContent = container.querySelector('.max-h-0.opacity-0');
      expect(expandableContent).toBeInTheDocument();
    });

    it('should expand when header is clicked', async () => {
      render(<PrivacyCenter />);

      // Click header to expand
      const header = screen.getByText('Приватность и данные');
      fireEvent.click(header);

      await waitFor(() => {
        expect(screen.getByText('Мои данные')).toBeInTheDocument();
        expect(screen.getByText('Экспорт данных')).toBeInTheDocument();
        expect(screen.getByText('Удалить данные')).toBeInTheDocument();
        expect(screen.getByText('Политика конфиденциальности')).toBeInTheDocument();
      });
    });

    it('should show GDPR articles reference when expanded', async () => {
      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));

      await waitFor(() => {
        expect(screen.getByText(/GDPR/)).toBeInTheDocument();
        expect(screen.getByText(/ст\. 15, 17, 20/)).toBeInTheDocument();
      });
    });

    it('should toggle expand state', async () => {
      const { container } = render(<PrivacyCenter />);

      // Initially collapsed - has max-h-0 opacity-0
      expect(container.querySelector('.max-h-0.opacity-0')).toBeInTheDocument();
      expect(container.querySelector('.max-h-\\[500px\\].opacity-100')).not.toBeInTheDocument();

      // Click to expand
      fireEvent.click(screen.getByText('Приватность и данные'));
      await waitFor(() => {
        // Expanded - has max-h-[500px] opacity-100
        expect(container.querySelector('.max-h-\\[500px\\].opacity-100')).toBeInTheDocument();
      });

      // Click to collapse
      fireEvent.click(screen.getByText('Приватность и данные'));
      await waitFor(() => {
        // Collapsed again
        expect(container.querySelector('.max-h-0.opacity-0')).toBeInTheDocument();
      });
    });
  });

  describe('Article 15: Right of Access', () => {
    it('should have "Мои данные" button with correct description', async () => {
      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));

      await waitFor(() => {
        expect(screen.getByText('Мои данные')).toBeInTheDocument();
        expect(screen.getByText('Просмотреть сохранённые данные')).toBeInTheDocument();
      });
    });

    it('should show user data in alert when clicked', async () => {
      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));
      await waitFor(() => expect(screen.getByText('Мои данные')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Мои данные'));

      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.stringContaining('ID: user-123')
      );
    });

    it('should display user profile information', async () => {
      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));
      await waitFor(() => expect(screen.getByText('Мои данные')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Мои данные'));

      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.stringContaining('Telegram ID: 12345')
      );
      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.stringContaining('Имя: Test User')
      );
      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.stringContaining('XP: 100')
      );
    });

    it('should show "no data" message when user is null', async () => {
      mockUserState.user = null as any;

      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));
      await waitFor(() => expect(screen.getByText('Мои данные')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Мои данные'));

      expect(mockShowAlert).toHaveBeenCalledWith('Данные профиля не загружены');
    });

    it('should show "Никогда" when no lastSyncTime', async () => {
      mockSyncState.lastSyncTime = null as any;

      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));
      await waitFor(() => expect(screen.getByText('Мои данные')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Мои данные'));

      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.stringContaining('Последняя синхр.: Никогда')
      );
    });

    it('should display pending changes count', async () => {
      mockSyncState.pendingChanges = [{ id: 1 }, { id: 2 }, { id: 3 }];

      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));
      await waitFor(() => expect(screen.getByText('Мои данные')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Мои данные'));

      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.stringContaining('Ожидающих синхр.: 3')
      );
    });

    it('should handle user without lastName', async () => {
      mockUserState.user = {
        id: 'user-456',
        telegramId: 67890,
        firstName: 'Solo',
        evolutionStage: 'owlet',
        xp: 50,
        level: 1,
        streak: 1,
      } as any;

      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));
      await waitFor(() => expect(screen.getByText('Мои данные')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Мои данные'));

      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.stringContaining('Имя: Solo')
      );
    });
  });

  describe('Article 20: Right to Data Portability', () => {
    it('should have "Экспорт данных" button with correct description', async () => {
      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));

      await waitFor(() => {
        expect(screen.getByText('Экспорт данных')).toBeInTheDocument();
        expect(screen.getByText('Скачать данные в формате JSON')).toBeInTheDocument();
      });
    });

    it('should export data as JSON when clicked', async () => {
      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));
      await waitFor(() => expect(screen.getByText('Экспорт данных')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Экспорт данных'));

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('✅ Данные экспортированы в JSON файл');
      });

      expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
      expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should handle export error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (globalThis.URL.createObjectURL as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Export failed');
      });

      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));
      await waitFor(() => expect(screen.getByText('Экспорт данных')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Экспорт данных'));

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('❌ Ошибка при экспорте данных');
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Article 17: Right to Erasure', () => {
    it('should have "Удалить данные" button with warning styling', async () => {
      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));

      await waitFor(() => {
        expect(screen.getByText('Удалить данные')).toBeInTheDocument();
        expect(screen.getByText('Удалить все персональные данные')).toBeInTheDocument();
      });
    });

    it('should show first confirmation dialog', async () => {
      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));
      await waitFor(() => expect(screen.getByText('Удалить данные')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Удалить данные'));

      await waitFor(() => {
        expect(mockShowConfirm).toHaveBeenCalledWith(
          expect.stringContaining('Вы уверены')
        );
      });
    });

    it('should stop if first confirmation is cancelled', async () => {
      mockShowConfirm.mockResolvedValueOnce(false);

      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));
      await waitFor(() => expect(screen.getByText('Удалить данные')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Удалить данные'));

      await waitFor(() => {
        expect(mockShowConfirm).toHaveBeenCalledTimes(1);
      });

      // Should not logout or clear data
      expect(mockLogout).not.toHaveBeenCalled();
      expect(mockClearPendingChanges).not.toHaveBeenCalled();
    });

    it('should show second confirmation dialog', async () => {
      mockShowConfirm.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));
      await waitFor(() => expect(screen.getByText('Удалить данные')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Удалить данные'));

      await waitFor(() => {
        expect(mockShowConfirm).toHaveBeenCalledTimes(2);
        expect(mockShowConfirm).toHaveBeenLastCalledWith(
          expect.stringContaining('ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ')
        );
      });
    });

    it('should delete all data when both confirmations accepted', async () => {
      mockShowConfirm.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));
      await waitFor(() => expect(screen.getByText('Удалить данные')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Удалить данные'));

      await waitFor(() => {
        expect(mockClearPendingChanges).toHaveBeenCalled();
        expect(mockLogout).toHaveBeenCalled();
        expect(mockDeleteUserData).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          expect.stringContaining('Все данные удалены')
        );
      });
    });

    it('should handle server deletion failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockDeleteUserData.mockResolvedValue({
        success: false,
        error: 'Server error',
      });

      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));
      await waitFor(() => expect(screen.getByText('Удалить данные')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Удалить данные'));

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          expect.stringContaining('Локальные данные удалены')
        );
      });

      consoleSpy.mockRestore();
    });

    it('should handle delete error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockDeleteUserData.mockRejectedValue(new Error('Network error'));

      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));
      await waitFor(() => expect(screen.getByText('Удалить данные')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Удалить данные'));

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('❌ Ошибка при удалении данных');
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Privacy Policy', () => {
    it('should have privacy policy link button', async () => {
      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));

      await waitFor(() => {
        expect(screen.getByText('Политика конфиденциальности')).toBeInTheDocument();
        expect(screen.getByText('Telegram Privacy Policy')).toBeInTheDocument();
      });
    });

    it('should open Telegram privacy policy link', async () => {
      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));
      await waitFor(() => expect(screen.getByText('Политика конфиденциальности')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Политика конфиденциальности'));

      expect(mockOpenLink).toHaveBeenCalledWith('https://telegram.org/privacy-tpa');
    });
  });

  describe('icons', () => {
    it('should display correct icons for each action', async () => {
      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));

      await waitFor(() => {
        // Check for icon emojis
        expect(screen.getByText('📋')).toBeInTheDocument();
        expect(screen.getByText('📥')).toBeInTheDocument();
        expect(screen.getByText('🗑️')).toBeInTheDocument();
        expect(screen.getByText('📜')).toBeInTheDocument();
      });
    });
  });
});
