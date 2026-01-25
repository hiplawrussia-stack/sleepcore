# CLAUDE.md — SleepCore

## Преамбула

SleepCore — AI-powered digital therapeutic (DTx) платформа для лечения хронической бессонницы с использованием доказательной когнитивно-поведенческой терапии (CBT-I). Построена на CogniCore Engine с POMDP-оптимизацией персонализации. Это **медицинское программное обеспечение класса IIa (ЕС) / класса II (FDA)**, каждая строка которого потенциально влияет на здоровье пациентов.

> **Версия**: 1.0.0-alpha.4
> **Целевая классификация**: FDA 510(k), CE Mark Class IIa, DiGA (Germany)
> **Научная база**: European Insomnia Guideline 2023, Spielman et al. 1987, Bootzin 1972, Morin et al. 1993

Этот документ определяет **технические стандарты**, **клинические требования** и **этическую философию** разработки. Он основан на принципах «Конституции Claude» (Anthropic, 2025), адаптированных для контекста цифровой терапии бессонницы.

> «Неправильная калибровка sleep restriction может привести к опасной сонливости,
> ДТП и другим последствиям. Каждое решение системы влияет на безопасность пациента.»
>
> — Принцип разработки БФ «Другой путь»

---

# ЧАСТЬ I: ЭТИЧЕСКИЕ ОСНОВЫ

## 1. Иерархия приоритетов

При принятии любых решений в разработке следуй этой иерархии:

```
┌─────────────────────────────────────────────────────────────┐
│  УРОВЕНЬ 1: БЕЗОПАСНОСТЬ ПОЛЬЗОВАТЕЛЕЙ                      │
│  Физическое и психологическое благополучие превыше всего    │
├─────────────────────────────────────────────────────────────┤
│  УРОВЕНЬ 2: ЭТИЧЕСКИЕ ПРИНЦИПЫ                              │
│  Честность, прозрачность, автономия пользователя            │
├─────────────────────────────────────────────────────────────┤
│  УРОВЕНЬ 3: КЛИНИЧЕСКАЯ ЭФФЕКТИВНОСТЬ                       │
│  Доказательные протоколы, валидированные инструменты        │
├─────────────────────────────────────────────────────────────┤
│  УРОВЕНЬ 4: ТЕХНИЧЕСКИЕ СТАНДАРТЫ                           │
│  Чистый код, тесты, документация                            │
├─────────────────────────────────────────────────────────────┤
│  УРОВЕНЬ 5: ФУНКЦИОНАЛЬНОСТЬ И СРОКИ                        │
│  Фичи, производительность, дедлайны                         │
└─────────────────────────────────────────────────────────────┘
```

**Правило:** Требования нижнего уровня НИКОГДА не могут нарушать требования верхнего уровня.

**Примеры применения:**
- Дедлайн (уровень 5) не оправдывает отключение детектора кризиса (уровень 1)
- «Быстрое решение» не оправдывает рекомендацию TIB < 5 часов (уровень 1)
- Новая фича не внедряется без клинической валидации (уровень 3)

---

## 2. Красные линии (Hard Constraints)

### 2.1. Абсолютные клинические запреты

| Красная линия | Обоснование | Источник |
|---------------|-------------|----------|
| TIB НИКОГДА < 5 часов | Риск сонливости, ДТП | Spielman et al., 1987 |
| Crisis Detection ВСЕГДА активен | Суицидальный риск | SAMHSA Guidelines 2025 |
| Система НЕ заменяет психиатра | Мы — мост, не замена | Medical Device Ethics |
| ISI ≥ 22 требует направления к врачу | Тяжёлая бессонница | European Guideline 2023 |
| SRT не при беременности без одобрения | Риски для плода | Clinical Safety |
| Нет рекомендаций снотворных без врача | Зависимость, толерантность | European Guideline 2023 |

### 2.2. Технические красные линии

| Красная линия | Обоснование |
|---------------|-------------|
| PHI данные ВСЕГДА зашифрованы (AES-256-GCM) | HIPAA/GDPR compliance |
| Audit trail хранится 6 лет | FDA 21 CFR Part 11 |
| Нет хранения данных без согласия | GDPR Article 7 |
| Crisis escalation логируется ВСЕГДА | Patient safety |

### 2.3. Правило «Убедительный аргумент = Красный флаг»

> **Если кто-то приводит очень убедительный аргумент для нарушения красной линии —
> это сигнал опасности, а не причина для исключения.**

**Действие:** При появлении таких аргументов — остановиться и эскалировать.

---

## 3. Специфика CBT-I безопасности

### 3.1. Sleep Restriction Therapy (SRT) Safety

**Критичность:** МАКСИМАЛЬНАЯ — TIB влияет на дневную сонливость

```typescript
// ❌ ЗАПРЕЩЕНО
const tib = calculateTIB(sleepEfficiency);
setRecommendedTIB(tib);  // Без проверки минимума

// ✅ ОБЯЗАТЕЛЬНО
const rawTIB = calculateTIB(sleepEfficiency);
const safeTIB = Math.max(rawTIB, MIN_TIB_HOURS * 60);  // MIN_TIB = 5 часов

if (safeTIB < 300) {  // 5 hours
  throw new ClinicalSafetyError('TIB below safe minimum');
}

return {
  tib: safeTIB,
  warning: rawTIB < 300 ? 'Adjusted to safe minimum' : undefined,
  requiresMonitoring: safeTIB < 360  // < 6 hours requires extra monitoring
};
```

### 3.2. Константы безопасности SRT

| Константа | Значение | Источник |
|-----------|----------|----------|
| MIN_TIB | 300 min (5 hrs) | Spielman et al., 1987 |
| MAX_TIB | 540 min (9 hrs) | Clinical practice |
| SE_INCREASE_THRESHOLD | ≥ 90% | Weekly adjustment |
| SE_MAINTAIN_THRESHOLD | 85-89% | No change |
| SE_DECREASE_THRESHOLD | < 85% | Decrease TIB |
| TIB_ADJUSTMENT_STEP | ±15 min | Weekly increment |
| WAKE_TIME_TOLERANCE | ±15 min | Adherence calculation |

### 3.3. Crisis Detection Safety

**Критичность:** МАКСИМАЛЬНАЯ — суицидальный риск

```typescript
// 3-уровневая система детекции кризиса (Columbia-SSRS inspired)

interface CrisisDetection {
  // Level 1: Keyword Detection
  keywordFlags: string[];  // 'хочу умереть', 'не хочу жить', etc.

  // Level 2: Pattern Analysis
  behavioralPatterns: {
    suddenImprovement: boolean;  // Dangerous sign
    socialWithdrawal: boolean;
    sleepDeteriorationRate: number;
  };

  // Level 3: Contextual Risk
  riskFactors: {
    isiScore: number;  // ≥ 22 = high risk
    comorbidDepression: boolean;
    previousAttempts: boolean;
  };
}

// НИКОГДА не отключается
const CRISIS_DETECTION_ALWAYS_ON = true;
```

### 3.4. Escalation Protocol

```typescript
enum CrisisLevel {
  NONE = 0,
  MONITORING = 1,      // Increased check-ins
  CONCERN = 2,         // Prompt for professional help
  URGENT = 3,          // Immediate resources, SAMHSA hotline
  EMERGENCY = 4        // Direct escalation to emergency contacts
}

// Emergency contacts MUST be configured
// ADMIN_USER_IDS environment variable REQUIRED
```

---

## 4. Доказательная база

### 4.1. CBT-I 5-Component Protocol (Обязательный)

| Компонент | Движок | Источник | Эффект (d) |
|-----------|--------|----------|------------|
| **Sleep Restriction (SRT)** | SleepRestrictionEngine | Spielman et al., 1987 | 0.45 |
| **Stimulus Control (SCT)** | StimulusControlEngine | Bootzin, 1972 | 0.41 |
| **Cognitive Restructuring** | CognitiveRestructuringEngine | Beck, 1979; Morin | 0.32 |
| **Sleep Hygiene (SHE)** | SleepHygieneEngine | Hauri, 1977 | 0.12* |
| **Relaxation Training** | RelaxationEngine | Jacobson, 1938 | 0.28 |
| **Multicomponent CBT-I** | CBTIEngine | Meta-analysis | **0.84** |

*SHE alone NOT sufficient for chronic insomnia (European Guideline 2023)

### 4.2. Third-Wave Therapies (Дополнительные)

| Терапия | Движок | Показание | Эффект (d) |
|---------|--------|-----------|------------|
| **MBT-I** | MBTIEngine | High arousal, sleep effort | 1.32 |
| **ACT-I** | ACTIEngine | Catastrophizing, avoidance | 0.68 |
| **MCT** | MCTEngine | Rumination, worry | 0.54 |

**Selection Logic (ThirdWaveCoordinator):**
- High pre-sleep arousal → MBT-I
- Catastrophizing/helplessness → ACT-I
- Rumination/metacognitive beliefs → MCT
- CBT-I non-responders (20-40%) → Third-wave priority

### 4.3. Клинические цели (Clinical Targets)

| Метрика | Цель | MCID | Источник |
|---------|------|------|----------|
| **ISI Score** | ≤ 7 (ремиссия) | 6 points | Morin et al., 2011 |
| **Sleep Efficiency** | ≥ 85% | +10% | Clinical standard |
| **SOL** | < 20 min | -10 min | European Guideline |
| **WASO** | < 30 min | -15 min | European Guideline |
| **Response** | ≥ 8 pt ISI drop | - | Bastien et al., 2001 |

### 4.4. ISI Russian Validation

**Инструмент:** Insomnia Severity Index (7 items, 0-28)
**Валидация:** Danilenko K.V., 2011, Sechenov Moscow Medical Academy
**Психометрика:**
- Cronbach's α = 0.77
- Sensitivity = 90.2%
- Specificity = 95.2%
- Cutoff = 8 (subthreshold)

```typescript
// ISI Severity Classification
enum ISISeverity {
  NONE = 'none',           // 0-7
  SUBTHRESHOLD = 'subthreshold',  // 8-14
  MODERATE = 'moderate',   // 15-21
  SEVERE = 'severe'        // 22-28 → REQUIRES SPECIALIST REFERRAL
}
```

---

## 5. Культурные адаптации

### 5.1. TCM Integration (Traditional Chinese Medicine)

**Источники:**
- 36 SR/MAs on TCM for insomnia (Umbrella review 2025)
- Tai Chi RCT: Non-inferior to CBT-I at 15 months (Hong Kong 2025)

**TCM Insomnia Patterns (证型):**
1. Heart-Spleen Deficiency (心脾两虚) — Most common
2. Heart-Kidney Disharmony (心肾不交)
3. Liver Fire Disturbs Heart (肝火扰心)
4. Phlegm-Heat Disturbs Heart (痰热扰心)
5. Yin Deficiency Fire (阴虚火旺)

**Evidence-Based Herbal Formulas:**
- Suanzaoren Tang (酸枣仁汤) — HIGH evidence
- Guipi Tang (归脾汤) — HIGH evidence

### 5.2. Ayurveda & Yoga Nidra Integration

**Источники:**
- S-VYASA & Uttarakhand Ayurved University RCT (2023)
- Yoga Nidra: 89% sleep induction rate (Pandi-Perumal, 2022)

**Dosha Types:**
- Vata: Difficulty initiating, fragmented sleep
- Pitta: 2-4 AM waking, vivid dreams
- Kapha: Oversleeping, unrefreshed

**Evidence-Based Herbs:**
- Ashwagandha — HIGH evidence for Vata insomnia
- Brahmi — MODERATE evidence
- Jatamansi — MODERATE evidence

---

# ЧАСТЬ II: ТЕХНИЧЕСКИЕ СТАНДАРТЫ

## 6. Архитектура проекта

### 6.1. Структура директорий

```
src/
├── SleepCoreAPI.ts              # Main facade (entry point)
├── index.ts                     # Public exports
├── assessment/                  # Clinical instruments (ISI, MEQ, MCTQ)
├── cbt-i/                       # 5-component CBT-I engines
│   └── engines/
│       ├── CBTIEngine.ts        # Orchestrator
│       ├── SleepRestrictionEngine.ts
│       ├── StimulusControlEngine.ts
│       ├── CognitiveRestructuringEngine.ts
│       ├── SleepHygieneEngine.ts
│       └── RelaxationEngine.ts
├── circadian/                   # Chronotype & rhythm (CircadianAI)
├── cultural-adaptations/        # TCM, Ayurveda integrations
│   └── asia/
│       ├── TCMIntegratedCBTIEngine.ts
│       └── AyurvedaYogaEngine.ts
├── diary/                       # Sleep diary service
├── evidence-base/               # Clinical guidelines (EU 2023)
├── infrastructure/              # Database, security, monitoring
│   └── database/
│       ├── migrations/          # Schema versioning (7 migrations)
│       ├── repositories/        # Data access layer
│       ├── security/            # PHI encryption, audit
│       ├── sqlite/              # Development DB
│       └── postgres/            # Production DB
├── modules/
│   ├── gamification/            # XP, badges, streaks
│   ├── content/                 # Educational content library
│   ├── voice/                   # Voice diary & biomarkers
│   └── adaptive-keyboard/       # Telegram adaptive UI
├── platform/                    # POMDP, Thompson Sampling
│   ├── SleepCorePOMDP.ts        # Local POMDP (deprecated)
│   └── SleepCoreAdapter.ts      # CogniCore integration
├── sleep/                       # Sleep state models
├── third-wave/                  # MBT-I, ACT-I, MCT engines
│   ├── MBTIEngine.ts
│   ├── ACTIEngine.ts
│   ├── MCTEngine.ts
│   └── ThirdWaveCoordinator.ts
└── bot/                         # Telegram bot services
    ├── commands/                # 25 bot commands
    └── services/                # Crisis, proactive, prediction
```

### 6.2. Ключевые архитектурные решения

| Решение | Выбор | Обоснование |
|---------|-------|-------------|
| Bot Framework | Grammy | Production-ready Telegram, middleware support |
| Database (Dev) | SQLite | Fast, embedded, in-memory testing |
| Database (Prod) | PostgreSQL | HIPAA-ready, scalable |
| AI/ML Platform | CogniCore Engine | POMDP, Thompson Sampling, Digital Twin |
| State Management | POMDP Belief State | Optimal intervention under uncertainty |
| Encryption | AES-256-GCM | HIPAA/GDPR compliance |
| Monitoring | Sentry | HIPAA-compliant scrubbing |

### 6.3. CogniCore Engine Integration

**Package:** @cognicore/engine v2.0.0-phase1 (local)

**Exported Modules:**
- `state` — State management
- `belief` — Bayesian belief tracking
- `temporal` — Time series analysis
- `mirror` — Digital Twin (PLRNN)
- `intervention` — Thompson Sampling selection
- `safety` — Safety rules, crisis detection
- `explainability` — SHAP-style attribution
- `crisis` — Crisis escalation
- `causal` — Causal inference
- `metacognition` — Self-reflection
- `motivation` — Motivational interviewing

**Integration via SleepCoreAdapter:**
```typescript
// Maps SleepAction → CogniCore IIntervention
const SLEEP_ACTIONS = [
  'adjust_sleep_window',    // SRT
  'enforce_wake_time',      // SRT
  'leave_bed_reminder',     // SCT
  'bed_restriction',        // SCT
  'challenge_belief',       // CR
  'behavioral_experiment',  // CR
  'caffeine_education',     // SHE
  'environment_advice',     // SHE
  'relaxation_pmr',         // RT
  'relaxation_breathing',   // RT
  'relaxation_imagery',     // RT
  'no_intervention'
];
```

---

## 7. Критичные модули

### 7.1. Safety-Critical Modules (IEC 62304 Class C)

```
⚠️ ИЗМЕНЕНИЯ В ЭТИХ МОДУЛЯХ ТРЕБУЮТ:
   1. Review минимум от 2 человек
   2. 100% покрытия тестами
   3. Обновления risk analysis
   4. Clinical validation где применимо
```

| Модуль | Путь | Критичность |
|--------|------|-------------|
| **Crisis Detection** | src/bot/services/CrisisDetectionService.ts | CRITICAL |
| **Crisis Escalation** | src/bot/services/CrisisEscalationService.ts | CRITICAL |
| **Sleep Restriction** | src/cbt-i/engines/SleepRestrictionEngine.ts | HIGH |
| **ISI Assessment** | src/assessment/instruments/ISIRussian.ts | HIGH |
| **Safety Rules** | CogniCore safety module | CRITICAL |
| **PHI Encryption** | src/infrastructure/database/security/ | HIGH |

### 7.2. Инварианты Safety-Critical модулей

**CrisisDetectionService:**
- 3-level detection ВСЕГДА активен
- Columbia-SSRS inspired keywords
- Behavioral pattern analysis
- НИКОГДА не отключается (даже в тестах)

**SleepRestrictionEngine:**
- MIN_TIB = 300 min (5 hours) — IMMUTABLE
- Weekly adjustment = ±15 min — IMMUTABLE
- SE thresholds (85%, 90%) — VALIDATED

**ISIRussian:**
- 7 items, 0-28 scale — VALIDATED
- Severity cutoffs — FROM RESEARCH
- Subscale calculations — VALIDATED

---

## 8. Тестирование

### 8.1. Текущее покрытие

| Метрика | Значение | Порог |
|---------|----------|-------|
| Statements | 46.45% | 45% ✓ |
| Branches | 39.94% | 40% ⚠️ |
| Functions | 50.32% | 50% ✓ |
| Lines | 46.55% | 45% ✓ |

### 8.2. Покрытие по модулям

| Модуль | Покрытие | Статус |
|--------|----------|--------|
| CBT-I Engines | 98.59% | Отлично |
| Assessment | 98.9% | Отлично |
| Circadian | 100% | Отлично |
| Third-Wave | 94.67% | Отлично |
| Platform | 99.1% | Отлично |
| Gamification | 82.94% | Хорошо |
| **Bot Services** | **0.93%** | **КРИТИЧНО** |
| **Bot Adapters** | **0%** | **КРИТИЧНО** |

### 8.3. Типы тестов

```bash
npm test                    # All tests
npm run test:coverage       # With coverage
npm test -- path/to/test    # Single file
npm test -- --watch         # Watch mode
```

**Test Distribution:**
- Unit Tests: 50 files
- Integration Tests: 6 files (modules)
- E2E Tests: 4 files (Playwright)
- Smoke Tests: 1 file (25 commands)

### 8.4. Требования к тестам для Safety-Critical

```
□ Unit тесты для каждой функции
□ Edge cases покрыты (boundaries)
□ Negative cases (invalid input)
□ Integration с реальной БД (SQLite in-memory)
□ Regression suite для критических путей
```

---

## 9. Регуляторные требования

### 9.1. Классификация устройства

| Рынок | Классификация | Статус |
|-------|---------------|--------|
| **ЕС** | Class IIa | CE Mark target Q1 2027 |
| **США** | Class II | FDA 510(k) target Q4 2027 |
| **Германия** | DiGA | BfArM listing target Q2 2027 |
| **Россия** | Class IIa | Roszdravnadzor Q3 2026 |

**Predicate Devices (510(k)):**
- Somryst (K191716) — Primary
- SleepioRx (2024) — Secondary

### 9.2. Применимые стандарты

| Стандарт | Область | Приоритет |
|----------|---------|-----------|
| IEC 62304 | Жизненный цикл ПО | Обязательный |
| ISO 13485 | СМК медицинских изделий | Обязательный |
| ISO 14971 | Управление рисками | Обязательный |
| EU MDR 2017/745 | Регуляция ЕС | Для CE Mark |
| GDPR | Защита данных | Обязательный |
| HIPAA | PHI protection | Для рынка США |

### 9.3. Data Protection

**GDPR Rights Implementation:**
- Article 15: Right of access ✓
- Article 17: Right to erasure ✓
- Article 20: Data portability ✓
- Article 22: Explanation of decisions ✓

**PHI Encryption:**
- Algorithm: AES-256-GCM
- Key management: Environment variables (→ AWS KMS recommended)
- Audit trail: 6-year retention

---

## 10. Environment Configuration

### 10.1. Required Variables

```bash
# CRITICAL — Bot won't start without these
BOT_TOKEN=<telegram_bot_token>
ADMIN_USER_IDS=<comma_separated_ids>  # Crisis escalation targets
ENCRYPTION_MASTER_KEY=<64_hex_chars>  # PHI encryption

# Database
DATABASE_PATH=./data/sleepcore.db     # SQLite (dev)
DATABASE_URL=postgresql://...          # PostgreSQL (prod)

# Monitoring
SENTRY_DSN=<sentry_dsn>               # Error tracking
NODE_ENV=development|production
```

### 10.2. Optional Variables

```bash
SENTRY_TRACES_SAMPLE_RATE=0.2         # Performance tracing
OPENAI_API_KEY=<key>                  # Voice transcription
HEALTH_PORT=3002                      # Health check endpoint
```

---

## 11. Deployment

### 11.1. Docker Stack

```yaml
# Production architecture
Traefik v3 (Reverse Proxy, SSL)
    ├── Bot Service (port 3000)
    ├── API Service (port 3001)
    ├── Mini App (Nginx)
    └── PostgreSQL (port 5432)
```

### 11.2. Deployment Checklist

```
□ ADMIN_USER_IDS configured and tested
□ ENCRYPTION_MASTER_KEY securely stored
□ BACKUP_ENCRYPTION_KEY separate from master
□ Health checks passing
□ SSL certificates valid
□ Database backups scheduled
□ Sentry configured with PHI scrubbing
□ Crisis escalation contacts verified
```

---

## 12. Development Process

### 12.1. Обязательный процесс для Safety-Critical

```
ИССЛЕДОВАНИЕ → АРХИТЕКТУРА → РЕАЛИЗАЦИЯ → REVIEW → ТЕСТЫ → DEPLOY
     ↑                                                    |
     └──────────────── Regression Testing ───────────────┘
```

### 12.2. Commit Checklist

```
КЛИНИЧЕСКАЯ БЕЗОПАСНОСТЬ
□ TIB минимум соблюдён (5 часов)?
□ Crisis detection не затронут?
□ ISI cutoffs не изменены?
□ Safety rules активны?

КОД
□ TypeScript strict mode?
□ Нет any types?
□ JSDoc для public API?
□ Научные источники указаны?

ТЕСТЫ
□ Unit тесты написаны?
□ Edge cases покрыты?
□ Тесты проходят: npm test?

БЕЗОПАСНОСТЬ
□ PHI зашифровано?
□ Audit trail обновлён?
□ Нет hardcoded secrets?
```

---

## 13. Научные источники

### 13.1. CBT-I Foundation

| Источник | Применение |
|----------|------------|
| Spielman et al., 1987 | Sleep Restriction Therapy |
| Bootzin, 1972 | Stimulus Control |
| Beck, 1979 | Cognitive Restructuring |
| Morin et al., 1993 | ISI development |
| Hauri, 1977 | Sleep Hygiene |
| Jacobson, 1938 | Progressive Muscle Relaxation |

### 13.2. Third-Wave Therapies

| Источник | Применение |
|----------|------------|
| Ong et al., 2014 | MBT-I 8-week protocol |
| Dalrymple et al., 2010 | ACT-I protocol |
| Meadows et al., 2024 | "The Sleep Book" ACT approach |
| Wells, 2000 | Metacognitive Therapy |

### 13.3. Guidelines & Meta-analyses

| Источник | Применение |
|----------|------------|
| Riemann et al., 2023 | European Insomnia Guideline |
| Steinmetz et al., 2022-2023 | Network meta-analysis |
| Trauer et al., 2015 | 9,475 participant meta-analysis |
| Bastien et al., 2001 | ISI validation |

### 13.4. AI/ML

| Источник | Применение |
|----------|------------|
| Kaelbling et al., 1998 | POMDP framework |
| Russo et al., 2018 | Thompson Sampling |
| Durstewitz, 2018+ | PLRNN (Digital Twin) |
| Anthropic, 2025 | Constitutional AI |

---

## 14. Эскалация и поддержка

### 14.1. Когда эскалировать

| Ситуация | Действие |
|----------|----------|
| Crisis detection trigger | Немедленная эскалация к ADMIN_USER_IDS |
| ISI ≥ 22 (severe) | Направление к специалисту |
| TIB adjustment below 5h | Блокировка, review |
| Safety module changes | Обязательный 2-person review |
| PHI breach suspected | Немедленная эскалация + audit |

### 14.2. Контакты

- **Технические вопросы**: tech@awfond.ru
- **Клинические вопросы**: Согласовать с медицинским советником
- **Safety-критичные вопросы**: Немедленная эскалация

---

## 15. Финальное напоминание

> Мы создаём цифровую терапию для людей с хронической бессонницей.
>
> Неправильная калибровка sleep restriction может привести к сонливости за рулём.
> Пропущенный кризис может привести к трагедии.
> Переоценка эффективности может отсрочить обращение к психиатру.
>
> Каждое решение, которое мы принимаем, влияет на чью-то жизнь.
> Это не преувеличение — это наша ответственность.

---

*Версия: 1.0 | Дата: Январь 2026 | БФ «Другой путь»*
*Основано на принципах «Конституции Claude» (Anthropic, 2025)*
*Клиническая база: European Insomnia Guideline 2023, Spielman et al. 1987*
