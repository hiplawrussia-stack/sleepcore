/**
 * Breathing Page
 * ==============
 * Breathing exercises with animated visualization.
 *
 * @packageDocumentation
 * @module @sleepcore/vk-mini-app/pages
 */

import { useState, useEffect, useCallback } from 'react';
import {
  PanelHeader,
  PanelHeaderBack,
  Group,
  Header,
  SimpleCell,
  Avatar,
  Button,
  Div,
  Title,
  Text,
  Spacing,
  Progress,
  Spinner,
} from '@vkontakte/vkui';

import type { PanelId } from '@/App';
import { useBreathing } from '@/hooks/useBreathing';
import { vk } from '@/services/vk';

interface BreathingProps {
  go: (panel: PanelId) => void;
}

/**
 * Breathing patterns
 */
const patterns = [
  {
    id: '4-7-8',
    name: 'Расслабление 4-7-8',
    description: 'Классическая техника для засыпания',
    inhale: 4,
    hold: 7,
    exhale: 8,
    cycles: 4,
    emoji: '😴',
  },
  {
    id: 'box',
    name: 'Квадратное дыхание',
    description: 'Снижение стресса и тревоги',
    inhale: 4,
    hold: 4,
    exhale: 4,
    holdAfter: 4,
    cycles: 4,
    emoji: '🧘',
  },
  {
    id: 'calm',
    name: 'Спокойствие',
    description: 'Быстрое успокоение',
    inhale: 4,
    hold: 0,
    exhale: 6,
    cycles: 6,
    emoji: '☮️',
  },
];

type Phase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'holdAfter' | 'complete';

/**
 * Breathing component
 */
export default function Breathing({ go }: BreathingProps) {
  const { stats, logSession, isLogging } = useBreathing();

  const [selectedPattern, setSelectedPattern] = useState<typeof patterns[0] | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [timer, setTimer] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [progress, setProgress] = useState(0);

  // Animation scale for the breathing circle
  const [scale, setScale] = useState(1);

  // Phase durations
  const getCurrentPhaseDuration = useCallback(() => {
    if (!selectedPattern) return 0;
    switch (phase) {
      case 'inhale':
        return selectedPattern.inhale;
      case 'hold':
        return selectedPattern.hold;
      case 'exhale':
        return selectedPattern.exhale;
      case 'holdAfter':
        return selectedPattern.holdAfter || 0;
      default:
        return 0;
    }
  }, [selectedPattern, phase]);

  // Phase instructions
  const getPhaseInstruction = () => {
    switch (phase) {
      case 'inhale':
        return 'Вдох';
      case 'hold':
        return 'Задержка';
      case 'exhale':
        return 'Выдох';
      case 'holdAfter':
        return 'Задержка';
      case 'complete':
        return 'Завершено!';
      default:
        return 'Приготовьтесь';
    }
  };

  // Main breathing timer
  useEffect(() => {
    if (phase === 'idle' || phase === 'complete' || !selectedPattern) return;

    const duration = getCurrentPhaseDuration();
    if (duration === 0) {
      // Skip this phase
      goToNextPhase();
      return;
    }

    const interval = setInterval(() => {
      setTimer((t) => {
        const newTime = t + 0.1;

        // Update scale for animation
        if (phase === 'inhale') {
          setScale(1 + (newTime / duration) * 0.5);
        } else if (phase === 'exhale') {
          setScale(1.5 - (newTime / duration) * 0.5);
        }

        // Haptic at start of phase
        if (Math.floor(newTime * 10) === 1) {
          vk.hapticFeedback('impact', 'light');
        }

        if (newTime >= duration) {
          goToNextPhase();
          return 0;
        }
        return newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [phase, selectedPattern, getCurrentPhaseDuration]);

  // Go to next phase
  const goToNextPhase = useCallback(() => {
    if (!selectedPattern) return;

    switch (phase) {
      case 'inhale':
        if (selectedPattern.hold > 0) {
          setPhase('hold');
        } else {
          setPhase('exhale');
        }
        break;
      case 'hold':
        setPhase('exhale');
        break;
      case 'exhale':
        if (selectedPattern.holdAfter && selectedPattern.holdAfter > 0) {
          setPhase('holdAfter');
        } else {
          completeCycle();
        }
        break;
      case 'holdAfter':
        completeCycle();
        break;
    }

    setTimer(0);
    vk.hapticFeedback('impact', 'medium');
  }, [phase, selectedPattern]);

  // Complete one cycle
  const completeCycle = useCallback(() => {
    if (!selectedPattern) return;

    const newCycle = cycle + 1;
    setCycle(newCycle);
    setProgress((newCycle / selectedPattern.cycles) * 100);

    if (newCycle >= selectedPattern.cycles) {
      // Session complete
      setPhase('complete');
      setScale(1);
      vk.hapticFeedback('notification', 'success');

      // Log the session
      const totalDuration =
        (selectedPattern.inhale +
          selectedPattern.hold +
          selectedPattern.exhale +
          (selectedPattern.holdAfter || 0)) *
        selectedPattern.cycles;

      logSession({
        patternId: selectedPattern.id,
        patternName: selectedPattern.name,
        cycles: selectedPattern.cycles,
        duration: totalDuration,
      });
    } else {
      // Start next cycle
      setPhase('inhale');
    }
  }, [cycle, selectedPattern, logSession]);

  // Start exercise
  const startExercise = (pattern: typeof patterns[0]) => {
    setSelectedPattern(pattern);
    setPhase('inhale');
    setTimer(0);
    setCycle(0);
    setProgress(0);
    setScale(1);
    vk.hapticFeedback('impact', 'heavy');
  };

  // Stop exercise
  const stopExercise = () => {
    setSelectedPattern(null);
    setPhase('idle');
    setTimer(0);
    setCycle(0);
    setProgress(0);
    setScale(1);
  };

  // Render breathing animation
  const renderBreathingCircle = () => {
    return (
      <Div style={{ textAlign: 'center', padding: '40px 20px' }}>
        {/* Main circle */}
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            backgroundColor: 'var(--vkui--color_accent_blue)',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${scale})`,
            transition: 'transform 0.1s linear',
            boxShadow: '0 0 40px rgba(81, 129, 184, 0.4)',
          }}
        >
          <Text
            weight="1"
            style={{ color: 'white', fontSize: 48 }}
          >
            {Math.ceil(getCurrentPhaseDuration() - timer)}
          </Text>
        </div>

        <Spacing size={24} />

        <Title level="1">{getPhaseInstruction()}</Title>

        <Spacing size={8} />

        <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
          Цикл {cycle + 1} из {selectedPattern?.cycles}
        </Text>

        <Spacing size={16} />

        <Progress value={progress} />

        <Spacing size={24} />

        <Button size="l" mode="secondary" onClick={stopExercise}>
          Остановить
        </Button>
      </Div>
    );
  };

  // Render completion screen
  const renderComplete = () => (
    <Div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>✨</div>

      <Title level="1">Отлично!</Title>

      <Spacing size={8} />

      <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
        Вы завершили упражнение "{selectedPattern?.name}"
      </Text>

      <Spacing size={24} />

      {isLogging ? (
        <Spinner size="m" />
      ) : (
        <Button size="l" onClick={stopExercise}>
          Готово
        </Button>
      )}
    </Div>
  );

  return (
    <>
      <PanelHeader before={<PanelHeaderBack onClick={() => go('home')} />}>
        Дыхание
      </PanelHeader>

      {selectedPattern && phase !== 'idle' ? (
        <Group>
          {phase === 'complete' ? renderComplete() : renderBreathingCircle()}
        </Group>
      ) : (
        <>
          {/* Pattern selection */}
          <Group header={<Header>Выберите технику</Header>}>
            {patterns.map((pattern) => (
              <SimpleCell
                key={pattern.id}
                before={
                  <Avatar size={48} style={{ backgroundColor: '#e8f4fd', fontSize: 24 }}>
                    {pattern.emoji}
                  </Avatar>
                }
                subtitle={pattern.description}
                onClick={() => startExercise(pattern)}
              >
                {pattern.name}
              </SimpleCell>
            ))}
          </Group>

          {/* Stats */}
          {stats && (
            <Group header={<Header>Ваша статистика</Header>}>
              <Div>
                <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                  <div>
                    <Title level="1">{stats.totalSessions}</Title>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                      сессий
                    </Text>
                  </div>
                  <div>
                    <Title level="1">{stats.totalMinutes}</Title>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                      минут
                    </Text>
                  </div>
                  <div>
                    <Title level="1">{stats.thisWeek.sessions}</Title>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                      за неделю
                    </Text>
                  </div>
                </div>
              </Div>
            </Group>
          )}
        </>
      )}
    </>
  );
}
