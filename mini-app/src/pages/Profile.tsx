/**
 * Profile Page
 * ============
 * User profile with stats, achievements, and settings.
 *
 * PERFORMANCE: CSS-only animations, lazy-loaded QuestsPanel.
 * Uses TanStack Query for server state management.
 */

import React, { useEffect, Suspense, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/common';
import { useTelegram, useHaptics, useUserProfile, useBreathingStats, useEvolution, useLeaderboard } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import { formatDuration } from '@/components/breathing/patterns';
import { haptics } from '@/services/haptics';

// Lazy load heavy components
const QuestsPanel = React.lazy(() => import('@/components/gamification/QuestsPanel'));
const PrivacyCenter = React.lazy(() => import('@/components/common/PrivacyCenter'));
const Leaderboard = React.lazy(() => import('@/components/gamification/Leaderboard'));

// Feature flags
import { Feature } from '@/services/featureFlags';

// Simple loading placeholder
const ComponentLoader: React.FC = () => (
  <div className="animate-pulse">
    <div className="h-32 bg-night-800 rounded-2xl" />
  </div>
);

/** Supported languages */
const LANGUAGES = [
  { code: 'ru', flag: '🇷🇺' },
  { code: 'en', flag: '🇬🇧' },
] as const;

export const Profile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, showBackButton, hideBackButton } = useTelegram();
  const { isEnabled: hapticsEnabled, setEnabled: setHapticsEnabled, isSupported: hapticsSupported, debugInfo: hapticsDebug } = useHaptics();

  // Language state
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'ru');

  // TanStack Query hooks for server state
  const { profile, isLoading: isLoadingProfile, isError: isErrorProfile, refetch: refetchProfile } = useUserProfile();
  const { stats, isLoading: isLoadingStats, isError: isErrorStats, refetch: refetchStats } = useBreathingStats();
  const { evolution, isLoading: isLoadingEvolution, isError: isErrorEvolution, refetch: refetchEvolution } = useEvolution();
  const {
    entries: leaderboardEntries,
    settings: leaderboardSettings,
    isLoading: isLoadingLeaderboard,
    optIn: leaderboardOptIn,
    optOut: leaderboardOptOut,
  } = useLeaderboard();

  // Get auth state to check if queries can run
  const { isAuthenticated, isAuthenticating } = useAuthStore();

  // Show loading when: auth in progress OR queries loading OR waiting for auth to enable queries
  const isLoading = isAuthenticating || isLoadingProfile || isLoadingStats || isLoadingEvolution || !isAuthenticated;

  // Check for errors
  const hasError = isErrorProfile || isErrorStats || isErrorEvolution;

  // Retry all failed queries
  const handleRetry = () => {
    if (isErrorProfile) refetchProfile();
    if (isErrorStats) refetchStats();
    if (isErrorEvolution) refetchEvolution();
  };

  /**
   * Handle language change
   * Uses i18next changeLanguage API and persists to localStorage
   */
  const handleLanguageChange = useCallback((langCode: string) => {
    haptics.selectionChanged();
    i18n.changeLanguage(langCode);
    setCurrentLanguage(langCode);
    // i18next-browser-languagedetector handles persistence automatically
  }, [i18n]);

  // Setup back button
  useEffect(() => {
    showBackButton(() => {
      navigate('/');
    });

    return () => {
      hideBackButton();
    };
  }, [showBackButton, hideBackButton, navigate]);

  // Evolution stage info from API
  const getEvolutionInfo = () => {
    if (evolution) {
      return {
        emoji: evolution.stageEmoji,
        name: evolution.stageName,
        description: evolution.nextStage
          ? t('profile.evolution.daysActive', { count: evolution.daysActive })
          : t('profile.evolution.wiseOwlDesc'),
        progress: evolution.progress,
        nextStage: evolution.nextStage,
        daysToNext: evolution.daysToNext,
      };
    }

    // Fallback to profile data
    if (!profile) return null;

    const stages = {
      owlet: {
        emoji: '🐣',
        name: t('profile.evolution.owletName'),
        description: t('profile.evolution.owletDesc'),
        nextStage: 'young_owl',
        progress: 0,
        daysToNext: null,
      },
      young_owl: {
        emoji: '🦉',
        name: t('profile.evolution.youngOwlName'),
        description: t('profile.evolution.youngOwlDesc'),
        nextStage: 'wise_owl',
        progress: 0,
        daysToNext: null,
      },
      wise_owl: {
        emoji: '🦉✨',
        name: t('profile.evolution.wiseOwlName'),
        description: t('profile.evolution.wiseOwlDesc'),
        nextStage: null,
        progress: 100,
        daysToNext: null,
      },
      master: {
        emoji: '🏆🦉',
        name: t('profile.evolution.masterName'),
        description: t('profile.evolution.masterDesc'),
        nextStage: null,
        progress: 100,
        daysToNext: null,
      },
    };

    return stages[profile.evolutionStage] || stages.owlet;
  };

  const evolutionInfo = getEvolutionInfo();

  // Error state - show error with retry
  if (hasError && !isLoading) {
    return (
      <div className="min-h-screen bg-night-900 px-4 py-6 pb-20 flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">😔</div>
        <h2 className="text-xl font-semibold text-night-100 mb-2">
          {t('common.error')}
        </h2>
        <p className="text-night-400 mb-6 text-center max-w-xs">
          {t('errors.generic')}
        </p>
        <button
          onClick={handleRetry}
          className="px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-night-900 px-4 py-6 pb-20">
        <div className="animate-pulse">
          <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-night-700" />
          <div className="h-6 bg-night-700 rounded w-32 mx-auto mb-2" />
          <div className="h-4 bg-night-700 rounded w-24 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-night-900 px-4 py-6 pb-20">
      {/* Header with avatar - CSS animation */}
      <div className="text-center mb-6 animate-fade-in">
        {/* User avatar placeholder */}
        <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-night-700 flex items-center justify-center">
          <span className="text-4xl">
            {evolutionInfo?.emoji || '👤'}
          </span>
        </div>
        <h1 className="text-xl font-bold text-night-100">
          {profile?.firstName || user?.firstName} {profile?.lastName || user?.lastName}
        </h1>
        {(profile?.username || user?.username) && (
          <p className="text-night-400">@{profile?.username || user?.username}</p>
        )}
      </div>

      {/* Evolution card */}
      {evolutionInfo && (
        <div
          className="mb-6 animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <Card variant="glass" aria-label={t('a11y.home.evolutionCard', { stage: evolutionInfo.name })}>
            <div className="flex items-center gap-4 mb-3">
              <span className="text-4xl" aria-hidden="true">{evolutionInfo.emoji}</span>
              <div className="flex-1">
                <div className="font-semibold text-night-100">
                  {evolutionInfo.name}
                </div>
                <div className="text-sm text-night-400">
                  {evolutionInfo.description}
                </div>
              </div>
            </div>
            {evolutionInfo.nextStage && (
              <>
                <div
                  className="h-2 bg-night-700 rounded-full overflow-hidden mb-2"
                  role="progressbar"
                  aria-valuenow={evolutionInfo.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t('a11y.profile.progressBar', { percent: evolutionInfo.progress })}
                >
                  <div
                    style={{ width: `${evolutionInfo.progress}%` }}
                    className="h-full bg-gradient-to-r from-primary-500 to-calm-purple rounded-full transition-all duration-500"
                  />
                </div>
                <div className="text-xs text-night-400">
                  {evolutionInfo.daysToNext
                    ? t('profile.evolution.daysToNext', { count: evolutionInfo.daysToNext })
                    : t('profile.evolution.progress', { percent: evolutionInfo.progress })}
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Stats grid */}
      {stats && (
        <div
          className="grid grid-cols-2 gap-3 mb-6 animate-slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          <Card className="text-center">
            <div className="text-2xl font-bold text-primary-400">
              {stats.totalSessions}
            </div>
            <div className="text-xs text-night-400">{t('profile.stats.totalSessions')}</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-calm-blue">
              {formatDuration(stats.totalMinutes * 60)}
            </div>
            <div className="text-xs text-night-400">{t('profile.stats.totalTime')}</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-calm-green">
              {stats.currentStreak}
            </div>
            <div className="text-xs text-night-400">{t('profile.stats.currentStreak')}</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-calm-amber">
              {stats.longestStreak}
            </div>
            <div className="text-xs text-night-400">{t('profile.stats.longestStreak')}</div>
          </Card>
        </div>
      )}

      {/* Quests Panel - Lazy loaded */}
      <div
        className="mb-6 animate-slide-up"
        style={{ animationDelay: '0.22s' }}
      >
        <Suspense fallback={<ComponentLoader />}>
          <QuestsPanel limit={3} activeOnly />
        </Suspense>
      </div>

      {/* Leaderboard - Feature flagged */}
      <Feature flag="leaderboard">
        <div
          className="mb-6 animate-slide-up"
          style={{ animationDelay: '0.24s' }}
        >
          <Suspense fallback={<ComponentLoader />}>
            <Leaderboard
              entries={leaderboardEntries}
              settings={leaderboardSettings}
              isLoading={isLoadingLeaderboard}
              onOptIn={leaderboardOptIn}
              onOptOut={leaderboardOptOut}
            />
          </Suspense>
        </div>
      </Feature>

      {/* Weekly progress chart */}
      {stats?.weeklyProgress && stats.weeklyProgress.length > 0 && (
        <div
          className="mb-6 animate-slide-up"
          style={{ animationDelay: '0.25s' }}
        >
          <Card>
            <div className="text-sm font-medium text-night-300 mb-3">
              {t('profile.stats.weekActivity')}
            </div>
            <div className="flex items-end justify-between h-16 gap-1">
              {(() => {
                // Performance: Calculate max once, not inside map loop
                const maxMinutes = Math.max(...stats.weeklyProgress, 1);
                const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

                return stats.weeklyProgress.map((minutes, index) => {
                  const height = (minutes / maxMinutes) * 100;

                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        style={{ height: `${Math.max(height, 4)}%` }}
                        className={`w-full rounded-t transition-all duration-300 ${
                          minutes > 0 ? 'bg-primary-500' : 'bg-night-700'
                        }`}
                      />
                      <span className="text-[10px] text-night-400 mt-1">
                        {t(`profile.stats.days.${dayKeys[index]}`)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </Card>
        </div>
      )}

      {/* XP progress */}
      {profile && (
        <div
          className="mb-6 animate-slide-up"
          style={{ animationDelay: '0.3s' }}
        >
          <Card>
            <div className="flex justify-between items-center mb-2">
              <span className="text-night-300">{t('profile.level', { level: profile.level })}</span>
              <span className="font-bold text-primary-400">{profile.xp} XP</span>
            </div>
            <div
              className="h-2 bg-night-700 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={profile.xp % 100}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('a11y.profile.progressBar', { percent: profile.xp % 100 })}
            >
              <div
                style={{ width: `${Math.min(100, (profile.xp % 100))}%` }}
                className="h-full bg-primary-500 rounded-full transition-all duration-500"
              />
            </div>
            <div className="text-xs text-night-400 mt-1">
              {t('profile.xpToNext', { xp: 100 - (profile.xp % 100) })}
            </div>
          </Card>
        </div>
      )}

      {/* Settings */}
      <div
        className="animate-slide-up"
        style={{ animationDelay: '0.4s' }}
      >
        <h3 className="text-lg font-semibold text-night-100 mb-3">
          {t('profile.settings.title')}
        </h3>

        <Card className="space-y-4">
          {/* Haptics toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-night-100">{t('profile.settings.haptics.title')}</div>
              <div className="text-xs text-night-400">
                {hapticsSupported
                  ? t('profile.settings.haptics.description')
                  : t('profile.settings.haptics.unavailable')}
              </div>
            </div>
            {/* WCAG 2.5.5: Touch target minimum 44x44px */}
            <button
              onClick={() => setHapticsEnabled(!hapticsEnabled)}
              disabled={!hapticsSupported}
              aria-label={t('profile.settings.haptics.title')}
              aria-checked={hapticsEnabled}
              role="switch"
              className={`w-14 h-11 rounded-full transition-colors relative flex items-center ${
                hapticsEnabled && hapticsSupported
                  ? 'bg-primary-500'
                  : 'bg-night-600'
              } ${!hapticsSupported ? 'opacity-50' : ''}`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white absolute transition-transform duration-200 ${
                  hapticsEnabled && hapticsSupported ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* DEBUG: Only show in development mode (not in E2E tests) */}
          {import.meta.env.DEV && !window.__E2E_SPEED_MULTIPLIER__ && (
            <div className="text-xs text-night-400 bg-night-800 p-2 rounded font-mono break-all">
              DEBUG: supported={String(hapticsSupported)}, {hapticsDebug}
            </div>
          )}

          {/* Language selector - WCAG 1.3.1: fieldset/legend for grouped controls */}
          <fieldset className="border-0 p-0 m-0">
            <div className="flex items-center justify-between">
              <div>
                <legend className="font-medium text-night-100">{t('profile.settings.language.title')}</legend>
                <div className="text-xs text-night-400">
                  {t(`profile.settings.language.${currentLanguage}`)}
                </div>
              </div>
              {/* WCAG 2.5.5: Touch target minimum 44x44px */}
              <div className="flex gap-2" role="radiogroup" aria-label={t('profile.settings.language.title')}>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    role="radio"
                    onClick={() => handleLanguageChange(lang.code)}
                    aria-label={t(`profile.settings.language.${lang.code}`)}
                    aria-checked={currentLanguage === lang.code}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all ${
                      currentLanguage === lang.code
                        ? 'bg-primary-500 scale-105'
                        : 'bg-night-700 hover:bg-night-600'
                    }`}
                  >
                    {lang.flag}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>
        </Card>
      </div>

      {/* Privacy & Data section (GDPR) - Lazy loaded */}
      <div
        className="mt-6 animate-slide-up"
        style={{ animationDelay: '0.45s' }}
      >
        <Suspense fallback={<ComponentLoader />}>
          <PrivacyCenter />
        </Suspense>
      </div>

      {/* Badges section */}
      {profile && profile.badges.length > 0 && (
        <div
          className="mt-6 animate-slide-up"
          style={{ animationDelay: '0.5s' }}
        >
          <h3 className="text-lg font-semibold text-night-100 mb-3">
            {t('profile.badges.title')}
          </h3>
          <div className="flex flex-wrap gap-2" role="list" aria-label={t('profile.badges.title')}>
            {profile.badges.map((badge, index) => (
              <div
                key={index}
                role="listitem"
                className="px-3 py-1.5 bg-night-800 rounded-full text-sm text-night-300"
              >
                <span aria-hidden="true">🏅</span> {badge}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
