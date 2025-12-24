# Phase B3: Backend API для Mini App - Исследование 2025

**Дата исследования:** 24 декабря 2025
**Цель:** Разработка Backend API для синхронизации Telegram Mini App SleepCore

---

## 1. Выбор Framework: Express vs Fastify vs Hono

### Сравнительный анализ производительности (2025)

| Framework | Requests/sec | Холодный старт | TypeScript | Рантаймы |
|-----------|-------------|----------------|------------|----------|
| **Hono** | 70,000+ | <50ms | Нативный | Node, Bun, Deno, Cloudflare, Vercel |
| **Fastify** | 70,000-80,000 | ~100ms | Отличный | Node.js |
| **Express** | 20,000-30,000 | ~150ms | Через types | Node.js |

**Источники:**
- [Hono vs Express vs Fastify - Level Up Coding](https://levelup.gitconnected.com/hono-vs-express-vs-fastify-the-2025-architecture-guide-for-next-js-5a13f6e12766)
- [Fastify vs Express vs Hono - Better Stack](https://betterstack.com/community/comparisons/fastify-vs-express-vs-hono/)

### Рекомендация: **Hono**

**Причины выбора Hono для SleepCore:**

1. **Runtime Portability** - Работает везде: Node.js, Bun, Cloudflare Workers, Vercel Edge
2. **WinterCG Standards** - Соответствует современным веб-стандартам
3. **Минимальный размер** - ~13KB, идеально для serverless
4. **Встроенная валидация** - Zod интеграция из коробки
5. **TypeScript-first** - Автоматический вывод типов

```typescript
// Пример Hono API
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()

app.post('/api/breathing/session',
  zValidator('json', z.object({
    patternId: z.string(),
    cycles: z.number().min(1),
    duration: z.number()
  })),
  async (c) => {
    const session = c.req.valid('json')
    // Save to database
    return c.json({ success: true })
  }
)
```

---

## 2. Аутентификация Telegram Mini App

### Механизм initData Validation

Telegram Mini App передаёт `initData` - подписанную строку с данными пользователя.

**Алгоритм валидации (RFC 8018):**

```typescript
import { createHmac } from 'crypto'

function validateTelegramInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  params.delete('hash')

  // Sort and join params
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  // HMAC-SHA256 with "WebAppData" key
  const secretKey = createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest()

  const calculatedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  return calculatedHash === hash
}
```

**Источники:**
- [Telegram Init Data Docs](https://docs.telegram-mini-apps.com/platform/init-data)
- [@telegram-apps/init-data-node](https://docs.telegram-mini-apps.com/packages/telegram-apps-init-data-node)

### Защита от Replay Attacks

```typescript
function isInitDataFresh(authDate: number, maxAgeSeconds = 86400): boolean {
  const now = Math.floor(Date.now() / 1000)
  return (now - authDate) < maxAgeSeconds
}
```

**Best Practices:**
- Проверять `auth_date` (рекомендуемое окно: 5 минут - 24 часа)
- Использовать JWT для session management после валидации
- Ed25519 подпись для third-party верификации (новое в 2025)

---

## 3. JWT Session Management

### Структура токенов

```typescript
interface JWTPayload {
  // Telegram user data
  telegramId: number
  firstName: string
  username?: string

  // Session metadata
  iat: number      // Issued at
  exp: number      // Expiration (15 min for access, 7d for refresh)
  jti: string      // Unique token ID for revocation
}
```

### Рекомендации OWASP 2025

| Аспект | Рекомендация |
|--------|--------------|
| **Алгоритм** | ES256 или RS256 (не HS256 для production) |
| **Срок жизни** | Access: 15 min, Refresh: 7 дней |
| **Хранение** | HttpOnly cookies или Telegram CloudStorage |
| **Revocation** | Redis denylist для logout |
| **DPoP** | Sender-constrained tokens для критических операций |

**Источники:**
- [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [JWT Best Practices - Curity](https://curity.io/resources/learn/jwt-best-practices/)

---

## 4. Rate Limiting & Caching

### Redis-based Rate Limiting

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 req/min
  analytics: true,
})

// Middleware
async function rateLimitMiddleware(c, next) {
  const telegramId = c.get('user').telegramId
  const { success, limit, remaining } = await ratelimit.limit(telegramId)

  c.header('X-RateLimit-Limit', limit.toString())
  c.header('X-RateLimit-Remaining', remaining.toString())

  if (!success) {
    return c.json({ error: 'Too many requests' }, 429)
  }

  return next()
}
```

### Caching Strategy

| Тип данных | TTL | Стратегия |
|------------|-----|-----------|
| User profile | 5 min | Cache-aside |
| Breathing stats | 1 min | Write-through |
| Patterns list | 24h | Static cache |
| Session data | 15 min | Redis |

**Источники:**
- [API Rate Limiting Best Practices 2025 - Zuplo](https://zuplo.com/learning-center/10-best-practices-for-api-rate-limiting-in-2025)
- [Redis Caching Strategies 2025](https://www.digitalapplied.com/blog/redis-caching-strategies-nextjs-production)

---

## 5. Offline-First Sync Architecture

### Принципы

1. **Local-first** - Локальная БД как source of truth
2. **Incremental sync** - Только дельты, не всё
3. **Conflict resolution** - Last-write-wins с timestamps
4. **Background sync** - Когда появляется сеть

### API Endpoints для синхронизации

```typescript
// GET /api/sync/changes?since=1703419200
interface SyncChangesResponse {
  changes: Array<{
    entity: 'session' | 'profile' | 'quest'
    action: 'create' | 'update' | 'delete'
    data: Record<string, unknown>
    timestamp: number
  }>
  serverTime: number
  hasMore: boolean
}

// POST /api/sync/push
interface SyncPushRequest {
  changes: Array<{
    localId: string
    entity: string
    action: string
    data: Record<string, unknown>
    clientTimestamp: number
  }>
  lastSyncTime: number
}
```

**Источники:**
- [Offline-First App Architecture 2025](https://www.aalpha.net/blog/offline-app-architecture-building-offline-first-apps/)
- [Android Offline-First Guide](https://developer.android.com/topic/architecture/data-layer/offline-first)

---

## 6. Database: SQLite + PostgreSQL

### Гибридный подход

| Слой | База данных | Назначение |
|------|-------------|------------|
| **Mini App (client)** | IndexedDB/localStorage | Offline кэш |
| **Bot (server)** | SQLite | Основная БД (существующая) |
| **API (server)** | SQLite | Общая БД с ботом |
| **Future scale** | PostgreSQL | При >10K пользователей |

### Почему SQLite для текущего этапа

- **Уже используется** в боте (миграции готовы)
- **Zero-config** - Не нужен отдельный сервер
- **ACID compliant** - Надёжность транзакций
- **Достаточно для MVP** - До 100K пользователей

**Источники:**
- [SQLite vs PostgreSQL Comparison](https://sqlflash.ai/article/20251119_sqlite_vs_pg/)

---

## 7. Health Checks (Kubernetes-ready)

### Endpoints

```typescript
// Liveness - "Am I alive?"
app.get('/health/live', (c) => c.json({ status: 'ok' }))

// Readiness - "Can I accept traffic?"
app.get('/health/ready', async (c) => {
  try {
    await db.query('SELECT 1')
    return c.json({ status: 'ready', db: 'connected' })
  } catch {
    return c.json({ status: 'not ready', db: 'disconnected' }, 503)
  }
})

// Startup - "Have I finished initializing?"
app.get('/health/startup', (c) => {
  if (isInitialized) {
    return c.json({ status: 'started' })
  }
  return c.json({ status: 'starting' }, 503)
})
```

**Источники:**
- [Kubernetes Health Checks Guide](https://betterstack.com/community/guides/monitoring/kubernetes-health-checks/)

---

## 8. OpenAPI & Type Generation

### Swagger/OpenAPI Spec

```yaml
openapi: 3.1.0
info:
  title: SleepCore Mini App API
  version: 1.0.0

paths:
  /api/breathing/session:
    post:
      summary: Log breathing session
      security:
        - TelegramAuth: []
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BreathingSession'
      responses:
        '201':
          description: Session logged
```

### Type Generation Tools

| Инструмент | Назначение |
|------------|------------|
| **@hono/zod-openapi** | Генерация OpenAPI из Zod схем |
| **orval** | Клиент для React Query из OpenAPI |
| **swagger-typescript-api** | TypeScript типы из OpenAPI |

**Источники:**
- [OpenAPI TypeScript Generation](https://www.webdevtutor.net/blog/typescript-codegen-swagger)
- [Orval - OpenAPI Client Generator](https://orval.dev/)

---

## 9. Архитектура API

### Структура проекта

```
api/
├── src/
│   ├── index.ts              # Entry point
│   ├── app.ts                # Hono app setup
│   ├── middleware/
│   │   ├── auth.ts           # Telegram initData validation
│   │   ├── rateLimit.ts      # Redis rate limiting
│   │   └── errorHandler.ts   # Global error handling
│   ├── routes/
│   │   ├── auth.ts           # /api/auth/*
│   │   ├── breathing.ts      # /api/breathing/*
│   │   ├── user.ts           # /api/user/*
│   │   ├── sync.ts           # /api/sync/*
│   │   └── health.ts         # /health/*
│   ├── services/
│   │   ├── userService.ts
│   │   ├── breathingService.ts
│   │   └── syncService.ts
│   ├── db/
│   │   ├── schema.ts         # Drizzle ORM schema
│   │   └── client.ts         # SQLite connection
│   └── types/
│       └── telegram.ts       # Telegram types
├── package.json
├── tsconfig.json
└── wrangler.toml             # Cloudflare Workers config
```

### API Endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/auth/telegram` | Валидация initData, выдача JWT |
| GET | `/api/user/profile` | Профиль пользователя |
| PUT | `/api/user/profile` | Обновление профиля |
| POST | `/api/breathing/session` | Сохранение сессии дыхания |
| GET | `/api/breathing/stats` | Статистика дыхания |
| GET | `/api/breathing/history` | История сессий |
| GET | `/api/sync/changes` | Инкрементальная синхронизация |
| POST | `/api/sync/push` | Push локальных изменений |
| GET | `/api/evolution/status` | Статус эволюции Сони |
| GET | `/api/quests/active` | Активные квесты |
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe |

---

## 10. Безопасность (OWASP 2025)

### Checklist

- [x] HTTPS only (TLS 1.3)
- [x] initData validation с проверкой auth_date
- [x] JWT с короткими сроками жизни
- [x] Rate limiting per user
- [x] Input validation (Zod)
- [x] CORS настроен для Mini App
- [x] Helmet.js headers
- [x] SQL injection prevention (prepared statements)
- [x] No sensitive data in JWT payload

### Headers

```typescript
import { secureHeaders } from 'hono/secure-headers'

app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
  },
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
}))
```

---

## 11. Deployment Options

### Рекомендация: Cloudflare Workers + D1

| Платформа | Плюсы | Минусы |
|-----------|-------|--------|
| **Cloudflare Workers** | Edge, бесплатный тир, D1 SQLite | Лимит CPU 50ms |
| **Vercel Edge** | Интеграция с Next.js | Дороже |
| **Railway** | Простой деплой | $5/мес минимум |
| **Fly.io** | Близко к пользователям | Сложнее настройка |

### Cloudflare D1 (SQLite at Edge)

```typescript
// wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "sleepcore"
database_id = "xxx"

// Usage in Hono
app.get('/api/user/:id', async (c) => {
  const db = c.env.DB
  const user = await db
    .prepare('SELECT * FROM users WHERE telegram_id = ?')
    .bind(c.req.param('id'))
    .first()
  return c.json(user)
})
```

---

## 12. Интеграция с существующим ботом

### Shared Database

Bot и API используют одну SQLite базу данных:

```
┌─────────────────┐     ┌─────────────────┐
│  Telegram Bot   │     │   Mini App API  │
│    (Grammy)     │     │     (Hono)      │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │   SQLite    │
              │  Database   │
              └─────────────┘
```

### Event Communication

```typescript
// Bot emits events
eventEmitter.emit('breathing:completed', {
  userId: telegramId,
  patternId: '478',
  duration: 120
})

// API listens (or vice versa)
eventEmitter.on('breathing:completed', async (data) => {
  await updateUserStats(data)
  await checkQuestProgress(data)
})
```

---

## 13. Итоговые рекомендации

### Tech Stack

| Компонент | Технология |
|-----------|------------|
| **Framework** | Hono |
| **Runtime** | Node.js / Bun |
| **Database** | SQLite (existing) |
| **ORM** | Drizzle ORM |
| **Validation** | Zod |
| **Auth** | Telegram initData + JWT |
| **Rate Limit** | Redis (Upstash) |
| **Docs** | @hono/zod-openapi |

### MVP Scope

1. **Auth** - initData validation + JWT
2. **Breathing** - Session logging, stats
3. **User** - Profile CRUD
4. **Sync** - Incremental sync
5. **Health** - Kubernetes probes

### Метрики успеха

- Response time < 100ms p99
- Availability 99.9%
- Zero security vulnerabilities
- 100% type coverage

---

## Источники

1. [Telegram Mini App Docs](https://core.telegram.org/bots/webapps)
2. [Hono Documentation](https://hono.dev/)
3. [OWASP API Security](https://owasp.org/API-Security/)
4. [Kubernetes Health Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
5. [JWT Best Practices RFC8725](https://datatracker.ietf.org/doc/html/rfc8725)
