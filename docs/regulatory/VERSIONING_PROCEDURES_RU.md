# Процедуры версионирования и обновления SleepCore

**Версия документа:** 1.0
**Дата:** Январь 2026
**Соответствие:** ПП РФ №1684, Приказ Росздравнадзора №4472

---

## 1. Общие положения

### 1.1 Назначение

Настоящий документ устанавливает процедуры управления версиями и обновлениями программного обеспечения медицинского изделия SleepCore в соответствии с требованиями:

- Постановление Правительства РФ №1684 (регистрация медизделий)
- Приказ Росздравнадзора №4472 от 21.07.2025 (передача данных в АИС)
- ГОСТ МЭК 62304-2022 (жизненный цикл ПО медизделий)

### 1.2 Область применения

Документ применяется ко всем изменениям программного обеспечения SleepCore, включая:

- Исправление ошибок (bug fixes)
- Улучшения функциональности
- Обновления AI-алгоритмов
- Изменения безопасности
- Изменения регуляторных требований

---

## 2. Схема версионирования

### 2.1 Семантическое версионирование (SemVer)

```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]

Пример: 1.2.3-beta.1+build.456
         │ │ │    │        │
         │ │ │    │        └── Метаданные сборки
         │ │ │    └─────────── Пре-релизный идентификатор
         │ │ └──────────────── PATCH: исправления багов
         │ └────────────────── MINOR: новая функциональность
         └──────────────────── MAJOR: критические изменения
```

### 2.2 Правила инкремента версии

| Тип изменения | Инкремент | Пример |
|---------------|-----------|--------|
| Bug fix без изменения функциональности | PATCH | 1.0.0 → 1.0.1 |
| Новая функция, обратная совместимость | MINOR | 1.0.1 → 1.1.0 |
| Breaking changes | MAJOR | 1.1.0 → 2.0.0 |
| Изменение AI-алгоритма (улучшение) | MINOR | 1.1.0 → 1.2.0 |
| Изменение AI-алгоритма (новый подход) | MAJOR | 1.2.0 → 2.0.0 |

### 2.3 Пре-релизные версии

```
alpha.N  - Внутреннее тестирование
beta.N   - Ограниченное внешнее тестирование
rc.N     - Release Candidate (финальное тестирование)
```

---

## 3. Классификация изменений по ПП РФ №1684

### 3.1 Категории изменений

```
┌─────────────────────────────────────────────────────────────────────┐
│  КАТЕГОРИЯ 1: НЕФУНКЦИОНАЛЬНЫЕ ИЗМЕНЕНИЯ                            │
├─────────────────────────────────────────────────────────────────────┤
│  Примеры:                                                           │
│  - Изменение цвета интерфейса                                       │
│  - Изменение упаковки/маркировки                                    │
│  - Обновление документации                                          │
│  - Рефакторинг без изменения поведения                              │
│                                                                     │
│  Процедура: Уведомление Росздравнадзора                             │
│  Срок: Без ограничений                                              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  КАТЕГОРИЯ 2: ФУНКЦИОНАЛЬНЫЕ ИЗМЕНЕНИЯ                              │
├─────────────────────────────────────────────────────────────────────┤
│  Примеры:                                                           │
│  - Изменение алгоритмов расчёта                                     │
│  - Новые показания к применению                                     │
│  - Изменение материалов/компонентов                                 │
│  - Расширение функциональности                                      │
│                                                                     │
│  Процедура: Внесение изменений в реестр                             │
│  Требуется: Анализ влияния + протоколы испытаний                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  КАТЕГОРИЯ 3: ОБНОВЛЕНИЯ AI (без изменения назначения)              │
├─────────────────────────────────────────────────────────────────────┤
│  Примеры:                                                           │
│  - Дообучение модели на новых данных                                │
│  - Оптимизация гиперпараметров                                      │
│  - Улучшение точности предсказаний                                  │
│                                                                     │
│  Процедура: Передача в АИС Росздравнадзора                          │
│  Срок: 10 рабочих дней                                              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  КАТЕГОРИЯ 4: КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ                                 │
├─────────────────────────────────────────────────────────────────────┤
│  Примеры:                                                           │
│  - Изменение принципа действия                                      │
│  - Изменение назначения изделия                                     │
│  - Смена класса риска                                               │
│                                                                     │
│  Процедура: Новая государственная регистрация                       │
│  Требуется: Полный пакет документов                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Матрица определения категории

| Аспект изменения | Категория 1 | Категория 2 | Категория 3 | Категория 4 |
|------------------|-------------|-------------|-------------|-------------|
| UI/UX | Цвет, шрифт | Навигация | - | - |
| Алгоритмы | Рефакторинг | Новая логика | AI tune | Новый подход |
| Данные | Форматирование | Новые поля | AI data | Новые источники |
| Показания | - | Расширение | - | Изменение |
| Безопасность | Обновление зав. | Новые механизмы | - | - |

---

## 4. Процедура внесения изменений

### 4.1 Workflow изменений

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Request │───▶│ Review  │───▶│ Develop │───▶│  Test   │───▶│ Release │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
 Заявка на     Категория     Разработка     QA + Clinical   Развёртывание
 изменение     изменения     + Code Review  Validation      + AIS уведомление
```

### 4.2 Этапы процедуры

#### Этап 1: Инициация изменения

```typescript
interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  requestedAt: Date;
  justification: string;
  affectedComponents: string[];
  estimatedCategory: ChangeCategory;
}
```

#### Этап 2: Классификация и анализ

| Шаг | Ответственный | Результат |
|-----|---------------|-----------|
| Определение категории | Regulatory Affairs | Категория 1-4 |
| Анализ влияния | QA Team | Impact Assessment |
| Оценка рисков | Clinical Team | Risk Analysis |
| Утверждение | Change Control Board | Approval/Rejection |

#### Этап 3: Разработка

- Feature branch от `main`
- Соблюдение Secure Coding Guidelines
- Code Review обязателен
- Обновление документации

#### Этап 4: Тестирование

```
┌─────────────────────────────────────────────────────────────────────┐
│  ТЕСТОВАЯ ПИРАМИДА                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                    ┌───────────┐                                    │
│                    │   E2E     │  Clinical scenarios                │
│                    └─────┬─────┘                                    │
│                  ┌───────┴───────┐                                  │
│                  │  Integration  │  Component interactions          │
│                  └───────┬───────┘                                  │
│              ┌───────────┴───────────┐                              │
│              │      Unit Tests       │  Individual functions        │
│              └───────────────────────┘                              │
│                                                                     │
│  Требуемое покрытие: >80%                                           │
│  Регрессионное тестирование: Обязательно                            │
│  Clinical validation: Для категорий 2-4                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Этап 5: Релиз

| Действие | Срок | Ответственный |
|----------|------|---------------|
| Merge в main | T+0 | Developer |
| Сборка релиза | T+0 | CI/CD |
| Обновление CHANGELOG | T+0 | Developer |
| Развёртывание | T+1 | DevOps |
| Уведомление АИС | T+1 до T+10 | Regulatory |

---

## 5. Уведомление Росздравнадзора

### 5.1 Автоматическая передача в АИС

```typescript
// RoszdravnadzorAPIService.ts
async function notifyVersionChange(
  notification: IVersionChangeNotification
): Promise<IAISResponse> {
  const payload = {
    deviceRegistration: config.registrationNumber,
    previousVersion: notification.previousVersion,
    newVersion: notification.newVersion,
    changeCategory: notification.changeType,
    changeDescription: notification.description,
    impactAnalysis: notification.impactAnalysis,
    testProtocols: notification.testProtocolsAttached,
    effectiveDate: new Date().toISOString(),
  };

  return await submitToAIS(payload);
}
```

### 5.2 Сроки уведомления

| Категория | Срок уведомления | Метод |
|-----------|------------------|-------|
| Категория 1 | По факту | Уведомление |
| Категория 2 | До изменения | Заявление на внесение изменений |
| Категория 3 | 10 рабочих дней | АИС автоматически |
| Категория 4 | До изменения | Новая регистрация |

### 5.3 Содержание уведомления

```typescript
interface AISVersionNotification {
  // Идентификация изделия
  deviceName: string;
  registrationNumber: string;
  registryRecordNumber: string;

  // Информация о версии
  previousVersion: string;
  newVersion: string;
  changeDate: Date;

  // Классификация
  changeCategory: 'non_functional' | 'functional' | 'ai_update' | 'critical';

  // Описание
  changeDescription: string;
  changedComponents: string[];
  clinicalImpact: string;

  // Валидация
  testingPerformed: string[];
  validationResults: string;

  // Приложения
  impactAnalysisAttached: boolean;
  testProtocolsAttached: boolean;
  updatedDocumentationAttached: boolean;
}
```

---

## 6. Управление конфигурацией

### 6.1 Структура репозитория

```
sleepcore/
├── src/                    # Исходный код
├── tests/                  # Тесты
├── docs/                   # Документация
│   ├── regulatory/         # Регуляторная документация
│   └── technical/          # Техническая документация
├── config/                 # Конфигурации
├── CHANGELOG.md            # История изменений
├── VERSION                 # Текущая версия
└── package.json            # NPM метаданные
```

### 6.2 Git Workflow

```
main (protected)
  │
  ├── release/1.x.x
  │     │
  │     └── hotfix/1.x.x
  │
  └── develop
        │
        ├── feature/XXX-description
        └── bugfix/XXX-description
```

### 6.3 Правила для веток

| Ветка | Защита | Требования для merge |
|-------|--------|---------------------|
| main | Protected | PR + 2 approvals + tests pass |
| release/* | Protected | PR + 1 approval + tests pass |
| develop | Semi-protected | PR + 1 approval |
| feature/* | Open | Tests pass |

### 6.4 Формат CHANGELOG

```markdown
# Changelog

## [1.2.0] - 2026-01-15

### Added
- AdaptiveSleepRestrictionService with PLRNN personalization
- Sleep Need Questionnaire (MEQ-equivalent)
- JITAI adaptive scheduling

### Changed
- Improved TIB adjustment algorithm accuracy

### Fixed
- Race condition in session state management

### Security
- Updated dependencies for CVE-2026-XXXX

### Regulatory
- Category: 3 (AI update)
- AIS Notification: Submitted 2026-01-15
- Impact: Improved sleep efficiency prediction
```

---

## 7. Процедура экстренного обновления (Hotfix)

### 7.1 Критерии экстренного обновления

| Критерий | Описание |
|----------|----------|
| Security Critical | Уязвимость с CVSS >= 9.0 |
| Safety Critical | Риск для здоровья пациента |
| Compliance Critical | Нарушение регуляторных требований |
| Availability Critical | Полная недоступность сервиса |

### 7.2 Процедура Hotfix

```
┌─────────────────────────────────────────────────────────────────────┐
│  HOTFIX PROCEDURE (Expedited)                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  T+0h:   Issue identified → Security team notified                  │
│  T+1h:   Impact assessment → Hotfix branch created                  │
│  T+4h:   Fix developed → Expedited code review                      │
│  T+6h:   Critical tests passed → Deployment approved                │
│  T+8h:   Production deployment → Monitoring activated               │
│  T+24h:  Post-incident review → Documentation updated               │
│  T+10d:  AIS notification (if AI-related)                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.3 Отличия от стандартной процедуры

| Аспект | Стандартная | Hotfix |
|--------|-------------|--------|
| Code Review | 2 approvers | 1 approver |
| Testing | Full suite | Critical tests only |
| Documentation | Pre-release | Post-release (24h) |
| Change Board | Weekly meeting | Ad-hoc approval |
| AIS Notification | Pre-release | Post-release (10 days) |

---

## 8. Аудит и отчётность

### 8.1 Журнал версий

```typescript
interface VersionAuditRecord {
  version: string;
  releaseDate: Date;
  changeCategory: ChangeCategory;
  changesIncluded: string[];
  approvedBy: string;
  testResults: {
    unitTests: TestResult;
    integrationTests: TestResult;
    clinicalValidation?: TestResult;
  };
  aisNotification?: {
    submittedAt: Date;
    transactionId: string;
    status: 'pending' | 'accepted' | 'rejected';
  };
  deploymentInfo: {
    deployedAt: Date;
    deployedBy: string;
    environment: 'staging' | 'production';
  };
}
```

### 8.2 Отчёты для регулятора

| Отчёт | Периодичность | Содержание |
|-------|---------------|------------|
| Version History | По запросу | Все версии с изменениями |
| Change Log | Ежеквартально | Сводка изменений за период |
| Incident Report | По факту | Экстренные обновления |
| AI Update Report | 10 дней после релиза | Изменения AI-компонентов |

### 8.3 Хранение записей

| Тип записи | Срок хранения |
|------------|---------------|
| Исходный код (все версии) | Срок действия РУ + 10 лет |
| Тестовые протоколы | Срок действия РУ + 10 лет |
| Change Requests | 10 лет |
| AIS уведомления | 10 лет |
| Аудиторские отчёты | 10 лет |

---

## 9. Приложения

### Приложение А: Шаблон Change Request

```markdown
# Change Request

**CR ID:** CR-2026-XXX
**Date:** YYYY-MM-DD
**Requested By:** [Name]

## Description
[Описание предлагаемого изменения]

## Justification
[Обоснование необходимости изменения]

## Affected Components
- [ ] Component 1
- [ ] Component 2

## Proposed Category
- [ ] Category 1 (Non-functional)
- [ ] Category 2 (Functional)
- [ ] Category 3 (AI Update)
- [ ] Category 4 (Critical)

## Impact Analysis
[Анализ влияния на систему]

## Risk Assessment
[Оценка рисков]

## Testing Requirements
[Требования к тестированию]

## Approvals
- [ ] Technical Lead
- [ ] QA Lead
- [ ] Regulatory Affairs
- [ ] Change Control Board
```

### Приложение Б: Чек-лист релиза

- [ ] Версия обновлена в package.json
- [ ] CHANGELOG.md обновлён
- [ ] Все тесты проходят (>80% coverage)
- [ ] Code review завершён
- [ ] Документация обновлена
- [ ] Категория изменения определена
- [ ] Impact analysis выполнен (для категорий 2-4)
- [ ] Regulatory approval получен (для категорий 2-4)
- [ ] Staging deployment успешен
- [ ] Production deployment успешен
- [ ] AIS уведомление отправлено (для категории 3)
- [ ] Post-release monitoring активирован

---

*Документ подготовлен в соответствии с требованиями ПП РФ №1684 и Приказа Росздравнадзора №4472*
