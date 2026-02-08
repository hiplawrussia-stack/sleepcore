# SleepCore

**AI-Powered Digital Therapeutic for Chronic Insomnia**

[![Version](https://img.shields.io/badge/version-1.0.0--alpha.4-blue.svg)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-8752%2B-green.svg)](package.json)
[![Coverage](https://img.shields.io/badge/coverage-84.97%25-green.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

SleepCore is a clinical-grade digital therapeutic (DTx) platform implementing evidence-based Cognitive Behavioral Therapy for Insomnia (CBT-I). Built on the CogniCore Engine, it provides AI-optimized personalized treatment for chronic insomnia.

## Status

| Component | Status |
|-----------|--------|
| CBT-I Engine (5 components) | ✅ Complete |
| Third-Wave (MBT-I, ACT-I, MCT) | ✅ Complete |
| CogniCore Integration (POMDP, Digital Twin) | ✅ Complete |
| Precision Phenotyping | ✅ Complete |
| Wearable Backend + Android App | ✅ Complete |
| IEC 62304 Audit | ✅ Complete |
| Clinical Pilot | 🔜 Q2 2026 |

## Market Context

- **Global DTx Market**: $4.68B (2024) → $10.09B (2029)
- **Sleep Software Market**: $878.9M (2024) → $1,569.2M (2030)
- **FDA-Cleared Comparators**: SleepioRx (Big Health), Somryst (Pear Therapeutics)

## Features

### Core CBT-I Components (5-Component Protocol)

| Component | Description | Status |
|-----------|-------------|--------|
| **Sleep Restriction (SRT)** | Optimizes time-in-bed based on sleep efficiency | ✅ |
| **Stimulus Control (SCT)** | Bed-only-for-sleep conditioning | ✅ |
| **Cognitive Restructuring** | Dysfunctional belief identification & challenge | ✅ |
| **Sleep Hygiene (SHE)** | Environment & behavior optimization | ✅ |
| **Relaxation Training** | 7 techniques (PMR, breathing, imagery, etc.) | ✅ |

### AI/ML Optimization (CogniCore Engine)

| Feature | Description |
|---------|-------------|
| **POMDP Framework** | Optimal intervention selection under uncertainty |
| **Thompson Sampling** | Personalized treatment via bandit algorithms |
| **Digital Twin (PLRNN)** | Predictive user modeling |
| **Causal Discovery** | Personalized causal insights |
| **Critical Slowing Down** | Early warning signals for deterioration |
| **Constitutional AI** | Safe, aligned responses |

### Extended Therapies

- **MBT-I**: Mindfulness-Based Therapy for Insomnia (Ong et al., 2014)
- **ACT-I**: Acceptance & Commitment Therapy for Insomnia (Meadows et al.)
- **MCT**: Metacognitive Therapy for sleep-related worry
- **Chronotherapy**: Circadian rhythm optimization (MEQ, MCTQ)
- **TCM Integration**: Traditional Chinese Medicine sleep protocols
- **Ayurveda Integration**: Yoga Nidra, Dinacharya, herbal support

### Precision Phenotyping

- **Blanken 5-Class Model**: Insomnia subtype classification
- **HRV Integration**: Wearable-based autonomic analysis
- **PAT-based Estimation**: Pretrained Actigraphy Transformer

### Wearable Integration

- **Android Companion App**: Health Connect SDK, Samsung Galaxy Watch support
- **Backend API**: WearableIngestionService, real-time sync
- **HRV Analysis**: RMSSD, SDNN, LF/HF ratio tracking

### Clinical Assessments

- **ISI (Insomnia Severity Index)**: Russian-validated (Cronbach's α = 0.77)
- **MEQ (Morningness-Eveningness)**: 19-item chronotype assessment
- **MCTQ (Munich Chronotype)**: Actual sleep behavior analysis
- **DBAS**: Dysfunctional Beliefs About Sleep scale

### Infrastructure

- **Database**: SQLite (development) / PostgreSQL (production)
- **Security**: AES-256-GCM encryption, HIPAA audit trail, automated backups
- **Bot**: Telegram with 25 commands, Mini App
- **Deployment**: Docker, Traefik, health monitoring

## Architecture

```
src/
├── SleepCoreAPI.ts          # Main facade (unified API)
├── main.ts                  # Bot integration hub (2800+ lines)
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
│       └── security/        # Encryption, audit, backup
├── modules/
│   ├── gamification/        # XP, badges, streaks
│   └── wearable/            # Health Connect integration
├── platform/                # POMDP, Thompson Sampling
├── third-wave/              # MBT-I, ACT-I, MCT engines
└── bot/
    ├── commands/            # 25 bot commands
    └── services/            # 32+ services
```

## Quick Start

### Installation

```bash
npm install
```

### Configuration

```bash
# Required
BOT_TOKEN=<telegram_bot_token>
ADMIN_USER_IDS=<comma_separated_ids>
ENCRYPTION_MASTER_KEY=<64-hex-chars>

# Database
DATABASE_PATH=./data/sleepcore.db      # SQLite (dev)
DATABASE_URL=postgresql://...           # PostgreSQL (prod)

# Optional
SENTRY_DSN=<sentry_dsn>
NODE_ENV=development|production
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

// Get next intervention
const intervention = sleepCore.getNextIntervention('user123');

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

- **ISI Reduction**: ≥7 points (MCID)
- **Sleep Efficiency**: ≥85%
- **SOL**: <20 minutes
- **WASO**: <30 minutes
- **Remission Rate**: ≥50% (ISI ≤ 7)

## Development

### Scripts

```bash
npm run build         # TypeScript compilation
npm run dev           # Watch mode
npm run bot           # Start Telegram bot
npm test              # Run tests (8752+)
npm run test:coverage # Coverage report (84.97%)
npm run lint          # ESLint check
```

### Testing

| Metric | Value |
|--------|-------|
| Total Tests | 8752+ |
| Line Coverage | 84.97% |
| Branch Coverage | 72.45% |
| Function Coverage | 87.47% |

## Documentation

See [docs/](docs/) for full documentation:

- [ROADMAP.md](docs/ROADMAP.md) — Development roadmap
- [CLAUDE.md](CLAUDE.md) — Development guidelines
- [docs/audit/](docs/audit/) — IEC 62304 audit reports
- [docs/ethics/](docs/ethics/) — Clinical study protocols
- [docs/research/](docs/research/) — Scientific research

## Evidence Base

### Clinical Guidelines
- European Insomnia Guideline 2023
- AASM Clinical Practice Guidelines
- American College of Physicians recommendations

### Scientific References
- Spielman et al. (1987) — Sleep Restriction
- Bootzin (1972) — Stimulus Control
- Morin et al. (1993) — ISI development
- Ong et al. (2014) — MBT-I protocol
- Blanken et al. (2019) — Insomnia phenotypes

## Regulatory Pathway

| Market | Classification | Target |
|--------|---------------|--------|
| Russia | Roszdravnadzor Class IIa | Q3 2026 |
| EU | CE Mark Class IIa | Q1 2027 |
| Germany | DiGA Fast-Track | Q2 2027 |
| USA | FDA 510(k) | Q4 2027 |

## License

MIT License — see LICENSE for details.

## Contact

- **Tech**: tech@awfond.ru
- **Bot**: @SleepCore_Bot
- **Platform**: CogniCore Engine
