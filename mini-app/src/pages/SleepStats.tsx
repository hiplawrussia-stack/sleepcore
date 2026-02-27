/**
 * Sleep Stats Page
 * ================
 * Sleep data visualization from wearables.
 * Displays SE, TST, WASO, HRV, SpO2, sleep stages.
 *
 * ARCHITECTURE: Complements Bot (therapy/diary) with visualization.
 * Data source: Android Companion App → Health Connect → API → Mini-App
 *
 * @module @sleepcore/mini-app/pages/SleepStats
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/common';
import { useTelegram, useSleep } from '@/hooks';
import { haptics } from '@/services/haptics';
import type { SleepSession } from '@/api';

// ============================================================================
// Helper Components
// ============================================================================

/** Format minutes to hours:minutes */
const formatMinutes = (minutes: number | null): string => {
  if (minutes === null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}ч ${m}м` : `${m}м`;
};

/** Format percentage */
const formatPercent = (value: number | null): string => {
  if (value === null) return '—';
  return `${Math.round(value)}%`;
};

/** Trend indicator */
const TrendIndicator: React.FC<{
  trend: 'improving' | 'stable' | 'declining' | null;
  goodDirection: 'up' | 'down';
}> = ({ trend, goodDirection }) => {
  if (!trend) return null;

  const isGood =
    (trend === 'improving' && goodDirection === 'up') ||
    (trend === 'declining' && goodDirection === 'down');

  const icons = {
    improving: '↑',
    stable: '→',
    declining: '↓',
  };

  const colors = {
    improving: isGood ? 'text-calm-green' : 'text-calm-amber',
    stable: 'text-night-400',
    declining: isGood ? 'text-calm-green' : 'text-calm-amber',
  };

  return <span className={colors[trend]}>{icons[trend]}</span>;
};

/** Sleep stage bar */
const SleepStageBar: React.FC<{
  deep: number | null;
  rem: number | null;
  light: number | null;
  wake: number | null;
}> = ({ deep, rem, light, wake }) => {
  // Normalize if not adding to 100
  const total = (deep ?? 0) + (rem ?? 0) + (light ?? 0) + (wake ?? 0);
  if (total === 0) return null;

  const normalize = (v: number | null) => ((v ?? 0) / total) * 100;

  return (
    <div className="h-4 rounded-full overflow-hidden flex">
      <div
        className="bg-indigo-600"
        style={{ width: `${normalize(deep)}%` }}
        title="Deep sleep"
      />
      <div
        className="bg-violet-500"
        style={{ width: `${normalize(rem)}%` }}
        title="REM"
      />
      <div
        className="bg-blue-400"
        style={{ width: `${normalize(light)}%` }}
        title="Light sleep"
      />
      <div
        className="bg-night-500"
        style={{ width: `${normalize(wake)}%` }}
        title="Wake"
      />
    </div>
  );
};

/** Metric card */
const MetricCard: React.FC<{
  icon: string;
  label: string;
  value: string;
  subValue?: React.ReactNode;
  color?: string;
}> = ({ icon, label, value, subValue, color = 'text-primary-400' }) => (
  <Card className="text-center">
    <span className="text-2xl" aria-hidden="true">
      {icon}
    </span>
    <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
    <div className="text-xs text-night-400">{label}</div>
    {subValue && <div className="text-xs text-night-500 mt-0.5">{subValue}</div>}
  </Card>
);

/** Session row */
const SessionRow: React.FC<{
  session: SleepSession;
  onClick?: () => void;
}> = ({ session, onClick }) => {
  const { t } = useTranslation();
  const date = new Date(session.startTime);
  const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' });

  return (
    <Card
      onClick={onClick}
      className="flex items-center gap-3"
      aria-label={t('a11y.sleep.sessionCard', { date: session.date })}
    >
      <div className="w-10 h-10 rounded-lg bg-night-700 flex flex-col items-center justify-center">
        <span className="text-xs text-night-400">{dayName}</span>
        <span className="text-sm font-medium text-night-200">
          {date.getDate()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-night-100">
            {formatMinutes(session.tst)}
          </span>
          <span className="text-xs text-night-400">
            SE {formatPercent(session.se)}
          </span>
        </div>
        <SleepStageBar
          deep={session.stageDeep}
          rem={session.stageRem}
          light={session.stageLight}
          wake={session.stageWake}
        />
      </div>
    </Card>
  );
};

/** Empty state */
const EmptyState: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">📱⌚</div>
      <h2 className="text-xl font-semibold text-night-100 mb-2">
        {t('sleep.empty.title')}
      </h2>
      <p className="text-night-400 mb-6 max-w-xs mx-auto">
        {t('sleep.empty.description')}
      </p>
      <Card variant="glass" className="inline-block px-6 py-3">
        <div className="text-sm text-night-300">
          {t('sleep.empty.instruction')}
        </div>
      </Card>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const SleepStats: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showBackButton, hideBackButton } = useTelegram();
  const { stats, sessions, isLoading, hasData } = useSleep({ days: 7, limit: 7 });

  // Setup back button
  useEffect(() => {
    showBackButton(() => {
      navigate('/');
    });
    return () => hideBackButton();
  }, [showBackButton, hideBackButton, navigate]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-night-900 px-4 py-6 pb-20">
        <div className="animate-pulse">
          <div className="h-8 bg-night-700 rounded w-40 mb-6" />
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="h-24 bg-night-700 rounded-2xl" />
            <div className="h-24 bg-night-700 rounded-2xl" />
          </div>
          <div className="h-32 bg-night-700 rounded-2xl mb-4" />
          <div className="h-32 bg-night-700 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Empty state
  if (!hasData) {
    return (
      <div className="min-h-screen bg-night-900 px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold text-night-100 mb-6">
          {t('sleep.title')}
        </h1>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-night-900 px-4 py-6 pb-20">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-night-100">{t('sleep.title')}</h1>
        <p className="text-night-400 mt-1">
          {t('sleep.subtitle', { days: 7 })}
        </p>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div
          className="grid grid-cols-2 gap-3 mb-6 animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <MetricCard
            icon="⏱️"
            label={t('sleep.metrics.avgTst')}
            value={formatMinutes(stats.avgTotalSleepTime)}
            subValue={
              stats.tstTrend ? (
                <TrendIndicator trend={stats.tstTrend} goodDirection="up" />
              ) : undefined
            }
            color="text-calm-blue"
          />
          <MetricCard
            icon="📊"
            label={t('sleep.metrics.avgSe')}
            value={formatPercent(stats.avgSleepEfficiency)}
            subValue={
              stats.seTrend ? (
                <TrendIndicator trend={stats.seTrend} goodDirection="up" />
              ) : undefined
            }
            color={
              (stats.avgSleepEfficiency ?? 0) >= 85
                ? 'text-calm-green'
                : (stats.avgSleepEfficiency ?? 0) >= 70
                ? 'text-calm-amber'
                : 'text-red-400'
            }
          />
        </div>
      )}

      {/* Sleep Stages */}
      {stats && (stats.avgStageDeep !== null || stats.avgStageRem !== null) && (
        <div
          className="mb-6 animate-slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          <Card>
            <h3 className="text-sm font-medium text-night-300 mb-3">
              {t('sleep.stages.title')}
            </h3>
            <SleepStageBar
              deep={stats.avgStageDeep}
              rem={stats.avgStageRem}
              light={stats.avgStageLight}
              wake={100 - (stats.avgStageDeep ?? 0) - (stats.avgStageRem ?? 0) - (stats.avgStageLight ?? 0)}
            />
            <div className="flex justify-between mt-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <span className="text-night-400">{t('sleep.stages.deep')}</span>
                <span className="text-night-200">{formatPercent(stats.avgStageDeep)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                <span className="text-night-400">{t('sleep.stages.rem')}</span>
                <span className="text-night-200">{formatPercent(stats.avgStageRem)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-night-400">{t('sleep.stages.light')}</span>
                <span className="text-night-200">{formatPercent(stats.avgStageLight)}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Additional Metrics */}
      {stats && (
        <div
          className="grid grid-cols-3 gap-2 mb-6 animate-slide-up"
          style={{ animationDelay: '0.3s' }}
        >
          {stats.avgSleepOnsetLatency !== null && (
            <Card className="text-center py-3">
              <div className="text-lg font-bold text-night-100">
                {formatMinutes(stats.avgSleepOnsetLatency)}
              </div>
              <div className="text-[10px] text-night-400">{t('sleep.metrics.sol')}</div>
            </Card>
          )}
          {stats.avgWaso !== null && (
            <Card className="text-center py-3">
              <div className="text-lg font-bold text-night-100">
                {formatMinutes(stats.avgWaso)}
              </div>
              <div className="text-[10px] text-night-400">{t('sleep.metrics.waso')}</div>
            </Card>
          )}
          {stats.avgAwakenings !== null && (
            <Card className="text-center py-3">
              <div className="text-lg font-bold text-night-100">
                {stats.avgAwakenings.toFixed(1)}
              </div>
              <div className="text-[10px] text-night-400">{t('sleep.metrics.awakenings')}</div>
            </Card>
          )}
        </div>
      )}

      {/* Biometrics */}
      {stats && (stats.avgHrvRmssd !== null || stats.avgSpo2 !== null) && (
        <div
          className="grid grid-cols-2 gap-3 mb-6 animate-slide-up"
          style={{ animationDelay: '0.35s' }}
        >
          {stats.avgHrvRmssd !== null && (
            <Card className="text-center">
              <span className="text-2xl" aria-hidden="true">💓</span>
              <div className="text-xl font-bold text-calm-purple mt-1">
                {Math.round(stats.avgHrvRmssd)} ms
              </div>
              <div className="text-xs text-night-400">{t('sleep.metrics.hrv')}</div>
              {stats.avgRestingHeartRate !== null && (
                <div className="text-xs text-night-500 mt-0.5">
                  {t('sleep.metrics.rhr')}: {stats.avgRestingHeartRate} bpm
                </div>
              )}
            </Card>
          )}
          {stats.avgSpo2 !== null && (
            <Card className="text-center">
              <span className="text-2xl" aria-hidden="true">🫁</span>
              <div className="text-xl font-bold text-calm-blue mt-1">
                {formatPercent(stats.avgSpo2)}
              </div>
              <div className="text-xs text-night-400">{t('sleep.metrics.spo2')}</div>
              {stats.minSpo2 !== null && (
                <div className="text-xs text-night-500 mt-0.5">
                  min: {formatPercent(stats.minSpo2)}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Sessions History */}
      {sessions && sessions.length > 0 && (
        <div
          className="animate-slide-up"
          style={{ animationDelay: '0.4s' }}
        >
          <h3 className="text-lg font-semibold text-night-100 mb-3">
            {t('sleep.history.title')}
          </h3>
          <div className="space-y-2">
            {sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                onClick={() => {
                  haptics.selectionChanged();
                  // Future: navigate to session details
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sync info */}
      {stats?.lastSyncAt && (
        <div className="mt-6 text-center text-xs text-night-500">
          {t('sleep.lastSync', {
            time: new Date(stats.lastSyncAt).toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          })}
        </div>
      )}
    </div>
  );
};

export default SleepStats;
