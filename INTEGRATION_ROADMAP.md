# SleepCore: План полной интеграции CogniCore Engine

## Статус на момент аудита (Январь 2026)

| Метрика | Значение |
|---------|----------|
| Архитектура CogniCore | 100% реализована |
| Интеграция в Telegram бот | ~30% |
| Активные компоненты | 3 из 15 |
| Deprecated код в runtime | SleepCorePOMDP |

**Цель**: Довести интеграцию до 200%+ (полное использование + расширение)

---

## Фаза 0: Критические исправления (Неделя 1)

### 0.1 Миграция с SleepCorePOMDP на SleepCoreAdapter

**Проблема**: SleepCoreAPI использует deprecated SleepCorePOMDP вместо готового SleepCoreAdapter.

**Файлы для изменения**:
```
src/SleepCoreAPI.ts
src/main.ts
```

**Задачи**:
- [ ] Заменить `new SleepCorePOMDP()` на `createSleepCoreAdapter()`
- [ ] Обновить `getNextIntervention()` для использования Thompson Sampling
- [ ] Добавить `recordOutcome()` для обучения на результатах
- [ ] Мигрировать все вызовы `pomdp.updateBelief()` на `adapter.updateBelief()`

**Результат**: Активация Thompson Sampling, MotivationalEngine, ExplainabilityService

### 0.2 Подключение SleepPredictionService

**Проблема**: Сервис PLRNN-предикций написан, но не импортируется в runtime.

**Файлы для изменения**:
```
src/main.ts
src/bot/commands/ProgressCommand.ts
src/bot/commands/TodayCommand.ts
```

**Задачи**:
- [ ] Импортировать `createSleepPredictionService` в main.ts
- [ ] Инициализировать сервис при старте бота
- [ ] Интегрировать предикции в `/progress` команду
- [ ] Добавить Early Warning Signals в `/today`

**Результат**: Активация PLRNNEngine, KalmanFormer, 7-дневный прогноз SE

---

## Фаза 1: Полная интеграция (Недели 2-3)

### 1.1 Digital Twin Integration

**Компоненты CogniCore**:
- `BifurcationEngine` - детекция типпинг-поинтов
- `MonteCarloEngine` - симуляция сценариев
- `KalmanFilterEngine` - фильтрация состояния

**Новый сервис**: `src/bot/services/DigitalTwinService.ts`

```typescript
interface IDigitalTwinService {
  // Создание и обновление цифрового двойника
  createTwin(userId: string): Promise<IDigitalTwin>;
  updateTwin(userId: string, observation: ISleepObservation): Promise<void>;

  // Предикция и Early Warning
  predictTrajectory(userId: string, days: number): Promise<ITrajectory>;
  detectTippingPoints(userId: string): Promise<ITippingPoint[]>;

  // Симуляция "что если"
  simulateIntervention(userId: string, intervention: SleepAction): Promise<ISimulationResult>;
  compareScenarios(userId: string, scenarios: IScenario[]): Promise<IComparisonResult>;
}
```

**Новая команда**: `/twin` или `/predict`

**Задачи**:
- [ ] Создать `DigitalTwinService` как обёртку над CogniCore компонентами
- [ ] Добавить автоматическое обновление twin при каждом diary entry
- [ ] Создать команду `/predict` для показа траектории
- [ ] Интегрировать tipping point alerts в crisis detection

### 1.2 Causal Discovery Integration

**Компоненты CogniCore**:
- `CausalDiscoveryEngine` - PC/GES алгоритмы
- `InterventionTargetingService` - выбор точки воздействия

**Новый сервис**: `src/bot/services/CausalInsightsService.ts`

```typescript
interface ICausalInsightsService {
  // Анализ причинно-следственных связей
  discoverCausalGraph(userId: string): Promise<ICausalGraph>;
  getTopCauses(userId: string, outcome: 'insomnia' | 'fatigue'): Promise<ICause[]>;

  // Персонализированные insights
  generateInsights(userId: string): Promise<IPersonalizedInsight[]>;

  // Рекомендации на основе causal analysis
  suggestInterventionTarget(userId: string): Promise<IInterventionTarget>;
}
```

**Новая команда**: `/insights` или `/why`

**Задачи**:
- [ ] Создать `CausalInsightsService`
- [ ] Накапливать данные для causal discovery (минимум 14 дней)
- [ ] Создать визуализацию причинного графа (ASCII или emoji)
- [ ] Интегрировать insights в `/progress`

### 1.3 Explainability Integration

**Компоненты CogniCore**:
- `ExplainabilityService` - объяснения решений
- `CounterfactualExplainer` - "что если" сценарии
- `FeatureAttributionEngine` - атрибуция факторов
- `NarrativeGenerator` - человекочитаемые объяснения

**Расширение**: Добавить объяснения ко всем рекомендациям

**Задачи**:
- [ ] Интегрировать `ExplainabilityService` в SleepCoreAdapter
- [ ] Добавить кнопку "Почему?" к каждой рекомендации в `/today`
- [ ] Создать команду `/whatif` для counterfactual scenarios
- [ ] Генерировать weekly narrative summaries

**Пример UX**:
```
📊 Рекомендация: Сократить время в кровати до 6.5 часов

[Почему?]

→ Твоя эффективность сна 72% говорит о том, что ты
  проводишь слишком много времени в кровати без сна.

  Главные факторы:
  • Позднее засыпание (+45 мин vs норма) — 35%
  • Частые пробуждения (3 за ночь) — 28%
  • Ранний подъём в кровати — 22%

  Что если сократить TIB?
  → Прогноз: SE вырастет до 85% за 2 недели
```

### 1.4 Constitutional AI Integration

**Компоненты CogniCore**:
- `ConstitutionalClassifierEngine` - этический классификатор
- `SafetyMonitorService` - мониторинг безопасности
- `HumanEscalationService` - эскалация к человеку

**Интеграция**: Фильтр всех исходящих сообщений бота

**Задачи**:
- [ ] Создать middleware для Grammy, проверяющий все ответы
- [ ] Интегрировать Constitutional principles в Sonya persona
- [ ] Добавить logging нарушений принципов
- [ ] Реализовать graceful degradation при нарушениях

### 1.5 Metacognitive Engine Integration

**Компоненты CogniCore**:
- `MetacognitiveEngine` - MCT протоколы
- Worry postponement
- Attention training
- Detached mindfulness

**Новая команда**: `/metacognition` или расширение `/mindful`

**Задачи**:
- [ ] Интегрировать MCT в ThirdWaveCoordinator
- [ ] Добавить worry postponement в вечерние практики
- [ ] Создать attention training exercises
- [ ] Связать с ACT-I defusion techniques

---

## Фаза 2: Расширение до 200% (Недели 4-6)

### 2.1 Новые команды на базе CogniCore

| Команда | Компонент CogniCore | Функционал |
|---------|---------------------|------------|
| `/predict` | PLRNNEngine + BifurcationEngine | 7-дневный прогноз с early warnings |
| `/insights` | CausalDiscoveryEngine | "Почему я плохо сплю?" с графом причин |
| `/whatif` | CounterfactualExplainer | Симуляция сценариев |
| `/twin` | DigitalTwinService | Интерактивная модель пациента |
| `/explain` | ExplainabilityService | Объяснение любой рекомендации |
| `/safety` | SafetyMonitorService | Статус безопасности и история |

### 2.2 Proactive Intelligence Layer

**Концепция**: Бот не ждёт команд, а проактивно предлагает insights.

**Компоненты**:
```typescript
interface IProactiveIntelligenceService {
  // Ежедневный анализ
  runDailyAnalysis(userId: string): Promise<IProactiveInsight[]>;

  // Триггеры на основе данных
  detectPatternChange(userId: string): Promise<IPatternAlert | null>;
  detectRiskEscalation(userId: string): Promise<IRiskAlert | null>;

  // Оптимальный момент для вмешательства
  findOptimalInterventionTime(userId: string): Promise<Date>;
}
```

**Интеграция с ProactiveNotificationService**:
- [ ] Добавить PLRNN-based prediction alerts
- [ ] Интегрировать bifurcation early warnings
- [ ] Создать causal-based personalized tips
- [ ] Реализовать optimal timing для интервенций

### 2.3 Adaptive Persona Engine

**Концепция**: Соня адаптирует стиль общения на основе CogniCore state.

**Компоненты**:
```typescript
interface IAdaptivePersonaService {
  // Адаптация тона на основе эмоционального состояния
  adaptTone(userId: string, baseMessage: string): Promise<string>;

  // Выбор стратегии мотивационного интервью
  selectMIStrategy(userId: string): Promise<MIStrategy>;

  // Персонализация на основе стадии изменений
  adaptToChangeStage(userId: string, content: string): Promise<string>;
}
```

**Задачи**:
- [ ] Интегрировать MotivationalEngine в SonyaPersona
- [ ] Добавить narrative state tracking
- [ ] Реализовать change stage detection
- [ ] Адаптировать язык под стадию (precontemplation → action)

### 2.4 Multi-Modal Integration

**Компоненты CogniCore**:
- `VoiceInputAdapter` - анализ голосовых biomarkers
- Voice sentiment analysis
- Speech rate analysis

**Расширение WhisperService**:
- [ ] Добавить voice biomarker extraction после транскрипции
- [ ] Интегрировать speech features в state vector
- [ ] Использовать voice data для crisis detection
- [ ] Добавить voice-based mood detection

### 2.5 Clinical Decision Support Dashboard

**Для админов/клиницистов** (расширение AdminCommand):

```typescript
interface IClinicalDashboard {
  // Индивидуальные отчёты
  getPatientDigitalTwin(userId: string): Promise<IDigitalTwinReport>;
  getPatientCausalGraph(userId: string): Promise<ICausalGraphReport>;
  getPredictedTrajectory(userId: string): Promise<ITrajectoryReport>;

  // Когортный анализ
  getCohortTippingPoints(): Promise<ICohortAnalysis>;
  getInterventionEffectiveness(): Promise<IEffectivenessReport>;

  // Safety monitoring
  getHighRiskPatients(): Promise<IPatientRisk[]>;
  getEarlyWarningAlerts(): Promise<IEWSAlert[]>;
}
```

---

## Фаза 3: Beyond 200% - Инновации (Недели 7-10)

### 3.1 Federated Learning Ready

**Подготовка к multi-site deployment**:
- [ ] Абстрагировать PLRNN training для federated setup
- [ ] Реализовать differential privacy для model updates
- [ ] Создать model aggregation service

### 3.2 Real-time Wearable Integration

**Интеграция с носимыми устройствами**:
- [ ] Создать `WearableAdapter` interface
- [ ] Реализовать Fitbit/Garmin/Apple Watch connectors
- [ ] Интегрировать объективные sleep stages в Digital Twin
- [ ] Добавить HRV-based stress detection

### 3.3 Clinician Co-Pilot

**AI-помощник для клинициста**:
- [ ] Генерация клинических заметок из Digital Twin
- [ ] Рекомендации по коррекции терапии
- [ ] Автоматическое выявление non-responders
- [ ] Integration с EMR системами

### 3.4 Personalized Content Generation

**Динамическая генерация контента**:
- [ ] LLM-based personalized sleep stories
- [ ] Adaptive cognitive restructuring exercises
- [ ] Personalized relaxation scripts
- [ ] Cultural adaptation на лету

---

## Приоритизация задач

### Sprint 1 (Неделя 1): Критический путь
| ID | Задача | Компонент | Приоритет |
|----|--------|-----------|-----------|
| 0.1.1 | Заменить SleepCorePOMDP → SleepCoreAdapter | SleepCoreAPI | P0 |
| 0.1.2 | Подключить Thompson Sampling | SleepCoreAdapter | P0 |
| 0.2.1 | Импортировать SleepPredictionService | main.ts | P0 |
| 0.2.2 | Интегрировать PLRNN в /progress | ProgressCommand | P0 |

### Sprint 2 (Неделя 2): Core Integration
| ID | Задача | Компонент | Приоритет |
|----|--------|-----------|-----------|
| 1.1.1 | Создать DigitalTwinService | Новый сервис | P1 |
| 1.3.1 | Добавить "Почему?" к рекомендациям | TodayCommand | P1 |
| 1.4.1 | Constitutional AI middleware | Grammy middleware | P1 |

### Sprint 3 (Неделя 3): Advanced Features
| ID | Задача | Компонент | Приоритет |
|----|--------|-----------|-----------|
| 1.2.1 | Создать CausalInsightsService | Новый сервис | P2 |
| 1.3.2 | Команда /whatif | Новая команда | P2 |
| 1.5.1 | MCT в ThirdWaveCoordinator | MindfulCommand | P2 |

### Sprint 4-6 (Недели 4-6): 200% Features
| ID | Задача | Компонент | Приоритет |
|----|--------|-----------|-----------|
| 2.1.* | Все новые команды | Новые команды | P2 |
| 2.2.* | Proactive Intelligence | ProactiveService | P2 |
| 2.3.* | Adaptive Persona | SonyaPersona | P3 |

---

## Метрики успеха

### Техническое покрытие:

| Метрика | Было | Цель Sprint 1 | Цель Финал |
|---------|------|---------------|------------|
| CogniCore модулей в runtime | 3/15 | 8/15 | 15/15 |
| Deprecated код | SleepCorePOMDP | 0 | 0 |
| Новые команды | 0 | 2 | 6+ |
| Explainability coverage | 0% | 50% | 100% |

### Клиническая ценность:

| Метрика | Было | Цель |
|---------|------|------|
| Персонализация | Rule-based | PLRNN + Thompson |
| Предиктивность | Нет | 7-дневный прогноз |
| Объяснимость | Нет | Каждая рекомендация |
| Causal insights | Нет | Персональный граф |
| Early warnings | Keywords | Bifurcation detection |

---

## Зависимости и риски

### Технические зависимости:
1. **Данные**: Causal discovery требует ≥14 дней данных на пользователя
2. **Compute**: PLRNN inference может требовать оптимизации
3. **Storage**: Digital Twin увеличит объём данных на пользователя

### Риски:
| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| PLRNN performance на большом кол-ве пользователей | Средняя | Batch processing, caching |
| Сложность UX для advanced features | Высокая | Progressive disclosure, tooltips |
| Causal graphs неинтерпретируемы пользователем | Средняя | NarrativeGenerator для объяснений |

---

## Заключение

**Текущее состояние**: Ferrari в гараже, но ездим на седане.

**После реализации плана**:
- Все 15 модулей CogniCore активны
- 6+ новых команд для пользователей
- Полная объяснимость всех решений AI
- Предиктивная аналитика с early warnings
- Constitutional AI safety layer
- Готовность к клиническим испытаниям

**Это не просто 200% — это переход от "rule-based CBT-I bot" к "AI-powered Digital Twin Therapeutic Platform".**
