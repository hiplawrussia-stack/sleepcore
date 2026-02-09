# SleepCore — Полный статус проекта

**Версия документа:** 1.2
**Дата:** Февраль 2026 (обновлено 2026-02-09)
**Продукт:** SleepCore v1.0.0-alpha.4
**Тип:** AI-powered цифровая терапия (DTx) хронической бессонницы

---

## Часть I: Технологический стэк

### 1. Языки программирования

| Язык | Использование | Версия |
|------|---------------|--------|
| **TypeScript** | Основной язык всего проекта (бот, API, mini-app, движки, тесты) | 5.3+ (strict mode) |
| **SQL** | Миграции БД, запросы | SQLite / PostgreSQL |
| **HTML/CSS** | Mini App (Telegram Web App) | HTML5, Tailwind CSS 3.4.16 |
| **YAML** | CI/CD, Docker Compose, конфигурации | GitHub Actions |
| **Dockerfile** | Контейнеризация | Multi-stage Alpine 20 |

> Весь проект — монорепозиторий на TypeScript. Других серверных языков нет.

### 2. Структура монорепозитория

```
sleepcore/
├── src/                        # Основное приложение (Telegram Bot + платформа)
│   ├── bot/                    # Telegram Bot (Grammy)
│   │   ├── commands/           # 25 команд
│   │   └── services/           # 29 сервисов
│   ├── cbt-i/                  # 5-компонентная CBT-I система
│   ├── third-wave/             # MBT-I, ACT-I, MCT движки
│   ├── assessment/             # ISI, MEQ, MCTQ инструменты
│   ├── circadian/              # Хронотип и циркадные ритмы
│   ├── sleep/                  # Модели состояния сна, PAT, фенотипирование
│   ├── wearable/               # Health Connect интеграция (NEW 2026-02-07)
│   ├── cultural-adaptations/   # TCM, Ayurveda интеграции
│   ├── platform/               # POMDP, Thompson Sampling, CogniCore адаптер
│   ├── modules/                # Геймификация, контент, голос, клавиатура
│   ├── infrastructure/         # БД, шифрование, мониторинг
│   └── evidence-base/          # Клинические гайдлайны
├── api/                        # REST API (Hono)
├── mini-app/                   # Telegram Mini App (React)
├── packages/
│   └── cognicore-engine/       # CogniCore Engine v2.0.0-phase1 (local package)
├── android-companion/          # Android Companion App (Kotlin/Compose) — NEW 2026-02-08
├── deploy/                     # Docker Compose конфигурации
├── tests/                      # Unit, Integration, E2E тесты
├── docs/                       # Документация (регуляторная, бизнес, исследования)
└── .github/workflows/          # CI/CD пайплайны
```

### 3. Фреймворки и ключевые библиотеки

#### 3.1 Backend — Telegram Bot

| Компонент | Технология | Версия | Назначение |
|-----------|-----------|--------|------------|
| Bot Framework | **Grammy** | 1.38.4 | Telegram Bot API (middleware, sessions, conversations) |
| Grammy Plugins | auto-retry, hydrate, parse-mode, conversations, runner | 2.x | Расширения бота |
| Планировщик | **node-cron** | 4.2.1 | Напоминания, ISI-рассылки |
| Валидация | **Zod** | 3.25.76 | Схемы данных |
| Переменные | **dotenv** | 17.2.3 | Конфигурация окружения |

#### 3.2 Backend — REST API

| Компонент | Технология | Версия | Назначение |
|-----------|-----------|--------|------------|
| Web Framework | **Hono** | 4.6.0 | Легковесный API (альтернатива Express) |
| Валидация | **@hono/zod-validator** | 0.4.0 | Валидация запросов |
| ORM | **Drizzle ORM** | 0.36.0 | Типизированные запросы к БД |
| Авторизация | **jose** | 5.9.0 | JWT обработка |
| ID генерация | **nanoid** | 5.0.0 | Уникальные ID |

#### 3.3 Frontend — Mini App (Telegram Web App)

| Компонент | Технология | Версия | Назначение |
|-----------|-----------|--------|------------|
| UI | **React** | 18.3.1 | Компоненты интерфейса |
| Bundler | **Vite** | 6.0.3 | Сборка и HMR |
| State | **Zustand** | 5.0.2 | Глобальное состояние |
| Роутинг | **React Router** | 6.28.0 | Навигация |
| Data Fetching | **TanStack Query** | 5.90.12 | Кеширование API |
| Анимации | **Motion** | 11.15.0 | UI анимации |
| Стили | **Tailwind CSS** | 3.4.16 | Utility CSS |
| Telegram SDK | **@twa-dev/sdk** | 7.10.0 | Нативная интеграция |

#### 3.4 AI/ML платформа

| Компонент | Технология | Назначение |
|-----------|-----------|------------|
| **CogniCore Engine** | Локальный пакет v2.0.0-phase1 | POMDP, Thompson Sampling, Digital Twin |
| POMDP | Partially Observable Markov Decision Process | Персонализация лечения под неопределённостью |
| Thompson Sampling | Bayesian Optimization | Выбор оптимальных интервенций |
| PLRNN | Piecewise Linear RNN | Предиктивная модель сна (Digital Twin) |
| PAT | Pretrained Actigraphy Transformer | Фенотипирование по актиграфии |
| Safety Module | Rule-based + ML | Детекция кризисов (3-уровневая) |
| Causal Inference | Causal Discovery | Причинно-следственные инсайты |
| Explainability | SHAP-style | Объяснимость решений AI |

### 4. Базы данных

| БД | Драйвер | Версия | Использование |
|----|---------|--------|--------------|
| **SQLite** | better-sqlite3 | 11.6.0 | Разработка, тестирование (in-memory) |
| **PostgreSQL** | pg | 8.13.1 | Продакшн |
| Drizzle ORM | drizzle-orm | 0.36.0 | Типизированные запросы (API) |

**Миграции БД (8 штук):**
1. Начальная схема (users, sessions, diary, ISI, therapy)
2. Сессии терапии
3. Культурные адаптации (TCM/Ayurveda)
4. Grammy сессии бота
5. Геймификация (XP, бейджи, стрики)
6. Голосовой дневник
7. Аудит-метаданные
8. Нежелательные явления

### 5. Шифрование и безопасность

| Компонент | Технология | Назначение |
|-----------|-----------|------------|
| PHI Encryption | **AES-256-GCM** | Шифрование персональных данных здоровья |
| Key Management | Env variables (→ AWS KMS) | Управление ключами шифрования |
| Key Derivation | **PBKDF2** | Производные ключи |
| Audit Trail | Автологирование | 6-летнее хранение (FDA 21 CFR Part 11) |

### 6. Мониторинг и Error Tracking

| Компонент | Технология | Версия | Назначение |
|-----------|-----------|--------|------------|
| Error Tracking | **Sentry** | @sentry/node 10.32.1 | Ошибки с PHI-scrubbing |
| Profiling | **@sentry/profiling-node** | 10.32.1 | Производительность |
| Health Checks | HTTP endpoint | port 3002 | Проверка состояния сервисов |

### 7. Тестирование

| Инструмент | Версия | Использование |
|------------|--------|--------------|
| **Jest** | 29.7.0 | Unit и Integration тесты (основной проект) |
| **ts-jest** | 29.1.2 | TypeScript поддержка для Jest |
| **Vitest** | 2.1.8 | Unit тесты (API, Mini App) |
| **Playwright** | 1.49.0 | E2E тесты |
| **Testing Library** | React 16.3.1, DOM 10.4.1 | Тесты React компонентов |

### 8. CI/CD

| Компонент | Технология | Назначение |
|-----------|-----------|------------|
| CI | **GitHub Actions** | Lint, Test, Build, Security |
| Linting | **ESLint** 9.16.0 + @typescript-eslint 8.16.0 | Качество кода |
| Container | **Docker** (Multi-stage Alpine 20) | Контейнеризация |
| Reverse Proxy | **Traefik v3.2** | SSL/TLS, маршрутизация |
| Web Server | **Nginx** | Раздача Mini App |

### 9. Сервисы и API интеграции

| Сервис | API | Статус | Назначение |
|--------|-----|--------|------------|
| **Telegram Bot API** | Grammy SDK | Активен | Основная платформа |
| **Telegram Web App** | @twa-dev/sdk | Активен | Mini App |
| **Sentry** | @sentry/node | Активен | Мониторинг ошибок |
| **OpenAI Whisper** | REST API | Опциональный | Транскрипция голоса |
| **PostgreSQL** | pg driver | Продакшн | Основная БД |

### 10. Чего НЕТ в стэке

| Технология | Статус | Комментарий |
|------------|--------|-------------|
| **Kafka** | Нет | Не используется. Нет message broker'ов |
| **Redis** | Опционально | В docker-compose.prod.yml есть, но не обязателен |
| **RabbitMQ** | Нет | Не используется |
| **GraphQL** | Нет | REST API на Hono |
| **gRPC** | Нет | HTTP REST только |
| **MongoDB** | Нет | SQLite + PostgreSQL |
| **Kubernetes** | Нет | Docker Compose |
| **Terraform** | Нет | Ручной deploy |

---

## Часть II: Текущий статус готовности

### 1. Статус по модулям

#### Клинические движки

| Модуль | Файлы | Покрытие тестами | Статус |
|--------|-------|------------------|--------|
| **CBT-I (5 компонентов)** | 6 движков | 98.59% | ГОТОВ |
| Sleep Restriction | SleepRestrictionEngine.ts | 98%+ | ГОТОВ — Safety-critical, TIB>=5h |
| Stimulus Control | StimulusControlEngine.ts | 98%+ | ГОТОВ |
| Cognitive Restructuring | CognitiveRestructuringEngine.ts | 98%+ | ГОТОВ |
| Sleep Hygiene | SleepHygieneEngine.ts | 98%+ | ГОТОВ |
| Relaxation Training | RelaxationEngine.ts | 98%+ | ГОТОВ |
| **Third-Wave терапии** | 4 файла | 94.67% | ГОТОВ |
| MBT-I (Mindfulness) | MBTIEngine.ts | 94%+ | ГОТОВ |
| ACT-I (Acceptance) | ACTIEngine.ts | 94%+ | ГОТОВ |
| MCT (Metacognitive) | MCTEngine.ts | 94%+ | ГОТОВ |
| ThirdWaveCoordinator | ThirdWaveCoordinator.ts | 94%+ | ГОТОВ |
| **Assessment** | ISIRussian.ts + др. | 98.9% | ГОТОВ |
| **Circadian** | CircadianAI + MEQ/MCTQ | 100% | ГОТОВ |
| **Платформа POMDP** | SleepCoreAdapter.ts | 99.1% | ГОТОВ |
| **Культурные адаптации** | TCM + Ayurveda | Есть тесты | ГОТОВ |
| **PAT/Фенотипирование** | PATAdapter + Phenotyping | 64 теста | ГОТОВ |
| **Wearable Integration** | WearableIngestionService + WearablePATIntegration | 46 тестов | **ГОТОВ (NEW 2026-02-07)** |

#### Бот и сервисы

| Модуль | Файлы | Покрытие тестами | Статус |
|--------|-------|------------------|--------|
| **Bot Commands** (25 шт.) | 25 файлов (580+ KB), 29 тест-файлов | **82.2%** (branches) | ОТЛИЧНО (audit 2026-02-09) |
| **Bot Services** (29 шт.) | 29 файлов, 38 тест-файлов | **82.78%** (stmts), 74.09% (funcs) | ОТЛИЧНО |
| **Bot Adapters** | SleepCoreTelegramAdapter | **68.06%** (stmts), 79.16% (funcs) | ХОРОШО |
| **Геймификация** | XP, бейджи, стрики, квесты | 82.94% | ХОРОШО |
| **Контент** | Образовательная библиотека | Есть | ЧАСТИЧНО |
| **Голосовые биомаркеры** | VoiceBiomarkerService | Есть тесты | ЧАСТИЧНО |
| **Адаптивная клавиатура** | AdaptiveKeyboardService | Есть | ЧАСТИЧНО |

#### Инфраструктура

| Модуль | Статус | Детали |
|--------|--------|--------|
| **SQLite (dev)** | ГОТОВ | better-sqlite3, in-memory для тестов |
| **PostgreSQL (prod)** | ГОТОВ | pg driver, миграции готовы |
| **8 DB миграций** | ГОТОВ | Все применены |
| **PHI Encryption** | ГОТОВ | AES-256-GCM |
| **Audit Trail** | ГОТОВ | 6-летнее хранение |
| **Sentry Monitoring** | ГОТОВ | PHI scrubbing |
| **Docker стэк** | ГОТОВ | 6 конфигураций Compose |
| **CI/CD (GitHub Actions)** | ГОТОВ | 4 пайплайна |
| **Backup System** | ГОТОВ | Автоматические зашифрованные бэкапы |
| **GDPR compliance** | ГОТОВ | Экспорт, удаление, портативность |

#### Mini App (Telegram Web App)

| Компонент | Статус | Детали |
|-----------|--------|--------|
| React каркас | ГОТОВ | React 18 + Vite + Zustand |
| Авторизация | ГОТОВ | JWT через Telegram init data |
| Дыхательное упражнение | ГОТОВ | Haptic breathing 4-7-8 |
| Профиль пользователя | ГОТОВ | Страница профиля |
| Dashboard Home | ГОТОВ | Главная страница |
| API клиент | ГОТОВ | TanStack Query |
| E2E тесты | ГОТОВ | 4 Playwright файла |
| Полноценный функционал | НЕ ГОТОВ | Только базовые страницы |

#### Документация

| Документ | Статус | Путь |
|----------|--------|------|
| Privacy Policy | ГОТОВ | docs/PRIVACY_POLICY.md |
| Terms of Service | ГОТОВ | docs/TERMS_OF_SERVICE.md |
| Informed Consent | ГОТОВ | docs/INFORMED_CONSENT_FORM.md |
| Study Protocol | ГОТОВ | docs/ethics/STUDY_PROTOCOL.md |
| Investigators Brochure | ГОТОВ | docs/ethics/INVESTIGATORS_BROCHURE.md |
| Adverse Event Plan | ГОТОВ | docs/ethics/ADVERSE_EVENT_PLAN.md |
| Ethics Checklist | ГОТОВ | docs/ethics/ETHICS_SUBMISSION_CHECKLIST.md |
| Cybersecurity (RU) | ГОТОВ | docs/regulatory/CYBERSECURITY_RU.md |
| Versioning Procedures (RU) | ГОТОВ | docs/regulatory/VERSIONING_PROCEDURES_RU.md |
| EUDAMED Registration | ГОТОВ | docs/regulatory/EUDAMED_REGISTRATION.md |
| QMSR Gap Analysis | ГОТОВ | docs/regulatory/QMSR_GAP_ANALYSIS.md |
| PCCP Protocol | ГОТОВ | docs/regulatory/PCCP_PROTOCOL.md |
| Launch Plan | ГОТОВ | docs/production/launch-plan.md |
| Vision 2.0 | ГОТОВ | docs/business/vision.md |

### 2. Общее покрытие тестами (Обновлено: 2026-02-09)

| Метрика | Значение | Порог | Статус |
|---------|----------|-------|--------|
| Statements | **85.01%** | 45% | ✅ +40.01% |
| Branches | **76.32%** | 40% | ✅ +36.32% |
| Functions | **89.54%** | 50% | ✅ +39.54% |
| Lines | **85.47%** | 45% | ✅ +40.47% |
| **Всего тестов** | **9300+** | — | ✅ |
| Unit тестов | ~8138 | — | — |
| Integration тестов | 272 | — | — |
| E2E тестов | 87 | — | — |
| Smoke тестов | 25 | — | — |

> **IEC 62304 Class IIa Аудит: COMPLETE** — Все P0-P3 issues закрыты

### 3. Что ГОТОВО (сводка)

```
КЛИНИЧЕСКИЕ ДВИЖКИ                    ████████████████████  100%
ASSESSMENT (ISI, MEQ, MCTQ)           ████████████████████  100%
CIRCADIAN (хронотип)                   ████████████████████  100%
POMDP + THOMPSON SAMPLING             ████████████████████  100%
THIRD-WAVE (MBT-I, ACT-I, MCT)        ████████████████████  100%
PAT FOUNDATION MODEL                   ████████████████████  100%
WEARABLE BACKEND                       ████████████████████  100%
CULTURAL ADAPTATIONS                   ████████████████████  100%
DATABASE + MIGRATIONS                  ████████████████████  100%
ENCRYPTION + SECURITY                  ████████████████████  100%
DOCKER + CI/CD                         ████████████████████  100%
REGULATORY DOCS                        ████████████████████  100%
ETHICS + CONSENT DOCS                  ████████████████████  100%
GAMIFICATION                           ████████████████░░░░   83%
MINI APP                               ████████████░░░░░░░░   60%
BOT COMMANDS (интеграция)              ████████████████████  100% ✅ (audit 2026-02-09)
BOT SERVICES (тесты)                   ████████████████░░░░   83%
```

### 4. Что НЕ ГОТОВО / критичные пробелы

| Пробел | Критичность | Описание |
|--------|-------------|----------|
| ~~**Bot Commands branches: 34.81%**~~ | ~~СРЕДНЕ~~ | ✅ **ГОТОВО:** 82.2% (audit 2026-02-09) |
| ~~**Команда → Движок интеграция**~~ | ~~ВЫСОКАЯ~~ | ✅ **ГОТОВО:** Full audit 2026-02-09, no orphan modules |
| ~~**Wearable Integration**~~ | ~~НИЗКАЯ~~ | ✅ **ГОТОВО:** Health Connect backend + Android Companion App |
| **Mobile App (iOS)** | ВЫСОКАЯ | Не начато — нужно для push уведомлений |
| **Payment / Подписка** | ВЫСОКАЯ | Монетизация не реализована |
| **LLM-терапевт** | СРЕДНЯЯ | Запланирован на 2027 |
| **Рандомизация для RCT** | СРЕДНЯЯ | Модуль не создан |
| **ISO 13485 QMS** | ВЫСОКАЯ | 12 пробелов выявлено (см. QMSR_GAP_ANALYSIS.md) |
| **Нотифицированный орган** | ВЫСОКАЯ | Не выбран для CE Mark |
| **Ethics Committee approval** | ВЫСОКАЯ | Документы готовы, подача не начата |

---

## Часть III: Планы запуска и развития

### 1. Стратегия запуска

#### 1.1 Целевые рынки (в порядке приоритета)

| # | Рынок | Обоснование | Целевой срок |
|---|-------|-------------|--------------|
| 1 | **Россия** | Домашний рынок, новые регуляции (Приказ 181н), локальное преимущество | Q3 2026 (пилот) |
| 2 | **ЕАЭС** | Гармонизация с 2026, расширение после РФ | Q1 2027 |
| 3 | **Германия (DiGA)** | DiGA Fast-Track, реимбурсация, цифровая зрелость | Q2 2027 |
| 4 | **ЕС (CE Mark)** | Class IIa, EUDAMED с мая 2026 | Q1 2027 |
| 5 | **США (FDA)** | 510(k), крупнейший рынок, CMS reimbursement | Q4 2027 |

#### 1.2 Платформы (в порядке запуска)

| # | Платформа | Технология | Статус | Запуск |
|---|-----------|-----------|--------|--------|
| 1 | **Telegram Bot** | Grammy + TypeScript | ALPHA | Q2 2026 (пилот) |
| 2 | **Telegram Mini App** | React + Vite | ALPHA | Q2 2026 (пилот) |
| 3 | **Web App** | React (на базе Mini App) | НЕ НАЧАТО | Q4 2026 |
| 4 | **iOS App** | React Native или Swift | НЕ НАЧАТО | Q1 2027 |
| 5 | **Android Companion App** | Kotlin + Compose | ✅ ГОТОВО | 2026-02-08 |
| 6 | **Prescriber Dashboard** | Web (React) | НЕ НАЧАТО | Q2 2027 |

### 2. Фазы запуска

#### Фаза 0 — Pre-Production (ВЫПОЛНЕНА)

| Задача | Статус |
|--------|--------|
| Database repositories | ГОТОВО |
| PHI Encryption (AES-256-GCM) | ГОТОВО |
| Audit logging | ГОТОВО |
| GDPR data export/delete | ГОТОВО |
| Privacy Policy + ToS | ГОТОВО |
| Informed Consent (ICH E6(R3)) | ГОТОВО |
| Ethics submission package | ГОТОВО |
| Sentry monitoring | ГОТОВО |
| Backup system | ГОТОВО |

#### Фаза 1 — Пилотное тестирование (Q2-Q3 2026)

| Задача | Статус | Описание |
|--------|--------|----------|
| Одобрение Этического комитета | НЕ НАЧАТО | Документы готовы |
| Набор участников (N=30-50) | НЕ НАЧАТО | Telegram каналы, университеты, клиники |
| 8-недельный курс CBT-I | ГОТОВО (техн.) | Все движки реализованы |
| ISI-оценка каждые 2 недели | ГОТОВО (техн.) | ISISchedulingService |
| Admin dashboard | ГОТОВО (техн.) | AdminDashboardService |
| Adverse Event reporting | ГОТОВО (техн.) | AdverseEventService |
| Crisis detection | ГОТОВО (техн.) | 3-уровневая детекция |
| Анализ результатов | НЕ НАЧАТО | — |

#### Фаза 2 — RCT (Q4 2026 - Q2 2027)

| Задача | Статус | Описание |
|--------|--------|----------|
| Дизайн: 2-arm RCT, N=150 | ОПРЕДЕЛЁН | 75+75, 8 недель + 6 месяцев follow-up |
| Контрольная группа | НЕ НАЧАТО | Sleep Hygiene Education бот |
| Модуль рандомизации | НЕ НАЧАТО | Стратификация по ISI severity |
| Регистрация ClinicalTrials.gov | НЕ НАЧАТО | — |
| CDISC/SDTM экспорт | НЕ НАЧАТО | Для FDA |

#### Фаза 3 — Регуляторная (Параллельно с RCT)

| Регулятор | Задача | Статус | Дедлайн |
|-----------|--------|--------|---------|
| **QMSR (FDA)** | ISO 13485 compliance | 12 GAPs | Feb 2, 2026 |
| **EUDAMED (EU)** | Actor + Device registration | Документы готовы | May 28, 2026 |
| **Росздравнадзор** | Техническое досье (Приказ 181н) | НЕ НАЧАТО | Q3 2026 |
| **ЕАЭС** | Гармонизация документов | НЕ НАЧАТО | 2027 |
| **CE Mark** | Notified Body audit | НЕ НАЧАТО | Q1 2027 |
| **FDA 510(k)** | Pre-submission meeting | НЕ НАЧАТО | Q4 2027 |
| **DiGA** | BfArM Fast-Track | НЕ НАЧАТО | Q2 2027 |
| **EU AI Act** | High-risk AI compliance | НЕ НАЧАТО | Aug 2026 |

#### Фаза 4 — Продуктовое развитие (Q3 2026+)

| Приоритет | Задача | Статус |
|-----------|--------|--------|
| P0 | Покрытие ветвлений Bot Commands (34.81% → 60%) | В ПРОЦЕССЕ |
| P0 | Верификация Command → Engine интеграции | НЕ НАЧАТО |
| P1 | Native Mobile App (iOS) | НЕ НАЧАТО |
| P1 | Push Notifications (вне Telegram) | НЕ НАЧАТО |
| P1 | ~~Wearable интеграция (Health Connect)~~ | ✅ **ГОТОВО** (Backend + Android Companion App) |
| P2 | Payment / Подписка | НЕ НАЧАТО |
| P2 | Prescriber Dashboard | НЕ НАЧАТО |
| P2 | A/B тестирование геймификации | НЕ НАЧАТО |
| P3 | Offline Mode для дневника | НЕ НАЧАТО |
| P3 | LLM-терапевт с CBT alignment | НЕ НАЧАТО (2027) |
| P3 | N-of-1 Adaptive Trials | НЕ НАЧАТО (2027) |
| P3 | Federated Learning | НЕ НАЧАТО (2027) |

#### Фаза 5 — Масштабирование и монетизация

| Модель | Описание | Цена |
|--------|----------|------|
| **Free** | Базовый дневник, Неделя 1 CBT-I, ограниченная релаксация | $0 |
| **Premium** | Полный 8-недельный курс, все техники, прогресс | $7.99/мес или $49.99/год |
| **Clinical** | RCT-валидированный, дашборд врача, аналитика | B2B лицензия |

**B2B каналы:** телемедицина, корпоративный wellness, страховые, сомнологические клиники

### 3. С каких модулей начинать

#### Критический путь к запуску пилота:

```
СЕЙЧАС (Янв 2026)
│
├── 1. ТЕСТИРОВАНИЕ (необходимо первым)
│   ├── Bot Commands branches: 34.81% → минимум 60%
│   ├── Command → Engine integration тесты
│   └── E2E полный путь: ISI → Diary ×7 → Plan → Therapy → Outcome
│
├── 2. РЕГУЛЯТОРНОЕ (параллельно)
│   ├── ISO 13485 Quality Manual (QMSR дедлайн: Feb 2, 2026)
│   ├── Management Review SOP
│   └── CAPA SOP
│
├── 3. ЭТИКА (после 1+2)
│   └── Подача в Ethics Committee
│
├── 4. ЗАПУСК ПИЛОТА (Q2 2026)
│   ├── Telegram Bot — основная платформа
│   ├── Mini App — дополнение для визуализации
│   ├── N=30-50 участников
│   └── 8 недель + 4 недели follow-up
│
├── 5. MOBILE APP (Q4 2026 - Q1 2027)
│   ├── React Native (iOS + Android)
│   ├── Push Notifications
│   └── Wearable integration (Terra API)
│
└── 6. МАСШТАБИРОВАНИЕ (2027+)
    ├── RCT (N=150)
    ├── Регуляторные подачи (FDA, CE, DiGA)
    ├── Payment / Подписка
    └── B2B каналы
```

### 4. Ключевые метрики готовности

| Метрика | Текущее | Цель (пилот) | Цель (продакшн) |
|---------|---------|--------------|------------------|
| Тест покрытие (общее) | **84.97%** | 70% ✅ | 85% ✅ |
| Bot Services покрытие | **93.40%** | 85% ✅ | 90% ✅ |
| Количество тестов | **8752+** | 5000+ ✅ | 7000+ ✅ |
| Команды бота | 26 | 26 | 30+ |
| Клинические движки | 11 | 11 | 11 |
| Поддержанные языки | RU | RU | RU, EN, DE, ZH |
| Платформы | Telegram | Telegram | Telegram + iOS + Android + Web |
| Пользователи | 0 | 30-50 (пилот) | 1000+ |

### 5. Конкурентное позиционирование

| Возможность | SleepCore | Sleepio | Somryst | CBT-I Coach |
|-------------|-----------|---------|---------|-------------|
| Critical Slowing Down (EWS) | **Есть** | Нет | Нет | Нет |
| Thompson Sampling | **Есть** | Нет | Нет | Нет |
| Digital Twin (PLRNN) | **Есть** | Нет | Нет | Нет |
| Causal Discovery | **Есть** | Нет | Нет | Нет |
| Third-Wave терапии | **Есть** | Нет | Нет | Нет |
| PAT Foundation Model | **Есть** | Нет | Нет | Нет |
| TCM/Ayurveda | **Есть** | Нет | Нет | Нет |
| Open Source | **Да** | Нет | Нет | Частично |
| Русский язык | **Да** | Нет | Нет | Нет |
| FDA Cleared | Нет | Да | Да | Да (wellness) |
| Клинические RCT | 0 | 26 | 5+ | 3+ |

---

## Приложение A: Полный список Bot Commands

| # | Команда | Размер | Назначение |
|---|---------|--------|------------|
| 1 | `/start` | 25.8 KB | Онбординг, информированное согласие, ISI |
| 2 | `/diary` | 19.3 KB | Ежедневный дневник сна |
| 3 | `/today` | 19.4 KB | Сводка и чек-ин дня |
| 4 | `/therapy` | 75.3 KB | Рекомендации лечения (самая крупная команда) |
| 5 | `/relax` | 20.1 KB | Техники релаксации (PMR, дыхание, imagery) |
| 6 | `/mindful` | 13.6 KB | Упражнения осознанности |
| 7 | `/progress` | 13.4 KB | Трекинг прогресса |
| 8 | `/sos` | 3.7 KB | Кризисная поддержка |
| 9 | `/help` | 4.0 KB | Меню помощи |
| 10 | `/profile` | 16.8 KB | Профиль пользователя |
| 11 | `/badge` | 19.8 KB | Бейджи достижений |
| 12 | `/quest` | 18.4 KB | Ежедневные квесты |
| 13 | `/evolution` | 18.3 KB | Эволюция персонажа Соня |
| 14 | `/insights` | 26.6 KB | Инсайты из данных |
| 15 | `/predict` | 23.7 KB | Предсказание качества сна |
| 16 | `/chronotype` | 27.1 KB | Определение хронотипа |
| 17 | `/whatif` | 30.1 KB | Сценарное планирование |
| 18 | `/twin` | 22.9 KB | Цифровой двойник |
| 19 | `/explain` | 18.8 KB | Объяснимость AI (SHAP) |
| 20 | `/safety` | 16.8 KB | Руководство по безопасности |
| 21 | `/aereport` | 19.3 KB | Отчёт о нежелательном явлении |
| 22 | `/admin` | 28.6 KB | Админ-панель |
| 23 | `/recall` | 15.3 KB | Интервальное повторение |
| 24 | `/rehearsal` | 9.7 KB | Поведенческая репетиция |
| 25 | `/smarttips` | 16.9 KB | Контекстные советы |
| 26 | CommandHandler | 17.7 KB | Маршрутизация команд |

## Приложение B: Полный список Bot Services

| # | Сервис | Назначение |
|---|--------|------------|
| 1 | ProactiveNotificationService | Проактивные напоминания (чек-ины) |
| 2 | CrisisDetectionService | 3-уровневая детекция кризисов (SAFETY-CRITICAL) |
| 3 | CrisisEscalationService | Эскалация к админам (SAFETY-CRITICAL) |
| 4 | ISISchedulingService | Планирование ISI каждые 2 недели |
| 5 | StreakService | Трекинг стриков |
| 6 | GamificationContext | XP, бейджи, уровни |
| 7 | ProgressVisualizationService | Графики и аналитика |
| 8 | EmojiSliderService | Быстрая оценка emoji-слайдером |
| 9 | HubMenuService | Навигация по командам |
| 10 | DailyGreetingService | Персонализированные приветствия |
| 11 | AdaptivePersonaService | Адаптация стиля общения |
| 12 | OnboardingTrackingService | Трекинг онбординга |
| 13 | SentimentAnalysisService | Анализ настроения сообщений |
| 14 | VoiceBiomarkerService | Голосовые биомаркеры |
| 15 | DigitalTwinService | PLRNN Digital Twin |
| 16 | MetacognitiveEngineService | Метакогнитивная поддержка |
| 17 | SleepPredictionService | ML-предсказание качества сна |
| 18 | AdminDashboardService | Аналитика для админов |
| 19 | AnonymizedDataExportService | GDPR-export данных |
| 20 | AdverseEventService | Отслеживание нежелательных явлений |
| 21 | YearInPixelsService | Годовая визуализация |
| 22 | WorryPostponementService | MCT-техника откладывания тревог |
| 23 | DetachedMindfulnessService | MBT-I техника отстранения |
| 24 | CausalInsightsService | Причинно-следственные инсайты |
| 25 | ATTService | Тренировка внимания (MCT) |
| 26 | ReplyKeyboardService | Динамические клавиатуры |
| 27 | ProactiveIntelligenceService | Предиктивные уведомления |
| 28 | SonyaEvolutionService | Эволюция персонажа |

---

**Документ создан:** Январь 2026
**Следующее обновление:** По результатам пилота (Q3 2026)
