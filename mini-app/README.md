# SleepCore Mini App

Telegram Mini App для дыхательных упражнений с тактильной обратной связью.

## Стек

| Технология | Версия | Назначение |
|------------|--------|------------|
| React | 18 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 6 | Build tool |
| TanStack Query | 5 | Server state |
| Zustand | 4 | Client state |
| Tailwind CSS | 3 | Styling |
| @twa-dev/sdk | 9.1.2 | Telegram SDK |

**Анимации:** CSS-only (GPU-accelerated, ~30KB bundle savings vs Framer Motion)

## Быстрый старт

```bash
cd mini-app
npm install
npm run dev      # Development
npm run build    # Production
npm test         # ~891 unit tests
npm run test:e2e # 62 E2E tests
```

## Структура

```
mini-app/
├── src/
│   ├── api/            # TanStack Query client, queryKeys
│   ├── components/
│   │   ├── breathing/  # HapticBreathing, BreathingCircle, patterns
│   │   ├── common/     # Button, Card, ErrorBoundary, PrivacyCenter
│   │   └── gamification/ # QuestsPanel, Leaderboard
│   ├── hooks/          # useAuth, useBreathing, useEvolution, useSync
│   ├── pages/          # Home, Breathing, Profile
│   ├── services/       # telegram, haptics
│   ├── store/          # authStore, userStore, syncStore
│   └── i18n/           # ru.json, en.json
├── tests/              # Vitest unit tests
├── e2e/                # Playwright E2E tests
└── docs/
    ├── ACCESSIBILITY_AUDIT.md  # A11y аудит (95%)
    └── AUDIT_REPORT.md         # Полный аудит + IEC 62304
```

## Дыхательные паттерны

| Паттерн | Тайминг | Назначение |
|---------|---------|------------|
| 4-7-8 Релакс | 4-7-8 | Засыпание |
| Квадратное | 4-4-4-4 | Фокус, стресс |
| Успокаивающее | 6-2-8 | Снижение тревоги |
| Когерентное | 5-0-5 | HRV оптимизация |
| Бодрящее | 4-0-4 | Энергия |

## Haptic Feedback

Тактильные паттерны через Telegram HapticFeedback API:
- **Вдох** — нарастающая интенсивность
- **Задержка** — мягкие пульсы
- **Выдох** — затухающая интенсивность

## Тестирование

| Тип | Количество | Инструмент |
|-----|------------|------------|
| Unit | ~891 | Vitest + RTL |
| E2E | 62 | Playwright |

```bash
npm test                    # Unit tests
npm run test:coverage       # Coverage report
npm run test:e2e            # E2E tests
npm run test:e2e -- --ui    # Playwright UI
```

## Документация

- [ACCESSIBILITY_AUDIT.md](docs/ACCESSIBILITY_AUDIT.md) — Аудит доступности (WCAG 2.2)
- [AUDIT_REPORT.md](docs/AUDIT_REPORT.md) — Полный аудит + IEC 62304 матрица

## Деплой

```bash
npm run build
# dist/ → GitHub Pages / Vercel / Cloudflare Pages
```

## Лицензия

MIT
