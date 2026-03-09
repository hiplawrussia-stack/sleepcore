# SleepCore Unified Roadmap

**Version**: 4.5
**Updated**: 2026-03-09
**Status**: Active Development — Architecture Audit Complete ✅

---

## Overview

Этот документ объединяет все дорожные карты проекта в единый источник истины.

### Стратегическая позиция

```
┌─────────────────────────────────────────────────────────────────────┐
│  SLEEPCORE — Первый русскоязычный CBT-I Digital Therapeutic (DTx)   │
│                                                                     │
│  Рынок:      "Blue Ocean" — нет конкурентов в RU/CIS               │
│  Модель:     Nonprofit DTx (фонд "Другой путь")                    │
│  Цель:       Доказательное лечение бессонницы для 100M+ населения   │
│  Платформы:  Telegram • VK • Web App (в разработке)                │
│                                                                     │
│  FDA предикаты: Sleepio (Pear/Big Health), Somryst (Pear)           │
│  DiGA: Целевой стандарт для EU reimbursement                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Конкурентные преимущества vs Sleepio/Somryst

| Компонент | Sleepio | Somryst | SleepCore |
|-----------|---------|---------|-----------|
| AI Personalization | ❌ Rules | ❌ Rules | ✅ **Thompson Sampling** |
| Non-responders (30%) | ❌ None | ❌ None | ✅ **MBT-I, ACT-I, MCT** |
| Digital Twin | ❌ None | ❌ None | ✅ **PLRNN 5D state** |
| Phenotyping | ❌ None | ❌ None | ✅ **Blanken 2019** |
| Wearable HRV | ⚠️ Limited | ❌ None | ✅ **Health Connect** |
| FDA Cleared | ✅ 2020 | ✅ 2020 | 🔜 2027 |

**Вывод:** Технологически на 2-3 года впереди, клинически — требуется RCT.

### Навигация

| Секция | Описание |
|--------|----------|
| [Стратегические приоритеты](#стратегические-приоритеты-top-3) | TOP-3 на 2026 |
| [Текущий статус](#текущий-статус) | Что готово сейчас |
| [Ближайшие задачи](#ближайшие-задачи-q1-q2-2026) | Следующие шаги |
| [Полная дорожная карта](#полная-дорожная-карта) | Все фазы |
| [Архивные документы](#архивные-документы) | Ссылки на детальные планы |

---

## Стратегические приоритеты (TOP-3)

На основе анализа рынка и конкурентного ландшафта, выделены 3 критических направления:

### 1. Пилотное RCT (n=100)

**Почему это критично:**
- Доказательная база — фундамент для FDA/DiGA/Roszdravnadzor
- n=100 обеспечивает статистическую мощность для effect size d≥0.8
- Без RCT невозможна монетизация через страховые системы

| Параметр | Значение |
|----------|----------|
| Дизайн | 2-arm RCT (SleepCore vs Waitlist) |
| Размер выборки | n=100 (50/50) |
| Длительность | 8 недель лечения + 4 недели follow-up |
| Primary outcome | ISI reduction ≥ 7 points |
| Secondary | SE%, SOL, PSS-4, PHQ-9 |

### 2. Web-версия приложения

**Почему это критично:**
- Независимость от платформ (Telegram/VK могут заблокировать)
- B2B продажи требуют веб-интерфейса
- DiGA требует standalone решение

| Компонент | Статус |
|-----------|--------|
| API Backend | ✅ Ready (Hono) |
| Auth (JWT) | ✅ Ready |
| Frontend | 🔜 React + VKUI/Tailwind |

### 3. B2B Employer Pilots

**Почему это критично:**
- Корпоративный wellness — быстрая монетизация
- Unit economics: $5-15/employee/month vs $0 freemium
- PoC для insurance partnerships

| Сегмент | Потенциал |
|---------|-----------|
| IT-компании (RU/CIS) | Высокий — культура wellness |
| Промышленность | Средний — safety compliance |
| Финансы/Banking | Высокий — stress management |

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
│   ├── POMDP + Thompson Sampling    ← ACTIVE
│   ├── Digital Twin (PLRNN)         ← STAGED (awaiting data)
│   ├── Safety Module                ← ACTIVE
│   └── Causal Insights              ← STAGED (awaiting data)
├── PAT/Phenotyping Foundation           ████████████████████
├── Cultural Adaptations (TCM/Ayurveda)  ████████████████████ (experimental)
├── Database + Encryption                ████████████████████
├── Regulatory Docs                      ████████████████████
├── Wearable Backend (NEW 2026-02-07)    ████████████████████
├── Telegram Bot (25 commands)           ████████████████████
│
В ПРОЦЕССЕ
├── VK Bot (NEW 2026-02-16)              ████████████████░░░░ 80%
├── Gamification                         ████████████████░░░░ 83%
├── Mini App (Telegram)                  ████████████░░░░░░░░ 60%
│
ГОТОВО
├── Bot Commands Integration             ████████████████████ 100% (audit 2026-02-09)
├── Android Companion App                ████████████████████ 100%
│
НЕ НАЧАТО
├── **Web App**                          ░░░░░░░░░░░░░░░░░░░░ 0% ← PRIORITY
├── iOS App                              ░░░░░░░░░░░░░░░░░░░░ 0%
├── Payment/Subscription                 ░░░░░░░░░░░░░░░░░░░░ 0%
└── **Pilot RCT (n=100)**                ░░░░░░░░░░░░░░░░░░░░ 0% ← CRITICAL
```

### Покрытие тестами

| Метрика | Значение | Статус |
|---------|----------|--------|
| Statements | 84.52% | ✅ |
| Branches | 72.45% | ✅ |
| Functions | 87.47% | ✅ |
| Lines | 84.97% | ✅ |
| **Всего тестов** | **10444+** | ✅ |

---

## Стратегия активации AI-компонентов

> **Принцип:** Технология без данных = потенциал. Активируем компоненты по мере готовности данных.

### Фазы активации

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FEATURE ACTIVATION STRATEGY                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  СЕЙЧАС (0-6 мес): Core CBT-I                                      │
│  ├── 6 CBT-I engines                    ✅ ACTIVE                   │
│  ├── Assessment (ISI, MEQ, MCQ-30)      ✅ ACTIVE                   │
│  ├── Gamification                       ✅ ACTIVE                   │
│  ├── Health Connect sync                ✅ ACTIVE                   │
│  └── Basic recommendations              ✅ ACTIVE                   │
│                                                                     │
│  PHASE 2 (6-12 мес): AI Personalization — requires 100+ users      │
│  ├── Thompson Sampling                  ✅ READY → ACTIVATE         │
│  ├── A/B testing infrastructure         🔜 BUILD                    │
│  └── Collect data for PLRNN training    🔜 START                    │
│                                                                     │
│  PHASE 3 (12-18 мес): Predictive AI — requires 500+ users          │
│  ├── PLRNN Digital Twin                 📦 STAGED → ACTIVATE        │
│  ├── Trajectory prediction              📦 STAGED → ACTIVATE        │
│  ├── Tipping point detection            📦 STAGED → ACTIVATE        │
│  └── Causal Discovery                   📦 STAGED → ACTIVATE        │
│                                                                     │
│  PHASE 4 (18-24 мес): Third-Wave — requires RCT non-responder data │
│  ├── MBT-I for high arousal             📦 STAGED → ACTIVATE        │
│  ├── ACT-I for avoidance                📦 STAGED → ACTIVATE        │
│  └── MCT for rumination                 📦 STAGED → ACTIVATE        │
│                                                                     │
│  DISABLED (weak evidence):                                          │
│  ├── TCM Integration                    ⏸️ EXPERIMENTAL             │
│  └── Ayurveda Integration               ⏸️ EXPERIMENTAL             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Критерии активации

| Компонент | Требование | Метрика |
|-----------|------------|---------|
| Thompson Sampling | 100+ users с 2+ неделями данных | User count |
| PLRNN Digital Twin | 500+ users × 8 недель | 4000+ patient-weeks |
| Third-Wave | RCT завершён, non-responders identified | ISI drop < 7 points |
| TCM/Ayurveda | Отдельное RCT с cultural validation | — |

---

## Ближайшие задачи (Q1-Q2 2026)

### Приоритет P0 — Критический путь к пилоту

| # | Задача | Статус | Блокирует |
|---|--------|--------|-----------|
| 1 | ~~Wearable Backend API~~ | ✅ Done | Android App |
| 2 | ~~Android Companion App (Health Connect)~~ | ✅ Done | Real wearable data |
| 3 | ~~Bot Commands branches: 82.2%~~ | ✅ Done (was 34%, target 60%) | Quality |
| 4 | ~~Command → Engine integration~~ | ✅ Done (full audit 2026-02-09) | Clinical safety |
| 5 | Ethics Committee submission | 🔜 Ready docs | Pilot start |
| 6 | **VK Bot deployment** | 🔜 In progress | Multi-platform coverage |

### Приоритет P1 — Pilot RCT (n=100)

| # | Задача | Статус | Описание |
|---|--------|--------|----------|
| 7 | Ethics Committee approval | 🔜 Docs ready | IRB/Этический комитет |
| 8 | **Pilot recruitment (n=100)** | Not started | Telegram + VK + Clinics |
| 9 | Randomization system | Not started | 2-arm: SleepCore vs Waitlist |
| 10 | 8-week treatment + 4-week follow-up | Ready (tech) | All engines implemented |
| 11 | ISI bi-weekly assessment | Ready (tech) | ISISchedulingService |
| 12 | Adverse event tracking | Ready (tech) | AdverseEventService |
| 13 | Data collection (PHQ-9, PSS-4) | 🔜 Need forms | Secondary outcomes |

### Приоритет P2 — Web App & B2B

| # | Задача | Статус | Описание |
|---|--------|--------|----------|
| 14 | **Web App MVP** | Not started | React + API integration |
| 15 | **B2B landing page** | Not started | Corporate wellness pitch |
| 16 | B2B pilot (1-2 companies) | Not started | IT-компании RU |
| 17 | Stripe/YooKassa integration | Not started | Payment processing |

### Приоритет P3 — После пилота

| # | Задача | Статус | Описание |
|---|--------|--------|----------|
| 18 | Native Mobile App (iOS/Android) | Not started | React Native |
| 19 | Push Notifications | Not started | Outside Telegram/VK |
| 20 | RCT publication (peer-review) | — | JMIR, Sleep Medicine |
| 21 | Grant applications | 🔜 | РНФ, РФФИ, EU Horizon |

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

### Phase 4: Pilot RCT (Q2-Q3 2026) — CRITICAL PATH

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Ethics Committee approval | Q2 2026 | Docs ready |
| ClinicalTrials.gov registration | Q2 2026 | Not started |
| **Participant recruitment (n=100)** | Q2 2026 | Not started |
| Randomization (50/50) | Q2 2026 | Tech not started |
| 8-week treatment | Q2-Q3 2026 | Tech ready |
| 4-week follow-up | Q3 2026 | — |
| Data analysis (ITT + per-protocol) | Q3 2026 | — |
| **Preliminary results** | Q3 2026 | — |
| **Peer-review submission** | Q3-Q4 2026 | Target: JMIR, Sleep Medicine |

**Статистический дизайн:**
- Primary: ISI reduction ≥ 7 points (clinically significant)
- Power: 80%, α=0.05, expected d=0.8
- n=100 обеспечивает выявление effect size d≥0.5

### Phase 4b: Web App & B2B Track (Q2-Q3 2026) — PARALLEL

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Web App MVP (breathing + diary) | Q2 2026 | Not started |
| B2B landing page | Q2 2026 | Not started |
| First corporate pilot (n=20-50) | Q3 2026 | Not started |
| Pricing model validation | Q3 2026 | — |
| YooKassa/Stripe integration | Q3 2026 | — |

### Phase 5: RCT Publication & Regulatory (Q4 2026 - Q2 2027)

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| RCT paper publication | Q4 2026 | — |
| Roszdravnadzor submission | Q4 2026 | Docs in progress |
| **DiGA Fast-Track application** | Q1 2027 | Target pathway |
| CE Mark Class IIa preparation | Q1 2027 | Docs ready |
| FDA 510(k) pre-submission | Q2 2027 | Predicate: Sleepio, Somryst |

**Regulatory Strategy:**
```
┌─────────────────────────────────────────────────────────────────┐
│  REGULATORY PATHWAY                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Russia (Roszdravnadzor)                                    │
│     └── Class IIa medical device                               │
│     └── Target: Q4 2026                                        │
│                                                                 │
│  2. Germany (DiGA) ← PRIORITY                                  │
│     └── Fast-Track for digital health apps                     │
│     └── Reimbursement via statutory health insurance           │
│     └── Target: Q1 2027                                        │
│     └── Requirement: Published RCT or pilot data               │
│                                                                 │
│  3. EU (CE Mark)                                               │
│     └── MDR Class IIa                                          │
│     └── Notified Body assessment                               │
│     └── Target: Q2 2027                                        │
│                                                                 │
│  4. USA (FDA 510(k))                                           │
│     └── Predicates: Sleepio (K191716), Somryst (K211351)       │
│     └── Special Controls for CBT-I software                    │
│     └── Target: Q3-Q4 2027                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 6: Market Entry & Scale (2027)

| Market | Pathway | Target | Revenue Model |
|--------|---------|--------|---------------|
| Russia/CIS | Roszdravnadzor Class IIa | Q1 2027 | B2B + Freemium |
| EAEU | Harmonization | Q2 2027 | B2B |
| **Germany** | **DiGA Fast-Track** | **Q1 2027** | **Insurance reimbursement** |
| EU | CE Mark Class IIa | Q2 2027 | B2B + DiGA |
| USA | FDA 510(k) | Q4 2027 | B2B + D2C subscription |

**Monetization Strategy:**
```
┌─────────────────────────────────────────────────────────────────┐
│  REVENUE STREAMS (Nonprofit Model)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. B2B Corporate Wellness (PRIMARY — 2026-2027)               │
│     └── $5-15/employee/month                                   │
│     └── Target: IT, Finance, Industrial                        │
│     └── Pilot: 2-3 companies, 50-200 employees                 │
│                                                                 │
│  2. DiGA Reimbursement (Germany) — 2027                        │
│     └── €200-500/patient/course (typical DiGA pricing)         │
│     └── Statutory health insurance coverage                    │
│                                                                 │
│  3. Freemium D2C — 2027+                                       │
│     └── Free: Breathing, basic diary                           │
│     └── Premium: Full CBT-I, AI recommendations                │
│     └── $9.99/month or $79/year                                │
│                                                                 │
│  4. Grants & Foundation Funding — Ongoing                      │
│     └── РНФ, РФФИ, Фонд Потанина                               │
│     └── EU Horizon Europe                                      │
│     └── US SBIR/STTR (post-FDA)                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 7: Advanced Features (2027+)

| Feature | Priority | Status | Rationale |
|---------|----------|--------|-----------|
| **GAMBITTS (Thompson + LLM)** | **High** | Research done | [arxiv 2505.16311](https://arxiv.org/abs/2505.16311) — first-in-world for CBT-I |
| **SleepFM Fine-tuning** | **High** | Not started | [Nature Medicine 2025](https://www.nature.com/articles/s41591-025-04133-4) — 500K hours PSG |
| **DML-TS-NNR Bandits** | Medium | Not started | Robust contextual bandits for mHealth |
| **Federated Learning** | **High** | Not started | Privacy-preserving personalization (GDPR) |
| LLM-therapist (RAG-based) | Medium | Not started | Personalization at scale |
| Genetic profiling (PER3/CLOCK) | Low | Research done | Chronotype precision |
| N-of-1 Adaptive Trials | Medium | Not started | Personalized evidence |
| Voice Biomarkers | Medium | Research done | Passive assessment |

**Breakthrough Technologies (2025-2026):**

| Technology | Description | SleepCore Status |
|------------|-------------|------------------|
| **GAMBITTS** | Thompson Sampling + LLM for adaptive interventions | ✅ Can implement (have Thompson + RAG) |
| **SleepFM** | Foundation model, 130 conditions, C-Index 0.75+ | 🔜 Await public release or partnership |
| **DML-TS-NNR** | Debiased ML bandits with network regularization | 🔜 Upgrade from current Thompson |
| **Federated Learning** | On-device ML without centralizing PHI | 🔜 Architecture change needed |

**LLM Integration Principles** (см. CLAUDE.md §20):
- RAG-first: LLM = retrieval layer, NOT content generator
- Deterministic CBT-I content from validated engines
- LLM prohibited: clinical recommendations, diagnosis

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
│  Phase 2: Android Companion App ✅ COMPLETE (2026-02-22)        │
│  ├── Kotlin + Health Connect SDK                                │
│  ├── Samsung Galaxy Watch support                               │
│  ├── Foreground sync (manual)                                   │
│  ├── Telegram bot linking                                       │
│  ├── Offline Sync Queue (Room + WorkManager)                    │
│  ├── Sentry SDK 8.33.0 (HIPAA-compliant PHI scrubbing)          │
│  ├── GDPR Privacy Policy Activity                               │
│  └── 514 tests, 19 test files, 8048 lines of tests              │
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
│  Phase 5: Advanced Metrics (Q3 2026) 🔜                         │
│  ├── SpO2 / Sleep Apnea Screening (FDA K240929)                 │
│  ├── Skin Temperature (circadian rhythm)                        │
│  ├── Breathing Disturbances count                               │
│  └── Samsung accuracy disclaimer (known issues)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Wearable Strategy Roadmap (2026-2027)

**Проблемы (выявлены 2026-02-22):**
1. Token истекает через ~1 час после линковки с Telegram
2. Samsung Health ↔ Health Connect не синхронизирует (известный баг)
3. Проблема затрагивает ВСЕХ производителей, не только Samsung

**Исследование:** Полный обход приложений производителей невозможен для закрытых устройств
из-за проприетарных BLE-протоколов. Но есть альтернативные пути.

#### Фаза 1: Критические исправления (Q1 2026) ✅ COMPLETE

| Задача | Описание | Статус |
|--------|----------|--------|
| **Fix Token Refresh** | Access: 24ч, Refresh: 30 дней, Silent refresh | ✅ Done |
| **Health Connect Diagnostics** | Экран диагностики в Android app | ✅ Done |
| **Инструкции по производителям** | Samsung, Garmin, Xiaomi, Fitbit guides | ✅ Done |
| **Fallback на ручной ввод** | Consensus Sleep Diary (CSD) ручной ввод | ✅ Done |

#### Фаза 2: Multi-Device Support (Q2 2026) 🟡

| Задача | Описание | Приоритет | Статус |
|--------|----------|-----------|--------|
| **Open Wearables API** | MIT-licensed, 200+ устройств, self-hosted | 🟡 High | ✅ Core done |
| **Colmi R02 Ring** | $20, прямой BLE, open-source, PPG/SpO2 | 🟡 High | 🔜 |
| **Multi-device fusion** | Объединение данных с нескольких устройств | 🟡 High | ✅ Core done |
| **Gadgetbridge интеграция** | Mi Band, Amazfit без облака | 🟢 Medium | 🔜 |

#### Фаза 3: Standards & Compliance (Q3 2026) 🟡

| Задача | Описание | Приоритет |
|--------|----------|-----------|
| **FHIR Export** | Стандартный формат для клиник/врачей (EHDS) | 🟡 High |
| **EU Data Act подготовка** | Сентябрь 2025: производители ОБЯЗАНЫ открыть API | 🟡 High |
| **IEEE 11073 PHD support** | Медицинские устройства стандарт | 🟢 Medium |
| **Offline-first sync** | Работа без интернета, очередь синхронизации | 🟡 High |

#### Фаза 4: Open Hardware (Q4 2026) 🟢

| Задача | Описание | Приоритет |
|--------|----------|-----------|
| **PineTime/InfiniTime** | $27 open-source часы, полный контроль | 🟢 Medium |
| **Bangle.js integration** | JavaScript-программируемые часы | 🟢 Medium |
| **Open Ring support** | MIT-licensed smart ring, research-grade | 🟢 Medium |

#### Фаза 5: iOS & Advanced (2027) 🟢

| Задача | Описание | Приоритет |
|--------|----------|-----------|
| **iOS Companion App** | HealthKit интеграция для iPhone | 🟡 High |
| **Federated Learning** | ML на устройстве, без централизации PHI | 🟢 Medium |
| **Real-time streaming** | Continuous data от часов | 🟢 Medium |

#### Фаза 6: Future Tech (2027+) 🔮

| Задача | Описание | Приоритет |
|--------|----------|-----------|
| **Blockchain consent (ZKP)** | Zero-Knowledge Proofs для privacy | 🟢 Low |
| **Self-sovereign identity** | DID — пользователь владеет данными | 🟢 Low |
| **Custom firmware** | Собственная прошивка для партнёров | 🟢 Low |

#### Визуализация стратегии

```
2026 Q1          Q2              Q3              Q4          2027
  │               │               │               │
  ▼               ▼               ▼               ▼
┌─────────────────┐
│ 🔴 CRITICAL     │
│ Token Refresh   │
│ Diagnostics     │
│ Producer Guides │
└────────┬────────┘
         │
         ▼
      ┌──────────────────┐
      │ 🟡 MULTI-DEVICE  │
      │ Open Wearables   │
      │ Colmi R02        │
      │ Multi-fusion     │
      └────────┬─────────┘
               │
               ▼  ← EU Data Act (Sept 2025)
            ┌─────────────────────┐
            │ 🟡 STANDARDS        │
            │ FHIR Export         │
            │ IEEE 11073          │
            │ Offline-first       │
            └──────────┬──────────┘
                       │
                       ▼
                  ┌─────────────────┐
                  │ 🟢 OPEN HW      │
                  │ PineTime        │
                  │ Bangle.js       │
                  └────────┬────────┘
                           │
                           ▼
                      ┌─────────────────┐
                      │ 🟢 iOS + ML     │
                      │ HealthKit       │
                      │ Federated Learn │
                      └────────┬────────┘
                               │
                               ▼
                          ┌─────────────────┐
                          │ 🔮 FUTURE       │
                          │ Blockchain/ZKP  │
                          │ Custom Firmware │
                          └─────────────────┘
```

#### Поддерживаемые производители (план)

| Производитель | Путь данных | Статус | Fallback |
|---------------|-------------|--------|----------|
| Samsung | Samsung Health → Health Connect | ✅ + ⚠️ баги | Ручной ввод |
| Garmin | Garmin Connect → Health Connect | 🔜 Q2 2026 | OAuth API |
| Fitbit | Fitbit → Health Connect | 🔜 Q2 2026 | OAuth API |
| Xiaomi | Mi Fitness → Health Connect | 🔜 Q2 2026 | Gadgetbridge |
| Huawei | Huawei Health → Health Connect | 🔜 Q3 2026 | Health Sync app |
| Polar | Polar Flow → Health Connect | 🔜 Q2 2026 | Direct BLE |
| Apple | HealthKit (iOS only) | 🔜 2027 | iOS App required |
| **Open Hardware** | Direct BLE | 🔜 Q4 2026 | — |

#### Ключевые технологии

| Технология | Что даёт | Когда |
|------------|----------|-------|
| **Open Wearables API** | 200+ устройств через один API, MIT license | Q2 2026 |
| **EU Data Act** | Законодательное требование открыть API | Sept 2025 |
| **FHIR** | Стандарт для клинической интеграции | Q3 2026 |
| **Federated Learning** | Privacy-preserving ML | 2027 |
| **ZKP (Zero-Knowledge Proofs)** | Доказательство здоровья без раскрытия данных | 2027+ |

#### Исследовательские ресурсы

- [Open Wearables](https://www.openwearables.io/) — MIT-licensed API
- [Gadgetbridge](https://gadgetbridge.org/) — Open-source Android app
- [PineTime/InfiniTime](https://infinitime.io/) — Open-source smartwatch
- [Colmi R02 Client](https://github.com/tahnok/colmi_r02_client) — Python BLE client
- [EU Data Act](https://digital-strategy.ec.europa.eu/en/policies/data-act) — Regulatory framework

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

### Команда (текущая + потребность)

| Роль | Текущий FTE | Потребность | Фаза |
|------|-------------|-------------|------|
| Tech Lead / Backend | 1 | 1 | All |
| Mobile Developer | 0.5 | 1 | Phase 4+ |
| Frontend (Web App) | 0 | 1 | Phase 4b |
| QA Engineer | 0.5 | 0.5 | All |
| Clinical Advisor | 0.2 | 0.5 | Phase 4-5 |
| Data Scientist | 0 | 0.5 | Phase 4-5 |
| Product Manager | 0.5 | 0.5 | All |
| **Clinical Coordinator** | 0 | **1** | **Phase 4** |

### Бюджет (детализированный)

| Фаза | Категория | Оценка | Источник |
|------|-----------|--------|----------|
| Phase 4 | Pilot RCT (n=100) | $40-60K | Grant + Foundation |
| Phase 4 | ├── Participant compensation | $10-15K | — |
| Phase 4 | ├── Clinical coordinator | $15-20K | — |
| Phase 4 | └── Data analysis, statistics | $5-10K | — |
| Phase 4b | Web App development | $20-30K | Foundation |
| Phase 5 | RCT publication | $5-10K | Grant |
| Phase 5 | Regulatory submissions | $30-50K | Grant + Investment |
| Phase 6 | Market launch | $50-100K | B2B revenue + Grant |
| **TOTAL Phase 4-6** | | **$145-250K** | |

### Источники финансирования

| Источник | Тип | Сумма | Статус |
|----------|-----|-------|--------|
| Фонд "Другой путь" | Foundation | — | Active |
| **РНФ (Российский научный фонд)** | Grant | до 6М ₽/год | 🔜 Application |
| РФФИ | Grant | до 3М ₽ | 🔜 Application |
| Фонд Потанина | Grant | до 2М ₽ | 🔜 Application |
| EU Horizon Europe | Grant | €150-500K | Post-DiGA |
| B2B Corporate pilots | Revenue | $5-15/emp/mo | Phase 4b |
| Impact Investing | Equity-free | $50-100K | Phase 5+ |

**Grant Strategy:**
- Q2 2026: РНФ application (медицинские исследования)
- Q3 2026: Фонд Потанина (социальный проект)
- Q1 2027: EU Horizon (digital health / DiGA track)

---

## Метрики успеха

### Технические KPI

| Метрика | Текущее | Цель (пилот) | Цель (продакшн) |
|---------|---------|--------------|------------------|
| Test coverage | 84.97% | 80% ✅ | 85% ✅ |
| Bot Services coverage | 82.78% | 80% ✅ | 90% |
| Количество тестов | 8752+ | 5000+ ✅ | 10000+ |
| **Platform coverage** | TG + VK | TG + VK + Web | All + iOS/Android |

### Клинические KPI (Pilot RCT)

| Метрика | Target | Baseline | Clinically Significant |
|---------|--------|----------|------------------------|
| ISI reduction | ≥ 7 points | — | Yes (Morin et al.) |
| Remission rate (ISI ≤ 7) | ≥ 50% | — | Yes |
| Effect size (Cohen's d) | d ≥ 0.8 | — | Large effect |
| **8-week completion** | **≥ 70%** | — | Engagement threshold |
| Adverse events | < 5% | — | Safety |
| Dropout rate | < 30% | — | Retention |

### Regulatory KPI

| Метрика | Target Date | Status |
|---------|-------------|--------|
| Roszdravnadzor submission | Q4 2026 | Docs in progress |
| DiGA application | Q1 2027 | After RCT |
| CE Mark Class IIa | Q2 2027 | After DiGA |
| FDA 510(k) submission | Q4 2027 | Predicate research done |

### B2B/Business KPI

| Метрика | Target | Phase |
|---------|--------|-------|
| Corporate pilots | 2-3 companies | Phase 4b |
| Pilot employees | 100-200 | Phase 4b |
| Employee completion rate | ≥ 60% | Phase 4b |
| B2B MRR | $5-10K | Phase 6 |

### Продуктовые KPI (D2C)

| Метрика | Target | Phase |
|---------|--------|-------|
| DAU/MAU | > 30% | Phase 6+ |
| NPS | > 50 | Phase 6+ |
| Conversion (freemium) | 5-8% | Phase 6+ |
| **CSAT (satisfaction)** | **> 4.5/5** | **Phase 4+** |

### Impact KPI (Nonprofit Mission)

| Метрика | Target | Phase |
|---------|--------|-------|
| Users treated (free tier) | 10,000+ | Phase 6 |
| ISI improvement (population avg) | ≥ 5 points | Phase 6+ |
| **Academic citations** | ≥ 10 | Phase 5+ |
| **Media coverage** | 5+ publications | Phase 5+ |

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

### 2026-03-09 — Architecture Audit & Strategy Update (v4.5)
- 🔍 **Full architecture audit** completed vs global DTx trends 2025-2026
- 📊 **Competitive analysis** added: SleepCore vs Sleepio/Somryst
- 🎯 **Feature Activation Strategy** section added — phased AI enablement
- 🔬 **Breakthrough technologies** added to Phase 7: GAMBITTS, SleepFM, DML-TS-NNR
- ⚠️ **TCM/Ayurveda** marked as experimental (weak evidence base)
- 📦 **CogniCore status** clarified: Thompson ACTIVE, PLRNN/Causal STAGED
- 📈 **Key finding**: Technologically 2-3 years ahead of competitors, clinically requires RCT

### 2026-02-23 — Open Wearables API Integration (v4.4)
- 🔌 **Open Wearables API** integration implemented (200+ wearable devices)
- 📦 **OpenWearablesClient**: HTTP client with retry, timeout, rate limiting
- 🔄 **OpenWearablesAdapter**: Data normalization for 20+ providers
- 🔗 **OpenWearablesService**: High-level orchestration with caching and fusion
- 🧪 **47 new tests** for Open Wearables module
- 📊 **Multi-source fusion**: Automatic data merging from multiple devices
- 🎯 **Provider quality scores**: Confidence-based prioritization (Oura 0.95, WHOOP 0.92, Garmin 0.88)
- 🔬 **Scientific validation**: Based on 2024-2025 HRV validation studies

### 2026-02-22 — Wearable Strategy Phase 1 Complete (v4.3)
- ✅ **Phase 1 COMPLETE**: All critical wearable fixes implemented
- 📱 **Manufacturer Setup Guides**: Samsung, Garmin, Xiaomi, Fitbit instructions with auto-detection
- 📝 **Manual Sleep Diary Fallback**: Consensus Sleep Diary (Carney et al., 2012) format
- 🗄️ **Room Database v3**: ManualDiaryEntity with offline-first sync
- 🎨 **Progressive Disclosure UX**: 3-step form (Timing → Quality → Review)
- ⚠️ **TIB ≥ 5h safety validation** per SleepCore clinical constraints
- 📊 **SE/TST preview calculations** before save
- 🌍 **Localization**: EN/RU strings for all new screens

### 2026-02-22 — Wearable Strategy Roadmap (v4.2)
- 🗺️ **Wearable Strategy Roadmap** added: 6-phase plan through 2027+
- 🔍 **Deep research completed**: breakthrough technologies for wearable data access
- 🔴 **Critical issues identified**: Token expiration (~1h), Samsung Health sync bugs
- 🌐 **Multi-manufacturer analysis**: problems affect ALL vendors, not just Samsung
- 📋 **Technologies evaluated**: Open Wearables API, Colmi R02, PineTime, FHIR, EU Data Act
- ⚖️ **Regulatory insight**: EU Data Act (Sept 2025) will force manufacturers to open APIs
- 🔮 **Future tech mapped**: Federated Learning, Blockchain/ZKP, Self-sovereign identity
- 🔗 Research sources: Open Wearables, Gadgetbridge, InfiniTime, IEEE standards

### 2026-02-22 — Android Companion App Update (v4.1)
- 📱 **Android test coverage**: 514 tests, 19 test files, 8048 lines
- 🔒 **Sentry SDK 8.33.0** integrated with HIPAA-compliant PHI scrubbing
- 📴 **Offline Sync Queue** implemented (Room + WorkManager)
- 📋 **GDPR Privacy Policy Activity** compliant with Health Connect requirements
- 🔬 **Wearable Research** completed: SpO2/Sleep Apnea and Skin Temperature identified as Phase 5
- ⚠️ Samsung Galaxy Watch accuracy issues documented (One UI 8 sleep score bug)
- 🔗 Reference: `reports/WEARABLE_INTEGRATION_RESEARCH_2026-02-19.md`

### 2026-02-16 — STRATEGIC PIVOT (v4.0)
- 🎯 **Strategic analysis**: Russian market = "blue ocean" (no CBT-I competitors)
- 🎯 **TOP-3 priorities defined**: Pilot RCT (n=100), Web App, B2B Pilots
- 📊 Pilot size increased: n=30-50 → **n=100** (statistical power for d≥0.8)
- 💰 **DiGA (Germany) identified as primary regulatory pathway** for EU reimbursement
- 💼 **B2B employer track added** as parallel monetization stream
- 📝 Grant funding sources detailed (РНФ, РФФИ, Фонд Потанина, EU Horizon)
- 🏢 Nonprofit DTx model clarified (Foundation "Другой путь")
- 📈 New KPI sections: Regulatory, B2B, Impact (nonprofit mission)
- 🔗 FDA 510(k) predicates identified: Sleepio (K191716), Somryst (K211351)
- ✅ VK Bot deployment added to P0 priorities

### 2026-02-09
- ✅ Fixed Command → Engine integration: wired 11 orphan commands into main.ts
- ✅ Fixed ChronotypeCommand callback routing (was silently failing)
- ✅ Integrated TCM self-acupressure and Yoga Nidra into /therapy (was orphaned)
- ✅ Added Yoga Nidra safety screening (PubMed 39690521)
- ✅ Full integration audit: NO orphan modules found (17 engines, 29 services, 25 commands)
- ✅ Bot Commands branch coverage: 82.2% (target was 60%)

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

## Риски и митигации

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Pilot recruitment < 100 | Средняя | Multi-platform (TG + VK), clinic partnerships |
| Telegram/VK blocking | Низкая | Web App as fallback, self-hosted |
| Grant rejection | Средняя | Multiple applications, B2B revenue |
| DiGA rejection | Средняя | CE Mark as alternative, improve RCT |
| Team burnout | Средняя | Clear priorities, milestone-based work |

---

*Unified Roadmap v4.5 — Updated 2026-03-09*
*Strategic Pivot: Nonprofit DTx for Russian-speaking "Blue Ocean" market*
*Architecture Audit: Technologically ahead, phased activation strategy adopted*
*Next review: After Pilot RCT (Q3 2026)*
