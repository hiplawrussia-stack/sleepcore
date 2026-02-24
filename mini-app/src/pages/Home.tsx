/**
 * Home Page
 * =========
 * Main landing page with quick access to breathing exercises
 * and user stats overview.
 *
 * PERFORMANCE: CSS-only animations for page transitions.
 * Saves ~8KB vs motion imports.
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/common';
import { useTelegram } from '@/hooks';
import { useUserStore } from '@/store';
import { haptics } from '@/services/haptics';
import {
  getFreePatterns,
  CATEGORY_ICONS,
  formatDuration,
  getPatternDuration,
} from '@/components/breathing/patterns';

export const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useTelegram();
  const { profile, stats, loadProfile, loadStats } = useUserStore();

  // Load user data on mount
  useEffect(() => {
    loadProfile();
    loadStats();
  }, [loadProfile, loadStats]);

  // Get greeting based on time of day
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 6) return t('home.greeting.night');
    if (hour < 12) return t('home.greeting.morning');
    if (hour < 18) return t('home.greeting.afternoon');
    if (hour < 22) return t('home.greeting.evening');
    return t('home.greeting.night');
  };

  // Quick access patterns (by category)
  const sleepPatterns = getFreePatterns().filter(p => p.category === 'sleep');
  const stressPatterns = getFreePatterns().filter(p => p.category === 'stress');

  return (
    <div className="min-h-screen bg-night-900 px-4 py-6 pb-20">
      {/* Header - CSS animation */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-night-100">
          {getGreeting()}, {user?.firstName || t('common.friend', 'друг')}!
        </h1>
        <p className="text-night-400 mt-1">
          {t('home.readyToPractice')}
        </p>
      </div>

      {/* Stats cards - CSS animation with delay */}
      {stats && (
        <div
          className="grid grid-cols-2 gap-3 mb-6 animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <Card variant="glass" className="text-center">
            <div className="text-3xl font-bold text-primary-400">
              {stats.totalSessions}
            </div>
            <div className="text-sm text-night-400">{t('home.stats.sessions')}</div>
          </Card>
          <Card variant="glass" className="text-center">
            <div className="text-3xl font-bold text-calm-green">
              {stats.currentStreak}
            </div>
            <div className="text-sm text-night-400">{t('home.stats.streak')}</div>
          </Card>
        </div>
      )}

      {/* Main CTA - Start breathing */}
      <div
        className="mb-6 animate-slide-up"
        style={{ animationDelay: '0.2s' }}
      >
        <Card
          variant="elevated"
          padding="lg"
          onClick={() => {
            haptics.impact('medium');
            navigate('/breathing');
          }}
          aria-label={t('a11y.home.startBreathingCard')}
          className="relative overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-transparent" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/20 flex items-center justify-center" aria-hidden="true">
              <span className="text-3xl">🌙</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-night-100">
                {t('home.startBreathing')}
              </h2>
              <p className="text-sm text-night-400">
                {t('home.chooseTechnique')}
              </p>
            </div>
            <svg
              className="w-6 h-6 text-night-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </Card>
      </div>

      {/* Quick patterns - For Sleep */}
      <div
        className="mb-6 animate-slide-up"
        style={{ animationDelay: '0.3s' }}
      >
        <h3 className="text-lg font-semibold text-night-100 mb-3 flex items-center gap-2">
          {CATEGORY_ICONS.sleep} {t('home.categories.sleep')}
        </h3>
        <div className="space-y-2">
          {sleepPatterns.map((pattern) => (
            <Card
              key={pattern.id}
              onClick={() => {
                haptics.selectionChanged();
                navigate(`/breathing?pattern=${pattern.id}`);
              }}
              aria-label={t('a11y.home.patternCard', { name: pattern.nameRu })}
              className="flex items-center gap-3"
            >
              <span className="text-2xl" aria-hidden="true">{pattern.icon}</span>
              <div className="flex-1">
                <div className="font-medium text-night-100">{pattern.nameRu}</div>
                <div className="text-xs text-night-400">
                  {pattern.inhale}-{pattern.hold}-{pattern.exhale} •{' '}
                  {formatDuration(getPatternDuration(pattern) * 3)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick patterns - Stress relief */}
      <div
        className="mb-6 animate-slide-up"
        style={{ animationDelay: '0.4s' }}
      >
        <h3 className="text-lg font-semibold text-night-100 mb-3 flex items-center gap-2">
          {CATEGORY_ICONS.stress} {t('home.categories.stress')}
        </h3>
        <div className="space-y-2">
          {stressPatterns.map((pattern) => (
            <Card
              key={pattern.id}
              onClick={() => {
                haptics.selectionChanged();
                navigate(`/breathing?pattern=${pattern.id}`);
              }}
              aria-label={t('a11y.home.patternCard', { name: pattern.nameRu })}
              className="flex items-center gap-3"
            >
              <span className="text-2xl" aria-hidden="true">{pattern.icon}</span>
              <div className="flex-1">
                <div className="font-medium text-night-100">{pattern.nameRu}</div>
                <div className="text-xs text-night-400">
                  {pattern.inhale}-{pattern.hold}-{pattern.exhale} •{' '}
                  {formatDuration(getPatternDuration(pattern) * 3)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Sonya greeting */}
      {profile && (
        <div
          className="animate-slide-up"
          style={{ animationDelay: '0.5s' }}
        >
          <Card variant="glass" className="flex items-center gap-4">
            <div className="text-4xl">
              {profile.evolutionStage === 'wise_owl'
                ? '🦉✨'
                : profile.evolutionStage === 'young_owl'
                ? '🦉'
                : '🐣'}
            </div>
            <div>
              <div className="font-medium text-night-100">
                {t('home.sonya.greeting')}
              </div>
              <div className="text-sm text-night-400">
                {profile.xp} XP • {t('home.sonya.level')}:{' '}
                {profile.evolutionStage === 'wise_owl'
                  ? t('profile.evolution.wiseOwl')
                  : profile.evolutionStage === 'young_owl'
                  ? t('profile.evolution.youngOwl')
                  : t('profile.evolution.owlet')}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Home;
