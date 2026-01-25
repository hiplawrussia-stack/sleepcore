# SleepCore 2.0: Vision Document

**Версия**: 1.0
**Дата**: Январь 2026
**Статус**: Стратегический документ
**Горизонт планирования**: 2026-2028

---

## Executive Summary

SleepCore — цифровая терапия хронической бессонницы на основе доказательной CBT-I. Текущая версия (1.0) включает 25 команд Telegram-бота, 14 из 15 модулей CogniCore Engine, и проактивный AI с Critical Slowing Down.

**Цель Vision 2.0**: Создать **мировой стандарт** персонализированной цифровой терапии инсомнии, опередив конкурентов на 2-3 года через внедрение прорывных технологий, которые ещё не используются в DTx.

### Ключевые дифференциаторы SleepCore 2.0

| Технология | SleepCore 2.0 | Sleepio | Somryst |
|------------|---------------|---------|---------|
| Critical Slowing Down (EWS) | **Уже есть** | Нет | Нет |
| Thompson Sampling персонализация | **Уже есть** | Нет | Нет |
| Causal Discovery для инсайтов | **Уже есть** | Нет | Нет |
| Digital Twin с PLRNN | **Уже есть** | Нет | Нет |
| Federated Learning | **План 2026** | Нет | Нет |
| Voice Biomarkers | **План 2026** | Нет | Нет |
| N-of-1 Adaptive Trials | **План 2027** | Нет | Нет |
| LLM-терапевт с CBT alignment | **План 2027** | Нет | Нет |

---

## Часть 1: Конкурентный анализ

### 1.1 SleepioRx (Big Health)

**Статус**: FDA cleared (Август 2024)
**Модель**: Подписка, prescription-only
**Цена**: ~$400-900/курс

**Сильные стороны**:
- 26 клинических исследований, 18 RCT
- 76% пациентов достигают здорового сна
- Снижение SOL на 54%, WASO на 62%
- Эффект сохраняется 3 года
- CMS reimbursement с 2025

**Слабые стороны**:
- Статичный контент (видео-уроки)
- Нет предиктивной аналитики
- Нет раннего предупреждения о рецидивах
- Нет персонализации на основе причинно-следственных связей
- Только английский язык (основной рынок)

**Источники**: [Big Health](https://www.bighealth.com/sleepio-rx), [FDA Clearance](https://www.techtarget.com/pharmalifesciences/news/366607848/FDA-clears-SleepioRx-digital-therapeutic-for-insomnia-treatment)

---

### 1.2 Somryst (Nox Health, бывший Pear Therapeutics)

**Статус**: FDA cleared (2020), Class II Medical Device
**Модель**: 9-недельный курс, prescription-only
**Судьба**: Pear Therapeutics обанкротился в 2023, актив куплен Nox Health

**Сильные стороны**:
- Первый FDA-cleared PDT для инсомнии
- Clinician Dashboard для мониторинга
- 40%+ пациентов выходят из критериев инсомнии
- Эффект до 1 года

**Слабые стороны**:
- Фиксированный 9-недельный протокол
- Банкротство оригинальной компании
- Ограниченное развитие после acquisition
- Нет AI/ML компонентов
- Нет proactive interventions

**Источники**: [Somryst](https://www.somryst.com/), [DTA Profile](https://dtxalliance.org/products/somryst/)

---

### 1.3 CBT-I Coach (VA/DoD)

**Статус**: Бесплатное приложение
**Модель**: Self-help, companion to therapy

**Сильные стороны**:
- Бесплатно
- Разработано VA и Stanford
- Широко используется

**Слабые стороны**:
- Не является standalone therapy
- Нет персонализации
- Нет AI компонентов
- Устаревший UI/UX

---

### 1.4 Конкурентная матрица

| Функция | SleepCore 1.0 | SleepioRx | Somryst | CBT-I Coach |
|---------|---------------|-----------|---------|-------------|
| CBT-I 5 компонентов | ✅ | ✅ | ✅ | Частично |
| AI-предикция | ✅ PLRNN | ❌ | ❌ | ❌ |
| Digital Twin | ✅ | ❌ | ❌ | ❌ |
| Early Warning (CSD) | ✅ | ❌ | ❌ | ❌ |
| Causal Insights | ✅ | ❌ | ❌ | ❌ |
| Proactive Notifications | ✅ | ❌ | ❌ | ❌ |
| Thompson Sampling | ✅ | ❌ | ❌ | ❌ |
| Clinician Dashboard | ⏳ | ✅ | ✅ | ❌ |
| FDA Clearance | ⏳ | ✅ | ✅ | N/A |
| Русский язык | ✅ | ❌ | ❌ | ❌ |
| Voice Input | ✅ Whisper | ❌ | ❌ | ❌ |
| Gamification | ✅ Quests | Limited | ❌ | ❌ |

**Вывод**: SleepCore уже превосходит конкурентов по AI-функциональности. Отставание только в regulatory clearance и enterprise features.

---

## Часть 2: Прорывные исследования (не внедрены в DTx)

### 2.1 SleepFM — Foundation Model для сна (Stanford, 2025)

**Что это**: Мультимодальная модель, обученная на 585,000+ часов PSG-записей от ~65,000 участников.

**Результаты**:
- Предсказывает 130 заболеваний с C-Index ≥0.75
- Особенно сильна для рака, осложнений беременности, ментальных расстройств (C-Index >0.8)
- Одна ночь сна → прогноз здоровья

**Применение для SleepCore**:
```typescript
interface ISleepFoundationModel {
  // Интеграция с wearables для получения sleep stages
  processNightData(sleepStages: ISleepStage[]): IHealthRiskProfile;

  // Comorbidity prediction
  predictComorbidities(userId: string): IComorbidityRisk[];

  // Personalized treatment adjustment
  adjustProtocol(riskProfile: IHealthRiskProfile): ICBTIModification;
}
```

**Конкурентное преимущество**: Никто из DTx-конкурентов не использует foundation models.

**Источник**: [Nature Medicine 2025](https://www.nature.com/articles/s41591-025-04133-4)

---

### 2.2 Voice Biomarkers для ментального здоровья

**Состояние исследований (2024-2025)**:
- 70-83% точность детекции депрессии + тревоги
- 25 секунд речи достаточно для скрининга
- AUC 0.71-0.93 для различения депрессии vs. контроль
- Ключевые маркеры: jitter, shimmer, speech rate, pause duration

**Kintsugi Voice Study (Jan 2025)**:
- 14,898 участников
- Валидация против PHQ-9
- Машинное обучение на свободной речи

**Применение для SleepCore**:
```typescript
interface IVoiceBiomarkerService {
  // Анализ голосового сообщения после транскрипции
  analyzeVoice(audioBuffer: Buffer): IVoiceBiomarkers;

  // Детекция депрессии/тревоги
  detectMentalHealthRisk(biomarkers: IVoiceBiomarkers): IMentalHealthRisk;

  // Мониторинг динамики
  trackMoodOverTime(userId: string): IMoodTrajectory;
}

interface IVoiceBiomarkers {
  jitter: number;           // Вариабельность частоты
  shimmer: number;          // Вариабельность амплитуды
  speechRate: number;       // Слов в минуту
  pauseDuration: number;    // Средняя длина пауз
  f0Mean: number;           // Средняя частота основного тона
  f0Variance: number;       // Вариабельность тона
  hnr: number;              // Harmonic-to-noise ratio
}
```

**Конкурентное преимущество**: У нас уже есть WhisperService. Добавить voice biomarkers = минимальные усилия, максимальный эффект.

**Источники**: [JMIR 2024](https://www.jmir.org/2024/1/e58572), [Kintsugi Study](https://pubmed.ncbi.nlm.nih.gov/39805690/)

---

### 2.3 JITAI Meta-Analysis (2025)

**Ключевые findings**:
- 23 исследования, 2,563 участника
- Between-group effect: g=0.15 (small but significant)
- **1-месячный follow-up: g=0.92 (large effect!)**
- **3-6 месяцев: g=0.45 (moderate)**
- Интервенции <6 недель дают более долгосрочный эффект (g=0.71)

**Микрорандомизированные испытания для сна (JMIR 2024)**:
- JITAI с push-уведомлениями стабилизирует сон японских работников
- Ежедневная обратная связь улучшает физические симптомы при пробуждении

**Что это значит для SleepCore**:
1. Наш proactive intelligence — правильный подход
2. Короткие интенсивные интервенции > длинные пассивные
3. Thompson Sampling для оптимального timing уже внедрён

**Источники**: [PMC Meta-Analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC12481328/), [JMIR Sleep JITAI](https://www.jmir.org/2024/1/e49669)

---

### 2.4 Federated Learning в здравоохранении

**Состояние (2024)**:
- Только 5.2% исследований — реальные внедрения (proof-of-concept доминирует)
- Радиология и внутренняя медицина — лидеры
- Differential Privacy + Homomorphic Encryption решают проблему утечек

**Применение для SleepCore**:
```typescript
interface IFederatedSleepLearning {
  // Локальное обучение на устройстве пользователя
  trainLocal(
    localData: ISleepDiary[],
    globalModel: IModelWeights
  ): IModelGradients;

  // Агрегация градиентов с differential privacy
  aggregateGradients(
    gradients: IModelGradients[],
    epsilon: number  // Privacy budget
  ): IModelWeights;

  // Персонализированная модель для каждого пользователя
  personalizeModel(
    globalModel: IModelWeights,
    userHistory: ISleepDiary[]
  ): IPersonalizedModel;
}
```

**Конкурентное преимущество**:
- Глобальная модель на миллионах пользователей БЕЗ передачи данных
- GDPR/HIPAA compliance by design
- Масштабирование на развивающиеся рынки (Индия, Китай, LatAm)

**Источники**: [PMC Review](https://pmc.ncbi.nlm.nih.gov/articles/PMC10897620/), [Nature Scientific Reports](https://www.nature.com/articles/s41598-025-97565-4)

---

### 2.5 N-of-1 Adaptive Trials с Bayesian Design

**Концепция**: Каждый пользователь = отдельное клиническое исследование с адаптивным дизайном.

**Bayesian Adaptive N-of-1 (Wiley, 2020)**:
- Thompson Sampling для allocation → **уже внедрён в SleepCore**
- Hierarchical model для population + individual effects
- Efficient Markov chain Monte Carlo estimation

**Melatonin N-of-1 Trial (PubMed, 2025)**:
- 12-недельный протокол с Fitbit-мониторингом
- System Usability Scale для оценки
- Результат: feasible и acceptable для пациентов

**Применение для SleepCore**:
```typescript
interface INof1TrialService {
  // Инициализация персонального trial
  initializeTrial(userId: string, interventions: string[]): ITrial;

  // Bayesian update после каждого наблюдения
  updatePosterior(
    trial: ITrial,
    observation: ISleepMetrics
  ): IPosteriorDistribution;

  // Adaptive allocation на основе Thompson Sampling
  selectNextIntervention(posterior: IPosteriorDistribution): string;

  // Персональный treatment effect
  estimateIndividualEffect(trial: ITrial): ITreatmentEffect;
}
```

**Конкурентное преимущество**: Научно обоснованная персонализация вместо "one-size-fits-all".

**Источники**: [Wiley Statistics in Medicine](https://onlinelibrary.wiley.com/doi/abs/10.1002/sim.8737), [Harvard Data Science Review](https://hdsr.mitpress.mit.edu/pub/b6efwlql/release/1)

---

### 2.6 LLM для CBT-терапии

**Состояние (2024-2025)**:
- 45% новых исследований в 2024 — LLM-based chatbots
- Только 16% прошли клинические испытания
- ChatGLM-LoRA: 50%+ пользователей улучшили сон
- LLMs лучше следуют CBT-структуре, чем peer counselors

**Проблемы**:
- "Artificial empathy" — поверхностные ответы
- Inconsistency в терапевтической роли
- Юридические риски (Section 230 не защищает)

**Применение для SleepCore (осторожный подход)**:
```typescript
interface ICBTAlignedLLM {
  // Структурированный CBT-диалог, НЕ open-ended therapy
  generateCBTResponse(
    context: ITherapyContext,
    userMessage: string,
    constraints: ICBTConstraints
  ): ICBTResponse;

  // Constitutional AI фильтрация
  filterResponse(
    response: ICBTResponse,
    safetyRules: ISafetyRule[]
  ): ISafeResponse;

  // Escalation к человеку
  shouldEscalate(context: ITherapyContext): boolean;
}

interface ICBTConstraints {
  allowedTechniques: ('cognitive_restructuring' | 'behavioral_activation' | 'sleep_hygiene')[];
  maxResponseLength: number;
  requireEvidence: boolean;
  prohibitDiagnosis: boolean;
}
```

**Конкурентное преимущество**: CBT-aligned LLM с Constitutional AI = безопасный + эффективный.

**Источники**: [PMC Systematic Review](https://pmc.ncbi.nlm.nih.gov/articles/PMC12434366/), [Frontiers CBT-LLM](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1583739/full)

---

## Часть 3: Архитектура SleepCore 2.0

### 3.1 Высокоуровневая архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                      SleepCore 2.0 Platform                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐│
│  │  Telegram   │ │  Mini App   │ │  Clinical   │ │   Voice    ││
│  │    Bot      │ │   (React)   │ │  Dashboard  │ │  Interface ││
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └─────┬──────┘│
│         │               │               │              │        │
│  ┌──────┴───────────────┴───────────────┴──────────────┴──────┐│
│  │                    API Gateway (Hono/Fastify)              ││
│  └──────────────────────────┬─────────────────────────────────┘│
│                             │                                   │
│  ┌──────────────────────────┴─────────────────────────────────┐│
│  │                   Core Services Layer                       ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   ││
│  │  │   CBT-I     │ │  Proactive  │ │    N-of-1 Trial     │   ││
│  │  │  Engines    │ │Intelligence │ │      Service        │   ││
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘   ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   ││
│  │  │   Digital   │ │   Causal    │ │   Voice Biomarker   │   ││
│  │  │    Twin     │ │  Discovery  │ │      Service        │   ││
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘   ││
│  └────────────────────────────────────────────────────────────┘│
│                             │                                   │
│  ┌──────────────────────────┴─────────────────────────────────┐│
│  │                   AI/ML Layer (CogniCore)                   ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   ││
│  │  │   PLRNN     │ │   Causal    │ │    Constitutional   │   ││
│  │  │  Predictor  │ │   Engine    │ │         AI          │   ││
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘   ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   ││
│  │  │  Federated  │ │   Sleep     │ │    CBT-Aligned      │   ││
│  │  │  Learning   │ │ Foundation  │ │        LLM          │   ││
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘   ││
│  └────────────────────────────────────────────────────────────┘│
│                             │                                   │
│  ┌──────────────────────────┴─────────────────────────────────┐│
│  │                   Data Layer                                ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   ││
│  │  │  PostgreSQL │ │   Redis     │ │   Vector Store      │   ││
│  │  │  (Primary)  │ │  (Cache)    │ │   (Embeddings)      │   ││
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘   ││
│  └────────────────────────────────────────────────────────────┘│
│                             │                                   │
│  ┌──────────────────────────┴─────────────────────────────────┐│
│  │              External Integrations                          ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   ││
│  │  │Apple Health │ │ Google Fit  │ │      Fitbit         │   ││
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘   ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   ││
│  │  │   Whisper   │ │   OpenAI    │ │    Anthropic        │   ││
│  │  │    API      │ │    API      │ │       API           │   ││
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘   ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

### 3.2 Новые модули 2.0

#### 3.2.1 VoiceBiomarkerService

```typescript
// src/bot/services/VoiceBiomarkerService.ts

export interface IVoiceBiomarkers {
  // Акустические параметры
  jitter: number;              // 0-1, норма <0.01
  shimmer: number;             // 0-1, норма <0.03
  hnr: number;                 // Harmonic-to-noise ratio, дБ

  // Просодика
  f0Mean: number;              // Средняя частота, Гц
  f0Std: number;               // Стандартное отклонение
  speechRate: number;          // Слогов/секунда
  articulationRate: number;    // Исключая паузы

  // Паузы
  pauseCount: number;
  pauseMeanDuration: number;   // мс
  pauseTotalDuration: number;  // мс

  // Производные метрики
  depressionRisk: number;      // 0-1
  anxietyRisk: number;         // 0-1
  fatigueLevel: number;        // 0-1
}

export interface IVoiceBiomarkerService {
  // Извлечение biomarkers из аудио
  extractBiomarkers(audioBuffer: Buffer, format: 'ogg' | 'wav' | 'mp3'): Promise<IVoiceBiomarkers>;

  // Сравнение с baseline пользователя
  compareToBaseline(userId: string, current: IVoiceBiomarkers): IVoiceDeviation;

  // Детекция изменений состояния
  detectMoodShift(userId: string, history: IVoiceBiomarkers[]): IMoodShift | null;

  // Интеграция с CSD
  integrateWithCSD(voiceData: IVoiceBiomarkers, sleepData: ICriticalSlowingDown): ICombinedRisk;
}
```

#### 3.2.2 FederatedLearningService

```typescript
// src/platform/federated/FederatedLearningService.ts

export interface IFederatedConfig {
  privacyBudget: number;       // Epsilon для differential privacy
  noiseMultiplier: number;     // Sigma для Gaussian noise
  clippingNorm: number;        // L2 norm bound
  minClientsPerRound: number;  // Минимум участников для агрегации
  localEpochs: number;         // Эпохи локального обучения
}

export interface IFederatedLearningService {
  // Инициализация глобальной модели
  initializeGlobalModel(architecture: IModelArchitecture): IGlobalModel;

  // Локальное обучение (выполняется на клиенте)
  trainLocal(
    globalWeights: IModelWeights,
    localData: ISleepDiary[],
    config: IFederatedConfig
  ): IEncryptedGradients;

  // Безопасная агрегация на сервере
  secureAggregate(
    gradients: IEncryptedGradients[],
    config: IFederatedConfig
  ): IModelWeights;

  // Персонализация для конкретного пользователя
  personalizeModel(
    globalModel: IGlobalModel,
    userEmbedding: IUserEmbedding
  ): IPersonalizedModel;
}
```

#### 3.2.3 Nof1TrialService

```typescript
// src/bot/services/Nof1TrialService.ts

export interface INof1Trial {
  userId: string;
  startDate: Date;
  interventions: IIntervention[];
  phases: ITrialPhase[];
  posteriors: Map<string, IBetaDistribution>;
  currentPhase: number;
}

export interface IIntervention {
  id: string;
  name: string;
  description: string;
  category: 'srt' | 'sct' | 'cognitive' | 'hygiene' | 'relaxation';
}

export interface IBetaDistribution {
  alpha: number;  // Successes + 1
  beta: number;   // Failures + 1
}

export interface INof1TrialService {
  // Создание персонального trial
  createTrial(
    userId: string,
    candidateInterventions: IIntervention[],
    config: INof1Config
  ): Promise<INof1Trial>;

  // Thompson Sampling для следующей интервенции
  selectNextIntervention(trial: INof1Trial): IIntervention;

  // Bayesian update после наблюдения
  updatePosterior(
    trial: INof1Trial,
    intervention: IIntervention,
    outcome: ISleepOutcome
  ): INof1Trial;

  // Оценка индивидуального эффекта
  estimateIndividualEffect(trial: INof1Trial): IPersonalizedEffects;

  // Рекомендация оптимального лечения
  recommendOptimalTreatment(trial: INof1Trial): IOptimalTreatment;
}
```

#### 3.2.4 CBTAlignedLLMService

```typescript
// src/bot/services/CBTAlignedLLMService.ts

export interface ICBTContext {
  userId: string;
  sessionNumber: number;
  currentTechnique: CBTTechnique;
  previousExchanges: IExchange[];
  sleepDiary: ISleepDiary[];
  isiScore: number;
  riskLevel: RiskLevel;
}

export type CBTTechnique =
  | 'psychoeducation'
  | 'sleep_restriction'
  | 'stimulus_control'
  | 'cognitive_restructuring'
  | 'relaxation'
  | 'sleep_hygiene';

export interface ICBTConstraints {
  allowedTechniques: CBTTechnique[];
  maxResponseLength: number;
  mustIncludePsychoeducation: boolean;
  prohibitDiagnosis: boolean;
  prohibitMedicalAdvice: boolean;
  requireEvidenceCitation: boolean;
}

export interface ICBTAlignedLLMService {
  // Генерация CBT-aligned ответа
  generateResponse(
    context: ICBTContext,
    userMessage: string,
    constraints: ICBTConstraints
  ): Promise<ICBTResponse>;

  // Constitutional AI проверка
  validateResponse(
    response: string,
    constitutionalRules: IConstitutionalRule[]
  ): IValidationResult;

  // Детекция необходимости эскалации
  checkEscalationNeeded(
    context: ICBTContext,
    userMessage: string
  ): IEscalationDecision;

  // Генерация Socratic вопросов
  generateSocraticQuestion(
    context: ICBTContext,
    targetCognition: string
  ): string;
}
```

---

## Часть 4: Научная дорожная карта 2026-2028

### 4.1 Timeline

```
2026 Q1-Q2: Foundation (Фундамент)
├── Voice Biomarkers Integration
├── Wearables API (Apple Health, Google Fit)
├── Clinical Dashboard MVP
└── CE Mark preparation

2026 Q3-Q4: Intelligence (Интеллект)
├── Federated Learning v1
├── N-of-1 Trial Engine
├── LLM Integration (Claude API)
└── FDA Pre-submission

2027 Q1-Q2: Scale (Масштаб)
├── Foundation Model integration
├── Multi-language expansion (EN, ES, DE)
├── B2B enterprise platform
└── FDA 510(k) submission

2027 Q3-Q4: Leadership (Лидерство)
├── Federated Learning v2 (cross-institution)
├── RWE platform launch
├── Pharma partnerships
└── FDA clearance (target)

2028: Global Expansion
├── Asia-Pacific launch
├── LatAm expansion
├── WHO Digital Health certification
└── 1M+ users milestone
```

---

### 4.2 Детализация по спринтам

#### Sprint 6: Voice Biomarkers (Q1 2026)
**Цель**: Добавить объективные биомаркеры ментального здоровья

| Задача | Приоритет | Сложность |
|--------|-----------|-----------|
| Интеграция Praat/OpenSMILE для feature extraction | P0 | Высокая |
| Baseline calibration при onboarding | P0 | Средняя |
| Depression/anxiety risk scoring | P1 | Средняя |
| CSD интеграция с voice data | P1 | Средняя |
| A/B тест: voice-enhanced predictions | P2 | Высокая |

**Метрики успеха**:
- AUC ≥0.75 для детекции депрессии
- Улучшение CSD sensitivity на 15%+
- >60% пользователей записывают голосовые сообщения

---

#### Sprint 7: Wearables Integration (Q1-Q2 2026)
**Цель**: Объективные данные сна без PSG

| Задача | Приоритет | Сложность |
|--------|-----------|-----------|
| Apple HealthKit integration | P0 | Средняя |
| Google Fit API integration | P0 | Средняя |
| Fitbit Web API integration | P1 | Средняя |
| Sleep stage mapping (light/deep/REM) | P0 | Высокая |
| Objective SE calculation | P0 | Низкая |
| HRV-based stress detection | P2 | Высокая |

**Метрики успеха**:
- >40% пользователей подключают wearables
- Корреляция r≥0.7 между субъективными и объективными метриками
- Улучшение предикции PLRNN на 20%+

---

#### Sprint 8: Clinical Dashboard (Q2 2026)
**Цель**: B2B продукт для клиницистов

| Задача | Приоритет | Сложность |
|--------|-----------|-----------|
| React admin panel | P0 | Высокая |
| Patient list with risk scores | P0 | Средняя |
| Treatment progress visualization | P0 | Средняя |
| Alert system for high-risk patients | P0 | Средняя |
| Exportable reports (PDF) | P1 | Средняя |
| HIPAA-compliant architecture | P0 | Высокая |

**Метрики успеха**:
- 10+ пилотных клиник
- <2 мин для review одного пациента
- NPS >50 от клиницистов

---

#### Sprint 9: MCT Engine (Q2 2026)
**Цель**: Metacognitive Therapy протоколы

| Задача | Приоритет | Сложность |
|--------|-----------|-----------|
| Worry postponement module | P0 | Средняя |
| Attention Training Technique (ATT) | P1 | Средняя |
| Detached mindfulness exercises | P1 | Средняя |
| Metacognitive beliefs assessment | P0 | Низкая |
| Integration with ThirdWaveCoordinator | P0 | Низкая |

**Метрики успеха**:
- >70% completion rate для MCT modules
- Снижение rumination на 25%+ (self-report)
- ISI improvement +3 points vs. базовый CBT-I

---

#### Sprint 10: N-of-1 Trial Engine (Q3 2026)
**Цель**: Personalized medicine через адаптивные trials

| Задача | Приоритет | Сложность |
|--------|-----------|-----------|
| Bayesian N-of-1 framework | P0 | Высокая |
| Thompson Sampling allocation | P0 | Средняя (уже есть база) |
| Individual treatment effect estimation | P0 | Высокая |
| Personalized protocol generation | P1 | Высокая |
| Patient-facing trial explanation | P1 | Средняя |

**Метрики успеха**:
- Personalized protocols улучшают ISI на 2+ points vs. стандартный
- >80% пациентов завершают N-of-1 trial
- Time-to-remission сокращается на 20%

---

#### Sprint 11: Federated Learning v1 (Q3-Q4 2026)
**Цель**: Privacy-preserving глобальное обучение

| Задача | Приоритет | Сложность |
|--------|-----------|-----------|
| Local training on device | P0 | Очень высокая |
| Differential privacy implementation | P0 | Очень высокая |
| Secure aggregation server | P0 | Высокая |
| Model personalization layer | P1 | Высокая |
| Privacy audit и certification | P0 | Средняя |

**Метрики успеха**:
- ε ≤ 1.0 (strong privacy guarantee)
- Model accuracy within 5% of centralized training
- Zero data breaches

---

#### Sprint 12: LLM Therapy Assistant (Q4 2026)
**Цель**: CBT-aligned conversational AI

| Задача | Приоритет | Сложность |
|--------|-----------|-----------|
| Claude API integration | P0 | Средняя |
| CBT prompt engineering | P0 | Высокая |
| Constitutional AI constraints | P0 | Средняя (уже есть база) |
| Socratic questioning module | P1 | Средняя |
| Escalation detection | P0 | Высокая |
| Human-in-the-loop review | P0 | Средняя |

**Метрики успеха**:
- >90% responses pass Constitutional AI check
- User satisfaction ≥4.2/5
- Zero safety incidents
- 30% reduction in therapist workload (B2B)

---

## Часть 5: Регуляторная стратегия

### 5.1 FDA 510(k) Pathway

**Predicate devices**:
1. Somryst (K191716) — Primary predicate
2. SleepioRx (2024) — Secondary predicate
3. Freespira (K143619) — For anxiety component

**Classification**: Class II Medical Device, 21 CFR 882.5801

**Timeline**:
```
Q2 2026: Pre-submission meeting request
Q3 2026: Pre-submission meeting
Q4 2026: Clinical evidence compilation
Q1 2027: 510(k) submission
Q3 2027: FDA review (90-day target)
Q4 2027: Clearance (target)
```

**Required evidence**:
- [ ] Bench testing (software verification)
- [ ] Clinical validation study (n≥100)
- [ ] Usability study
- [ ] Cybersecurity documentation
- [ ] Risk analysis (ISO 14971)

---

### 5.2 CE Mark (EU MDR)

**Classification**: Class IIa medical device

**Timeline**:
```
Q1 2026: Notified Body selection
Q2 2026: Technical file preparation
Q3 2026: Clinical evaluation report
Q4 2026: Notified Body audit
Q1 2027: CE Mark (target)
```

**Requirements**:
- [ ] Quality Management System (ISO 13485)
- [ ] Clinical evaluation (MEDDEV 2.7/1)
- [ ] Post-market surveillance plan
- [ ] GDPR compliance
- [ ] Cybersecurity (MDCG 2019-16)

---

### 5.3 Germany DiGA

**Преимущество**: Fast-track к reimbursement в Германии (€263M market)

**Timeline**:
```
Q1 2027: DiGA application (after CE Mark)
Q2 2027: BfArM review
Q3 2027: Provisional listing
Q4 2027-2028: 12-month evaluation period
2028: Permanent listing (target)
```

---

## Часть 6: Научное партнёрство

### 6.1 Рекомендуемый Scientific Advisory Board

| Роль | Профиль | Институция (примеры) |
|------|---------|----------------------|
| Chair | Sleep medicine + digital health | Stanford Sleep Medicine |
| CBT-I Expert | Автор CBT-I протоколов | U of Pennsylvania |
| AI/ML Lead | Federated learning / LLMs | DeepMind, Google Health |
| Psychiatry | Depression, comorbidity | Harvard/MGH |
| Regulatory | FDA/CE experience | Former FDA reviewer |
| HCI/UX | Digital therapeutics design | Carnegie Mellon |
| Health Economics | HEOR, RWE | York, UK |

### 6.2 Академические партнёрства

**Для клинических испытаний**:
- Sleep centers with PSG capabilities
- Primary care networks
- Military/VA (большие когорты)

**Для R&D**:
- Stanford SleepFM collaboration
- MIT Media Lab (voice biomarkers)
- Oxford (N-of-1 trials expertise)

---

## Часть 7: Финансовые проекции

### 7.1 Рыночный потенциал

| Рынок | Размер 2024 | Рост | SleepCore TAM 2028 |
|-------|-------------|------|---------------------|
| Global DTx | $7.7B | 25.7% CAGR | - |
| Digital Insomnia | $3.5B | 6.3% CAGR | $500M |
| Russia/CIS | ~$50M | 15% CAGR | $15M |
| Europe (DiGA) | €263M | 20% CAGR | €50M |

### 7.2 Бизнес-модель 2.0

| Канал | Модель | Цена | Target 2028 |
|-------|--------|------|-------------|
| B2C Freemium | Free + Premium | $0 / $9.99/mo | 500K users |
| B2C Prescription | Per-treatment | $300-500 | 50K users |
| B2B Clinics | SaaS | $99-499/mo | 500 clinics |
| B2B Enterprise | License | $50K-500K/yr | 20 enterprises |
| Pharma | Data/RWE | Custom | 5 deals |

**Projected ARR 2028**: $15-25M

---

## Часть 8: Риски и митигация

| Риск | Вероятность | Импакт | Митигация |
|------|-------------|--------|-----------|
| FDA rejection | Средняя | Критический | Strong predicate strategy, pre-sub |
| LLM safety incident | Низкая | Критический | Constitutional AI, human review |
| Data breach | Низкая | Критический | Federated learning, encryption |
| Competitor acquisition | Средняя | Высокий | First-mover advantage, IP |
| Reimbursement failure | Средняя | Высокий | Multi-payer strategy, RWE |
| Technical debt | Высокая | Средний | Continuous refactoring |

---

## Заключение

SleepCore 2.0 имеет уникальную возможность стать мировым лидером в цифровой терапии инсомнии благодаря:

1. **Технологическому превосходству**: CSD, Thompson Sampling, Causal Discovery — уже внедрены, конкуренты не имеют
2. **Научной основе**: Каждая функция 2.0 базируется на peer-reviewed исследованиях
3. **Персонализации**: N-of-1 trials + federated learning = true precision medicine
4. **Безопасности**: Constitutional AI + human-in-the-loop
5. **Масштабируемости**: Federated learning позволяет глобальную экспансию без data sharing

**Следующий шаг**: Выбрать Sprint 6 (Voice Biomarkers) или Sprint 7 (Wearables) для начала реализации Vision 2.0.

---

## Источники

### Конкуренты
- [SleepioRx - Big Health](https://www.bighealth.com/sleepio-rx)
- [FDA Clears SleepioRx](https://www.techtarget.com/pharmalifesciences/news/366607848/FDA-clears-SleepioRx-digital-therapeutic-for-insomnia-treatment)
- [Somryst Official](https://www.somryst.com/)
- [Somryst DTA Profile](https://dtxalliance.org/products/somryst/)

### Научные исследования
- [SleepFM Foundation Model - Nature Medicine 2025](https://www.nature.com/articles/s41591-025-04133-4)
- [Voice Biomarkers - JMIR 2024](https://www.jmir.org/2024/1/e58572)
- [Kintsugi Voice Study 2025](https://pubmed.ncbi.nlm.nih.gov/39805690/)
- [Critical Slowing Down - SAGE 2025](https://journals.sagepub.com/doi/10.1177/21677026241305136)
- [JITAI Meta-Analysis 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12481328/)
- [Federated Learning in Healthcare](https://pmc.ncbi.nlm.nih.gov/articles/PMC10897620/)
- [Bayesian N-of-1 Trials](https://onlinelibrary.wiley.com/doi/abs/10.1002/sim.8737)
- [LLM Mental Health Review](https://pmc.ncbi.nlm.nih.gov/articles/PMC12434366/)

### Рынок
- [Digital Therapeutics Market - Grand View Research](https://www.grandviewresearch.com/industry-analysis/digital-therapeutics-market)
- [Digital Insomnia Market - InsightAce](https://www.insightaceanalytic.com/report/digital-insomnia-therapeutics-market-size-share--trends-analysis-report-bytype-sleep-tracking-apps-relaxation-and-meditation-apps-cbt-i-wearable-devices-distribution-channel-mobile-app-stores-healthcare-providers-and-clinics-and-other-distribution-channels-region-and-segment-forecasts-2024-2031/1873)

---

*Документ подготовлен: Январь 2026*
*Версия: 1.0*
*Автор: Claude Opus 4.5 + SleepCore Team*
