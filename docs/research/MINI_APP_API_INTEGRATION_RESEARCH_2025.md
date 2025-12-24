# Mini App + API Integration - Исследование 2025

**Дата:** 24 декабря 2025
**Цель:** Интеграция React Mini App с Hono Backend API

---

## 1. TanStack Query (React Query) - Стандарт 2025

### Почему TanStack Query

TanStack Query - де-факто стандарт для управления серверным состоянием в React 2025:

- **Автоматическое кэширование** - данные показываются мгновенно
- **Background refetching** - обновление при фокусе окна
- **Retry logic** - автоматические повторы при ошибках
- **Optimistic updates** - мгновенный UI-отклик
- **DevTools** - отладка состояния запросов

**Источники:**
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [TkDodo's Blog - Mastering Mutations](https://tkdodo.eu/blog/mastering-mutations-in-react-query)

### Базовая настройка

```typescript
// queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 минут
      gcTime: 1000 * 60 * 30,   // 30 минут (кэш)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

---

## 2. Zustand + React Query = Идеальная комбинация

### Разделение ответственности

| Тип состояния | Инструмент | Примеры |
|---------------|------------|---------|
| **Server state** | TanStack Query | Профиль, сессии, статистика |
| **Client state** | Zustand | UI флаги, настройки, темы |
| **Form state** | React Hook Form | Формы ввода |

**Источники:**
- [State Management in 2025 - ScopeThinkers](https://blog.scopethinkers.com/state-management-in-2025-redux-zustand-or-react-query/)
- [Zustand + React Query - Medium](https://medium.com/@freeyeon96/zustand-react-query-new-state-management-7aad6090af56)

### Архитектура

```
┌─────────────────────────────────────────────────┐
│                  React Components               │
├─────────────────────────────────────────────────┤
│  Zustand Store    │    TanStack Query Cache     │
│  (UI/Client)      │    (Server State)           │
├───────────────────┴─────────────────────────────┤
│              API Client (fetch wrapper)          │
├─────────────────────────────────────────────────┤
│                 Hono Backend API                │
└─────────────────────────────────────────────────┘
```

---

## 3. Telegram Mini App Authentication Flow

### Процесс аутентификации

```
1. User opens Mini App
         ↓
2. Telegram provides initData (signed)
         ↓
3. Client sends initData to /api/auth/telegram
         ↓
4. Server validates HMAC-SHA256 signature
         ↓
5. Server returns JWT (access + refresh tokens)
         ↓
6. Client stores tokens in memory/localStorage
         ↓
7. All API calls include Bearer token
```

**Источники:**
- [Telegram Mini App Authentication - CRMChat](https://crmchat.ai/blog/how-telegram-mini-apps-handle-user-authentication)
- [Seamless Auth in Mini Apps - Medium](https://medium.com/@miralex13/seamless-authentication-in-telegram-mini-apps-building-a-secure-and-frictionless-user-experience-6249599e2693)

### JWT Best Practices

| Параметр | Значение | Причина |
|----------|----------|---------|
| Access token TTL | 15 минут | Минимизация риска |
| Refresh token TTL | 7 дней | Удобство пользователя |
| Хранение | Memory + Zustand persist | Безопасность |
| Refresh strategy | Проактивный (за 1 мин до истечения) | UX |

---

## 4. API Client с Interceptors

### Fetch Wrapper с retry и auth

```typescript
// apiClient.ts
interface ApiClientConfig {
  baseUrl: string;
  getToken: () => string | null;
  onTokenExpired: () => Promise<string>;
}

class ApiClient {
  private config: ApiClientConfig;

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.config.getToken();

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    // Token refresh on 401
    if (response.status === 401) {
      const newToken = await this.config.onTokenExpired();
      return this.request(endpoint, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
      });
    }

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    return response.json();
  }
}
```

**Источники:**
- [ofetch - Better Fetch API](https://github.com/unjs/ofetch)
- [Safe Error Handling TypeScript](https://dev.to/asouei/stop-wrapping-every-fetch-in-trycatch-a-safer-error-handling-for-typescript-1jj7)

---

## 5. Optimistic Updates Pattern

### Когда использовать

✅ **Используйте** для:
- Toggle actions (like, bookmark)
- Небольших обновлений с высокой вероятностью успеха
- Действий без критических последствий

❌ **Не используйте** для:
- Форм с редиректом после отправки
- Критических финансовых операций
- Действий с частыми ошибками

### Паттерн с rollback

```typescript
const mutation = useMutation({
  mutationFn: updateSession,
  onMutate: async (newSession) => {
    // 1. Отменяем текущие запросы
    await queryClient.cancelQueries({ queryKey: ['sessions'] });

    // 2. Сохраняем предыдущее состояние
    const previousSessions = queryClient.getQueryData(['sessions']);

    // 3. Оптимистично обновляем
    queryClient.setQueryData(['sessions'], (old) => [...old, newSession]);

    // 4. Возвращаем контекст для rollback
    return { previousSessions };
  },
  onError: (err, newSession, context) => {
    // Откатываем при ошибке
    queryClient.setQueryData(['sessions'], context.previousSessions);
  },
  onSettled: () => {
    // Всегда инвалидируем для синхронизации
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  },
});
```

**Источники:**
- [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [Concurrent Optimistic Updates - TkDodo](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query)

---

## 6. Offline-First Strategy

### Архитектура

```
┌─────────────────────────────────────────┐
│           React Components              │
├─────────────────────────────────────────┤
│  TanStack Query    │    Zustand Store   │
│  (with persist)    │    (with persist)  │
├────────────────────┴────────────────────┤
│         IndexedDB / localStorage        │
├─────────────────────────────────────────┤
│           Sync Manager                  │
│  - Queue failed requests                │
│  - Retry on reconnect                   │
│  - Conflict resolution                  │
├─────────────────────────────────────────┤
│              Backend API                │
└─────────────────────────────────────────┘
```

### Стратегия для SleepCore

1. **Локальное сохранение сессий** - Zustand persist
2. **Queue для офлайн-действий** - Сохранение в IndexedDB
3. **Background sync** - При восстановлении сети
4. **Conflict resolution** - Last-write-wins с timestamps

**Источники:**
- [Offline-First Frontend Apps 2025 - LogRocket](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [Dexie.js - Offline-First Database](https://dexie.org/)

---

## 7. Структура интеграции

### Файловая структура

```
mini-app/src/
├── api/
│   ├── client.ts           # Fetch wrapper с interceptors
│   ├── auth.ts             # Auth API calls
│   ├── breathing.ts        # Breathing API calls
│   ├── user.ts             # User API calls
│   └── index.ts
├── hooks/
│   ├── useAuth.ts          # Auth hook (TanStack Query)
│   ├── useBreathingSessions.ts
│   ├── useUserProfile.ts
│   └── useSync.ts          # Offline sync hook
├── store/
│   ├── authStore.ts        # Token management (Zustand)
│   ├── userStore.ts        # User state (already exists)
│   └── syncStore.ts        # Offline queue (Zustand)
└── providers/
    └── QueryProvider.tsx   # TanStack Query setup
```

### Query Keys Convention

```typescript
// queryKeys.ts
export const queryKeys = {
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    evolution: () => [...queryKeys.user.all, 'evolution'] as const,
    badges: () => [...queryKeys.user.all, 'badges'] as const,
  },
  breathing: {
    all: ['breathing'] as const,
    stats: () => [...queryKeys.breathing.all, 'stats'] as const,
    history: (page?: number) => [...queryKeys.breathing.all, 'history', page] as const,
  },
} as const;
```

---

## 8. Error Handling Strategy

### Уровни обработки ошибок

| Уровень | Тип ошибки | Действие |
|---------|------------|----------|
| **Network** | Нет соединения | Toast + offline queue |
| **Auth** | 401 Unauthorized | Refresh token / Re-auth |
| **Validation** | 400 Bad Request | Показать ошибки полей |
| **Server** | 500 Internal | Toast + retry |
| **Not Found** | 404 | Redirect / Show message |

### Error Boundary + Toast

```typescript
// Global error handler
queryClient.setDefaultOptions({
  queries: {
    throwOnError: (error) => error.status >= 500,
  },
  mutations: {
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  },
});
```

---

## 9. Рекомендуемый Tech Stack

| Компонент | Технология | Версия |
|-----------|------------|--------|
| **Data Fetching** | TanStack Query | 5.x |
| **Client State** | Zustand | 4.x |
| **Persistence** | zustand/persist | - |
| **Forms** | React Hook Form | 7.x |
| **Validation** | Zod | 3.x |
| **Toast** | Sonner | 1.x |

---

## 10. План реализации

### Этап 1: Базовая интеграция
1. Установить TanStack Query
2. Создать API client с auth interceptor
3. Настроить QueryProvider

### Этап 2: Auth Flow
1. Реализовать useAuth hook
2. Token refresh logic
3. Persist tokens в Zustand

### Этап 3: Data Hooks
1. useUserProfile
2. useBreathingSessions
3. useBreathingStats

### Этап 4: Mutations
1. Сохранение сессий с optimistic update
2. Обновление профиля
3. Sync при возврате онлайн

### Этап 5: Offline Support
1. Persist TanStack Query cache
2. Queue failed mutations
3. Background sync

---

## Источники

1. [TanStack Query Documentation](https://tanstack.com/query/latest)
2. [TkDodo's Blog - React Query Expert](https://tkdodo.eu/blog/)
3. [Telegram Mini Apps Auth](https://docs.telegram-mini-apps.com/platform/authorizing-user)
4. [Zustand Documentation](https://docs.pmnd.rs/zustand)
5. [Offline-First Frontend Apps 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
