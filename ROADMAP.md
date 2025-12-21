# SleepCore Development Roadmap

**Version**: 2.0 | **Updated**: December 2024

---

## Стратегическое позиционирование

> **"Первая интегративная AI-powered dCBT-I платформа для незападных рынков"**

### Ключевые дифференциаторы

| Фактор | SleepioRx | SleepCore | Наше преимущество |
|--------|-----------|-----------|-------------------|
| Терапии | CBT-I only | CBT-I + MBT-I + ACT-I | Multi-therapy fallback |
| Культура | Western | + TCM + Ayurveda | Азиатские рынки |
| Язык | English | Russian-first | СНГ рынок |
| Архитектура | Closed | Open engine | B2B licensing |
| AI | Simple ML | POMDP + Thompson | Научная новизна |

---

## Текущий статус

### Завершено (v1.0.0-alpha.4)

```
✅ Core Engine
├── CBT-I 5-component system
├── POMDP intervention selection
├── Thompson Sampling personalization
├── Sleep Diary with pattern analysis
└── ISI Assessment (Russian validated)

✅ Extended Therapies
├── MBT-I (Mindfulness-Based)
├── ACT-I (Acceptance & Commitment)
├── Chronotherapy (MEQ, MCTQ)
├── TCM Integration
└── Ayurveda Integration

✅ Infrastructure
├── SQLite (development)
├── PostgreSQL (production)
├── AES-256-GCM encryption
├── HIPAA audit trail
└── Automated backup
```

### Критические пробелы

| Gap | Влияние | Блокирует |
|-----|---------|-----------|
| 0% test coverage | FDA non-compliance | Clinical trials |
| No mobile app | No B2C users | Market entry |
| No engagement | Poor retention | Clinical outcomes |
| No clinical data | No credibility | B2B sales |

---

## Phase 5: Foundation (Q1 2025)

### 5.1 Test Coverage — КРИТИЧЕСКИЙ

**Цель**: >80% coverage, CI/CD pipeline

**Почему первый**: Без тестов невозможны безопасные изменения кода

```
Неделя 1-2: Unit Tests - Core
├── tests/cbt-i/
│   ├── SleepRestrictionEngine.spec.ts
│   ├── StimulusControlEngine.spec.ts
│   ├── CognitiveRestructuringEngine.spec.ts
│   ├── SleepHygieneEngine.spec.ts
│   ├── RelaxationEngine.spec.ts
│   └── CBTIEngine.spec.ts
├── tests/diary/
│   └── SleepDiaryService.spec.ts
└── tests/assessment/
    └── ISIRussian.spec.ts

Неделя 3-4: Unit Tests - Extended
├── tests/third-wave/
│   ├── MBTIEngine.spec.ts
│   ├── ACTIEngine.spec.ts
│   └── ThirdWaveCoordinator.spec.ts
├── tests/circadian/
│   └── CircadianAI.spec.ts
└── tests/platform/
    └── SleepCorePOMDP.spec.ts

Неделя 5-6: Integration & E2E
├── tests/integration/
│   ├── treatment-flow.spec.ts
│   ├── database-operations.spec.ts
│   ├── security-services.spec.ts
│   └── multi-therapy-switching.spec.ts
└── tests/e2e/
    └── complete-8-week-treatment.spec.ts
```

**Deliverables**:
- [ ] Jest configuration with ts-jest
- [ ] 80%+ code coverage
- [ ] GitHub Actions CI pipeline
- [ ] Coverage badge in README

**Effort**: 6 недель, 1 developer

---

### 5.2 API Documentation

**Цель**: OpenAPI 3.0 spec для интеграций

```
docs/api/
├── openapi.yaml           # Full API specification
├── authentication.md      # Auth patterns
├── treatment-flow.md      # Workflow diagrams
└── examples/
    ├── start-session.md
    ├── daily-checkin.md
    └── progress-report.md
```

**Deliverables**:
- [ ] OpenAPI 3.0 specification
- [ ] Swagger UI integration
- [ ] SDK generation (TypeScript, Python)

**Effort**: 2 недели

---

### 5.3 Logging & Monitoring

**Цель**: Production-ready observability

```typescript
// Добавить
import { Logger } from './infrastructure/logging';

const logger = new Logger('CBTIEngine');
logger.info('Treatment initialized', { userId, plan });
logger.warn('Low adherence detected', { userId, adherence: 0.3 });
logger.error('Intervention failed', { error, context });
```

**Stack**:
- Winston/Pino для structured logging
- OpenTelemetry для tracing
- Prometheus metrics

**Effort**: 2 недели

---

## Phase 6: Content & Engagement (Q1-Q2 2025)

### 6.1 Content Library

**Цель**: 50+ образовательных модулей (RU/EN)

```
src/content/
├── psychoeducation/
│   ├── ru/
│   │   ├── sleep-architecture.md
│   │   ├── circadian-rhythms.md
│   │   ├── sleep-pressure.md
│   │   ├── insomnia-cycle.md
│   │   └── two-process-model.md
│   └── en/
│       └── ...
├── sleep-hygiene/
│   ├── ru/
│   │   ├── caffeine-impact.md
│   │   ├── alcohol-effects.md
│   │   ├── exercise-timing.md
│   │   ├── bedroom-optimization.md
│   │   ├── light-exposure.md
│   │   └── pre-sleep-routine.md
│   └── en/
├── cognitive/
│   ├── ru/
│   │   ├── common-sleep-beliefs.md
│   │   ├── thought-challenging.md
│   │   ├── catastrophizing.md
│   │   ├── sleep-effort-paradox.md
│   │   └── acceptance-approach.md
│   └── en/
├── relaxation/
│   ├── scripts/
│   │   ├── pmr-full-ru.md
│   │   ├── pmr-short-ru.md
│   │   ├── breathing-4-7-8-ru.md
│   │   ├── body-scan-ru.md
│   │   ├── guided-imagery-ru.md
│   │   └── cognitive-shuffle-ru.md
│   └── audio/
│       ├── pmr-ru.mp3
│       ├── body-scan-ru.mp3
│       └── ...
└── cultural/
    ├── tcm/
    │   ├── acupoint-guide.md
    │   └── herbal-formulas.md
    └── ayurveda/
        ├── yoga-nidra-script.md
        └── dinacharya-guide.md
```

**Deliverables**:
- [ ] 50+ markdown modules
- [ ] 10+ audio relaxation scripts
- [ ] Content delivery API
- [ ] Progress tracking per module

**Effort**: 8 недель (контент + разработка)

---

### 6.2 Engagement System

**Цель**: Retention >70% на 8-недельной программе

```
src/engagement/
├── notifications/
│   ├── NotificationService.ts
│   ├── SchedulerService.ts
│   ├── templates/
│   │   ├── bedtime-reminder.ts
│   │   ├── morning-checkin.ts
│   │   ├── diary-nudge.ts
│   │   ├── weekly-summary.ts
│   │   └── achievement-unlock.ts
│   └── channels/
│       ├── TelegramChannel.ts
│       ├── PushChannel.ts
│       └── EmailChannel.ts
├── gamification/
│   ├── StreakService.ts
│   ├── AchievementService.ts
│   ├── BadgeDefinitions.ts
│   └── LeaderboardService.ts (optional)
├── adherence/
│   ├── AdherenceTracker.ts
│   ├── DropoffPredictor.ts
│   └── ReengagementService.ts
└── analytics/
    ├── EngagementMetrics.ts
    └── FunnelAnalysis.ts
```

**Achievements система**:

| Badge | Условие | Описание |
|-------|---------|----------|
| First Step | 1 diary entry | Начало пути |
| Week Warrior | 7 consecutive days | Неделя дисциплины |
| Sleep Scientist | Complete all education | Эксперт по сну |
| Night Owl Reformed | SE > 85% for 2 weeks | Эффективный сон |
| Mindful Sleeper | 10 relaxation sessions | Мастер расслабления |
| CBT-I Graduate | Complete 8-week program | Выпускник программы |

**Deliverables**:
- [ ] Multi-channel notification system
- [ ] 15+ achievements/badges
- [ ] Streak tracking with recovery
- [ ] Adherence dashboard
- [ ] Dropout prediction model

**Effort**: 6 недель

---

## Phase 7: Mobile MVP (Q2 2025)

### 7.1 React Native Application

**Цель**: iOS + Android MVP для pilot testing

```
mobile/
├── src/
│   ├── screens/
│   │   ├── Onboarding/
│   │   │   ├── Welcome.tsx
│   │   │   ├── Assessment.tsx
│   │   │   └── PlanPreview.tsx
│   │   ├── Home/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── TodaysPlan.tsx
│   │   │   └── QuickActions.tsx
│   │   ├── Diary/
│   │   │   ├── MorningEntry.tsx
│   │   │   ├── EveningEntry.tsx
│   │   │   └── WeeklySummary.tsx
│   │   ├── Treatment/
│   │   │   ├── SleepWindow.tsx
│   │   │   ├── CognitiveExercise.tsx
│   │   │   ├── RelaxationPlayer.tsx
│   │   │   └── EducationModule.tsx
│   │   ├── Progress/
│   │   │   ├── Charts.tsx
│   │   │   ├── Achievements.tsx
│   │   │   └── Insights.tsx
│   │   └── Settings/
│   │       ├── Profile.tsx
│   │       ├── Notifications.tsx
│   │       └── Privacy.tsx
│   ├── components/
│   │   ├── SleepClock.tsx
│   │   ├── EfficiencyMeter.tsx
│   │   ├── StreakCounter.tsx
│   │   └── AudioPlayer.tsx
│   ├── services/
│   │   ├── api.ts
│   │   ├── notifications.ts
│   │   └── storage.ts
│   └── store/
│       ├── slices/
│       └── selectors/
├── ios/
├── android/
└── __tests__/
```

**MVP Features (v1.0)**:
- [ ] Onboarding + ISI assessment
- [ ] Sleep diary (morning/evening)
- [ ] Daily treatment card
- [ ] Sleep window tracker
- [ ] Basic relaxation player
- [ ] Progress charts
- [ ] Push notifications
- [ ] Offline mode

**Deliverables**:
- [ ] iOS app (TestFlight)
- [ ] Android app (Internal testing)
- [ ] Backend API integration
- [ ] Offline-first architecture

**Effort**: 12 недель, 2 developers

---

### 7.2 Telegram Bot (Parallel Track)

**Цель**: Быстрый выход на рынок без App Store

```
src/telegram/
├── TelegramBotService.ts
├── handlers/
│   ├── StartHandler.ts
│   ├── DiaryHandler.ts
│   ├── TreatmentHandler.ts
│   └── ProgressHandler.ts
├── keyboards/
│   ├── MainMenu.ts
│   ├── DiaryEntry.ts
│   └── QuickResponses.ts
└── schedulers/
    ├── ReminderScheduler.ts
    └── CheckInScheduler.ts
```

**Преимущество Telegram**:
- Нет App Store review
- Мгновенный деплой
- Встроенные уведомления
- Русскоязычная аудитория

**Effort**: 4 недели

---

## Phase 8: Wearable Integration (Q3 2025)

### 8.1 Data Integration Layer

```
src/wearables/
├── interfaces/
│   ├── IWearableProvider.ts
│   ├── IWearableSleepData.ts
│   └── IWearableSync.ts
├── providers/
│   ├── AppleHealthProvider.ts
│   ├── FitbitProvider.ts
│   ├── GarminProvider.ts
│   ├── OuraProvider.ts
│   └── XiaomiProvider.ts
├── services/
│   ├── WearableSyncService.ts
│   ├── DataNormalizationService.ts
│   ├── QualityAssessmentService.ts
│   └── DiaryAugmentationService.ts
└── analytics/
    ├── ObjectiveSubjectiveComparison.ts
    └── SleepStageAnalysis.ts
```

**Data Model**:

```typescript
interface IWearableSleepData {
  source: 'apple' | 'fitbit' | 'garmin' | 'oura' | 'xiaomi';
  date: string;

  // Core metrics
  totalSleepTime: number;      // minutes
  timeInBed: number;           // minutes
  sleepEfficiency: number;     // %
  sleepOnsetLatency: number;   // minutes
  wakeAfterSleepOnset: number; // minutes
  awakenings: number;

  // Sleep stages (if available)
  stages?: {
    deep: number;    // minutes
    light: number;   // minutes
    rem: number;     // minutes
    awake: number;   // minutes
  };

  // Physiological (if available)
  heartRate?: {
    average: number;
    min: number;
    max: number;
    hrv?: number;
  };

  // Quality indicators
  dataQuality: 'high' | 'medium' | 'low';
  wearTime: number;  // % of night
}
```

**POMDP Enhancement**:
- Observation model update with objective data
- Confidence scoring based on data quality
- Subjective-objective discrepancy detection

**Effort**: 8 недель

---

## Phase 9: Clinical Validation (Q4 2025 - Q2 2026)

### 9.1 Pilot Study

**Цель**: N=50, proof-of-concept data

```
Protocol:
├── Design: Single-arm, open-label
├── N: 50 participants
├── Duration: 8 weeks intervention + 4 weeks follow-up
├── Inclusion:
│   ├── Age 18-65
│   ├── ISI ≥ 10
│   ├── Chronic insomnia (>3 months)
│   └── No untreated comorbidities
├── Primary: ISI change from baseline
├── Secondary:
│   ├── Sleep efficiency (diary)
│   ├── PSQI score
│   ├── Treatment adherence
│   └── User satisfaction (SUS)
└── Analysis: Paired t-test, effect size
```

**Deliverables**:
- [ ] Ethics approval (local IRB)
- [ ] Recruitment (social media, clinics)
- [ ] Data collection platform
- [ ] Preliminary results
- [ ] Conference abstract

**Effort**: 6 месяцев

---

### 9.2 Randomized Controlled Trial

**Цель**: N=200, FDA-quality evidence

```
Protocol:
├── Design: RCT, double-blind, parallel group
├── N: 200 (100 per arm)
├── Arms:
│   ├── Intervention: SleepCore full program
│   └── Control: Digital sleep hygiene education
├── Duration: 8 weeks + 6 months follow-up
├── Blinding: Digital sham with matched engagement
├── Primary: ISI change at 8 weeks
├── Secondary:
│   ├── Remission rate (ISI ≤ 7)
│   ├── Response rate (ISI reduction ≥ 8)
│   ├── Sleep efficiency
│   ├── Depression (PHQ-9)
│   ├── Anxiety (GAD-7)
│   ├── Quality of life (SF-12)
│   └── Durability at 6 months
├── Safety: Adverse event monitoring
└── Analysis: ITT, ANCOVA, mixed models
```

**Target Outcomes** (based on SleepioRx benchmarks):
- ISI reduction: ≥ 7 points
- Remission rate: ≥ 50%
- Effect size: d ≥ 0.8

**Effort**: 12-18 месяцев

---

## Phase 10: Market Entry (2026)

### 10.1 B2C Launch (Russia/CIS)

```
Strategy:
├── Telegram bot → широкий охват
├── Mobile app → premium experience
├── Pricing: Freemium
│   ├── Free: Sleep diary, basic education
│   └── Premium: Full CBT-I, personalization, support
└── Marketing:
    ├── Sleep clinics partnerships
    ├── Corporate wellness programs
    └── Influencer collaborations
```

### 10.2 B2B Platform

```
Offerings:
├── White-label licensing
│   └── Other DTx companies use CogniCore engine
├── API access
│   └── Integration into existing platforms
├── Clinical decision support
│   └── For sleep specialists
└── Enterprise wellness
    └── Employee sleep programs
```

### 10.3 Regulatory Pathways

| Market | Pathway | Timeline |
|--------|---------|----------|
| Russia | Roszdravnadzor Class IIa | 6-12 months |
| EU | CE-mark MDR Class IIa | 12-18 months |
| USA | FDA 510(k) (predicate: Somryst) | 18-24 months |

---

## Summary Timeline

```
2025 Q1: Foundation
├── Week 1-6:   Phase 5.1 - Test coverage
├── Week 7-8:   Phase 5.2 - API documentation
└── Week 9-10:  Phase 5.3 - Logging & monitoring

2025 Q1-Q2: Content & Engagement
├── Week 11-18: Phase 6.1 - Content library
└── Week 19-24: Phase 6.2 - Engagement system

2025 Q2: Mobile MVP
├── Week 13-16: Phase 7.2 - Telegram bot (parallel)
└── Week 17-28: Phase 7.1 - React Native app

2025 Q3: Wearables
└── Week 29-36: Phase 8.1 - Wearable integration

2025 Q4 - 2026 Q2: Clinical Validation
├── Month 10-15: Phase 9.1 - Pilot study
└── Month 16-30: Phase 9.2 - RCT

2026: Market Entry
├── Phase 10.1 - B2C launch
├── Phase 10.2 - B2B platform
└── Phase 10.3 - Regulatory approvals
```

---

## Resource Requirements

### Team (Minimum Viable)

| Role | FTE | Phase |
|------|-----|-------|
| Backend Developer | 1 | All |
| Mobile Developer | 1 | Phase 7+ |
| Content Writer (RU) | 0.5 | Phase 6 |
| QA Engineer | 0.5 | Phase 5+ |
| Clinical Advisor | 0.2 | Phase 9 |
| Product Manager | 0.5 | All |

### Budget Estimates

| Phase | Category | Estimate |
|-------|----------|----------|
| 5-6 | Development | $30-50K |
| 7 | Mobile app | $50-80K |
| 8 | Wearables | $20-30K |
| 9.1 | Pilot study | $20-30K |
| 9.2 | RCT | $150-300K |
| 10 | Launch | $50-100K |

---

## Success Metrics

### Technical KPIs

| Metric | Target | Phase |
|--------|--------|-------|
| Test coverage | >80% | 5 |
| API response time | <200ms | 5 |
| App crash rate | <0.1% | 7 |
| Offline reliability | 99.9% | 7 |

### Product KPIs

| Metric | Target | Phase |
|--------|--------|-------|
| DAU/MAU | >30% | 7+ |
| 8-week completion | >60% | 6+ |
| NPS | >50 | 7+ |

### Clinical KPIs

| Metric | Target | Phase |
|--------|--------|-------|
| ISI reduction | >7 points | 9 |
| Remission rate | >50% | 9 |
| Effect size | d > 0.8 | 9 |

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| RCT fails to show efficacy | Medium | Critical | Strong pilot data first |
| App Store rejection | Low | High | Telegram as backup |
| Competitor enters RU market | Medium | Medium | First-mover advantage |
| Low engagement | Medium | High | Gamification, notifications |
| Regulatory changes | Low | Medium | Flexible architecture |

---

## Next Immediate Actions

### Эта неделя:
1. [ ] Setup Jest + ts-jest configuration
2. [ ] Write first test: `SleepDiaryService.spec.ts`
3. [ ] GitHub Actions CI workflow

### Этот месяц:
1. [ ] Complete Phase 5.1 (core engine tests)
2. [ ] Begin content outline for Phase 6.1
3. [ ] Telegram bot prototype

---

*Roadmap v2.0 — Updated December 2024*
*Next review: March 2025*
