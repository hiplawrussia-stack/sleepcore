/**
 * App Component
 * =============
 * Root component with routing, Telegram initialization, and TanStack Query.
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Home, Breathing, Profile } from '@/pages';
import { QueryProvider } from '@/providers/QueryProvider';
import { telegram } from '@/services/telegram';
import { useAuth, useSync } from '@/hooks';

// Bottom navigation component
const BottomNav: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: '🏠', label: 'Главная' },
    { path: '/breathing', icon: '🌬️', label: 'Дыхание' },
    { path: '/profile', icon: '👤', label: 'Профиль' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-night-800/90 backdrop-blur-lg border-t border-night-700 safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <a
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              location.pathname === item.path
                ? 'text-primary-400'
                : 'text-night-400 hover:text-night-200'
            }`}
          >
            <span className="text-xl mb-0.5">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
};

// Sync status indicator (optional - shows when offline or syncing)
const SyncIndicator: React.FC = () => {
  const { isOnline, isSyncing, pendingCount } = useSync();

  if (isOnline && !isSyncing && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center py-1 safe-area-top">
      <div className="px-3 py-1 rounded-full text-xs font-medium bg-night-800/90 backdrop-blur-sm border border-night-700">
        {!isOnline && (
          <span className="text-amber-400">Офлайн</span>
        )}
        {isOnline && isSyncing && (
          <span className="text-primary-400">Синхронизация...</span>
        )}
        {isOnline && !isSyncing && pendingCount > 0 && (
          <span className="text-amber-400">Ожидает: {pendingCount}</span>
        )}
      </div>
    </div>
  );
};

// Auth loading screen
const AuthLoading: React.FC = () => {
  return (
    <div className="min-h-screen bg-night-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">🦉</div>
        <p className="text-night-400 text-sm">Загрузка...</p>
      </div>
    </div>
  );
};

// Auth error screen
const AuthError: React.FC<{ error: string; onRetry: () => void }> = ({
  error,
  onRetry,
}) => {
  return (
    <div className="min-h-screen bg-night-900 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-4xl mb-4">😔</div>
        <h2 className="text-lg font-medium text-night-100 mb-2">
          Ошибка авторизации
        </h2>
        <p className="text-night-400 text-sm mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );
};

// App content with auth check
const AppContent: React.FC = () => {
  const { isAuthenticated, isAuthenticating, authError, authenticate } = useAuth();
  const location = useLocation();

  // Show loading while authenticating
  if (isAuthenticating) {
    return <AuthLoading />;
  }

  // Show error if auth failed
  if (authError && !isAuthenticated) {
    return <AuthError error={authError} onRetry={authenticate} />;
  }

  // In development, allow access without auth
  const isDev = import.meta.env.DEV;
  if (!isDev && !isAuthenticated) {
    return <AuthLoading />;
  }

  const showBottomNav = !location.pathname.includes('/breathing');

  return (
    <>
      <SyncIndicator />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/breathing" element={<Breathing />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
    <QueryProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-night-900">
          <AppContent />
        </div>
      </BrowserRouter>
    </QueryProvider>
  );
};

export default App;
