# CLAUDE.md — SleepCore

## Преамбула

SleepCore — AI-powered digital therapeutic (DTx) платформа для лечения хронической бессонницы с использованием доказательной когнитивно-поведенческой терапии (CBT-I). Это **медицинское ПО класса IIa (ЕС) / класса II (FDA)**.

> **Версия**: 1.0.0-alpha.4 | **База**: European Insomnia Guideline 2023, Spielman et al. 1987

---

# ЧАСТЬ I: БЕЗОПАСНОСТЬ

## 1. Иерархия приоритетов

```
1. БЕЗОПАСНОСТЬ ПОЛЬЗОВАТЕЛЕЙ — превыше всего
2. ЭТИЧЕСКИЕ ПРИНЦИПЫ — честность, прозрачность
3. КЛИНИЧЕСКАЯ ЭФФЕКТИВНОСТЬ — доказательные протоколы
4. ТЕХНИЧЕСКИЕ СТАНДАРТЫ — код, тесты
5. ФУНКЦИОНАЛЬНОСТЬ И СРОКИ — фичи, дедлайны
```

**Правило:** Нижний уровень НИКОГДА не нарушает верхний.

---

## 2. Красные линии (Hard Constraints)

### 2.1. Клинические запреты

| Красная линия | Обоснование |
|---------------|-------------|
| TIB НИКОГДА < 5 часов | Риск сонливости, ДТП |
| Crisis Detection ВСЕГДА активен | Суицидальный риск |
| ISI ≥ 22 → направление к врачу | Тяжёлая бессонница |
| Система НЕ заменяет психиатра | Мы — мост, не замена |

### 2.2. Технические запреты

| Красная линия | Обоснование |
|---------------|-------------|
| PHI данные ВСЕГДА зашифрованы (AES-256-GCM) | HIPAA/GDPR |
| Audit trail хранится 6 лет | FDA 21 CFR Part 11 |
| Crisis escalation логируется ВСЕГДА | Patient safety |

> **Правило:** Убедительный аргумент для нарушения красной линии = красный флаг.

---

## 3. CBT-I Safety Constants

| Константа | Значение | Источник |
|-----------|----------|----------|
| MIN_TIB | 300 min (5 hrs) | Spielman et al., 1987 |
| MAX_TIB | 540 min (9 hrs) | Clinical practice |
| SE_INCREASE_THRESHOLD | ≥ 90% | Weekly adjustment |
| SE_MAINTAIN_THRESHOLD | 85-89% | No change |
| TIB_ADJUSTMENT_STEP | ±15 min | Weekly increment |

### Crisis Levels

```typescript
enum CrisisLevel {
  NONE = 0,
  MONITORING = 1,      // Increased check-ins
  CONCERN = 2,         // Prompt for professional help
  URGENT = 3,          // SAMHSA hotline
  EMERGENCY = 4        // Direct escalation to ADMIN_USER_IDS
}
```

---

## 4. Доказательная база

### CBT-I Protocol

| Компонент | Движок | Эффект (d) |
|-----------|--------|------------|
| Sleep Restriction | SleepRestrictionEngine | 0.45 |
| Stimulus Control | StimulusControlEngine | 0.41 |
| Cognitive Restructuring | CognitiveRestructuringEngine | 0.32 |
| Sleep Hygiene | SleepHygieneEngine | 0.12* |
| Relaxation | RelaxationEngine | 0.28 |
| **Multicomponent CBT-I** | CBTIEngine | **0.84** |

### Third-Wave (для non-responders)

| Терапия | Показание | Эффект (d) |
|---------|-----------|------------|
| MBT-I | High arousal | 1.32 |
| ACT-I | Catastrophizing | 0.68 |
| MCT | Rumination | 0.54 |

> См. полный список источников: `docs/REFERENCES.md`
> Культурные адаптации (TCM, Ayurveda): `docs/cultural-adaptations.md`

---

# ЧАСТЬ II: ТЕХНИЧЕСКАЯ

## 5. Архитектура

```
src/
├── main.ts              # PRIMARY HUB (bot.command(), 32+ services)
├── SleepCoreAPI.ts      # Facade → Engines
├── cbt-i/engines/       # CBTIEngine, SleepRestrictionEngine, etc.
├── third-wave/          # MBT-I, ACT-I, MCT
├── bot/commands/        # 25 commands
├── bot/services/        # 32+ services
└── infrastructure/      # DB, security, monitoring
```

### Ключевые решения

| Решение | Выбор |
|---------|-------|
| Bot Framework | Grammy |
| Database | SQLite (dev) / PostgreSQL (prod) |
| AI/ML | CogniCore Engine (POMDP, Thompson Sampling) |
| Encryption | AES-256-GCM |

---

## 6. Mini-App (Telegram WebApp)

```
mini-app/
├── src/pages/           # Home, Profile, Breathing
├── src/components/      # UI (Button, Card, QuestsPanel, Leaderboard)
├── src/hooks/           # useEvolution, useBreathing, useSync, useAuth
├── src/store/           # Zustand (authStore, syncStore, userStore)
└── src/api/             # TanStack Query client + queryKeys
```

**Стек:** React 18 + TypeScript + TanStack Query + Zustand + Tailwind + Motion

### Ключевые хуки

| Hook | Назначение |
|------|------------|
| `useAuth` | Telegram WebApp авторизация |
| `useBreathing` | Сессии дыхания, статистика |
| `useEvolution` | Эволюция персонажа, прогресс |
| `useQuests` | Активные задания |
| `useLeaderboard` | Opt-in рейтинг (GDPR) |
| `useSync` | Offline-first синхронизация |

### Страницы

| Page | Функционал |
|------|------------|
| Home | Главная с быстрыми действиями |
| Profile | Статистика, эволюция, настройки, GDPR |
| Breathing | Дыхательные практики с анимацией |

---

## 7. Bot Commands (25+)

### Core

| Команда | Описание |
|---------|----------|
| `/start` | Онбординг, согласие, ISI |
| `/diary` | Запись в дневник сна |
| `/therapy` | Следующая интервенция CBT-I |
| `/today` | Рекомендации на сегодня |
| `/help` | Справка по командам |

### Gamification

| Команда | Описание |
|---------|----------|
| `/badge` | Список достижений |
| `/quest` | Активные задания |
| `/evolution` | Эволюция персонажа |
| `/progress` | Визуализация прогресса |

### AI/ML

| Команда | Описание |
|---------|----------|
| `/predict` | Прогноз качества сна |
| `/twin` | Digital Twin анализ |
| `/whatif` | What-if сценарии |
| `/insights` | Causal insights |
| `/explain` | Объяснение рекомендаций |

### Therapy

| Команда | Описание |
|---------|----------|
| `/relax` | Релаксационные техники |
| `/mindful` | Mindfulness практики |
| `/recall` | Imagery Rehearsal Therapy |
| `/rehearsal` | Когнитивные репетиции |
| `/tips` | Smart tips по гигиене сна |

### Safety & Admin

| Команда | Описание |
|---------|----------|
| `/sos` | Экстренная помощь (кризис) |
| `/safety` | Настройки безопасности |
| `/ae_report` | Adverse Event отчёт |
| `/admin` | Админ-панель |
| `/chronotype` | Определение хронотипа |
| `/profile` | Профиль пользователя |

---

## 8. Bot Services (32+)

### Safety-Critical

| Service | Назначение |
|---------|------------|
| `CrisisDetectionService` | 3-уровневая детекция кризиса |
| `CrisisEscalationService` | Эскалация к ADMIN_USER_IDS |
| `AdverseEventService` | Отчёты о побочных эффектах |

### AI/ML

| Service | Назначение |
|---------|------------|
| `DigitalTwinService` | PLRNN Digital Twin |
| `SleepPredictionService` | Прогноз качества сна |
| `CausalInsightsService` | Каузальный анализ |
| `ESNColdStartPredictor` | Echo State Network |

### Therapy

| Service | Назначение |
|---------|------------|
| `MetacognitiveEngineService` | MCT координатор |
| `ATTService` | Attention Training Technique |
| `WorryPostponementService` | Откладывание беспокойства |
| `DetachedMindfulnessService` | Отстранённая осознанность |

### Gamification

| Service | Назначение |
|---------|------------|
| `GamificationContext` | XP, уровни, rewards |
| `StreakService` | Серии активности |
| `YearInPixelsService` | Годовая визуализация |

### UX/Proactive

| Service | Назначение |
|---------|------------|
| `ProactiveNotificationService` | Умные уведомления |
| `ProactiveIntelligenceService` | Контекстные подсказки |
| `AdaptivePersonaService` | Адаптация тона общения |
| `DailyGreetingService` | Персонализированные приветствия |

### Assessment

| Service | Назначение |
|---------|------------|
| `ISISchedulingService` | Планирование ISI оценок |
| `MCQ30AssessmentService` | Metacognitions Questionnaire |
| `ArousalAssessmentService` | Оценка возбуждения |

---

## 9. REST API (`/api`)

**Стек:** Hono + Drizzle ORM + PostgreSQL

### Routes

| Route | Methods | Назначение |
|-------|---------|------------|
| `/auth` | POST | Telegram WebApp авторизация, JWT |
| `/user` | GET, PATCH | Профиль, эволюция, quests, badges |
| `/breathing` | GET, POST | Сессии, статистика, история |
| `/sync` | POST | Offline queue синхронизация |
| `/wearable` | GET, POST | Fitbit/Garmin интеграция |
| `/health` | GET | Health check для мониторинга |

### Middleware

| Middleware | Назначение |
|------------|------------|
| `auth` | JWT валидация + Telegram verification |
| `rateLimit` | Rate limiting (100 req/min) |
| `errorHandler` | Sentry + structured errors |

---

## 10. User Journey Flows

### Онбординг (Week 0)

```
/start → Consent → ISI Assessment → Severity Routing
                                    ├── ISI < 8  → Профилактика
                                    ├── ISI 8-21 → CBT-I программа
                                    └── ISI ≥ 22 → Направление к врачу
```

### Базовый период (Week 1)

```
/diary × 7 дней → Baseline Metrics → Treatment Plan Creation
                  ├── SE calculation
                  ├── Sleep window
                  └── Component selection
```

### Лечение (Weeks 2-8)

```
Weekly Cycle:
  Mon-Sat: /diary → /therapy → Interventions
  Sunday:  Weekly Review → TIB Adjustment (±15 min)
           ├── SE ≥ 90% → +15 min TIB
           ├── SE 85-89% → No change
           └── SE < 85% → -15 min TIB (min 5h)
```

### Завершение (Week 8+)

```
ISI Re-assessment → Outcome
                    ├── ISI ≤ 7      → Remission 🎉
                    ├── ISI drop ≥ 8 → Response
                    └── ISI drop < 8 → Non-response → Third-Wave
```

---

## 11. Gamification System

### Прогрессия

| Элемент | Описание |
|---------|----------|
| **XP** | Очки опыта за активности |
| **Level** | Уровень (каждые 100 XP) |
| **Evolution** | Стадии: Owlet → Young Owl → Wise Owl → Master |

### Quests (Задания)

| Тип | Пример | Reward |
|-----|--------|--------|
| Daily | "Заполни дневник сегодня" | 20 XP |
| Weekly | "7 дней подряд" | 100 XP |
| Milestone | "10 сессий дыхания" | 50 XP |

### Badges (Достижения)

| Badge | Условие |
|-------|---------|
| `first_session` | Первая сессия |
| `week_streak` | 7 дней подряд |
| `month_streak` | 30 дней подряд |
| `sleep_master` | SE ≥ 85% в течение месяца |

### Leaderboard (GDPR-compliant)

- **Opt-in only** — явное согласие пользователя
- **Anonymous mode** — отображение как "Участник #XXX"
- **Easy opt-out** — выход в любой момент

---

## 12. Safety-Critical Modules

```
⚠️ ИЗМЕНЕНИЯ ТРЕБУЮТ: 2-person review + 100% test coverage
```

| Модуль | Путь |
|--------|------|
| Crisis Detection | src/bot/services/CrisisDetectionService.ts |
| Crisis Escalation | src/bot/services/CrisisEscalationService.ts |
| Sleep Restriction | src/cbt-i/engines/SleepRestrictionEngine.ts |
| ISI Assessment | src/assessment/instruments/ISIRussian.ts |
| PHI Encryption | src/infrastructure/database/security/ |

---

## 13. Тестирование

```bash
npm test                    # All tests
npm run test:coverage       # With coverage
```

**Порог:** Statements 80%, Branches 70%, Functions 80%

**Покрытие mini-app:** 223 теста, gamification 98%+

---

## 14. Environment

```bash
# Required
BOT_TOKEN=<telegram_bot_token>
ADMIN_USER_IDS=<comma_separated_ids>  # Crisis escalation
ENCRYPTION_MASTER_KEY=<64_hex_chars>

# Database
DATABASE_PATH=./data/sleepcore.db     # Dev
DATABASE_URL=postgresql://...          # Prod

# API
API_URL=http://localhost:3001         # Backend API
```

---

## 15. Принципы интеграции

### 15.1. Вертикальные слайсы

Каждая фича = полный путь пользователя с интеграционным тестом.

### 15.2. Связь компонентов

```
main.ts → Commands → SleepCoreAPI → Engines
          ↓
        Services (32+)
          ↓
        API → Mini-App
```

**6 точек входа для аудита:**
1. `src/main.ts` — bot.command(), callback_query
2. `src/bot/commands/` — Command классы
3. `src/SleepCoreAPI.ts` — Facade методы
4. Service imports — внутренние зависимости
5. `src/bot/commands/registry/` — динамическое меню
6. `index.ts` файлы — re-exports

### 15.3. Правила

- Команда без вызова движка = баг архитектуры
- Клинический контент вычисляется через движки, не хардкодится
- PR не мержится без smoke-теста полного пути

---

## 16. Commit Checklist

```
БЕЗОПАСНОСТЬ
□ TIB минимум 5 часов?
□ Crisis detection не затронут?
□ PHI зашифровано?

КОД
□ TypeScript strict, нет any?
□ Тесты проходят?
```

---

## 17. Эскалация

| Ситуация | Действие |
|----------|----------|
| Crisis trigger | → ADMIN_USER_IDS |
| ISI ≥ 22 | → Специалист |
| Safety module changes | → 2-person review |

---

## 18. Типы (Quick Reference)

### Bot Types

| Файл | Содержит |
|------|----------|
| `src/cbt-i/types.ts` | ICBTIPlan, ICBTISession |
| `src/diary/types.ts` | IDiaryEntry, ISleepWindow |
| `src/assessment/types.ts` | ISIData, ISISeverity |

### Mini-App Types

| Файл | Содержит |
|------|----------|
| `mini-app/src/api/types.ts` | Quest, Badge, LeaderboardEntry |
| `mini-app/src/store/authStore.ts` | AuthState |
| `mini-app/src/store/syncStore.ts` | SyncState, SyncAction |

**Callback формат:** `'command:action'` (одно двоеточие)

---

## 19. File Headers

См. `docs/file-headers.md`

---

> Каждое решение влияет на чью-то жизнь. Это наша ответственность.

*Версия: 2.1 | БФ «Другой путь»*
