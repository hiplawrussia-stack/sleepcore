# Software Architecture Document (SAD)
## IEC 62304:2006+A1:2015 Compliant

**Document ID**: SLP-SAD-001
**Version**: 1.0
**Date**: 2026-02-17
**Classification**: IEC 62304 Class B Software
**Status**: Draft

---

## 1. Introduction

### 1.1 Purpose
This Software Architecture Document (SAD) describes the high-level architecture of SleepCore, defining the software components, their interfaces, and interactions.

### 1.2 Scope
This document covers:
- System architecture overview
- Component descriptions
- Interface definitions
- Data flow
- Security architecture
- Deployment architecture

---

## 2. Architectural Overview

### 2.1 System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SLEEPCORE ECOSYSTEM                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   USERS                    PLATFORMS                    BACKEND      │
│   ─────                    ─────────                    ───────      │
│                                                                      │
│  ┌─────────┐            ┌───────────────┐            ┌───────────┐  │
│  │ Patient │◄──────────►│ Telegram Bot  │◄──────────►│           │  │
│  └─────────┘            └───────────────┘            │           │  │
│                                                      │  SleepCore│  │
│  ┌─────────┐            ┌───────────────┐            │    API    │  │
│  │ Patient │◄──────────►│   VK Bot      │◄──────────►│           │  │
│  └─────────┘            └───────────────┘            │           │  │
│                                                      │           │  │
│  ┌─────────┐            ┌───────────────┐            │           │  │
│  │ Patient │◄──────────►│   Web App     │◄──────────►│           │  │
│  └─────────┘            └───────────────┘            └─────┬─────┘  │
│                                                            │        │
│  ┌─────────┐            ┌───────────────┐            ┌─────▼─────┐  │
│  │ Wearable│◄──────────►│ Android App   │◄──────────►│ PostgreSQL│  │
│  └─────────┘            └───────────────┘            └───────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LAYERED ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    PRESENTATION LAYER                        │    │
│  │  Telegram Bot │ VK Bot │ Web App │ Mini Apps │ Android App  │    │
│  └────────────────────────────┬────────────────────────────────┘    │
│                               │                                      │
│  ┌────────────────────────────▼────────────────────────────────┐    │
│  │                    APPLICATION LAYER                         │    │
│  │  Commands │ Services │ Handlers │ Middleware                │    │
│  └────────────────────────────┬────────────────────────────────┘    │
│                               │                                      │
│  ┌────────────────────────────▼────────────────────────────────┐    │
│  │                      DOMAIN LAYER                            │    │
│  │  CBT-I Engines │ Third-Wave │ Assessment │ Gamification     │    │
│  └────────────────────────────┬────────────────────────────────┘    │
│                               │                                      │
│  ┌────────────────────────────▼────────────────────────────────┐    │
│  │                   INFRASTRUCTURE LAYER                       │    │
│  │  Database │ Encryption │ External APIs │ Monitoring         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Architecture

### 3.1 Domain Layer Components

#### 3.1.1 CBT-I Engines

| Component | Responsibility | IEC 62304 Class |
|-----------|---------------|-----------------|
| SleepRestrictionEngine | Sleep window calculation, TIB management | Class B |
| StimulusControlEngine | Bed-sleep association, behavioral rules | Class B |
| CognitiveRestructuringEngine | Thought pattern modification | Class B |
| SleepHygieneEngine | Environmental recommendations | Class A |
| RelaxationEngine | Progressive muscle relaxation, breathing | Class A |

#### 3.1.2 Third-Wave Engines

| Component | Responsibility | IEC 62304 Class |
|-----------|---------------|-----------------|
| MBTIEngine | Mindfulness-Based Therapy for Insomnia | Class B |
| ACTIEngine | Acceptance and Commitment Therapy | Class B |
| MCTEngine | Metacognitive Therapy | Class B |

#### 3.1.3 Safety-Critical Components

| Component | Responsibility | IEC 62304 Class |
|-----------|---------------|-----------------|
| CrisisDetectionService | Real-time crisis keyword detection | Class B |
| CrisisEscalationService | Alert escalation to administrators | Class B |
| AdverseEventService | Adverse event reporting | Class B |

### 3.2 Application Layer Components

#### 3.2.1 SleepCoreAPI Facade

```typescript
interface ISleepCoreAPI {
  // Assessment
  assessISI(userId: string): Promise<ISIResult>;
  assessChronotype(userId: string): Promise<ChronotypeResult>;

  // Diary
  recordDiary(userId: string, entry: DiaryEntry): Promise<void>;
  calculateSleepMetrics(userId: string): Promise<SleepMetrics>;

  // Therapy
  getNextIntervention(userId: string): Promise<Intervention>;
  adjustSleepWindow(userId: string): Promise<SleepWindow>;

  // Safety
  checkCrisis(text: string): CrisisResult;
  escalateCrisis(userId: string, level: CrisisLevel): Promise<void>;
}
```

#### 3.2.2 Command Pattern

```
Commands (25+)
├── Core: /start, /diary, /therapy, /today, /help
├── Gamification: /badge, /quest, /evolution, /progress
├── AI/ML: /predict, /twin, /whatif, /insights, /explain
├── Therapy: /relax, /mindful, /recall, /rehearsal, /tips
└── Safety: /sos, /safety, /ae_report, /admin
```

### 3.3 Infrastructure Layer Components

#### 3.3.1 Database

| Component | Technology | Purpose |
|-----------|------------|---------|
| Primary DB | PostgreSQL 15 | User data, PHI storage |
| Session Store | Redis | Conversation state |
| Encryption | AES-256-GCM | PHI at rest |

#### 3.3.2 External Integrations

| Integration | Purpose | Protocol |
|-------------|---------|----------|
| Telegram API | Bot messaging | HTTPS/Long Polling |
| VK API | Bot messaging | HTTPS/Long Polling |
| Health Connect | Wearable data | Android SDK |
| Fitbit/Garmin | Sleep tracking | OAuth 2.0 + REST |

---

## 4. Interface Definitions

### 4.1 ISleepCoreContext (Platform Abstraction)

```typescript
interface ISleepCoreContext {
  // User identification
  userId: string;
  platform: 'telegram' | 'vk' | 'web';

  // Messaging
  reply(text: string): Promise<void>;
  replyWithKeyboard(text: string, keyboard: Keyboard): Promise<void>;

  // User data
  getUserData(): Promise<UserData>;
  setUserData(data: UserData): Promise<void>;
}
```

### 4.2 ICommand (Command Interface)

```typescript
interface ICommand {
  name: string;
  description: string;
  execute(ctx: ISleepCoreContext): Promise<ICommandResult>;
}
```

### 4.3 Engine Interfaces

```typescript
interface ISleepRestrictionEngine {
  calculateInitialTIB(baselineTST: number): number;
  adjustTIB(currentTIB: number, sleepEfficiency: number): number;
  getSleepWindow(tib: number, wakeTime: Date): SleepWindow;
}

interface ICrisisDetectionService {
  analyze(text: string): CrisisAnalysisResult;
  isAlwaysActive(): true; // Cannot be disabled
}
```

---

## 5. Data Flow

### 5.1 Sleep Diary Flow

```
User → Bot → DiaryCommand → SleepCoreAPI → DiaryService → Database
                                    ↓
                          SleepRestrictionEngine
                                    ↓
                          TIB Adjustment (if SE threshold met)
                                    ↓
                          Response → User
```

### 5.2 Crisis Detection Flow

```
User Message → CrisisDetectionService (ALWAYS ACTIVE)
                        ↓
              ┌─────────┴─────────┐
              │   Severity Check  │
              └─────────┬─────────┘
                        ↓
    ┌─────────┬─────────┼─────────┬─────────┐
    ↓         ↓         ↓         ↓         ↓
  NONE    MONITORING  CONCERN   URGENT  EMERGENCY
    │         │         │         │         │
    │      Check-in   Prompt    SAMHSA   Escalate
    │                            hotline  to ADMIN
    ↓         ↓         ↓         ↓         ↓
 Continue   Log       Log       Log       Log + Alert
```

---

## 6. Security Architecture

### 6.1 Defense in Depth

```
┌─────────────────────────────────────────────────────────────────┐
│                       SECURITY LAYERS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Network Security                                      │
│  ├── TLS 1.3 for all connections                               │
│  ├── Traefik reverse proxy                                     │
│  └── Rate limiting (100 req/min)                               │
│                                                                  │
│  Layer 2: Authentication                                        │
│  ├── Telegram WebApp verification                              │
│  ├── VK signature verification                                 │
│  └── JWT tokens (API)                                          │
│                                                                  │
│  Layer 3: Authorization                                         │
│  ├── Role-based access control                                 │
│  ├── Admin commands restricted to ADMIN_USER_IDS               │
│  └── Safety commands unrestricted                              │
│                                                                  │
│  Layer 4: Data Protection                                       │
│  ├── PHI encrypted at rest (AES-256-GCM)                       │
│  ├── Encryption keys in secure storage                         │
│  └── 6-year audit trail retention                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 PHI Data Flow

```
User Input → TLS 1.3 → API → PHIEncryptionManager → Database
                                      ↓
                              AES-256-GCM Encryption
                                      ↓
                              Encrypted PHI Storage
```

---

## 7. Deployment Architecture

### 7.1 Production Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      Traefik v3                          │    │
│  │              (Reverse Proxy + Auto SSL)                  │    │
│  │                    :80 :443                              │    │
│  └───────────────────────┬─────────────────────────────────┘    │
│                          │                                       │
│    ┌─────────────────────┼─────────────────────────┐            │
│    │                     │                         │            │
│  ┌─▼───────────┐   ┌─────▼────────┐   ┌───────────▼──┐         │
│  │ SleepCore   │   │  SleepCore   │   │   Mini App   │         │
│  │    Bot      │   │     API      │   │   (Nginx)    │         │
│  │   :3000     │   │    :3001     │   │     :80      │         │
│  │   (TG+VK)   │   │   (Hono)     │   │   (React)    │         │
│  └─────────────┘   └──────┬───────┘   └──────────────┘         │
│                           │                                      │
│                    ┌──────▼──────┐                              │
│                    │ PostgreSQL  │                              │
│                    │    :5432    │                              │
│                    │ (Encrypted) │                              │
│                    └─────────────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Container Configuration

| Service | Image | Resources |
|---------|-------|-----------|
| sleepcore-bot | node:20-alpine | 512MB RAM, 0.5 CPU |
| sleepcore-api | node:20-alpine | 512MB RAM, 0.5 CPU |
| mini-app | nginx:alpine | 128MB RAM, 0.1 CPU |
| postgres | postgres:15-alpine | 1GB RAM, 1 CPU |
| redis | redis:7-alpine | 256MB RAM, 0.2 CPU |

---

## 8. Reliability and Fault Tolerance

### 8.1 Error Handling

| Error Type | Handling Strategy |
|------------|-------------------|
| Network timeout | Retry with exponential backoff |
| Database error | Circuit breaker, fallback to read-only |
| Crisis detection | Never fail silently, log always |
| External API | Graceful degradation |

### 8.2 Monitoring

| Metric | Threshold | Alert |
|--------|-----------|-------|
| API latency | > 2s | Warning |
| Error rate | > 1% | Critical |
| CPU usage | > 80% | Warning |
| Memory usage | > 90% | Critical |
| Crisis events | Any | Immediate |

---

## 9. Design Decisions

### 9.1 Key Architectural Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Deterministic CBT-I engines | LLM hallucinations unacceptable for medical | LLM-based therapy |
| Platform abstraction (ISleepCoreContext) | Multi-platform support | Platform-specific code |
| AES-256-GCM for PHI | HIPAA/GDPR compliance | ChaCha20-Poly1305 |
| PostgreSQL | ACID compliance, JSON support | MongoDB, SQLite |
| Monorepo | Shared code, atomic changes | Microservices |

### 9.2 Safety Design Patterns

| Pattern | Implementation | Purpose |
|---------|---------------|---------|
| Hard-coded limits | MIN_TIB = 300 | Prevent unsafe values |
| Always-on safety | CrisisDetection cannot disable | User protection |
| Fail-safe defaults | Conservative recommendations | Risk mitigation |
| Audit logging | All PHI access logged | Compliance |

---

## 10. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Software Architect | | | |
| Clinical Advisor | | | |
| Security Officer | | | |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-17 | SleepCore Team | Initial release |

---

*Document ID: SLP-SAD-001 | IEC 62304 Software Architecture Document*
