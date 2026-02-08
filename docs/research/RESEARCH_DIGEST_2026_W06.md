# Research Digest — Неделя 06, 2026

**Дата:** 2026-02-07
**Источники:** PubMed, arXiv, PhysioNet, NSRR, Kaggle, Nature Scientific Data
**Сгенерировано:** SleepCore Research Agent

---

## Резюме

| Метрика | Значение |
|---------|----------|
| Найдено публикаций | 35+ |
| Релевантных для SleepCore | 12 |
| Новых датасетов | 8 |
| P1 рекомендаций | 2 |
| P2 рекомендаций | 3 |

---

## Топ находки

### 1. Foundation Transformer для Sleep Staging

- **Источник:** [PubMed 40080690](https://pubmed.ncbi.nlm.nih.gov/40080690/)
- **Метод:** Foundational transformer на полночных мультиканальных PSG данных
- **Результат:** Превосходит signal-only модели в accuracy и F1
- **Применимость к SleepCore:** **HIGH** — улучшение PAT модели
- **Конкуренты:** Нет в Sleepio/Somryst
- **Effort:** 2-3 спринта
- **Рекомендация:** **Исследовать** — потенциальная замена текущего PAT backend

### 2. FlexSleepTransformer — гибкие входные каналы

- **Источник:** [Nature Scientific Reports](https://www.nature.com/articles/s41598-024-76197-0)
- **Метод:** Transformer с адаптацией к разному числу каналов (1-N)
- **Результат:** Первая модель для одновременного обучения на разнородных PSG датасетах
- **Применимость к SleepCore:** **HIGH** — унификация wearable + PSG данных
- **Конкуренты:** Нет
- **Effort:** 2 спринта
- **Рекомендация:** **Интегрировать в Sprint 6** (Wearables)

### 3. AI-Enhanced CBT-I — нейрокогнитивные механизмы

- **Источник:** [MDPI JCM 2025](https://www.mdpi.com/2077-0383/14/7/2265)
- **Метод:** Обзор AI-enhanced CBT-I с chatbots и персонализацией
- **Результат:** Recommender systems для персонализации терапии
- **Применимость к SleepCore:** **MEDIUM** — уже реализовано через Thompson Sampling
- **Конкуренты:** Частично в Sleepio
- **Effort:** N/A (уже есть)
- **Рекомендация:** **Отложить** — SleepCore уже опережает

### 4. Sleep.ai — 2.7M ночей данных для скрининга

- **Источник:** [Sleep.ai Research 2025](https://www.sleep.ai/news/ml-sleep-apnea-insomnia-research/)
- **Метод:** ML на smartphone sleep stage данных для скрининга апноэ и инсомнии
- **Результат:** Large-scale detection на 68,000+ участников
- **Применимость к SleepCore:** **MEDIUM** — потенциальное партнёрство
- **Конкуренты:** Собственный продукт Sleep.ai
- **Effort:** N/A (партнёрство)
- **Рекомендация:** **Мониторить** — конкурент или партнёр?

### 5. HRV + Sleep Diary — реальный датасет

- **Источник:** [Nature Scientific Data 2025](https://www.nature.com/articles/s41597-025-05801-3)
- **Метод:** 4-недельный сбор HRV + daily sleep diary + ISI/GAD/PHQ опросники
- **Результат:** 49 участников, smartwatch данные
- **Применимость к SleepCore:** **HIGH** — валидация HRV модуля
- **Конкуренты:** Нет
- **Effort:** 1 спринт (скачать + адаптировать)
- **Рекомендация:** **Интегрировать** — идеальный датасет для Sprint 6

---

## Найденные датасеты

### Высокий приоритет (для немедленного использования)

| Датасет | Источник | Размер | Содержит | Полезность | Ссылка |
|---------|----------|--------|----------|------------|--------|
| **MESA Sleep** | NSRR | 2,237 участников | 7-дневная актиграфия + PSG + опросники | **HIGH** — валидация PAT | [sleepdata.org/datasets/mesa](https://sleepdata.org/datasets/mesa) |
| **HRV + Sleep Diary** | Nature Sci Data | 49 участников, 4 недели | HRV + дневник сна + ISI/GAD/PHQ | **HIGH** — Sprint 6 HRV | [nature.com](https://www.nature.com/articles/s41597-025-05801-3) |
| **DREAMT** | PhysioNet | PSG + wearables | Мультисенсорные данные | **MEDIUM** — wearable валидация | [physionet.org](https://physionet.org/content/dreamt/2.1.0/) |

### Средний приоритет (для исследований)

| Датасет | Источник | Размер | Содержит | Полезность | Ссылка |
|---------|----------|--------|----------|------------|--------|
| **Sleep Heart Health Study** | NSRR | 5,804 участников | PSG + questionnaires | **MEDIUM** — большой N | [sleepdata.org/datasets/shhs](https://sleepdata.org/datasets/shhs) |
| **NCH Sleep DataBank** | PhysioNet | 3,984 записей | Pediatric PSG + clinical | **LOW** — педиатрия | [physionet.org](https://www.physionet.org/content/?topic=sleep) |
| **Sleep Health Kaggle** | Kaggle | 374 записей | Lifestyle + sleep quality | **LOW** — мало данных | [kaggle.com](https://www.kaggle.com/datasets/uom190346a/sleep-health-and-lifestyle-dataset) |

### Ограничения публичных датасетов

| Что нужно SleepCore | Что есть в датасетах | Gap |
|---------------------|---------------------|-----|
| Ежедневный дневник сна (7+ дней) | Редко, обычно 1-2 точки | **CRITICAL** |
| ISI динамика (до/после) | Только baseline ISI | **HIGH** |
| CBT-I adherence данные | Нет | **HIGH** |
| Кризисные маркеры (текст) | Нет | **MEDIUM** |
| Telegram engagement | Нет | **LOW** |

---

## Тренды недели

1. **Transformer Foundation Models** — тренд на создание универсальных моделей сна, обученных на больших датасетах. SleepCore уже имеет PAT, но backend симулированный.

2. **Flexible Multi-Modal Input** — модели, работающие с разным числом каналов (1 канал wearable → 32 канала PSG). Критично для Sprint 6.

3. **Real-World HRV Studies** — рост публикаций с smartwatch данными + дневники сна. Валидирует направление Sprint 6.

4. **AI-Personalization признана** — академические обзоры подтверждают: AI-персонализация CBT-I эффективнее стандартной. SleepCore уже реализовал (Thompson Sampling, POMDP).

---

## Рекомендации для ROADMAP

| Приоритет | Что добавить | Обоснование | Sprint |
|-----------|--------------|-------------|--------|
| **P1** | Скачать MESA + HRV датасеты | Валидация PAT и HRV модулей перед пилотом | Сейчас |
| **P1** | FlexSleepTransformer архитектура | Унификация wearable/PSG, опережение конкурентов | Sprint 6 |
| **P2** | Foundation Transformer research | Замена симулированного PAT backend | Sprint 7+ |
| **P2** | Синтетический генератор данных | Stress-тест на 1000+ пользователей | Sprint 6 |
| **P3** | Sleep.ai мониторинг | Конкурент или потенциальный партнёр | Ongoing |

---

## Следующие шаги

### Немедленно (эта неделя)

- [ ] Зарегистрироваться на [sleepdata.org](https://sleepdata.org) для доступа к MESA
- [ ] Скачать HRV + Sleep Diary датасет из Nature Sci Data
- [ ] Создать адаптер для MESA актиграфии → PAT формат

### Sprint 6 (Wearables)

- [ ] Изучить FlexSleepTransformer архитектуру
- [ ] Интегрировать HRV датасет для валидации

### Ongoing

- [ ] Еженедельный запуск `/research-agent`
- [ ] Мониторинг Sleep.ai публикаций

---

## Источники

1. [NSRR — National Sleep Research Resource](https://sleepdata.org/datasets)
2. [PhysioNet Sleep Datasets](https://www.physionet.org/content/?topic=sleep)
3. [FlexSleepTransformer — Nature Scientific Reports](https://www.nature.com/articles/s41598-024-76197-0)
4. [Foundation Transformer for Sleep Staging — PubMed](https://pubmed.ncbi.nlm.nih.gov/40080690/)
5. [AI-Enhanced CBT-I Review — MDPI](https://www.mdpi.com/2077-0383/14/7/2265)
6. [HRV + Sleep Diary Dataset — Nature Scientific Data](https://www.nature.com/articles/s41597-025-05801-3)
7. [Sleep.ai ML Research 2025](https://www.sleep.ai/news/ml-sleep-apnea-insomnia-research/)
8. [MESA Sleep Dataset](https://sleepdata.org/datasets/mesa)
9. [npj Digital Medicine — dCBT-I Meta-analysis 2025](https://www.nature.com/articles/s41746-025-01514-4)

---

*Сгенерировано SleepCore Research Agent*
*Следующий дайджест: Неделя 07, 2026*
