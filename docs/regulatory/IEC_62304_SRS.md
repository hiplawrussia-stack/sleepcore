# Software Requirements Specification (SRS)
## IEC 62304:2006+A1:2015 Compliant

**Document ID**: SLP-SRS-001
**Version**: 1.0
**Date**: 2026-02-17
**Classification**: IEC 62304 Class B Software
**Status**: Draft

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) defines the functional and non-functional requirements for SleepCore, a Digital Therapeutic (DTx) application for the treatment of chronic insomnia.

### 1.2 Scope
SleepCore delivers evidence-based Cognitive Behavioral Therapy for Insomnia (CBT-I) through:
- Telegram and VK messenger platforms
- Web application
- Mobile companion app (Android)

### 1.3 Intended Use
**Indication**: Treatment of chronic insomnia in adults (18+)
**Contraindications**:
- Active suicidal ideation
- Untreated sleep apnea
- Bipolar disorder (acute)
- Shift work disorder

### 1.4 User Population
- Primary: Adults aged 18-65 with ISI score 8-21
- Secondary: Healthcare providers monitoring patient progress

---

## 2. References

| Document | Description |
|----------|-------------|
| SLP-SDP-001 | Software Development Plan |
| SLP-SAD-001 | Software Architecture Document |
| European Insomnia Guideline 2023 | Clinical protocol basis |
| Spielman et al. 1987 | Sleep Restriction Therapy |

---

## 3. Functional Requirements

### 3.1 Assessment Module (ASM)

| REQ ID | Requirement | Priority | Risk |
|--------|-------------|----------|------|
| ASM-001 | System SHALL administer ISI assessment at baseline | Must | Medium |
| ASM-002 | System SHALL calculate ISI score automatically | Must | High |
| ASM-003 | System SHALL classify ISI severity per Morin et al. | Must | High |
| ASM-004 | System SHALL refer users with ISI ≥ 22 to specialist | Must | Critical |
| ASM-005 | System SHALL administer MEQ for chronotype assessment | Should | Low |
| ASM-006 | System SHALL schedule bi-weekly ISI re-assessment | Must | Medium |

### 3.2 Sleep Diary Module (SDM)

| REQ ID | Requirement | Priority | Risk |
|--------|-------------|----------|------|
| SDM-001 | System SHALL capture bedtime, wake time, sleep onset latency | Must | Medium |
| SDM-002 | System SHALL calculate Sleep Efficiency (SE%) | Must | High |
| SDM-003 | System SHALL calculate Total Sleep Time (TST) | Must | High |
| SDM-004 | System SHALL calculate Time in Bed (TIB) | Must | High |
| SDM-005 | System SHALL detect diary gaps > 3 days | Should | Medium |
| SDM-006 | System SHALL provide weekly summary visualization | Should | Low |

### 3.3 Sleep Restriction Therapy Module (SRT)

| REQ ID | Requirement | Priority | Risk |
|--------|-------------|----------|------|
| SRT-001 | System SHALL calculate initial TIB based on baseline TST | Must | Critical |
| SRT-002 | System SHALL NEVER allow TIB < 300 minutes (5 hours) | Must | Critical |
| SRT-003 | System SHALL NEVER allow TIB > 540 minutes (9 hours) | Must | High |
| SRT-004 | System SHALL increase TIB by 15 min if SE ≥ 90% | Must | High |
| SRT-005 | System SHALL decrease TIB by 15 min if SE < 85% (min 5h) | Must | High |
| SRT-006 | System SHALL maintain TIB if SE is 85-89% | Must | Medium |
| SRT-007 | System SHALL provide sleep window (bedtime/waketime) | Must | Medium |

### 3.4 Stimulus Control Module (SCM)

| REQ ID | Requirement | Priority | Risk |
|--------|-------------|----------|------|
| SCM-001 | System SHALL provide stimulus control instructions | Must | Medium |
| SCM-002 | System SHALL track bed-exit events during sleeplessness | Should | Low |
| SCM-003 | System SHALL reinforce bed-sleep association | Must | Medium |

### 3.5 Cognitive Restructuring Module (CRM)

| REQ ID | Requirement | Priority | Risk |
|--------|-------------|----------|------|
| CRM-001 | System SHALL identify cognitive distortions about sleep | Must | Medium |
| CRM-002 | System SHALL provide evidence-based cognitive reframes | Must | Medium |
| CRM-003 | System SHALL track belief strength pre/post intervention | Should | Low |

### 3.6 Crisis Detection Module (CDM)

| REQ ID | Requirement | Priority | Risk |
|--------|-------------|----------|------|
| CDM-001 | System SHALL detect crisis keywords in user input | Must | Critical |
| CDM-002 | System SHALL support Russian and English crisis detection | Must | Critical |
| CDM-003 | Crisis detection SHALL be ALWAYS active (cannot be disabled) | Must | Critical |
| CDM-004 | System SHALL escalate HIGH/CRITICAL severity to admin | Must | Critical |
| CDM-005 | System SHALL provide SAMHSA/crisis hotline numbers | Must | Critical |
| CDM-006 | System SHALL log all crisis events for audit | Must | Critical |

### 3.7 Gamification Module (GAM)

| REQ ID | Requirement | Priority | Risk |
|--------|-------------|----------|------|
| GAM-001 | System SHALL award XP for completed activities | Should | Low |
| GAM-002 | System SHALL track user streaks | Should | Low |
| GAM-003 | System SHALL display progress visualization | Should | Low |
| GAM-004 | System SHALL provide achievement badges | Could | Low |
| GAM-005 | Leaderboard SHALL be opt-in only (GDPR) | Must | Medium |

---

## 4. Non-Functional Requirements

### 4.1 Performance (PER)

| REQ ID | Requirement | Target |
|--------|-------------|--------|
| PER-001 | Bot response time | < 2 seconds |
| PER-002 | API response time | < 500ms (p95) |
| PER-003 | Concurrent users | 10,000+ |
| PER-004 | System uptime | 99.5% |

### 4.2 Security (SEC)

| REQ ID | Requirement | Standard |
|--------|-------------|----------|
| SEC-001 | PHI encryption at rest | AES-256-GCM |
| SEC-002 | PHI encryption in transit | TLS 1.3 |
| SEC-003 | Audit trail retention | 6 years (21 CFR Part 11) |
| SEC-004 | Authentication | JWT + Telegram/VK verification |
| SEC-005 | Penetration testing | Annual |

### 4.3 Privacy (PRI)

| REQ ID | Requirement | Regulation |
|--------|-------------|------------|
| PRI-001 | Explicit consent before data collection | GDPR Art. 7 |
| PRI-002 | Right to data deletion (30 days) | GDPR Art. 17 |
| PRI-003 | Data portability | GDPR Art. 20 |
| PRI-004 | Privacy notice before onboarding | GDPR Art. 13 |

### 4.4 Usability (USA)

| REQ ID | Requirement | Standard |
|--------|-------------|----------|
| USA-001 | Reading level | 6th grade (Flesch-Kincaid) |
| USA-002 | Accessibility | WCAG 2.1 AA |
| USA-003 | Error prevention | IEC 62366-1 |

### 4.5 Reliability (REL)

| REQ ID | Requirement | Target |
|--------|-------------|--------|
| REL-001 | Mean Time Between Failures | > 720 hours |
| REL-002 | Data backup frequency | Every 6 hours |
| REL-003 | Recovery Point Objective | < 6 hours |
| REL-004 | Recovery Time Objective | < 4 hours |

---

## 5. Traceability Matrix

| Requirement | Design Element | Test Case | Risk ID |
|-------------|---------------|-----------|---------|
| SRT-001 | SleepRestrictionEngine | SRT-TC-001 | RISK-001 |
| SRT-002 | TIB_LIMITS.MINIMUM | SRT-TC-002 | RISK-002 |
| CDM-001 | CrisisDetectionService | CDM-TC-001 | RISK-003 |
| CDM-003 | CrisisLevel enum | CDM-TC-003 | RISK-003 |
| SEC-001 | PHIEncryptionManager | SEC-TC-001 | RISK-004 |

---

## 6. Clinical Safety Requirements

### 6.1 Hard Constraints (Red Lines)

| ID | Constraint | Rationale |
|----|-----------|-----------|
| HSC-001 | TIB NEVER < 5 hours | Risk of daytime sleepiness, accidents |
| HSC-002 | Crisis detection ALWAYS active | Suicide prevention |
| HSC-003 | ISI ≥ 22 → specialist referral | Severe insomnia requires medical care |
| HSC-004 | System does NOT diagnose | Regulatory compliance |

### 6.2 Clinical Constants

| Constant | Value | Source |
|----------|-------|--------|
| MIN_TIB | 300 min | Spielman et al. 1987 |
| MAX_TIB | 540 min | Clinical practice |
| SE_INCREASE | ≥ 90% | AASM Guidelines |
| SE_MAINTAIN | 85-89% | AASM Guidelines |
| SE_DECREASE | < 85% | AASM Guidelines |
| TIB_STEP | ±15 min | Spielman et al. 1987 |

---

## 7. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Clinical Advisor | | | |
| QA Manager | | | |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-17 | SleepCore Team | Initial release |

---

*Document ID: SLP-SRS-001 | IEC 62304 Software Requirements Specification*
