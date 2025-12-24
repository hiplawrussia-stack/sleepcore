# E2E Testing Research 2025

**Дата:** 24 декабря 2025
**Цель:** Интеграционное тестирование Mini App + Backend API

---

## 1. E2E Testing Best Practices 2025

### Testing Pyramid Strategy

```
          /\
         /E2E\        <- Минимум: критические пути
        /------\
       /Integr. \     <- Средний уровень: API + компоненты
      /----------\
     /   Unit     \   <- Максимум: функции, утилиты
    /--------------\
```

**Ключевые принципы:**

- **Test like the user** - тестируйте с точки зрения пользователя
- **Mock as little as possible** в интеграционных тестах
- **E2E для критических путей** - checkout, onboarding, core features
- **Быстрая обратная связь** - unit/integration локально, E2E в CI

**Источники:**
- [Unit, Integration, and E2E Testing for Fullstack Apps 2025](https://talent500.com/blog/fullstack-app-testing-unit-integration-e2e-2025/)
- [End-to-End Testing Guide 2025](https://talent500.com/blog/end-to-end-testing-guide/)

---

## 2. Playwright vs Cypress 2025

### Сравнение

| Критерий | Playwright | Cypress |
|----------|-----------|---------|
| **Браузеры** | Chrome, Firefox, Safari, Mobile | Chrome, Firefox, Edge |
| **Параллелизм** | Встроенный | Требует Cloud/Dashboard |
| **Языки** | JS, TS, Python, C#, Java | JS/TS only |
| **Скорость** | Быстрее в 4 раза для API тестов | Медленнее |
| **Отладка** | Trace Viewer, Timeline | Time-travel, Live preview |
| **Экосистема** | Microsoft, активно развивается | Mature, большое сообщество |

### Рекомендация для SleepCore: **Playwright**

**Причины:**
1. Поддержка Safari (важно для iOS Mini App)
2. Встроенный параллелизм
3. API testing быстрее
4. Лучше для сложных сценариев (multi-tab, auth)

**Источники:**
- [Playwright vs Cypress 2025](https://bugbug.io/blog/test-automation-tools/cypress-vs-playwright/)
- [Ultimate 2025 E2E Testing Showdown](https://www.frugaltesting.com/blog/playwright-vs-cypress-the-ultimate-2025-e2e-testing-showdown)

---

## 3. Telegram Mini App Testing

### Особенности

Тестирование Telegram Mini Apps имеет специфические ограничения:

1. **Аутентификация** - требует реальный Telegram аккаунт
2. **initData** - подписывается серверами Telegram
3. **WebView** - разные браузеры на разных платформах

### Рекомендуемые подходы

#### 1. Test Environment (официальный)

```
Telegram Desktop → Settings → Shift+Alt+Right-click "Add Account" → Test Server
```

- Отдельный test server от production
- Не требует HTTPS для localhost
- Отдельный @BotFather для test ботов

#### 2. API Mocking (практичный)

```typescript
// Mock Telegram initData для тестов
const mockInitData = {
  user: { id: 12345, first_name: 'Test' },
  auth_date: Date.now(),
  hash: 'mock_hash'
};
```

**Преимущества:**
- Не требует реального Telegram
- Полностью контролируемое окружение
- Можно запускать в CI/CD

#### 3. WebView Debugging

```
// Android
chrome://inspect/#devices

// Desktop
Settings → Advanced → Experimental → Enable WebView inspection
```

**Источники:**
- [Telegram Mini Apps Test Environment](https://docs.telegram-mini-apps.com/platform/test-environment)
- [E2E Testing for Telegram Bot](https://medium.com/singapore-gds/end-to-end-testing-for-telegram-bot-4d6afd85fb55)

---

## 4. Docker Compose для E2E

### Архитектура

```yaml
services:
  database:
    image: postgres:15
    healthcheck: ...

  api:
    build: ./api
    depends_on:
      database:
        condition: service_healthy
    healthcheck: ...

  mini-app:
    build: ./mini-app
    depends_on:
      api:
        condition: service_healthy

  e2e-tests:
    build: ./e2e
    depends_on:
      mini-app:
        condition: service_healthy
    command: npx playwright test
```

### Ключевые практики

1. **Healthchecks** - обязательны для правильного порядка запуска
2. **depends_on с condition** - ждать готовности сервиса
3. **--abort-on-container-exit** - для CI/CD
4. **--exit-code-from e2e-tests** - использовать код выхода тестов

### Параллельное выполнение

```bash
docker-compose up --scale e2e=3 --abort-on-container-exit
```

**Источники:**
- [Docker + Cypress E2E 2025](https://dev.to/cypress/docker-cypress-in-2025-how-ive-perfected-my-e2e-testing-setup-4f7j)
- [Dockerized E2E Tests with GitHub Actions](https://lachiejames.com/elevate-your-ci-cd-dockerized-e2e-tests-with-github-actions/)

---

## 5. Vitest + Playwright Integration

### Разделение ответственности

| Инструмент | Тип тестов | Запуск |
|------------|-----------|--------|
| **Vitest** | Unit, Component | На каждый commit |
| **Vitest + MSW** | API Integration | На каждый commit |
| **Playwright** | E2E, Cross-browser | CI/CD, Critical paths |

### Vitest Browser Mode

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      name: 'chromium',
    },
  },
});
```

**Важно:** Vitest Browser Mode != E2E тесты. Это быстрые компонентные тесты в реальном браузере.

### MSW для API Mocking

```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/user/profile', () => {
    return HttpResponse.json({ id: '1', firstName: 'Test' });
  })
);
```

**Источники:**
- [Vitest + Playwright Component Testing](https://www.thecandidstartup.org/2025/01/06/component-test-playwright-vitest.html)
- [Configure Vitest, MSW and Playwright](https://dev.to/juan_deto/configure-vitest-msw-and-playwright-in-a-react-project-with-vite-and-ts-part-3-32pe)

---

## 6. Рекомендуемая структура для SleepCore

### Файловая структура

```
sleepcore/
├── api/
│   └── tests/
│       ├── unit/           # Vitest unit tests
│       └── integration/    # API integration tests
├── mini-app/
│   └── tests/
│       ├── unit/           # Vitest unit tests
│       └── components/     # Component tests
├── e2e/
│   ├── tests/
│   │   ├── auth.spec.ts
│   │   ├── breathing.spec.ts
│   │   └── profile.spec.ts
│   ├── fixtures/
│   │   └── telegram-mock.ts
│   ├── playwright.config.ts
│   └── Dockerfile
├── docker-compose.test.yml
└── .github/
    └── workflows/
        └── e2e.yml
```

### Тестовые сценарии

#### Критические пути (E2E):
1. **Auth Flow** - Telegram login → Token получен → Profile загружен
2. **Breathing Session** - Выбор паттерна → Упражнение → Сохранение
3. **Offline Sync** - Офлайн сессия → Онлайн → Синхронизация

#### Integration:
1. API endpoints с mock DB
2. React hooks с mock API
3. Zustand stores

#### Unit:
1. Utility functions
2. Formatters, validators
3. Business logic

---

## 7. План реализации

### Этап 1: Базовая инфраструктура
1. Установить Playwright в проект
2. Создать docker-compose.test.yml
3. Настроить mock для Telegram SDK

### Этап 2: E2E тесты
1. Auth flow test
2. Breathing exercise test
3. Profile/stats test

### Этап 3: CI/CD
1. GitHub Actions workflow
2. Параллельное выполнение
3. Отчёты о тестах

---

## Источники

1. [E2E Testing Tools & Frameworks 2025](https://bugbug.io/blog/test-automation/end-to-end-testing/)
2. [Playwright vs Cypress 2025](https://bugbug.io/blog/test-automation-tools/cypress-vs-playwright/)
3. [Telegram Mini Apps Documentation](https://docs.telegram-mini-apps.com/)
4. [Docker Compose E2E Testing](https://dev.to/cypress/docker-cypress-in-2025-how-ive-perfected-my-e2e-testing-setup-4f7j)
5. [Vitest Browser Mode](https://vitest.dev/guide/browser/)
6. [Unit Testing React with Vitest, MSW, Playwright](https://makepath.com/unit-testing-a-react-application-with-vitest-msw-and-playwright/)
