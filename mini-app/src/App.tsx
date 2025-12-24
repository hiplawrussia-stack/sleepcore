/**
 * App Component
 * =============
 * Root component with routing and Telegram initialization.
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home, Breathing, Profile } from '@/pages';
import { telegram } from '@/services/telegram';

// Bottom navigation component
const BottomNav: React.FC = () => {
  const location = window.location.pathname;

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
              location === item.path
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

export const App: React.FC = () => {
  // Initialize Telegram SDK on mount
  useEffect(() => {
    telegram.init();
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-night-900">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/breathing" element={<Breathing />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Bottom navigation - hidden during breathing exercise */}
        {!window.location.pathname.includes('/breathing') && <BottomNav />}
      </div>
    </BrowserRouter>
  );
};

export default App;
