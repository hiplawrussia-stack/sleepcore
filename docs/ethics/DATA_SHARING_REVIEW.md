# Data Sharing Review — SleepCore

**Документ:** Data Sharing Review для IRB submission
**Версия:** 1.0
**Дата:** 2026-02-07
**Статус:** Готов к подаче

---

## 1. Обзор проекта

### 1.1. Название исследования

**Русский:** Эффективность цифровой когнитивно-поведенческой терапии бессонницы (dCBT-I) через Telegram: пилотное исследование

**English:** Efficacy of Digital Cognitive Behavioral Therapy for Insomnia (dCBT-I) via Telegram: A Pilot Study

### 1.2. Описание системы

SleepCore — цифровой терапевт (Digital Therapeutic, DTx) для лечения хронической бессонницы, доставляемый через Telegram мессенджер. Система использует искусственный интеллект для персонализации когнитивно-поведенческой терапии бессонницы (CBT-I).

### 1.3. Классификация устройства

| Рынок | Классификация | Статус |
|-------|---------------|--------|
| Россия | Класс IIa (Росздравнадзор) | В процессе |
| ЕС | Class IIa (MDR 2017/745) | Планируется |
| США | Class II (FDA 510(k)) | Планируется |

---

## 2. Данные, собираемые системой

### 2.1. Категории данных

| Категория | Примеры | Классификация | Хранение |
|-----------|---------|---------------|----------|
| **Идентификаторы** | Telegram User ID (псевдонимизированный) | PII | Зашифровано |
| **Клинические данные** | ISI scores, дневник сна, SE, SOL, WASO | PHI | Зашифровано |
| **Поведенческие данные** | Время ответов, adherence, engagement | Non-PII | Зашифровано |
| **Терапевтические данные** | Пройденные модули, рекомендации | PHI | Зашифровано |
| **Системные данные** | Логи, ошибки, audit trail | Non-PII | Зашифровано |

### 2.2. Не собираемые данные

Система НЕ собирает:
- Настоящие имена (если не введены пользователем)
- Контактные данные (email, телефон)
- Геолокацию
- IP адреса (не логируются)
- Данные других приложений
- Финансовые данные

### 2.3. Опционально собираемые данные (с отдельным согласием)

| Данные | Условие сбора | Использование |
|--------|---------------|---------------|
| HRV (wearable) | Интеграция устройства | Биомаркер качества сна |
| Голосовые записи | Голосовой дневник | Анализ speech biomarkers |

---

## 3. Третьи стороны и data sharing

### 3.1. Третьи стороны с доступом к данным

| Сторона | Тип данных | Цель | DPA подписан |
|---------|------------|------|--------------|
| **Telegram** | Зашифрованные сообщения | Доставка контента | Telegram ToS |
| **Hetzner** (хостинг) | Зашифрованные данные | Хранение | ✅ GDPR DPA |
| **Sentry** (мониторинг) | Anonymized errors | Отладка | ✅ GDPR DPA |
| **Anthropic** (AI) | Опционально, anonymized | Генерация контента | ✅ Enterprise |

### 3.2. Данные, передаваемые третьим сторонам

| Сторона | Что передаётся | Что НЕ передаётся |
|---------|----------------|-------------------|
| Telegram | Текст сообщений (E2E шифрование) | Метаданные о здоровье |
| Sentry | Stack traces без PII | User ID, ISI scores, diary |
| Anthropic | Anonymized prompts (опционально) | Любые идентификаторы |

### 3.3. Механизмы защиты при передаче

- **TLS 1.3** для всех соединений
- **AES-256-GCM** для данных at rest
- **Data minimization** — только необходимый минимум
- **Pseudonymization** — Telegram ID вместо имён

---

## 4. Data Storage and Management

### 4.1. Инфраструктура хранения

| Компонент | Провайдер | Локация | Сертификации |
|-----------|-----------|---------|--------------|
| Основной сервер | Hetzner | Germany (EU) | ISO 27001 |
| База данных | PostgreSQL (self-hosted) | Germany (EU) | - |
| Бэкапы | Hetzner | Germany (EU) | ISO 27001 |

### 4.2. Шифрование

| Слой | Метод | Ключ |
|------|-------|------|
| At rest | AES-256-GCM | ENCRYPTION_MASTER_KEY |
| In transit | TLS 1.3 | Let's Encrypt |
| Backups | AES-256-GCM | BACKUP_ENCRYPTION_KEY |

### 4.3. Retention Policy

| Тип данных | Срок хранения | Основание |
|------------|---------------|-----------|
| Clinical data | 6 лет после завершения | FDA 21 CFR Part 11 |
| Audit logs | 6 лет | IEC 62304 |
| Сообщения бота | 1 год после завершения | Функциональность |
| Anonymized research data | Бессрочно | Научная ценность |

### 4.4. Data Deletion

Пользователь может запросить удаление через:
- Команда `/delete_my_data` в боте
- Email на dpo@awfond.ru
- Письменный запрос

Удаление выполняется в течение 30 дней (GDPR Article 17).

---

## 5. Data Security Risk Assessment

### 5.1. Идентифицированные риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Unauthorized access | Низкая | Высокое | MFA, audit logs, encryption |
| Data breach | Низкая | Высокое | Encryption at rest, monitoring |
| Telegram API compromise | Очень низкая | Высокое | End-to-end encryption |
| Insider threat | Низкая | Среднее | Access controls, audit |
| Data loss | Очень низкая | Среднее | Daily backups, geo-redundancy |

### 5.2. Меры безопасности

| Мера | Статус | Описание |
|------|--------|----------|
| Encryption at rest | ✅ Внедрено | AES-256-GCM |
| Encryption in transit | ✅ Внедрено | TLS 1.3 |
| Access control | ✅ Внедрено | ADMIN_USER_IDS, Telegram auth |
| Audit logging | ✅ Внедрено | 6-year retention |
| Backup encryption | ✅ Внедрено | Separate key |
| Penetration testing | 📝 Запланировано | Pre-launch |
| Security monitoring | ✅ Внедрено | Sentry + Grafana |

### 5.3. Incident Response Plan

1. **Detection** — Sentry alerts, monitoring dashboards
2. **Containment** — Isolate affected systems
3. **Notification** — DPO → Regulators (72h) → Users (if applicable)
4. **Recovery** — Restore from backups
5. **Post-mortem** — Root cause analysis, improvements

---

## 6. Права субъектов данных

### 6.1. GDPR Rights Implementation

| Право | Статья GDPR | Реализация | Срок |
|-------|-------------|------------|------|
| Доступ | Art. 15 | `/my_data` команда, email | 30 дней |
| Исправление | Art. 16 | Через бота, email | 30 дней |
| Удаление | Art. 17 | `/delete_my_data`, email | 30 дней |
| Переносимость | Art. 20 | JSON export через `/export` | 30 дней |
| Возражение | Art. 21 | Email на dpo@awfond.ru | 30 дней |
| Объяснение решений | Art. 22 | `/explain` команда | Мгновенно |

### 6.2. Контакты

| Роль | Контакт |
|------|---------|
| Data Protection Officer | dpo@awfond.ru |
| Technical Support | tech@awfond.ru |
| Principal Investigator | [Имя], [Организация] |

---

## 7. Research Data Sharing

### 7.1. Принципы публикации данных

1. **Aggregation** — только агрегированные метрики публикуются
2. **Anonymization** — k-anonymity ≥ 5 для любых публикуемых данных
3. **Consent** — отдельное согласие на использование данных в исследованиях
4. **Ethics review** — все публикации проходят IRB review

### 7.2. Открытые датасеты

| Датасет | Содержит | Не содержит | Доступ |
|---------|----------|-------------|--------|
| Aggregated outcomes | Mean ISI change, SE improvement | Individual trajectories | Open access |
| Anonymized sample | Демография, ISI, SE (N≥100) | Telegram ID, timestamps | DUA required |

### 7.3. Data Use Agreement (DUA) для исследователей

Для доступа к anonymized данным исследователи должны:
1. Подать заявку через sleepcore-research@awfond.ru
2. Предоставить IRB approval своего исследования
3. Подписать DUA
4. Получить ограниченный доступ на определённый срок

---

## 8. Regulatory Compliance

### 8.1. Применимые стандарты

| Стандарт | Область | Статус |
|----------|---------|--------|
| GDPR | Data protection (EU) | ✅ Compliant |
| HIPAA | PHI protection (US) | ✅ Ready |
| 152-ФЗ | Персональные данные (РФ) | ✅ Compliant |
| FDA 21 CFR Part 11 | Electronic records | ✅ Compliant |
| IEC 62304 | Software lifecycle | ✅ Audited |
| ISO 27001 | Information security | 📝 In progress |

### 8.2. Сертификации хостинга

| Провайдер | Сертификат | Срок |
|-----------|------------|------|
| Hetzner | ISO 27001 | Действует |
| Hetzner | SOC 2 Type II | Действует |

---

## 9. Подписи

### 9.1. Principal Investigator

Я подтверждаю, что ознакомлен с данным документом и обязуюсь соблюдать описанные процедуры защиты данных.

**Имя:** _________________________
**Дата:** _________________________
**Подпись:** _________________________

### 9.2. Data Protection Officer

Данный документ проверен и соответствует требованиям GDPR и локального законодательства.

**Имя:** _________________________
**Дата:** _________________________
**Подпись:** _________________________

### 9.3. IT Security Officer

Технические меры безопасности проверены и соответствуют описанию в данном документе.

**Имя:** _________________________
**Дата:** _________________________
**Подпись:** _________________________

---

## 10. История версий

| Версия | Дата | Изменения |
|--------|------|-----------|
| 1.0 | 2026-02-07 | Первоначальная версия |

---

*Документ подготовлен для IRB submission*
*SleepCore v1.0.0-alpha.4*
*БФ «Другой путь»*
