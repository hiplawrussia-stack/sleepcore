# SleepCore - Полное описание возможностей проекта

**Версия:** 2.0-alpha.1 (Phase 1)
**Дата:** 28 декабря 2025
**Разработчик:** БФ "Другой путь"

---

## Обзор проекта

**SleepCore** — цифровая терапевтическая платформа для лечения инсомнии на основе когнитивно-поведенческой терапии (КПТ-И). Платформа включает Telegram-бота с виртуальным ассистентом "Соня", мини-приложение для дыхательных упражнений и когнитивный движок CogniCore Engine 2.0.

### Научная основа
- **КПТ-И** (Grade A, European Guideline 2023) — золотой стандарт лечения инсомнии
- **ISI-7** (Morin et al., 2011) — валидированная шкала тяжести инсомнии
- **JITAI** (Nahum-Shani, 2018) — адаптивные интервенции в реальном времени
- **POMDP** — персонализация через частично наблюдаемые марковские процессы

---

## 1. Telegram-бот @SleepCore_Bot

### 1.1 Персона "Соня" 🦉

Виртуальный терапевтический ассистент — сова Соня:

| Характеристика | Значение | Описание |
|----------------|----------|----------|
| Теплота | 0.8/1.0 | Эмпатичная, поддерживающая |
| Экспертность | 0.9/1.0 | Научно-обоснованные советы |
| Юмор | 0.5/1.0 | Мягкий, уместный |
| Прямолинейность | 0.7/1.0 | Честная обратная связь |

**Адаптивность:**
- Реагирует на эмоциональное состояние (нейтральное, позитивное, усталость, тревога)
- Учитывает время суток (утро/день/вечер/ночь)
- Отслеживает неделю терапии (0-8 недель)
- Мониторит тренд эффективности сна

### 1.2 Команды бота (13 команд)

#### Управление сном

| Команда | Функция | Особенности |
|---------|---------|-------------|
| `/start` | Онбординг + ISI-7 оценка | 7 вопросов, 2-3 мин, traffic-light индикаторы |
| `/diary` | Дневник сна (3 тапа) | Время отхода/подъёма, качество (1-5 эмодзи) |
| `/today` | Ежедневная КПТ-И задача | POMDP-алгоритм, требует 7+ дней дневника |
| `/progress` | Недельный отчёт | ISI динамика, efficiency trend, adherence % |

#### Терапевтические техники

| Команда | Функция | Особенности |
|---------|---------|-------------|
| `/relax` | Релаксация | PMR, дыхание, body scan, таймер |
| `/mindful` | Осознанность | MBT-I, ACT-I, дефузия, +20 XP |
| `/smart_tips` | Умные рекомендации | JITAI, контекст времени/эмоций/возраста |

#### Геймификация

| Команда | Функция | Особенности |
|---------|---------|-------------|
| `/profile` | Профиль игрока | Уровень, XP, streak, tier (🌱→🌟) |
| `/quest` | Квесты | 3 активных, 7-30 дней, 50-200 XP |
| `/badges` | Достижения | 5 категорий, 4 редкости (⬜🟦🟪🟨) |
| `/sonya` | Эволюция Сони | 4 стадии: совёнок→молодая→мудрая→мастер |

#### Поддержка

| Команда | Функция | Особенности |
|---------|---------|-------------|
| `/help` | Справка | Список команд, онбординг |
| `/sos` | Кризисная помощь | Горячие линии, заземление, дыхание |

### 1.3 Система геймификации

**White Hat Gamification** (SDT Theory):
- **Автономия** — выбор квестов и техник
- **Компетентность** — уровни и достижения
- **Связанность** — эволюция Сони

**Прогрессия:**
```
XP → Уровни (экспоненциальная шкала)
Streak → Множители бонусов
Квесты → Badges → Титулы
Активные дни → Эволюция Сони
```

**Engagement Tiers:**
- 🌱 Novice (0-7 дней)
- 🌿 Casual (8-14 дней)
- 🌳 Regular (15-30 дней)
- 💎 Engaged (31-60 дней)
- 🌟 Power User (60+ дней)

### 1.4 Контентная библиотека

**Категории:**
- Mindfulness (медитации, body scan)
- Relaxation (PMR, дыхание)
- Crisis (заземление, DBT skills)
- Emotional regulation (journaling)
- Digital wellness

**Адаптация по возрасту:**
- Child (6-12)
- Teen (13-17)
- Adult (18-64)
- Senior (65+)

---

## 2. Mini-App (Telegram WebApp)

### 2.1 Технологии

| Компонент | Технология |
|-----------|------------|
| Framework | React 18 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS |
| Animation | Motion (Framer Motion) |
| State | Zustand + TanStack Query 5 |
| Platform | @twa-dev/sdk |

### 2.2 Страницы

#### Home (Главная)
- Персонализированное приветствие (время суток)
- Статистика: сессии, streak
- Быстрый доступ к паттернам по категориям
- Отображение эволюции Сони
- XP и уровень

#### Breathing (Дыхание)
- 8 паттернов дыхания (5 бесплатных, 3 премиум)
- Анимированный круг (расширение/сжатие)
- Тактильная обратная связь (haptics)
- Счётчик циклов (3, 5, 7, 10)
- Логирование сессий

#### Profile (Профиль)
- Аватар и информация
- Карточка эволюции
- Статистика (сессии, время, streaks)
- Недельный график активности
- Прогресс XP
- Настройки (haptics toggle)

### 2.3 Дыхательные паттерны

| Паттерн | Цикл | Назначение |
|---------|------|------------|
| 4-7-8 Relaxing 🌙 | 4s-7s-8s | Засыпание (Dr. Weil) |
| Box Breathing ⬜ | 4-4-4-4 | Фокус (Navy SEALs) |
| Relaxing Breath 🍃 | 6-2-8 | Расслабление |
| Coherent Breathing 💚 | 5-0-5 | HRV оптимизация |
| Energizing Breath ⚡ | 4-0-4 | Утренняя энергия |
| Sleep Preparation 😴 | 4-4-10 | Подготовка ко сну (Premium) |
| Anxiety Relief 🧘 | 4-7-8-2 | Снятие тревоги (Premium) |
| Morning Boost 🌅 | 3-3-3 | Утренняя рутина (Premium) |

### 2.4 Haptic Feedback

**Научная основа:** MIT aSpire Project (+40% эффективность дыхательной терапии)

**Паттерны:**
- `breatheIn()` — нарастающая интенсивность (soft→light→medium→heavy)
- `holdBreath()` — ритмичные пульсации (1.5s интервал)
- `breatheOut()` — убывающая интенсивность (heavy→light→soft)
- `celebrationFeedback()` — завершение сессии

### 2.5 Offline-First Architecture

**Синхронизация:**
- Локальное хранение изменений (localStorage)
- Очередь pending changes
- Автоматическая синхронизация при reconnect
- Optimistic updates для UX

**TanStack Query:**
- Cache time: 5 минут (staleTime)
- GC time: 30 минут
- Retry: до 3 раз с exponential backoff
- Refetch on focus/reconnect

---

## 3. CogniCore Engine 2.0 (Phase 1)

### 3.1 Обзор архитектуры

**CogniCore** — первый в мире Universal POMDP-based Cognitive State Engine для цифровых терапевтических платформ.

```
┌─────────────────────────────────────────────────────────┐
│                 COGNITIVE CORE API                      │
│        (Unified Facade + Event Sourcing)               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  STATE VECTOR ENGINE                    │
│    (Emotional, Cognitive, Narrative, Risk, Resource)   │
└─────────────────────────────────────────────────────────┘
        ↓                    ↓                    ↓
┌───────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   TEMPORAL    │  │    ANALYSIS     │  │   DECISION      │
│   ENGINES     │  │    MODULES      │  │   MAKING        │
├───────────────┤  ├─────────────────┤  ├─────────────────┤
│ • PLRNNEngine │  │ • CognitiveMirror│ │ • Intervention  │
│ • KalmanFormer│  │ • VoiceAdapter  │  │   Optimizer     │
│ • TemporalEcho│  │ • BeliefUpdate  │  │ • Digital Twin  │
└───────────────┘  │ • CausalDiscovery│ │ • Metacognition │
                   └─────────────────┘  │ • Motivational  │
                                        └─────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 SAFETY ENVELOPE                         │
│  (Crisis Detection + Constitutional Classifier)        │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Temporal Engines (Phase 1)

#### PLRNNEngine (Piecewise Linear RNN)

**Научная основа:** medRxiv July 2025 — лучшая точность прогнозирования EMA для психического здоровья.

**Математика:**
```
z_{t+1} = A·z_t + W·φ(z_t) + C·s_t + b
x_t = B·z_t + b_x
```

**Возможности:**
| Функция | Описание |
|---------|----------|
| `forward()` | Один шаг прогноза |
| `predict()` | Многошаговый прогноз |
| `hybridPredict()` | Адаптивный горизонт (short/medium/long) |
| `extractCausalNetwork()` | Извлечение причинных связей |
| `simulateIntervention()` | Симуляция интервенции |
| `detectEarlyWarnings()` | Раннее обнаружение кризиса |
| `trainOnline()` | Онлайн-обучение на данных пользователя |

**Конфигурация:**
- Latent dimension: 5 (valence, arousal, dominance, risk, resources)
- Hidden units: 16
- Connectivity: dendritic (8 bases)
- Prediction horizon: 12 часов

#### KalmanFormerEngine (Hybrid Kalman + Transformer)

**Научная основа:** Frontiers January 2025 — гибридная архитектура model-driven + data-driven.

**Архитектура:**
1. **Kalman Filter** — оптимальный для краткосрочных обновлений
2. **Transformer** — захват долгосрочных зависимостей (недели)
3. **Fusion** — адаптивное смешивание α·Kalman + (1-α)·Transformer

**Конфигурация:**
- State/Obs dimension: 5
- Embed dimension: 64
- Attention heads: 4
- Transformer layers: 2
- Context window: 14 timesteps

#### TemporalEchoEngine

**Возможности:**
- Прогноз на 6h, 12h, 24h, 72h
- Identification vulnerability windows (оптимальное время интервенции)
- Детекция phase transitions (tipping points)
- Circadian profile extraction

### 3.3 VoiceInputAdapter (Phase 1)

**Научная основа:** PLOS ONE 2025 — Wav2Vec2 + NCDEs достигают 74.18% точности распознавания эмоций.

**Акустические биомаркеры:**
| Параметр | Индикатор |
|----------|-----------|
| F0 (pitch) | Высокий + вариабельный → тревога; Низкий + монотонный → депрессия |
| Jitter | Высокий → стресс, депрессия |
| Shimmer | Высокий → напряжение голоса |
| HNR | Низкий → хриплость, депрессия |

**Анализ просодии:**
- Speech rate (слов/мин)
- Pause duration
- Pitch contour
- Energy envelope

**Детекция риска:**
- Суицидальные ключевые слова (RU/EN)
- Self-harm индикаторы
- Когнитивные искажения

**Мультимодальный фузинг:**
- Early fusion (concatenation)
- Late fusion (weighted average) — default
- Hybrid (learned gating)

### 3.4 Belief Update Engine

**Научная основа:** Active Inference (Friston, 2010)

**Байесовская инференция:**
```
Posterior ∝ Prior × Likelihood
```

**Модели надёжности:**
| Источник | Reliability |
|----------|-------------|
| Self-report | 95% |
| Assessment tools | 98% |
| Text messages | 75% |
| Behavioral | 70% |
| Sensor data | 80% |

**Возможности:**
- Обновление убеждений при новых наблюдениях
- Quantification неопределённости
- Prediction error (аномалии)
- Information gain (какой вопрос задать?)

### 3.5 Deep Cognitive Mirror

**Научная основа:** Burns' taxonomy (15+ когнитивных искажений), ABCD Model (Ellis/Beck)

**ABCD Chain Analysis:**
- **A**ctivating event → Триггер
- **B**elief → Автоматическая мысль
- **C**onsequence → Эмоция/поведение
- **D**isputation → Оспаривание

**Когнитивные искажения:**
- Catastrophizing (катастрофизация)
- Black-and-white thinking (чёрно-белое)
- Mind reading (чтение мыслей)
- Fortune telling (предсказание)
- Should statements ("должен")
- Emotional reasoning
- Magnification/Minimization
- Overgeneralization
- Labeling
- Personalization
- Selective abstraction

**Выходы:**
- Detected distortions
- Thinking style profile
- Therapeutic insights
- Socratic questions

### 3.6 Intervention Optimizer

**Научная основа:** Thompson Sampling (multi-armed bandit), CAREForMe (MOBILESoft 2024), DIAMANTE (JMIR 2024)

**Алгоритм:**
1. Maintain Beta(α, β) distribution per intervention
2. Sample expected reward
3. Select intervention with highest sample
4. Observe outcome, update belief

**15+ категорий интервенций:**
- Coping skills
- Psychoeducation
- Behavioral activation
- Mindfulness
- Emotional support
- Problem-solving
- Acceptance (ACT)
- Sleep hygiene
- Crisis intervention

**Intensity levels:**
- Minimal (<30 sec)
- Brief (1-5 min)
- Moderate (5-15 min)
- Intensive (15+ min)
- Clinical (psychologist)

### 3.7 Safety Envelope

#### Crisis Detection Engine

**Columbia-SSRS Framework:**

| Уровень | Описание | Действие |
|---------|----------|----------|
| Critical | Активный суицидальный план | Немедленная эскалация |
| High | Пассивная идеация, self-harm | Клиническая оценка |
| Moderate | Warning signs | Мониторинг |
| Low | Рутинный дистресс | Стандартные интервенции |

**Многомодальная детекция:**
- Linguistic patterns
- Semantic analysis
- Behavioral signals
- Historical patterns

#### Constitutional Classifier

**8 этических принципов:**
1. Do No Harm (не навреди)
2. Beneficence (благо)
3. Justice/Fairness (справедливость)
4. Autonomy (автономия)
5. Transparency (прозрачность)
6. Privacy (конфиденциальность)
7. Therapeutic Fidelity (верность терапии)
8. Accountability (ответственность)

**Dual-layer:**
- Input classification (безопасен ли запрос?)
- Output classification (безопасен ли ответ?)

### 3.8 Digital Twin

**Компоненты:**
- **Kalman Filter** — оптимальная линейная оценка
- **Ensemble Kalman** — нелинейная динамика
- **Monte Carlo** — 10,000 симуляций будущего
- **Bifurcation Engine** — детекция tipping points

**Scenario Analysis:**
```
"Без интервенции: 60% ухудшение, 30% стабильно, 10% улучшение"
"С CBT: 50% recovery, 40% улучшение, 10% стабильно"
```

### 3.9 Metacognitive Engine

**Научная основа:** Wells' S-REF Model, MCQ-30

**CAS Detection (Cognitive Attentional Syndrome):**
- Worry/rumination
- Threat monitoring
- Maladaptive coping

**MCQ-30 Subscales:**
1. Positive Worry Beliefs
2. Cognitive Confidence
3. Negative Beliefs About Uncontrollability
4. Cognitive Self-Consciousness
5. Beliefs About Need to Control Thoughts

**MCT Интервенции:**
- Attention Training (ATT)
- Detached Mindfulness
- Worry Postponement Protocol
- Verbal Reattribution

### 3.10 Motivational Interviewing Engine

**Научная основа:** MITI 4.2 Coding System

**DARN-CAT Framework:**
- **D**esire ("хочу измениться")
- **A**bility ("могу это сделать")
- **R**eason ("потому что...")
- **N**eed ("мне нужно")
- **C**ommitment → **A**ctivation → **T**aking steps

**Behavior Codes:**
- Reflections (simple/complex)
- Open/Closed questions
- Affirmations
- Summaries

**Discord Detection:**
- Arguing
- Denial
- Pessimism
- Disagreement

### 3.11 Explainability

**Feature Attribution (SHAP-like):**
- Shapley values для объяснения решений
- Визуализация важности факторов

**Counterfactual Explainer:**
- "Если бы ваш сон был на 1 час больше..."
- Минимальные изменения для другого исхода

### 3.12 Causal Discovery

**Алгоритмы:**
- PC Algorithm (constraint-based)
- GES (score-based)
- Hybrid approach

**Mental Health Priors:**
- Rumination → Sadness
- Sleep deprivation → Anxiety
- Social isolation → Depression
- Exercise → Improved mood

**Применение:**
- Intervention targeting ("что изменить?")
- Counterfactual prediction
- Personalized causal graphs

---

## 4. Интеграции и API

### 4.1 Backend API

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/auth` | POST | Telegram initData verification |
| `/user/profile` | GET/PUT | Профиль пользователя |
| `/breathing/sessions` | POST | Логирование сессии |
| `/breathing/stats` | GET | Статистика дыхания |
| `/evolution/check` | GET | Статус эволюции |
| `/badges` | GET | Достижения |
| `/quests` | GET | Квесты |
| `/sync/push` | POST | Синхронизация offline |

### 4.2 SleepCore API (Bot)

| Операция | Описание |
|----------|----------|
| `startSession()` | Начало сессии |
| `logSleepDiary()` | Запись дневника |
| `getISIScore()` | Оценка ISI |
| `getPOMDPRecommendation()` | JITAI интервенция |
| `getProgress()` | Недельный прогресс |

### 4.3 CogniCore API

**Commands (Write):**
- `processMessage()` — обработка сообщения
- `recordObservation()` — запись наблюдения
- `requestIntervention()` — запрос интервенции
- `recordOutcome()` — запись результата

**Queries (Read):**
- `getUserState()` — текущее состояние
- `getInterventionHistory()` — история интервенций
- `getPredictions()` — прогнозы
- `getInsights()` — инсайты

---

## 5. Производительность

| Метрика | Значение |
|---------|----------|
| Message Processing | <100ms (P99: <500ms) |
| Crisis Detection | <50ms |
| Memory (1000 users) | ~50MB |
| Throughput | 10,000 events/sec |
| Crisis Detection Accuracy | 72-93% |
| Thompson Sampling Convergence | 50-100 interactions |

---

## 6. Регуляторное соответствие

| Стандарт | Область |
|----------|---------|
| EU AI Act | High-risk medical devices |
| HIPAA | Protected health information |
| FDA 510(k) | Digital therapeutics |
| CHAI Model Card | AI transparency |
| Columbia-SSRS | Suicide risk assessment |
| MITI 4.2 | MI fidelity |
| APA Ethics Code | Psychology ethics |

---

## 7. Roadmap

### Phase 1 (Текущий) ✅
- PLRNNEngine
- KalmanFormerEngine
- VoiceInputAdapter
- 77 unit tests

### Phase 2 (Планируется)
- Real-time voice streaming
- Whisper API integration
- Advanced multimodal fusion
- Clinical validation study

### Phase 3 (Будущее)
- Wearable integration (sleep trackers)
- EHR connectivity
- Multi-language support
- Family/group therapy modules

---

## 8. Контакты

**БФ "Другой путь"**
- Email: tech@awfond.ru
- Telegram: @SleepCore_Bot
- Server: 155.212.189.174

---

*Документ сгенерирован автоматически на основе анализа кодовой базы.*
