/**
 * App Component
 * =============
 * Root component with routing, Telegram initialization, and TanStack Query.
 *
 * Performance optimizations:
 * - React.lazy() for code-splitting pages (~15-20% initial bundle reduction)
 * - CSS-only animations (eliminated motion library, saves ~23KB gzip)
 */

import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QueryProvider } from '@/providers/QueryProvider';
import { ErrorBoundary } from '@/components/common';
import { telegram } from '@/services/telegram';
import { env } from '@/env';
import { useAuth, useSync } from '@/hooks';

// Lazy-loaded pages for code splitting
const Home = React.lazy(() => import('@/pages/Home'));
const Breathing = React.lazy(() => import('@/pages/Breathing'));
const Profile = React.lazy(() => import('@/pages/Profile'));
const PrivacyPolicy = React.lazy(() => import('@/pages/PrivacyPolicy'));

// Bottom navigation component
const BottomNav: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: '🏠', label: t('navigation.home') },
    { path: '/breathing', icon: '🌬️', label: t('navigation.breathing') },
    { path: '/profile', icon: '👤', label: t('navigation.profile') },
  ];

  return (
    <nav
      role="navigation"
      aria-label={t('a11y.mainNavigation')}
      className="fixed bottom-0 left-0 right-0 bg-night-800/90 backdrop-blur-lg border-t border-night-700 safe-area-bottom"
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <a
              key={item.path}
              href={item.path}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? 'text-primary-400'
                  : 'text-night-400 hover:text-night-200'
              }`}
            >
              <span className="text-xl mb-0.5" aria-hidden="true">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
};

// Sync status indicator (optional - shows when offline or syncing)
const SyncIndicator: React.FC = () => {
  const { t } = useTranslation();
  const { isOnline, isSyncing, pendingCount } = useSync();

  if (isOnline && !isSyncing && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center py-1 safe-area-top">
      <div className="px-3 py-1 rounded-full text-xs font-medium bg-night-800/90 backdrop-blur-sm border border-night-700">
        {!isOnline && (
          <span className="text-amber-400">{t('common.offline')}</span>
        )}
        {isOnline && isSyncing && (
          <span className="text-primary-400">{t('common.syncing')}</span>
        )}
        {isOnline && !isSyncing && pendingCount > 0 && (
          <span className="text-amber-400">{t('common.pending', { count: pendingCount })}</span>
        )}
      </div>
    </div>
  );
};

// Auth loading screen
const AuthLoading: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-night-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">🦉</div>
        <p className="text-night-400 text-sm">{t('common.loading')}</p>
      </div>
    </div>
  );
};

// Page loading fallback for Suspense (lighter than AuthLoading)
const PageLoading: React.FC = () => {
  return (
    <div className="min-h-screen bg-night-900 flex items-center justify-center pb-16">
      <div className="text-2xl animate-pulse">🦉</div>
    </div>
  );
};

// Not in Telegram screen
const NotInTelegram: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-night-900 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">🦉</div>
        <h1 className="text-2xl font-bold text-night-100 mb-3">
          SleepCore
        </h1>
        <p className="text-night-400 text-base mb-6">
          {t('errors.notInTelegram')}
        </p>
        <a
          href="https://t.me/SleepCore_Bot"
          className="inline-block px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium"
        >
          {t('errors.openInTelegram')}
        </a>
      </div>
    </div>
  );
};

// Auth error screen
const AuthError: React.FC<{ error: string; onRetry: () => void }> = ({
  error,
  onRetry,
}) => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-night-900 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-4xl mb-4">😔</div>
        <h2 className="text-lg font-medium text-night-100 mb-2">
          {t('errors.auth')}
        </h2>
        <p className="text-night-400 text-sm mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          {t('common.retry')}
        </button>
      </div>
    </div>
  );
};

// App content with auth check
const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isAuthenticating, authError, authenticate } = useAuth();
  const location = useLocation();

  // Check if we're in Telegram environment
  const isInTelegram = telegram.isInTelegram();
  const isDev = env.DEV;

  // In production, if not in Telegram, show "open in Telegram" screen
  if (!isDev && !isInTelegram) {
    return <NotInTelegram />;
  }

  // Show loading while authenticating
  if (isAuthenticating) {
    return <AuthLoading />;
  }

  // Show error if auth failed
  if (authError && !isAuthenticated) {
    return <AuthError error={authError} onRetry={authenticate} />;
  }

  // In production, require authentication
  if (!isDev && !isAuthenticated) {
    return <AuthLoading />;
  }

  const showBottomNav = !location.pathname.includes('/breathing');

  return (
    <>
      {/* Skip to content link - WCAG 2.4.1 Bypass Blocks */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-500 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
      >
        {t('a11y.skipToContent')}
      </a>
      <SyncIndicator />
      <main id="main-content" role="main">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/breathing" element={<Breathing />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      {showBottomNav && <BottomNav />}
    </>
  );
};

export const App: React.FC = () => {
  // Initialize Telegram SDK on mount
  useEffect(() => {
    telegram.init();
  }, []);

  return (
    <ErrorBoundary>
      <QueryProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-night-900">
            <AppContent />
          </div>
        </BrowserRouter>
      </QueryProvider>
    </ErrorBoundary>
  );
};

export default App;
