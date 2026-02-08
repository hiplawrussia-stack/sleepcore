# SleepCore Documentation

> Документация проекта SleepCore — CBT-I цифровой терапевт
>
> **Статус проекта:** READY FOR RELEASE (IEC 62304 аудит завершён)
> **Обновлено:** 2026-02-07

## Структура

```
docs/
├── audit/              # ✅ IEC 62304 аудит (8 файлов) — COMPLETE
│   ├── consolidated-findings.md    # Главный отчёт аудита
│   ├── connectivity-matrix.md      # Матрица связей
│   ├── safety-critical-modules-audit.md
│   └── ...
│
├── archive/            # Архив (6 файлов)
│   └── Устаревшие и выполненные документы
│
├── business/           # Бизнес-документация (3 файла)
│   ├── pitch-deck.md   # Презентация для инвесторов
│   ├── vision.md       # Стратегическое видение 2.0
│   └── competitive-analysis.md  # Анализ конкурентов
│
├── ethics/             # Этика и клинические исследования (4 файла)
│   ├── STUDY_PROTOCOL.md        # Протокол исследования
│   ├── INVESTIGATORS_BROCHURE.md # Брошюра исследователя
│   ├── ETHICS_SUBMISSION_CHECKLIST.md
│   └── ADVERSE_EVENT_PLAN.md    # План нежелательных событий
│
├── production/         # Продакшен и запуск (1 файл)
│   └── launch-plan.md  # План запуска в продакшен
│
├── regulatory/         # Регуляторные документы (5 файлов)
│   ├── CYBERSECURITY_RU.md      # Кибербезопасность (РФ)
│   ├── VERSIONING_PROCEDURES_RU.md
│   ├── EUDAMED_REGISTRATION.md
│   ├── QMSR_GAP_ANALYSIS.md
│   └── PCCP_PROTOCOL.md
│
├── research/           # Научные исследования (35 файлов)
│   └── Дайджесты, анализы, исследования 2025-2026
│
└── security/           # Безопасность (1 файл)
    └── audit.md        # Аудит безопасности
```

**Всего:** ~70 документов в docs/

## Основные документы (корень проекта)

| Документ | Описание |
|----------|----------|
| [README.md](../README.md) | Основное описание проекта |
| [CLAUDE.md](../CLAUDE.md) | Инструкции для разработки (обязательно к прочтению) |
| [ROADMAP.md](./ROADMAP.md) | Дорожная карта развития |

## Дополнительные документы (корень docs/)

| Документ | Описание |
|----------|----------|
| **PROJECT_STATUS_REPORT.md** | Полный статус проекта (обновлено 2026-02-07) |
| **DOCUMENTATION_AUDIT_REPORT_2026-02-07.md** | Аудит документации |
| PROJECT_CAPABILITIES.md | Возможности проекта |
| PRIVACY_POLICY.md | Политика конфиденциальности |
| INFORMED_CONSENT_FORM.md | Форма информированного согласия |
| CONSENT_TELEGRAM_VERSION.md | Согласие для Telegram-бота |

## Ключевые документы аудита

| Документ | Описание |
|----------|----------|
| [audit/consolidated-findings.md](./audit/consolidated-findings.md) | **Главный отчёт аудита** — все P0-P3 закрыты |
| [audit/safety-critical-modules-audit.md](./audit/safety-critical-modules-audit.md) | Safety-critical модули >98% покрытия |
| [audit/traceability-matrix-audit.md](./audit/traceability-matrix-audit.md) | Матрица трассируемости IEC 62304 |

## Навигация по разделам

- **Аудит:** [audit/](./audit/) — ✅ IEC 62304 Class IIa аудит (COMPLETE)
- **Бизнес:** [business/](./business/) — питч-дек, видение, анализ рынка
- **Этика:** [ethics/](./ethics/) — клинические протоколы, IRB документы
- **Продакшен:** [production/](./production/) — план запуска
- **Регуляторика:** [regulatory/](./regulatory/) — соответствие стандартам РФ
- **Исследования:** [research/](./research/) — научная база, дайджесты
- **Безопасность:** [security/](./security/) — аудит безопасности
- **Архив:** [archive/](./archive/) — исторические документы
