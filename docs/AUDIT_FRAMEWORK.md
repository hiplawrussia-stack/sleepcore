# DTx Professional Audit Framework (2025-2026)

**Version**: 1.0
**Updated**: 2026-02-16
**Target**: SleepCore CBT-I Application
**Certifications**: FDA 510(k), CE Mark Class IIa, DiGA

---

## Overview

Этот документ определяет стандарты аудита для Digital Therapeutics (DTx) мирового уровня.

### Standards Stack

| Standard | Purpose | Status |
|----------|---------|--------|
| ISO 13485:2016 | Quality Management System | Required |
| ISO 14971:2019 | Risk Management | Required |
| IEC 62304:2006+A1:2015 | Software Lifecycle | Required |
| IEC 62366-1:2015 | Usability Engineering | Required |
| IEC 81001-5-1:2021 | Health Software Security | Required |
| ISO 27001:2022 | Information Security | Recommended |

---

## 1. FDA Software as Medical Device (SaMD) Audit

### 1.1 Pre-Submission (Pre-Sub) Requirements

| Document | Description | Status |
|----------|-------------|--------|
| Device Description | SaMD classification, intended use, indications | Required |
| Predicate Device Analysis | Substantial equivalence justification (510(k)) | Required |
| Software Classification | IEC 62304 safety class (A/B/C) | Required |
| Risk-Benefit Analysis | Clinical justification for SaMD claims | Required |

**Predicates for SleepCore:**
- Sleepio (K191716) - Big Health
- Somryst (K211351) - Pear Therapeutics

### 1.2 IEC 62304 Software Lifecycle Documentation

| Document | Class A | Class B | Class C |
|----------|---------|---------|---------|
| Software Development Plan | Required | Required | Required |
| Software Requirements Specification | Required | Required | Required |
| Software Architecture | - | Required | Required |
| Detailed Design | - | - | Required |
| Unit Test Reports | - | - | Required |
| Integration Test Reports | - | Required | Required |
| System Test Reports | Required | Required | Required |
| Release Notes | Required | Required | Required |
| Traceability Matrix | Required | Required | Required |

**For CBT-I SaMD (Class IIa/Class II):** Typically requires **Class B** documentation minimum.

### 1.3 21 CFR Part 11 Compliance Checklist

| Requirement | Implementation | Evidence |
|-------------|----------------|----------|
| Audit Trail | Immutable logs of all record changes | Database audit tables |
| Electronic Signatures | Unique user ID + password/biometric | Authentication system |
| Signature Manifestations | Printed name, date/time, meaning | UI implementation |
| Record Protection | Prevention of unauthorized modification | Access controls |
| Backup & Recovery | Regular backups, recovery procedures | Backup logs |
| Training | Documented 21 CFR Part 11 training | Training records |

### 1.4 FDA 2025-2026 Critical Updates

| Requirement | Deadline | Details |
|-------------|----------|---------|
| **eSTAR Format** | Mandatory since Oct 2023 | All 510(k) submissions must use eSTAR |
| **QMSR Alignment** | February 2, 2026 | QMS must align with ISO 13485:2016 |
| **SBOM Submission** | Mandatory | Machine-readable (SPDX/CycloneDX) |
| **AI/ML Guidance** | January 2025 | New lifecycle management requirements |

### 1.5 Cybersecurity Pre-Market Submission (12 Documents)

| # | Document | Content |
|---|----------|---------|
| 1 | Threat Model | Attack surfaces, threat actors, STRIDE analysis |
| 2 | SBOM | All software components (commercial, OSS, OTS) |
| 3 | Vulnerability Assessment | CVE analysis for each component |
| 4 | Risk Assessment | Safety/security risk for each vulnerability |
| 5 | Security Architecture | Defense-in-depth, network segmentation |
| 6 | Cryptographic Controls | AES-256-GCM, key management |
| 7 | Authentication/Authorization | Access control mechanisms |
| 8 | Software Update Plan | Patch deployment procedures |
| 9 | End-of-Life Plan | Device decommissioning strategy |
| 10 | Vulnerability Disclosure | Public disclosure timeline |
| 11 | Incident Response | Breach notification procedures |
| 12 | Customer Communication | Security advisory templates |

---

## 2. DiGA (Germany) BfArM Audit Requirements

### 2.1 Eligibility Criteria

| Criterion | SleepCore Status | Evidence Required |
|-----------|------------------|-------------------|
| CE Mark (Class I or IIa) | Class IIa target | EU MDR Certificate |
| Main function is digital | CBT-I software | Technical documentation |
| Treatment (not prevention) | Insomnia treatment | Clinical documentation |
| Patient-facing | Direct user interaction | App description |
| ISO 13485 QMS | Required | Certificate |

### 2.2 Data Protection Requirements (DiGAV)

| Requirement | Details | Evidence |
|-------------|---------|----------|
| GDPR Compliance | Full compliance mandatory | DPIA, DPO appointment |
| BSI Security | Technical security measures | Penetration test reports |
| Data Location | Processing within EU (preferred) | Infrastructure documentation |
| Encryption | Transport and storage encryption | Technical documentation |
| Consent Management | Explicit user consent | Consent flows |

### 2.3 Clinical Evidence Requirements

| Listing Type | Evidence Level | Timeline |
|--------------|---------------|----------|
| **Provisional** | Evaluation concept + RCT plan | 3 months review |
| **Final** | Completed RCT with positive results | 3 months review |

**Evidence Deadline for Provisional:** 12 months (extendable to 24 months)

| Evidence Type | Requirements |
|---------------|-------------|
| Study Design | Randomized, controlled, comparative |
| Registration | German Clinical Trials Register or WHO-ICTRP partner |
| Reporting | CONSORT-compliant |
| Outcomes | Medical benefit OR pSVV |
| Publication | Peer-reviewed journal (recommended) |

### 2.4 DiGA Application Checklist

| Document | Description | Status |
|----------|-------------|--------|
| CE Certificate | Valid MDR certificate | — |
| Technical Documentation | Per MDR Annexes II/III | — |
| Data Protection Concept | GDPR/DiGAV compliance | — |
| Security Concept | BSI requirements | — |
| Clinical Evidence Dossier | RCT or evaluation concept | — |
| Intended Use Statement | Clear indication | — |
| User Instructions | German language IFU | — |

**Current DiGA Guide Version:** 3.6 (December 10, 2025)

---

## 3. Clinical Trial Audit (ICH-GCP E6(R3))

### 3.1 ICH E6(R3) 2025 Key Changes

| Change | Effective Date | Impact |
|--------|---------------|--------|
| Annex 1 (Overarching Principles) | July 23, 2025 | All trials |
| Risk-Based Quality Management | July 23, 2025 | QMS redesign |
| Decentralized Trial Provisions | Annex 2 (draft) | Digital trial components |

### 3.2 CRF Standards - ALCOA+ Principles

| Principle | Definition | Digital Evidence |
|-----------|------------|------------------|
| **A**ttributable | Linked to who created/modified | User authentication logs |
| **L**egible | Clear and readable | UI screenshots, data exports |
| **C**ontemporaneous | Recorded at time of event | Timestamps |
| **O**riginal | First recording | Database primary records |
| **A**ccurate | Error-free, true representation | Validation rules |
| **+Complete** | All required data present | Required field validation |
| **+Consistent** | No unexplained contradictions | Data integrity checks |
| **+Enduring** | Permanent, cannot be lost | Backup procedures |
| **+Available** | Accessible when needed | System uptime, access controls |

### 3.3 GCP Audit Documentation Checklist

| Category | Documents |
|----------|-----------|
| **Investigator File** | Protocol, amendments, IRB approvals, delegation logs |
| **Subject Records** | Informed consent, source documents, CRFs |
| **Drug/Device Accountability** | Dispensing logs, returns, destruction records |
| **AE/SAE Reporting** | Adverse event reports, expedited reports |
| **Monitoring** | Visit reports, query resolution logs |
| **Quality Assurance** | Audit certificates, CAPA records |

### 3.4 Digital Therapeutics RCT Specific Requirements

| Requirement | Details |
|-------------|---------|
| Control Condition | Active control, sham app, waitlist, or TAU |
| Blinding | User-blinded where possible; assessor-blinded mandatory |
| Engagement Metrics | App usage, session completion, adherence data |
| Technical Logs | Server logs, error reports, version tracking |
| CONSORT-EHEALTH | Extended CONSORT for digital interventions |

---

## 4. Security & Privacy Audit

### 4.1 HIPAA 2025 Audit Checklist

| Domain | Requirements | Evidence |
|--------|-------------|----------|
| **Administrative** | Security Officer, Risk Analysis, Workforce Training | Policies, training records |
| **Physical** | Facility access, workstation security | Access logs, policies |
| **Technical** | Access controls, audit logs, encryption, integrity | System configs, logs |

#### HIPAA 2025 New Requirements (Proposed Rule - January 6, 2025)

| Requirement | Frequency | Details |
|-------------|-----------|---------|
| Penetration Testing | Annual | By qualified professionals |
| Vulnerability Scanning | Every 6 months | Continuous recommended |
| Compliance Audit | Annual | Internal or external |
| Security Effectiveness Review | Annual | Test all security measures |
| Patch Management | Critical: 30 days | Documented remediation |
| Incident Response Notification | 24 hours | Contingency plan activation |

### 4.2 GDPR Compliance Audit Checklist

| Article | Requirement | Evidence |
|---------|-------------|----------|
| Art. 6 | Legal basis for processing | Documented legal basis |
| Art. 7 | Consent requirements | Consent records, withdrawal mechanism |
| Art. 9 | Health data (special category) | Explicit consent or legal basis |
| Art. 13-14 | Privacy notices | Published notices |
| Art. 15-22 | Data subject rights | Request handling procedures |
| Art. 30 | Records of Processing Activities (RoPA) | Maintained register |
| Art. 32 | Security measures | TOMs documentation |
| Art. 33-34 | Breach notification (72 hours) | Incident response procedures |
| Art. 35 | DPIA (mandatory for health data) | Completed DPIAs |
| Art. 37 | DPO appointment | DPO designation |

### 4.3 Penetration Testing Standards (Healthcare)

| Standard | Scope | Frequency |
|----------|-------|-----------|
| OWASP Testing Guide | Web application testing | Per release + annual |
| OWASP Mobile Top 10 | Mobile app testing | Per release + annual |
| NIST SP 800-115 | Technical security testing | Annual |
| PTES | Full methodology | Annual |

#### Pen Test Report Requirements

| Section | Content |
|---------|---------|
| Executive Summary | Risk overview for leadership |
| Methodology | Testing approach, tools, scope |
| Findings | Vulnerabilities with CVSS scores |
| Evidence | Screenshots, proof of concept |
| Remediation | Prioritized recommendations |
| Retest Results | Verification of fixes |

---

## 5. Code Quality Audit for Medical Software

### 5.1 Static Analysis Requirements

| Requirement | Standard | Tool Examples |
|-------------|----------|---------------|
| Code Quality Rules | MISRA, CERT | SonarQube, CodeSonar |
| Security Rules | OWASP, CWE Top 25 | Checkmarx, Snyk |
| Complexity Metrics | Cyclomatic complexity < 10 | SonarQube |
| Duplication | < 3% duplicated code | SonarQube |

### 5.2 Test Coverage Thresholds

| Metric | Minimum | Recommended | IEC 62304 Class C |
|--------|---------|-------------|-------------------|
| Statement Coverage | 80% | 90%+ | 100% |
| Branch Coverage | 70% | 85%+ | 100% |
| Function Coverage | 80% | 90%+ | 100% |
| MC/DC Coverage | - | - | Required for safety-critical |

**FDA Guidance:** "100% branch coverage is considered to be a minimum level of coverage for most software products."

### 5.3 Documentation Standards (IEC 62304)

| Document | IEC 62304 Section | Content |
|----------|-------------------|---------|
| Software Development Plan | 5.1 | Lifecycle model, methods, tools |
| Software Requirements Specification | 5.2 | Functional, performance, interface requirements |
| Software Architecture Document | 5.3 | Component structure, interfaces |
| Detailed Design | 5.4 | Module-level design |
| Unit Verification | 5.5 | Test cases, results, code review |
| Integration Testing | 5.6 | Integration test plan, results |
| System Testing | 5.7 | System test plan, results |
| Release Documentation | 5.8 | Release notes, known issues |

### 5.4 CI/CD Pipeline Requirements

| Stage | Requirements | Tools |
|-------|-------------|-------|
| Build | Reproducible builds, version control | Git, npm |
| Static Analysis | Automated code scanning | SonarQube, ESLint |
| Unit Tests | Automated execution, coverage reports | Jest |
| Integration Tests | API and E2E testing | Supertest, Playwright |
| Security Scanning | SAST/DAST, dependency scanning | Snyk, OWASP ZAP |
| Artifact Management | Signed, versioned artifacts | npm registry |
| Deployment | Automated, audited deployments | GitHub Actions |

---

## 6. Clinical Content Audit

### 6.1 Evidence-Based Content Validation

| Component | Evidence Source | Effect Size (d) |
|-----------|-----------------|-----------------|
| Sleep Restriction Therapy | Spielman et al. 1987 | 0.45 |
| Stimulus Control | Bootzin 1972 | 0.41 |
| Cognitive Restructuring | Harvey 2002 | 0.32 |
| Sleep Hygiene Education | Multiple studies | 0.12 |
| Relaxation Training | Morin 2006 | 0.28 |
| **Multicomponent CBT-I** | Meta-analyses | **0.84** |

### 6.2 Clinical Advisory Board Requirements

| Role | Qualifications | Responsibilities |
|------|---------------|------------------|
| Medical Director | MD/DO, sleep medicine board certified | Clinical protocol approval |
| Clinical Psychologist | PhD/PsyD, CBT-I certification | Therapy content validation |
| Psychiatrist | MD, psychiatry board certified | Safety protocol review |
| Sleep Researcher | PhD, peer-reviewed publications | Evidence review |
| Patient Advocate | Lived experience | User perspective |

#### Advisory Board Documentation

| Document | Frequency |
|----------|-----------|
| Charter | Initial + annual review |
| Meeting Minutes | Each meeting |
| Content Approval Records | Per content change |
| Conflict of Interest Disclosures | Annual |
| Recommendation Log | Ongoing |

### 6.3 Content Validation Checklist

| Criterion | Evidence |
|-----------|----------|
| Evidence-based | Cited peer-reviewed sources |
| Guideline-aligned | European Insomnia Guideline 2023 |
| Culturally appropriate | Cultural adaptation documentation |
| Safety-reviewed | Crisis detection, contraindication checks |
| Readability-tested | Plain language, tested literacy level |
| User-tested | Usability testing records |

---

## 7. CE Mark Class IIa Audit (EU MDR)

### 7.1 Conformity Assessment Route

| Route | Description | Typical Use |
|-------|-------------|-------------|
| **Annex IX (Full QA)** | QMS + Technical Doc sampling | Recommended for software |
| Annex XI | Product control + Production QA | Alternative |

### 7.2 Notified Body Audit Checklist

| Audit Area | Documents |
|------------|-----------|
| QMS (ISO 13485) | Quality Manual, procedures, records |
| Technical File | Per MDR Annexes II/III |
| Clinical Evaluation | CER per MDR Article 61 |
| Risk Management | ISO 14971 file |
| Software Lifecycle | IEC 62304 documentation |
| Usability | IEC 62366-1 file |
| Post-Market Surveillance | PMS plan, PSUR |
| Cybersecurity | IEC 81001-5-1 documentation |

### 7.3 Timeline & Costs

| Phase | Duration | Cost Range |
|-------|----------|------------|
| QMS Implementation | 6-12 months | $30,000-$75,000 |
| NB Selection | 1-3 months | - |
| NB Queue | 6-12 months | - |
| Audit to Certificate | 2-7 months | $15,000-$50,000 |
| Annual Surveillance | Ongoing | $5,000-$15,000/year |

---

## 8. ISO 13485 QMS Audit

### 8.1 Mandatory Documentation (28 Documents)

| Category | Documents |
|----------|-----------|
| **Quality Manual** | Scope, QMS overview, policy |
| **Procedures** | Design control, CAPA, document control, etc. |
| **Work Instructions** | Detailed operational guidance |
| **Records** | Evidence of compliance |

### 8.2 Key Clauses for Software

| Clause | Requirement | Software Implementation |
|--------|-------------|------------------------|
| 4.2 | Documentation | Software Development Plan, SRS |
| 7.1 | Planning | Product realization planning |
| 7.3 | Design & Development | IEC 62304 alignment |
| 7.5.6 | Validation | Software validation |
| 8.2.4 | Monitoring | Software performance monitoring |

### 8.3 Audit Readiness Checklist

| Area | Evidence |
|------|----------|
| Document Control | Version control, approval records |
| Training Records | Competency verification |
| Design History File | Complete traceability |
| Risk Management | ISO 14971 file |
| Supplier Controls | Supplier evaluations, agreements |
| CAPA | Corrective/preventive action records |
| Internal Audits | Audit reports, findings |
| Management Review | Meeting minutes, decisions |

---

## 9. SBOM (Software Bill of Materials) Requirements

### 9.1 NTIA Minimum Elements

| Field | Description | Example |
|-------|-------------|---------|
| Supplier Name | Component source | "npm:express" |
| Component Name | Package name | "express" |
| Version | Exact version | "4.18.2" |
| Unique Identifier | PURL or CPE | "pkg:npm/express@4.18.2" |
| Dependency Relationship | Direct/transitive | "direct" |
| Author | Creator of SBOM | "SleepCore DevOps" |
| Timestamp | Generation time | "2026-01-15T10:30:00Z" |

### 9.2 Format Requirements

| Format | Standard | Usage |
|--------|----------|-------|
| **SPDX** | ISO/IEC 5962:2021 | FDA preferred |
| **CycloneDX** | OWASP | Industry standard |
| **SWID** | ISO/IEC 19770-2 | Alternative |

### 9.3 SBOM Process Requirements

| Requirement | Implementation |
|-------------|----------------|
| Generation | Automated in CI/CD pipeline |
| Maintenance | Updated with each release |
| Vulnerability Mapping | CVE tracking per component |
| Risk Assessment | Per-vulnerability safety/security analysis |
| Remediation Tracking | Patch timeline documentation |

---

## 10. SleepCore-Specific Audit Checklist

### 10.1 Safety-Critical Modules

```
REQUIRES: 2-person review + 100% test coverage
```

| Module | Path | Risk Level |
|--------|------|------------|
| Crisis Detection | src/bot/services/CrisisDetectionService.ts | CRITICAL |
| Crisis Escalation | src/bot/services/CrisisEscalationService.ts | CRITICAL |
| Sleep Restriction | src/cbt-i/engines/SleepRestrictionEngine.ts | HIGH |
| ISI Assessment | src/assessment/instruments/ISIRussian.ts | HIGH |
| PHI Encryption | src/infrastructure/database/security/ | CRITICAL |

### 10.2 Clinical Constants Verification

| Constant | Required Value | Rationale |
|----------|---------------|-----------|
| MIN_TIB | 300 min (5 hrs) | Spielman et al., 1987 — safety |
| MAX_TIB | 540 min (9 hrs) | Clinical practice |
| SE_INCREASE_THRESHOLD | ≥ 90% | Weekly adjustment |
| TIB_ADJUSTMENT_STEP | ±15 min | Weekly increment |

### 10.3 Red Flags

| Area | Red Flag | Audit Action |
|------|----------|--------------|
| Safety | TIB < 5 hours in any calculation | FAIL — immediate fix |
| Safety | Crisis detection can be disabled | FAIL — immediate fix |
| Privacy | PHI stored unencrypted | FAIL — immediate fix |
| Compliance | Audit trail gaps | MAJOR finding |
| Clinical | Non-evidence-based content | MAJOR finding |
| Software | Test coverage < 80% | MINOR finding |

---

## 11. Audit Schedule

### 11.1 Pre-Market Phase

| Audit Type | Timing (before submission) | Duration |
|------------|---------------------------|----------|
| Gap Analysis (ISO 13485) | M-18 | 2 weeks |
| Internal Audit (QMS) | M-12 | 1 week |
| Code Quality Audit | M-10 | 2 weeks |
| Security Assessment | M-9 | 3 weeks |
| Clinical Content Review | M-8 | 2 weeks |
| Mock FDA Audit | M-6 | 1 week |
| Notified Body QMS Audit | M-4 | 1 week |
| Technical File Review | M-3 | 2 weeks |

### 11.2 Post-Market Phase

| Audit Type | Frequency |
|------------|-----------|
| Internal QMS Audit | Annual |
| Surveillance Audit (NB) | Annual |
| Penetration Test | Annual |
| Vulnerability Scan | Every 6 months |
| CAPA Review | Quarterly |
| Clinical Evidence Review | Annual |
| SBOM Update | Each release |

---

## 12. References

### Regulatory Sources

| Source | URL |
|--------|-----|
| FDA 510(k) | https://www.fda.gov/medical-devices/premarket-submissions |
| FDA Cybersecurity 2025 | https://www.fda.gov/medical-devices/cyber-devices |
| BfArM DiGA | https://www.bfarm.de/EN/Medical-devices/Tasks/DiGA-and-DiPA |
| EU MDR | https://eur-lex.europa.eu/eli/reg/2017/745 |
| ICH E6(R3) | https://database.ich.org/sites/default/files/ICH_E6 |

### Standards

| Standard | Description |
|----------|-------------|
| ISO 13485:2016 | Medical devices — QMS |
| ISO 14971:2019 | Risk management |
| IEC 62304:2006+A1:2015 | Medical device software lifecycle |
| IEC 62366-1:2015 | Usability engineering |
| IEC 81001-5-1:2021 | Health software security |

---

*DTx Professional Audit Framework v1.0*
*Created: 2026-02-16*
*Next Review: Before Pilot RCT submission*
