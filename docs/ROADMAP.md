# SleepCore Unified Roadmap

**Version**: 3.1
**Updated**: 2026-02-08
**Status**: Active Development

---

## Overview

Этот документ объединяет все дорожные карты проекта в единый источник истины.

### Навигация

| Секция | Описание |
|--------|----------|
| [Текущий статус](#текущий-статус) | Что готово сейчас |
| [Ближайшие задачи](#ближайшие-задачи-q1-q2-2026) | Следующие шаги |
| [Полная дорожная карта](#полная-дорожная-карта) | Все фазы |
| [Архивные документы](#архивные-документы) | Ссылки на детальные планы |

---

## Текущий статус

### v1.0.0-alpha.4 (Февраль 2026)

```
ГОТОВО (100%)
├── CBT-I Engine (5 компонентов)         ████████████████████
├── Third-Wave (MBT-I, ACT-I, MCT)       ████████████████████
├── Assessment (ISI, MEQ, MCTQ)          ████████████████████
├── Circadian AI (хронотип)              ████████████████████
├── CogniCore Engine Integration         ████████████████████
│   ├── POMDP + Thompson Sampling
│   ├── Digital Twin (PLRNN)
│   ├── Safety Module
│   └── Causal Insights
├── PAT/Phenotyping Foundation           ████████████████████
├── Cultural Adaptations (TCM/Ayurveda)  ████████████████████
├── Database + Encryption                ████████████████████
├── Regulatory Docs                      ████████████████████
├── Wearable Backend (NEW 2026-02-07)    ████████████████████
│
В ПРОЦЕССЕ
├── Bot Commands Integration             ██████████░░░░░░░░░░ 54%
├── Gamification                         ████████████████░░░░ 83%
├── Mini App                             ████████████░░░░░░░░ 60%
│
ГОТОВО
├── Android Companion App                ████████████████████ 100%
│
НЕ НАЧАТО
├── iOS App                              ░░░░░░░░░░░░░░░░░░░░ 0%
├── Payment/Subscription                 ░░░░░░░░░░░░░░░░░░░░ 0%
└── RCT Clinical Trial                   ░░░░░░░░░░░░░░░░░░░░ 0%
```

### Покрытие тестами

| Метрика | Значение | Статус |
|---------|----------|--------|
| Statements | 84.52% | ✅ |
| Branches | 72.45% | ✅ |
| Functions | 87.47% | ✅ |
| Lines | 84.97% | ✅ |
| **Всего тестов** | **8752+** | ✅ |

---

## Ближайшие задачи (Q1-Q2 2026)

### Приоритет P0 — Критический путь к пилоту

| # | Задача | Статус | Блокирует |
|---|--------|--------|-----------|
| 1 | ~~Wearable Backend API~~ | ✅ Done | Android App |
| 2 | ~~Android Companion App (Health Connect)~~ | ✅ Done | Real wearable data |
| 3 | Bot Commands branches: 34% → 60% | ⏳ In Progress | Quality |
| 4 | Command → Engine integration verification | ⏳ In Progress | Clinical safety |
| 5 | Ethics Committee submission | 🔜 Ready docs | Pilot start |

### Приоритет P1 — Пилот

| # | Задача | Статус | Описание |
|---|--------|--------|----------|
| 6 | Pilot recruitment (N=30-50) | Not started | Telegram, clinics |
| 7 | 8-week treatment monitoring | Ready (tech) | All engines implemented |
| 8 | ISI bi-weekly assessment | Ready (tech) | ISISchedulingService |
| 9 | Adverse event tracking | Ready (tech) | AdverseEventService |

### Приоритет P2 — После пилота

| # | Задача | Статус | Описание |
|---|--------|--------|----------|
| 10 | Native Mobile App (iOS/Android) | Not started | React Native |
| 11 | Push Notifications | Not started | Outside Telegram |
| 12 | Payment/Subscription | Not started | Telegram Stars, Stripe |
| 13 | RCT design (N=150) | Designed | 2-arm, 8 weeks |

---

## Полная дорожная карта

### Phase 1: Foundation ✅ COMPLETE (2024-2025)

| Компонент | Статус | Дата |
|-----------|--------|------|
| CBT-I 5-component system | ✅ | 2024 |
| POMDP intervention selection | ✅ | 2024 |
| Thompson Sampling personalization | ✅ | 2024 |
| Sleep Diary with pattern analysis | ✅ | 2024 |
| ISI Assessment (Russian validated) | ✅ | 2024 |
| MBT-I, ACT-I, MCT engines | ✅ | 2024-2025 |
| Chronotherapy (MEQ, MCTQ) | ✅ | 2025 |
| TCM/Ayurveda Integration | ✅ | 2025 |
| Database + Encryption | ✅ | 2024-2025 |

### Phase 2: CogniCore Integration ✅ COMPLETE (Jan 2026)

| Sprint | Компонент | Статус |
|--------|-----------|--------|
| Sprint 1 | State management, Belief tracking | ✅ |
| Sprint 2 | Digital Twin (PLRNN) | ✅ |
| Sprint 3 | Safety Monitoring | ✅ |
| Sprint 4 | Causal Insights | ✅ |
| Sprint 5 | Proactive Intelligence | ✅ |
| Sprint 6 | Voice Biomarkers | ✅ |

### Phase 3: Precision Phenotyping 🔄 IN PROGRESS (Feb 2026)

| Компонент | Статус | Дата |
|-----------|--------|------|
| PhenotypingService → SleepCoreAPI | ✅ | 2026-02-07 |
| Phenotype → ThirdWaveCoordinator | ✅ | 2026-02-07 |
| /therapy phenotype UI | ✅ | 2026-02-07 |
| **Wearable Backend (HRV integration)** | ✅ | **2026-02-07** |
| **Android Companion App** | ✅ | **2026-02-08** |
| Background sync | ⏳ | Q2 2026 |
| Daily readiness scoring | 🔜 | Q2 2026 |
| Dynamic SRT adjustment | 🔜 | Q2 2026 |

### Phase 4: Pilot Testing (Q2-Q3 2026)

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Ethics Committee approval | Q2 2026 | Docs ready |
| Participant recruitment (N=30-50) | Q2 2026 | Not started |
| 8-week treatment | Q2-Q3 2026 | Tech ready |
| Data analysis | Q3 2026 | — |
| Preliminary results | Q3 2026 | — |

### Phase 5: RCT & Regulatory (Q4 2026 - Q2 2027)

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| RCT design finalization | Q4 2026 | Designed |
| ClinicalTrials.gov registration | Q4 2026 | Not started |
| RCT execution (N=150) | Q4 2026 - Q2 2027 | — |
| Roszdravnadzor submission | Q3 2026 | Docs in progress |
| CE Mark preparation | Q1 2027 | Docs ready |
| FDA 510(k) pre-submission | Q4 2027 | — |

### Phase 6: Market Entry (2027)

| Market | Pathway | Target |
|--------|---------|--------|
| Russia | Roszdravnadzor Class IIa | Q3 2026 pilot |
| EAEU | Harmonization | Q1 2027 |
| Germany | DiGA Fast-Track | Q2 2027 |
| EU | CE Mark Class IIa | Q1 2027 |
| USA | FDA 510(k) | Q4 2027 |

### Phase 7: Advanced Features (2027+)

| Feature | Priority | Status |
|---------|----------|--------|
| Genetic profiling (PER3/CLOCK) | Medium | Research done |
| LLM-therapist with CBT alignment | Medium | Not started |
| N-of-1 Adaptive Trials | Low | Not started |
| Microbiome recommendations | Low | Research done |
| Federated Learning | Low | Not started |

---

## Технические приоритеты

### Wearable Integration Roadmap

```
┌─────────────────────────────────────────────────────────────────┐
│                      WEARABLE INTEGRATION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1: Backend API ✅ COMPLETE (2026-02-07)                  │
│  ├── WearableIngestionService                                   │
│  ├── WearablePATIntegration                                     │
│  ├── Types for Health Connect                                   │
│  └── 46 unit tests                                              │
│                                                                 │
│  Phase 2: Android Companion App ✅ COMPLETE (2026-02-08)        │
│  ├── Kotlin + Health Connect SDK                                │
│  ├── Samsung Galaxy Watch support                               │
│  ├── Foreground sync (manual)                                   │
│  ├── Telegram bot linking                                       │
│  └── 42 files, 7 test files, 2281 lines of tests                │
│                                                                 │
│  Phase 3: Background Sync 🔜                                    │
│  ├── WorkManager (Android 15+ only)                             │
│  ├── Every 15 minutes                                           │
│  └── Battery optimization                                       │
│                                                                 │
│  Phase 4: Real PAT Mode 🔜                                      │
│  ├── PAT adapter switch to real data                            │
│  ├── Phenotype from actual HRV/sleep                            │
│  └── Validation against simulated                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Precision Phenotyping Roadmap

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRECISION PHENOTYPING                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: Blanken 5-Class Model ✅                              │
│  ├── PhenotypingService                                         │
│  ├── PAT-based estimation                                       │
│  └── ThirdWaveCoordinator routing                               │
│                                                                 │
│  Layer 2: HRV Integration ✅ BACKEND READY                      │
│  ├── WearablePATIntegration.extractHRVFeatures()                │
│  ├── Autonomic status classification                            │
│  └── Trend analysis                                             │
│                                                                 │
│  Layer 3: Real-time Adaptation 🔜                               │
│  ├── Daily readiness scoring                                    │
│  ├── Dynamic SRT adjustment                                     │
│  └── Recovery-based intensity                                   │
│                                                                 │
│  Layer 4: Genetic (Q4 2026) 🔜                                  │
│  ├── PER3 VNTR input                                            │
│  ├── CLOCK 3111T/C                                              │
│  └── GDPR Article 9 compliance                                  │
│                                                                 │
│  Layer 5: Microbiome (2027) 🔜                                  │
│  ├── Lab partnership                                            │
│  └── Gut-brain recommendations                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Ресурсы и бюджет

### Команда (MVP)

| Роль | FTE | Фаза |
|------|-----|------|
| Backend Developer | 1 | All |
| Mobile Developer | 1 | Phase 4+ |
| QA Engineer | 0.5 | All |
| Clinical Advisor | 0.2 | Phase 4-5 |
| Product Manager | 0.5 | All |

### Бюджет

| Фаза | Категория | Оценка |
|------|-----------|--------|
| Phase 3-4 | Development | $30-50K |
| Phase 4 | Pilot study | $20-30K |
| Phase 5 | RCT | $150-300K |
| Phase 6 | Launch | $50-100K |

---

## Метрики успеха

### Технические KPI

| Метрика | Текущее | Цель (пилот) | Цель (продакшн) |
|---------|---------|--------------|------------------|
| Test coverage | 84.97% | 80% ✅ | 85% ✅ |
| Bot Services coverage | 82.78% | 80% ✅ | 90% |
| Количество тестов | 8752+ | 5000+ ✅ | 10000+ |

### Клинические KPI

| Метрика | Target | Source |
|---------|--------|--------|
| ISI reduction | ≥ 7 points | Pilot |
| Remission rate (ISI ≤ 7) | ≥ 50% | RCT |
| Effect size | d ≥ 0.8 | RCT |
| 8-week completion | ≥ 60% | Engagement |

### Продуктовые KPI

| Метрика | Target | Phase |
|---------|--------|-------|
| DAU/MAU | > 30% | Phase 6+ |
| NPS | > 50 | Phase 6+ |
| Conversion (freemium) | 5-8% | Phase 6+ |

---

## Архивные документы

Эти документы содержат детальную историю и исследования:

| Документ | Статус | Описание |
|----------|--------|----------|
| `docs/archive/ROADMAP_v1_2024.md` | Archived | Оригинальный roadmap (Dec 2024) |
| `docs/archive/INTEGRATION_ROADMAP.md` | Archived | CogniCore интеграция (100% complete) |
| `docs/production/launch-plan.md` | Active | Детальный план запуска |
| `docs/PROJECT_STATUS_REPORT.md` | Active | Полный статус проекта |
| `docs/research/PRECISION_PHENOTYPING_RESEARCH_2026.md` | Active | Исследование фенотипирования |
| `docs/research/HEALTH_CONNECT_DEEP_RESEARCH_2026-02-07.md` | Active | Health Connect исследование |

---

## Changelog

### 2026-02-09
- ✅ Fixed Command → Engine integration: wired 11 orphan commands into main.ts
- ✅ Fixed ChronotypeCommand callback routing (was silently failing)
- 📋 Identified orphaned engines: TCMIntegratedCBTIEngine, AyurvedaYogaEngine need commands

### 2026-02-08
- ✅ Android Companion App complete (42 files, Kotlin/Compose)
- ✅ Unit tests for Android (7 test files, 2281 lines)
- ✅ Health Connect integration with Samsung Galaxy Watch support

### 2026-02-07
- ✅ Added Wearable Backend (WearableIngestionService, WearablePATIntegration)
- ✅ Updated Precision Phenotyping status
- ✅ Created unified ROADMAP.md

### 2026-02-07 (earlier)
- ✅ PhenotypingService integrated into SleepCoreAPI
- ✅ Phenotype → ThirdWaveCoordinator chain
- ✅ /therapy phenotype UI

### 2026-01-XX
- ✅ CogniCore Engine integration 100% complete
- ✅ All 6 sprints finished

---

*Unified Roadmap v3.1 — Updated 2026-02-08*
*Next review: After Pilot (Q3 2026)*
