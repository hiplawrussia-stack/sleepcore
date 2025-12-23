# Sprint 5: GamificationRepository Research Report

**Date:** 2025-12-24
**Status:** COMPLETED
**Branch:** feature/migrate-to-grammy
**Project:** SleepCore (CBT-I Digital Therapeutic)

---

## Executive Summary

This research report analyzes 2025 best practices for implementing Repository Pattern for gamification data persistence. The analysis covers Repository Pattern evolution, TypeScript ORM trends, Unit of Work pattern, and gamification-specific persistence requirements.

---

## 1. Repository Pattern Best Practices 2025

### 1.1 Core Principles

| Principle | Description | Source |
|-----------|-------------|--------|
| **Abstraction** | Decouple business logic from data access | Clean Architecture |
| **Single Responsibility** | One repository per aggregate root | DDD |
| **Testability** | Easy mocking via interfaces | SOLID |
| **Flexibility** | Swap implementations without code changes | Dependency Inversion |

### 1.2 Repository Pattern Evolution

**Traditional (2020):**
```typescript
interface IRepository<T> {
  findById(id): T;
  save(entity): void;
  delete(id): void;
}
```

**Modern (2025):**
```typescript
interface IRepository<T, ID> {
  // Core CRUD
  findById(id: ID): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<T[]>;
  findBy(criteria: Partial<T>): Promise<T[]>;
  save(entity: T): Promise<T>;

  // GDPR compliance
  softDelete(id: ID): Promise<boolean>;
  hardDelete(id: ID): Promise<boolean>;
  restore(id: ID): Promise<boolean>;

  // Domain-specific methods
  // Added per aggregate needs
}
```

### 1.3 Key 2025 Trends

1. **Type-safe queries** - TypeScript generics, Drizzle ORM
2. **Soft delete by default** - GDPR Article 17 compliance
3. **Audit timestamps** - created_at, updated_at, deleted_at
4. **Domain-specific methods** - Not just CRUD, business operations
5. **Transaction support** - Unit of Work pattern integration

**Sources:**
- [Clean Architecture with TypeScript](https://blog.alexrusin.com/clean-architecture-in-node-js-implementing-the-repository-pattern-with-typescript-and-prisma/)
- [Repository Pattern in NestJS](https://medium.com/@vimulatus/repository-pattern-in-nest-js-with-drizzle-orm-e848aa75ecae)

---

## 2. TypeScript ORM Trends 2025

### 2.1 ORM Comparison

| ORM | Performance | Type Safety | SQLite Support | Use Case |
|-----|-------------|-------------|----------------|----------|
| **Drizzle** | 100x faster | Excellent | Full | Lightweight, serverless |
| **Prisma** | Moderate | Excellent | Full | Rapid development |
| **TypeORM** | Moderate | Good | Full | Enterprise |
| **MikroORM** | Fast | Excellent | Full | DDD/UoW focus |
| **better-sqlite3** | Fastest | Manual | Native | Raw performance |

### 2.2 Current SleepCore Stack

SleepCore uses **better-sqlite3** with manual type mapping:
- Synchronous API (faster than async for SQLite)
- Manual `rowToEntity()` / `entityToParams()` mapping
- BaseRepository with generic CRUD

**Decision:** Continue with better-sqlite3 + BaseRepository pattern for consistency.

### 2.3 Drizzle ORM Consideration (Future)

For future migration, Drizzle offers:
- Schema-first, TypeScript-native
- Zero code generation
- 100x faster than Prisma for SQLite
- Built-in transaction support

**Sources:**
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Top TypeScript ORM 2025](https://www.bytebase.com/blog/top-typescript-orm/)

---

## 3. Unit of Work Pattern

### 3.1 When to Use

| Scenario | Unit of Work Needed |
|----------|---------------------|
| Single entity CRUD | No |
| Multiple related entities | Yes |
| Atomic business transaction | Yes |
| Complex gamification updates | Yes |

### 3.2 SQLite Transaction Handling

better-sqlite3 transactions are synchronous:
```typescript
const transaction = db.transaction((userId, xp, achievement) => {
  updateXP(userId, xp);
  unlockAchievement(userId, achievement);
  updateStreak(userId);
});
transaction(123, 50, 'first_login');
```

**Important:** Async functions DON'T work with better-sqlite3 transactions. All operations must be synchronous within a transaction.

### 3.3 Gamification Transaction Example

When a quest is completed:
1. Update quest status → completed
2. Add XP transaction
3. Update gamification_state (total XP, level)
4. Check & unlock achievements
5. Update streak

All must succeed or fail together.

**Sources:**
- [Unit of Work in Node.js](https://dev.to/schead/using-clean-architecture-and-the-unit-of-work-pattern-on-a-nodejs-application-3pc9)
- [MikroORM Unit of Work](https://mikro-orm.io/)

---

## 4. Gamification Persistence Patterns

### 4.1 RWTH-ACIS Gamification Framework

Open-source reference architecture:
- Separate services: Achievement, Badge, Level, Point, Quest, Streak
- Each game has its own schema
- PostgreSQL with schema isolation

### 4.2 Key Data Patterns

| Data Type | Persistence Pattern | Reason |
|-----------|---------------------|--------|
| **XP Transactions** | Event sourcing (append-only) | Audit trail, replay capability |
| **Achievements** | Upsert on unlock | Idempotent, no duplicates |
| **Streaks** | Row per type per user | Fast lookup, update |
| **Quests** | Status-based lifecycle | Track progress, expiration |
| **Settings** | Single row per user | Fast read, rare write |

### 4.3 Streak Persistence (Duolingo Research)

- **Soft Reset:** Keep 50% of streak on break (21% less churn)
- **Grace Period:** 3 hours after midnight
- **Freeze Tokens:** Max 3 accumulated
- **Compassion Mode:** Auto-freeze on detected stress

**Sources:**
- [RWTH-ACIS Gamification Framework](https://github.com/rwth-acis/Gamification-Framework)
- [Duolingo Streak Psychology](https://trophy.so/blog/streaks-gamification-case-study)

---

## 5. Existing SleepCore Analysis

### 5.1 Current In-Memory Storage

| Service | Data Structure | Needs Persistence |
|---------|----------------|-------------------|
| QuestService | `Map<string, IActiveQuest[]>` | Yes |
| BadgeService | `Map<string, IUserBadge[]>` | Yes |
| BadgeService | `Map<string, Map<string, number>>` | Yes (metrics) |
| SonyaEvolutionService | `Map<number, IEvolutionState>` | Yes |

### 5.2 Migration 005 Tables (Sprint 4)

```
gamification_state     → XP, level, engagement
xp_transactions        → Event log
achievements           → Badges unlocked
streaks                → Streak data
user_quests            → Quest progress
inventory              → Items
gamification_settings  → Ethical gamification
session_tracking       → Anti-addiction
daily_session_summary  → Daily stats
```

### 5.3 Repository Pattern in SleepCore

```
BaseRepository<T, ID>
├── rowToEntity(row) → T
├── entityToParams(entity) → Record
├── getInsertColumns() → string[]
├── findById, findAll, findBy
├── insert, update
├── delete (soft), hardDelete
└── restore, exists, count

Domain Repositories:
├── UserRepository
├── SleepDiaryRepository
├── AssessmentRepository
└── TherapySessionRepository [NEW: GamificationRepository]
```

---

## 6. Repository Design

### 6.1 Proposed Interface

```typescript
interface IGamificationRepository {
  // Gamification State
  getState(userId: number): Promise<IGamificationStateEntity | null>;
  saveState(state: IGamificationStateEntity): Promise<IGamificationStateEntity>;

  // XP Transactions (event log)
  addXPTransaction(tx: IXPTransactionEntity): Promise<IXPTransactionEntity>;
  getXPTransactions(userId: number, limit?: number): Promise<IXPTransactionEntity[]>;
  getTotalXP(userId: number): Promise<number>;

  // Achievements/Badges
  getAchievements(userId: number): Promise<IAchievementEntity[]>;
  unlockAchievement(userId: number, achievementId: string): Promise<IAchievementEntity>;
  hasAchievement(userId: number, achievementId: string): Promise<boolean>;

  // Streaks
  getStreaks(userId: number): Promise<IStreakEntity[]>;
  getStreak(userId: number, type: string): Promise<IStreakEntity | null>;
  updateStreak(userId: number, type: string, count: number): Promise<IStreakEntity>;
  freezeStreak(userId: number, type: string, until: Date): Promise<boolean>;

  // Quests
  getActiveQuests(userId: number): Promise<IUserQuestEntity[]>;
  startQuest(userId: number, questId: string): Promise<IUserQuestEntity>;
  updateQuestProgress(userId: number, questId: string, objectives: object): Promise<IUserQuestEntity>;
  completeQuest(userId: number, questId: string): Promise<IUserQuestEntity>;

  // Settings
  getSettings(userId: number): Promise<IGamificationSettingsEntity | null>;
  saveSettings(settings: IGamificationSettingsEntity): Promise<IGamificationSettingsEntity>;

  // Composite operations (with transactions)
  awardQuestCompletion(userId: number, questId: string, xp: number, badge?: string): Promise<void>;
}
```

### 6.2 Entity Definitions

Based on Migration 005 tables, entities include:
- `IGamificationStateEntity`
- `IXPTransactionEntity`
- `IAchievementEntity`
- `IStreakEntity`
- `IUserQuestEntity`
- `IInventoryEntity`
- `IGamificationSettingsEntity`
- `ISessionTrackingEntity`

---

## 7. Implementation Plan

### 7.1 Files to Create

1. **Interface:** `src/infrastructure/database/interfaces/IGamificationRepository.ts`
2. **Entities:** Gamification entity types (in same file or separate)
3. **Repository:** `src/infrastructure/database/repositories/GamificationRepository.ts`
4. **Tests:** `tests/infrastructure/database/repositories/GamificationRepository.spec.ts`

### 7.2 Integration Points

1. Register in database index exports
2. Create in DatabaseFactory
3. Update GamificationEngine to use repository
4. Update QuestService, BadgeService to use repository

---

## 8. Conclusion

**Key Findings:**

1. **Repository Pattern 2025:** Type-safe, GDPR-compliant, domain-specific methods
2. **better-sqlite3:** Continue using for performance, synchronous transactions
3. **Unit of Work:** Needed for atomic gamification updates (quest completion)
4. **Drizzle ORM:** Consider for future migration (100x faster than Prisma)
5. **Gamification specifics:** Event sourcing for XP, upsert for achievements

**Implementation:** Follow SleepCore's existing BaseRepository pattern with domain-specific methods for gamification operations.

---

## References

1. [Clean Architecture with Repository Pattern](https://blog.alexrusin.com/clean-architecture-in-node-js-implementing-the-repository-pattern-with-typescript-and-prisma/)
2. [Drizzle ORM Documentation](https://orm.drizzle.team/)
3. [MikroORM Unit of Work](https://mikro-orm.io/)
4. [better-sqlite3 Transactions](https://github.com/WiseLibs/better-sqlite3)
5. [RWTH-ACIS Gamification Framework](https://github.com/rwth-acis/Gamification-Framework)
6. [Duolingo Streak Psychology](https://trophy.so/blog/streaks-gamification-case-study)
7. [Habitica Gamification Case Study](https://trophy.so/blog/habitica-gamification-case-study)
8. [Top TypeScript ORM 2025](https://www.bytebase.com/blog/top-typescript-orm/)
