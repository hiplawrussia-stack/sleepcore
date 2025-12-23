# Sprint 4: Persistence Layer Research Report

**Date:** 2025-12-24
**Status:** COMPLETED
**Branch:** feature/migrate-to-grammy
**Project:** SleepCore (CBT-I Digital Therapeutic)

---

## Executive Summary

This research report analyzes 2025 best practices for implementing persistence layer for gamification data in the SleepCore platform. The analysis covers SQLite optimization, gamification data patterns, GDPR compliance, and recommended schema design.

---

## 1. SQLite Trends & Best Practices 2025

### 1.1 SQLite Alternatives Evaluated

| Technology | Use Case | Performance | Decision |
|------------|----------|-------------|----------|
| **SQLite** | Embedded, single-node | Excellent | **Selected** |
| **Turso/LibSQL** | Cloud-native SQLite | Good | Future consideration |
| **DuckDB** | Analytics/OLAP | Excellent for analytics | Not applicable |
| **better-sqlite3** | Node.js sync driver | Fastest | **Currently in use** |
| **Drizzle ORM** | TypeScript ORM | 100x faster than Prisma | Future migration |

### 1.2 SQLite Performance Configuration (Already Implemented in SleepCore)

```sql
PRAGMA journal_mode = WAL;           -- Concurrent reads during writes
PRAGMA synchronous = NORMAL;         -- Safe for WAL mode
PRAGMA cache_size = -64000;          -- ~64MB cache
PRAGMA busy_timeout = 5000;          -- 5 seconds
PRAGMA mmap_size = 268435456;        -- 256MB memory-mapped I/O
PRAGMA temp_store = MEMORY;          -- Faster temp tables
PRAGMA foreign_keys = ON;            -- Referential integrity
```

### 1.3 Key Findings

1. **SQLite remains optimal** for embedded Telegram bots with < 10K daily users
2. **WAL mode** enables concurrent reads during writes (already in SQLiteConnection.ts)
3. **better-sqlite3** is the fastest Node.js driver (synchronous API)
4. **Drizzle ORM** recommended for future migration (TypeScript-first, no code generation)

---

## 2. Gamification Data Persistence Patterns

### 2.1 Research Sources

- Frontiers in Sleep 2025: Gamification Psychology
- Octalysis Framework (Yu-kai Chou)
- UCL Habit Formation Study (Phillippa Lally, 2009)
- Duolingo Engineering Blog (Streak Systems)

### 2.2 Key Metrics for Persistence

| Metric | Importance | Storage Pattern |
|--------|------------|-----------------|
| **Progress Tracking** | 91% rated important | Real-time updates |
| **Streak Data** | Critical for retention | Soft delete, versioning |
| **Achievement History** | High engagement driver | Append-only |
| **XP Transactions** | Audit trail | Event log |

### 2.3 Streak Persistence Patterns

1. **Reset to Zero** - Traditional, causes user churn
2. **Maintain Last Value** - Duolingo approach, 21% less churn
3. **Soft Reset (Ramp-Down)** - Keep 50%, minimum 3 days
4. **Compassion Mode** - Auto-freeze on stress detection

**Recommendation:** Implement Soft Reset + Compassion Mode (already in GamificationEngine)

### 2.4 Data Denormalization Tradeoffs

| Approach | Read Performance | Write Complexity | Chosen |
|----------|------------------|------------------|--------|
| Normalized (3NF) | O(n) joins | Simple | For rare data |
| Denormalized JSON | O(1) lookup | Update complexity | For hot paths |
| Hybrid | Balanced | Moderate | **Selected** |

---

## 3. GDPR & Privacy Compliance

### 3.1 Legal Context 2025

- **€5.65 billion** in GDPR fines by March 2025
- **82% of world population** covered by privacy laws
- **Article 5** - Data minimization & purpose limitation
- **Article 17** - Right to erasure

### 3.2 Already Implemented Compliance Features in SleepCore

```typescript
// Soft delete pattern (all tables have deleted_at)
deleted_at TEXT

// BaseRepository with GDPR methods
softDelete(id)
permanentDelete(id)
```

### 3.3 Data Retention Recommendations

| Data Type | Retention Period | Legal Basis |
|-----------|------------------|-------------|
| User profile | Until deletion request | Consent |
| Sleep diary | 1 year + anonymize | Legitimate interest |
| Achievement history | Indefinite (anonymized) | Legitimate interest |
| Session tracking | 30 days | Performance monitoring |
| XP transactions | 1 year | Audit trail |

---

## 4. Existing SleepCore Database Analysis

### 4.1 Current Schema (Migrations 001-004)

```
migrations (version tracking)
├── users (id, external_id, chronotype, prakriti, consent)
├── sleep_diary_entries (user_id, date, sleep metrics)
├── assessments (user_id, type: isi/meq/mctq/dbas, score)
├── therapy_sessions (user_id, session_type, status)
├── cultural_adaptations (prakriti, tcm_constitution)
└── bot_sessions (Grammy session persistence)
```

### 4.2 Missing Persistence (In-Memory Only)

Currently stored in `Map<number, IGamificationState>`:
- XP transactions & level progress
- Achievement unlocks & progress
- Streak data (daily_login, emotion_log)
- Quest state (active, completed, objectives)
- Inventory items
- Session tracking (wellbeing limits)

---

## 5. Recommended Schema Design

### 5.1 Migration 005: Gamification Tables

New tables for Sprint 4:
- `gamification_state` - Core progression
- `xp_transactions` - Event log
- `achievements` - Unlocked achievements
- `streaks` - Streak tracking
- `user_quests` - Quest progress
- `inventory` - User items
- `gamification_settings` - Ethical gamification config
- `session_tracking` - Anti-addiction monitoring

### 5.2 Design Decisions

| Decision | Rationale |
|----------|-----------|
| Separate tables for each entity | Clear separation, efficient queries |
| JSON for objectives/metadata | Flexible schema, avoid joins |
| Event log for XP transactions | Audit trail, debugging |
| FK to users(id) | Consistent with SleepCore pattern |

---

## 6. Conclusion

The research confirms:

1. **SQLite is optimal** for SleepCore's use case
2. **Existing infrastructure is solid** - WAL mode, migrations, soft delete
3. **Migration 005** will persist all gamification data
4. **Ethical gamification** settings will be user-configurable
5. **GDPR compliance** maintained through soft delete and retention policies

---

## References

1. SQLite Documentation - PRAGMA Statements (2024)
2. Turso Blog - LibSQL: A Fork of SQLite (2024)
3. Drizzle ORM Documentation (2025)
4. Duolingo Engineering - Streak Psychology (2024)
5. GDPR Enforcement Tracker - €5.65B in fines (2025)
6. UCL Habit Formation Study - Phillippa Lally (2009)
7. Octalysis Framework - Yu-kai Chou
8. Frontiers in Psychology - Gamification & Motivation (2025)
