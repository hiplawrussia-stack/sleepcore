# SleepCore - Стратегический анализ конкурентного преимущества

**Дата**: Декабрь 2025
**Статус**: Глубокое исследование завершено

---

## 1. Что есть на рынке CBT-I

### Основные игроки

| Продукт | Компания | Технология | Цена | FDA |
|---------|----------|------------|------|-----|
| **SleepioRx** | Big Health | Rule-based CBT-I + анимированный персонаж | $100-450 | Cleared (Aug 2024) |
| **Somryst** | Pear Therapeutics | 9-недельная программа CBT-I | $899 | Authorized |
| **CBT-i Coach** | VA/DoD | Базовый CBT-I, статический контент | Бесплатно | - |
| **Calm/Headspace** | - | Медитация, не клинический CBT-I | $70/год | Wellness |
| **WELT-I** | WELT Corp | Алгоритм персонализации | - | Korea FDA |

### Технологический уровень конкурентов

```
┌─────────────────────────────────────────────────────────────────┐
│                    ТЕКУЩИЙ УРОВЕНЬ РЫНКА                        │
├─────────────────────────────────────────────────────────────────┤
│  Rule-based Systems          │  Статические алгоритмы          │
│  ↓                           │  ↓                              │
│  Sleepio: IF-THEN rules      │  Somryst: Fixed 9-week program  │
│  "Если ISI > 15, показать X" │  "Неделя 1 → Неделя 2 → ..."    │
├─────────────────────────────────────────────────────────────────┤
│  Персонализация: СЛАБАЯ                                         │
│  - Базовая адаптация по ISI score                              │
│  - Нет учёта контекста в реальном времени                      │
│  - Нет предсказания будущих состояний                          │
│  - Нет Digital Twin                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Критические пробелы (GAPS) на рынке

### 2.1 Проблема высокого Dropout

| Исследование | Dropout Rate | Причина |
|--------------|--------------|---------|
| Sleepio University (2017) | **50%** | Нет "живого" взаимодействия |
| KANOPEE app | **72%** | Задания слишком трудоёмкие |
| Generic dCBT-I | **33-49%** | Нет персонализации |
| Sleepio (лучший результат) | 12-20% | Анимации + напоминания |

**Вывод**: Даже лучшие решения теряют 12-50% пользователей.

### 2.2 Исключённые группы населения

Текущие dCBT-I **НЕ поддерживают**:
- Детей и подростков
- Пациентов с депрессией средней/тяжёлой степени
- Биполярное расстройство
- Сменных работников
- Не-англоговорящих пользователей
- Пожилых с низкой цифровой грамотностью

### 2.3 Технологические пробелы

| Gap | Описание | Статус у конкурентов |
|-----|----------|---------------------|
| **Real-time Adaptation** | Адаптация в реальном времени | Отсутствует |
| **Predictive Modeling** | Предсказание будущих проблем | Отсутствует |
| **Digital Twin** | Виртуальная модель пациента | Отсутствует |
| **JITAI** | Just-in-time adaptive interventions | Только в исследованиях |
| **Multi-armed Bandit** | Оптимизация интервенций | Только в исследованиях |
| **Wearable Integration** | Глубокая интеграция с носимыми | Базовая (Apple Health) |
| **Crisis Detection** | Детекция кризиса (insomnia + depression) | Ограниченная |

### 2.4 Проблема "One-size-fits-all"

> "Regarding group CBT, a common concern was it being not personalized, with young people expressing that the best thing to do would be talk to them about their individual circumstance."
> — Frontiers in Digital Health, 2024

---

## 3. Преимущества CogniCore Engine

### 3.1 Уникальная научная база

| Компонент CogniCore | Аналог у конкурентов | Преимущество |
|---------------------|---------------------|--------------|
| **POMDP Framework** | Rule-based IF-THEN | Математически оптимальные решения под неопределённость |
| **Bayesian Belief Update** | Статические пороги | Непрерывное обновление убеждений о состоянии |
| **Thompson Sampling** | Фиксированный контент | Адаптивный выбор интервенций с exploration/exploitation |
| **Kalman Filter Twin** | Нет | Предсказание траектории сна с шумом |
| **Monte Carlo Simulation** | Нет | Симуляция сценариев "что если" |
| **Bifurcation Analysis** | Нет | Детекция точек невозврата |
| **Constitutional AI Safety** | Базовые фильтры | 8-принципная система безопасности |

### 3.2 Архитектурное превосходство

```
┌─────────────────────────────────────────────────────────────────┐
│                    CogniCore Engine                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  State Vector S_t = (emotional, cognitive, narrative,    │  │
│  │                      risk, resources, SLEEP)              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│       ┌──────────────────────┼──────────────────────┐          │
│       ▼                      ▼                      ▼          │
│  ┌─────────┐          ┌─────────────┐        ┌──────────┐     │
│  │ Belief  │          │   Digital   │        │Interven- │     │
│  │ Update  │◄────────►│    Twin     │◄──────►│   tion   │     │
│  │(Bayes)  │          │(Kalman/MC)  │        │Optimizer │     │
│  └─────────┘          └─────────────┘        └──────────┘     │
│       │                      │                      │          │
│       └──────────────────────┼──────────────────────┘          │
│                              ▼                                  │
│                    ┌─────────────────┐                         │
│                    │  Safety Envelope │                         │
│                    │(Constitutional) │                         │
│                    └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
              vs
┌─────────────────────────────────────────────────────────────────┐
│                    Sleepio/Somryst                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            IF ISI > 15 THEN show_module_X()              │  │
│  │            IF week == 3 THEN unlock_module_Y()           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Количественное сравнение

| Метрика | Sleepio | Somryst | SleepCore (CogniCore) |
|---------|---------|---------|----------------------|
| Персонализация | Низкая | Низкая | **Высокая (POMDP)** |
| Предсказание | Нет | Нет | **Digital Twin** |
| Адаптация | Статическая | Статическая | **Real-time (Thompson)** |
| JITAI | Нет | Нет | **Да** |
| Языки | EN | EN | **RU, EN (расширяемо)** |
| Возрастные группы | 18+ | 18+ | **Дети, подростки, взрослые** |
| Кризис-детекция | Базовая | Базовая | **Columbia-SSRS based** |
| Цена | $100-450 | $899 | **TBD (competitive)** |

---

## 4. Стратегия опережающего развития

### 4.1 Технологические приоритеты

#### Уровень 1: MUST HAVE (MVP)

| Компонент | Описание | Научная база |
|-----------|----------|--------------|
| **ISleepState Extension** | Расширение State Vector для сна | POMDP |
| **Sleep Diary Engine** | Структурированный сбор данных | Standard CBT-I |
| **5-Component CBT-I** | Sleep Restriction, Stimulus Control, Cognitive, Hygiene, Relaxation | Espie et al., Burns |
| **Thompson Sampling** | Выбор оптимальной интервенции | Contextual Bandits |
| **Basic Safety** | Детекция comorbid depression | Columbia-SSRS |

#### Уровень 2: COMPETITIVE ADVANTAGE

| Компонент | Описание | Научная база |
|-----------|----------|--------------|
| **JITAI Engine** | Just-in-time адаптивные интервенции | Nahum-Shani 2018 |
| **Sleep Digital Twin** | Предсказание сна на 7 дней | Kalman + Monte Carlo |
| **Circadian Optimizer** | Оптимизация по хронотипу | Light exposure models |
| **Wearable Bridge** | Apple Health, Oura, Fitbit | Real-time data |
| **Micro-Randomized Trials** | Внутреннее A/B тестирование | MRT methodology |

#### Уровень 3: MARKET LEADERSHIP

| Компонент | Описание | Научная база |
|-----------|----------|--------------|
| **Cognitive Digital Twin** | Полная модель когнитивного состояния | Duke/CogniFit 2025 |
| **Explainable AI** | "Почему эта рекомендация" | EU AI Act compliance |
| **Multi-modal Fusion** | EEG headband + wearables | Sleep staging |
| **Shift Worker Support** | Адаптация для сменных графиков | Circadian research |
| **Pediatric Module** | CBT-I для детей 8-17 | Adapted protocols |

### 4.2 Временная шкала достижения лидерства

```
2025 Q1-Q2: MVP (Уровень 1)
    ├── Core CBT-I modules
    ├── Sleep diary
    ├── Thompson Sampling
    └── Russian language support

2025 Q3-Q4: Competitive (Уровень 2)
    ├── JITAI implementation
    ├── Sleep Digital Twin
    ├── Wearable integration
    └── Wellness launch (no FDA)

2026 Q1-Q2: Leadership (Уровень 3)
    ├── Full Cognitive Digital Twin
    ├── FDA 510(k) submission
    ├── Pediatric module
    └── EU MDR certification
```

---

## 5. Уникальное ценностное предложение

### Для пользователей

> **"SleepCore - первая система CBT-I с Digital Twin, которая не просто лечит бессонницу, а предсказывает и предотвращает её"**

| Конкуренты говорят | SleepCore говорит |
|-------------------|-------------------|
| "Следуй 9-недельной программе" | "Твой Digital Twin показывает: через 3 дня будет сложно. Давай подготовимся сегодня" |
| "Вот стандартные советы" | "Твоя уникальная траектория показывает, что тебе лучше всего помогает X" |
| "Заполни дневник сна" | "Я уже знаю из твоих часов, что ты спал 5.2 часа с эффективностью 78%" |

### Для инвесторов

| Метрика | Sleepio | SleepCore Target |
|---------|---------|------------------|
| Dropout Rate | 12-50% | **<10%** (благодаря JITAI + персонализации) |
| Completion Rate | 22-60% | **>70%** (адаптивный контент) |
| Languages | 1 (EN) | **5+** (RU, EN, DE, FR, ES) |
| Age Groups | 1 (18+) | **3** (8-17, 18-64, 65+) |
| Platform Reuse | 0% | **100%** (CogniCore Engine) |

---

## 6. Риски и митигация

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Big Health копирует POMDP | Низкая | Патентование, скорость развития |
| Регуляторные барьеры | Средняя | Старт как Wellness, затем FDA |
| Низкий engagement | Средняя | JITAI + геймификация + wearables |
| Технические сложности Digital Twin | Средняя | Поэтапное внедрение Kalman → MC |
| Конкуренция от Big Tech | Высокая | Фокус на клинической валидации |

---

## 7. Источники

1. [PMC - Digital CBT-I Engagement Review](https://pmc.ncbi.nlm.nih.gov/articles/PMC7999422/)
2. [Blue Matter - Insomnia Market Lessons](https://bluematterconsulting.com/chronic-insomnia-market-digital-therapeutics/)
3. [JMIR - JITAI for Sleep (2024)](https://www.jmir.org/2024/1/e49669)
4. [Nature - Digital Twin for Personalized Medicine](https://www.nature.com/articles/s41746-025-02115-x)
5. [PubMed - RL for JITAI Personalization](https://pubmed.ncbi.nlm.nih.gov/34001322/)
6. [Frontiers - JITAIs in Mental Health (2025)](https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2025.1460167/full)
7. [AASM - Digital CBT-I Platforms](https://aasm.org/digital-cognitive-behavioral-therapy-for-insomnia-platforms-and-characteristics/)
8. [Freedom For All Americans - AI Digital Twins 2025](https://freedomforallamericans.org/ai-digital-twins-mental-health/)

---

*SleepCore | CogniCore Platform | Стратегический анализ | Декабрь 2025*
