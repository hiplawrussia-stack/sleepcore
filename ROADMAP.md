# SleepCore: Дорожная карта развития

> Последнее обновление: Январь 2026

## Статус проекта

| Метрика | Значение |
|---------|----------|
| Версия | 1.0.0-alpha.4 |
| Команд бота | 25 |
| Тестов | 1,244+ |
| Покрытие | ~80% |
| CogniCore интеграция | 95% |
| Статус деплоя | Production (155.212.189.174) |

---

## Выполненные этапы

### Фаза A: Базовый бот (Декабрь 2024 - Январь 2025) ✅

| Компонент | Статус |
|-----------|--------|
| Telegram Bot (Grammy) | ✅ Готов |
| Дневник сна (/diary) | ✅ Готов |
| ISI Assessment | ✅ Готов |
| CBT-I 5 компонентов | ✅ Готов |
| Релаксация (/relax) | ✅ Готов |
| Осознанность (/mindful) | ✅ Готов |
| Third-Wave (ACT-I, MBT-I) | ✅ Готов |
| Gamification (квесты, бейджи) | ✅ Готов |
| SQLite persistence | ✅ Готов |

### Фаза B: Production Infrastructure (Январь 2025) ✅

| Компонент | Статус |
|-----------|--------|
| Docker deployment | ✅ Готов |
| Health checks API | ✅ Готов |
| Telegram Mini App | ✅ Готов |
| REST API (backend) | ✅ Готов |
| Traefik reverse proxy | ✅ Готов |
| Monitoring (Prometheus/Grafana) | ✅ Готов |

### Фаза C: AI/ML Integration - Sprint 1-4 (Январь 2026) ✅

#### Sprint 1: PLRNN Predictions ✅
- [x] SleepPredictionService (PLRNN + Kalman)
- [x] 7-дневный прогноз эффективности сна
- [x] Early Warning Signals
- [x] Команда `/predict`

#### Sprint 2: Digital Twin & XAI ✅
- [x] DigitalTwinService (BifurcationEngine)
- [x] ConstitutionalMiddleware (Constitutional AI)
- [x] ExplainabilityService (Feature Attribution)
- [x] Команды `/twin`, `/explain`

#### Sprint 3: Causal Discovery ✅
- [x] CausalInsightsService (PC/GES алгоритмы)
- [x] Персонализированные insights
- [x] What-If симуляции
- [x] Команды `/insights`, `/whatif`

#### Sprint 4: Safety & Commands ✅
- [x] SafetyMonitorService
- [x] Crisis escalation
- [x] Команда `/safety`
- [x] Интеграция всех 6 AI-команд
- [x] 25 команд работают

### Фаза D: Proactive Intelligence - Sprint 5 (Январь 2026) ✅

#### Sprint 5: JITAI + Early Warning ✅
- [x] Critical Slowing Down (CSD) - Early Warning Signals
  - Autocorrelation (AR1) tracking
  - Rolling variance для нестабильности
  - Прогноз дней до transition
  - *Исследование*: Smit et al. 2025
- [x] Thompson Sampling - персонализация сообщений
  - Beta distribution sampling
  - Per-user engagement tracking
  - *Исследование*: DIAMANTE trial 2024
- [x] Anti-Fatigue механизм
  - Макс 3 insights/день
  - 4-часовой интервал
  - 24h cooldown после ignore
- [x] Интеграция с NotificationService
  - Proactive insights с feedback
  - Cron job каждые 2 часа (10:00-20:00 MSK)
- [x] 32 unit-теста для новых компонентов

---

## Текущий этап: Фаза E - Sprint 6+

### Sprint 6: Wearables Integration (Рекомендуется)

**Цель**: Объективные данные сна вместо субъективных

| Задача | Приоритет | Сложность |
|--------|-----------|-----------|
| WearableAdapter interface | P1 | Средняя |
| Apple Health connector | P1 | Высокая |
| Google Fit connector | P2 | Средняя |
| Fitbit API integration | P2 | Средняя |
| HRV-based stress detection | P2 | Средняя |
| Объективные sleep stages в Digital Twin | P1 | Высокая |

**Исследовательская база**:
- Digital phenotyping (PMC 2025)
- Passive sensing улучшает adherence на 40%
- HRV коррелирует с качеством сна (r=0.72)

### Sprint 7: Voice Biomarkers

**Цель**: Анализ голоса для определения состояния

| Задача | Приоритет | Сложность |
|--------|-----------|-----------|
| OpenAI Whisper интеграция | P1 | Низкая |
| Acoustic feature extraction | P2 | Высокая |
| Voice sentiment analysis | P2 | Средняя |
| Speech rate/pause analysis | P2 | Средняя |
| Голосовой дневник сна | P1 | Средняя |

### Sprint 8: Clinical Dashboard

**Цель**: Веб-панель для клиницистов

| Задача | Приоритет | Сложность |
|--------|-----------|-----------|
| React admin dashboard | P1 | Высокая |
| Patient list с CSD indicators | P1 | Средняя |
| Digital Twin visualization | P2 | Высокая |
| Causal graph visualization | P2 | Высокая |
| Экспорт данных (CSV, SPSS) | P1 | Низкая |
| Cohort analytics | P2 | Средняя |

### Sprint 9: MCT Engine

**Цель**: Metacognitive Therapy протоколы

| Задача | Приоритет | Сложность |
|--------|-----------|-----------|
| MCTEngine implementation | P1 | Средняя |
| Worry postponement exercises | P1 | Низкая |
| Attention training | P2 | Средняя |
| Detached mindfulness | P2 | Средняя |
| Интеграция в ThirdWaveCoordinator | P1 | Низкая |
| Команда `/metacognition` | P1 | Низкая |

### Sprint 10: Telegram Mini App v2

**Цель**: Улучшенный UX с визуализациями

| Задача | Приоритет | Сложность |
|--------|-----------|-----------|
| Интерактивные графики прогресса | P1 | Средняя |
| CSD/EWS визуализация | P1 | Средняя |
| Year-in-Pixels календарь | P2 | Средняя |
| Causal graph интерактивный | P2 | Высокая |
| Sleep diary UI improvements | P1 | Низкая |

---

## Фаза F: Клинические испытания (Q2 2026)

### Подготовка к пилоту

| Требование | Статус |
|------------|--------|
| Протокол исследования | ✅ Готов |
| Информированное согласие | ✅ Готов |
| Adverse Event Plan | ✅ Готов |
| Ethics submission checklist | ✅ Готов |
| Privacy Policy | ✅ Готов |
| Data Export service | ✅ Готов |

### Целевые метрики пилота

| Метрика | Цель |
|---------|------|
| Участников | 50-100 |
| Retention 4 недели | >70% |
| ISI снижение | >7 баллов |
| Sleep Efficiency | >85% |
| NPS | >40 |

---

## Фаза G: Regulatory (Q3-Q4 2026)

### Росздравнадзор

| Документ | Статус |
|----------|--------|
| Техническая документация | 📝 В работе |
| Cybersecurity requirements | ✅ Готов |
| Versioning procedures | ✅ Готов |
| Clinical evidence dossier | ⏳ Ожидает пилота |

### FDA 510(k) Preparation

| Требование | Статус |
|------------|--------|
| Predicate device analysis | ⏳ Планируется |
| Software documentation | 📝 В работе |
| Clinical validation | ⏳ Ожидает пилота |
| Cybersecurity submission | ⏳ Планируется |

---

## Технический долг

| Задача | Приоритет | Sprint |
|--------|-----------|--------|
| Migrate SleepCorePOMDP → SleepCoreAdapter полностью | P1 | 6 |
| Redis cache для сессий (scale) | P2 | 8 |
| PostgreSQL migration (production) | P2 | 8 |
| Federated learning preparation | P3 | 10+ |
| Multi-language support (EN) | P3 | 10+ |

---

## Конкурентный анализ (Январь 2026)

| Фича | SleepCore | Sleepio | CBT-i Coach | Pear Somryst |
|------|-----------|---------|-------------|--------------|
| PLRNN predictions | ✅ | ❌ | ❌ | ❌ |
| Digital Twin | ✅ | ❌ | ❌ | ❌ |
| Critical Slowing Down | ✅ | ❌ | ❌ | ❌ |
| Thompson Sampling | ✅ | ✅ | ❌ | ? |
| Causal Discovery | ✅ | ❌ | ❌ | ❌ |
| Constitutional AI | ✅ | ❌ | ❌ | ❌ |
| Telegram native | ✅ | ❌ | ❌ | ❌ |
| Цена | Бесплатно* | $400/год | Бесплатно | $899 |

*Планируется freemium модель

---

## Команда и контакты

- **Разработка**: Claude Opus 4.5 + Human oversight
- **Репозиторий**: github.com/hiplawrussia-stack/sleepcore
- **Сервер**: 155.212.189.174
- **Бот**: @SleepCore_Bot

---

## История версий дорожной карты

| Дата | Версия | Изменения |
|------|--------|-----------|
| Янв 2025 | v1.0 | Начальная версия |
| Янв 2026 | v2.0 | Sprint 1-4 выполнены |
| Янв 2026 | v2.1 | Sprint 5 (Proactive Intelligence) выполнен |

