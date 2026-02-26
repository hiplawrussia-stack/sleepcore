# ADR-001: Single API Client

**Status:** Accepted
**Date:** 2026-02-24
**Context:** API client duplication issue

## Problem

Two API clients existed in parallel:
- `services/api.ts` (Phase B2, Dec 2025) — simple fetch wrapper
- `api/client.ts` (API Integration, Dec 2025) — TanStack Query, JWT, retry

This caused:
- Security inconsistency (old client lacked auth_date validation)
- Code confusion (3 files used old, 8 files used new)
- Maintenance burden (updates only in one file)

## Decision

**Use single API client at `@/api/client.ts`**

### Structure
```
src/
├── api/                    # ← SINGLE SOURCE OF TRUTH for HTTP
│   ├── client.ts           # apiClient singleton
│   ├── types.ts            # TypeScript interfaces
│   ├── schemas.ts          # Zod runtime validation
│   ├── queryKeys.ts        # TanStack Query cache keys
│   └── index.ts            # Public API exports
│
├── services/               # ← NON-HTTP utilities only
│   ├── telegram.ts         # Telegram SDK wrapper
│   ├── haptics.ts          # Haptic feedback
│   └── sentry.ts           # Error monitoring
│
└── hooks/                  # Use apiClient via hooks
    └── useBreathing.ts     # const { data } = useQuery(...)
```

### Rules
1. **api/** = HTTP client + types + schemas
2. **services/** = NON-HTTP utilities (Telegram, haptics, crypto)
3. Components → hooks → api (never direct api calls in components)
4. ESLint enforces: `no-restricted-imports` blocks `@/services/api`

## Consequences

### Positive
- Single source of truth for API calls
- Consistent security (JWT, retry, validation)
- Clear module boundaries
- ESLint prevents regression

### Negative
- Migration required for existing code
- Slightly more verbose (try/catch vs {success, data})

## Migration

Migrated files:
- `pages/Breathing.tsx` — api.checkEvolution() → apiClient.request()
- `components/common/PrivacyCenter.tsx` — api.deleteUserData() → apiClient.request()
- `store/userStore.ts` — all api.* calls → apiClient.request()

Deleted: `services/api.ts`

## References

- [Feature-Sliced Design — API Layer](https://feature-sliced.design/docs/guides/examples/api-requests)
- [Bulletproof React — Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)
- [TanStack Query Best Practices](https://tanstack.com/query/latest/docs/framework/react/overview)
