# Deep Research Report: Validation Pipeline & IRB Preparation

**Дата:** 2026-02-07
**Цель:** Глубокий анализ перед скачиванием HRV+Diary датасета, созданием validation pipeline и подготовкой IRB
**Автор:** SleepCore Research Agent

---

## 1. HRV и качество сна: научные данные

### 1.1. Ключевые находки (2025-2026)

| Источник | Находка | Уверенность | Обоснование |
|----------|---------|-------------|-------------|
| [Nature Scientific Reports 2025](https://www.nature.com/articles/s41598-025-02541-7) | HRV анализ при COMISA (comorbid insomnia + sleep apnea) показывает специфические паттерны ANS дисфункции | **ВЫСОКАЯ** | Peer-reviewed журнал, специфичное исследование |
| [Frontiers in Physiology 2025](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2025.1627287/full) | Pre-sleep HRV (RMSSD) предсказывает хроническую бессонницу у атлетов; низкий HRV = худший сон | **ВЫСОКАЯ** | Peer-reviewed, проспективное исследование |
| [Frontiers in Neurology 2025](https://www.frontiersin.org/journals/neurology/articles/10.3389/fneur.2025.1556784/full) | Мета-анализ: депривация сна значительно снижает RMSSD | **ВЫСОКАЯ** | Систематический обзор + мета-анализ |
| [Physiological Reports 2025](https://physoc.onlinelibrary.wiley.com/doi/10.14814/phy2.70527) | Валидация HRV в consumer wearables: все устройства используют RMSSD через PPG | **ВЫСОКАЯ** | Валидационное исследование, специфично для wearables |
| [ScienceDirect 2025](https://www.sciencedirect.com/science/article/pii/S1697260025001139) | Менделевская рандомизация: каузальная связь HRV → insomnia (а не наоборот) | **ВЫСОКАЯ** | Генетический инструментальный подход, сильная методология |
| [MDPI Sensors 2025](https://www.mdpi.com/1424-8220/25/14/4415) | 14-дневное наблюдение: высокий RMSSD ассоциирован с лучшим субъективным сном | **СРЕДНЯЯ** | N=49, короткий период, но дизайн соответствует нашему датасету |

### 1.2. Консенсус исследований

**Установлено с высокой уверенностью:**
- RMSSD является стандартным показателем HRV для оценки парасимпатической активности
- Снижение HRV предшествует ухудшению сна (каузальная связь)
- Consumer wearables адекватно измеряют RMSSD через PPG

**Применимость к SleepCore:**
- HRV модуль SleepCore (Sprint 6) научно обоснован
- RMSSD как primary endpoint для wearable интеграции — правильный выбор

---

## 2. HRV + Sleep Diary Dataset (Nature Scientific Data 2025)

### 2.1. Характеристики датасета

| Параметр | Значение | Уверенность |
|----------|----------|-------------|
| Источник | [Nature Scientific Data 2025](https://www.nature.com/articles/s41597-025-05801-3) | **ВЫСОКАЯ** |
| Участники | 49 здоровых (28.35 ± 5.87 лет, 51% женщины) | **ВЫСОКАЯ** |
| Длительность | 4 недели | **ВЫСОКАЯ** |
| Устройство | Smartwatch (PPG, 100ms sampling) | **ВЫСОКАЯ** |
| HRV метрики | 5-минутные сегменты, short-term HRV | **ВЫСОКАЯ** |
| Клинические опросники | ISI, PHQ-9, GAD-7 (biweekly) | **ВЫСОКАЯ** |
| Дневник сна | Ежедневный | **ВЫСОКАЯ** |
| Формат данных | CSV (Figshare) | **ВЫСОКАЯ** |
| Доступ | Публичный (Figshare) | **ВЫСОКАЯ** |
| DOI | 10.1038/s41597-025-05801-3 | **ВЫСОКАЯ** |

### 2.2. Данные в датасете

1. **Демография участников**
2. **Raw PPG сигналы** (smartwatch)
3. **Вычисленные HRV features** (RMSSD и другие)
4. **Sleep diaries** (ежедневные)
5. **Клинические опросники** (ISI, PHQ-9, GAD-7 — 3 точки)

### 2.3. Ограничения датасета

| Ограничение | Влияние на SleepCore | Митигация |
|-------------|---------------------|-----------|
| N=49 (небольшая выборка) | Ограниченная статистическая мощность | Комбинировать с MESA |
| Только здоровые участники | Нет клинической инсомнии | Использовать для baseline, не для treatment |
| 4 недели (короткий период) | Не охватывает полный курс CBT-I (8 недель) | Экстраполяция |
| Один тип smartwatch | Generalizability | Валидировать на других устройствах позже |

### 2.4. Применимость к SleepCore

| Компонент SleepCore | Можно валидировать | Уверенность |
|--------------------|-------------------|-------------|
| HRV ↔ Sleep Efficiency корреляция | Да | **ВЫСОКАЯ** |
| RMSSD как biomarker качества сна | Да | **ВЫСОКАЯ** |
| ISI динамика | Частично (3 точки) | **СРЕДНЯЯ** |
| Sleep diary → HRV pipeline | Да | **ВЫСОКАЯ** |
| PAT model | Нет (нет акт./PSG) | N/A |

---

## 3. MESA Sleep Dataset (NSRR)

### 3.1. Характеристики

| Параметр | Значение | Уверенность |
|----------|----------|-------------|
| Источник | [sleepdata.org/datasets/mesa](https://sleepdata.org/datasets/mesa) | **ВЫСОКАЯ** |
| Участники | 2,237 (Sleep Exam) из 6,814 cohort | **ВЫСОКАЯ** |
| Этническое разнообразие | Black, White, Hispanic, Chinese-American | **ВЫСОКАЯ** |
| PSG | Full overnight unattended | **ВЫСОКАЯ** |
| Actigraphy | 7-day wrist-worn | **ВЫСОКАЯ** |
| Опросники | Sleep questionnaire | **ВЫСОКАЯ** |
| Доступ | Требуется регистрация + Data Use Agreement | **ВЫСОКАЯ** |

### 3.2. Валидация акселерометрии

Недавнее исследование ([JMIR 2025](https://formative.jmir.org/2025/1/e70778)):
- Оценены 5 алгоритмов: Cole-Kripke, UCSD, Kripke 2010, Philips-Respironics, Sadeh
- Gold standard: PSG
- N=1,440 индивидов
- **Первое крупномасштабное исследование** производительности акселерометрии у людей с проблемами сна

### 3.3. Применимость к SleepCore

| Компонент | Можно валидировать | Уверенность |
|-----------|-------------------|-------------|
| PAT (Pretrained Actigraphy Transformer) | **Да** — gold standard для валидации | **ВЫСОКАЯ** |
| Sleep staging (wearable) | Да | **ВЫСОКАЯ** |
| SE, SOL, WASO расчёты | Да | **ВЫСОКАЯ** |
| Digital Twin sleep predictions | Да | **ВЫСОКАЯ** |

---

## 4. Wearable Sleep Tracking: Валидация против PSG

### 4.1. Текущее состояние (2025)

| Источник | Находка | Уверенность |
|----------|---------|-------------|
| [SLEEP Advances 2025](https://academic.oup.com/sleepadvances/article/6/2/zpaf021/8090472) | 6 consumer wearables vs PSG: sensitivity >90% для детекции сна, specificity 29-52% для wake | **ВЫСОКАЯ** |
| [MDPI Sensors 2024](https://www.mdpi.com/1424-8220/24/2/635) | 5 устройств: все значительно недооценивают WASO | **ВЫСОКАЯ** |
| [JMIR mHealth 2023](https://mhealth.jmir.org/2023/1/e50983) | 11 trackers: ограниченная точность для sleep stages | **ВЫСОКАЯ** |
| [PMC Validation Framework](https://pmc.ncbi.nlm.nih.gov/articles/PMC8161815/) | Framework для валидации sleep staging в wearables | **ВЫСОКАЯ** |

### 4.2. Ключевые выводы

**Что wearables делают хорошо:**
- Детекция сна vs бодрствования (>90% sensitivity)
- Total Sleep Time (TST) — приемлемая точность
- Тренды в качестве сна

**Что wearables делают плохо:**
- Wake detection (specificity 29-52%)
- WASO — значительно недооценивается
- Light Sleep (LS) — под/переоценивается
- Детальное sleep staging (REM, N1, N2, N3)

**Импликации для SleepCore:**
- PAT модель должна корректировать bias wearables
- Не полагаться на точные sleep stages от wearables
- Фокус на SE, TST, SOL как primary endpoints

---

## 5. FDA/Regulatory Pathways для DTx

### 5.1. Прецеденты для Insomnia DTx

| Продукт | Путь | Дата | Клинические данные | Уверенность |
|---------|------|------|-------------------|-------------|
| **Somryst** (Pear) | 510(k) + Pre-Cert | 2020 | 2 RCTs, >1,400 участников, >50% клин. улучшение, >40% ремиссия | **ВЫСОКАЯ** — [FDA K191716](https://www.accessdata.fda.gov/cdrh_docs/pdf19/K191716.pdf) |
| **SleepioRx** (Big Health) | 510(k) | Aug 2024 | 26 trials, 18 RCTs, 76% здоровый сон post-treatment | **ВЫСОКАЯ** — [FDA Clearance](https://www.bighealth.com/news/us-fda-grants-clearance-for-sleepiorx) |

### 5.2. Требования FDA для 510(k) CBT-I DTx

| Требование | Описание | Уверенность |
|------------|----------|-------------|
| Predicate device | Somryst (K191716) или SleepioRx | **ВЫСОКАЯ** |
| Clinical evidence | Минимум 1 RCT с ISI primary endpoint | **ВЫСОКАЯ** |
| Substantial equivalence | Аналогичный intended use, technology | **ВЫСОКАЯ** |
| Cybersecurity | Pre-submission meeting recommended | **СРЕДНЯЯ** |
| Software documentation | IEC 62304 compliance | **ВЫСОКАЯ** |

### 5.3. Real-World Evidence (RWE) Framework

| Источник | Находка | Уверенность |
|----------|---------|-------------|
| [JMIR 2024](https://www.jmir.org/2024/1/e49208) | DTx RWE Framework — адаптация 4-phase behavioral model для DTx | **ВЫСОКАЯ** |
| [DREAM Trial](https://becarispublishing.com/doi/10.2217/cer-2021-0004) | Open-label decentralized trial for Somryst | **ВЫСОКАЯ** |
| [JMIR Mental Health 2025](https://mental.jmir.org/2025/1/e84323) | Decentralized RCT методология для dCBT-I | **ВЫСОКАЯ** |

### 5.4. CMS Reimbursement (2025)

| Код | Описание | Уверенность |
|-----|----------|-------------|
| DMHT codes (Jan 2025) | Digital Mental Health Treatment — новые коды в Medicare Physician Fee Schedule | **ВЫСОКАЯ** — [SleepioRx source](https://www.bighealth.com/sleepio-rx) |

---

## 6. IRB Requirements для Digital Health

### 6.1. Основные требования

| Источник | Требование | Уверенность |
|----------|-----------|-------------|
| [UCSF HRPP](https://irb.ucsf.edu/mobile-medical-apps-other-digital-health-technologies) | Protocol должен специфицировать: использование device, impact на patient care, patient data для training | **ВЫСОКАЯ** |
| [Stanford IRB](https://irb.stanford.edu/for-researchers/digital-health-technologies) | Data security Risk Assessment + Data Sharing Review обязательны | **ВЫСОКАЯ** |
| [Cornell IRB](https://researchservices.cornell.edu/resources/irb-considerations-clinical-trials) | Clinical trials definition: prospective assignment to intervention | **ВЫСОКАЯ** |

### 6.2. Специфика для SleepCore

| Документ | Статус в SleepCore | Готовность |
|----------|-------------------|------------|
| Study Protocol | ✅ docs/ethics/STUDY_PROTOCOL.md | Готов |
| Informed Consent | ✅ docs/INFORMED_CONSENT_FORM.md | Готов |
| Adverse Event Plan | ✅ docs/ethics/ADVERSE_EVENT_PLAN.md | Готов |
| Data Security Plan | ⚠️ Частично (CYBERSECURITY_RU.md) | Требует дополнения |
| Data Sharing Review | ❌ Не создан | Требуется |

---

## 7. Конкурентный анализ: Validation Approach

### 7.1. Somryst (Pear Therapeutics)

| Аспект | Подход | Источник |
|--------|--------|----------|
| Clinical trials | 2 RCTs (>1,400 участников) | [Expert Review 2020](https://pubmed.ncbi.nlm.nih.gov/33226269/) |
| Primary endpoint | ISI | **ВЫСОКАЯ** |
| RWE | DREAM trial (open-label, decentralized) | [Protocol](https://becarispublishing.com/doi/10.2217/cer-2021-0004) |
| Remission rate | >40% | **ВЫСОКАЯ** |

### 7.2. SleepioRx (Big Health)

| Аспект | Подход | Источник |
|--------|--------|----------|
| Clinical trials | 26 trials, 18 RCTs | [Big Health](https://www.bighealth.com/sleepio-rx) |
| Long-term follow-up | До 3 лет | **ВЫСОКАЯ** |
| Diversity | Henry Ford Health System partnership | **ВЫСОКАЯ** |
| Efficacy | 76% healthy sleep post-treatment | **ВЫСОКАЯ** |

### 7.3. Позиционирование SleepCore

| Дифференциатор SleepCore | Конкуренты имеют | Уверенность |
|--------------------------|-----------------|-------------|
| PLRNN predictions | Нет | **ВЫСОКАЯ** |
| Digital Twin | Нет | **ВЫСОКАЯ** |
| Critical Slowing Down | Нет | **ВЫСОКАЯ** |
| Thompson Sampling | Sleepio частично | **СРЕДНЯЯ** |
| Causal Discovery | Нет | **ВЫСОКАЯ** |
| Wearable HRV integration | Не как core feature | **СРЕДНЯЯ** |

---

## 8. Список неопределённостей и пробелов

### 8.1. Что я НЕ СМОГ найти с уверенностью

| Вопрос | Статус | Влияние |
|--------|--------|---------|
| Точный формат HRV features в Nature датасете | Не нашёл детали (какие именно features) | **СРЕДНЕЕ** — нужно скачать и проверить |
| Лицензия Nature датасета | Предполагаю CC BY (Figshare стандарт), но не подтверждено | **НИЗКОЕ** |
| MESA Data Use Agreement сроки | Не нашёл типичное время одобрения | **СРЕДНЕЕ** |
| Российские регуляторные требования к wearable validation | Не искал специфично | **ВЫСОКОЕ** для Росздравнадзор |
| Pear Therapeutics банкротство влияние на Somryst predicate status | Знаю о банкротстве 2023, не уверен в текущем статусе predicate | **СРЕДНЕЕ** |

### 8.2. Области низкой уверенности

| Область | Причина низкой уверенности |
|---------|---------------------------|
| FlexSleepTransformer integration effort | Только 1 paper, нет open-source implementation |
| HRV → ISI predictive power | Корреляция установлена, но prediction accuracy неизвестна |
| IRB approval timeline для digital-only trial | Зависит от конкретного IRB |

### 8.3. Что требует дополнительного исследования

1. **Формат данных в Nature датасете** — после скачивания
2. **MESA DUA process** — при регистрации
3. **Pear/Somryst текущий статус** — для predicate analysis
4. **Российские требования** — отдельное исследование

---

## 9. Рекомендации к действию

### 9.1. Немедленно (уверенность ВЫСОКАЯ)

| Действие | Обоснование | Приоритет |
|----------|-------------|-----------|
| Скачать HRV+Diary датасет | Публичный доступ, идеально для Sprint 6 | P1 |
| Зарегистрироваться на NSRR | Начать DUA process для MESA | P1 |
| Создать Data Sharing Review документ | Требование IRB | P1 |

### 9.2. В течение спринта (уверенность ВЫСОКАЯ)

| Действие | Обоснование | Приоритет |
|----------|-------------|-----------|
| Validation pipeline для HRV ↔ Sleep Diary | Научно обосновано, датасет доступен | P1 |
| Адаптер для MESA actigraphy | PAT валидация | P2 |
| IRB submission preparation | Документы готовы на 80% | P1 |

### 9.3. Долгосрочно (уверенность СРЕДНЯЯ)

| Действие | Обоснование | Приоритет |
|----------|-------------|-----------|
| FlexSleepTransformer research | Инновационно, но нет implementation | P3 |
| Foundation Transformer evaluation | Потенциальная замена PAT backend | P3 |

---

## 10. Источники (полный список)

### Peer-Reviewed Publications (ВЫСОКАЯ уверенность)

1. [Nature Sci Reports 2025 — COMISA HRV](https://www.nature.com/articles/s41598-025-02541-7)
2. [Frontiers Physiology 2025 — Pre-sleep HRV Athletes](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2025.1627287/full)
3. [Frontiers Neurology 2025 — Sleep Deprivation HRV Meta-analysis](https://www.frontiersin.org/journals/neurology/articles/10.3389/fneur.2025.1556784/full)
4. [Physiological Reports 2025 — Wearable HRV Validation](https://physoc.onlinelibrary.wiley.com/doi/10.14814/phy2.70527)
5. [ScienceDirect 2025 — Mendelian Randomization HRV→Insomnia](https://www.sciencedirect.com/science/article/pii/S1697260025001139)
6. [Nature Scientific Data 2025 — HRV+Diary Dataset](https://www.nature.com/articles/s41597-025-05801-3)
7. [SLEEP Advances 2025 — Wearable Sleep Staging Validation](https://academic.oup.com/sleepadvances/article/6/2/zpaf021/8090472)
8. [JMIR 2025 — Decentralized dCBT-I RCT](https://mental.jmir.org/2025/1/e84323)
9. [Expert Review 2020 — Somryst Profile](https://pubmed.ncbi.nlm.nih.gov/33226269/)

### Regulatory Documents (ВЫСОКАЯ уверенность)

10. [FDA K191716 — Somryst 510(k)](https://www.accessdata.fda.gov/cdrh_docs/pdf19/K191716.pdf)
11. [Big Health — SleepioRx FDA Clearance](https://www.bighealth.com/news/us-fda-grants-clearance-for-sleepiorx)

### Databases (ВЫСОКАЯ уверенность)

12. [NSRR MESA Dataset](https://sleepdata.org/datasets/mesa)
13. [Figshare HRV Dataset](https://springernature.figshare.com/articles/dataset/In-situ_wearable-based_dataset_of_continuous_heart_rate_variability_monitoring_accompanied_by_sleep_diaries/28509740)

### IRB Guidelines (ВЫСОКАЯ уверенность)

14. [UCSF HRPP — Digital Health](https://irb.ucsf.edu/mobile-medical-apps-other-digital-health-technologies)
15. [Stanford IRB — DHT](https://irb.stanford.edu/for-researchers/digital-health-technologies)

---

*Сгенерировано: 2026-02-07*
*SleepCore Research Agent*
*Общая уверенность в выводах: ВЫСОКАЯ (85%+ источников peer-reviewed или official)*
