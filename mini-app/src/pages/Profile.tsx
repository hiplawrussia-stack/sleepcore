/**
 * Profile Page
 * ============
 * User profile with stats, achievements, and settings.
 * Uses TanStack Query for server state management.
 */

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/common';
import { useTelegram, useHaptics, useUserProfile, useBreathingStats, useEvolution } from '@/hooks';
import { formatDuration } from '@/components/breathing/patterns';

export const Profile: React.FC = () => {
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
          ? `${evolution.daysActive} дней активности`
          : 'Мастер здорового сна',
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
        name: 'Совёнок Соня',
        description: 'Только начинаем путь к здоровому сну',
        nextStage: 'young_owl',
        progress: 0,
        daysToNext: null,
      },
      young_owl: {
        emoji: '🦉',
        name: 'Молодая сова Соня',
        description: 'Уже многому научились вместе',
        nextStage: 'wise_owl',
        progress: 0,
        daysToNext: null,
      },
      wise_owl: {
        emoji: '🦉✨',
        name: 'Мудрая сова Соня',
        description: 'Мастер здорового сна',
        nextStage: null,
        progress: 100,
        daysToNext: null,
      },
      master: {
        emoji: '🏆🦉',
        name: 'Мастер сна Соня',
        description: 'Легенда здорового сна',
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
      <motion.div
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
      </motion.div>

      {/* Evolution card */}
      {evolutionInfo && (
        <motion.div
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
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${evolutionInfo.progress}%` }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="h-full bg-gradient-to-r from-primary-500 to-calm-purple rounded-full"
                  />
                </div>
                <div className="text-xs text-night-500">
                  {evolutionInfo.daysToNext
                    ? `${evolutionInfo.daysToNext} дней до следующего уровня`
                    : `Прогресс: ${evolutionInfo.progress}%`}
                </div>
              </>
            )}
          </Card>
        </motion.div>
      )}

      {/* Stats grid */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3 mb-6"
        >
          <Card className="text-center">
            <div className="text-2xl font-bold text-primary-400">
              {stats.totalSessions}
            </div>
            <div className="text-xs text-night-400">всего сессий</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-calm-blue">
              {formatDuration(stats.totalMinutes * 60)}
            </div>
            <div className="text-xs text-night-400">общее время</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-calm-green">
              {stats.currentStreak}
            </div>
            <div className="text-xs text-night-400">текущий streak</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-calm-amber">
              {stats.longestStreak}
            </div>
            <div className="text-xs text-night-400">рекорд streak</div>
          </Card>
        </motion.div>
      )}

      {/* Weekly progress chart */}
      {stats?.weeklyProgress && stats.weeklyProgress.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <Card>
            <div className="text-sm font-medium text-night-300 mb-3">
              Активность за неделю
            </div>
            <div className="flex items-end justify-between h-16 gap-1">
              {stats.weeklyProgress.map((minutes, index) => {
                const maxMinutes = Math.max(...stats.weeklyProgress, 1);
                const height = (minutes / maxMinutes) * 100;
                const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(height, 4)}%` }}
                      transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                      className={`w-full rounded-t ${
                        minutes > 0 ? 'bg-primary-500' : 'bg-night-700'
                      }`}
                    />
                    <span className="text-[10px] text-night-500 mt-1">
                      {days[index]}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* XP progress */}
      {profile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <Card>
            <div className="flex justify-between items-center mb-2">
              <span className="text-night-300">Уровень {profile.level}</span>
              <span className="font-bold text-primary-400">{profile.xp} XP</span>
            </div>
            <div className="h-2 bg-night-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (profile.xp % 100))}%` }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="h-full bg-primary-500 rounded-full"
              />
            </div>
            <div className="text-xs text-night-500 mt-1">
              До следующего уровня: {100 - (profile.xp % 100)} XP
            </div>
          </Card>
        </motion.div>
      )}

      {/* Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-lg font-semibold text-night-100 mb-3">
          Настройки
        </h3>

        <Card className="space-y-4">
          {/* Haptics toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-night-100">Вибрация</div>
              <div className="text-xs text-night-400">
                {hapticsAvailable
                  ? 'Тактильная обратная связь при дыхании'
                  : 'Недоступно на этом устройстве'}
              </div>
            </div>
            <button
              onClick={() => setHapticsEnabled(!hapticsEnabled)}
              disabled={!hapticsAvailable}
              className={`w-12 h-7 rounded-full transition-colors relative ${
                hapticsEnabled && hapticsAvailable
                  ? 'bg-primary-500'
                  : 'bg-night-600'
              } ${!hapticsAvailable ? 'opacity-50' : ''}`}
            >
              <motion.div
                animate={{ x: hapticsEnabled && hapticsAvailable ? 20 : 2 }}
                className="w-5 h-5 rounded-full bg-white absolute top-1"
              />
            </button>
          </div>
        </Card>
      </motion.div>

      {/* Badges section */}
      {profile && profile.badges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <h3 className="text-lg font-semibold text-night-100 mb-3">
            Достижения
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
        </motion.div>
      )}
    </div>
  );
};

export default Profile;
