# SleepCore Production Launch Plan

> **Version**: 1.18
> **Created**: 2026-01-08
> **Status**: Active
> **Last Updated**: 2026-01-10

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Research Findings](#research-findings)
3. [Uncertainties](#uncertainties)
4. [Phase 0: Pre-Production](#phase-0-pre-production)
5. [Phase 1: Pilot Testing](#phase-1-pilot-testing)
6. [Phase 2: Randomized Controlled Trial](#phase-2-randomized-controlled-trial)
7. [Phase 3: Regulatory Strategy](#phase-3-regulatory-strategy)
8. [Phase 4: Product Development](#phase-4-product-development)
9. [Phase 5: Scaling & Monetization](#phase-5-scaling--monetization)
10. [Phase 6: Continuous Improvement](#phase-6-continuous-improvement)
11. [Sources](#sources)

---

## Executive Summary

SleepCore is an AI-powered digital therapeutic (DTx) for chronic insomnia treatment using evidence-based CBT-I. This document outlines the comprehensive production launch plan based on 2025-2026 global trends and scientific evidence.

### Key Strategic Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary Market | Russia | New regulations Order 181n, local advantage |
| Initial Platform | Telegram Bot | MVP, fast iteration |
| Target Platform | Native Mobile App | Compliance, wearables, notifications |
| Database | SQLite → PostgreSQL | Scale when needed |
| Business Model | Freemium + B2B | Industry standard for DTx |
| Clinical Validation | Full RCT (N=150) | Required for medical device registration |

---

## Research Findings

### 1. Regulatory Requirements

#### 1.1 FDA (USA)

| Finding | Confidence | Source |
|---------|------------|--------|
| DTx requires 510(k) or De Novo pathway | HIGH | CMS Policy 2025 |
| Only 2 FDA-cleared dCBT-I: Somryst and SleepioRx | HIGH | JMIR Mental Health 2025 |
| CMS established reimbursement codes in 2025 | HIGH | JMIR Research 2025 |
| SleepioRx: OR 2.52 response, 5.8 remission vs control | HIGH | NEJM AI |

#### 1.2 EU AI Act (Europe)

| Finding | Confidence | Source |
|---------|------------|--------|
| Healthcare AI = "high-risk" category | HIGH | EU AI Act |
| Compliance deadline: August 2026 | HIGH | Official EU Regulation |
| Requires conformity assessment | HIGH | EU AI Act Article 43 |

#### 1.3 Russia (Roszdravnadzor)

| Finding | Confidence | Source |
|---------|------------|--------|
| Order No. 181n effective September 1, 2025 | HIGH | UCEC Quality |
| Mandatory cybersecurity section for software | HIGH | Schmidt Export |
| AI-software: automatic data transmission to Roszdravnadzor | MEDIUM | Order No. 181n |
| From 2026: registration under EAEU rules | MEDIUM | Regdesk |

### 2. Clinical Evidence

#### 2.1 dCBT-I Effectiveness

| Finding | Confidence | Source |
|---------|------------|--------|
| FA dCBT-I: SMD = -0.71 (moderate-to-large effect) | HIGH | npj Digital Medicine 2025 |
| 29 RCTs, 9,475 participants in meta-analysis | HIGH | npj Digital Medicine 2025 |
| FA dCBT-I less effective than therapist-assisted | HIGH | npj Digital Medicine 2025 |
| Treatment adherence more important than completion | HIGH | Meta-regression analysis |

#### 2.2 Clinical Trial Design

| Finding | Confidence | Source |
|---------|------------|--------|
| Sample size in RCTs: 80-1,149 participants | HIGH | Frontiers |
| Typical RCT: 2-arm design | HIGH | Literature review |
| Control: waitlist, TAU, or sham (50/50) | HIGH | JMIR 2025 |
| DCT (decentralized) gaining popularity | MEDIUM | JMIR 2025 |

#### 2.3 ISI MCID

| Finding | Confidence | Source |
|---------|------------|--------|
| MCID (between-group): 4 points | HIGH | BMC Medical Research |
| MIC (within-person): 6 points | HIGH | PubMed 2009 |
| Remission threshold: ISI < 8 | HIGH | Clinical standard |

### 3. AI Chatbot Therapy

| Finding | Confidence | Source |
|---------|------------|--------|
| First RCT GenAI chatbot (Therabot): significant improvement | HIGH | NEJM AI / Dartmouth |
| Effect size chatbots: g=0.29 depression, g=0.19 anxiety | MEDIUM | APA Review |
| Only 16% LLM studies passed clinical efficacy testing | HIGH | PMC Systematic Review |
| APA (March 2025): warning about generic AI chatbots | HIGH | APA |
| Chatbots = supplementary, not replacement | HIGH | JMIR 2025 |

### 4. Market & Monetization

| Finding | Confidence | Source |
|---------|------------|--------|
| Sleep App Market 2024: $2.9-3.1B | HIGH | Dataintelo |
| CAGR 2025-2033: 14-15% | HIGH | Market reports |
| Projected 2033: $8.4-11.5B | MEDIUM | Forecasts |
| Freemium → subscription dominates | HIGH | Business Research |
| Conversion rate freemium: 2-5% (top: 5-8%) | HIGH | Adapty |
| Calm: $69.99/year, $2B valuation | HIGH | Public data |

### 5. Retention Metrics

| Finding | Confidence | Source |
|---------|------------|--------|
| Day 1 retention: ~25% | MEDIUM | Industry benchmarks |
| Day 15 retention: ~4% | MEDIUM | Statista |
| Day 30 retention: ~3% | MEDIUM | Industry benchmarks |
| Gamification improves retention 30-50% | MEDIUM | Multiple sources |

### 6. Wearable Integration

| Finding | Confidence | Source |
|---------|------------|--------|
| Terra API: 100+ devices, unified schema | HIGH | Terra Docs |
| Apple Health requires mobile SDK | HIGH | Terra |
| Google Fit API sunset: June 30, 2025 | HIGH | Google |
| Health Connect = new Android standard | HIGH | Google |
| Oura: best sleep accuracy | HIGH | Industry consensus |

### 7. Predictive Modeling (PLRNN)

| Finding | Confidence | Source |
|---------|------------|--------|
| PLRNN outperforms linear models for EMA prediction | HIGH | npj Digital Medicine 2025 |
| PLRNNs provide most accurate mental health forecasts | HIGH | medRxiv 2025 |
| Dendritic PLRNN: interpretable nonlinear dynamics | HIGH | Durstewitz Lab 2025 |
| Hybrid prediction: Kalman (short-term) + PLRNN (long-term) | HIGH | npj Digital Medicine 2025 |
| Early warning signals: autocorrelation, variance, connectivity | HIGH | Nature Reviews Psychology 2025 |
| 5D state sufficient for sleep dynamics modeling | MEDIUM | CogniCore Engine 2.0 |

### 8. JITAI Adaptive Interventions

| Finding | Confidence | Source |
|---------|------------|--------|
| JITAI framework for personalized health interventions | HIGH | Nahum-Shani 2018 |
| Digital phenotyping improves intervention timing | HIGH | Insel 2017 |
| Chronotype-based scheduling improves adherence | HIGH | Munich Chronotype Questionnaire |
| Social jet lag correlates with sleep debt | HIGH | Roenneberg 2003 |
| Adaptive TIB adjustment outperforms fixed schedules | MEDIUM | CBT-I Meta-analyses |
| Real-time tailoring variables improve outcomes | MEDIUM | mHealth research 2025 |

### 9. Telegram Compliance

| Finding | Confidence | Source |
|---------|------------|--------|
| Telegram NOT HIPAA compliant | HIGH | Multiple sources |
| No BAA with Telegram | HIGH | HIPAA requirements |
| No full audit trail | HIGH | Telegram architecture |
| Acceptable for non-PHI or with encryption layer | MEDIUM | Security best practices |

---

## Uncertainties

| # | Uncertainty | Impact |
|---|-------------|--------|
| 1 | Exact Roszdravnadzor requirements for AI-software mental health | HIGH |
| 2 | Cost and timeline for medical device registration in Russia | HIGH |
| 3 | Telegram GDPR-compliance for mental health in EU | HIGH |
| 4 | Effectiveness of Russian-language dCBT-I | MEDIUM |
| 5 | Retention benchmarks for Russian mental health app market | MEDIUM |
| 6 | Terra API pricing for production scale | MEDIUM |
| 7 | LLM-based therapy effectiveness for Russian language | MEDIUM |
| 8 | Exact FDA De Novo requirements for non-US developers | MEDIUM |
| 9 | Thompson Sampling relevance vs modern RL algorithms for DTx | LOW |
| 10 | EAEU harmonization 2026 procedure details | LOW |
| 11 | Whether SleepCore is HIPAA "covered entity" (depends on US business model) | MEDIUM |
| 12 | Cross-border data transfer rules between Russia and other jurisdictions | MEDIUM |
| 13 | Classification of CBT-I therapy notes under HIPAA psychotherapy notes | LOW |
| 14 | Arbitration clause enforceability in Russia (consumer protection law) | MEDIUM |
| 15 | Specific Roszdravnadzor disclaimer requirements for AI-powered DTx | MEDIUM |
| 16 | EU Digital Services Act implications for health app content moderation | LOW |
| 17 | Russia local ethics committee (LEC) requirements vs federal Ethics Council | MEDIUM |
| 18 | eConsent 21 CFR Part 11 compliance for Telegram-based consent | MEDIUM |
| 19 | Insurance policy requirements for digital-only (no physical intervention) trials in Russia | LOW |
| 20 | SPIRIT 2025 vs SPIRIT 2013 mandatory items for digital therapeutics | LOW |
| 21 | Russia Ethics Council fee structure and timeline variability | MEDIUM |
| 22 | MDCG 2024-5 applicability to SaMD without hardware component | LOW |
| 23 | Telegram platform acceptability for clinical trial eConsent (no formal BAA) | HIGH |
| 24 | Audit trail export format requirements for Roszdravnadzor inspections | MEDIUM |
| 25 | User ID uniqueness validation for 21 CFR Part 11 (Telegram user_id vs email) | MEDIUM |
| 26 | Russian language ISI validation psychometric equivalence to English | LOW |
| 27 | Semi-random EMA scheduling algorithm implementation details | LOW |
| 28 | Consent withdrawal mechanism automation (GDPR Art. 7(3) / 152-FZ) | MEDIUM |
| 29 | Biometric authentication requirements for high-risk SaMD in Russia | LOW |
| 30 | 152-FZ specific requirements for admin access to personal data (not found) | MEDIUM |
| 31 | Roszdravnadzor audit trail format requirements for SaMD | HIGH |
| 32 | MFA requirements for admin access in pilot studies | MEDIUM |
| 33 | Minimum retention periods for admin access logs in Russia | MEDIUM |
| 34 | Clinical trial role definitions standard in Russia (no formal standard found) | MEDIUM |
| 35 | Russia Roszdravnadzor requirements for software-only DTx AE reporting (not explicitly covered for non-drug devices) | HIGH |
| 36 | MedDRA coding for psychological AEs specific to CBT-I (frustration, therapy-related anxiety) | MEDIUM |
| 37 | ISI deterioration threshold for automatic AE flagging (7 points = MCID vs. other threshold) | MEDIUM |
| 38 | Blue light exposure from app usage as potential AE disclosure requirement | LOW |
| 39 | ICH E6(R3) FDA formal adoption timeline (EMA effective July 2025, FDA TBD) | MEDIUM |
| 40 | EAEU pharmacovigilance harmonization impact on DTx AE reporting | LOW |
| 41 | Causality assessment methodology for software-based interventions (no established standard) | MEDIUM |
| 42 | SUSAR definition for software therapeutics (no established precedent) | LOW |
| 43 | EMA Policy 0070 v1.5 re-identification risk threshold (0.09) applicability to non-EU submissions | MEDIUM |
| 44 | Russia-specific anonymization standard beyond 152-FZ "making re-identification impossible" | HIGH |
| 45 | CDISC SDTM/ADaM requirement for Russia/EAEU submissions (mandatory for FDA only) | MEDIUM |
| 46 | Telegram user_id reversibility risk assessment (sequential integer, potential attack vector) | MEDIUM |
| 47 | Minimum k value for k-anonymity in small cohorts (N=30-50), balance between privacy and utility | MEDIUM |
| 48 | Date generalization sufficiency (year_only vs relative_days) for Russia pilot study | LOW |
| 49 | Small cohort re-identification risk with ISI scores as quasi-identifiers | HIGH |
| 50 | Differential privacy noise budget (epsilon) for clinical outcome data (not implemented due to data utility concerns) | LOW |

---

## Phase 0: Pre-Production

### 0.1 Technical Stabilization

- [x] Complete UserRepository integration
- [x] Complete SleepDiaryRepository integration
- [x] Complete AssessmentRepository integration
- [x] Complete TherapySessionRepository integration
- [x] Add GamificationRepository persistence
- [x] Implement automated backup system
- [x] Set up monitoring and alerting (Sentry/similar)
- [x] Conduct security audit (especially for PHI data) - See SECURITY_AUDIT.md

### 0.2 Data Protection Layer

- [x] Activate EncryptionService for PHI fields (requires ENCRYPTION_MASTER_KEY in .env) - PHIEncryptionManager integrated into repositories
- [x] Implement audit logging for all data operations (AuditService)
- [x] Create data export mechanism (GDPR Article 20) - UserRepository.exportUserData()
- [x] Implement "right to be forgotten" (hard delete with audit) - UserRepository.anonymizeUser()
- [x] Create PHI data migration script (plaintext → encrypted) - PHIDataMigration service + CLI tool

### 0.3 Compliance Documentation

- [x] Prepare Privacy Policy (GDPR/152-FZ compliant) - docs/PRIVACY_POLICY.md created with bilingual EN/RU support
- [x] Write Terms of Service with medical disclaimer - docs/TERMS_OF_SERVICE.md created with bilingual EN/RU support
- [x] Create Informed Consent form for clinical study - docs/INFORMED_CONSENT_FORM.md (ICH E6(R3) + 21 CFR 50 + 152-FZ compliant)
- [x] Prepare documentation for IRB/Ethics Committee - Complete package in docs/ethics/:
  - STUDY_PROTOCOL.md (SPIRIT 2025 compliant clinical trial protocol)
  - INVESTIGATORS_BROCHURE.md (MDCG 2024-5 compliant)
  - ADVERSE_EVENT_PLAN.md (ICH E6(R3) + CIOMS compliant)
  - ETHICS_SUBMISSION_CHECKLIST.md (Russia Ethics Council + IRB requirements)

---

## Phase 1: Pilot Testing

### 1.1 Pilot Design

**Goal**: Usability, feasibility, preliminary efficacy signals

| Parameter | Value |
|-----------|-------|
| Type | Single-arm feasibility study |
| N | 30-50 participants |
| Duration | 8 weeks + 4 weeks follow-up |
| Population | Adults 18-65 with ISI ≥ 10 |
| Exclusion | Suicidality, bipolar, schizophrenia, untreated sleep apnea |

### 1.2 Outcome Measures

| Measure | Type | Timing |
|---------|------|--------|
| ISI (primary) | Efficacy | Baseline, W2, W4, W8, W12 |
| Sleep Diary | Process | Daily |
| System Usability Scale (SUS) | Usability | W4, W8 |
| Completion rate | Engagement | Continuous |
| Adverse events | Safety | Continuous |

### 1.3 Technical Requirements

- [x] Implement proper consent flow in /start - ICH E6(R3) + 152-FZ compliant, Key Information summary, audit trail
- [x] Add ISI automatic survey every 2 weeks - ISISchedulingService with cron job (W0, W2, W4, W6, W8, W12)
- [x] Create admin dashboard for monitoring - AdminDashboardService + /admin command (ICH E6(R3), 21 CFR Part 11 audit trail, HIPAA RBAC)
- [x] Implement adverse event reporting - AdverseEventService + /aereport command (ICH E6(R3), ICH E2A/E2B, CIOMS Form I, Roszdravnadzor Order 200n, DTx-specific "digitalovigilance")
- [x] Set up anonymized data export - AnonymizedDataExportService.ts (GDPR Art. 89, HIPAA Safe Harbor 18 identifiers, 152-FZ depersonalization, ICMJE data sharing, k-anonymity validation, CSV/JSON/NDJSON formats, audit trail)
- [x] Integrate crisis detection - CrisisDetectionService.ts wrapping CogniCore Engine's CrisisDetector (3-layer detection: keywords, patterns, state-based; bilingual RU/EN crisis resources; C-SSRS inspired severity levels; automatic session interruption for high/critical severity; ICH E6(R3) real-time safety monitoring)
- [x] Implement escalation protocol - CrisisEscalationService.ts (SAMHSA 2025 Guidelines compliant; admin Telegram notifications for HIGH/CRITICAL; auto-AE creation for CRITICAL; Stanley-Brown Safety Planning 6-step flow; bilingual RU/EN messages; configurable escalation timeout; Safety Plan keyboard in crisis response; 38 unit tests)

### 1.4 Recruitment

- [ ] Identify Telegram channels about sleep
- [ ] Partner with universities
- [ ] Partner with clinics
- [ ] Create online screening (ISI + exclusion criteria)
- [ ] Define incentives (free access + RCT participation)

### 1.5 Pilot Status

| Task | Status | Notes |
|------|--------|-------|
| Protocol design | COMPLETE | docs/ethics/STUDY_PROTOCOL.md |
| Ethics approval | NOT STARTED | Checklist ready |
| Recruitment materials | NOT STARTED | |
| Technical implementation | COMPLETE | All Phase 1.3 requirements implemented: consent flow, ISI scheduling, admin dashboard, AE reporting, anonymized data export, crisis detection, escalation protocol |
| Data collection | NOT STARTED | |
| Analysis | NOT STARTED | |

---

## Phase 2: Randomized Controlled Trial

### 2.1 RCT Design

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Type | 2-arm parallel RCT | Standard for dCBT-I |
| N | 150 (75+75) | Power 80%, α=0.05, d=0.5 |
| Control | Sleep Hygiene Education (active) | JMIR 2025 standard |
| Blinding | Participant-blind-to-hypothesis | DTx standard |
| Primary Outcome | ISI change at 8 weeks | FDA standard |
| Secondary | SE, SOL, WASO, PHQ-9, GAD-7 | Clinical relevance |
| Follow-up | 6 months | SleepioRx precedent |

### 2.2 Power Calculation

```
Effect size (d) = 0.5 (conservative based on meta-analysis)
Alpha = 0.05 (two-tailed)
Power = 0.80
Attrition = 25% (mental health app standard)
N per arm = 60 → N total = 120 + 25% = 150
```

### 2.3 Regulatory Preparation

- [ ] Submit application to Ethics Committee / IRB
- [ ] Register protocol on ClinicalTrials.gov
- [ ] Prepare CONSORT diagram template
- [ ] Contract with independent statistician

### 2.4 Technical Requirements

- [ ] Implement randomization module (stratified by ISI severity)
- [ ] Create Control arm (Sleep Hygiene Education bot)
- [ ] Automated outcome collection with reminders
- [ ] Unblinded monitoring dashboard for safety
- [ ] Data export in CDISC/SDTM format (for FDA)

### 2.5 RCT Status

| Task | Status | Notes |
|------|--------|-------|
| Protocol finalization | NOT STARTED | |
| IRB/Ethics approval | NOT STARTED | |
| ClinicalTrials.gov registration | NOT STARTED | |
| Control arm development | NOT STARTED | |
| Randomization system | NOT STARTED | |
| Recruitment | NOT STARTED | |
| Data collection | NOT STARTED | |
| Analysis | NOT STARTED | |
| Publication | NOT STARTED | |

---

## Phase 3: Regulatory Strategy

### 3.1 Russia (Priority)

| Step | Action | Status | Notes |
|------|--------|--------|-------|
| 1 | Determine risk class (likely IIa) | NOT STARTED | |
| 2 | Prepare Technical File per Order 181n | NOT STARTED | |
| 3 | Cybersecurity documentation | NOT STARTED | |
| 4 | Clinical trials (if required) | PHASE 2 | |
| 5 | Submit application to Roszdravnadzor | NOT STARTED | After RCT |
| 6 | Consult with regulatory expert | NOT STARTED | Q3 2026 target |

### 3.2 EAEU (Secondary)

| Step | Action | Status | Notes |
|------|--------|--------|-------|
| 1 | Monitor EAEU 2026 transition | NOT STARTED | |
| 2 | Adapt documentation for EAEU | NOT STARTED | |
| 3 | Submit EAEU application | NOT STARTED | After Russia |

### 3.3 EU (Long-term)

| Step | Action | Status | Notes |
|------|--------|--------|-------|
| 1 | EU AI Act compliance assessment | NOT STARTED | Deadline Aug 2026 |
| 2 | CE marking preparation | NOT STARTED | |
| 3 | High-risk AI documentation | NOT STARTED | |
| 4 | Notified Body engagement | NOT STARTED | |

### 3.4 FDA (Optional)

| Step | Action | Status | Notes |
|------|--------|--------|-------|
| 1 | Pre-submission meeting | NOT STARTED | |
| 2 | De Novo pathway assessment | NOT STARTED | |
| 3 | US-based RCT or bridging study | NOT STARTED | |
| 4 | FDA submission | NOT STARTED | Budget: $500K-2M |

---

## Phase 4: Product Development

### 4.1 Critical Improvements

| Component | Description | Priority | Status |
|-----------|-------------|----------|--------|
| Mobile App | Native iOS/Android | HIGH | NOT STARTED |
| Wearable Integration | Terra API (Oura/Fitbit/Apple Watch) | HIGH | NOT STARTED |
| Push Notifications | Reminders outside Telegram | HIGH | NOT STARTED |
| Offline Mode | Diary entry without internet | MEDIUM | NOT STARTED |

### 4.2 Gamification Enhancement

- [ ] A/B testing different mechanics
- [ ] Analytics for engagement prediction
- [ ] Personalized rewards by profile
- [ ] Leaderboards (optional, privacy-aware)

### 4.3 AI/LLM Integration

**IMPORTANT**: LLM chatbots should be supplementary, not core treatment

| Use Case | Allowed | Status |
|----------|---------|--------|
| Psychoeducation delivery | ✅ YES | NOT STARTED |
| Empathetic responses | ✅ YES | NOT STARTED |
| Sleep diary interpretation | ⚠️ With supervision | NOT STARTED |
| Clinical decisions | ❌ NO | N/A |

### 4.4 Technical Debt

- [ ] Migrate to PostgreSQL when scale requires
- [ ] Implement comprehensive error handling
- [ ] Add integration tests for all flows
- [ ] Performance optimization for mobile

---

## Phase 5: Scaling & Monetization

### 5.1 Business Model

**Recommended**: Freemium + B2B

| Tier | Features | Price |
|------|----------|-------|
| Free | Basic diary, Week 1 CBT-I, limited relaxation | $0 |
| Premium | Full 8-week program, all relaxation, progress | $7.99/month or $49.99/year |
| Clinical | RCT-validated, prescriber dashboard, analytics | B2B licensing |

### 5.2 Expected Metrics (Conservative)

| Metric | Target |
|--------|--------|
| Free → Premium conversion | 3-5% |
| Annual revenue per premium user | ~$50 |
| D30 retention | 8-10% (2-3x industry via gamification) |

### 5.3 B2B Channels

- [ ] Telemedicine platforms
- [ ] Corporate wellness programs
- [ ] Insurance companies
- [ ] Sleep clinics / Somnologists

### 5.4 Marketing Strategy

- [ ] Content marketing (sleep, insomnia)
- [ ] Partnerships with somnologists / psychotherapists
- [ ] Academic publications (RCT results)
- [ ] Health-focused Telegram channels

### 5.5 Monetization Status

| Task | Status | Notes |
|------|--------|-------|
| Payment integration | NOT STARTED | |
| Subscription management | NOT STARTED | |
| B2B pricing model | NOT STARTED | |
| Sales materials | NOT STARTED | |

---

## Phase 6: Continuous Improvement

### 6.1 Real-World Evidence (RWE)

- [ ] Implement anonymized outcome tracking
- [ ] Quarterly efficacy reports
- [ ] Adverse event monitoring system
- [ ] User feedback loop

### 6.2 Algorithm Optimization

- [ ] POMDP parameter tuning based on RWE
- [ ] A/B testing intervention sequences
- [ ] Personalization model refinement

### 6.3 Content Updates

- [ ] Quarterly relaxation technique additions
- [ ] Seasonal content (winter insomnia, etc.)
- [ ] Cultural adaptations for new markets

---

## Timeline Overview

```
PHASE 0: Pre-Production ──────────┐
                                  │
PHASE 1: Pilot (N=30-50) ─────────┤
                                  │
PHASE 2: RCT (N=150) ─────────────┤
                                  │
PHASE 3: Regulatory ──────────────┤ ← Parallel with PHASE 2-4
                                  │
PHASE 4: Product ─────────────────┤ ← Parallel with PHASE 2-3
                                  │
PHASE 5: Scaling ─────────────────┤
                                  │
PHASE 6: Continuous ──────────────┘ ← Ongoing
```

---

## Sources

### Clinical Evidence
- [npj Digital Medicine 2025 - Meta-analysis](https://www.nature.com/articles/s41746-025-01514-4)
- [JMIR Mental Health 2025 - SleepioRx RCT](https://mental.jmir.org/2025/1/e84323)
- [JMIR 2025 - WELT-I DCT](https://www.jmir.org/2025/1/e70722)
- [NEJM AI - Therabot RCT](https://ai.nejm.org/doi/full/10.1056/AIoa2400802)
- [Dartmouth - First AI Therapy Trial](https://home.dartmouth.edu/news/2025/03/first-therapy-chatbot-trial-yields-mental-health-benefits)
- [BMC - ISI MCID](https://bmcmedresmethodol.biomedcentral.com/articles/10.1186/s12874-024-02297-0)
- [PMC - AI Chatbot Evolution](https://pmc.ncbi.nlm.nih.gov/articles/PMC12434366/)

### Regulatory
- [UCEC Quality - Russia Order 181n](https://certru.ru/en/what-are-the-new-russian-medical-device-regulation-changes-from-september-1-2025/)
- [Schmidt Export - Russia Medical Devices](https://schmidt-export.com/news/new-rules-registration-medical-devices-starting-march-1-2025-russia)
- [EU AI Act](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)

### Technical
- [Terra API Documentation](https://docs.tryterra.co)

### Market
- [Dataintelo - Sleep App Market](https://dataintelo.com/report/sleep-tracking-app-market)
- [Adapty - Freemium Monetization](https://adapty.io/blog/freemium-app-monetization-strategies/)

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-08 | 1.0 | Initial plan created based on deep research |
| 2026-01-08 | 1.1 | Security audit completed, SECURITY_AUDIT.md created |
| 2026-01-08 | 1.2 | PHI field encryption activated via PHIEncryptionManager |
| 2026-01-08 | 1.3 | TherapySessionRepository encryption integrated |
| 2026-01-08 | 1.4 | PHI data migration script created (PHIDataMigration + CLI) |
| 2026-01-08 | 1.5 | Privacy Policy created (GDPR + 152-FZ + HIPAA) - docs/PRIVACY_POLICY.md |
| 2026-01-08 | 1.6 | Terms of Service with medical disclaimer created - docs/TERMS_OF_SERVICE.md |
| 2026-01-08 | 1.7 | Informed Consent Form created (ICH E6(R3) compliant) - docs/INFORMED_CONSENT_FORM.md |
| 2026-01-08 | 1.8 | IRB/Ethics Committee documentation package completed - docs/ethics/ (SPIRIT 2025 protocol, IB, AE plan, checklist) |
| 2026-01-08 | 1.9 | Consent flow implemented in StartCommand.ts (ICH E6(R3), 21 CFR Part 11, 152-FZ compliant) |
| 2026-01-08 | 1.10 | ISI biweekly scheduling service created - src/bot/services/ISISchedulingService.ts |
| 2026-01-08 | 1.11 | Admin dashboard implemented - AdminDashboardService.ts + AdminCommand.ts (ICH E6(R3) centralized monitoring, 21 CFR Part 11 audit trail, HIPAA RBAC) |
| 2026-01-08 | 1.12 | Adverse event reporting implemented - AdverseEventService.ts + AEReportCommand.ts (ICH E6(R3), ICH E2A/E2B 15/7 day deadlines, CIOMS Form I, Roszdravnadzor Order 200n, DTx-specific categories, auto-ISI-deterioration detection, safety alerts) |
| 2026-01-09 | 1.13 | Anonymized data export implemented - AnonymizedDataExportService.ts + AdminCommand.ts integration (GDPR Art. 89, HIPAA Safe Harbor 18 identifiers, 152-FZ depersonalization, EMA Policy 0070, ICMJE data sharing statement, k-anonymity validation, CSV/JSON/NDJSON formats, 21 CFR Part 11 audit trail) |
| 2026-01-10 | 1.14 | Crisis detection integrated - CrisisDetectionService.ts wrapping CogniCore Engine CrisisDetector (3-layer detection, bilingual RU/EN, C-SSRS severity levels, automatic session interruption, ICH E6(R3) real-time safety monitoring, 31 unit tests) |
| 2026-01-10 | 1.15 | Escalation protocol implemented - CrisisEscalationService.ts (SAMHSA 2025 Guidelines, admin Telegram notifications, auto-AE for CRITICAL, Stanley-Brown Safety Planning, bilingual RU/EN, Safety Plan keyboard, CommandHandler integration, 38 unit tests) |
| 2026-01-10 | 1.16 | PLRNN-based sleep prediction integrated - SleepPredictionService.ts (npj Digital Medicine 2025 research: PLRNN outperforms linear models for EMA prediction; 5D state vector mapping: SE, SOL, WASO, TST, Quality; early warning signals for sleep deterioration; hybrid prediction with Kalman for short-term; causal network extraction; intervention simulation; online learning; bilingual RU/EN warnings and recommendations; 40 unit tests) |
| 2026-01-10 | 1.17 | Adaptive Sleep Restriction personalization - AdaptiveSleepRestrictionService.ts (PLRNN-enhanced TIB adjustment with confidence-aware decisions; Sleep Need Questionnaire with MEQ-equivalent chronotype scoring; JITAI adaptive scheduling with tailoring variables; personalized initial prescription based on sleep profile; short/long sleeper classification; social jet lag estimation; optimal reminder timing; bilingual RU/EN; 35 unit tests) |
| 2026-01-10 | 1.18 | Roszdravnadzor integration prepared - RoszdravnadzorAPIService.ts (Order 181n + Order 4472 compliance; automatic data transmission to АИС Росздравнадзора; version change notifications per PP RF 1684; cybersecurity incident reporting; error metrics tracking per 4 categories; GOST R 56939-2024 secure development; GOST IEC 62304-2022 lifecycle; CYBERSECURITY_RU.md documentation; VERSIONING_PROCEDURES_RU.md with change categories; 45 unit tests) |

---

## Notes

*This document should be regularly updated as tasks are completed and new information becomes available. Use the checkboxes to track progress on individual tasks.*
