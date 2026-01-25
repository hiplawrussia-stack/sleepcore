# Детальный план реализации: Вариант B (Telegram Mini App)

**Версия:** 1.0
**Дата:** 2025-12-23
**Бюджет:** $20,000-35,000
**Срок:** 16-20 недель
**Команда:** 2-3 разработчика

---

## Содержание

1. [Executive Summary](#executive-summary)
2. [Архитектура решения](#архитектура-решения)
3. [Фазы реализации](#фазы-реализации)
4. [Детальный план спринтов](#детальный-план-спринтов)
5. [Технические спецификации](#технические-спецификации)
6. [Бюджет и ресурсы](#бюджет-и-ресурсы)
7. [Риски и митигация](#риски-и-митигация)
8. [KPI и критерии успеха](#kpi-и-критерии-успеха)

---

## Executive Summary

### Цель
Расширить SleepCore до полноценной платформы с Telegram Mini App, обеспечив:
- Haptic-guided breathing exercises (+19% deep sleep потенциал)
- Rich UI для визуализации прогресса
- Интеграцию с Fitbit/Garmin wearables
- AI-персонализированные аудио-истории

### Ключевые deliverables

| Фаза | Срок | Deliverable |
|------|------|-------------|
| B1 | 6 недель | MVP в текущем боте (адаптивная клавиатура, Sonya evolution, voice diary) |
| B2 | 6 недель | Telegram Mini App (haptic breathing, interactive UI, payments) |
| B3 | 4-8 недель | Wearables API + Dream Weaver AI stories |

### Timeline Overview

```
         Неделя:  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20
                  │──────────────│──────────────────│───────────────────────│
Фаза B1 (MVP):    ████████████████
Фаза B2 (Mini):                  ██████████████████████
Фаза B3 (AI+Wear):                                    ██████████████████████
Testing/Launch:                                                      ████████
```

---

## Архитектура решения

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USERS                                       │
│                    (Telegram 1B+ MAU)                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
┌─────────────────────────────┐     ┌─────────────────────────────┐
│      TELEGRAM BOT           │     │    TELEGRAM MINI APP        │
│  (Grammy Framework)         │     │  (React + Telegram SDK)     │
│                             │     │                             │
│  • Commands (/start, etc)   │     │  • Haptic Breathing         │
│  • Voice messages           │     │  • Sonya Avatar UI          │
│  • Adaptive keyboard        │     │  • Sleep Diary Form         │
│  • Text interactions        │     │  • Quest Progress           │
│                             │     │  • Payments (Stars)         │
└─────────────────────────────┘     └─────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Node.js/TypeScript)                     │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  API Layer   │  │  Services    │  │  AI/ML       │  │  External    │ │
│  │              │  │              │  │              │  │  APIs        │ │
│  │ • REST API   │  │ • User       │  │ • Whisper    │  │ • Fitbit     │ │
│  │ • WebSocket  │  │ • Adaptive   │  │ • GPT-4      │  │ • Garmin     │ │
│  │ • Webhooks   │  │ • Quest      │  │ • ElevenLabs │  │ • Oura       │ │
│  │              │  │ • Evolution  │  │ • Emotion    │  │ • Terra API  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                                          │
│                              ┌──────────────┐                            │
│                              │   SQLite     │                            │
│                              │   Database   │                            │
│                              └──────────────┘                            │
└─────────────────────────────────────────────────────────────────────────┘
```

### Структура проекта (итоговая)

```
sleepcore/
├── src/                              # Текущий backend (сохраняется)
│   ├── architecture/
│   ├── bot/telegram/
│   ├── enterprise/
│   └── ...
│
├── mini-app/                         # НОВОЕ: Telegram Mini App
│   ├── src/
│   │   ├── components/
│   │   │   ├── breathing/
│   │   │   │   ├── HapticBreathing.tsx
│   │   │   │   ├── BreathingCircle.tsx
│   │   │   │   └── patterns.ts
│   │   │   ├── avatar/
│   │   │   │   ├── SonyaAvatar.tsx
│   │   │   │   ├── EvolutionAnimation.tsx
│   │   │   │   └── stages.ts
│   │   │   ├── diary/
│   │   │   │   ├── SleepDiaryForm.tsx
│   │   │   │   ├── MoodSelector.tsx
│   │   │   │   └── VoiceInput.tsx
│   │   │   ├── quests/
│   │   │   │   ├── QuestList.tsx
│   │   │   │   ├── QuestProgress.tsx
│   │   │   │   └── BadgeDisplay.tsx
│   │   │   └── common/
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       └── ProgressBar.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Breathing.tsx
│   │   │   ├── Diary.tsx
│   │   │   ├── Quests.tsx
│   │   │   └── Profile.tsx
│   │   ├── services/
│   │   │   ├── telegram.ts           # Telegram WebApp SDK
│   │   │   ├── haptics.ts            # HapticFeedback wrapper
│   │   │   ├── api.ts                # Backend API client
│   │   │   └── storage.ts            # Local storage
│   │   ├── hooks/
│   │   │   ├── useTelegram.ts
│   │   │   ├── useHaptics.ts
│   │   │   └── useBreathing.ts
│   │   ├── store/
│   │   │   ├── userStore.ts
│   │   │   └── breathingStore.ts
│   │   ├── styles/
│   │   │   ├── theme.ts
│   │   │   └── global.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   │   └── assets/
│   │       ├── sonya-owlet.svg
│   │       ├── sonya-young.svg
│   │       └── sonya-wise.svg
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── src/modules/                      # НОВОЕ: Backend модули
│   ├── adaptive-keyboard/
│   │   ├── AdaptiveKeyboardService.ts
│   │   ├── RuleEngine.ts
│   │   ├── rules/
│   │   │   ├── TimeBasedRules.ts
│   │   │   ├── BehaviorRules.ts
│   │   │   └── StreakRules.ts
│   │   └── index.ts
│   ├── evolution/
│   │   ├── SonyaEvolutionService.ts
│   │   ├── EvolutionCriteria.ts
│   │   └── index.ts
│   ├── voice/
│   │   ├── WhisperService.ts
│   │   ├── VoiceDiaryHandler.ts
│   │   └── index.ts
│   ├── quests/
│   │   ├── QuestService.ts
│   │   ├── QuestDefinitions.ts
│   │   ├── BadgeService.ts
│   │   └── index.ts
│   ├── wearables/
│   │   ├── TerraService.ts
│   │   ├── FitbitAdapter.ts
│   │   ├── GarminAdapter.ts
│   │   └── index.ts
│   └── dream-weaver/
│       ├── StoryGeneratorService.ts
│       ├── ThemeAnalyzer.ts
│       ├── TTSService.ts
│       └── index.ts
│
└── docs/
    ├── research/                     # Исследования (существуют)
    └── IMPLEMENTATION_PLAN_VARIANT_B.md  # Этот документ
```

---

## Фазы реализации

### Фаза B1: MVP в текущем боте (Недели 1-6)

#### Sprint 1-2: Адаптивная клавиатура + Sonya Evolution

**Цель:** Персонализация UI на основе поведения пользователя

**Задачи:**

| # | Задача | Приоритет | Оценка | Ответственный |
|---|--------|-----------|--------|---------------|
| 1.1 | Создать UserInteractionRepository | P0 | 4h | Backend Dev |
| 1.2 | Реализовать RuleEngine | P0 | 8h | Backend Dev |
| 1.3 | Создать AdaptiveKeyboardService | P0 | 8h | Backend Dev |
| 1.4 | Интегрировать в существующие команды | P0 | 6h | Backend Dev |
| 1.5 | Создать SonyaEvolutionService | P1 | 6h | Backend Dev |
| 1.6 | Добавить визуальные стадии Сони | P1 | 4h | Backend Dev |
| 1.7 | Создать celebration messages | P1 | 3h | Backend Dev |
| 1.8 | Написать unit тесты | P0 | 6h | Backend Dev |
| 1.9 | Интеграционное тестирование | P0 | 4h | QA |

**Код: AdaptiveKeyboardService**

```typescript
// src/modules/adaptive-keyboard/AdaptiveKeyboardService.ts

import { InlineKeyboard } from 'grammy';
import { RuleEngine } from './RuleEngine';
import { UserInteractionRepository } from './UserInteractionRepository';

export interface AdaptationRule {
  id: string;
  condition: (context: UserContext) => boolean;
  action: KeyboardAction;
  priority: number;
}

export interface UserContext {
  userId: string;
  lastCommands: string[];
  ignoredCommands: Map<string, number>;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number;
  streak: number;
  isiScore: number | null;
  lastActivityDate: Date | null;
}

export class AdaptiveKeyboardService {
  constructor(
    private ruleEngine: RuleEngine,
    private interactionRepo: UserInteractionRepository
  ) {}

  async generateKeyboard(userId: string, baseCommands: string[]): Promise<InlineKeyboard> {
    const context = await this.buildUserContext(userId);
    const adaptedCommands = this.ruleEngine.applyRules(baseCommands, context);

    return this.buildKeyboard(adaptedCommands);
  }

  private async buildUserContext(userId: string): Promise<UserContext> {
    const interactions = await this.interactionRepo.getRecentInteractions(userId, 30);
    const ignoredCommands = this.calculateIgnoredCommands(interactions);

    const hour = new Date().getHours();
    const timeOfDay = hour < 6 ? 'night'
                    : hour < 12 ? 'morning'
                    : hour < 18 ? 'afternoon'
                    : hour < 22 ? 'evening' : 'night';

    return {
      userId,
      lastCommands: interactions.slice(0, 5).map(i => i.command),
      ignoredCommands,
      timeOfDay,
      dayOfWeek: new Date().getDay(),
      streak: await this.interactionRepo.getCurrentStreak(userId),
      isiScore: await this.interactionRepo.getLatestISIScore(userId),
      lastActivityDate: interactions[0]?.timestamp || null
    };
  }

  private calculateIgnoredCommands(interactions: Interaction[]): Map<string, number> {
    const ignored = new Map<string, number>();

    for (const interaction of interactions) {
      if (!interaction.wasClicked) {
        const count = ignored.get(interaction.command) || 0;
        ignored.set(interaction.command, count + 1);
      }
    }

    return ignored;
  }

  private buildKeyboard(commands: AdaptedCommand[]): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    for (const cmd of commands) {
      if (cmd.highlighted) {
        keyboard.text(`⭐ ${cmd.label}`, cmd.callback);
      } else {
        keyboard.text(cmd.label, cmd.callback);
      }

      if (cmd.newRow) keyboard.row();
    }

    return keyboard;
  }
}
```

**Код: RuleEngine**

```typescript
// src/modules/adaptive-keyboard/RuleEngine.ts

export class RuleEngine {
  private rules: AdaptationRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // Правило 1: Замена игнорируемых команд
    this.addRule({
      id: 'replace-ignored-relax',
      condition: (ctx) => (ctx.ignoredCommands.get('/relax') || 0) >= 3,
      action: { type: 'replace', from: '/relax', to: '/mindful', label: 'Осознанность' },
      priority: 10
    });

    // Правило 2: Вечернее напоминание о дневнике
    this.addRule({
      id: 'evening-diary-highlight',
      condition: (ctx) => {
        const isEvening = ctx.timeOfDay === 'evening';
        const noRecentDiary = !ctx.lastCommands.includes('/diary');
        return isEvening && noRecentDiary;
      },
      action: { type: 'highlight', command: '/diary' },
      priority: 20
    });

    // Правило 3: Streak achievement
    this.addRule({
      id: 'streak-share',
      condition: (ctx) => ctx.streak >= 7 && ctx.streak % 7 === 0,
      action: { type: 'add', command: '/share_achievement', label: '🎉 Поделиться' },
      priority: 5
    });

    // Правило 4: Утренний баланс
    this.addRule({
      id: 'morning-balance',
      condition: (ctx) => ctx.timeOfDay === 'morning',
      action: { type: 'highlight', command: '/balance' },
      priority: 15
    });

    // Правило 5: Высокий ISI → релаксация
    this.addRule({
      id: 'high-isi-relax',
      condition: (ctx) => ctx.isiScore !== null && ctx.isiScore >= 15,
      action: { type: 'highlight', command: '/relax' },
      priority: 25
    });
  }

  addRule(rule: AdaptationRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  applyRules(baseCommands: string[], context: UserContext): AdaptedCommand[] {
    let commands = baseCommands.map(cmd => ({
      command: cmd,
      label: this.getDefaultLabel(cmd),
      callback: cmd,
      highlighted: false,
      newRow: false
    }));

    for (const rule of this.rules) {
      if (rule.condition(context)) {
        commands = this.applyAction(commands, rule.action);
      }
    }

    return commands;
  }

  private applyAction(commands: AdaptedCommand[], action: KeyboardAction): AdaptedCommand[] {
    switch (action.type) {
      case 'replace':
        return commands.map(cmd =>
          cmd.command === action.from
            ? { ...cmd, command: action.to, label: action.label, callback: action.to }
            : cmd
        );

      case 'highlight':
        return commands.map(cmd =>
          cmd.command === action.command
            ? { ...cmd, highlighted: true }
            : cmd
        );

      case 'add':
        return [...commands, {
          command: action.command,
          label: action.label,
          callback: action.command,
          highlighted: true,
          newRow: true
        }];

      case 'remove':
        return commands.filter(cmd => cmd.command !== action.command);

      default:
        return commands;
    }
  }

  private getDefaultLabel(command: string): string {
    const labels: Record<string, string> = {
      '/start': '🏠 Главная',
      '/diary': '📔 Дневник',
      '/balance': '⚖️ Баланс',
      '/relax': '🧘 Релаксация',
      '/mindful': '🧠 Осознанность',
      '/challenges': '🎯 Челленджи',
      '/smart_tips': '💡 Советы',
      '/emotion': '💭 Эмоции',
      '/emergency': '🆘 Помощь'
    };
    return labels[command] || command;
  }
}
```

**Код: SonyaEvolutionService**

```typescript
// src/modules/evolution/SonyaEvolutionService.ts

export interface EvolutionStage {
  id: 'owlet' | 'young_owl' | 'wise_owl';
  name: string;
  emoji: string;
  description: string;
  requiredDays: number;
}

export interface EvolutionCriteria {
  minDiaryEntries: number;
  minStreakDays: number;
  completedISI?: boolean;
  isiImprovement?: number;
}

export class SonyaEvolutionService {
  private stages: EvolutionStage[] = [
    {
      id: 'owlet',
      name: 'Совёнок Соня',
      emoji: '🐣',
      description: 'Только начинаем путь к здоровому сну',
      requiredDays: 0
    },
    {
      id: 'young_owl',
      name: 'Молодая сова Соня',
      emoji: '🦉',
      description: 'Уже многому научились вместе',
      requiredDays: 14
    },
    {
      id: 'wise_owl',
      name: 'Мудрая сова Соня',
      emoji: '🦉✨',
      description: 'Мастер здорового сна',
      requiredDays: 30
    }
  ];

  private criteria: Record<string, EvolutionCriteria> = {
    'owlet_to_young': {
      minDiaryEntries: 10,
      minStreakDays: 7,
      completedISI: true
    },
    'young_to_wise': {
      minDiaryEntries: 25,
      minStreakDays: 21,
      isiImprovement: -3
    }
  };

  constructor(
    private userRepository: IUserRepository,
    private diaryRepository: IDiaryRepository
  ) {}

  async getCurrentStage(userId: string): Promise<EvolutionStage> {
    const user = await this.userRepository.findById(userId);
    return this.stages.find(s => s.id === user?.evolutionStage) || this.stages[0];
  }

  async checkEvolution(userId: string): Promise<EvolutionResult> {
    const currentStage = await this.getCurrentStage(userId);
    const nextStage = this.getNextStage(currentStage);

    if (!nextStage) {
      return { evolved: false, currentStage };
    }

    const criteriaKey = `${currentStage.id}_to_${nextStage.id}`;
    const criteria = this.criteria[criteriaKey];

    if (!criteria) {
      return { evolved: false, currentStage };
    }

    const canEvolve = await this.checkCriteria(userId, criteria);

    if (canEvolve) {
      await this.evolve(userId, nextStage);
      return {
        evolved: true,
        previousStage: currentStage,
        currentStage: nextStage,
        celebrationMessage: this.getCelebrationMessage(nextStage)
      };
    }

    const progress = await this.getEvolutionProgress(userId, criteria);
    return { evolved: false, currentStage, progress };
  }

  private async checkCriteria(userId: string, criteria: EvolutionCriteria): Promise<boolean> {
    const [diaryCount, streak, isiData] = await Promise.all([
      this.diaryRepository.countEntries(userId),
      this.userRepository.getCurrentStreak(userId),
      this.userRepository.getISIHistory(userId)
    ]);

    if (diaryCount < criteria.minDiaryEntries) return false;
    if (streak < criteria.minStreakDays) return false;

    if (criteria.completedISI && isiData.length === 0) return false;

    if (criteria.isiImprovement !== undefined) {
      if (isiData.length < 2) return false;
      const improvement = isiData[0].score - isiData[isiData.length - 1].score;
      if (improvement > criteria.isiImprovement) return false; // improvement is negative
    }

    return true;
  }

  private async evolve(userId: string, newStage: EvolutionStage): Promise<void> {
    await this.userRepository.updateEvolutionStage(userId, newStage.id);
    await this.userRepository.addXP(userId, this.getXPForStage(newStage));
  }

  private getCelebrationMessage(stage: EvolutionStage): string {
    const messages: Record<string, string> = {
      'young_owl': `
🎉 *Поздравляю!*

Соня эволюционировала!

🐣 → 🦉

Теперь она *${stage.name}*!

${stage.description}

Ты проделал отличную работу! Продолжай в том же духе, и Соня станет ещё мудрее! 🌙
      `,
      'wise_owl': `
🎊 *Невероятно!*

Соня достигла высшей формы!

🦉 → 🦉✨

Теперь она *${stage.name}*!

${stage.description}

Ты настоящий мастер здорового сна! Соня гордится тобой! 🌟
      `
    };
    return messages[stage.id] || '';
  }

  private getNextStage(current: EvolutionStage): EvolutionStage | null {
    const currentIndex = this.stages.findIndex(s => s.id === current.id);
    return this.stages[currentIndex + 1] || null;
  }

  private getXPForStage(stage: EvolutionStage): number {
    const xp: Record<string, number> = {
      'young_owl': 100,
      'wise_owl': 250
    };
    return xp[stage.id] || 0;
  }

  async getEvolutionProgress(userId: string, criteria: EvolutionCriteria): Promise<EvolutionProgress> {
    const [diaryCount, streak] = await Promise.all([
      this.diaryRepository.countEntries(userId),
      this.userRepository.getCurrentStreak(userId)
    ]);

    return {
      diaryEntries: { current: diaryCount, required: criteria.minDiaryEntries },
      streakDays: { current: streak, required: criteria.minStreakDays },
      percentage: Math.min(100, Math.round(
        ((diaryCount / criteria.minDiaryEntries) + (streak / criteria.minStreakDays)) / 2 * 100
      ))
    };
  }

  getStageGreeting(stage: EvolutionStage): string {
    const greetings: Record<string, string[]> = {
      'owlet': [
        'Привет! Я Соня, твой совёнок-помощник! 🐣',
        'Ух-ух! Совёнок Соня готова помочь! 🐣',
        'Здравствуй! Маленькая Соня рада тебя видеть! 🐣'
      ],
      'young_owl': [
        'Привет! Молодая сова Соня к твоим услугам! 🦉',
        'Ух-ух! Соня подросла и готова помогать! 🦉',
        'Здравствуй, друг! Соня рада встрече! 🦉'
      ],
      'wise_owl': [
        'Приветствую тебя! Мудрая Соня всегда рядом. 🦉✨',
        'Ух-ух! Мудрость Сони к твоим услугам! 🦉✨',
        'Здравствуй, мастер сна! Соня горда тобой! 🦉✨'
      ]
    };

    const stageGreetings = greetings[stage.id] || greetings['owlet'];
    return stageGreetings[Math.floor(Math.random() * stageGreetings.length)];
  }
}
```

#### Sprint 3-4: Voice Diary + Sleep Quests

**Цель:** Голосовой ввод дневника и система персональных челленджей

**Задачи:**

| # | Задача | Приоритет | Оценка | Ответственный |
|---|--------|-----------|--------|---------------|
| 3.1 | Интегрировать Whisper API | P0 | 6h | Backend Dev |
| 3.2 | Создать VoiceDiaryHandler | P0 | 8h | Backend Dev |
| 3.3 | Обработка Telegram voice messages | P0 | 4h | Backend Dev |
| 3.4 | Создать QuestService | P1 | 8h | Backend Dev |
| 3.5 | Определить 10 начальных квестов | P1 | 4h | Product |
| 3.6 | Создать BadgeService | P1 | 4h | Backend Dev |
| 3.7 | UI для отображения квестов в боте | P1 | 4h | Backend Dev |
| 3.8 | Notifications о прогрессе | P2 | 4h | Backend Dev |
| 3.9 | Unit + Integration тесты | P0 | 6h | QA |

**Код: WhisperService**

```typescript
// src/modules/voice/WhisperService.ts

import OpenAI from 'openai';
import { createReadStream } from 'fs';
import { writeFile, unlink } from 'fs/promises';
import { v4 as uuid } from 'uuid';
import path from 'path';

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  confidence: number;
}

export class WhisperService {
  private openai: OpenAI;
  private tempDir: string;

  constructor(apiKey: string, tempDir: string = '/tmp') {
    this.openai = new OpenAI({ apiKey });
    this.tempDir = tempDir;
  }

  async transcribe(audioBuffer: Buffer, mimeType: string = 'audio/ogg'): Promise<TranscriptionResult> {
    const tempFile = path.join(this.tempDir, `${uuid()}.ogg`);

    try {
      // Сохраняем буфер во временный файл
      await writeFile(tempFile, audioBuffer);

      // Транскрибируем через Whisper API
      const response = await this.openai.audio.transcriptions.create({
        file: createReadStream(tempFile),
        model: 'whisper-1',
        language: 'ru',
        response_format: 'verbose_json'
      });

      return {
        text: response.text,
        language: response.language || 'ru',
        duration: response.duration || 0,
        confidence: this.calculateConfidence(response)
      };
    } finally {
      // Удаляем временный файл
      await unlink(tempFile).catch(() => {});
    }
  }

  private calculateConfidence(response: any): number {
    // Whisper не возвращает confidence напрямую,
    // используем эвристику на основе segments
    if (!response.segments || response.segments.length === 0) {
      return 0.8; // default confidence
    }

    const avgLogprob = response.segments.reduce(
      (sum: number, seg: any) => sum + (seg.avg_logprob || 0),
      0
    ) / response.segments.length;

    // Конвертируем log probability в confidence
    return Math.min(1, Math.max(0, Math.exp(avgLogprob)));
  }

  async transcribeFromUrl(url: string): Promise<TranscriptionResult> {
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    return this.transcribe(buffer);
  }
}
```

**Код: VoiceDiaryHandler**

```typescript
// src/modules/voice/VoiceDiaryHandler.ts

import { Context } from 'grammy';
import { WhisperService } from './WhisperService';
import { DiaryService } from '../../architecture/services/implementations/DiaryService';
import { EmotionalRecognitionService } from '../../enterprise/intelligence/emotional/EnhancedEmotionalRecognitionService';

export class VoiceDiaryHandler {
  constructor(
    private whisperService: WhisperService,
    private diaryService: DiaryService,
    private emotionService: EmotionalRecognitionService,
    private bot: ITelegramBot
  ) {}

  async handleVoiceMessage(ctx: Context): Promise<void> {
    const voice = ctx.message?.voice;
    if (!voice) return;

    const userId = ctx.from?.id.toString();
    if (!userId) return;

    // Показываем typing indicator
    await ctx.replyWithChatAction('typing');

    try {
      // Получаем файл голосового сообщения
      const file = await ctx.api.getFile(voice.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

      // Транскрибируем
      const transcription = await this.whisperService.transcribeFromUrl(fileUrl);

      if (transcription.text.length < 10) {
        await ctx.reply(
          '🎤 Сообщение слишком короткое. Попробуй рассказать подробнее о своём сне или настроении.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Анализируем эмоции в тексте
      const emotionAnalysis = await this.emotionService.analyzeEmotion(
        { userId, chatId: ctx.chat?.id.toString() || '' },
        transcription.text,
        'adult' // или получить из профиля пользователя
      );

      // Создаём запись в дневнике
      const entry = await this.diaryService.createEntry({
        userId,
        content: transcription.text,
        source: 'voice',
        voiceDuration: voice.duration,
        emotion: emotionAnalysis.primaryEmotion,
        emotionIntensity: emotionAnalysis.emotionIntensity
      });

      // Формируем ответ
      const response = this.formatResponse(transcription, emotionAnalysis, entry);
      await ctx.reply(response, { parse_mode: 'Markdown' });

      // Проверяем эволюцию Сони
      await this.checkEvolutionAfterDiary(userId, ctx);

    } catch (error) {
      console.error('Voice diary error:', error);
      await ctx.reply(
        '😔 Не удалось обработать голосовое сообщение. Попробуй ещё раз или напиши текстом.',
        { parse_mode: 'Markdown' }
      );
    }
  }

  private formatResponse(
    transcription: TranscriptionResult,
    emotion: EmotionAnalysis,
    entry: DiaryEntry
  ): string {
    const emotionEmoji = this.getEmotionEmoji(emotion.primaryEmotion);

    return `
📔 *Запись в дневнике сохранена!*

🎤 _"${this.truncateText(transcription.text, 100)}"_

${emotionEmoji} Настроение: *${this.translateEmotion(emotion.primaryEmotion)}*
📊 Интенсивность: ${this.getIntensityBar(emotion.emotionIntensity)}

${this.getEmotionResponse(emotion)}

_Запись #${entry.id} • ${new Date().toLocaleDateString('ru-RU')}_
    `.trim();
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  private getEmotionEmoji(emotion: string): string {
    const emojis: Record<string, string> = {
      'joy': '😊', 'sadness': '😢', 'anger': '😠', 'fear': '😨',
      'stress': '😰', 'anxiety': '😟', 'calm': '😌', 'hope': '🌟',
      'neutral': '😐', 'tired': '😴', 'confused': '🤔'
    };
    return emojis[emotion] || '💭';
  }

  private translateEmotion(emotion: string): string {
    const translations: Record<string, string> = {
      'joy': 'Радость', 'sadness': 'Грусть', 'anger': 'Злость',
      'fear': 'Страх', 'stress': 'Стресс', 'anxiety': 'Тревога',
      'calm': 'Спокойствие', 'hope': 'Надежда', 'neutral': 'Нейтральное',
      'tired': 'Усталость', 'confused': 'Замешательство'
    };
    return translations[emotion] || emotion;
  }

  private getIntensityBar(intensity: number): string {
    const filled = Math.round(intensity * 5);
    return '●'.repeat(filled) + '○'.repeat(5 - filled);
  }

  private getEmotionResponse(emotion: EmotionAnalysis): string {
    if (emotion.riskLevel === 'critical' || emotion.riskLevel === 'high') {
      return '💚 Соня заметила, что тебе непросто. Если нужна поддержка, используй /emergency';
    }

    const responses: Record<string, string> = {
      'joy': '🌟 Как здорово! Соня рада за тебя!',
      'sadness': '💙 Соня рядом. Всё пройдёт.',
      'stress': '🧘 Попробуй /relax для расслабления.',
      'anxiety': '🌿 Дыхательные упражнения могут помочь.',
      'tired': '🌙 Отдых — это важно. Заботься о себе.',
      'calm': '✨ Отличное состояние для здорового сна!'
    };

    return responses[emotion.primaryEmotion] || '💭 Спасибо, что поделился.';
  }

  private async checkEvolutionAfterDiary(userId: string, ctx: Context): Promise<void> {
    // Эта логика вызывается из SonyaEvolutionService
    // Placeholder для интеграции
  }
}
```

**Код: QuestService**

```typescript
// src/modules/quests/QuestService.ts

export interface Quest {
  id: string;
  title: string;
  description: string;
  category: 'sleep' | 'diary' | 'mindfulness' | 'digital_detox';
  duration: number; // days
  criteria: QuestCriteria;
  reward: QuestReward;
  difficulty: 'easy' | 'medium' | 'hard';
  icon: string;
}

export interface QuestCriteria {
  type: 'daily' | 'cumulative' | 'streak';
  metric: string;
  target: number;
  validator: (progress: QuestProgress) => boolean;
}

export interface QuestReward {
  xp: number;
  badge?: string;
  unlocks?: string[];
}

export interface ActiveQuest {
  odzyskuestId: string
  odzyskuestId: string;
  odzyskuestId: string;
  userId: string;
  questId: string;
  startedAt: Date;
  expiresAt: Date;
  progress: Record<string, number>;
  status: 'active' | 'completed' | 'failed' | 'expired';
}

export class QuestService {
  private quests: Map<string, Quest> = new Map();

  constructor(
    private questRepository: IQuestRepository,
    private userRepository: IUserRepository,
    private notificationService: INotificationService
  ) {
    this.initializeQuests();
  }

  private initializeQuests(): void {
    const defaultQuests: Quest[] = [
      {
        id: 'sleep_7h_5d',
        title: '7 часов сна',
        description: 'Спи минимум 7 часов каждую ночь в течение 5 дней',
        category: 'sleep',
        duration: 5,
        criteria: {
          type: 'streak',
          metric: 'sleep_hours',
          target: 7,
          validator: (p) => p.consecutiveDays >= 5
        },
        reward: { xp: 100, badge: 'consistent_sleeper' },
        difficulty: 'medium',
        icon: '😴'
      },
      {
        id: 'diary_streak_7',
        title: 'Дневник на неделю',
        description: 'Веди дневник 7 дней подряд',
        category: 'diary',
        duration: 7,
        criteria: {
          type: 'streak',
          metric: 'diary_entries',
          target: 1,
          validator: (p) => p.consecutiveDays >= 7
        },
        reward: { xp: 75, badge: 'diary_master' },
        difficulty: 'easy',
        icon: '📔'
      },
      {
        id: 'digital_detox_3d',
        title: 'Цифровой детокс',
        description: 'Не используй телефон за час до сна 3 дня',
        category: 'digital_detox',
        duration: 3,
        criteria: {
          type: 'streak',
          metric: 'no_phone_before_bed',
          target: 1,
          validator: (p) => p.consecutiveDays >= 3
        },
        reward: { xp: 50, badge: 'digital_detox' },
        difficulty: 'easy',
        icon: '📵'
      },
      {
        id: 'mindful_10_sessions',
        title: 'Путь осознанности',
        description: 'Выполни 10 сессий релаксации',
        category: 'mindfulness',
        duration: 14,
        criteria: {
          type: 'cumulative',
          metric: 'relax_sessions',
          target: 10,
          validator: (p) => p.totalCount >= 10
        },
        reward: { xp: 120, badge: 'mindful_master' },
        difficulty: 'medium',
        icon: '🧘'
      },
      {
        id: 'sleep_quality_improve',
        title: 'Улучшение качества',
        description: 'Улучши качество сна на 1 балл за 2 недели',
        category: 'sleep',
        duration: 14,
        criteria: {
          type: 'cumulative',
          metric: 'sleep_quality_delta',
          target: 1,
          validator: (p) => p.qualityImprovement >= 1
        },
        reward: { xp: 150, badge: 'sleep_improver' },
        difficulty: 'hard',
        icon: '⭐'
      },
      {
        id: 'bedtime_routine_5d',
        title: 'Режим засыпания',
        description: 'Ложись спать в одно время (±30 мин) 5 дней',
        category: 'sleep',
        duration: 5,
        criteria: {
          type: 'streak',
          metric: 'consistent_bedtime',
          target: 1,
          validator: (p) => p.consecutiveDays >= 5
        },
        reward: { xp: 80, badge: 'routine_master' },
        difficulty: 'medium',
        icon: '🕐'
      },
      {
        id: 'voice_diary_5',
        title: 'Голосовой дневник',
        description: 'Запиши 5 голосовых записей в дневник',
        category: 'diary',
        duration: 10,
        criteria: {
          type: 'cumulative',
          metric: 'voice_entries',
          target: 5,
          validator: (p) => p.totalCount >= 5
        },
        reward: { xp: 60, badge: 'voice_journaler' },
        difficulty: 'easy',
        icon: '🎤'
      },
      {
        id: 'emotion_tracking_14d',
        title: 'Эмоциональный трекер',
        description: 'Отслеживай эмоции 14 дней',
        category: 'diary',
        duration: 14,
        criteria: {
          type: 'cumulative',
          metric: 'emotion_logs',
          target: 14,
          validator: (p) => p.totalCount >= 14
        },
        reward: { xp: 100, badge: 'emotion_aware' },
        difficulty: 'medium',
        icon: '💭'
      },
      {
        id: 'weekend_warrior',
        title: 'Выходной режим',
        description: 'Сохрани режим сна в выходные (2 недели)',
        category: 'sleep',
        duration: 14,
        criteria: {
          type: 'cumulative',
          metric: 'weekend_routine',
          target: 4,
          validator: (p) => p.weekendSuccesses >= 4
        },
        reward: { xp: 130, badge: 'weekend_warrior' },
        difficulty: 'hard',
        icon: '🏆'
      },
      {
        id: 'breathing_master',
        title: 'Мастер дыхания',
        description: 'Выполни 20 дыхательных упражнений',
        category: 'mindfulness',
        duration: 30,
        criteria: {
          type: 'cumulative',
          metric: 'breathing_sessions',
          target: 20,
          validator: (p) => p.totalCount >= 20
        },
        reward: { xp: 200, badge: 'breathing_master', unlocks: ['advanced_breathing'] },
        difficulty: 'hard',
        icon: '🌬️'
      }
    ];

    for (const quest of defaultQuests) {
      this.quests.set(quest.id, quest);
    }
  }

  async getAvailableQuests(userId: string): Promise<Quest[]> {
    const activeQuests = await this.questRepository.getActiveQuests(userId);
    const completedQuests = await this.questRepository.getCompletedQuestIds(userId);

    const activeQuestIds = new Set(activeQuests.map(q => q.questId));
    const completedQuestIds = new Set(completedQuests);

    return Array.from(this.quests.values())
      .filter(quest => !activeQuestIds.has(quest.id))
      .filter(quest => !completedQuestIds.has(quest.id))
      .slice(0, 5); // Показываем максимум 5 доступных квестов
  }

  async startQuest(userId: string, questId: string): Promise<ActiveQuest> {
    const quest = this.quests.get(questId);
    if (!quest) throw new Error(`Quest ${questId} not found`);

    const existingActive = await this.questRepository.getActiveQuests(userId);
    if (existingActive.length >= 3) {
      throw new Error('Maximum 3 active quests allowed');
    }

    const activeQuest: ActiveQuest = {
      odzyskuestId: `${userId}_${questId}_${Date.now()}`,
      odzyskuestId: `${userId}_${questId}_${Date.now()}`,
      odzyskuestId: `${userId}_${questId}_${Date.now()}`,
      userId,
      questId,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + quest.duration * 24 * 60 * 60 * 1000),
      progress: {},
      status: 'active'
    };

    await this.questRepository.create(activeQuest);
    return activeQuest;
  }

  async updateProgress(userId: string, metric: string, value: number): Promise<void> {
    const activeQuests = await this.questRepository.getActiveQuests(userId);

    for (const activeQuest of activeQuests) {
      const quest = this.quests.get(activeQuest.questId);
      if (!quest || quest.criteria.metric !== metric) continue;

      activeQuest.progress[metric] = (activeQuest.progress[metric] || 0) + value;
      await this.questRepository.update(activeQuest);

      // Проверяем завершение
      if (quest.criteria.validator(this.buildQuestProgress(activeQuest))) {
        await this.completeQuest(userId, activeQuest);
      }
    }
  }

  private async completeQuest(userId: string, activeQuest: ActiveQuest): Promise<void> {
    const quest = this.quests.get(activeQuest.questId)!;

    activeQuest.status = 'completed';
    await this.questRepository.update(activeQuest);

    // Начисляем награды
    await this.userRepository.addXP(userId, quest.reward.xp);

    if (quest.reward.badge) {
      await this.userRepository.addBadge(userId, quest.reward.badge);
    }

    // Отправляем уведомление
    await this.notificationService.sendQuestCompleted(userId, quest);
  }

  private buildQuestProgress(activeQuest: ActiveQuest): QuestProgress {
    // Конвертируем raw progress в структуру для валидатора
    return {
      consecutiveDays: activeQuest.progress['consecutive_days'] || 0,
      totalCount: Object.values(activeQuest.progress).reduce((a, b) => a + b, 0),
      qualityImprovement: activeQuest.progress['quality_delta'] || 0,
      weekendSuccesses: activeQuest.progress['weekend_success'] || 0
    };
  }

  formatQuestMessage(quest: Quest, active?: ActiveQuest): string {
    const statusEmoji = active
      ? (active.status === 'completed' ? '✅' : '🔄')
      : '📋';

    let message = `
${statusEmoji} *${quest.icon} ${quest.title}*
${quest.description}

⏱ Длительность: ${quest.duration} дней
💎 Награда: ${quest.reward.xp} XP
${quest.reward.badge ? `🏅 Бейдж: ${quest.reward.badge}` : ''}
    `.trim();

    if (active && active.status === 'active') {
      const progress = this.calculateProgressPercentage(quest, active);
      message += `\n\n📊 Прогресс: ${progress}%`;
      message += `\n⏳ Осталось: ${this.getDaysRemaining(active)} дней`;
    }

    return message;
  }

  private calculateProgressPercentage(quest: Quest, active: ActiveQuest): number {
    const progress = this.buildQuestProgress(active);
    // Simplified calculation
    return Math.min(100, Math.round(
      (Object.values(active.progress).reduce((a, b) => a + b, 0) / quest.criteria.target) * 100
    ));
  }

  private getDaysRemaining(active: ActiveQuest): number {
    const now = new Date();
    const expires = new Date(active.expiresAt);
    return Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
  }
}
```

#### Sprint 5-6: Интеграция и тестирование Фазы B1

**Задачи:**

| # | Задача | Приоритет | Оценка | Ответственный |
|---|--------|-----------|--------|---------------|
| 5.1 | Интеграция всех модулей в EnterpriseStartupFactory | P0 | 4h | Backend Dev |
| 5.2 | Обновление команд с новыми сервисами | P0 | 6h | Backend Dev |
| 5.3 | End-to-end тестирование | P0 | 8h | QA |
| 5.4 | Performance тестирование | P1 | 4h | Backend Dev |
| 5.5 | Документация API | P1 | 4h | Backend Dev |
| 5.6 | Деплой staging | P0 | 2h | DevOps |
| 5.7 | UAT тестирование | P0 | 8h | QA + Product |
| 5.8 | Bug fixes | P0 | 8h | Backend Dev |
| 5.9 | Релиз Фазы B1 | P0 | 2h | Team |

---

### Фаза B2: Telegram Mini App (Недели 7-12)

#### Sprint 7-8: Базовая структура Mini App

**Цель:** Создать основу Mini App с navigation и Telegram SDK интеграцией

**Задачи:**

| # | Задача | Приоритет | Оценка | Ответственный |
|---|--------|-----------|--------|---------------|
| 7.1 | Инициализация проекта (Vite + React + TypeScript) | P0 | 2h | Frontend Dev |
| 7.2 | Настройка Telegram Mini App SDK | P0 | 4h | Frontend Dev |
| 7.3 | Создание базовых компонентов (Button, Card, etc) | P0 | 6h | Frontend Dev |
| 7.4 | Настройка роутинга | P0 | 3h | Frontend Dev |
| 7.5 | Интеграция с backend API | P0 | 6h | Frontend Dev |
| 7.6 | Создание Haptics service | P0 | 4h | Frontend Dev |
| 7.7 | Создание темы (цвета, шрифты) | P1 | 4h | Frontend Dev |
| 7.8 | Тестирование на iOS/Android | P0 | 4h | QA |

**Код: Telegram SDK Integration**

```typescript
// mini-app/src/services/telegram.ts

import WebApp from '@twa-dev/sdk';

export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  photoUrl?: string;
}

class TelegramService {
  private webApp: typeof WebApp;

  constructor() {
    this.webApp = WebApp;
  }

  init(): void {
    this.webApp.ready();
    this.webApp.expand();

    // Настраиваем цвета под тему Telegram
    this.webApp.setHeaderColor('#1a1a2e');
    this.webApp.setBackgroundColor('#16213e');
  }

  getUser(): TelegramUser | null {
    const user = this.webApp.initDataUnsafe.user;
    if (!user) return null;

    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      languageCode: user.language_code,
      photoUrl: user.photo_url
    };
  }

  getInitData(): string {
    return this.webApp.initData;
  }

  close(): void {
    this.webApp.close();
  }

  showAlert(message: string): Promise<void> {
    return new Promise((resolve) => {
      this.webApp.showAlert(message, resolve);
    });
  }

  showConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.webApp.showConfirm(message, resolve);
    });
  }

  showPopup(params: {
    title?: string;
    message: string;
    buttons?: Array<{ id: string; type: 'ok' | 'close' | 'cancel' | 'default' | 'destructive'; text: string }>;
  }): Promise<string> {
    return new Promise((resolve) => {
      this.webApp.showPopup(params, (buttonId) => resolve(buttonId || 'close'));
    });
  }

  // Main Button
  showMainButton(text: string, onClick: () => void): void {
    this.webApp.MainButton.setText(text);
    this.webApp.MainButton.onClick(onClick);
    this.webApp.MainButton.show();
  }

  hideMainButton(): void {
    this.webApp.MainButton.hide();
  }

  setMainButtonLoading(loading: boolean): void {
    if (loading) {
      this.webApp.MainButton.showProgress();
    } else {
      this.webApp.MainButton.hideProgress();
    }
  }

  // Back Button
  showBackButton(onClick: () => void): void {
    this.webApp.BackButton.onClick(onClick);
    this.webApp.BackButton.show();
  }

  hideBackButton(): void {
    this.webApp.BackButton.hide();
  }

  // Theme
  getTheme(): 'light' | 'dark' {
    return this.webApp.colorScheme;
  }

  getThemeParams() {
    return this.webApp.themeParams;
  }

  // Platform info
  getPlatform(): string {
    return this.webApp.platform;
  }

  isIOS(): boolean {
    return this.webApp.platform === 'ios';
  }

  isAndroid(): boolean {
    return this.webApp.platform === 'android';
  }

  // Viewport
  getViewportHeight(): number {
    return this.webApp.viewportHeight;
  }

  getViewportStableHeight(): number {
    return this.webApp.viewportStableHeight;
  }

  // Send data to bot
  sendData(data: string): void {
    this.webApp.sendData(data);
  }

  // Open links
  openLink(url: string): void {
    this.webApp.openLink(url);
  }

  openTelegramLink(url: string): void {
    this.webApp.openTelegramLink(url);
  }
}

export const telegram = new TelegramService();
```

**Код: Haptics Service**

```typescript
// mini-app/src/services/haptics.ts

import WebApp from '@twa-dev/sdk';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
export type NotificationType = 'error' | 'success' | 'warning';

class HapticsService {
  private hapticFeedback = WebApp.HapticFeedback;
  private isSupported: boolean;

  constructor() {
    this.isSupported = this.checkSupport();
  }

  private checkSupport(): boolean {
    // iOS поддерживает все, Android частично
    return WebApp.platform === 'ios' || WebApp.platform === 'android';
  }

  /**
   * Лёгкая вибрация для UI feedback
   */
  impact(style: HapticStyle = 'medium'): void {
    if (!this.isSupported) return;

    try {
      this.hapticFeedback.impactOccurred(style);
    } catch (e) {
      console.warn('Haptic impact failed:', e);
    }
  }

  /**
   * Уведомление (success/error/warning)
   */
  notification(type: NotificationType): void {
    if (!this.isSupported) return;

    try {
      this.hapticFeedback.notificationOccurred(type);
    } catch (e) {
      console.warn('Haptic notification failed:', e);
    }
  }

  /**
   * Изменение выбора (для sliders, pickers)
   */
  selectionChanged(): void {
    if (!this.isSupported) return;

    try {
      this.hapticFeedback.selectionChanged();
    } catch (e) {
      console.warn('Haptic selection failed:', e);
    }
  }

  // === BREATHING PATTERNS ===

  /**
   * Паттерн для вдоха (нарастающий)
   */
  async breatheIn(durationMs: number = 4000): Promise<void> {
    if (!this.isSupported) return;

    const steps = 4;
    const interval = durationMs / steps;
    const styles: HapticStyle[] = ['soft', 'light', 'medium', 'heavy'];

    for (let i = 0; i < steps; i++) {
      this.impact(styles[i]);
      await this.sleep(interval);
    }
  }

  /**
   * Паттерн для задержки дыхания (стабильный)
   */
  async holdBreath(durationMs: number = 7000): Promise<void> {
    if (!this.isSupported) return;

    const pulseInterval = 1500;
    const pulses = Math.floor(durationMs / pulseInterval);

    for (let i = 0; i < pulses; i++) {
      this.impact('soft');
      await this.sleep(pulseInterval);
    }
  }

  /**
   * Паттерн для выдоха (затухающий)
   */
  async breatheOut(durationMs: number = 8000): Promise<void> {
    if (!this.isSupported) return;

    const steps = 4;
    const interval = durationMs / steps;
    const styles: HapticStyle[] = ['heavy', 'medium', 'light', 'soft'];

    for (let i = 0; i < steps; i++) {
      this.impact(styles[i]);
      await this.sleep(interval);
    }
  }

  /**
   * Полный цикл 4-7-8 breathing
   */
  async breathing478Cycle(): Promise<void> {
    // 4 секунды вдох
    await this.breatheIn(4000);

    // 7 секунд задержка
    await this.holdBreath(7000);

    // 8 секунд выдох
    await this.breatheOut(8000);
  }

  /**
   * Box breathing (4-4-4-4)
   */
  async boxBreathingCycle(): Promise<void> {
    // 4 секунды вдох
    await this.breatheIn(4000);

    // 4 секунды задержка
    await this.holdBreath(4000);

    // 4 секунды выдох
    await this.breatheOut(4000);

    // 4 секунды задержка
    await this.holdBreath(4000);
  }

  /**
   * Relaxing breath (медленный)
   */
  async relaxingBreathCycle(): Promise<void> {
    // 6 секунд вдох
    await this.breatheIn(6000);

    // 2 секунды пауза
    await this.holdBreath(2000);

    // 8 секунд выдох
    await this.breatheOut(8000);
  }

  /**
   * Success feedback (завершение упражнения)
   */
  celebrationFeedback(): void {
    this.notification('success');
    setTimeout(() => this.impact('heavy'), 200);
    setTimeout(() => this.impact('medium'), 400);
    setTimeout(() => this.impact('light'), 600);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const haptics = new HapticsService();
```

#### Sprint 9-10: Haptic Breathing Component

**Цель:** Создать интерактивный компонент дыхательных упражнений

**Код: HapticBreathing Component**

```tsx
// mini-app/src/components/breathing/HapticBreathing.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '../../services/haptics';
import { telegram } from '../../services/telegram';
import { BreathingCircle } from './BreathingCircle';
import { BreathingPattern, BREATHING_PATTERNS } from './patterns';
import styles from './HapticBreathing.module.css';

interface HapticBreathingProps {
  onComplete?: (cycles: number) => void;
  onCancel?: () => void;
}

type BreathingPhase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'hold2' | 'complete';

export const HapticBreathing: React.FC<HapticBreathingProps> = ({
  onComplete,
  onCancel
}) => {
  const [selectedPattern, setSelectedPattern] = useState<BreathingPattern>(BREATHING_PATTERNS[0]);
  const [phase, setPhase] = useState<BreathingPhase>('idle');
  const [currentCycle, setCurrentCycle] = useState(0);
  const [totalCycles, setTotalCycles] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const phaseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, []);

  const getPhaseInstruction = (): string => {
    switch (phase) {
      case 'inhale': return 'Вдыхай...';
      case 'hold': return 'Задержи...';
      case 'exhale': return 'Выдыхай...';
      case 'hold2': return 'Пауза...';
      case 'complete': return 'Отлично!';
      default: return 'Готов?';
    }
  };

  const runPhase = useCallback(async (
    phaseName: BreathingPhase,
    durationMs: number,
    hapticFn: () => Promise<void>
  ): Promise<void> => {
    setPhase(phaseName);
    setTimeRemaining(Math.ceil(durationMs / 1000));

    // Start haptic pattern
    hapticFn();

    // Countdown timer
    return new Promise((resolve) => {
      let remaining = durationMs;
      timerRef.current = setInterval(() => {
        remaining -= 100;
        setTimeRemaining(Math.ceil(remaining / 1000));

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          resolve();
        }
      }, 100);
    });
  }, []);

  const runCycle = useCallback(async (): Promise<void> => {
    const pattern = selectedPattern;

    // Inhale
    await runPhase('inhale', pattern.inhale * 1000, () =>
      haptics.breatheIn(pattern.inhale * 1000)
    );

    // Hold (if pattern has it)
    if (pattern.hold > 0) {
      await runPhase('hold', pattern.hold * 1000, () =>
        haptics.holdBreath(pattern.hold * 1000)
      );
    }

    // Exhale
    await runPhase('exhale', pattern.exhale * 1000, () =>
      haptics.breatheOut(pattern.exhale * 1000)
    );

    // Hold2 (for box breathing)
    if (pattern.hold2 && pattern.hold2 > 0) {
      await runPhase('hold2', pattern.hold2 * 1000, () =>
        haptics.holdBreath(pattern.hold2 * 1000)
      );
    }
  }, [selectedPattern, runPhase]);

  const startExercise = useCallback(async () => {
    setIsRunning(true);
    setCurrentCycle(0);

    haptics.notification('success');

    for (let i = 0; i < totalCycles; i++) {
      setCurrentCycle(i + 1);
      await runCycle();
    }

    // Completion
    setPhase('complete');
    haptics.celebrationFeedback();
    setIsRunning(false);

    if (onComplete) {
      onComplete(totalCycles);
    }
  }, [totalCycles, runCycle, onComplete]);

  const stopExercise = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);

    setIsRunning(false);
    setPhase('idle');
    setCurrentCycle(0);

    haptics.notification('warning');

    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // Setup Telegram buttons
  useEffect(() => {
    if (isRunning) {
      telegram.showMainButton('Остановить', stopExercise);
    } else if (phase === 'complete') {
      telegram.showMainButton('Готово', () => {
        telegram.close();
      });
    } else {
      telegram.showMainButton('Начать', startExercise);
    }

    return () => {
      telegram.hideMainButton();
    };
  }, [isRunning, phase, startExercise, stopExercise]);

  return (
    <div className={styles.container}>
      {/* Pattern Selector (hidden during exercise) */}
      {!isRunning && phase !== 'complete' && (
        <div className={styles.patternSelector}>
          <h3>Выбери технику дыхания</h3>
          <div className={styles.patterns}>
            {BREATHING_PATTERNS.map((pattern) => (
              <button
                key={pattern.id}
                className={`${styles.patternButton} ${
                  selectedPattern.id === pattern.id ? styles.selected : ''
                }`}
                onClick={() => {
                  setSelectedPattern(pattern);
                  haptics.selectionChanged();
                }}
              >
                <span className={styles.patternIcon}>{pattern.icon}</span>
                <span className={styles.patternName}>{pattern.name}</span>
                <span className={styles.patternTiming}>
                  {pattern.inhale}-{pattern.hold}-{pattern.exhale}
                  {pattern.hold2 ? `-${pattern.hold2}` : ''}
                </span>
              </button>
            ))}
          </div>

          {/* Cycles Selector */}
          <div className={styles.cyclesSelector}>
            <span>Количество циклов:</span>
            <div className={styles.cycleButtons}>
              {[3, 5, 7, 10].map((num) => (
                <button
                  key={num}
                  className={`${styles.cycleButton} ${
                    totalCycles === num ? styles.selected : ''
                  }`}
                  onClick={() => {
                    setTotalCycles(num);
                    haptics.selectionChanged();
                  }}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Breathing Circle */}
      <div className={styles.circleContainer}>
        <BreathingCircle
          phase={phase}
          timeRemaining={timeRemaining}
          pattern={selectedPattern}
        />
      </div>

      {/* Instruction */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={styles.instruction}
        >
          {getPhaseInstruction()}
        </motion.div>
      </AnimatePresence>

      {/* Progress */}
      {isRunning && (
        <div className={styles.progress}>
          Цикл {currentCycle} из {totalCycles}
        </div>
      )}

      {/* Completion Message */}
      {phase === 'complete' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={styles.completion}
        >
          <span className={styles.celebrationEmoji}>🎉</span>
          <h2>Отлично!</h2>
          <p>Ты выполнил {totalCycles} циклов дыхания</p>
          <p className={styles.benefit}>
            {selectedPattern.benefit}
          </p>
        </motion.div>
      )}
    </div>
  );
};
```

**Код: Breathing Patterns**

```typescript
// mini-app/src/components/breathing/patterns.ts

export interface BreathingPattern {
  id: string;
  name: string;
  icon: string;
  description: string;
  benefit: string;
  inhale: number;  // seconds
  hold: number;    // seconds
  exhale: number;  // seconds
  hold2?: number;  // seconds (for box breathing)
}

export const BREATHING_PATTERNS: BreathingPattern[] = [
  {
    id: '478',
    name: '4-7-8 Релакс',
    icon: '🌙',
    description: 'Техника доктора Вейла для засыпания',
    benefit: 'Активирует парасимпатическую нервную систему, помогает заснуть',
    inhale: 4,
    hold: 7,
    exhale: 8
  },
  {
    id: 'box',
    name: 'Квадратное',
    icon: '⬜',
    description: 'Техника Navy SEALs для фокусировки',
    benefit: 'Снижает стресс и улучшает концентрацию',
    inhale: 4,
    hold: 4,
    exhale: 4,
    hold2: 4
  },
  {
    id: 'relaxing',
    name: 'Успокаивающее',
    icon: '🍃',
    description: 'Глубокое медленное дыхание',
    benefit: 'Снижает тревогу и успокаивает разум',
    inhale: 6,
    hold: 2,
    exhale: 8
  },
  {
    id: 'energizing',
    name: 'Бодрящее',
    icon: '⚡',
    description: 'Активирующее дыхание',
    benefit: 'Повышает энергию и бодрость',
    inhale: 4,
    hold: 0,
    exhale: 4
  },
  {
    id: 'coherent',
    name: 'Когерентное',
    icon: '💚',
    description: '5.5 вдохов в минуту для сердечной когерентности',
    benefit: 'Оптимизирует вариабельность сердечного ритма (HRV)',
    inhale: 5,
    hold: 0,
    exhale: 5
  }
];

export const getPatternById = (id: string): BreathingPattern | undefined => {
  return BREATHING_PATTERNS.find(p => p.id === id);
};

export const getPatternDuration = (pattern: BreathingPattern): number => {
  return pattern.inhale + pattern.hold + pattern.exhale + (pattern.hold2 || 0);
};

export const getTotalDuration = (pattern: BreathingPattern, cycles: number): number => {
  return getPatternDuration(pattern) * cycles;
};

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs} сек`;
  if (secs === 0) return `${mins} мин`;
  return `${mins} мин ${secs} сек`;
};
```

#### Sprint 11-12: Sonya Avatar + Payments + Integration

**Задачи финальные для Фазы B2:**

| # | Задача | Приоритет | Оценка |
|---|--------|-----------|--------|
| 11.1 | Sonya Avatar component с анимациями | P0 | 8h |
| 11.2 | Sleep Diary Form в Mini App | P0 | 6h |
| 11.3 | Quest Progress visualization | P1 | 6h |
| 11.4 | Telegram Stars payments integration | P1 | 8h |
| 11.5 | Deep linking между Bot и Mini App | P0 | 4h |
| 11.6 | Полное E2E тестирование | P0 | 8h |
| 11.7 | Performance optimization | P1 | 4h |
| 11.8 | Деплой Mini App | P0 | 4h |
| 11.9 | Релиз Фазы B2 | P0 | 2h |

---

### Фаза B3: Wearables + Dream Weaver (Недели 13-20)

#### Sprint 13-14: Wearables Integration

**Код: Terra Service (Unified Wearables API)**

```typescript
// src/modules/wearables/TerraService.ts

import axios from 'axios';

export interface SleepData {
  userId: string;
  date: string;
  duration_minutes: number;
  efficiency: number;
  stages: {
    deep_minutes: number;
    light_minutes: number;
    rem_minutes: number;
    awake_minutes: number;
  };
  heart_rate: {
    avg: number;
    min: number;
    max: number;
  };
  hrv?: number;
  respiratory_rate?: number;
}

export interface WearableConnection {
  userId: string;
  provider: 'fitbit' | 'garmin' | 'oura' | 'whoop';
  connected: boolean;
  lastSync: Date | null;
}

export class TerraService {
  private apiKey: string;
  private devId: string;
  private baseUrl = 'https://api.tryterra.co/v2';

  constructor(apiKey: string, devId: string) {
    this.apiKey = apiKey;
    this.devId = devId;
  }

  /**
   * Генерирует widget URL для подключения wearable
   */
  async generateWidgetSession(
    userId: string,
    providers: string[] = ['FITBIT', 'GARMIN', 'OURA']
  ): Promise<string> {
    const response = await axios.post(
      `${this.baseUrl}/auth/generateWidgetSession`,
      {
        reference_id: userId,
        providers: providers,
        language: 'ru'
      },
      {
        headers: {
          'dev-id': this.devId,
          'x-api-key': this.apiKey
        }
      }
    );

    return response.data.url;
  }

  /**
   * Получает данные о сне за указанный период
   */
  async getSleepData(
    terraUserId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SleepData[]> {
    const response = await axios.get(
      `${this.baseUrl}/sleep`,
      {
        params: {
          user_id: terraUserId,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        },
        headers: {
          'dev-id': this.devId,
          'x-api-key': this.apiKey
        }
      }
    );

    return response.data.data.map((item: any) => this.mapSleepData(item));
  }

  /**
   * Получает последнюю ночь сна
   */
  async getLastNightSleep(terraUserId: string): Promise<SleepData | null> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const data = await this.getSleepData(terraUserId, yesterday, today);
    return data.length > 0 ? data[data.length - 1] : null;
  }

  /**
   * Проверяет статус подключения
   */
  async getConnectionStatus(terraUserId: string): Promise<WearableConnection[]> {
    const response = await axios.get(
      `${this.baseUrl}/userInfo`,
      {
        params: { user_id: terraUserId },
        headers: {
          'dev-id': this.devId,
          'x-api-key': this.apiKey
        }
      }
    );

    return response.data.user.providers.map((p: any) => ({
      userId: terraUserId,
      provider: p.provider.toLowerCase(),
      connected: p.status === 'active',
      lastSync: p.last_webhook_update ? new Date(p.last_webhook_update) : null
    }));
  }

  /**
   * Деавторизует пользователя
   */
  async disconnect(terraUserId: string): Promise<void> {
    await axios.delete(
      `${this.baseUrl}/auth/deauthenticateUser`,
      {
        params: { user_id: terraUserId },
        headers: {
          'dev-id': this.devId,
          'x-api-key': this.apiKey
        }
      }
    );
  }

  private mapSleepData(raw: any): SleepData {
    const sleepData = raw.sleep_durations_data;

    return {
      userId: raw.user.user_id,
      date: raw.metadata.start_time.split('T')[0],
      duration_minutes: Math.round(
        (sleepData.asleep?.duration_asleep_state_seconds || 0) / 60
      ),
      efficiency: sleepData.sleep_efficiency || 0,
      stages: {
        deep_minutes: Math.round(
          (sleepData.asleep?.duration_deep_sleep_state_seconds || 0) / 60
        ),
        light_minutes: Math.round(
          (sleepData.asleep?.duration_light_sleep_state_seconds || 0) / 60
        ),
        rem_minutes: Math.round(
          (sleepData.asleep?.duration_REM_sleep_state_seconds || 0) / 60
        ),
        awake_minutes: Math.round(
          (sleepData.awake?.duration_awake_state_seconds || 0) / 60
        )
      },
      heart_rate: {
        avg: raw.heart_rate_data?.summary?.avg_hr_bpm || 0,
        min: raw.heart_rate_data?.summary?.min_hr_bpm || 0,
        max: raw.heart_rate_data?.summary?.max_hr_bpm || 0
      },
      hrv: raw.heart_rate_data?.summary?.avg_hrv_rmssd,
      respiratory_rate: raw.respiration_data?.avg_breaths_per_min
    };
  }
}
```

#### Sprint 15-16: Dream Weaver (AI Audio Stories)

**Код: StoryGeneratorService**

```typescript
// src/modules/dream-weaver/StoryGeneratorService.ts

import OpenAI from 'openai';
import { TTSService } from './TTSService';
import { ThemeAnalyzer } from './ThemeAnalyzer';

export interface StoryThemes {
  stressors: string[];
  preferences: string[];
  emotionalState: string;
  timeOfDay: 'evening' | 'night';
  ageGroup: 'child' | 'teen' | 'adult';
}

export interface GeneratedStory {
  id: string;
  title: string;
  script: string;
  duration: number; // estimated minutes
  themes: string[];
  audioUrl?: string;
}

export class StoryGeneratorService {
  private openai: OpenAI;

  constructor(
    private ttsService: TTSService,
    private themeAnalyzer: ThemeAnalyzer,
    apiKey: string
  ) {
    this.openai = new OpenAI({ apiKey });
  }

  async generateStory(
    userId: string,
    diaryEntries: string[],
    preferences?: Partial<StoryThemes>
  ): Promise<GeneratedStory> {
    // Анализируем темы из дневника
    const themes = await this.themeAnalyzer.analyze(diaryEntries);
    const mergedThemes = { ...themes, ...preferences };

    // Генерируем сценарий
    const script = await this.generateScript(mergedThemes);

    // Генерируем аудио
    const audioBuffer = await this.ttsService.synthesize(script.text);
    const audioUrl = await this.ttsService.uploadAudio(audioBuffer, userId);

    return {
      id: `story_${Date.now()}`,
      title: script.title,
      script: script.text,
      duration: Math.ceil(script.text.length / 150), // ~150 символов в минуту для спокойного чтения
      themes: mergedThemes.preferences,
      audioUrl
    };
  }

  private async generateScript(themes: StoryThemes): Promise<{ title: string; text: string }> {
    const systemPrompt = this.buildSystemPrompt(themes);
    const userPrompt = this.buildUserPrompt(themes);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 2000
    });

    const content = response.choices[0].message.content || '';

    // Парсим заголовок и текст
    const lines = content.split('\n');
    const title = lines[0].replace(/^#\s*/, '').trim();
    const text = lines.slice(1).join('\n').trim();

    return { title, text };
  }

  private buildSystemPrompt(themes: StoryThemes): string {
    return `
Ты — мастер медитативных историй для сна. Твоя задача — создавать успокаивающие,
расслабляющие истории, которые помогают людям заснуть.

Правила:
1. Пиши на русском языке
2. Используй медленный, плавный ритм повествования
3. Включай сенсорные описания (запахи, звуки, ощущения)
4. Избегай драматичных поворотов и напряжённых моментов
5. Используй успокаивающие образы: природа, вода, мягкий свет
6. Длина истории: 800-1200 слов (5-8 минут чтения)
7. Заканчивай историю плавным переходом в сон

Возрастная группа: ${themes.ageGroup === 'child' ? 'для детей (простой язык, сказочные элементы)'
  : themes.ageGroup === 'teen' ? 'для подростков (современные образы)'
  : 'для взрослых (глубокие метафоры)'}

Текущее эмоциональное состояние пользователя: ${themes.emotionalState}
${themes.stressors.length > 0 ? `Источники стресса (избегай этих тем): ${themes.stressors.join(', ')}` : ''}
    `.trim();
  }

  private buildUserPrompt(themes: StoryThemes): string {
    const settings = themes.preferences.length > 0
      ? themes.preferences.join(', ')
      : 'спокойная природа, лес, озеро';

    return `
Создай успокаивающую историю для засыпания.

Предпочтительная обстановка: ${settings}
Время: ${themes.timeOfDay === 'night' ? 'глубокая ночь' : 'вечер'}

Формат ответа:
# [Название истории]

[Текст истории...]
    `.trim();
  }
}
```

---

## Бюджет и ресурсы

### Разбивка бюджета

| Категория | Фаза B1 | Фаза B2 | Фаза B3 | Итого |
|-----------|---------|---------|---------|-------|
| **Разработка** | $5,000 | $12,000 | $8,000 | $25,000 |
| **Дизайн** | $500 | $2,000 | $500 | $3,000 |
| **Тестирование** | $500 | $1,000 | $500 | $2,000 |
| **Инфраструктура** | $200 | $500 | $300 | $1,000 |
| **External APIs** | $100 | $200 | $500 | $800 |
| **Буфер (15%)** | — | — | — | $4,770 |
| **ИТОГО** | $6,300 | $15,700 | $9,800 | **$36,570** |

### Ежемесячные операционные расходы (после запуска)

| Сервис | Стоимость/мес | Примечание |
|--------|---------------|------------|
| OpenAI Whisper | ~$50-100 | Зависит от voice messages |
| OpenAI GPT-4o | ~$50-100 | Dream Weaver stories |
| ElevenLabs TTS | ~$100-200 | Audio stories |
| Terra API | ~$100-200 | Wearables data |
| Hosting (Vercel/Railway) | ~$50 | Mini App hosting |
| **ИТОГО** | **$350-650/мес** | При 1000 активных пользователей |

### Команда

| Роль | Занятость | Ответственность |
|------|-----------|-----------------|
| **Backend Developer** | Full-time | Bot, API, интеграции |
| **Frontend Developer** | Full-time | Mini App |
| **QA Engineer** | Part-time | Тестирование |
| **Product Owner** | Part-time | Приоритизация, UX |

---

## Риски и митигация

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Android haptics не работают | Высокая | Среднее | Visual fallback, iOS-first стратегия |
| Whisper accuracy для Russian | Средняя | Среднее | Fine-tuned модель, user correction UI |
| Terra API изменения | Низкая | Высокое | Абстракция через adapter pattern |
| Telegram Mini App bugs | Средняя | Среднее | Thorough testing, fallback к боту |
| Превышение бюджета на APIs | Средняя | Среднее | Rate limiting, caching, usage alerts |
| Задержки в разработке | Средняя | Среднее | Agile sprints, MVP-first approach |

---

## KPI и критерии успеха

### Фаза B1 (неделя 6)

| KPI | Target | Метод измерения |
|-----|--------|-----------------|
| Voice diary adoption | 20% users | Analytics |
| Adaptive keyboard CTR | +10% vs baseline | A/B test |
| Sonya evolution rate | 30% reach stage 2 | Database query |
| Quest completion | 40% started quests | Database query |

### Фаза B2 (неделя 12)

| KPI | Target | Метод измерения |
|-----|--------|-----------------|
| Mini App MAU | 500+ | Telegram analytics |
| Breathing sessions/user | 3+/week | Analytics |
| Haptic satisfaction | 4.0+/5.0 | In-app survey |
| Mini App retention D7 | 30%+ | Cohort analysis |

### Фаза B3 (неделя 20)

| KPI | Target | Метод измерения |
|-----|--------|-----------------|
| Wearables connected | 15% users | Database query |
| Dream Weaver usage | 10% evening users | Analytics |
| Sleep quality improvement | +0.5 pts | ISI scores |
| Overall NPS | 40+ | Survey |

---

## Заключение

Данный план обеспечивает поэтапную реализацию Варианта B с минимальными рисками и максимальной валидацией на каждом этапе.

**Ключевые milestone:**
- **Неделя 6:** MVP в текущем боте (адаптивная клавиатура, Sonya evolution, voice diary)
- **Неделя 12:** Telegram Mini App (haptic breathing, rich UI)
- **Неделя 20:** Full platform (wearables, AI stories)

**Следующий шаг:** Утверждение плана и начало Sprint 1.
