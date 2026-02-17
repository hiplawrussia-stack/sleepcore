# Software Development Plan (SDP)
## IEC 62304:2006+A1:2015 Compliant

**Document ID**: SLP-SDP-001
**Version**: 1.0
**Date**: 2026-02-17
**Classification**: IEC 62304 Class B Software
**Status**: Draft

---

## 1. Purpose and Scope

### 1.1 Purpose
This Software Development Plan (SDP) defines the software development lifecycle, processes, tools, and methods used for the development of SleepCore, a Digital Therapeutic (DTx) application for the treatment of chronic insomnia using evidence-based Cognitive Behavioral Therapy for Insomnia (CBT-I).

### 1.2 Scope
This plan covers:
- Software development lifecycle activities
- Development methods and tools
- Configuration management
- Software verification and validation
- Risk management integration
- Documentation requirements

### 1.3 Software Classification
Per IEC 62304 Section 4.3, SleepCore is classified as **Class B** software:
- Contributes to hazardous situation: YES (incorrect sleep recommendations)
- Results in serious injury: NO (non-life-threatening)
- Results in death: NO

---

## 2. References

### 2.1 Regulatory Standards
| Standard | Title |
|----------|-------|
| IEC 62304:2006+A1:2015 | Medical device software — Software life cycle processes |
| ISO 14971:2019 | Medical devices — Application of risk management |
| IEC 62366-1:2015 | Medical devices — Usability engineering |
| ISO 13485:2016 | Medical devices — Quality management systems |
| IEC 81001-5-1:2021 | Health software security |

### 2.2 Related Documents
| Document ID | Title |
|-------------|-------|
| SLP-SRS-001 | Software Requirements Specification |
| SLP-SAD-001 | Software Architecture Document |
| SLP-RMF-001 | Risk Management File |
| SLP-SVP-001 | Software Verification Plan |

---

## 3. Software Development Lifecycle

### 3.1 Lifecycle Model
SleepCore follows an **Agile/Iterative** development model with the following phases:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SOFTWARE LIFECYCLE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │ Requirements │ → │   Design     │ → │Implementation│        │
│  │  Analysis    │   │              │   │              │        │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘        │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │ Verification │ ← │  Testing     │ ← │   Review     │        │
│  │              │   │              │   │              │        │
│  └──────┬───────┘   └──────────────┘   └──────────────┘        │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐                                               │
│  │   Release    │                                               │
│  │              │                                               │
│  └──────────────┘                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Phase Activities

| Phase | IEC 62304 Section | Activities |
|-------|-------------------|------------|
| Planning | 5.1 | SDP creation, resource allocation |
| Requirements | 5.2 | Requirements gathering, SRS creation |
| Architecture | 5.3 | System design, SAD creation |
| Detailed Design | 5.4 | Module design, interface definitions |
| Implementation | 5.5 | Coding, unit testing |
| Integration | 5.6 | Integration testing |
| System Testing | 5.7 | System validation |
| Release | 5.8 | Release packaging, documentation |

---

## 4. Development Methods and Tools

### 4.1 Programming Languages
| Language | Version | Usage |
|----------|---------|-------|
| TypeScript | 5.x | Backend, Bot, API |
| JavaScript | ES2022+ | Runtime |
| Kotlin | 1.9+ | Android Companion App |
| SQL | PostgreSQL 15+ | Database |

### 4.2 Development Tools
| Tool | Purpose | Version |
|------|---------|---------|
| VS Code | IDE | Latest |
| Git | Version Control | 2.x |
| Node.js | Runtime | 20.x LTS |
| npm | Package Manager | 10.x |
| Jest | Unit Testing | 29.x |
| ESLint | Static Analysis | 8.x |
| TypeScript | Type Checking | 5.x |

### 4.3 CI/CD Pipeline
| Stage | Tool | Purpose |
|-------|------|---------|
| Build | GitHub Actions | Automated build |
| Test | Jest + Vitest | Unit/Integration tests |
| Lint | ESLint + TypeScript | Code quality |
| Security | npm audit | Vulnerability scanning |
| Deploy | Docker + Traefik | Containerized deployment |

---

## 5. Configuration Management

### 5.1 Version Control
- **System**: Git
- **Repository**: GitHub
- **Branching Strategy**: GitFlow (main, develop, feature/*, release/*, hotfix/*)

### 5.2 Version Numbering
Format: `MAJOR.MINOR.PATCH[-PRERELEASE]`
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes
- PRERELEASE: alpha, beta, rc

### 5.3 Change Control
All changes to safety-critical modules require:
1. GitHub Pull Request
2. Code review (2-person review for safety-critical)
3. All CI checks passing
4. Test coverage ≥ 80%

---

## 6. Software Verification

### 6.1 Verification Activities
| Activity | IEC 62304 Requirement | Method |
|----------|----------------------|--------|
| Requirements Review | 5.2.6 | Peer review |
| Design Review | 5.3.6 | Peer review |
| Code Review | 5.5.5 | Pull request review |
| Unit Testing | 5.5.5 | Automated (Jest) |
| Integration Testing | 5.6.7 | Automated |
| System Testing | 5.7.5 | Manual + Automated |

### 6.2 Test Coverage Requirements
| Module Type | Statement | Branch | Function |
|-------------|-----------|--------|----------|
| Safety-Critical | 100% | 100% | 100% |
| Clinical Engines | 90% | 85% | 90% |
| Other | 80% | 70% | 80% |

### 6.3 Safety-Critical Modules
Per CLAUDE.md, the following require 2-person review + 100% coverage:
- `CrisisDetectionService.ts`
- `CrisisEscalationService.ts`
- `SleepRestrictionEngine.ts`
- `ISIRussian.ts`
- PHI Encryption modules

---

## 7. Risk Management Integration

### 7.1 Risk Management Process
Per ISO 14971:2019, risks are:
1. Identified during design and implementation
2. Documented in Risk Management File (SLP-RMF-001)
3. Mitigated through design controls
4. Verified through testing

### 7.2 Clinical Safety Constants
| Constant | Value | Risk Mitigation |
|----------|-------|-----------------|
| MIN_TIB | 300 min (5h) | Prevents excessive daytime sleepiness |
| MAX_TIB | 540 min (9h) | Prevents oversleeping |
| CRISIS_ALWAYS_ON | true | Ensures crisis detection cannot be disabled |

---

## 8. Documentation Requirements

### 8.1 Required Documents (IEC 62304)
| Document | Section | Status |
|----------|---------|--------|
| Software Development Plan | 5.1 | This document |
| Software Requirements Specification | 5.2 | SLP-SRS-001 |
| Software Architecture Document | 5.3 | SLP-SAD-001 |
| Software Detailed Design | 5.4 | Code + comments |
| Software Unit Verification | 5.5 | Test reports |
| Software Integration Testing | 5.6 | Test reports |
| Software System Testing | 5.7 | Test reports |
| Software Release | 5.8 | Release notes |

### 8.2 Traceability
Requirements → Design → Implementation → Tests → Release

Traceability matrix maintained in: `docs/regulatory/TRACEABILITY.md`

---

## 9. SOUP (Software of Unknown Provenance)

### 9.1 SOUP Management
All third-party dependencies documented in:
- `docs/regulatory/SBOM.json` (CycloneDX format)
- `package.json` + `package-lock.json`

### 9.2 SOUP Evaluation Criteria
| Criterion | Evaluation Method |
|-----------|-------------------|
| Functional Suitability | Documentation review |
| Known Vulnerabilities | npm audit, Snyk |
| Update Availability | npm outdated |
| License Compatibility | License checker |

---

## 10. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Lead | | | |
| QA Manager | | | |
| Clinical Advisor | | | |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-17 | SleepCore Team | Initial release |

---

*Document ID: SLP-SDP-001 | IEC 62304 Software Development Plan*
