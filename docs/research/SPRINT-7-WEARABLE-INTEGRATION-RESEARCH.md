# Sprint 7: Wearable Integration Research Report

> **Дата**: Январь 2026
> **Версия**: 1.0
> **Автор**: Claude Opus 4.5 Research
> **Цель**: Комплексное исследование интеграции носимых устройств для SleepCore

---

## Содержание

1. [Executive Summary](#executive-summary)
2. [Samsung Galaxy Watch](#1-samsung-galaxy-watch)
3. [Сравнение платформ](#2-сравнение-платформ)
4. [Health Connect (Google)](#3-health-connect-google)
5. [Технические решения для HRV/Sleep Staging](#4-технические-решения)
6. [GitHub Repositories](#5-github-repositories)
7. [Privacy & Compliance](#6-privacy--compliance)
8. [Архитектурные рекомендации](#7-архитектурные-рекомендации)
9. [Рекомендуемый план реализации](#8-рекомендуемый-план-реализации)

---

## Executive Summary

### Ключевые выводы

| Аспект | Рекомендация |
|--------|--------------|
| **Приоритетная платформа** | Health Connect (Android) + Terra API (универсальный) |
| **Лучший доступ к HRV** | Garmin > WHOOP > Fitbit > Samsung > Apple |
| **Raw PPG/ECG** | Samsung Privileged SDK (требует партнёрство) |
| **Sleep staging без EEG** | SleepECG + HRV features (76% accuracy) |
| **Compliance** | HIPAA BAA через Terra/Vital |
| **Стоимость** | Fitbit/Garmin/WHOOP бесплатно; Terra $399/мес |

### Критические ограничения

1. **Apple HealthKit** - нет backend API, только on-device
2. **Samsung Raw PPG** - требует партнёрское соглашение
3. **Oura Ring** - требует активную подписку ($5.99/мес) для API
4. **Google Fit** - закрывается 30 июня 2025

---

## 1. Samsung Galaxy Watch

### 1.1 Samsung Health SDK Suite

Samsung предоставляет три уровня SDK доступа:

| SDK | Данные | Доступ |
|-----|--------|--------|
| **Samsung Health Data SDK** | Sleep stages, HR, SpO2, stress | Партнёрский запрос |
| **Samsung Health Sensor SDK** | Raw PPG (Green/IR/Red), IBI, Accelerometer | Партнёрский запрос |
| **Samsung Privileged Health SDK** | Raw ECG, Advanced BIA, EDA | Только для enterprise |

### 1.2 Доступные метрики

```typescript
interface SamsungHealthData {
  // Samsung Health Data SDK
  sleep: {
    stages: 'AWAKE' | 'LIGHT' | 'DEEP' | 'REM';
    duration: number;
    efficiency: number;
    bloodOxygen: number[];  // Continuous SpO2 during sleep
    skinTemperature: number[];
  };
  heartRate: {
    bpm: number;
    ibi: number[];  // Inter-beat intervals (до 4 значений/точка)
    timestamp: Date;
  };
  stress: {
    score: number;  // 0-100
  };

  // Samsung Health Sensor SDK (v1.4.0, July 2025)
  rawPPG: {
    green: number[];   // 25 Hz
    infrared: number[];
    red: number[];
  };
  rawECG: number[];  // Только Privileged SDK
  accelerometer: {
    x: number;
    y: number;
    z: number;
  };
  eda: number[];  // Electrodermal Activity (новое в v1.4.0)
}
```

### 1.3 Health Connect Integration

Samsung Health синхронизируется с Health Connect начиная с версии 6.22.5 (октябрь 2022).

```kotlin
// Пример чтения Samsung Health через Health Connect
val sleepSessions = healthConnectClient.readRecords(
    ReadRecordsRequest(
        recordType = SleepSessionRecord::class,
        timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
    )
)
```

### 1.4 Ограничения Samsung

| Проблема | Решение |
|----------|---------|
| SDK_POLICY_ERROR для raw PPG | Требуется партнёрское соглашение |
| Нет Node.js/Python SDK | Только Android (Kotlin/Java) |
| Raw data только на Watch | Данные обрабатываются на часах |

**Источники**:
- [Samsung Health Data SDK](https://developer.samsung.com/health/data/overview.html)
- [Samsung Health Sensor SDK](https://developer.samsung.com/health/sensor/overview.html)
- [Accessing Samsung Health via Health Connect](https://developer.samsung.com/health/blog/en/accessing-samsung-health-data-through-health-connect)

---

## 2. Сравнение платформ

### 2.1 Сводная таблица

| Характеристика | Apple Watch | Samsung | Fitbit | Garmin | WHOOP | Oura |
|----------------|-------------|---------|--------|--------|-------|------|
| **Backend API** | Нет | Health Connect | REST API | Webhooks | REST + Webhooks | REST API |
| **HRV доступ** | SDNN only | IBI raw | RMSSD | Полный | RMSSD | Полный |
| **Sleep stages** | Да | Да | Да | Да | Да | Да |
| **Raw PPG** | Нет | Партнёры | Нет | Нет | Нет | Нет |
| **OAuth 2.0** | N/A | N/A | Да | Да | Да | Да |
| **Rate limits** | N/A | N/A | 150/час/user | Без лимитов | Без лимитов | Без лимитов |
| **Стоимость API** | N/A | Бесплатно | Бесплатно | Бесплатно* | Бесплатно** | Бесплатно*** |
| **Одобрение** | N/A | Партнёр | Нет | Партнёр | Нет | Нет |

\* Требует одобрения партнёрской программы
\** Требует WHOOP membership
\*** Требует Oura membership ($5.99/мес)

### 2.2 Детальное сравнение по HRV

| Платформа | HRV Метрики | Частота | Качество для исследований |
|-----------|-------------|---------|---------------------------|
| **Garmin** | RMSSD, SDNN, HRV Status, Stress | 24/7 | Высокое |
| **WHOOP** | RMSSD, HRV trends | Ночью | Высокое |
| **Oura** | RMSSD, HRV balance | Ночью | Высокое |
| **Fitbit** | RMSSD (Premium) | Ночью | Среднее |
| **Samsung** | IBI (raw) | По запросу | Высокое (raw) |
| **Apple** | SDNN | По запросу | Среднее |

### 2.3 Рекомендация по выбору

```
Для клинического исследования:
├── Garmin (лучший HRV + бесплатный API после одобрения)
├── WHOOP (премиум данные, но требует подписку)
└── Fitbit (самый простой API, большая база пользователей)

Для consumer app:
├── Health Connect (все Android устройства)
├── Terra API (универсальный, но платный)
└── Fitbit Web API (простая интеграция)
```

**Источники**:
- [Momentum AI: Which Wearables Are Developers Using](https://www.themomentum.ai/blog/which-wearables-are-developers-using-in-health-apps-and-why)
- [Spike API: Fitbit vs Health Connect](https://www.spikeapi.com/blog/fitbit-api-vs-health-connect-healthkit)

---

## 3. Health Connect (Google)

### 3.1 Обзор

Health Connect - это **новый стандарт Google** для унификации health data на Android. Начиная с Android 14, встроен в систему.

```
┌─────────────────────────────────────────────────────────┐
│                    Health Connect                        │
├─────────────────────────────────────────────────────────┤
│  Samsung Health  │  Fitbit  │  Google Fit  │  Другие   │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Ваше приложение │
                    └─────────────────┘
```

### 3.2 Поддерживаемые типы данных

| Категория | Типы данных |
|-----------|-------------|
| **Sleep** | SleepSessionRecord, SleepStageRecord |
| **Heart** | HeartRateRecord, HeartRateVariabilityRmssdRecord |
| **Vitals** | OxygenSaturationRecord, RespiratoryRateRecord |
| **Body** | WeightRecord, BodyTemperatureRecord (NEW 2024) |
| **Activity** | StepsRecord, DistanceRecord, ExerciseSessionRecord |

### 3.3 Критические ограничения

| Ограничение | Влияние на SleepCore |
|-------------|---------------------|
| **Только Android SDK** | Нет Node.js/Python SDK |
| **Нет REST API** | Backend не может напрямую запрашивать данные |
| **On-device only** | Данные должны передаваться через мобильное приложение |
| **Google Fit deprecation** | Все переходят на Health Connect до 30.06.2025 |

### 3.4 Решение: Health Connect Webhook Bridge

Существует open-source решение для отправки Health Connect данных на сервер:

```typescript
// health-connect-webhook (GitHub: mcnaveen/health-connect-webhook)
// Android app → Health Connect → Your webhook

// Настройка webhook URL
const webhookConfig = {
  url: 'https://api.sleepcore.app/wearable/healthconnect',
  interval: 3600, // каждый час
  dataTypes: ['sleep', 'heartRate', 'hrv']
};
```

### 3.5 Интеграция через React Native

```typescript
// react-native-health-connect (GitHub: matinzd/react-native-health-connect)
import { initialize, readRecords } from 'react-native-health-connect';

await initialize();

const sleepData = await readRecords('SleepSession', {
  timeRangeFilter: {
    operator: 'between',
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString(),
  },
});
```

**Источники**:
- [Health Connect Android Developers](https://developer.android.com/health-and-fitness/health-connect)
- [Health Connect Jetpack SDK Beta (March 2025)](https://android-developers.googleblog.com/2025/03/health-connect-jetpack-sdk-now-in-beta.html)
- [GitHub: react-native-health-connect](https://github.com/matinzd/react-native-health-connect)

---

## 4. Технические решения

### 4.1 Sleep Staging из PPG/HRV (без EEG)

#### SleepECG

**Описание**: Python пакет для sleep staging на основе heart rate variability.

```python
# pip install sleepecg

import sleepecg

# Загрузка данных (поддерживает NSRR datasets: MESA, SHHS)
record = sleepecg.read_record('path/to/ecg_data')

# Детекция heartbeats (Pan-Tompkins алгоритм)
heartbeats = sleepecg.detect_heartbeats(record.ecg, record.fs)

# Sleep staging с pre-trained classifier
stages = sleepecg.stage_sleep(
    heartbeats=heartbeats,
    fs=record.fs,
    classifier='lstm'  # или 'gru', 'svm'
)

# stages: 0=Wake, 1=N1, 2=N2, 3=N3, 4=REM
```

**Производительность**:
- Accuracy: 76.36% (4-class)
- Cohen's Kappa: 0.65
- Сравнимо с EEG-based при использовании transfer learning

**Ограничения для Samsung**:
- SleepECG работает с ECG, а не PPG напрямую
- Требуется конвертация PPG → IBI → HRV features

#### Альтернатива: HRV Features + Custom Model

```python
# Использование hrv-analysis для extraction features
from hrvanalysis import get_time_domain_features, get_frequency_domain_features

# IBI данные с Samsung Watch
ibi_intervals = [...]  # в миллисекундах

# Time domain features
time_features = get_time_domain_features(ibi_intervals)
# Включает: mean_nni, sdnn, rmssd, pnni_50, sdsd

# Frequency domain features
freq_features = get_frequency_domain_features(ibi_intervals)
# Включает: lf, hf, lf_hf_ratio, vlf, total_power
```

### 4.2 HRV Analysis Libraries

| Библиотека | Stars | Особенности |
|------------|-------|-------------|
| **[hrv-analysis](https://github.com/Aura-healthcare/hrv-analysis)** | 500+ | Kubios-validated, простой API |
| **[NeuroKit2](https://github.com/neuropsychology/NeuroKit)** | 3k+ | 124 HRV метрики, ECG/PPG/EDA |
| **[pyHRV](https://github.com/PGomes92/pyhrv)** | 400+ | 78 параметров, BVP support |
| **[Polar-HRV](https://github.com/iitis/Polar-HRV-data-analysis)** | 50+ | Специально для Polar H10 |

### 4.3 Рекомендуемый Pipeline для SleepCore

```python
# sleepcore/wearable/hrv_processor.py

from hrvanalysis import (
    remove_outliers,
    remove_ectopic_beats,
    get_time_domain_features,
    get_frequency_domain_features,
    get_geometrical_features
)
from sleepecg import stage_sleep, detect_heartbeats
import numpy as np

class HRVSleepProcessor:
    """Процессор для sleep staging из wearable HRV данных."""

    def __init__(self):
        self.sampling_rate = 25  # Samsung PPG: 25 Hz

    def process_ibi(self, ibi_ms: list[float]) -> dict:
        """Обработка Inter-Beat Intervals."""
        # 1. Очистка данных
        ibi_clean = remove_outliers(ibi_ms, low_rri=300, high_rri=2000)
        ibi_clean = remove_ectopic_beats(ibi_clean, method='malik')

        # 2. Time domain features (для Real-time)
        time_features = get_time_domain_features(ibi_clean)

        # 3. Frequency domain (для Sleep quality)
        freq_features = get_frequency_domain_features(
            ibi_clean,
            method='welch',
            sampling_frequency=4.0  # После интерполяции
        )

        return {
            'rmssd': time_features['rmssd'],
            'sdnn': time_features['sdnn'],
            'pnn50': time_features['pnni_50'],
            'lf_hf_ratio': freq_features['lf_hf_ratio'],
            'hf_power': freq_features['hf'],  # Parasympathetic
            'sleep_quality_index': self._calculate_sqi(time_features, freq_features)
        }

    def stage_sleep_from_hr(self, hr_series: np.ndarray, timestamps: np.ndarray) -> list:
        """4-class sleep staging из HR time series."""
        # Конвертация HR → IBI
        ibi = 60000 / hr_series  # ms

        # Sleep staging
        stages = stage_sleep(
            heartbeats=timestamps,
            recording_start=timestamps[0],
            recording_end=timestamps[-1]
        )

        return stages  # 0=Wake, 1=Light, 2=Deep, 3=REM

    def _calculate_sqi(self, time_f: dict, freq_f: dict) -> float:
        """Sleep Quality Index на основе HRV."""
        # Высокий HF power + высокий RMSSD = хорошее восстановление
        hf_norm = min(freq_f['hf'] / 1000, 1.0)
        rmssd_norm = min(time_f['rmssd'] / 100, 1.0)

        return (hf_norm * 0.6 + rmssd_norm * 0.4) * 100
```

**Источники**:
- [SleepECG Paper (JOSS 2023)](https://www.theoj.org/joss-papers/joss.05411/10.21105.joss.05411.pdf)
- [NeuroKit2 HRV Pipeline](https://pmc.ncbi.nlm.nih.gov/articles/PMC9307944/)
- [hrv-analysis PyPI](https://pypi.org/project/hrv-analysis/)

---

## 5. GitHub Repositories

### 5.1 Health Connect / Samsung Health

| Repository | Описание | Stars |
|------------|----------|-------|
| [health-connect-webhook](https://github.com/mcnaveen/health-connect-webhook) | Bridge Health Connect → Webhooks | 100+ |
| [react-native-health-connect](https://github.com/matinzd/react-native-health-connect) | React Native wrapper | 400+ |
| [TerraAndroid](https://github.com/tryterra/TerraAndroid) | Terra SDK для Android | 50+ |
| [Samsung-Health-API](https://github.com/klangenk/Samsung-Health-API) | Proxy для Samsung Health | 30+ |
| [rn-samsung-health](https://github.com/GaneshSinghPapola/rn-samsung-health) | React Native Samsung SDK | 20+ |

### 5.2 HRV Analysis

| Repository | Описание | Stars |
|------------|----------|-------|
| [hrv-analysis](https://github.com/Aura-healthcare/hrv-analysis) | Kubios-validated HRV | 500+ |
| [NeuroKit2](https://github.com/neuropsychology/NeuroKit) | Neurophysiological signals | 3k+ |
| [pyHRV](https://github.com/PGomes92/pyhrv) | HRV toolbox | 400+ |
| [Polar-HRV-data-analysis](https://github.com/iitis/Polar-HRV-data-analysis) | Polar H10 HRV | 50+ |

### 5.3 Sleep Staging

| Repository | Описание | Stars |
|------------|----------|-------|
| [sleepecg](https://github.com/cbrnr/sleepecg) | ECG-based sleep staging | 100+ |
| [YASA](https://github.com/raphaelvallat/yasa) | PSG analysis (EEG-based) | 500+ |
| [sleep_analysis](https://github.com/mad-lab-fau/sleep_analysis) | Multi-modal staging | 100+ |
| [sleep_classifiers](https://github.com/ojwalch/sleep_classifiers) | Apple Watch staging | 200+ |
| [AutoSleepScorer](https://github.com/skjerns/AutoSleepScorer) | Deep learning staging | 150+ |

### 5.4 Apple Health Export

| Repository | Описание | Stars |
|------------|----------|-------|
| [healthkit-on-fhir](https://github.com/microsoft/healthkit-on-fhir) | HealthKit → FHIR Server | 100+ |
| [Health Auto Export](https://www.healthexportapp.com/) | iOS app → REST API | App Store |

---

## 6. Privacy & Compliance

### 6.1 HIPAA Compliance

```
┌─────────────────────────────────────────────────────────┐
│                    HIPAA Applicability                   │
├─────────────────────────────────────────────────────────┤
│ Consumer wearable app (standalone)     → NOT covered    │
│ Data shared with healthcare provider   → COVERED        │
│ SleepCore as clinical DTx             → COVERED         │
└─────────────────────────────────────────────────────────┘
```

**Требования для SleepCore**:

| Требование | Реализация |
|------------|------------|
| **Encryption at rest** | AES-256 для SQLite/PostgreSQL |
| **Encryption in transit** | TLS 1.3 для всех API |
| **Access controls** | Role-based (patient, clinician) |
| **Audit logs** | Все доступы к PHI логируются |
| **BAA** | Требуется с Terra/Vital если используем |
| **Data minimization** | Хранить только необходимое |

### 6.2 GDPR Compliance

| Требование | Реализация |
|------------|------------|
| **Explicit consent** | Opt-in для каждого типа данных |
| **Right to erasure** | DELETE /users/:id/wearable-data |
| **Data portability** | Export в JSON/CSV |
| **Breach notification** | 72 часа (vs 60 дней HIPAA) |
| **DPO** | Назначить Data Protection Officer |

### 6.3 Архитектура для Compliance

```
┌──────────────────────────────────────────────────────────────┐
│                     SleepCore Backend                         │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │  Wearable   │───▶│   Privacy   │───▶│  Encrypted  │       │
│  │   Adapter   │    │   Filter    │    │   Storage   │       │
│  └─────────────┘    └─────────────┘    └─────────────┘       │
│        │                  │                   │               │
│        │                  ▼                   │               │
│        │          ┌─────────────┐             │               │
│        │          │ Audit Trail │             │               │
│        │          │    (logs)   │             │               │
│        │          └─────────────┘             │               │
│        │                                      │               │
│        ▼                                      ▼               │
│  ┌─────────────┐                      ┌─────────────┐        │
│  │ Data        │                      │ HRV/Sleep   │        │
│  │ Anonymizer  │─────────────────────▶│ Processing  │        │
│  │ (research)  │                      │             │        │
│  └─────────────┘                      └─────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

**Источники**:
- [MedSafe: HIPAA for Wearables](https://medsafe.com/hipaa-compliance/does-hipaa-apply-to-wearable-health-technology/)
- [Paubox: HIPAA Wearable Compliance](https://www.paubox.com/blog/hipaa-compliance-in-wearable-devices)

---

## 7. Архитектурные рекомендации

### 7.1 Universal WearableAdapter Interface

```typescript
// packages/sleepcore/src/wearable/WearableAdapter.ts

export interface WearableDataPoint {
  timestamp: Date;
  source: WearableSource;
  type: WearableDataType;
  value: number | object;
  quality: number;  // 0-100, уверенность в данных
}

export enum WearableSource {
  SAMSUNG_HEALTH = 'samsung_health',
  FITBIT = 'fitbit',
  GARMIN = 'garmin',
  APPLE_HEALTH = 'apple_health',
  WHOOP = 'whoop',
  OURA = 'oura',
  HEALTH_CONNECT = 'health_connect',
  TERRA = 'terra',  // Aggregator
}

export enum WearableDataType {
  HEART_RATE = 'heart_rate',
  HRV_RMSSD = 'hrv_rmssd',
  HRV_SDNN = 'hrv_sdnn',
  SLEEP_STAGE = 'sleep_stage',
  SLEEP_DURATION = 'sleep_duration',
  SLEEP_EFFICIENCY = 'sleep_efficiency',
  SPO2 = 'spo2',
  RESPIRATORY_RATE = 'respiratory_rate',
  SKIN_TEMPERATURE = 'skin_temperature',
  STEPS = 'steps',
  STRESS_SCORE = 'stress_score',
}

export interface SleepSession {
  id: string;
  userId: string;
  source: WearableSource;
  startTime: Date;
  endTime: Date;
  stages: SleepStage[];
  metrics: {
    totalDuration: number;      // minutes
    efficiency: number;         // 0-100%
    latency: number;           // minutes to fall asleep
    waso: number;              // Wake After Sleep Onset
    remDuration: number;
    deepDuration: number;
    lightDuration: number;
    awakeDuration: number;
    averageHR: number;
    lowestHR: number;
    averageHRV: number;
    respiratoryRate?: number;
    spo2Average?: number;
  };
  quality: number;  // Data quality score
}

export interface SleepStage {
  startTime: Date;
  endTime: Date;
  stage: 'AWAKE' | 'LIGHT' | 'DEEP' | 'REM';
}

export interface WearableAdapter {
  // Идентификация
  readonly source: WearableSource;
  readonly name: string;

  // Подключение
  connect(userId: string, credentials: OAuthCredentials): Promise<boolean>;
  disconnect(userId: string): Promise<void>;
  isConnected(userId: string): Promise<boolean>;

  // Данные
  getSleepSessions(userId: string, from: Date, to: Date): Promise<SleepSession[]>;
  getHeartRateData(userId: string, from: Date, to: Date): Promise<WearableDataPoint[]>;
  getHRVData(userId: string, from: Date, to: Date): Promise<WearableDataPoint[]>;

  // Real-time (если поддерживается)
  subscribeToUpdates?(userId: string, callback: (data: WearableDataPoint) => void): void;

  // Webhooks (для Garmin, WHOOP)
  handleWebhook?(payload: unknown): Promise<WearableDataPoint[]>;
}

export interface OAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string[];
}
```

### 7.2 Реализация адаптеров

```typescript
// packages/sleepcore/src/wearable/adapters/FitbitAdapter.ts

export class FitbitAdapter implements WearableAdapter {
  readonly source = WearableSource.FITBIT;
  readonly name = 'Fitbit';

  private baseUrl = 'https://api.fitbit.com';

  async getSleepSessions(userId: string, from: Date, to: Date): Promise<SleepSession[]> {
    const token = await this.getToken(userId);

    const response = await fetch(
      `${this.baseUrl}/1.2/user/-/sleep/date/${formatDate(from)}/${formatDate(to)}.json`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const data = await response.json();
    return this.mapFitbitSleepToSleepSession(data.sleep);
  }

  async getHRVData(userId: string, from: Date, to: Date): Promise<WearableDataPoint[]> {
    const token = await this.getToken(userId);

    // Fitbit HRV requires Premium subscription
    const response = await fetch(
      `${this.baseUrl}/1/user/-/hrv/date/${formatDate(from)}/${formatDate(to)}.json`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const data = await response.json();
    return data.hrv.map(point => ({
      timestamp: new Date(point.dateTime),
      source: this.source,
      type: WearableDataType.HRV_RMSSD,
      value: point.value.dailyRmssd,
      quality: 85
    }));
  }

  private mapFitbitSleepToSleepSession(fitbitSleep: any[]): SleepSession[] {
    return fitbitSleep.map(sleep => ({
      id: sleep.logId.toString(),
      userId: '',  // Заполняется выше
      source: this.source,
      startTime: new Date(sleep.startTime),
      endTime: new Date(sleep.endTime),
      stages: this.mapFitbitStages(sleep.levels?.data || []),
      metrics: {
        totalDuration: sleep.duration / 60000,
        efficiency: sleep.efficiency,
        latency: sleep.minutesToFallAsleep,
        waso: sleep.minutesAwake,
        remDuration: sleep.levels?.summary?.rem?.minutes || 0,
        deepDuration: sleep.levels?.summary?.deep?.minutes || 0,
        lightDuration: sleep.levels?.summary?.light?.minutes || 0,
        awakeDuration: sleep.levels?.summary?.wake?.minutes || 0,
        averageHR: 0,  // Требует отдельный запрос
        lowestHR: 0,
        averageHRV: 0,
      },
      quality: 80
    }));
  }
}
```

### 7.3 WearableService (Фасад)

```typescript
// packages/sleepcore/src/wearable/WearableService.ts

export class WearableService {
  private adapters: Map<WearableSource, WearableAdapter> = new Map();
  private userConnections: Map<string, WearableSource[]> = new Map();

  constructor(
    private readonly db: Database,
    private readonly encryptionService: EncryptionService
  ) {
    // Регистрация адаптеров
    this.registerAdapter(new FitbitAdapter());
    this.registerAdapter(new GarminAdapter());
    this.registerAdapter(new TerraAdapter());  // Универсальный через Terra API
  }

  async connectDevice(
    userId: string,
    source: WearableSource,
    authCode: string
  ): Promise<boolean> {
    const adapter = this.adapters.get(source);
    if (!adapter) throw new Error(`Adapter ${source} not registered`);

    // OAuth exchange
    const credentials = await this.exchangeAuthCode(source, authCode);

    // Encrypt and store
    const encryptedCreds = this.encryptionService.encrypt(JSON.stringify(credentials));
    await this.db.saveWearableConnection(userId, source, encryptedCreds);

    return adapter.connect(userId, credentials);
  }

  async getSleepData(userId: string, days: number = 7): Promise<SleepSession[]> {
    const connections = await this.getUserConnections(userId);
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    const allSessions: SleepSession[] = [];

    for (const source of connections) {
      const adapter = this.adapters.get(source);
      if (!adapter) continue;

      try {
        const sessions = await adapter.getSleepSessions(userId, from, to);
        allSessions.push(...sessions);
      } catch (error) {
        console.error(`Failed to get sleep from ${source}:`, error);
      }
    }

    // Deduplicate by date (prefer higher quality source)
    return this.deduplicateSessions(allSessions);
  }

  async getHRVForSleepAnalysis(userId: string, date: Date): Promise<{
    rmssd: number;
    trend: 'improving' | 'stable' | 'declining';
    sleepQualityCorrelation: number;
  }> {
    const connections = await this.getUserConnections(userId);
    const hrvData: WearableDataPoint[] = [];

    for (const source of connections) {
      const adapter = this.adapters.get(source);
      if (!adapter) continue;

      const data = await adapter.getHRVData(userId,
        new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000),  // 30 days
        date
      );
      hrvData.push(...data);
    }

    // Calculate trend
    const recentRMSSD = hrvData.slice(-7).map(d => d.value as number);
    const previousRMSSD = hrvData.slice(-14, -7).map(d => d.value as number);

    const recentAvg = recentRMSSD.reduce((a, b) => a + b, 0) / recentRMSSD.length;
    const previousAvg = previousRMSSD.reduce((a, b) => a + b, 0) / previousRMSSD.length;

    return {
      rmssd: recentAvg,
      trend: recentAvg > previousAvg * 1.05 ? 'improving'
           : recentAvg < previousAvg * 0.95 ? 'declining'
           : 'stable',
      sleepQualityCorrelation: this.calculateCorrelation(hrvData, userId)
    };
  }
}
```

### 7.4 Backend vs Mobile App Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Рекомендуемая архитектура                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Вариант A: Backend-first (REST APIs)                          │
│   ─────────────────────────────────────                         │
│   ✅ Fitbit, Garmin, WHOOP, Oura                                │
│   ❌ Apple Health, Samsung (on-device)                          │
│                                                                  │
│   Вариант B: Mobile App + Sync                                  │
│   ────────────────────────────────                              │
│   ✅ Все платформы через Health Connect / HealthKit             │
│   ⚠️ Требует мобильное приложение                               │
│                                                                  │
│   Вариант C: Hybrid (Рекомендуется)                             │
│   ─────────────────────────────────                             │
│   • Backend: Fitbit, Garmin, WHOOP через REST/Webhooks          │
│   • Mobile: Samsung, Apple через Health Connect/HealthKit       │
│   • Aggregator: Terra API как fallback                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Детальная схема Hybrid подхода:

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Fitbit     │     │   Garmin     │     │    WHOOP     │
│   Cloud      │     │   Connect    │     │   Cloud      │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │ REST API           │ Webhooks           │ REST API
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                   SleepCore Backend                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │              WearableService                     │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │    │
│  │  │ Fitbit   │ │ Garmin   │ │ WHOOP    │        │    │
│  │  │ Adapter  │ │ Adapter  │ │ Adapter  │        │    │
│  │  └──────────┘ └──────────┘ └──────────┘        │    │
│  │  ┌──────────┐ ┌──────────┐                     │    │
│  │  │ Terra    │ │ Health   │ ◄── Mobile sync     │    │
│  │  │ Adapter  │ │ Connect  │                     │    │
│  │  └──────────┘ └──────────┘                     │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                              ▲
                              │ REST API + Webhooks
                              │
┌─────────────────────────────┴───────────────────────────┐
│              SleepCore Mobile App                        │
│  ┌──────────────────┐    ┌──────────────────┐          │
│  │  Health Connect  │    │   Apple HealthKit │          │
│  │     Reader       │    │      Reader       │          │
│  └────────┬─────────┘    └────────┬─────────┘          │
│           │                       │                     │
│           ▼                       ▼                     │
│  ┌──────────────────────────────────────────┐          │
│  │           Background Sync Service         │          │
│  └──────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
                              ▲
                              │ On-device access
                              │
┌─────────────────────────────┴───────────────────────────┐
│  ┌──────────────┐        ┌──────────────┐              │
│  │   Samsung    │        │    Apple     │              │
│  │    Watch     │        │    Watch     │              │
│  └──────────────┘        └──────────────┘              │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Рекомендуемый план реализации

### Phase 1: MVP (2-3 недели)

| Задача | Приоритет | Сложность |
|--------|-----------|-----------|
| WearableAdapter interface | P0 | Низкая |
| FitbitAdapter (REST API) | P0 | Средняя |
| OAuth flow в Telegram Mini App | P0 | Средняя |
| Basic sleep data display | P0 | Низкая |

**Почему Fitbit первый**:
- Самый простой REST API
- Не требует партнёрского одобрения
- Большая база пользователей
- Бесплатный доступ

### Phase 2: Расширение (2-3 недели)

| Задача | Приоритет | Сложность |
|--------|-----------|-----------|
| GarminAdapter (Webhooks) | P1 | Средняя |
| WHOOPAdapter | P1 | Низкая |
| HRV processing pipeline | P1 | Высокая |
| Integration с Digital Twin | P1 | Высокая |

### Phase 3: Health Connect (3-4 недели)

| Задача | Приоритет | Сложность |
|--------|-----------|-----------|
| React Native app scaffold | P1 | Высокая |
| Health Connect integration | P1 | Средняя |
| Background sync service | P1 | Средняя |
| Samsung Health через HC | P2 | Низкая |

### Phase 4: Advanced (4+ недели)

| Задача | Приоритет | Сложность |
|--------|-----------|-----------|
| SleepECG integration | P2 | Высокая |
| HRV-based sleep quality prediction | P2 | Высокая |
| Terra API fallback | P3 | Средняя |
| Apple HealthKit (iOS app) | P3 | Высокая |

### Оценка ресурсов

| Вариант | Время | Покрытие устройств |
|---------|-------|-------------------|
| **Только Fitbit** | 2 недели | 15% рынка |
| **Fitbit + Garmin + WHOOP** | 4 недели | 35% рынка |
| **+ Health Connect** | 8 недель | 70% Android |
| **+ Apple HealthKit** | 12 недель | 95% рынка |
| **Terra API** | 3 недели | 80% рынка (платно) |

### Рекомендация

**Для быстрого старта**: Terra API ($399/мес) покрывает большинство устройств одним интеграционным усилием.

**Для полного контроля**: Fitbit → Garmin → Health Connect → HealthKit последовательно.

---

## Приложения

### A. API Endpoints Reference

| Platform | Auth | Base URL | Rate Limit |
|----------|------|----------|------------|
| Fitbit | OAuth 2.0 | api.fitbit.com | 150/hour/user |
| Garmin | OAuth 1.0a | apis.garmin.com | No limit |
| WHOOP | OAuth 2.0 | api.prod.whoop.com | No limit |
| Oura | OAuth 2.0 | api.ouraring.com | No limit |
| Terra | API Key | api.tryterra.co | By plan |

### B. HRV Reference Ranges

| Metric | Poor | Average | Good | Excellent |
|--------|------|---------|------|-----------|
| RMSSD | <20ms | 20-40ms | 40-70ms | >70ms |
| SDNN | <50ms | 50-100ms | 100-150ms | >150ms |
| LF/HF | >2.0 | 1.0-2.0 | 0.5-1.0 | <0.5 |

### C. Sleep Stage Duration (Adults)

| Stage | Normal % | SleepCore Target |
|-------|----------|------------------|
| Light (N1+N2) | 50-60% | Monitor only |
| Deep (N3) | 15-25% | Maximize |
| REM | 20-25% | Protect |
| Wake | <5% | Minimize |

---

## Источники

### Samsung
- [Samsung Health Data SDK](https://developer.samsung.com/health/data/overview.html)
- [Samsung Health Sensor SDK](https://developer.samsung.com/health/sensor/overview.html)
- [Samsung Privileged Health SDK](https://developer.samsung.com/health/privileged/overview.html)

### Health Connect
- [Health Connect Android Developers](https://developer.android.com/health-and-fitness/health-connect)
- [Health Connect Jetpack SDK Beta](https://android-developers.googleblog.com/2025/03/health-connect-jetpack-sdk-now-in-beta.html)

### APIs
- [Fitbit Web API](https://dev.fitbit.com/build/reference/web-api/)
- [Garmin Health API](https://developer.garmin.com/gc-developer-program/health-api/)
- [WHOOP Developer](https://developer.whoop.com/)
- [Oura API](https://cloud.ouraring.com/v2/docs)
- [Terra API](https://docs.tryterra.co/)
- [Vital API](https://www.tryvital.com/)

### Libraries
- [hrv-analysis (PyPI)](https://pypi.org/project/hrv-analysis/)
- [SleepECG (JOSS)](https://www.theoj.org/joss-papers/joss.05411/10.21105.joss.05411.pdf)
- [NeuroKit2](https://neuropsychology.github.io/NeuroKit/)
- [YASA](https://github.com/raphaelvallat/yasa)

### Compliance
- [HIPAA for Wearables](https://medsafe.com/hipaa-compliance/does-hipaa-apply-to-wearable-health-technology/)
- [GDPR vs HIPAA](https://censinet.com/perspectives/gdpr-vs-hipaa-cloud-phi-compliance-differences)

### GitHub Repositories
- [health-connect-webhook](https://github.com/mcnaveen/health-connect-webhook)
- [react-native-health-connect](https://github.com/matinzd/react-native-health-connect)
- [sleep_analysis](https://github.com/mad-lab-fau/sleep_analysis)
- [sleep_classifiers](https://github.com/ojwalch/sleep_classifiers)

---

> **Следующий шаг**: Реализация WearableAdapter interface и FitbitAdapter как MVP.
