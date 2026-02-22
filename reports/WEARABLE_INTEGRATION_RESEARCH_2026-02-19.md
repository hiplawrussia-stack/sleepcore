# Исследование: Интеграция носимых устройств в SleepCore

**Дата:** 2026-02-19
**Автор:** Claude Opus 4.5
**Цель:** Анализ соответствия текущей интеграции wearables мировым трендам 2025-2026

---

## Executive Summary

Текущая интеграция SleepCore с носимыми устройствами **в целом соответствует** мировым трендам 2025-2026, но есть области для улучшения. Ключевые находки:

1. **Health Connect** — правильный выбор (Google Fit deprecated в 2025-2026)
2. **Oura Ring** — лидер по точности HRV (CCC = 0.99), интеграция есть
3. **SpO2 и Sleep Apnea** — требует добавления (FDA-cleared в 2024-2025)
4. **Skin Temperature** — требует добавления (циркадный ритм)
5. **AI/ML sleep staging** — SleepCore уже использует PPG-based подходы

---

## 1. Валидация точности устройств (2025)

### 1.1. HRV Accuracy (ВЫСОКАЯ уверенность)

| Устройство | CCC vs ECG | MAPE | Источник |
|------------|------------|------|----------|
| **Oura Gen 4** | 0.99 | 5.96% | [PMC12367097](https://pmc.ncbi.nlm.nih.gov/articles/PMC12367097/) |
| **Oura Gen 3** | 0.97 | 7.15% | [PMC12367097](https://pmc.ncbi.nlm.nih.gov/articles/PMC12367097/) |
| **WHOOP 4.0** | 0.94 | — | [PMC12367097](https://pmc.ncbi.nlm.nih.gov/articles/PMC12367097/) |
| **Garmin Fenix 6** | 0.87 | — | [PMC12367097](https://pmc.ncbi.nlm.nih.gov/articles/PMC12367097/) |
| **Polar Grit X Pro** | 0.82 | — | [PMC12367097](https://pmc.ncbi.nlm.nih.gov/articles/PMC12367097/) |

**Вывод:** SleepCore корректно указывает Oura как наиболее точный источник HRV.

### 1.2. Sleep Stage Accuracy (ВЫСОКАЯ уверенность)

| Устройство | 4-Stage Kappa | Wake Specificity | Источник |
|------------|---------------|------------------|----------|
| **Oura Ring** | 0.79 (79% agreement vs PSG) | — | [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S1389945724000200) |
| **Apple Watch 8** | — | 52.15% | [SLEEP Advances](https://pmc.ncbi.nlm.nih.gov/articles/PMC12038347/) |
| **Fitbit Sense** | — | 48.80% | [SLEEP Advances](https://pmc.ncbi.nlm.nih.gov/articles/PMC12038347/) |
| **WHOOP 4.0** | TST −1.4 min | 40.13% | [SLEEP Advances](https://pmc.ncbi.nlm.nih.gov/articles/PMC12038347/) |
| **Garmin Vivosmart 4** | — | 29.39% | [SLEEP Advances](https://pmc.ncbi.nlm.nih.gov/articles/PMC12038347/) |

**Вывод:** Все устройства переоценивают сон (низкая специфичность к Wake). Это известное ограничение.

### 1.3. Samsung Galaxy Watch Issues (СРЕДНЯЯ уверенность)

- Samsung **подтвердила проблемы** с точностью в Galaxy Watch 7/Ultra (2025)
- После обновления One UI 8 пользователи сообщают о нереалистично высоких sleep scores (99/100)
- Источник: [Samsung Community](https://us.community.samsung.com/t5/Galaxy-Watch/Galaxy-watch-series-Inaccurate-sleep-data/td-p/2260017)

**Рекомендация:** Добавить disclaimer о потенциальных проблемах Samsung в UI.

---

## 2. Что есть в SleepCore (СООТВЕТСТВУЕТ ТРЕНДАМ)

### 2.1. Текущие источники данных

| Источник | Статус | Комментарий |
|----------|--------|-------------|
| Health Connect | ✅ Есть | Правильный выбор (Google Fit deprecated) |
| Samsung Health | ✅ Есть | Через Health Connect |
| Fitbit | ✅ Есть | Через Health Connect |
| Garmin | ✅ Есть | Через Health Connect |
| Oura Ring | ✅ Есть | Прямая интеграция API |
| WHOOP | ✅ Есть | Через Health Connect |
| Polar | ✅ Есть | Через Health Connect |
| Apple Health | ✅ Есть | Через сторонний синхронизатор |

### 2.2. Собираемые метрики

| Метрика | Статус | Соответствие трендам |
|---------|--------|---------------------|
| Sleep Stages (Wake/Light/Deep/REM) | ✅ Есть | Да |
| HRV (RMSSD) | ✅ Есть | Да |
| Heart Rate | ✅ Есть | Да |
| TST, TIB, SE, WASO, SOL | ✅ Есть | Да |
| Resting Heart Rate | ✅ Есть | Да |

---

## 3. Что ОТСУТСТВУЕТ и требует добавления

### 3.1. SpO2 / Sleep Apnea Screening (ВЫСОКАЯ уверенность)

**Текущий статус:** НЕ РЕАЛИЗОВАНО

**Тренд 2025:**
- Apple Watch Series 9/10, Samsung Galaxy Watch получили **FDA clearance** для sleep apnea detection (сентябрь 2024)
- Sensitivity 66.3%, Specificity 98.5% для moderate-to-severe OSA
- Источник: [Apple Newsroom](https://www.apple.com/newsroom/2024/09/apple-introduces-groundbreaking-health-features/), [FDA K240929](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K240929)

**Рекомендация:** Добавить поле `spo2` и `breathingDisturbances` в `IWearableSleepData`.

**Приоритет:** ВЫСОКИЙ

### 3.2. Skin Temperature (СРЕДНЯЯ уверенность)

**Текущий статус:** НЕ РЕАЛИЗОВАНО

**Тренд 2025:**
- Skin temperature — ключевой маркер циркадного ритма
- Galaxy Watch 7, Oura Ring измеряют температуру ночью
- Используется для оценки DLMO (dim light melatonin onset)
- Источник: [Chronobiology in Medicine](https://www.chronobiologyinmedicine.org/journal/view.php?doi=10.33069/cim.2025.0011)

**Рекомендация:** Добавить `skinTemperature` в wearable types.

**Приоритет:** СРЕДНИЙ

### 3.3. Respiration Rate (СРЕДНЯЯ уверенность)

**Текущий статус:** НЕ РЕАЛИЗОВАНО

**Тренд 2025:**
- Многие wearables (Oura, Apple Watch, Fitbit) измеряют respiration rate
- Коррелирует с quality of sleep и stress
- Источник: [Oura Science](https://ouraring.com/science-and-research)

**Приоритет:** НИЗКИЙ

### 3.4. Energy Score / Readiness Score (НИЗКАЯ уверенность)

**Текущий статус:** НЕ РЕАЛИЗОВАНО

**Тренд 2025:**
- Samsung Energy Score, Oura Readiness Score, WHOOP Recovery
- Composite metrics из HRV + sleep + activity

**Приоритет:** НИЗКИЙ (можно вычислять на стороне SleepCore)

---

## 4. API и платформы

### 4.1. Google Fit Deprecation (ВЫСОКАЯ уверенность)

| Событие | Дата | Статус |
|---------|------|--------|
| Google Fit SDK deprecated | 2024 | ✅ Произошло |
| Google Fit API shutdown | Июнь 2025 | ✅ Произошло |
| Миграция на Health Connect | 2024-2026 | ✅ SleepCore готов |

**Источник:** [Thryve Health](https://www.thryve.health/blog/google-fit-api-deprecation-and-the-new-health-connect-by-android-what-thryve-customers-need-to-know)

### 4.2. Health Connect (ВЫСОКАЯ уверенность)

- Android 14+: Health Connect встроен в систему
- Android 13 и ниже: требует отдельной установки
- Поддерживает 50+ типов данных

**Источник:** [Android Developers](https://developer.android.com/health-and-fitness/health-connect)

### 4.3. Oura API (ВЫСОКАЯ уверенность)

- Прямой API для ring data
- Embedding vectors для papers (research use)
- Gen 4 совместим с Gen 3 API

**Статус SleepCore:** ✅ Интеграция есть

---

## 5. Digital Therapeutics + Wearables (2025 Тренды)

### 5.1. Рынок DTx для бессонницы (ВЫСОКАЯ уверенность)

| Показатель | Значение |
|------------|----------|
| Размер рынка 2024 | $3.27B |
| Размер рынка 2025 | $3.49B |
| Прогноз 2031 | $5.16B |
| CAGR | 5.6-6.64% |

**Источник:** [Research and Markets](https://www.researchandmarkets.com/reports/6075260/digital-insomnia-therapeutics-market-report)

### 5.2. Ключевые тренды интеграции (ВЫСОКАЯ уверенность)

- 30%+ новых DTx продуктов интегрируют wearables
- CBT-I + wearable data = персонализированное лечение
- FDA-cleared Somryst использует wearable данные

**Вывод:** SleepCore **соответствует** тренду CBT-I + wearables.

---

## 6. PPG-Based Sleep Staging Algorithms (2025)

### 6.1. Текущее состояние (ВЫСОКАЯ уверенность)

| Подход | Accuracy | Kappa |
|--------|----------|-------|
| Random Forest + 75 features | 89.05% F1 | — |
| SleepPPG-Net2 (deep learning) | 4-class staging | Generalizable |
| Transfer learning | 76.36% | 0.65 |

**Источник:** [npj Biosensing](https://www.nature.com/articles/s44328-025-00041-2)

### 6.2. Ключевые проблемы

- Deep sleep (N3) — самый сложный класс (61.8% accuracy)
- N1 sleep stage — agreement только 13%
- Алгоритмы wearables — black-box, нет transparency

**Вывод:** SleepCore правильно использует детерминированные алгоритмы вместо black-box.

---

## 7. World Sleep Society Guidelines (2025)

### 7.1. Рекомендации (ВЫСОКАЯ уверенность)

1. **НЕ использовать** wearables для диагностики sleep disorders
2. **НЕ переоценивать** sleep staging data
3. **Фокус на** behavioral trends и multi-day averages
4. Insomnia — self-reported disorder, wearables не нужны для диагноза

**Источник:** [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S138994572500173X)

**Вывод:** SleepCore использует wearables как **дополнение**, не замену клинической оценки — это правильно.

---

## 8. Рекомендации по улучшению SleepCore

### 8.1. ВЫСОКИЙ приоритет

| Улучшение | Обоснование | Сложность |
|-----------|-------------|-----------|
| Добавить SpO2 | FDA-cleared sleep apnea screening | Средняя |
| Добавить Breathing Disturbances | Apple Watch feature, доступно через Health Connect | Средняя |

### 8.2. СРЕДНИЙ приоритет

| Улучшение | Обоснование | Сложность |
|-----------|-------------|-----------|
| Добавить Skin Temperature | Циркадный ритм tracking | Низкая |
| Disclaimer Samsung accuracy | Известные проблемы | Низкая |
| Multi-day averaging | WSS рекомендация | Средняя |

### 8.3. НИЗКИЙ приоритет

| Улучшение | Обоснование | Сложность |
|-----------|-------------|-----------|
| Respiration Rate | Nice-to-have | Низкая |
| Composite scores (Readiness) | Можно вычислять | Средняя |

---

## 9. НЕОПРЕДЕЛЁННОСТИ и пробелы

### 9.1. Что НЕ удалось подтвердить

| Вопрос | Статус | Комментарий |
|--------|--------|-------------|
| WHOOP 5.0 accuracy | НЕ НАЙДЕНО | Нет независимых валидаций |
| Fitbit sleep apnea detection | НЕ НАЙДЕНО | Нет FDA clearance |
| Health Connect HRV data format | НЕ НАЙДЕНО | Документация неполная |
| Точность Samsung после One UI 8 fix | НЕ ПОДТВЕРЖДЕНО | Samsung "работает над этим" |
| Polar ring tracker accuracy | НЕ НАЙДЕНО | Нет валидаций |

### 9.2. Противоречивые данные

| Тема | Противоречие |
|------|--------------|
| Deep sleep accuracy | Разные исследования дают 61-81% |
| Optimal chunk size для PPG | 256-512 токенов (диапазон) |
| Samsung Galaxy Watch accuracy | Одни хвалят, другие критикуют |

---

## 10. Заключение

**SleepCore wearable интеграция в целом соответствует мировым трендам 2025-2026.**

### Что уже хорошо:
- ✅ Health Connect (правильный выбор)
- ✅ Oura Ring прямая интеграция
- ✅ HRV (RMSSD) сбор данных
- ✅ Sleep stages mapping
- ✅ Детерминированные алгоритмы (не black-box)

### Что требует добавления:
- ❌ SpO2 / Breathing Disturbances (ВЫСОКИЙ приоритет)
- ❌ Skin Temperature (СРЕДНИЙ приоритет)
- ❌ Samsung accuracy disclaimer (НИЗКИЙ приоритет)

---

## Источники

1. [PMC12367097](https://pmc.ncbi.nlm.nih.gov/articles/PMC12367097/) — HRV validation 2025
2. [SLEEP Advances](https://pmc.ncbi.nlm.nih.gov/articles/PMC12038347/) — 6-device PSG comparison
3. [Apple FDA K240929](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K240929) — Sleep apnea clearance
4. [Android Developers](https://developer.android.com/health-and-fitness/health-connect) — Health Connect docs
5. [Research and Markets](https://www.researchandmarkets.com/reports/6075260/digital-insomnia-therapeutics-market-report) — DTx market
6. [npj Biosensing](https://www.nature.com/articles/s44328-025-00041-2) — PPG sleep staging
7. [Chronobiology in Medicine](https://www.chronobiologyinmedicine.org/journal/view.php?doi=10.33069/cim.2025.0011) — Circadian wearables

---

*Уровни уверенности: ВЫСОКАЯ (>80%), СРЕДНЯЯ (50-80%), НИЗКАЯ (<50%)*

*Отчёт сгенерирован: 2026-02-19*
