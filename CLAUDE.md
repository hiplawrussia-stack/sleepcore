# CLAUDE.md

This file provides guidance to Claude Code when working with the SleepCore codebase.

## Project Overview

**SleepCore** - AI-powered digital therapeutic (DTx) for chronic insomnia treatment using evidence-based CBT-I (Cognitive Behavioral Therapy for Insomnia). Built on CogniCore Engine with POMDP-based personalization.

**Version**: 1.0.0-alpha.4
**Language**: TypeScript
**Target**: Clinical-grade DTx (FDA 510(k) pathway)

## Build & Development Commands

```bash
npm run build        # TypeScript compilation
npm run dev          # Watch mode
npm run test         # Run Jest tests
npm run test:coverage # Coverage report
npm run lint         # ESLint check
npm run start        # Run from dist/
```

## Architecture Overview

### Layer Structure

```
src/
├── SleepCoreAPI.ts              # Main facade (entry point)
├── index.ts                     # Public exports
├── assessment/                  # Clinical instruments
│   └── instruments/
│       └── ISIRussian.ts       # Insomnia Severity Index
├── cbt-i/                      # Core CBT-I engines
│   ├── engines/
│   │   ├── CBTIEngine.ts       # Orchestrator
│   │   ├── SleepRestrictionEngine.ts
│   │   ├── StimulusControlEngine.ts
│   │   ├── CognitiveRestructuringEngine.ts
│   │   ├── SleepHygieneEngine.ts
│   │   └── RelaxationEngine.ts
│   └── interfaces/
│       └── ICBTIComponents.ts  # Type definitions
├── circadian/                  # Chronotype & rhythm
│   └── CircadianAI.ts
├── cultural-adaptations/       # TCM, Ayurveda
├── diary/                      # Sleep diary service
│   └── SleepDiaryService.ts
├── evidence-base/              # Clinical guidelines
├── infrastructure/             # Database layer
│   └── database/
│       ├── interfaces/         # IDatabaseConnection, IRepository
│       ├── migrations/         # Schema versioning
│       ├── repositories/       # Data access
│       ├── security/           # Encryption, audit, backup
│       ├── sqlite/             # SQLite implementation
│       └── postgres/           # PostgreSQL implementation
├── platform/                   # AI/ML algorithms
│   └── SleepCorePOMDP.ts      # POMDP intervention selection
├── sleep/                      # Sleep state models
│   └── interfaces/
│       └── ISleepState.ts
└── third-wave/                 # MBT-I, ACT-I
    └── engines/
```

### Key Design Patterns

1. **Facade Pattern**: `SleepCoreAPI` provides unified access to all subsystems
2. **Factory Pattern**: `DatabaseFactory` for database creation
3. **Repository Pattern**: Data access abstraction
4. **Strategy Pattern**: Pluggable CBT-I component engines
5. **State Pattern**: POMDP state vector for sleep modeling

### CBT-I 5-Component System

| Component | Engine | Purpose |
|-----------|--------|---------|
| Sleep Restriction (SRT) | `SleepRestrictionEngine` | Optimize time-in-bed |
| Stimulus Control (SCT) | `StimulusControlEngine` | Bed-only-for-sleep |
| Cognitive Restructuring | `CognitiveRestructuringEngine` | Challenge beliefs |
| Sleep Hygiene (SHE) | `SleepHygieneEngine` | Environment/behavior |
| Relaxation Training | `RelaxationEngine` | 7 techniques |

## Critical Components

### SleepCoreAPI (Main Entry Point)

```typescript
import { sleepCore } from '@sleepcore/app';

// Session management
sleepCore.startSession(userId);
sleepCore.getSession(userId);
sleepCore.endSession(userId);

// Treatment flow
sleepCore.addDiaryEntry(entry);
sleepCore.initializeTreatment(userId, baseline);
sleepCore.processDailyCheckIn(checkIn);
sleepCore.getNextIntervention(userId);
sleepCore.assessResponse(userId);
```

### Database Layer

```typescript
import { DatabaseFactory, MIGRATIONS } from './infrastructure/database';

// Auto-detect database type
const db = await DatabaseFactory.create({ migrations: MIGRATIONS });

// Explicit SQLite
const sqliteDb = await DatabaseFactory.createSQLite('./data/sleepcore.db');

// Explicit PostgreSQL
const pgDb = await DatabaseFactory.createPostgreSQL(process.env.DATABASE_URL);
```

### Security Services

```typescript
import { EncryptionService, AuditService, BackupService } from './infrastructure/database';

// Field-level encryption
const encryption = new EncryptionService({ masterKey: process.env.ENCRYPTION_KEY });
const encrypted = encryption.encrypt('PHI-data');

// Audit logging
const audit = new AuditService(db);
await audit.logCreate('user', 1, userData, { userId: adminId });

// Automated backup
const backup = new BackupService({ backupDir: './backups' });
await backup.backup(db);
```

## Environment Configuration

```bash
# Required
NODE_ENV=development|production

# Database (auto-detected)
DATABASE_TYPE=sqlite|postgres
SQLITE_PATH=./data/sleepcore.db
DATABASE_URL=postgresql://user:pass@host:5432/sleepcore

# Security
ENCRYPTION_MASTER_KEY=<64-hex-chars>
BACKUP_ENCRYPTION_KEY=<64-hex-chars>
BACKUP_DIR=./backups
```

## Key Interfaces

### Sleep State

```typescript
interface ISleepState {
  sleepEfficiency: number;      // 0-100%
  isiScore: number;             // 0-28
  sleepOnsetLatency: number;    // minutes
  wakeAfterSleepOnset: number;  // minutes
  preSleepArousal: number;      // 0-1
  sleepAnxiety: number;         // 0-1
  circadianDeviation: number;   // hours
  treatmentAdherence: number;   // 0-1
}
```

### CBT-I Plan

```typescript
interface ICBTIPlan {
  userId: string;
  startDate: Date;
  currentPhase: CBTIPhase;
  currentWeek: number;
  sleepRestriction: ISleepRestrictionPrescription;
  cognitiveTargets: IDysfunctionalBelief[];
  hygieneRecommendations: ISleepHygieneRecommendation[];
  relaxationProtocol: IRelaxationProtocol;
  intensityLevel: IntensityLevel;
  baselineISI: number;
  targetISI: number;
}
```

### Sleep Diary Entry

```typescript
interface ISleepDiaryEntry {
  userId: string;
  date: string;           // YYYY-MM-DD
  bedtime: string;        // HH:MM
  lightsOffTime?: string;
  sleepOnsetLatency: number;  // minutes
  numberOfAwakenings: number;
  wakeAfterSleepOnset: number;  // minutes
  finalAwakening: string;  // HH:MM
  outOfBedTime: string;   // HH:MM
  subjectiveQuality: 'very_poor' | 'poor' | 'fair' | 'good' | 'excellent';
  notes?: string;
}
```

## Clinical Targets

| Metric | Target | MCID |
|--------|--------|------|
| ISI Score | <7 (remission) | >7 point reduction |
| Sleep Efficiency | >85% | +10% |
| SOL | <20 min | -10 min |
| WASO | <30 min | -15 min |

## Development Notes

### Adding New CBT-I Component

1. Create engine in `src/cbt-i/engines/NewEngine.ts`
2. Implement interface from `ICBTIComponents.ts`
3. Register in `CBTIEngine` orchestrator
4. Add to `SleepCoreAPI` facade
5. Export from `index.ts`

### Adding New Assessment

1. Create instrument in `src/assessment/instruments/`
2. Follow `ISIRussian.ts` pattern
3. Include validation and scoring
4. Add repository support if needed
5. Export from `src/assessment/index.ts`

### Database Migrations

```typescript
// src/infrastructure/database/migrations/XXX_name.ts
export const migration_XXX: IMigration = {
  version: XXX,
  name: 'descriptive_name',
  up: (db) => { /* SQL statements */ },
  down: (db) => { /* Rollback */ },
};

// Register in migrations/index.ts
export const MIGRATIONS = [...existing, migration_XXX];
```

## Testing Strategy

- **Unit Tests**: Each engine, service, and utility
- **Integration Tests**: Database operations, treatment flows
- **E2E Tests**: Complete 8-week treatment simulation
- **Coverage Target**: >80%

## Common Patterns

### Error Handling

```typescript
try {
  const result = await someOperation();
  return { success: true, data: result };
} catch (error) {
  console.error('[ComponentName] Operation failed:', error);
  return { success: false, error: error.message };
}
```

### Logging Convention

```typescript
console.log('[ComponentName] Action description');
console.warn('[ComponentName] Warning message');
console.error('[ComponentName] Error:', errorMessage);
```

## Current Limitations

1. **No Tests**: 0% coverage (Phase 5 priority)
2. **In-Memory Sessions**: Not persisted (fix: use repository)
3. **No Mobile App**: Desktop/API only (Phase 9)
4. **No Engagement**: No notifications/gamification (Phase 7)
5. **No Wearable Integration**: Subjective data only (Phase 8)

## References

- [README.md](README.md) - Project overview
- [ROADMAP.md](ROADMAP.md) - Development plan
- [CogniCore Engine](../cognicore-engine) - AI/ML foundation
- [European Insomnia Guideline 2023](src/evidence-base/guidelines/)
