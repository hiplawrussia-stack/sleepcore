# Руководство по аудиту Telegram Mini App

> **Версия:** 1.0 | **Дата:** 2026-02-24
> **Применимость:** SleepCore Mini App и другие Telegram Mini Apps

---

## Оглавление

1. [Введение](#1-введение)
2. [Категории аудита](#2-категории-аудита)
3. [Безопасность](#3-безопасность)
4. [Соответствие Telegram WebApp API](#4-соответствие-telegram-webapp-api)
5. [Производительность](#5-производительность)
6. [Доступность (Accessibility)](#6-доступность-accessibility)
7. [GDPR и приватность](#7-gdpr-и-приватность)
8. [UX/UI Guidelines](#8-uxui-guidelines)
9. [Тестирование](#9-тестирование)
10. [Регуляторные требования (DTx)](#10-регуляторные-требования-dtx)
11. [Чек-листы](#11-чек-листы)
12. [Источники](#12-источники)

---

## 1. Введение

### 1.1 Цель документа

Данное руководство определяет параметры и критерии для проведения комплексного аудита Telegram Mini App приложений. Включает как общие требования для всех Mini Apps, так и специфические для медицинских приложений (DTx).

### 1.2 Области аудита

```
┌─────────────────────────────────────────────────────────────┐
│                    MINI APP AUDIT                           │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│  Security   │ Performance │ Compliance  │ User Experience  │
├─────────────┼─────────────┼─────────────┼──────────────────┤
│ • Auth      │ • Loading   │ • GDPR      │ • Design         │
│ • Crypto    │ • Bundle    │ • Telegram  │ • Accessibility  │
│ • Input     │ • Runtime   │ • Regional  │ • Navigation     │
│ • API       │ • Metrics   │ • Medical   │ • Responsiveness │
└─────────────┴─────────────┴─────────────┴──────────────────┘
```

---

## 2. Категории аудита

### 2.1 Приоритеты (по критичности)

| Приоритет | Категория | Влияние при провале |
|-----------|-----------|---------------------|
| P0 | Безопасность | Утечка данных, компрометация |
| P0 | Telegram API Compliance | Блокировка приложения |
| P1 | GDPR/Приватность | Юридические санкции |
| P1 | Производительность | Потеря пользователей |
| P2 | Доступность | Исключение групп пользователей |
| P2 | UX/UI | Низкая конверсия |
| P3 | Документация | Сложность поддержки |

### 2.2 Матрица оценки

| Оценка | Описание | Действие |
|--------|----------|----------|
| PASS | Соответствует всем критериям | Продолжить |
| WARN | Незначительные отклонения | Исправить до релиза |
| FAIL | Критические нарушения | Блокировка релиза |

---

## 3. Безопасность

### 3.1 Аутентификация и авторизация

| Критерий | Требование | Метод проверки |
|----------|------------|----------------|
| **initData валидация** | HMAC-SHA256 на сервере | Code review + тест |
| **auth_date проверка** | Не старше 1 часа | Unit test |
| **Bot token** | Только на сервере, не в клиенте | grep по коду |
| **JWT токены** | Memory-only, не localStorage | Browser DevTools |
| **Token expiration** | access: 24h, refresh: 30d | API тест |
| **Session invalidation** | Очистка при logout | Функциональный тест |

#### Код проверки initData (эталон):

```python
# Python пример валидации
import hmac
import hashlib

def validate_init_data(init_data: str, bot_token: str) -> bool:
    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(
            parse_qs(init_data).items()
        ) if k != "hash"
    )
    secret_key = hmac.new(
        b"WebAppData",
        bot_token.encode(),
        hashlib.sha256
    ).digest()

    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()

    return calculated_hash == extracted_hash
```

### 3.2 Шифрование данных

| Данные | Классификация | Стандарт | Проверка |
|--------|---------------|----------|----------|
| PHI (медицинские) | Высокая | AES-256-GCM | Audit log |
| Персональные | Средняя | TLS 1.3 в транзите | Network tab |
| Sync queue | Транзитные | Шифрование at rest | IndexedDB inspect |
| Gamification | Низкая | Не требуется | N/A |

### 3.3 Валидация ввода

| Вектор атаки | Защита | Инструмент проверки |
|--------------|--------|---------------------|
| XSS | Санитизация, CSP | OWASP ZAP |
| SQL Injection | Параметризованные запросы | sqlmap |
| CSRF | SameSite cookies | Burp Suite |
| Path Traversal | Whitelist путей | Manual test |

### 3.4 Чек-лист безопасности

```
КРИТИЧЕСКИЕ:
□ Bot token НЕ в клиентском коде
□ initData валидируется на сервере (HMAC-SHA256)
□ auth_date проверяется (< 1 час)
□ Токены НЕ в localStorage/sessionStorage
□ HTTPS принудительно (Telegram гарантирует)
□ CSP header настроен

ВЫСОКИЕ:
□ Zod/Yup валидация входных данных
□ Rate limiting на API (100 req/min)
□ Error messages не раскрывают внутренности
□ Sentry с PHI scrubbing (если используется)

СРЕДНИЕ:
□ npm audit без critical/high
□ Dependency lock file актуален
□ JWT rotation настроен
□ Audit trail для действий пользователя
```

---

## 4. Соответствие Telegram WebApp API

### 4.1 Обязательные требования

| Требование | Описание | Проверка |
|------------|----------|----------|
| **Script inclusion** | `telegram-web-app.js` подключён | HTML inspect |
| **ready() вызов** | Как можно раньше после загрузки | Console log |
| **isVersionAtLeast()** | Проверка перед новыми API | Code review |
| **Theme adaptation** | CSS variables для темы | Visual test |
| **Safe area respect** | Отступы для notch/home bar | Device test |

### 4.2 UI компоненты

| Компонент | Требование | Проверка |
|-----------|------------|----------|
| **MainButton** | Корректное состояние и loading | E2E test |
| **BackButton** | Навигация работает | E2E test |
| **HapticFeedback** | Graceful fallback если недоступен | Feature detection |
| **CloudStorage** | До 1024 items, обработка ошибок | Unit test |
| **SecureStorage** | До 10 items, encrypted | Security review |

### 4.3 Платёжные требования (2025)

| Критерий | Требование |
|----------|------------|
| Цифровые товары | Только через Telegram Stars |
| Криптовалюта | Только TON blockchain |
| Wallet connect | Только TON Connect SDK |
| Физические товары | Любой payment provider |

### 4.4 Контент-модерация

```
ОБЯЗАТЕЛЬНО:
□ Модерация user-generated content
□ Не представляться как официальный продукт Telegram
□ Собственная Privacy Policy если обработка данных нестандартная
□ Соблюдение промо-правил для крипто (если применимо)
```

---

## 5. Производительность

### 5.1 Core Web Vitals (Целевые метрики)

| Метрика | Цель | Критический порог | Инструмент |
|---------|------|-------------------|------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | > 4.0s | Lighthouse |
| **FID** (First Input Delay) | < 100ms | > 300ms | Lighthouse |
| **CLS** (Cumulative Layout Shift) | < 0.1 | > 0.25 | Lighthouse |
| **TTFB** (Time to First Byte) | < 600ms | > 1.8s | WebPageTest |
| **FCP** (First Contentful Paint) | < 1.5s | > 3.0s | Lighthouse |

### 5.2 Bundle Size

| Ресурс | Цель (gzip) | Метод оптимизации |
|--------|-------------|-------------------|
| Initial JS | < 100KB | Code splitting, tree shaking |
| CSS | < 30KB | PurgeCSS, Tailwind purge |
| Images | < 50KB each | WebP, lazy loading |
| Fonts | < 50KB total | Subset, WOFF2 |

### 5.3 Runtime Performance

| Аспект | Требование | Проверка |
|--------|------------|----------|
| Анимации | 60 FPS | Chrome DevTools Performance |
| Memory | < 50MB growth за сессию | Memory profiler |
| React re-renders | Минимизация лишних | React DevTools |
| API latency | P95 < 500ms | Backend monitoring |

### 5.4 Device Performance Adaptation

```javascript
// Telegram предоставляет информацию о производительности устройства
const performanceClass = WebApp.platform === 'android'
  ? parsePerformanceFromUserAgent()
  : 'high';

// Адаптация:
if (performanceClass === 'low') {
  disableComplexAnimations();
  reduceParticleCount();
  useStaticBackgrounds();
}
```

### 5.5 Метрики удержания (бенчмарки)

| Метрика | Средний показатель | Хороший показатель |
|---------|-------------------|-------------------|
| Day 1 Retention | 15-20% | > 25% |
| Day 7 Retention | 8-10% | > 15% |
| Session Duration | 2-3 min | > 5 min |
| CTR (если реклама) | 20-40% | > 40% |

---

## 6. Доступность (Accessibility)

### 6.1 WCAG 2.2 AA Требования

| Критерий | Требование | Автоматизация |
|----------|------------|---------------|
| **1.4.3** Контраст | Минимум 4.5:1 для текста | axe-core |
| **2.1.1** Keyboard | Все функции с клавиатуры | Manual + E2E |
| **2.4.7** Focus visible | Видимый индикатор фокуса | Visual test |
| **2.5.5** Target size | Минимум 44x44px для touch | Ruler tool |
| **3.1.1** Language | lang атрибут указан | HTML validator |
| **4.1.2** Name, Role, Value | ARIA labels для controls | axe-core |

### 6.2 Mobile-specific

| Аспект | Требование | Проверка |
|--------|------------|----------|
| Touch targets | 44x44px минимум | CSS audit |
| Safe areas | Padding для notch | Device test |
| Font scaling | Респонсивно к системным настройкам | Accessibility settings |
| Reduced motion | Уважать `prefers-reduced-motion` | CSS media query |
| Screen reader | VoiceOver/TalkBack совместимость | Manual test |

### 6.3 Инструменты тестирования

```bash
# Автоматизированное тестирование (Playwright + axe-core)
npm install @axe-core/playwright

# В тесте:
import { injectAxe, checkA11y } from 'axe-playwright';

test('accessibility audit', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: { html: true }
  });
});
```

---

## 7. GDPR и приватность

### 7.1 Права субъекта данных

| Статья GDPR | Право | Реализация | Проверка |
|-------------|-------|------------|----------|
| Art. 15 | Доступ к данным | Кнопка "Мои данные" | UI test |
| Art. 17 | Удаление данных | Кнопка "Удалить" + подтверждение | E2E test |
| Art. 20 | Портируемость | Экспорт в JSON | Функциональный тест |
| Art. 21 | Возражение | Opt-out из рейтингов | Settings test |

### 7.2 Согласие и прозрачность

| Требование | Реализация |
|------------|------------|
| Privacy Policy | Ссылка доступна в приложении |
| Cookie consent | Если применимо (обычно не нужно в Mini App) |
| Data collection notice | При первом запуске |
| Third-party disclosure | Список партнёров |

### 7.3 Техническая защита

```
ОБЯЗАТЕЛЬНО:
□ Данные зашифрованы at rest (AES-256)
□ Данные зашифрованы in transit (TLS 1.3)
□ Минимизация сбора данных
□ Retention policy определён
□ Audit log для доступа к данным
□ Анонимизация при удалении (не hard delete)
```

### 7.4 DPIA (Data Protection Impact Assessment)

Требуется если:
- Обработка медицинских данных (health data)
- Профилирование пользователей
- Масштабная обработка (> 5000 пользователей)

---

## 8. UX/UI Guidelines

### 8.1 Telegram Design Principles

| Принцип | Описание |
|---------|----------|
| **Mobile-first** | Все элементы адаптированы под мобильные |
| **Native feel** | Кнопки и диалоги похожи на нативные |
| **Theme-aware** | Адаптация к светлой/тёмной теме |
| **Lightweight** | Минимум элементов, максимум функциональности |
| **Accessible** | Labels для всех интерактивных элементов |

### 8.2 Обязательные элементы

| Элемент | Требование |
|---------|------------|
| Loading state | Skeleton или spinner при загрузке |
| Error state | Понятное сообщение об ошибке |
| Empty state | Подсказка что делать |
| Offline state | Индикация отсутствия сети |

### 8.3 Анимации

```css
/* Требования к анимациям */
.animation {
  /* 60 FPS target */
  will-change: transform, opacity;

  /* Уважать reduced motion */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
  }
}
```

---

## 9. Тестирование

### 9.1 Пирамида тестирования

```
        /\
       /  \  E2E Tests (10%)
      /----\  - Critical user flows
     /      \  - Cross-browser
    /--------\  Integration Tests (20%)
   /          \  - API contracts
  /            \  - Component integration
 /--------------\  Unit Tests (70%)
/                \  - Business logic
------------------  - Utilities
```

### 9.2 Минимальное покрытие (IEC 62304 Class B)

| Метрика | Порог | Рекомендуется |
|---------|-------|---------------|
| Statement coverage | 80% | 90% |
| Branch coverage | 70% | 80% |
| Function coverage | 80% | 90% |
| Critical modules | 95% | 100% |

### 9.3 E2E тест-кейсы (обязательные)

```
НАВИГАЦИЯ:
□ Переход между всеми страницами
□ BackButton работает корректно
□ Deep linking с параметрами

АУТЕНТИФИКАЦИЯ:
□ Telegram user распознаётся
□ Logout очищает состояние

ОСНОВНОЙ ФУНКЦИОНАЛ:
□ Core feature работает end-to-end
□ Данные сохраняются
□ Offline режим (если поддерживается)

ОШИБКИ:
□ 500 ошибка сервера обрабатывается
□ 401 ошибка редиректит на auth
□ Network timeout показывает сообщение
```

### 9.4 Инструменты

| Категория | Инструмент | Назначение |
|-----------|------------|------------|
| Unit | Vitest / Jest | Логика, утилиты |
| Component | React Testing Library | UI компоненты |
| E2E | Playwright | User flows |
| A11y | axe-core | Доступность |
| Performance | Lighthouse CI | Web Vitals |
| Security | OWASP ZAP | Vulnerability scan |

---

## 10. Регуляторные требования (DTx)

> Применимо только для медицинских Mini Apps

### 10.1 IEC 62304 Software Lifecycle

| Артефакт | Требование |
|----------|------------|
| SRS | Software Requirements Specification |
| SDS | Software Design Specification |
| Test Plan | Стратегия тестирования |
| Test Report | Результаты с coverage |
| Traceability Matrix | Req -> Code -> Test |

### 10.2 FDA 510(k) / CE Mark

| Документ | Статус |
|----------|--------|
| Predicate device | Определён |
| Risk Management (ISO 14971) | Проведён |
| Cybersecurity documentation | Подготовлен |
| Clinical validation | RCT если claims |

### 10.3 DiGA (Германия)

| Требование | Описание |
|------------|----------|
| CE Mark | Class IIa минимум |
| ISO 13485 QMS | Система менеджмента качества |
| German IFU | Инструкция на немецком |
| Clinical evidence | 12-месячная программа |

---

## 11. Чек-листы

### 11.1 Pre-Launch Checklist

```
БЕЗОПАСНОСТЬ:
□ initData валидация на сервере
□ Bot token только на backend
□ Токены в memory, не storage
□ npm audit без critical
□ HTTPS enforced

TELEGRAM API:
□ ready() вызывается рано
□ Theme CSS variables используются
□ Safe areas respected
□ MainButton/BackButton работают

ПРОИЗВОДИТЕЛЬНОСТЬ:
□ LCP < 2.5s
□ Bundle < 100KB gzip
□ 60 FPS анимации
□ Device performance adaptation

ДОСТУПНОСТЬ:
□ Контраст 4.5:1+
□ Touch targets 44x44px
□ Screen reader compatible
□ Reduced motion support

GDPR:
□ Privacy Policy доступна
□ Права субъекта реализованы
□ Данные зашифрованы
□ Retention policy определён

ТЕСТИРОВАНИЕ:
□ Unit coverage 80%+
□ E2E critical paths
□ A11y automated tests
□ Cross-browser verified
```

### 11.2 Weekly Audit Checklist

```
□ npm audit check
□ Error rate monitoring
□ Performance metrics review
□ User feedback triage
□ Security advisories check
```

### 11.3 Quarterly Audit Checklist

```
□ Full security scan (OWASP ZAP)
□ Dependency update cycle
□ GDPR compliance review
□ Performance benchmark
□ Accessibility re-audit
□ Documentation update
```

---

## 12. Источники

### Официальная документация Telegram
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps) - Официальное руководство

### Безопасность
- [Security Risks in Telegram Mini Apps](https://www.nadcab.com/blog/security-risks-in-telegram-mini-apps)
- [Telegram Mini App Security Concerns](https://www.quillaudits.com/blog/web3-security/telegram-mini-apps-security)
- [Phishing in Telegram Mini Apps](https://www.kaspersky.com/blog/telegram-mini-app-phishing/55041/)

### Compliance
- [Telegram Mini App Legal Checklist 2025](https://aurum.law/newsroom/Telegram-Mini-App-Legal-Checklist-in-2025)
- [Telegram Compliance](https://www.leapxpert.com/glossary_term/telegram-compliance/)

### Метрики и аналитика
- [Telegram Mini App Metrics](https://monetag.com/blog/telegram-mini-app-metrics/)
- [Telegram Mini Apps Analytics SDK](https://docs.tganalytics.xyz/)
- [State of Telegram Mini App Advertising 2025](https://propellerads.com/blog/adv-telegram-mini-app-advertising-report/)

### Внутренняя документация SleepCore
- `/docs/AUDIT_FRAMEWORK.md` - Полный фреймворк аудита DTx
- `/docs/audit/mini-app-verification-matrix.md` - Матрица верификации
- `/docs/security/audit.md` - Отчёт по безопасности
- `/CLAUDE.md` - Клинические константы и красные линии

---

## Приложение A: Шаблон отчёта аудита

```markdown
# Audit Report: [App Name]
Date: [YYYY-MM-DD]
Auditor: [Name]
Version: [App Version]

## Executive Summary
- Overall Status: [PASS/WARN/FAIL]
- Critical Issues: [Count]
- High Issues: [Count]
- Medium Issues: [Count]

## Security Audit
| Check | Status | Notes |
|-------|--------|-------|
| initData validation | | |
| Token storage | | |
| Input validation | | |

## Performance Audit
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| LCP | | <2.5s | |
| FID | | <100ms | |
| Bundle size | | <100KB | |

## Accessibility Audit
| WCAG Criterion | Status | Notes |
|----------------|--------|-------|
| 1.4.3 Contrast | | |
| 2.5.5 Target Size | | |

## GDPR Compliance
| Article | Status | Notes |
|---------|--------|-------|
| Art. 15 | | |
| Art. 17 | | |

## Recommendations
1. [Priority] [Description]
2. ...

## Sign-off
- [ ] Development Lead
- [ ] Security Officer
- [ ] Product Owner
```

---

*Документ подготовлен на основе анализа официальной документации Telegram, лучших практик индустрии и требований SleepCore DTx платформы.*
