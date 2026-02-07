# Federated Learning для SleepCore: Комплексный анализ

> **Дата:** 2026-02-07
> **Версия:** 1.0
> **Статус:** Research / Pre-implementation
> **Классификация:** IEC 62304 — Требует review перед внедрением

---

## Executive Summary

Данный документ содержит научно-технический анализ предложения по внедрению федеративного обучения (Federated Learning, FL) в платформу SleepCore. Анализ основан на исследовании научных публикаций и регуляторных документов 2025-2026 годов.

**Ключевые выводы:**
- FL для SleepCore **технически возможен** и **научно обоснован**
- Оригинальное предложение **требует дополнения** критическими компонентами
- **Регуляторных барьеров нет**, но требуется документация по IEC 62304
- **Telegram bot несовместим** с on-device FL — требуются native apps

---

## Содержание

1. [Контекст проекта](#1-контекст-проекта)
2. [Анализ исходного предложения](#2-анализ-исходного-предложения)
3. [Научно-технический анализ](#3-научно-технический-анализ)
4. [Недостающие компоненты](#4-недостающие-компоненты)
5. [Технологический стек](#5-технологический-стек)
6. [Регуляторный анализ](#6-регуляторный-анализ)
7. [Пробелы в знаниях](#7-пробелы-в-знаниях)
8. [Рекомендации по внедрению](#8-рекомендации-по-внедрению)
9. [Источники](#9-источники)

---

## 1. Контекст проекта

### 1.1 Что такое SleepCore

SleepCore — **медицинское ПО класса IIa (ЕС) / класса II (FDA)** для лечения хронической бессонницы через CBT-I.

| Аспект | Требование |
|--------|------------|
| Шифрование | AES-256-GCM (HIPAA/GDPR) |
| Audit trail | 6 лет хранения (21 CFR Part 11) |
| Safety | Crisis Detection всегда активен |
| Стандарты | IEC 62304, ISO 13485, ISO 14971 |
| Целевые рынки | FDA 510(k), CE Mark, DiGA |

### 1.2 Исходное предложение

```typescript
interface IFederatedSleepModel {
  // Модель обучается на устройствах пользователей
  localTraining(userDevice: Device): ModelGradients;

  // Только градиенты (не данные!) отправляются на сервер
  aggregateGradients(gradients: ModelGradients[]): GlobalModel;

  // Differential privacy гарантирует анонимность
  addNoise(gradients: ModelGradients, epsilon: number): PrivateGradients;
}
```

**Заявленный результат:** Модель, обученная на миллионах людей со всего мира, без нарушения приватности, точнее любого конкурента.

---

## 2. Анализ исходного предложения

### 2.1 Матрица оценки

| Компонент | Научная корректность | Уверенность | Комментарий |
|-----------|---------------------|-------------|-------------|
| Идея FL | ✅ ВЕРНО | ВЫСОКАЯ | Подтверждено production-системами |
| Privacy rationale | ✅ ВЕРНО | ВЫСОКАЯ | GDPR/HIPAA compliance |
| Gradient-only claim | ⚠️ НЕПОЛНО | ВЫСОКАЯ | Gradient inversion attacks |
| DP usage | ✅ ВЕРНО | ВЫСОКАЯ | Стандартная практика |
| Accuracy claim | ❌ ПРЕУВЕЛИЧЕНО | ВЫСОКАЯ | FL не гарантирует SOTA |

### 2.2 Детальный разбор утверждений

#### Утверждение 1: «Централизация невозможна для глобального продукта»

**Оценка:** ⚠️ ЧАСТИЧНО ВЕРНО

Централизация юридически возможна при согласии, но:
- GDPR, HIPAA, PIPL (Китай), LGPD (Бразилия) создают трансграничные ограничения
- Data residency требования в разных юрисдикциях
- Высокие compliance затраты

**Корректная формулировка:**
> Централизация регуляторно фрагментирована и плохо масштабируется глобально.

#### Утверждение 2: «Федеративное обучение решает проблему»

**Оценка:** ✅ ВЕРНО

Подтверждённые production-системы:
- NVIDIA Clara: 20+ госпиталей в EXAM initiative
- Google Gboard: миллиарды устройств
- Apple: Differential Privacy в iOS

Конкретное применение для сна:
- ScienceDirect 2025: FL для классификации стадий сна

#### Утверждение 3: «Передаются только градиенты — не данные»

**Оценка:** ⚠️ ТЕХНИЧЕСКИ ВЕРНО, НО НЕПОЛНО

**Риски:**
- Gradient inversion attacks (ICCV 2025, Geminio)
- Membership inference attacks
- Model inversion attacks

**Требуется:**
- Secure Aggregation (шифрование градиентов)
- Differential Privacy (добавление шума)
- Update validation (защита от poisoning)

#### Утверждение 4: «Differential Privacy гарантирует анонимность»

**Оценка:** ✅ ВЕРНО

**Рекомендуемые параметры для медицины:**

| Параметр | Рекомендация | Источник |
|----------|--------------|----------|
| Epsilon (ε) | ≤ 1 | American Bar Association 2023 |
| Delta (δ) | ≤ 1/n² | Стандартная практика |

**Trade-off:**
- ε → 0: Высокая приватность, низкая точность
- ε → ∞: Низкая приватность, высокая точность

#### Утверждение 5: «Модель станет точнее любого конкурента»

**Оценка:** ❌ НЕНАУЧНОЕ УСИЛЕНИЕ

**Почему это проблема:**
- Точность зависит от архитектуры, качества данных, стратегии агрегации
- Non-IID данные могут снижать качество модели
- FL сама по себе не гарантирует SOTA

**Корректная формулировка:**
> FL создаёт потенциал для формирования одной из самых репрезентативных моделей сна при правильной реализации.

---

## 3. Научно-технический анализ

### 3.1 Federated Learning в здравоохранении (2025)

**Текущее состояние:**
- FL активно используется в медицинской визуализации
- NVIDIA FLARE — production-ready framework
- 20+ госпиталей участвовали в COVID-19 EXAM initiative

**Применение для данных о сне:**
- ScienceDirect 2025: FL для sleep staging с сохранением приватности
- Wearables (Apple Watch, Fitbit) с FDA clearance для sleep apnea

### 3.2 Privacy-Preserving Mechanisms

| Механизм | Описание | Статус |
|----------|----------|--------|
| Secure Aggregation | Шифрование градиентов, сервер не видит отдельные updates | Обязателен |
| Differential Privacy | Добавление калиброванного шума | Обязателен |
| Homomorphic Encryption | Вычисления над зашифрованными данными | Опционален |
| Multi-Party Computation | Распределённые вычисления | Опционален |

### 3.3 Non-IID проблема

**Суть проблемы:**
- Пользователи имеют разные паттерны сна
- Разные устройства (Fitbit, Apple Watch, Garmin)
- Разная тяжесть бессонницы (ISI 8-28)
- Разные хронотипы (жаворонки vs совы)

**Решения (2025):**
- Персонализированные головы (FedPer, pFedMe)
- Кластеризация клиентов (FedGMC)
- Адаптивная агрегация (FedAvg ↔ FedSGD)
- Knowledge Distillation

### 3.4 Gradient Inversion Attacks

**Угрозы (2025):**
- Geminio (ICCV 2025): Language-guided gradient inversion
- MMGIA: Атаки на мультимодальные данные
- +39% улучшение атак для TinyBERT-6

**Защита:**
- Shadow Defense: PSNR разница 3.73, SSIM 0.2
- Three-stage defense pipeline
- Targeted noise injection

---

## 4. Недостающие компоненты

### 4.1 Secure Aggregation

```typescript
interface ISecureAggregation {
  /** Шифрование update перед отправкой */
  encryptUpdate(
    update: ModelUpdate,
    publicKey: CryptoKey
  ): EncryptedUpdate;

  /** Агрегация зашифрованных updates */
  aggregateEncrypted(
    updates: EncryptedUpdate[]
  ): GlobalModel;
}
```

**Почему критично:** Без Secure Aggregation сервер видит отдельные градиенты, что позволяет gradient inversion attacks.

### 4.2 Non-IID Handling

```typescript
interface IPersonalizedFL {
  /** Общий энкодер для всех пользователей */
  sharedEncoder: SharedModel;

  /** Персональная голова для каждого пользователя */
  personalHead: PersonalizedModel;

  /** Кластеризация похожих пользователей */
  clusterClients(
    features: UserFeatures[]
  ): ClientCluster[];
}
```

**Почему критично:** Стандартный FedAvg плохо работает с гетерогенными данными.

### 4.3 Update Validation

```typescript
interface IUpdateValidation {
  /** Валидация update */
  validateUpdate(update: ModelUpdate): ValidationResult;

  /** Детекция poisoning attacks */
  detectPoisoning(
    update: ModelUpdate,
    history: UpdateHistory
  ): boolean;

  /** Trust score для клиента */
  computeTrustScore(client: ClientId): number;
}
```

**Почему критично:** Защита от malicious clients и data poisoning.

### 4.4 Client Weighting

```typescript
weight = dataVolume × signalQuality × deviceReliability × complianceScore
```

**Почему критично:** Не все устройства и пользователи одинаково качественные.

---

## 5. Технологический стек

### 5.1 Доступные фреймворки

| Фреймворк | Платформы | Статус | Рекомендация |
|-----------|-----------|--------|--------------|
| NVIDIA FLARE | Server-side | Production | Для агрегации |
| TensorFlow Federated | Server + Simulation | Production | Для прототипирования |
| FedKit | Android + iOS | Research | Для cross-platform |
| Flower | Cross-platform | Production | Альтернатива FedKit |

### 5.2 On-Device Training

**Android:**
- TensorFlow Lite: On-device training поддерживается
- GPU/NPU ускорение через NNAPI
- **Статус:** Production-ready

**iOS:**
- Core ML: Через FedKit или custom implementation
- Neural Engine ускорение
- **Статус:** Требует дополнительной работы

### 5.3 Рекомендуемый стек для SleepCore

```
┌─────────────────────────────────────────────────┐
│                 Backend (Server)                 │
├─────────────────────────────────────────────────┤
│  NVIDIA FLARE или Flower                        │
│  + Secure Aggregation                           │
│  + PostgreSQL (audit trail)                     │
│  + Redis (session state)                        │
└─────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────┐
│                 Mobile Clients                   │
├─────────────────────────────────────────────────┤
│  Android: TensorFlow Lite + FedKit              │
│  iOS: Core ML + FedKit                          │
│  + Local Differential Privacy                   │
│  + Secure Enclave (key storage)                 │
└─────────────────────────────────────────────────┘
```

---

## 6. Регуляторный анализ

### 6.1 FDA (США)

| Аспект | Статус | Источник |
|--------|--------|----------|
| FL-специфичные требования | **НЕТ** | Нет специфического guidance |
| AI/ML Medical Devices | 1,250+ одобрено (07/2025) | FDA Database |
| PCCP для обновлений | Поддерживается | FDA AI/ML Guidance |
| QMSR | Обязателен с 02/02/2026 | FDA |

**Рекомендации:**
1. Документировать FL как часть lifecycle (IEC 62304)
2. Включить в Risk Analysis (ISO 14971)
3. Использовать PCCP для обновлений модели
4. Обеспечить audit trail для всех FL операций

### 6.2 CE Mark / EU MDR

| Аспект | Статус | Источник |
|--------|--------|----------|
| FL-специфичные требования | **НЕТ** | Нет специфического guidance |
| AI Act + MDR взаимодействие | FAQ 06/2025 | AIB + MDCG |
| IEC 62304 для SaMD | Обязателен | EU MDR |

**Рекомендации:**
1. Соответствие AI Act (высокий риск = требования к данным)
2. Документация FL в техническом файле
3. Post-market surveillance для drift detection

### 6.3 Специфика для SleepCore

```
┌─────────────────────────────────────────────────────────────┐
│  FL компонент ДОЛЖЕН соответствовать:                        │
├─────────────────────────────────────────────────────────────┤
│  ✓ IEC 62304 (Software lifecycle)                           │
│  ✓ ISO 14971 (Risk management)                              │
│  ✓ ISO 13485 (QMS)                                          │
│  ✓ 21 CFR Part 11 (Audit trail) — 6 лет хранения            │
│  ✓ HIPAA/GDPR (Data protection)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Пробелы в знаниях

### 7.1 Что не удалось найти

| Вопрос | Статус | Влияние на проект |
|--------|--------|-------------------|
| Production FL для данных о сне | НЕ НАЙДЕНО | Нет референсов |
| Конкретные epsilon для sleep data | НЕ НАЙДЕНО | Требуется эксперимент |
| FL + POMDP интеграция | НЕ НАЙДЕНО | Требуется R&D |
| FL + Thompson Sampling | НЕ НАЙДЕНО | Требуется R&D |
| Telegram + FL | НЕ НАЙДЕНО | Несовместимо |
| DiGA требования к FL | НЕ НАЙДЕНО | Нет специфики |

### 7.2 Области низкой уверенности

| Область | Уверенность | Причина |
|---------|-------------|---------|
| iOS on-device training | СРЕДНЯЯ | Core ML требует адаптации |
| Epsilon выбор для CBT-I | СРЕДНЯЯ | Нет бенчмарков |
| Non-IID стратегия для сна | СРЕДНЯЯ | Нет готовых решений |
| Regulatory approval timeline | НИЗКАЯ | Нет прецедентов FL SaMD |

---

## 8. Рекомендации по внедрению

### 8.1 Исправленный интерфейс

```typescript
/**
 * Federated Learning Module for SleepCore
 * IEC 62304 Class C — Safety-Critical Component
 *
 * @requires AES-256-GCM encryption for all transmissions
 * @requires Audit trail for all FL operations (6-year retention)
 */
interface IFederatedSleepModel {
  // === Core FL Operations ===

  /** On-device training with TF Lite / Core ML */
  localTraining(
    userDevice: Device,
    localData: SleepDiaryEntry[]
  ): EncryptedUpdate;

  /** Secure aggregation with MPC */
  secureAggregate(
    updates: EncryptedUpdate[],
    validationResults: ValidationResult[]
  ): GlobalModel;

  // === Privacy ===

  /** Differential Privacy with configurable epsilon */
  addDifferentialPrivacy(
    update: ModelUpdate,
    epsilon: number,  // Recommended: ε ≤ 1 for medical data
    delta: number     // Recommended: δ ≤ 1/n²
  ): PrivateUpdate;

  // === Security ===

  /** Validate updates against poisoning attacks */
  validateUpdate(
    update: ModelUpdate,
    clientTrustScore: number
  ): ValidationResult;

  /** Detect gradient inversion attempts */
  detectInversionAttempt(
    aggregatedGradients: ModelGradients
  ): SecurityAlert | null;

  // === Personalization (Non-IID) ===

  /** Personalized head for user-specific patterns */
  personalizeHead(
    userDevice: Device,
    chronotype: 'morningness' | 'eveningness' | 'intermediate',
    isiSeverity: 'none' | 'subthreshold' | 'moderate' | 'severe'
  ): PersonalizedModel;

  /** Cluster similar users for better aggregation */
  clusterClients(
    clientFeatures: ClientFeature[]
  ): ClientCluster[];

  // === Audit (21 CFR Part 11) ===

  /** ICH E6(R3) compliant logging */
  logFLOperation(
    operation: FLOperationType,
    metadata: FLOperationMetadata
  ): AuditEntry;
}
```

### 8.2 Архитектурная диаграмма

```
┌─────────────────────────────────────────────────────────────┐
│                     SleepCore FL Architecture                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   User A     │    │   User B     │    │   User N     │   │
│  │  (Android)   │    │    (iOS)     │    │  (Android)   │   │
│  │              │    │              │    │              │   │
│  │ ┌──────────┐ │    │ ┌──────────┐ │    │ ┌──────────┐ │   │
│  │ │Local Data│ │    │ │Local Data│ │    │ │Local Data│ │   │
│  │ │ (7 days) │ │    │ │ (7 days) │ │    │ │ (7 days) │ │   │
│  │ └────┬─────┘ │    │ └────┬─────┘ │    │ └────┬─────┘ │   │
│  │      ↓       │    │      ↓       │    │      ↓       │   │
│  │ ┌──────────┐ │    │ ┌──────────┐ │    │ ┌──────────┐ │   │
│  │ │TF Lite   │ │    │ │Core ML   │ │    │ │TF Lite   │ │   │
│  │ │Training  │ │    │ │Training  │ │    │ │Training  │ │   │
│  │ └────┬─────┘ │    │ └────┬─────┘ │    │ └────┬─────┘ │   │
│  │      ↓       │    │      ↓       │    │      ↓       │   │
│  │ ┌──────────┐ │    │ ┌──────────┐ │    │ ┌──────────┐ │   │
│  │ │  + DP    │ │    │ │  + DP    │ │    │ │  + DP    │ │   │
│  │ │ (ε ≤ 1)  │ │    │ │ (ε ≤ 1)  │ │    │ │ (ε ≤ 1)  │ │   │
│  │ └────┬─────┘ │    │ └────┬─────┘ │    │ └────┬─────┘ │   │
│  └──────┼───────┘    └──────┼───────┘    └──────┼───────┘   │
│         │                   │                   │           │
│         └─────────┬─────────┴─────────┬─────────┘           │
│                   ↓                   ↓                     │
│         ┌─────────────────────────────────────┐             │
│         │      Secure Aggregation Server       │             │
│         │                                      │             │
│         │  ┌────────────────────────────────┐ │             │
│         │  │ 1. Validate Updates            │ │             │
│         │  │ 2. Detect Poisoning            │ │             │
│         │  │ 3. Aggregate (Encrypted)       │ │             │
│         │  │ 4. Audit Log (6 years)         │ │             │
│         │  └────────────────────────────────┘ │             │
│         └─────────────────┬───────────────────┘             │
│                           ↓                                 │
│         ┌─────────────────────────────────────┐             │
│         │         Global Sleep Model           │             │
│         │  + Personalized Heads per Cluster    │             │
│         └─────────────────────────────────────┘             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Фазы внедрения

| Фаза | Описание | Риски | Timeline |
|------|----------|-------|----------|
| 1 | Research + PoC на Android | Низкий | Q2 2026 |
| 2 | Secure Aggregation + DP | Средний | Q3 2026 |
| 3 | iOS интеграция (Core ML) | Высокий | Q4 2026 |
| 4 | Non-IID + Personalization | Средний | Q1 2027 |
| 5 | Regulatory submission | Высокий | Q2 2027 |

### 8.4 Safety Considerations

```
⚠️ КРИТИЧЕСКИЕ ТРЕБОВАНИЯ (IEC 62304 Class C):

1. FL НЕ ДОЛЖЕН влиять на:
   - MIN_TIB = 5 часов (безопасность SRT)
   - Crisis Detection (всегда локальный)
   - ISI cutoffs (клинически валидированы)

2. FL модель используется ТОЛЬКО для:
   - Улучшения персонализации рекомендаций
   - Предсказания оптимального времени интервенций
   - НЕ для клинических решений напрямую

3. Audit trail ОБЯЗАТЕЛЕН для:
   - Каждого FL round
   - Каждого model update
   - Каждого epsilon выбора
```

### 8.5 Совместимость с текущей архитектурой

| Компонент SleepCore | Совместимость | Комментарий |
|--------------------|---------------|-------------|
| CogniCore POMDP | ⚠️ ТРЕБУЕТ R&D | FL + POMDP не документирован |
| Thompson Sampling | ⚠️ ТРЕБУЕТ R&D | FL + TS не документирован |
| SleepRestrictionEngine | ✅ НЕ ЗАТРАГИВАЕТСЯ | Safety constraints локальные |
| CrisisDetectionService | ✅ НЕ ЗАТРАГИВАЕТСЯ | Всегда локальный |
| Telegram Bot | ❌ НЕ ПРИМЕНИМО | FL требует native apps |

---

## 9. Источники

### 9.1 Federated Learning — General

| Источник | URL | Уверенность |
|----------|-----|-------------|
| Frontiers: FL for regulatory cooperation | [Link](https://www.frontiersin.org/journals/drug-safety-and-regulation/articles/10.3389/fdsfr.2025.1579922/full) | ВЫСОКАЯ |
| NVIDIA Clara FL | [Link](https://developer.nvidia.com/blog/federated-learning-clara/) | ВЫСОКАЯ |
| PMC: FL in Smart Healthcare | [Link](https://pmc.ncbi.nlm.nih.gov/articles/PMC11728217/) | ВЫСОКАЯ |

### 9.2 Sleep Data & FL

| Источник | URL | Уверенность |
|----------|-----|-------------|
| ScienceDirect: FL for sleep staging | [Link](https://www.sciencedirect.com/science/article/abs/pii/S1746809425005439) | ВЫСОКАЯ |
| MDPI: Wearables and Digital Twins | [Link](https://www.mdpi.com/2079-9292/14/23/4699) | СРЕДНЯЯ |

### 9.3 Privacy & Security

| Источник | URL | Уверенность |
|----------|-----|-------------|
| arXiv: DP for medical deep learning | [Link](https://arxiv.org/html/2506.00660) | ВЫСОКАЯ |
| Nature: Privacy-preserving FL | [Link](https://www.nature.com/articles/s41598-025-97565-4) | ВЫСОКАЯ |
| ICCV 2025: Geminio (gradient inversion) | [Link](https://openaccess.thecvf.com/content/ICCV2025/papers/Shan_Geminio_Language-Guided_Gradient_Inversion_Attacks_in_Federated_Learning_ICCV_2025_paper.pdf) | ВЫСОКАЯ |
| arXiv: Shadow Defense | [Link](https://arxiv.org/abs/2506.15711) | ВЫСОКАЯ |

### 9.4 Non-IID & Personalization

| Источник | URL | Уверенность |
|----------|-----|-------------|
| Springer: Adaptive FL aggregation | [Link](https://link.springer.com/article/10.1186/s40537-025-01169-8) | ВЫСОКАЯ |
| PMC: Personalized FL for medical | [Link](https://pmc.ncbi.nlm.nih.gov/articles/PMC12314237/) | СРЕДНЯЯ |
| MDPI: FED-EHR framework | [Link](https://www.mdpi.com/2079-9292/14/16/3261) | СРЕДНЯЯ |

### 9.5 On-Device Training

| Источник | URL | Уверенность |
|----------|-----|-------------|
| Google: LiteRT on-device training | [Link](https://ai.google.dev/edge/litert/conversion/tensorflow/build/ondevice_training) | ВЫСОКАЯ |
| arXiv: FedKit (Android + iOS) | [Link](https://arxiv.org/html/2402.10464v1) | СРЕДНЯЯ |
| Flower: FL on Android | [Link](https://flower.ai/blog/2021-12-15-federated-learning-on-android-devices-with-flower/) | ВЫСОКАЯ |

### 9.6 Regulatory

| Источник | URL | Уверенность |
|----------|-----|-------------|
| Complizen: FDA AI/ML 2025 | [Link](https://www.complizen.ai/post/fda-ai-machine-learning-medical-devices-review-2025) | ВЫСОКАЯ |
| Hogan Lovells: FDA 2026 Agenda | [Link](https://www.hoganlovells.com/en/publications/fda-device-guidance-agenda-what-to-watch-in-2026) | ВЫСОКАЯ |
| Hardian Health: ISO standards for SaMD | [Link](https://www.hardianhealth.com/insights/iso-standards-for-software-medical-device) | ВЫСОКАЯ |
| Foley: HIPAA compliance for AI | [Link](https://www.foley.com/insights/publications/2025/05/hipaa-compliance-ai-digital-health-privacy-officers-need-know/) | ВЫСОКАЯ |

---

## Заключение

### Финальный вердикт

| Аспект | Оценка |
|--------|--------|
| Идея | **Научно состоятельна** |
| Архитектура | **Требует дополнения** |
| Формулировки | **Требуют научного смягчения** |
| Готовность к внедрению | **Средняя** — требуется R&D фаза |

### Ключевые выводы

1. **FL для SleepCore возможен** — научная база и технологии существуют
2. **Оригинальный интерфейс неполон** — отсутствуют Secure Aggregation, Non-IID handling, Update Validation
3. **Утверждение о превосходстве точности необоснованно** — FL не гарантирует SOTA
4. **Регуляторных барьеров для FL нет** — но требуется документация как часть IEC 62304
5. **Telegram bot несовместим с on-device FL** — требуются native apps

### Следующие шаги

1. [ ] Провести PoC на Android с TF Lite
2. [ ] Определить epsilon эмпирически для sleep data
3. [ ] Исследовать FL + POMDP интеграцию
4. [ ] Разработать native app для FL
5. [ ] Подготовить документацию для регуляторов

---

*Документ подготовлен: 2026-02-07*
*Версия: 1.0*
*Автор: Claude Code Analysis*
*Review required: Medical Director, CTO*
