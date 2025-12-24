# SleepCore Mini App

Telegram Mini App для дыхательных упражнений с тактильной обратной связью (haptic feedback).

## Особенности

- **Haptic Breathing** — дыхательные упражнения с вибрационной обратной связью
- **5 дыхательных паттернов** — 4-7-8, Box, Relaxing, Coherent, Energizing
- **Motion анимации** — плавные 60fps анимации с Framer Motion
- **Dark Mode** — оптимизирован для вечернего использования
- **Telegram интеграция** — нативные кнопки, Cloud Storage, платежи

## Технологии

- **React 18** + TypeScript
- **Vite 6** — быстрая сборка
- **Motion** (Framer Motion) — анимации
- **Tailwind CSS** — стилизация
- **Zustand** — state management
- **@twa-dev/sdk** — Telegram Mini App SDK

## Быстрый старт

```bash
# Установка зависимостей
cd mini-app
npm install

# Запуск в dev режиме
npm run dev

# Сборка для production
npm run build
```

## Структура проекта

```
mini-app/
├── src/
│   ├── components/
│   │   ├── breathing/       # Дыхательные компоненты
│   │   │   ├── HapticBreathing.tsx
│   │   │   ├── BreathingCircle.tsx
│   │   │   └── patterns.ts
│   │   └── common/          # Общие компоненты
│   ├── pages/               # Страницы приложения
│   │   ├── Home.tsx
│   │   ├── Breathing.tsx
│   │   └── Profile.tsx
│   ├── services/            # Сервисы
│   │   ├── telegram.ts      # Telegram SDK wrapper
│   │   ├── haptics.ts       # Haptic feedback
│   │   └── api.ts           # Backend API
│   ├── hooks/               # React hooks
│   ├── store/               # Zustand stores
│   └── styles/              # CSS стили
├── public/
│   └── assets/              # Статические ресурсы
└── package.json
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

Приложение использует Telegram HapticFeedback API для создания тактильных паттернов:

- **Вдох** — нарастающая интенсивность (soft → heavy)
- **Задержка** — мягкие ритмичные пульсы
- **Выдох** — затухающая интенсивность (heavy → soft)

Научные исследования показывают +40% улучшение в дыхательной терапии при использовании haptic feedback.

## Разработка

### Локальная разработка без Telegram

В dev режиме автоматически создаётся mock Telegram окружения для тестирования вне Telegram клиента.

### HTTPS для тестирования в Telegram

```typescript
// Раскомментируйте в vite.config.ts
import basicSsl from '@vitejs/plugin-basic-ssl';

plugins: [
  react(),
  basicSsl(), // Включить HTTPS
],
```

### Деплой

Для деплоя Mini App можно использовать:
- **GitHub Pages** — бесплатный хостинг
- **Vercel** — автоматический деплой
- **Cloudflare Pages** — CDN + хостинг

## API интеграция

Mini App интегрируется с SleepCore backend через REST API:

```typescript
// Авторизация через Telegram initData
const response = await fetch('/api/user/profile', {
  headers: {
    'X-Telegram-Init-Data': telegram.getInitData(),
  },
});
```

## Лицензия

MIT
