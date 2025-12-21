# SleepCore

**AI-Powered Digital Therapeutic for Chronic Insomnia**

[![Version](https://img.shields.io/badge/version-1.0.0--alpha.4-blue.svg)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

SleepCore is a clinical-grade digital therapeutic (DTx) platform implementing evidence-based Cognitive Behavioral Therapy for Insomnia (CBT-I). Built on the CogniCore Engine, it provides AI-optimized personalized treatment for chronic insomnia.

## Market Context

- **Global DTx Market**: $4.68B (2024) → $10.09B (2029)
- **Sleep Software Market**: $878.9M (2024) → $1,569.2M (2030)
- **FDA-Cleared Comparators**: SleepioRx (Big Health), Somryst (Pear Therapeutics)

## Features

### Core CBT-I Components (5-Component Protocol)

| Component | Description | Status |
|-----------|-------------|--------|
| **Sleep Restriction (SRT)** | Optimizes time-in-bed based on sleep efficiency | Implemented |
| **Stimulus Control (SCT)** | Bed-only-for-sleep conditioning | Implemented |
| **Cognitive Restructuring** | Dysfunctional belief identification & challenge | Implemented |
| **Sleep Hygiene (SHE)** | Environment & behavior optimization | Implemented |
| **Relaxation Training** | 7 techniques (PMR, breathing, imagery, etc.) | Implemented |

### AI/ML Optimization

- **POMDP Framework**: Optimal intervention selection under uncertainty
- **Thompson Sampling**: Personalized treatment via bandit algorithms
- **Kalman Filter**: Continuous sleep state estimation
- **Digital Twin**: Predictive user modeling

### Extended Therapies

- **MBT-I**: Mindfulness-Based Therapy for Insomnia (Ong et al., 2014)
- **ACT-I**: Acceptance & Commitment Therapy for Insomnia (Meadows et al.)
- **Chronotherapy**: Circadian rhythm optimization (MEQ, MCTQ)
- **TCM Integration**: Traditional Chinese Medicine sleep protocols
- **Ayurveda Integration**: Yoga Nidra, Dinacharya, herbal support

### Clinical Assessments

- **ISI (Insomnia Severity Index)**: Russian-validated (Cronbach's α = 0.77)
- **MEQ (Morningness-Eveningness)**: 19-item chronotype assessment
- **MCTQ (Munich Chronotype)**: Actual sleep behavior analysis
- **DBAS**: Dysfunctional Beliefs About Sleep scale

### Infrastructure

- **Database**: SQLite (development) / PostgreSQL (production)
- **Security**: AES-256-GCM encryption, HIPAA audit trail, automated backups
- **Migrations**: Version-controlled schema management
- **Repository Pattern**: Clean data access abstraction

## Architecture

```
src/
├── SleepCoreAPI.ts          # Main facade (unified API)
├── assessment/              # Clinical instruments (ISI, MEQ, etc.)
├── cbt-i/                   # 5-component CBT-I engines
├── circadian/               # Chronotype & circadian AI
├── cultural-adaptations/    # TCM, Ayurveda integrations
├── diary/                   # Sleep diary service
├── evidence-base/           # Clinical guidelines (EU 2023)
├── infrastructure/          # Database & security
│   └── database/
│       ├── migrations/      # Schema versioning
│       ├── repositories/    # Data access layer
│       ├── security/        # Encryption, audit, backup
│       ├── sqlite/          # SQLite implementation
│       └── postgres/        # PostgreSQL implementation
├── personalization/         # User adaptation
├── platform/                # POMDP algorithms
├── sleep/                   # Sleep state interfaces
└── third-wave/              # MBT-I, ACT-I engines
```

## Quick Start

### Installation

```bash
npm install
```

### Configuration

```bash
# Environment variables
NODE_ENV=development|production
DATABASE_TYPE=sqlite|postgres
SQLITE_PATH=./data/sleepcore.db      # For SQLite
DATABASE_URL=postgresql://...         # For PostgreSQL
ENCRYPTION_MASTER_KEY=<64-hex-chars>  # For PHI encryption
```

### Usage

```typescript
import { sleepCore } from '@sleepcore/app';

// Start session
const session = sleepCore.startSession('user123');

// Collect baseline (7+ days of sleep diary)
for (const entry of baselineEntries) {
  sleepCore.addDiaryEntry(entry);
}

// Initialize treatment
const plan = sleepCore.initializeTreatment('user123', baselineStates);

// Daily flow
const result = sleepCore.processDailyCheckIn({
  userId: 'user123',
  date: '2025-01-15',
  diaryEntry: todayEntry,
  morningMood: 4,
  energyLevel: 3,
  followedSleepWindow: true,
  usedRelaxation: true,
});

// Track progress
const progress = sleepCore.getProgressReport('user123');
console.log(`ISI: ${progress.currentISI} (change: ${progress.isiChange})`);
```

## Treatment Protocol

### 8-Week Program Structure

| Week | Phase | Focus |
|------|-------|-------|
| 1 | Assessment | Baseline collection, ISI, chronotype |
| 2 | Education | Sleep hygiene, CBT-I introduction |
| 3-4 | Intervention | SRT + SCT implementation |
| 5-6 | Cognitive | Belief restructuring, relaxation |
| 7-8 | Maintenance | Consolidation, relapse prevention |

### Clinical Targets

- **ISI Reduction**: >7 points (MCID)
- **Sleep Efficiency**: >85%
- **SOL**: <20 minutes
- **WASO**: <30 minutes
- **Remission Rate**: >50% (ISI ≤ 7)

## Database Infrastructure

### Phases Completed

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | SQLite + Migrations | Complete |
| Phase 2 | Sleep-specific Repositories | Complete |
| Phase 3 | PostgreSQL Abstraction | Complete |
| Phase 4 | Encryption + Audit + Backup | Complete |

### Security Features

- **EncryptionService**: AES-256-GCM for PHI fields
- **AuditService**: HIPAA-compliant 6-year audit trail
- **BackupService**: WAL checkpoint + cloud upload

## API Reference

### Session Management
```typescript
sleepCore.startSession(userId)
sleepCore.getSession(userId)
sleepCore.endSession(userId)
```

### Sleep Diary
```typescript
sleepCore.addDiaryEntry(entry)
sleepCore.getWeeklySummary(userId, weekStart)
sleepCore.analyzePatterns(userId)
```

### CBT-I Treatment
```typescript
sleepCore.initializeTreatment(userId, baselineData)
sleepCore.processDailyCheckIn(checkIn)
sleepCore.getNextIntervention(userId)
sleepCore.assessResponse(userId)
```

### Third-Wave Therapies
```typescript
sleepCore.initializeMBTI(userId, baseline, options)
sleepCore.getMindfulnessPractice(userId, context, duration)
sleepCore.initializeACTI(userId, baseline)
sleepCore.getDefusionTechnique(experience, level)
```

### Circadian Optimization
```typescript
sleepCore.assessChronotypeFromMEQ(userId, response)
sleepCore.generateChronotherapyPlan(userId)
sleepCore.getSocialJetlag(userId)
```

## Evidence Base

### Clinical Guidelines
- European Insomnia Guideline 2023
- AASM Clinical Practice Guidelines
- American College of Physicians recommendations

### Scientific References
- Spielman et al. (1987) - Sleep Restriction
- Bootzin (1972) - Stimulus Control
- Morin et al. (1993) - ISI development
- Ong et al. (2014) - MBT-I protocol

### Benchmark Studies
- **SleepioRx**: 76% achieve healthy sleep, 54% SOL reduction
- **Somryst**: 9-week structured dCBT-I protocol

## Development

### Scripts

```bash
npm run build        # TypeScript compilation
npm run dev          # Watch mode
npm run test         # Run tests
npm run test:coverage # Coverage report
npm run lint         # ESLint check
```

### Dependencies

- **CogniCore Engine**: POMDP, Thompson Sampling, Kalman Filter
- **better-sqlite3**: SQLite driver
- **pg**: PostgreSQL driver

## Roadmap

See [ROADMAP.md](ROADMAP.md) for detailed development plan.

### Upcoming Phases
- Phase 5: Test Coverage (>80%)
- Phase 6: Content Library (educational materials)
- Phase 7: Wearable Integration (Apple Health, Fitbit)
- Phase 8: FDA 510(k) Preparation

## License

MIT License - see LICENSE for details.

## Contact

- **Tech**: tech@awfond.ru
- **Platform**: CogniCore Engine
