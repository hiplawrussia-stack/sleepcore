/**
 * PrivacyCenter Component Tests
 * ==============================
 * Tests for GDPR data subject rights UI (Articles 15, 17, 20).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock stores before importing component
vi.mock('../../src/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: {
      id: 'user-123',
      telegramId: 12345,
      firstName: 'Test',
      lastName: 'User',
      evolutionStage: 'owlet',
      xp: 100,
      level: 2,
      streak: 5,
    },
    logout: vi.fn(),
  })),
}));

vi.mock('../../src/store/syncStore', () => ({
  useSyncStore: vi.fn(() => ({
    pendingChanges: [],
    lastSyncTime: Date.now(),
    clearPendingChanges: vi.fn(),
  })),
}));

// Import after mocks
import { PrivacyCenter } from '../../src/components/common/PrivacyCenter';

describe('PrivacyCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render privacy center header', () => {
      render(<PrivacyCenter />);

      expect(screen.getByText('Приватность и данные')).toBeInTheDocument();
      expect(screen.getByText('Управление вашими персональными данными')).toBeInTheDocument();
    });

    it('should be collapsed by default', () => {
      render(<PrivacyCenter />);

      // Options should not be visible initially
      expect(screen.queryByText('Мои данные')).not.toBeInTheDocument();
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
  });

  describe('Article 17: Right to Erasure', () => {
    it('should have "Удалить данные" button with warning styling', async () => {
      render(<PrivacyCenter />);

      fireEvent.click(screen.getByText('Приватность и данные'));

      await waitFor(() => {
        const deleteButton = screen.getByText('Удалить данные');
        expect(deleteButton).toBeInTheDocument();
        expect(screen.getByText('Удалить все персональные данные')).toBeInTheDocument();
      });
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
