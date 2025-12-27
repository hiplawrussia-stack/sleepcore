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
├── cbt-i/                      # Core CBT-I engines
├── circadian/                  # Chronotype & rhythm
├── cultural-adaptations/       # TCM, Ayurveda
├── diary/                      # Sleep diary service
├── evidence-base/              # Clinical guidelines
├── infrastructure/             # Database layer
├── platform/                   # AI/ML algorithms
├── sleep/                      # Sleep state models
└── third-wave/                 # MBT-I, ACT-I
```

### Key Design Patterns

1. **Facade Pattern**: SleepCoreAPI provides unified access
2. **Factory Pattern**: DatabaseFactory for database creation
3. **Repository Pattern**: Data access abstraction
4. **Strategy Pattern**: Pluggable CBT-I component engines
5. **State Pattern**: POMDP state vector for sleep modeling

### CBT-I 5-Component System

| Component | Engine | Purpose |
|-----------|--------|---------|
| Sleep Restriction (SRT) | SleepRestrictionEngine | Optimize time-in-bed |
| Stimulus Control (SCT) | StimulusControlEngine | Bed-only-for-sleep |
| Cognitive Restructuring | CognitiveRestructuringEngine | Challenge beliefs |
| Sleep Hygiene (SHE) | SleepHygieneEngine | Environment/behavior |
| Relaxation Training | RelaxationEngine | 7 techniques |

## Testing Strategy

### Current Coverage (as of Dec 2025)

| Metric | Value |
|--------|-------|
| Test Suites | 41 |
| Total Tests | 1,244 |
| Test Files | 47 |
| Overall Coverage | ~80%+ |

### Coverage by Component

| Component | Coverage |
|-----------|----------|
| ISIRussian (Assessment) | 100% |
| CBTIEngine (Core) | 98% |
| SleepCoreAPI | 92% |
| Database Layer | 85%+ |
| Quests/Badges | 90%+ |

### Running Tests

```bash
npm test                    # Run all tests
npm run test:coverage       # With coverage report
npm test -- path/to/test    # Single test file
npm test -- --watch         # Watch mode
```

### Test Types

- **Unit Tests**: Each engine, service, and utility
- **Integration Tests**: Database operations, treatment flows
- **E2E Tests**: Complete 8-week treatment simulation
- **Smoke Tests**: Quick sanity checks for CI/CD

## Clinical Targets

| Metric | Target | MCID |
|--------|--------|------|
| ISI Score | <7 (remission) | >7 point reduction |
| Sleep Efficiency | >85% | +10% |
| SOL | <20 min | -10 min |
| WASO | <30 min | -15 min |

## Current Limitations

1. **In-Memory Sessions**: Not persisted (fix: use repository)
2. **No Mobile App**: Desktop/API only (Phase 9)
3. **No Engagement**: No notifications/gamification (Phase 7)
4. **No Wearable Integration**: Subjective data only (Phase 8)

## References

- [README.md](README.md) - Project overview
- [ROADMAP.md](ROADMAP.md) - Development plan
- [CogniCore Engine](../cognicore-engine) - AI/ML foundation
