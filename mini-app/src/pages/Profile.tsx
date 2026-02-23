/**
 * Profile Page
 * ============
 * User profile with stats, achievements, and settings.
 * Uses TanStack Query for server state management.
 */

import React, { useEffect } from 'react';
import { m } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, PrivacyCenter } from '@/components/common';
import { QuestsPanel } from '@/components/gamification';
import { useTelegram, useHaptics, useUserProfile, useBreathingStats, useEvolution } from '@/hooks';
import { formatDuration } from '@/components/breathing/patterns';

export const Profile: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, showBackButton, hideBackButton } = useTelegram();
  const { isEnabled: hapticsEnabled, setEnabled: setHapticsEnabled, isAvailable: hapticsAvailable } = useHaptics();

  // TanStack Query hooks for server state
  const { profile, isLoading: isLoadingProfile } = useUserProfile();
  const { stats, isLoading: isLoadingStats } = useBreathingStats();
  const { evolution, isLoading: isLoadingEvolution } = useEvolution();

  const isLoading = isLoadingProfile || isLoadingStats || isLoadingEvolution;

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
      {/* Header with avatar */}
      <m.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
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
      </m.div>

      {/* Evolution card */}
      {evolutionInfo && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card variant="glass">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-4xl">{evolutionInfo.emoji}</span>
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
                <div className="h-2 bg-night-700 rounded-full overflow-hidden mb-2">
                  <m.div
                    initial={{ width: 0 }}
                    animate={{ width: `${evolutionInfo.progress}%` }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="h-full bg-gradient-to-r from-primary-500 to-calm-purple rounded-full"
                  />
                </div>
                <div className="text-xs text-night-500">
                  {evolutionInfo.daysToNext
                    ? t('profile.evolution.daysToNext', { count: evolutionInfo.daysToNext })
                    : t('profile.evolution.progress', { percent: evolutionInfo.progress })}
                </div>
              </>
            )}
          </Card>
        </m.div>
      )}

      {/* Stats grid */}
      {stats && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3 mb-6"
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
        </m.div>
      )}

      {/* Quests Panel */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        className="mb-6"
      >
        <QuestsPanel limit={3} activeOnly />
      </m.div>

      {/* Weekly progress chart */}
      {stats?.weeklyProgress && stats.weeklyProgress.length > 0 && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <Card>
            <div className="text-sm font-medium text-night-300 mb-3">
              {t('profile.stats.weekActivity')}
            </div>
            <div className="flex items-end justify-between h-16 gap-1">
              {stats.weeklyProgress.map((minutes, index) => {
                const maxMinutes = Math.max(...stats.weeklyProgress, 1);
                const height = (minutes / maxMinutes) * 100;
                const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <m.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(height, 4)}%` }}
                      transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                      className={`w-full rounded-t ${
                        minutes > 0 ? 'bg-primary-500' : 'bg-night-700'
                      }`}
                    />
                    <span className="text-[10px] text-night-500 mt-1">
                      {t(`profile.stats.days.${dayKeys[index]}`)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </m.div>
      )}

      {/* XP progress */}
      {profile && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <Card>
            <div className="flex justify-between items-center mb-2">
              <span className="text-night-300">{t('profile.level', { level: profile.level })}</span>
              <span className="font-bold text-primary-400">{profile.xp} XP</span>
            </div>
            <div className="h-2 bg-night-700 rounded-full overflow-hidden">
              <m.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (profile.xp % 100))}%` }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="h-full bg-primary-500 rounded-full"
              />
            </div>
            <div className="text-xs text-night-500 mt-1">
              {t('profile.xpToNext', { xp: 100 - (profile.xp % 100) })}
            </div>
          </Card>
        </m.div>
      )}

      {/* Settings */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
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
                {hapticsAvailable
                  ? t('profile.settings.haptics.description')
                  : t('profile.settings.haptics.unavailable')}
              </div>
            </div>
            <button
              onClick={() => setHapticsEnabled(!hapticsEnabled)}
              disabled={!hapticsAvailable}
              aria-label={t('profile.settings.haptics.title')}
              aria-checked={hapticsEnabled}
              role="switch"
              className={`w-12 h-7 rounded-full transition-colors relative ${
                hapticsEnabled && hapticsAvailable
                  ? 'bg-primary-500'
                  : 'bg-night-600'
              } ${!hapticsAvailable ? 'opacity-50' : ''}`}
            >
              <m.div
                animate={{ x: hapticsEnabled && hapticsAvailable ? 20 : 2 }}
                className="w-5 h-5 rounded-full bg-white absolute top-1"
              />
            </button>
          </div>
        </Card>
      </m.div>

      {/* Privacy & Data section (GDPR) */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="mt-6"
      >
        <PrivacyCenter />
      </m.div>

      {/* Badges section */}
      {profile && profile.badges.length > 0 && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <h3 className="text-lg font-semibold text-night-100 mb-3">
            {t('profile.badges.title')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((badge, index) => (
              <div
                key={index}
                className="px-3 py-1.5 bg-night-800 rounded-full text-sm text-night-300"
              >
                🏅 {badge}
              </div>
            ))}
          </div>
        </m.div>
      )}
    </div>
  );
};

export default Profile;
