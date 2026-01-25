# SleepCore Research Digest
## Week 3, January 2026

**Scan Date**: 19 января 2026
**Sources**: PubMed, arXiv, GitHub, Papers With Code
**Total Findings**: 47 items analyzed
**High Priority**: 12 items

---

## Executive Summary

Этот Research Scan выявил несколько прорывных направлений:

1. **LLM для CBT-I** — появляются первые клинические исследования (PubMed, Oct 2025)
2. **ECG-based sleep staging** — новые модели позволяют определять фазы сна без EEG
3. **Voice biomarkers** — готовые библиотеки и датасеты для depression detection
4. **Causal discovery** — зрелые Python-библиотеки готовы к интеграции

**Рекомендация**: Немедленно начать Sprint 6 (Voice Biomarkers) с использованием opensmile-python.

---

## ЧАСТЬ 1: НАУЧНЫЕ ПУБЛИКАЦИИ (PubMed/arXiv)

### 1.1 HIGH PRIORITY — Внедрить в ближайших спринтах

#### P1.1 Internet-delivered CBT-I with Large Language Models
- **Источник**: [PubMed 41246294](https://pubmed.ncbi.nlm.nih.gov/41246294/) (October 2025)
- **Суть**: Обзор применения LLM для eCBT-I. Традиционные CBT-I имеют низкую adherence и длинные циклы. LLM решают эти проблемы.
- **Применимость для SleepCore**: 10/10
- **Сложность интеграции**: 5/10 (у нас уже есть Constitutional AI)
- **Конкуренты**: Никто ещё не внедрил в production DTx
- **Рекомендация**: Приоритет для Sprint 12 (CBT-Aligned LLM)

---

#### P1.2 Digital CBT-I in the Workplace — Emotion Regulation
- **Источник**: [PubMed 39957531](https://pubmed.ncbi.nlm.nih.gov/39957531/) (February 2025)
- **Суть**: Hybrid dCBT-I + Emotion Regulation даёт эффект d=0.7-1.5 для инсомнии, депрессии, тревоги
- **Ключевой инсайт**: Добавление ER к CBT-I значительно усиливает эффект
- **Применимость для SleepCore**: 9/10
- **Рекомендация**: Добавить модуль Emotion Regulation в Third Wave координатор

---

#### P1.3 OncoSleep — Web-based CBT-I for Cancer Survivors
- **Источник**: [PubMed 39987779](https://pubmed.ncbi.nlm.nih.gov/39987779/) (May 2025)
- **Суть**: ISI снижение на 11.0 points (vs 1.4 control), эффект d=-2.56
- **Ключевой инсайт**: Огромный эффект (d>2) для специфической популяции
- **Применимость**: 7/10 (требует адаптации для онкопациентов)
- **Рекомендация**: Рассмотреть vertical для онкологии в будущем

---

#### P1.4 SHUTi OASIS — Digital CBT-I for Older Adults
- **Источник**: [PubMed 40681664](https://pubmed.ncbi.nlm.nih.gov/40681664/) (July 2025)
- **Суть**: Адаптированный dCBT-I для 55-95 лет, эффект сохраняется 12 месяцев
- **Ключевой инсайт**: Пожилые требуют адаптации UX, но отлично реагируют на dCBT-I
- **Применимость**: 8/10
- **Рекомендация**: Создать "Senior Mode" с упрощённым интерфейсом

---

#### P1.5 ECG-SleepNet — Sleep Staging from ECG
- **Источник**: [arXiv 2412.01929](https://arxiv.org/abs/2412.01929) (December 2024)
- **Суть**: 3-stage подход для классификации сна по ECG (без EEG!)
- **Ключевой инсайт**: Wearables с HRV могут заменить PSG для staging
- **Применимость**: 10/10 — идеально для Sprint 7 (Wearables)
- **Сложность**: 6/10
- **Рекомендация**: Изучить архитектуру для интеграции с Apple Watch/Fitbit

---

#### P1.6 Transparency in Sleep Staging — Explainable DL
- **Источник**: [arXiv 2309.07156](https://arxiv.org/abs/2309.07156) (January 2024)
- **Суть**: GradCAM для объяснения решений модели sleep staging
- **Результаты**: Macro-F1 82.5 (SleepEDF-20), 78.9 (SleepEDF-78), 81.9 (SHHS)
- **Ключевой инсайт**: Explainable AI для сна — важно для FDA
- **Применимость**: 8/10 — усиливает наш XAI модуль
- **Рекомендация**: Адаптировать GradCAM подход для объяснений предикций

---

### 1.2 MEDIUM PRIORITY — В roadmap

#### P1.7 SleepPPG-Net2 — Sleep Staging from PPG
- **Источник**: [arXiv 2404.06869](https://arxiv.org/abs/2404.06869) (April 2024)
- **Суть**: 4-class staging (wake/light/deep/REM) из PPG, 2,574 записей
- **Применимость**: 8/10 — PPG доступен на всех фитнес-трекерах
- **Рекомендация**: Альтернатива ECG-SleepNet для устройств без ECG

---

#### P1.8 Cross-Modal Transformers for Sleep Staging
- **Источник**: [arXiv 2208.06991](https://arxiv.org/abs/2208.06991) (Updated April 2025)
- **Суть**: Transformer + 1D CNN, меньше параметров, быстрее обучение
- **Применимость**: 7/10 — эффективная архитектура
- **Рекомендация**: Benchmark против текущих моделей

---

#### P1.9 Digital CBT-I Shift Workers (Scoping Review)
- **Источник**: [PubMed 40585747](https://pubmed.ncbi.nlm.nih.gov/40585747/) (May 2025)
- **Суть**: dCBT-I эффективен для shift workers как и очный
- **Применимость**: 7/10 — специфическая популяция
- **Рекомендация**: Добавить "Shift Worker Mode" с адаптированным циркадным модулем

---

### 1.3 ARCHIVE — Мониторить

| # | Статья | Применимость | Причина архивации |
|---|--------|--------------|-------------------|
| P1.10 | Patient perceptions of digital vs therapist-led | 5/10 | Qualitative, нет новых методов |
| P1.11 | Australian community dCBT-I | 6/10 | Подтверждение эффективности, нет инноваций |
| P1.12 | Systematic Review Sleep Stage AI | 6/10 | Обзор 2016-2023, уже учтено |

---

## ЧАСТЬ 2: GITHUB REPOSITORIES

### 2.1 HIGH PRIORITY — Использовать немедленно

#### G1. opensmile-python ⭐⭐⭐
- **Repo**: [audeering/opensmile-python](https://github.com/audeering/opensmile-python)
- **Stars**: 200+
- **Описание**: Официальный Python wrapper для openSMILE
- **Features**: ComParE 2016 (6k+ features), GeMAPS, eGeMAPS
- **Лицензия**: audEERING License (коммерческое использование требует лицензии)
- **Применение**: Sprint 6 Voice Biomarkers — извлечение акустических признаков
- **Effort**: 3/10 — pip install opensmile
- **Рекомендация**: **НЕМЕДЛЕННО** интегрировать в WhisperService

```python
import opensmile
smile = opensmile.Smile(
    feature_set=opensmile.FeatureSet.eGeMAPSv02,
    feature_level=opensmile.FeatureLevel.Functionals,
)
features = smile.process_file('audio.wav')
```

---

#### G2. sleepecg ⭐⭐⭐
- **Repo**: [cbrnr/sleepecg](https://github.com/cbrnr/sleepecg)
- **Stars**: 125
- **Описание**: Sleep staging из ECG без EEG
- **Лицензия**: BSD-3 ✅ коммерчески совместима
- **Применение**: Sprint 7 Wearables — sleep staging из Apple Watch
- **Effort**: 5/10
- **Рекомендация**: Изучить для интеграции с HRV данными

```python
import sleepecg
# Classify sleep stages from ECG-derived features
stages = sleepecg.classify(rri, feature_extractor='time_frequency')
```

---

#### G3. causal-learn ⭐⭐⭐
- **Repo**: [py-why/causal-learn](https://github.com/py-why/causal-learn)
- **Stars**: 1,200+
- **Описание**: PC, GES, LiNGAM для causal discovery
- **Лицензия**: MIT ✅
- **Применение**: Улучшение CausalInsightsService
- **Effort**: 4/10
- **Рекомендация**: Сравнить с текущей реализацией, возможно заменить

```python
from causallearn.search.ConstraintBased.PC import pc
cg = pc(data, alpha=0.05, indep_test='fisherz')
```

---

#### G4. hrv-analysis ⭐⭐⭐
- **Repo**: [Aura-healthcare/hrv-analysis](https://github.com/Aura-healthcare/hrv-analysis)
- **Stars**: 500+
- **Описание**: HRV анализ из RR-интервалов
- **Лицензия**: GPLv3 ⚠️ (требует open source production code)
- **Альтернатива**: pyHRV (более permissive)
- **Применение**: Sprint 7 Wearables — stress detection, autonomic state
- **Effort**: 3/10

---

#### G5. depression-detect ⭐⭐
- **Repo**: [kykiefer/depression-detect](https://github.com/kykiefer/depression-detect)
- **Stars**: 100+
- **Описание**: CNN для детекции депрессии из речи (DAIC-WOZ dataset)
- **Лицензия**: MIT ✅
- **Применение**: Sprint 6 Voice Biomarkers — reference implementation
- **Effort**: 6/10 (требует адаптации)

---

#### G6. ICASSP2022-Depression ⭐⭐
- **Repo**: [speechandlanguageprocessing/ICASSP2022-Depression](https://github.com/speechandlanguageprocessing/ICASSP2022-Depression)
- **Stars**: 50+
- **Описание**: GRU/BiLSTM + EATD-Corpus для депрессии
- **Dataset**: 162 volunteers, audio + text
- **Лицензия**: Research
- **Применение**: Reference для мультимодальной детекции

---

### 2.2 MEDIUM PRIORITY — Изучить

#### G7. Stanford-STAGES
- **Repo**: [Stanford-STAGES/stanford-stages](https://github.com/Stanford-STAGES/stanford-stages)
- **Описание**: Automated sleep staging + narcolepsy identification
- **Применение**: Reference для clinical-grade staging

#### G8. DeepSleepNet
- **Repo**: [akaraspt/deepsleepnet](https://github.com/akaraspt/deepsleepnet)
- **Описание**: Classic CNN+LSTM для single-channel EEG
- **Цитирования**: IEEE TNSRE paper
- **Применение**: Benchmark architecture

#### G9. YASA (Yet Another Spindle Algorithm)
- **Repo**: raphaelvallat/yasa
- **Stars**: 473
- **Описание**: Комплексный анализ PSG
- **Применение**: Если получим EEG данные

#### G10. Flower (Federated Learning)
- **Repo**: [adap/flower](https://github.com/adap/flower)
- **Stars**: 4,000+
- **Описание**: Framework для federated learning
- **Лицензия**: Apache 2.0 ✅
- **Применение**: Sprint 11 Federated Learning

---

### 2.3 CBT Chatbots — Reference Implementations

| Repo | Описание | Tech Stack | Полезность |
|------|----------|------------|------------|
| [Kai-SelfCare-Chatbot](https://github.com/lookthatsmaria/Kai-SelfCare-Chatbot) | CBT с cognitive distortion detection | NLP, Text Classification | 7/10 |
| [conversational_mentalhealth_bot](https://github.com/cd-irvan/conversational_mentalhealth_bot) | Voice CBT с Whisper + OpenAI | Python, Whisper, GPT | 8/10 |
| [gpt3-cbt-therapist](https://github.com/fnakas/gpt3-cbt-therapist) | One-shot GPT-3 для CBT | GPT-3, Python | 6/10 |
| [Mental-Health-ChatBot](https://github.com/Huzaib/Mental-Health-ChatBot) | Rasa NLU для mental health | Rasa, Python | 5/10 |

**Рекомендация**: Изучить conversational_mentalhealth_bot как reference для Sprint 12.

---

### 2.4 Federated Learning Healthcare — Reference

| Repo | Описание | Применение |
|------|----------|------------|
| [Awesome-Healthcare-FL](https://github.com/monk1337/Aweome-Heathcare-Federated-Learning) | Curated papers list | Research |
| [private-ml-for-health](https://github.com/ipc-lab/private-ml-for-health) | Dopamine: DP + FL | Architecture reference |
| [Private-FL](https://github.com/mohres/Private-FL) | DPFL для medical imaging | Implementation reference |

---

## ЧАСТЬ 3: PAPERS WITH CODE — SOTA Benchmarks

### 3.1 Sleep Stage Classification Leaderboards

| Dataset | SOTA Model | Metric | Применимость |
|---------|------------|--------|--------------|
| [Sleep-EDF](https://paperswithcode.com/sota/sleep-stage-detection-on-sleep-edf) | SleePyCo | Accuracy | High — standard benchmark |
| [ISRUC-Sleep](https://paperswithcode.com/sota/sleep-stage-detection-on-isruc-sleep) | SLEEPER-DT | Accuracy | High — multi-channel |
| [SHHS](https://paperswithcode.com/sota/sleep-stage-detection-on-shhs) | Various | Accuracy | Medium — large dataset |
| [MASS SS3](https://paperswithcode.com/sota/sleep-stage-detection-on-mass-ss3) | Multiple | Accuracy | Medium |
| [DODH](https://paperswithcode.com/sota/sleep-stage-detection-on-dodh) | SimpleSleepNet | Accuracy | Medium |

### 3.2 Key Models to Study

1. **SleePyCo** — Current SOTA on Sleep-EDF, feature pyramid attention
2. **SLEEPER** — Graph-based transformer, SOTA on ISRUC
3. **SimpleSleepNet** — Lightweight, good for deployment
4. **Multi-head Attention** — General SOTA approach

**Рекомендация**: Benchmark SleePyCo architecture для нашего use case.

---

## ЧАСТЬ 4: РЕКОМЕНДАЦИИ ДЛЯ SLEEPCORE

### 4.1 Немедленные действия (Sprint 6)

| Действие | Приоритет | Effort | Impact |
|----------|-----------|--------|--------|
| Интегрировать opensmile-python | P0 | 3/10 | Высокий |
| Создать VoiceBiomarkerService | P0 | 5/10 | Высокий |
| Изучить depression-detect repo | P1 | 2/10 | Средний |
| Протестировать на DAIC-WOZ | P1 | 4/10 | Средний |

### 4.2 Sprint 7 Preparation

| Действие | Приоритет | Effort | Impact |
|----------|-----------|--------|--------|
| Изучить sleepecg architecture | P0 | 3/10 | Высокий |
| Изучить ECG-SleepNet paper | P0 | 2/10 | Высокий |
| Оценить hrv-analysis vs pyHRV | P1 | 2/10 | Средний |

### 4.3 Architecture Updates

| Изменение | Причина | Sprint |
|-----------|---------|--------|
| Добавить Emotion Regulation модуль | Paper P1.2 показал d=0.7-1.5 | 9 |
| Добавить Senior Mode | Paper P1.4 — пожилые отлично реагируют | 10 |
| Добавить Shift Worker Mode | Paper P1.9 — специфическая популяция | 10 |

### 4.4 Competitive Intelligence

**Угрозы**:
- LLM-based CBT-I активно исследуется (Paper P1.1)
- SOTA sleep staging быстро развивается

**Возможности**:
- Никто не внедрил CSD + Thompson Sampling + Causal
- Voice biomarkers в DTx = blue ocean
- Federated learning для глобального масштаба

---

## ЧАСТЬ 5: NEXT RESEARCH SCAN

### 5.1 Запланированные запросы (Week 4)

```yaml
pubmed:
  - "insomnia machine learning 2025"
  - "sleep wearable validation 2025"
  - "circadian rhythm digital intervention"

arxiv:
  - "transformer sleep EEG"
  - "federated learning time series"
  - "multimodal depression detection"

github:
  - "circadian rhythm python"
  - "sleep diary app"
  - "actigraphy analysis"

papers_with_code:
  - "depression detection audio"
  - "time series forecasting medical"
```

### 5.2 Tracked Repositories (автоматический мониторинг)

```yaml
watch_releases:
  - audeering/opensmile-python
  - cbrnr/sleepecg
  - py-why/causal-learn
  - adap/flower
  - raphaelvallat/yasa

watch_activity:
  - Stanford-STAGES/stanford-stages
  - speechandlanguageprocessing/ICASSP2022-Depression
```

---

## Источники

### PubMed
- [Digital AI-Enhanced CBT-I](https://pubmed.ncbi.nlm.nih.gov/40217715/)
- [Digital CBT-I Older Adults](https://pubmed.ncbi.nlm.nih.gov/40681664/)
- [Workplace dCBT-I + ER](https://pubmed.ncbi.nlm.nih.gov/39957531/)
- [OncoSleep Cancer](https://pubmed.ncbi.nlm.nih.gov/39987779/)
- [LLM for eCBT-I](https://pubmed.ncbi.nlm.nih.gov/41246294/)
- [Shift Workers Review](https://pubmed.ncbi.nlm.nih.gov/40585747/)

### arXiv
- [ECG-SleepNet](https://arxiv.org/abs/2412.01929)
- [Transparency Sleep Staging](https://arxiv.org/abs/2309.07156)
- [SleepPPG-Net2](https://arxiv.org/abs/2404.06869)
- [Cross-Modal Transformers](https://arxiv.org/abs/2208.06991)
- [Sleep AI Systematic Review](https://arxiv.org/abs/2405.11008)

### GitHub
- [opensmile-python](https://github.com/audeering/opensmile-python)
- [sleepecg](https://github.com/cbrnr/sleepecg)
- [causal-learn](https://github.com/py-why/causal-learn)
- [hrv-analysis](https://github.com/Aura-healthcare/hrv-analysis)
- [depression-detect](https://github.com/kykiefer/depression-detect)
- [Flower FL](https://github.com/adap/flower)
- [voiceome](https://github.com/jim-schwoebel/voiceome)

### Papers With Code
- [Sleep-EDF Benchmark](https://paperswithcode.com/sota/sleep-stage-detection-on-sleep-edf)
- [ISRUC-Sleep Benchmark](https://paperswithcode.com/sota/sleep-stage-detection-on-isruc-sleep)

---

*Generated by SleepCore Research Agent*
*Scan ID: 2026-W03-001*
*Next scan: 2026-W04*
