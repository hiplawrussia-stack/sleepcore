# E2E Treatment Journey Research Report
## SleepCore: Полный цикл лечения от первого обращения до выздоровления

**Дата:** Январь 2026
**Версия:** 1.0
**Статус:** Исследование завершено, тесты реализованы

---

## Резюме

Проведено глубокое исследование мировых трендов и научных данных (2025-2026) для создания комплексных E2E тестов полного цикла CBT-I лечения. Реализовано **43 теста**, охватывающих все фазы терапии от первичной оценки до клинической ремиссии.

---

## 1. Исследовательские находки с уровнями уверенности

### 1.1 ISI (Insomnia Severity Index) Пороговые значения

| Метрика | Значение | Уверенность | Источник |
|---------|----------|-------------|----------|
| MCID (Minimal Clinically Important Difference) | 6 баллов | **ВЫСОКАЯ** | [Morin et al., 2011](https://pubmed.ncbi.nlm.nih.gov/19689221/), наиболее цитируемое значение |
| Response Threshold (Ответ на лечение) | ≥8 баллов снижение | **ВЫСОКАЯ** | Morin et al., SleepioRx trials |
| Remission Cutoff (Ремиссия) | ≤7 баллов | **ВЫСОКАЯ** | Стандарт AASM, подпороговая бессонница |
| Clinical Insomnia | ≥8 баллов | **ВЫСОКАЯ** | Validated ISI cutoffs |

**Примечание:** Обзор 2024 года (BMC Medical Research Methodology) показал вариативность MCID от 3 до 8 баллов в разных исследованиях. 6 баллов — наиболее частое значение (n=7 исследований).

### 1.2 Sleep Efficiency (Эффективность сна)

| Метрика | Значение | Уверенность | Источник |
|---------|----------|-------------|----------|
| Healthy threshold | ≥85% | **ВЫСОКАЯ** | AASM стандарт |
| Increase TIB threshold | ≥90% | **ВЫСОКАЯ** | Spielman SRT protocol |
| Decrease TIB threshold | <80% | **ВЫСОКАЯ** | Standard titration rules |

**Формула:** SE = (Total Sleep Time / Time in Bed) × 100%

### 1.3 Sleep Restriction Therapy Parameters

| Параметр | Значение | Уверенность | Источник |
|----------|----------|-------------|----------|
| Minimum TIB | 5 часов (300 мин) | **ВЫСОКАЯ** | Safety standard, Spielman 1987 |
| Adjustment increment | 15 минут | **ВЫСОКАЯ** | Standard protocol |
| Evaluation period | 7 дней | **ВЫСОКАЯ** | Weekly titration |
| Minimum baseline | 7 дней | **ВЫСОКАЯ** | [Consensus Sleep Diary](https://pmc.ncbi.nlm.nih.gov/articles/PMC3250369/) |

### 1.4 Treatment Duration

| Параметр | Значение | Уверенность | Источник |
|----------|----------|-------------|----------|
| Standard CBT-I duration | 6-8 недель | **ВЫСОКАЯ** | Espie et al., 2019; multiple RCTs |
| Minimum for graduation | 4 недели | **ВЫСОКАЯ** | Standard protocol |

### 1.5 Clinical Outcomes (2025-2026)

| Источник | Response Rate | Remission Rate | Уверенность |
|----------|---------------|----------------|-------------|
| SleepioRx (JMIR 2025) | ~76% | ~54% (OR 5.78) | **ВЫСОКАЯ** |
| Somnovia (2025) | 53.7% | 18.1% | **ВЫСОКАЯ** |
| SHUTi Real-world (n=7,216) | 61.4% | 40.0% | **СРЕДНЕ-ВЫСОКАЯ** |
| Meta-analysis estimate | 50-65% | 30-45% | **СРЕДНЯЯ** |

---

## 2. Выявленные неопределённости

### 2.1 Ограничения исследования

1. **Симулированные vs реальные пациенты**
   - Тесты используют симулированные траектории
   - Реальные пациенты демонстрируют большую вариативность
   - Нелинейные улучшения упрощены
   - **Уверенность:** СРЕДНЯЯ

2. **Digital vs In-Person CBT-I**
   - Показатели эффективности могут различаться
   - Данные SleepioRx (76%) могут не обобщаться на все платформы
   - **Уверенность:** СРЕДНЕ-ВЫСОКАЯ

3. **MCID Вариативность**
   - Литература сообщает MCID от 3 до 8 баллов
   - Мы используем 6 баллов (наиболее цитируемое)
   - Некоторые пациенты могут ощутить значимые изменения <6 баллов
   - **Уверенность:** ВЫСОКАЯ для 6 баллов

4. **Культурные/демографические факторы**
   - Тесты используют русскоязычную валидацию ISI
   - Нормы валидированы на российской популяции (Rasskazova et al.)
   - **Уверенность:** ВЫСОКАЯ для русскоговорящих, СРЕДНЯЯ для других

5. **Долгосрочное поддержание**
   - Тесты охватывают 8-недельное острое лечение
   - Долгосрочное поддержание (6-12 месяцев) не валидировано
   - Частота рецидивов не тестируется
   - **Уверенность:** НИЗКО-СРЕДНЯЯ для долгосрочных исходов

6. **Коморбидность**
   - Тесты предполагают первичную бессонницу
   - Коморбидные состояния (депрессия, тревога) могут влиять на исходы
   - **Уверенность:** НИЗКАЯ для коморбидных популяций

7. **Симуляция приверженности**
   - Симулированные показатели приверженности (70-95%)
   - Реальная приверженность обычно ниже
   - Цифровые терапевтики могут иметь 40-60% completion rate
   - **Уверенность:** СРЕДНЯЯ

---

## 3. Реализованные тесты

### 3.1 Структура тестов

```
tests/e2e/TreatmentJourney.e2e.spec.ts
├── Phase 1: Onboarding & Initial Assessment (4 теста)
├── Phase 2: Sleep Restriction Therapy (6 тестов)
├── Phase 3: Complete CBT-I Protocol (5 тестов)
├── Phase 4: Treatment Outcome Assessment (5 тестов)
├── Phase 5: Full Treatment Journey Simulation (11 тестов)
├── Phase 6: Treatment Statistics & Benchmarking (3 теста)
├── Phase 7: Clinical Safety Checks (4 теста)
└── Research Alignment: 2025-2026 Standards (5 тестов)
```

**Всего:** 43 теста, 100% pass rate

### 3.2 Покрытие по фазам лечения

| Фаза | Описание | Тесты |
|------|----------|-------|
| **Onboarding** | ISI оценка, идентификация тяжести | 4 |
| **Sleep Restriction** | Расчёт TIB, титрация, graduation | 6 |
| **CBT-I Components** | 5 компонентов протокола | 5 |
| **Outcome Assessment** | MCID, Response, Remission | 5 |
| **Journey Simulation** | Responder, Remission, Non-responder | 11 |
| **Statistics** | Response rates, duration | 3 |
| **Safety** | Минимальный TIB, referral | 4 |
| **Research Alignment** | Соответствие 2025-2026 стандартам | 5 |

### 3.3 Симулированные траектории пациентов

1. **Responder Journey**
   - Initial ISI: 20 → Final ISI: 10 (-10 баллов)
   - SE: 70% → 87%
   - 8 недель лечения

2. **Remission Journey**
   - Initial ISI: 22 → Final ISI: 5 (-17 баллов)
   - SE: 65% → 90%
   - Полное выздоровление

3. **Non-Responder Journey**
   - Initial ISI: 18 → Final ISI: 15 (-3 балла)
   - SE: 72% → 80%
   - Требует интенсификации лечения

---

## 4. Источники исследования

### Высокая уверенность (Peer-reviewed, Multiple RCTs)

- [SleepioRx Trial (JMIR Mental Health, 2025)](https://mental.jmir.org/2025/1/e84323)
- [Consensus Sleep Diary (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3250369/)
- [ISI MCID Study (Morin et al., 2011)](https://pubmed.ncbi.nlm.nih.gov/19689221/)
- [Sleep Foundation SRT Protocol](https://www.sleepfoundation.org/insomnia/treatment/sleep-restriction-therapy)
- [Stanford CBT-I Guidelines](https://med.stanford.edu/content/dam/sm/insomnia/documents/cbtigroup/Guidelines-to-Sleep-Restriction.pdf)

### Средне-высокая уверенность

- [BMC Medical Research Methodology ISI Review (2024)](https://bmcmedresmethodol.biomedcentral.com/articles/10.1186/s12874-024-02297-0)
- [SHUTi OASIS Trial (Nature Digital Medicine, 2025)](https://www.nature.com/articles/s41746-025-01847-0)
- [Somnovia Trial (2025)](https://www.psychiatryadvisor.com/news/somnovia-improves-insomnia-symptoms/)
- [Sleep Restriction Meta-analysis](https://pubmed.ncbi.nlm.nih.gov/33984745/)

### Safety Testing Research

- [Anthropic Constitutional Classifiers (2025)](https://www.anthropic.com/research/constitutional-classifiers)
- [FDA DHAC Meeting (November 2025)](https://www.fda.gov/advisory-committees/advisory-committee-calendar/november-6-2025-digital-health-advisory-committee-meeting-announcement-11062025)
- [EU AI Act High-Risk Requirements](https://artificialintelligenceact.eu/article/6/)
- [IEC 62304 Class C Requirements](https://blog.johner-institute.com/iec-62304-medical-software/safety-class-iec-62304/)

---

## 5. Рекомендации для дальнейшего развития

### 5.1 Краткосрочные (Sprint 6)

1. **Интеграционные E2E тесты**
   - Добавить тесты с реальными Telegram Bot API mock
   - Протестировать полный flow: /start → /diary → /progress → /therapy

2. **Wearable Data Integration**
   - Добавить объективные данные сна (Apple Health, Google Fit)
   - Сравнить с субъективными diary данными

### 5.2 Среднесрочные (Sprint 7-8)

1. **Clinical Validation Study**
   - Провести пилотное исследование (N=50-100)
   - Сравнить реальные response rates с benchmarks

2. **Long-term Monitoring**
   - Добавить тесты для 6-12 месячного follow-up
   - Отслеживание рецидивов

### 5.3 Долгосрочные

1. **Personalized Medicine**
   - ML модели для prediction non-responders
   - Adaptive treatment selection

2. **Multi-language Support**
   - Валидация ISI на других языках
   - Культурная адаптация рекомендаций

---

## 6. Заключение

Исследование и реализация E2E тестов полного цикла лечения завершены успешно. Тесты покрывают:

- ✅ Первичную оценку (ISI, severity classification)
- ✅ Sleep Restriction Therapy (titration, graduation)
- ✅ Все 5 компонентов CBT-I
- ✅ Outcome assessment (MCID, Response, Remission)
- ✅ Симуляции различных траекторий пациентов
- ✅ Clinical safety checks
- ✅ Соответствие научным стандартам 2025-2026

**Ключевые метрики проекта SleepCore соответствуют мировым стандартам:**

| Метрика | SleepCore | Мировой стандарт | Статус |
|---------|-----------|------------------|--------|
| ISI MCID | 6 баллов | 6 баллов | ✅ |
| Response threshold | 8 баллов | 6-8 баллов | ✅ |
| Remission cutoff | ≤7 | ≤7-8 | ✅ |
| SE threshold | 85% | 85% | ✅ |
| Treatment duration | 6-8 недель | 6-8 недель | ✅ |
| Minimum TIB | 5 часов | 5 часов | ✅ |

---

*Отчёт подготовлен на основе исследования 40+ научных источников (2024-2026)*
