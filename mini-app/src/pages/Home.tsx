/**
 * Home Page
 * =========
 * Main landing page with quick access to breathing exercises
 * and user stats overview.
 */

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
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
    if (hour < 6) return 'Доброй ночи';
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    if (hour < 22) return 'Добрый вечер';
    return 'Доброй ночи';
  };

  // Quick access patterns (by category)
  const sleepPatterns = getFreePatterns().filter(p => p.category === 'sleep');
  const stressPatterns = getFreePatterns().filter(p => p.category === 'stress');

  return (
    <div className="min-h-screen bg-night-900 px-4 py-6 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-night-100">
          {getGreeting()}, {user?.firstName || 'друг'}!
        </h1>
        <p className="text-night-400 mt-1">
          Готов к дыхательной практике?
        </p>
      </motion.div>

      {/* Stats cards */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3 mb-6"
        >
          <Card variant="glass" className="text-center">
            <div className="text-3xl font-bold text-primary-400">
              {stats.totalSessions}
            </div>
            <div className="text-sm text-night-400">сессий</div>
          </Card>
          <Card variant="glass" className="text-center">
            <div className="text-3xl font-bold text-calm-green">
              {stats.currentStreak}
            </div>
            <div className="text-sm text-night-400">дней подряд</div>
          </Card>
        </motion.div>
      )}

      {/* Main CTA - Start breathing */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <Card
          variant="elevated"
          padding="lg"
          onClick={() => {
            haptics.impact('medium');
            navigate('/breathing');
          }}
          className="relative overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-transparent" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/20 flex items-center justify-center">
              <span className="text-3xl">🌙</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-night-100">
                Начать дыхание
              </h2>
              <p className="text-sm text-night-400">
                Выбери технику и практикуй
              </p>
            </div>
            <svg
              className="w-6 h-6 text-night-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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
      </motion.div>

      {/* Quick patterns - For Sleep */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <h3 className="text-lg font-semibold text-night-100 mb-3 flex items-center gap-2">
          {CATEGORY_ICONS.sleep} Для сна
        </h3>
        <div className="space-y-2">
          {sleepPatterns.map((pattern) => (
            <Card
              key={pattern.id}
              onClick={() => {
                haptics.selectionChanged();
                navigate(`/breathing?pattern=${pattern.id}`);
              }}
              className="flex items-center gap-3"
            >
              <span className="text-2xl">{pattern.icon}</span>
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
      </motion.div>

      {/* Quick patterns - Stress relief */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-6"
      >
        <h3 className="text-lg font-semibold text-night-100 mb-3 flex items-center gap-2">
          {CATEGORY_ICONS.stress} От стресса
        </h3>
        <div className="space-y-2">
          {stressPatterns.map((pattern) => (
            <Card
              key={pattern.id}
              onClick={() => {
                haptics.selectionChanged();
                navigate(`/breathing?pattern=${pattern.id}`);
              }}
              className="flex items-center gap-3"
            >
              <span className="text-2xl">{pattern.icon}</span>
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
      </motion.div>

      {/* Sonya greeting */}
      {profile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
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
                Соня рада тебя видеть!
              </div>
              <div className="text-sm text-night-400">
                {profile.xp} XP • Уровень:{' '}
                {profile.evolutionStage === 'wise_owl'
                  ? 'Мудрая сова'
                  : profile.evolutionStage === 'young_owl'
                  ? 'Молодая сова'
                  : 'Совёнок'}
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default Home;
