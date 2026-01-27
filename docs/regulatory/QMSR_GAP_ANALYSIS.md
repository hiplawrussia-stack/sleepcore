# QMSR Gap Analysis — SleepCore

**Document Version:** 1.0
**Date:** January 2026
**Compliance:** 21 CFR Part 820 (QMSR), ISO 13485:2016
**Effective Date:** February 2, 2026

---

## 1. Executive Summary

This document provides a gap analysis between SleepCore's current Quality Management System (QMS) and the FDA's new Quality Management System Regulation (QMSR), which incorporates ISO 13485:2016 by reference effective February 2, 2026.

### 1.1 Key Changes in QMSR

The QMSR represents a fundamental shift from prescriptive QSR requirements to ISO 13485:2016 alignment:

| Aspect | Old QSR (21 CFR 820) | New QMSR |
|--------|---------------------|----------|
| Structure | 15 subparts (A-O) | 2 subparts (A-B) |
| Foundation | FDA-specific | ISO 13485:2016 by reference |
| Terminology | QSR terms | ISO 9000:2015 definitions |
| Risk Management | Implicit | Explicit (ISO 14971 expected) |
| Audit Reports | Exempt from FDA inspection | Subject to FDA inspection |

### 1.2 Gap Summary

| Category | Gaps Identified | Priority |
|----------|-----------------|----------|
| Management Responsibility | 2 | High |
| Resource Management | 1 | Medium |
| Product Realization | 3 | High |
| Measurement & Improvement | 2 | Medium |
| FDA-Specific Requirements | 4 | High |
| **Total** | **12** | — |

---

## 2. ISO 13485:2016 Clause-by-Clause Analysis

### 2.1 Clause 4: Quality Management System

#### 4.1 General Requirements

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| QMS processes defined | Partial | Yes | Document all QMS processes with SIPOC |
| Process interactions mapped | Partial | Yes | Create process interaction diagram |
| Outsourced process control | N/A | No | — |
| Software validation (QMS software) | Complete | No | GitHub, Jest, Sentry validated |

**Gap Detail:**
- QMS processes exist but lack formal SIPOC (Suppliers, Inputs, Process, Outputs, Customers) documentation
- Process interaction diagram not formalized

**Action Items:**
1. Create QMS Process Map with all interactions
2. Document each process using SIPOC format
3. Ensure traceability to ISO 13485 clauses

#### 4.2 Documentation Requirements

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| Quality Manual | Missing | Yes | Create Quality Manual |
| Quality Policy | Draft | Partial | Formalize and approve |
| Quality Objectives | Implicit | Yes | Define measurable objectives |
| Procedures | Partial | Yes | Complete procedure set |
| Records | Complete | No | — |
| Medical device file | Complete | No | Technical documentation in place |

**Gap Detail:**
- Quality Manual does not exist as formal document
- Quality objectives not explicitly defined with metrics

**Action Items:**
1. Create Quality Manual per ISO 13485:2016 Section 4.2.2
2. Define SMART quality objectives
3. Review and formalize all procedures

---

### 2.2 Clause 5: Management Responsibility

#### 5.1-5.2 Management Commitment & Customer Focus

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| Top management commitment evidence | Partial | Yes | Document commitment |
| Regulatory requirements communicated | Complete | No | Via CLAUDE.md |
| Customer requirements determined | Complete | No | User research documented |

#### 5.3-5.4 Quality Policy & Planning

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| Quality policy documented | Draft | Yes | Formalize |
| Quality objectives measurable | Missing | Yes | Define metrics |
| QMS planning documented | Partial | Yes | Expand planning docs |

#### 5.5 Responsibility, Authority, Communication

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| Organization chart | Informal | Yes | Create formal org chart |
| Management Representative appointed | Not assigned | Yes | Assign and document |
| Internal communication | Complete | No | Telegram, GitHub |

#### 5.6 Management Review

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| Management review procedure | Missing | Yes | Create procedure |
| Review inputs defined | N/A | Yes | Define per 5.6.2 |
| Review outputs documented | N/A | Yes | Template needed |
| Review frequency | N/A | Yes | Define (minimum annual) |

**⚠️ CRITICAL QMSR CHANGE:**
> Management Review records are now subject to FDA inspection under QMSR.
> Previous QSR exemption (§820.180(c)) is withdrawn.

**Action Items:**
1. Create Management Review SOP
2. Define review inputs per ISO 13485:2016 clause 5.6.2
3. Create Management Review template
4. Schedule first Management Review before Feb 2, 2026

---

### 2.3 Clause 6: Resource Management

#### 6.1-6.2 Provision of Resources & Human Resources

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| Resource needs determined | Implicit | Partial | Document resource analysis |
| Competence requirements defined | Partial | Yes | Formalize competencies |
| Training records | Partial | Yes | Centralize records |
| Training effectiveness evaluation | Missing | Yes | Create evaluation method |

#### 6.3-6.4 Infrastructure & Work Environment

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| Infrastructure documented | Complete | No | Cloud infrastructure spec |
| Work environment requirements | N/A | No | Remote work, software-only |
| Contamination control | N/A | No | Not applicable to SaMD |

**Action Items:**
1. Create Training Matrix with competence requirements
2. Implement training effectiveness evaluation
3. Centralize training records (consider LMS)

---

### 2.4 Clause 7: Product Realization

#### 7.1 Planning of Product Realization

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| Quality objectives for product | Complete | No | In CLAUDE.md |
| Process documentation | Complete | No | Sprint processes defined |
| Verification, validation, monitoring | Complete | No | Comprehensive test suite |
| Required records | Complete | No | Git history, test results |

#### 7.2 Customer-Related Processes

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| Product requirements determined | Complete | No | User stories, clinical requirements |
| Requirements reviewed | Complete | No | Sprint planning |
| Customer communication | Complete | No | Telegram bot, support |

#### 7.3 Design and Development

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| Design planning | Complete | No | Sprint cycles |
| Design inputs | Complete | No | Requirements in GitHub issues |
| Design outputs | Complete | No | Code, documentation |
| Design review | Partial | Yes | Formalize review gates |
| Design verification | Complete | No | Unit tests, integration tests |
| Design validation | Complete | No | E2E tests, clinical validation |
| Design changes | Complete | No | Git, PR reviews |
| Design transfer | N/A | No | SaaS model, no transfer |

**Gap Detail:**
- Design review gates not formally documented
- Design review records may not meet ISO 13485 format

**Action Items:**
1. Create Design Review SOP with stage gates
2. Implement formal design review records
3. Map design controls to IEC 62304 lifecycle

#### 7.4 Purchasing

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| Supplier evaluation | Partial | Yes | Formalize evaluation |
| Purchasing information | Complete | No | package.json, contracts |
| Verification of purchased product | Complete | No | npm audit, dependency review |

**⚠️ CRITICAL QMSR CHANGE:**
> Supplier audit records are now subject to FDA inspection under QMSR.

**Action Items:**
1. Create Approved Supplier List with evaluation criteria
2. Implement supplier qualification procedure
3. Document critical supplier evaluations (cloud providers, AI services)

#### 7.5 Production and Service Provision

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| Production control | Complete | No | CI/CD, Docker |
| Product cleanliness | N/A | No | Software only |
| Installation | Complete | No | Automated deployment |
| Servicing | Complete | No | Telegram support, updates |
| Specific requirements for sterile | N/A | No | Not applicable |
| Process validation | Complete | No | POMDP validation |
| Identification and traceability | Complete | No | UDI, version control |
| Customer property | Complete | No | PHI encryption, GDPR |
| Preservation | N/A | No | No physical product |

#### 7.6 Control of Monitoring and Measuring Equipment

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| Equipment identified | N/A | No | Software metrics only |
| Calibration | N/A | No | Validated algorithms |
| Software used for monitoring | Complete | No | Sentry, monitoring |

---

### 2.5 Clause 8: Measurement, Analysis and Improvement

#### 8.1-8.2 General & Monitoring and Measurement

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| Customer satisfaction monitoring | Partial | Yes | Formalize measurement |
| Internal audit program | Missing | Yes | Create audit program |
| Process monitoring | Complete | No | Automated metrics |
| Product monitoring | Complete | No | ISI outcomes, usage |

**⚠️ CRITICAL QMSR CHANGE:**
> Quality audit records are now subject to FDA inspection under QMSR.

**Action Items:**
1. Create Internal Audit SOP
2. Define audit schedule (minimum annual)
3. Train internal auditors
4. Create audit records template

#### 8.3 Control of Nonconforming Product

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| Nonconformance identification | Partial | Yes | Formalize procedure |
| Nonconformance disposition | Partial | Yes | Define disposition options |
| Concessions | N/A | No | — |
| Advisory notices | Planned | Partial | Integrate with crisis system |

**Action Items:**
1. Create Nonconforming Product SOP
2. Define disposition workflow
3. Link to CAPA system

#### 8.4 Analysis of Data

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| Data collection | Complete | No | Comprehensive logging |
| Statistical techniques | Complete | No | ISI analysis, trend detection |
| Trend analysis | Complete | No | Automated alerts |

#### 8.5 Improvement

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| CAPA procedure | Partial | Yes | Formalize CAPA SOP |
| Corrective action | Partial | Yes | Standardize process |
| Preventive action | Partial | Yes | Proactive risk monitoring |

**Action Items:**
1. Create CAPA SOP aligned with ISO 13485
2. Implement CAPA tracking system
3. Define effectiveness verification criteria

---

## 3. FDA-Specific QMSR Requirements

The QMSR retains certain FDA-specific requirements not fully covered by ISO 13485:2016.

### 3.1 Section 820.35 — Control of Records

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| Complaint records content | Complete | No | CrisisDetectionService |
| Investigation criteria defined | Complete | No | Per crisis protocols |
| Service records content | Partial | Yes | Formalize service record format |

**QMSR Section 820.35 Specifics:**
- Complaint records must include investigation rationale
- Service records must document maintenance activities

**Action Items:**
1. Review complaint record template for QMSR compliance
2. Create service record template with required fields

### 3.2 Section 820.45 — Device Labeling and Packaging Controls

| Requirement | Current State | Gap | Action Required |
|-------------|---------------|-----|-----------------|
| Label accuracy inspection | Partial | Yes | Implement release inspection |
| Label control procedure | Partial | Yes | Formalize procedure |
| Labeling identification | Complete | No | UDI implementation |
| Labeling storage | N/A | No | Digital labels only |

**QMSR Section 820.45 Specifics:**
- Inspection required to verify label accuracy before release
- Specific to: lot/batch, expiration (if any), instructions, warnings

**Action Items:**
1. Create Label Control SOP for SaMD
2. Implement release checklist including version verification
3. Document label review in release notes

### 3.3 Corrective and Preventive Action (CAPA)

| QMSR Requirement | ISO 13485 Clause | Gap |
|------------------|------------------|-----|
| Sources of quality data | 8.5.2(a) | No |
| Problem assessment | 8.5.2(b) | Partial |
| Investigation extent | 8.5.2(c) | Partial |
| Root cause analysis | 8.5.2(d) | Yes |
| Action verification | 8.5.2(e) | Partial |
| Implementation records | 8.5.2(f) | Yes |
| Effectiveness verification | 8.5.2(g) | Yes |
| Change procedures | 8.5.2(h) | No |
| Submission to management | 8.5.2 | Partial |

**Action Items:**
1. Enhance CAPA procedure with root cause analysis requirements
2. Implement effectiveness verification step
3. Create CAPA tracking metrics for management review

---

## 4. Risk Management Integration

### 4.1 ISO 14971 Alignment

QMSR expects risk management integrated throughout the QMS per ISO 13485:2016 references to risk.

| Risk Management Element | Current State | Gap |
|------------------------|---------------|-----|
| Risk management plan | Complete | No |
| Risk analysis | Complete | No |
| Risk evaluation | Complete | No |
| Risk control measures | Complete | No |
| Residual risk evaluation | Complete | No |
| Risk management report | Partial | Yes |
| Production/post-production info | Complete | No |

**Gap Detail:**
- Risk management report not formalized as standalone document

**Action Items:**
1. Create Risk Management Report summarizing risk file
2. Link to post-market surveillance data

---

## 5. Gap Closure Action Plan

### 5.1 Priority 1: Critical (Complete by Jan 31, 2026)

| Action | Owner | Deadline |
|--------|-------|----------|
| Create Management Review SOP & Template | QA | Jan 15, 2026 |
| Conduct first Management Review | Management | Jan 31, 2026 |
| Create Internal Audit SOP & Schedule | QA | Jan 20, 2026 |
| Appoint Management Representative | CEO | Jan 10, 2026 |

### 5.2 Priority 2: High (Complete by Feb 1, 2026)

| Action | Owner | Deadline |
|--------|-------|----------|
| Create Quality Manual | QA | Jan 25, 2026 |
| Formalize CAPA SOP with RCA | QA | Jan 20, 2026 |
| Create Supplier Qualification SOP | QA | Jan 25, 2026 |
| Create Design Review SOP | Engineering | Jan 20, 2026 |
| Create Label Control SOP | Regulatory | Jan 25, 2026 |

### 5.3 Priority 3: Medium (Complete by Mar 31, 2026)

| Action | Owner | Deadline |
|--------|-------|----------|
| Create Training Matrix | HR/QA | Feb 28, 2026 |
| Implement Training Effectiveness | HR/QA | Mar 15, 2026 |
| Customer Satisfaction Measurement | Product | Mar 31, 2026 |
| Formalize Service Records | Support | Feb 28, 2026 |

### 5.4 Timeline Visualization

```
                    JAN 2026                    FEB 2026
         Week 1   Week 2   Week 3   Week 4   Week 1   ...
         ─────────────────────────────────────────────────
Mgmt Rep    ████
Mgmt Review SOP     ███████
Int Audit SOP           ██████
Quality Manual              ████████
CAPA SOP                ████████
Design Review SOP       ████████
Supplier SOP                ████████
Label Control SOP               ████████
Management Review                   ████████
                                        │
                                        ▼
                               QMSR EFFECTIVE
                               Feb 2, 2026
```

---

## 6. Compliance Verification

### 6.1 Pre-QMSR Readiness Checklist

```
□ Management Representative appointed and documented
□ Quality Manual completed and approved
□ Management Review conducted with required inputs/outputs
□ Internal Audit SOP established with schedule
□ CAPA SOP updated with RCA and effectiveness verification
□ Supplier qualification procedure implemented
□ Design Review gates formalized
□ Label control procedure for SaMD documented
□ Service records template created
□ Training matrix completed
□ All SOPs reviewed for ISO 13485:2016 terminology
□ Records retention reviewed (6 years for SleepCore)
```

### 6.2 FDA Inspection Preparation

**Newly Inspectable Records under QMSR:**
1. Management Review records
2. Quality Audit records
3. Supplier Audit records

**Recommended Actions:**
- Ensure these records demonstrate objective evidence
- Remove subjective/informal language
- Maintain clear corrective action tracking
- Document management decisions and rationale

---

## 7. References

1. 21 CFR Part 820 — Quality Management System Regulation (QMSR)
2. ISO 13485:2016 — Medical devices — Quality management systems
3. ISO 9000:2015 — Quality management systems — Fundamentals and vocabulary
4. ISO 14971:2019 — Medical devices — Application of risk management
5. IEC 62304:2006+AMD1:2015 — Medical device software — Life cycle processes
6. FDA Guidance: Quality System Regulation Overview (Dec 2024)

---

**Document Control:**
- Author: SleepCore Regulatory Team
- Reviewed: [Pending]
- Approved: [Pending]
- Next Review: After QMSR effective date (Feb 2026)
