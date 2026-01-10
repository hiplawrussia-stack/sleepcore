# Clinical Study Protocol
# Протокол клинического исследования

## SleepCore: Digital Cognitive Behavioral Therapy for Insomnia (dCBT-I)
## Pilot Feasibility Study / Пилотное исследование осуществимости

---

> **Protocol ID**: SC-PILOT-2026-001
> **Version**: 1.0
> **Date**: 2026-01-08
> **Status**: Draft for Ethics Review
> **Sponsor**: [COMPANY NAME]
> **IND/IDE Status**: Not applicable (non-pharmacological digital intervention)

---

## PROTOCOL SYNOPSIS / КРАТКОЕ ИЗЛОЖЕНИЕ ПРОТОКОЛА

| Item | Description |
|------|-------------|
| **Title** | Pilot Study of SleepCore: A Digital Cognitive Behavioral Therapy for Insomnia (dCBT-I) Application for Adults with Chronic Insomnia |
| **Short Title** | SleepCore Pilot Study |
| **Protocol ID** | SC-PILOT-2026-001 |
| **Phase** | Pilot / Feasibility |
| **Study Design** | Single-arm, open-label feasibility study |
| **Population** | Adults (18-65) with chronic insomnia (ISI ≥ 10) |
| **Sample Size** | N = 30-50 participants |
| **Duration** | 8 weeks treatment + 4 weeks follow-up |
| **Primary Endpoint** | Change in ISI score from baseline to Week 8 |
| **Secondary Endpoints** | Sleep efficiency, SUS score, completion rate, adverse events |
| **Intervention** | SleepCore digital CBT-I delivered via Telegram bot |
| **Sites** | Remote/decentralized (Russia) |

---

## TABLE OF CONTENTS

1. [Background and Rationale](#1-background-and-rationale)
2. [Objectives](#2-objectives)
3. [Study Design](#3-study-design)
4. [Study Population](#4-study-population)
5. [Intervention](#5-intervention)
6. [Study Procedures](#6-study-procedures)
7. [Outcome Measures](#7-outcome-measures)
8. [Statistical Considerations](#8-statistical-considerations)
9. [Safety Monitoring](#9-safety-monitoring)
10. [Data Management](#10-data-management)
11. [Ethical Considerations](#11-ethical-considerations)
12. [Quality Assurance](#12-quality-assurance)
13. [Publication Policy](#13-publication-policy)
14. [References](#14-references)
15. [Appendices](#15-appendices)

---

## 1. BACKGROUND AND RATIONALE

### 1.1 Chronic Insomnia Disorder

Chronic insomnia disorder is characterized by difficulty initiating or maintaining sleep, or early morning awakening, occurring at least 3 nights per week for at least 3 months, causing significant distress or impairment in functioning. Prevalence estimates range from 6-10% of the adult population meeting full diagnostic criteria.

### 1.2 Cognitive Behavioral Therapy for Insomnia (CBT-I)

CBT-I is recommended as the first-line treatment for chronic insomnia by:
- American Academy of Sleep Medicine (AASM)
- European Sleep Research Society (ESRS)
- American College of Physicians (ACP)

CBT-I comprises five core components:
1. **Sleep Restriction Therapy (SRT)** - Limiting time in bed to match actual sleep
2. **Stimulus Control Therapy (SCT)** - Strengthening bed-sleep association
3. **Cognitive Restructuring** - Addressing dysfunctional beliefs about sleep
4. **Sleep Hygiene Education** - Environmental and behavioral recommendations
5. **Relaxation Training** - Techniques for reducing arousal

### 1.3 Digital CBT-I (dCBT-I)

Meta-analyses demonstrate that digital CBT-I (dCBT-I) is effective:
- SMD = -0.71 for fully automated dCBT-I (npj Digital Medicine, 2025)
- Response rates of 50-70% in RCTs
- Effects maintained at 6-12 month follow-up

### 1.4 Rationale for This Study

SleepCore is a novel dCBT-I application delivered via Telegram bot, incorporating:
- AI-based personalization (POMDP algorithms)
- Russian language support
- Gamification elements
- Evidence-based 5-component CBT-I

This pilot study will:
1. Assess feasibility of recruitment and retention
2. Evaluate preliminary efficacy signals
3. Identify usability issues for refinement
4. Generate data for power calculation for subsequent RCT

---

## 2. OBJECTIVES

### 2.1 Primary Objective

To evaluate the feasibility and preliminary efficacy of SleepCore dCBT-I in adults with chronic insomnia, as measured by change in Insomnia Severity Index (ISI) score from baseline to Week 8.

### 2.2 Secondary Objectives

| Objective | Measure |
|-----------|---------|
| Assess treatment completion | Proportion completing ≥6/8 weeks |
| Evaluate engagement | Daily diary completion rate |
| Measure usability | System Usability Scale (SUS) |
| Monitor safety | Adverse event incidence |
| Assess sleep efficiency | SE calculated from sleep diary |
| Evaluate depression/anxiety | PHQ-9, GAD-7 scores |

### 2.3 Exploratory Objectives

- Identify predictors of treatment response
- Assess relationship between engagement and outcomes
- Evaluate AI personalization effectiveness
- Gather qualitative feedback for app improvement

---

## 3. STUDY DESIGN

### 3.1 Design Overview

This is a **single-arm, open-label pilot feasibility study** of SleepCore dCBT-I in adults with chronic insomnia.

```
SCREENING → BASELINE → TREATMENT (8 weeks) → FOLLOW-UP (4 weeks) → END
   │           │              │                    │
 Day -7      Day 0        Weeks 1-8            Weeks 9-12
```

### 3.2 Justification for Single-Arm Design

A single-arm design is appropriate for this pilot study because:
1. Primary goal is feasibility assessment, not efficacy comparison
2. CBT-I has established efficacy; placebo comparison not required for pilot
3. Enables rapid iteration and refinement
4. Generates preliminary data for RCT power calculation

### 3.3 Study Duration

| Period | Duration |
|--------|----------|
| Enrollment | 4-8 weeks |
| Treatment per participant | 8 weeks |
| Follow-up per participant | 4 weeks |
| Total per participant | 12 weeks |
| Total study duration | ~6 months |

### 3.4 Decentralized Trial Design

This study utilizes a decentralized clinical trial (DCT) design:
- Remote enrollment via Telegram bot
- Electronic informed consent (eConsent)
- All assessments completed digitally
- No in-person visits required
- Enables nationwide recruitment in Russia

---

## 4. STUDY POPULATION

### 4.1 Target Population

Adults aged 18-65 years with chronic insomnia disorder residing in Russia.

### 4.2 Inclusion Criteria

| # | Criterion |
|---|-----------|
| 1 | Age 18-65 years |
| 2 | ISI score ≥ 10 (clinical insomnia) |
| 3 | Insomnia symptoms present ≥ 3 nights/week for ≥ 3 months |
| 4 | Access to smartphone with Telegram app |
| 5 | Ability to read and understand Russian |
| 6 | Willing and able to provide informed consent |
| 7 | Willing to complete daily sleep diary for 12 weeks |

### 4.3 Exclusion Criteria

| # | Criterion | Rationale |
|---|-----------|-----------|
| 1 | Untreated sleep apnea (known or suspected) | Requires medical treatment |
| 2 | Shift work or irregular schedule | Incompatible with sleep restriction |
| 3 | Bipolar disorder | Sleep restriction may trigger mania |
| 4 | Active suicidal ideation (PHQ-9 item 9 ≥ 2) | Requires immediate mental health care |
| 5 | Uncontrolled epilepsy | Sleep deprivation may increase seizure risk |
| 6 | Pregnancy or breastfeeding | Insufficient safety data |
| 7 | Current use of sedative-hypnotics (unless stable ≥ 4 weeks) | May confound results |
| 8 | Previous completion of structured CBT-I program | Prior exposure may affect response |
| 9 | Current participation in another clinical trial | Avoid confounding |
| 10 | Psychotic disorder or dementia | Cognitive requirements for CBT-I |

### 4.4 Withdrawal Criteria

Participants may be withdrawn if:
- They withdraw consent
- They develop an exclusion criterion during the study
- They experience a serious adverse event requiring discontinuation
- They fail to complete any sleep diary entries for 14 consecutive days
- The investigator determines continued participation is not in their best interest

### 4.5 Sample Size Justification

**Target**: N = 30-50 participants

**Rationale**:
- Pilot studies typically require 30-50 participants to estimate variance
- Allows detection of effect size d ≥ 0.5 with 80% power (one-sample t-test)
- Sufficient to estimate completion rate with ±15% precision
- Feasible recruitment within study timeline

---

## 5. INTERVENTION

### 5.1 SleepCore dCBT-I Application

SleepCore is a digital therapeutic application delivering CBT-I via Telegram bot interface.

### 5.2 Treatment Components

| Week | Primary Component | Secondary Components |
|------|-------------------|---------------------|
| 1 | Sleep education, diary introduction | Baseline assessment |
| 2 | Sleep restriction therapy initiation | Sleep hygiene |
| 3 | Stimulus control therapy | Cognitive introduction |
| 4 | Cognitive restructuring | Relaxation techniques |
| 5 | Cognitive restructuring continued | Advanced relaxation |
| 6 | Sleep scheduling optimization | Relapse prevention intro |
| 7 | Integration and maintenance | Problem-solving |
| 8 | Relapse prevention, graduation | Final assessment |

### 5.3 Daily Activities

| Activity | Frequency | Estimated Time |
|----------|-----------|----------------|
| Morning sleep diary entry | Daily | 2-3 minutes |
| CBT-I session content | 2-3x/week | 10-15 minutes |
| Relaxation exercise | As recommended | 10-20 minutes |
| Progress review | Weekly | 5 minutes |

### 5.4 AI-Based Personalization

SleepCore utilizes POMDP (Partially Observable Markov Decision Process) algorithms to:
- Calculate personalized sleep windows
- Select optimal intervention sequencing
- Adapt recommendations based on diary data
- Predict and prevent relapse

### 5.5 Treatment Modifications

Sleep window adjustments:
- Initial window: Based on average total sleep time from baseline diary
- Minimum window: 5.0 hours (safety floor)
- Adjustment: +15-30 minutes if sleep efficiency ≥ 85% for 5 consecutive days
- Maximum window: 8.5 hours

---

## 6. STUDY PROCEDURES

### 6.1 Schedule of Assessments

| Assessment | Screening | Baseline | W2 | W4 | W6 | W8 | W12 |
|------------|:---------:|:--------:|:--:|:--:|:--:|:--:|:---:|
| Informed Consent | X | | | | | | |
| Demographics | | X | | | | | |
| ISI | X | X | X | X | X | X | X |
| Sleep Diary | | Daily throughout → → → → → | |
| PHQ-9 | | X | | X | | X | X |
| GAD-7 | | X | | X | | X | X |
| SUS | | | | X | | X | |
| Adverse Events | | Continuous throughout → → → | |
| Feedback Survey | | | | | | X | X |

### 6.2 Screening Procedures

1. Potential participant initiates contact via Telegram /start command
2. Study information provided via bot
3. Participant reviews and signs eConsent
4. ISI questionnaire administered
5. Eligibility criteria verified
6. Eligible participants enrolled; ineligible participants provided with resources

### 6.3 Baseline Procedures

1. Demographic questionnaire
2. Medical history (self-reported)
3. Sleep history questionnaire
4. PHQ-9 and GAD-7 assessment
5. 7-day baseline sleep diary
6. Treatment initiation

### 6.4 Treatment Period Procedures

- Daily: Morning sleep diary completion (prompted by bot)
- 2-3x/week: CBT-I educational content and exercises
- Weekly: Automated progress summary and encouragement
- Bi-weekly: ISI assessment
- As needed: Relaxation exercises, cognitive worksheets

### 6.5 Follow-Up Procedures

- Weeks 9-12: Optional continued sleep diary
- Week 12: Final ISI, PHQ-9, GAD-7, SUS, feedback survey
- Participants offered continued access to app (without study monitoring)

---

## 7. OUTCOME MEASURES

### 7.1 Primary Outcome

**Insomnia Severity Index (ISI) change from baseline to Week 8**

| Property | Details |
|----------|---------|
| Instrument | ISI (Morin, 1993; Russian validation: Rasskazova, 2015) |
| Items | 7 items, 5-point Likert scale (0-4) |
| Score range | 0-28 |
| Clinical cutoffs | 0-7: No insomnia; 8-14: Subthreshold; 15-21: Moderate; 22-28: Severe |
| MCID | 6 points (within-person); 4 points (between-group) |
| Remission | ISI < 8 |
| Response | ISI reduction ≥ 8 points |

### 7.2 Secondary Outcomes

| Outcome | Measure | Timing |
|---------|---------|--------|
| **Sleep Efficiency** | TST/TIB × 100% from diary | Weekly average |
| **Sleep Onset Latency** | Self-reported minutes | Weekly average |
| **Wake After Sleep Onset** | Self-reported minutes | Weekly average |
| **Treatment Completion** | % completing ≥6 weeks | Week 8 |
| **Diary Adherence** | % days with diary entry | Continuous |
| **Usability** | System Usability Scale (SUS) | Week 4, 8 |
| **Depression** | PHQ-9 | Baseline, W4, W8, W12 |
| **Anxiety** | GAD-7 | Baseline, W4, W8, W12 |
| **Adverse Events** | Number, severity, relatedness | Continuous |

### 7.3 Exploratory Outcomes

- Treatment response predictors (baseline ISI, chronotype, age, comorbidities)
- Engagement metrics (sessions completed, time in app)
- Qualitative feedback themes
- Individual sleep parameter trajectories

---

## 8. STATISTICAL CONSIDERATIONS

### 8.1 Analysis Populations

| Population | Definition |
|------------|------------|
| **Intent-to-Treat (ITT)** | All enrolled participants who complete baseline |
| **Per-Protocol (PP)** | Participants completing ≥ 6/8 weeks of treatment |
| **Safety** | All participants who receive any treatment |

### 8.2 Primary Analysis

**Endpoint**: Change in ISI from baseline to Week 8

**Method**: Paired t-test (or Wilcoxon signed-rank if non-normal)

**Hypothesis**: Mean ISI reduction ≥ 6 points (MCID)

**Effect size**: Cohen's d with 95% CI

### 8.3 Secondary Analyses

| Outcome | Analysis Method |
|---------|-----------------|
| ISI response rate | Proportion with 95% CI |
| ISI remission rate | Proportion with 95% CI |
| Sleep efficiency change | Paired t-test |
| SUS score | Descriptive (mean, SD) |
| Completion rate | Proportion with 95% CI |
| Adverse events | Descriptive (counts, percentages) |

### 8.4 Missing Data

- Primary analysis: Last Observation Carried Forward (LOCF)
- Sensitivity analysis: Multiple imputation
- Completion rate includes participants who discontinue as non-completers

### 8.5 Interim Analyses

No formal interim analyses planned. Safety monitoring will be continuous.

---

## 9. SAFETY MONITORING

### 9.1 Adverse Events

#### 9.1.1 Definitions

| Term | Definition |
|------|------------|
| **Adverse Event (AE)** | Any untoward medical occurrence during study participation |
| **Serious Adverse Event (SAE)** | AE resulting in death, hospitalization, disability, or life-threatening condition |
| **Unexpected AE** | AE not listed in protocol or consent as expected |

#### 9.1.2 Expected Adverse Events

Based on CBT-I literature:
- Increased daytime sleepiness (common, first 1-2 weeks)
- Fatigue (common, first 1-2 weeks)
- Irritability (occasional)
- Difficulty concentrating (occasional)
- Temporary worsening of insomnia (rare)

#### 9.1.3 Monitoring Procedures

| Event Type | Reporting Timeline | Reporting To |
|------------|-------------------|--------------|
| Non-serious AE | Within 7 days | Study database |
| SAE | Within 24 hours | PI, Ethics Committee, Sponsor |
| SUSAR | Within 7 days (fatal/life-threatening) or 15 days (other) | Regulatory authority |

### 9.2 Safety Review

- PI reviews all AE reports weekly
- SAEs trigger immediate review and action
- Study may be paused if safety signal detected

### 9.3 Stopping Rules

Study will be paused for safety review if:
- ≥ 2 SAEs potentially related to intervention
- ≥ 10% of participants report severe AEs
- Any participant reports suicidal ideation (PHQ-9 item 9 ≥ 2) during treatment

### 9.4 Data Safety Monitoring

Given the low-risk nature of this pilot study and established safety profile of CBT-I, a formal Data Safety Monitoring Board (DSMB) is not required. The PI will serve as the safety monitor with independent medical consultant available if needed.

---

## 10. DATA MANAGEMENT

### 10.1 Data Collection

| Data Type | Collection Method | Storage |
|-----------|-------------------|---------|
| eConsent | Telegram bot | Encrypted database |
| Questionnaires | Telegram bot | Encrypted database |
| Sleep diary | Telegram bot | Encrypted database |
| Adverse events | Telegram bot + manual review | Encrypted database |

### 10.2 Data Security

| Measure | Implementation |
|---------|----------------|
| Encryption at rest | AES-256-GCM |
| Encryption in transit | TLS 1.3 |
| Access control | Role-based, principle of least privilege |
| Audit logging | All data access logged |
| Backup | Daily encrypted backups, GFS retention |
| Pseudonymization | Study IDs used; PII stored separately |

### 10.3 Data Retention

- Identifiable data: 6 years after study completion
- Anonymized data: Retained indefinitely for research
- Consent forms: 6 years after study completion

### 10.4 Data Localization (Russia)

Per Federal Law 152-FZ, personal data of Russian citizens is stored on servers located in the Russian Federation.

---

## 11. ETHICAL CONSIDERATIONS

### 11.1 Regulatory Compliance

This study will be conducted in accordance with:
- Declaration of Helsinki (2013)
- ICH E6(R3) Good Clinical Practice (2025)
- Federal Law No. 61-FZ (Russia)
- Federal Law No. 152-FZ on Personal Data (Russia)
- GDPR (if EU participants enrolled)

### 11.2 Ethics Committee Approval

Study will not begin until approval is obtained from:
- [Ethics Committee Name] (Russia)
- Local institutional ethics committees (if required by sites)

### 11.3 Informed Consent

See separate document: `INFORMED_CONSENT_FORM.md`

Key elements:
- Voluntary participation
- Right to withdraw at any time
- Description of risks and benefits
- Confidentiality protections
- Contact information for questions

### 11.4 Privacy and Confidentiality

See separate document: `PRIVACY_POLICY.md`

### 11.5 Participant Compensation

Participants will receive compensation for completing assessments:
- [AMOUNT] for baseline completion
- [AMOUNT] for Week 4 assessment
- [AMOUNT] for Week 8 assessment
- [AMOUNT] for Week 12 follow-up

### 11.6 Insurance

Participants are covered by clinical trial insurance per Russian regulatory requirements.

---

## 12. QUALITY ASSURANCE

### 12.1 Training

All study personnel will complete:
- GCP training (within 3 years)
- Protocol-specific training
- SleepCore application training

### 12.2 Monitoring

- Remote monitoring via electronic data review
- Source data verification for 10% of participants
- Protocol deviation tracking and reporting

### 12.3 Protocol Deviations

| Category | Definition | Action |
|----------|------------|--------|
| Minor | Does not affect safety or data integrity | Document and report at next review |
| Major | May affect safety or data integrity | Report within 5 business days |
| Serious | Affects participant safety | Report within 24 hours |

---

## 13. PUBLICATION POLICY

### 13.1 Trial Registration

This study will be registered on ClinicalTrials.gov prior to enrollment of the first participant.

### 13.2 Results Dissemination

- Primary results to be submitted for peer-reviewed publication within 12 months of study completion
- Results summary to be posted on ClinicalTrials.gov within 12 months
- Participants to receive lay summary of results

### 13.3 Authorship

Authorship will follow ICMJE guidelines. All contributors meeting authorship criteria will be included.

---

## 14. REFERENCES

1. Morin CM, et al. The Insomnia Severity Index: psychometric indicators to detect insomnia cases and evaluate treatment response. Sleep. 2011;34(5):601-608.

2. Qaseem A, et al. Management of Chronic Insomnia Disorder in Adults: A Clinical Practice Guideline From the American College of Physicians. Ann Intern Med. 2016;165(2):125-133.

3. Riemann D, et al. European guideline for the diagnosis and treatment of insomnia. J Sleep Res. 2017;26(6):675-700.

4. [Additional references to be added]

---

## 15. APPENDICES

### Appendix A: SPIRIT 2025 Checklist
[See separate document]

### Appendix B: Insomnia Severity Index (ISI)
[See separate document]

### Appendix C: PHQ-9
[See separate document]

### Appendix D: GAD-7
[See separate document]

### Appendix E: System Usability Scale (SUS)
[See separate document]

### Appendix F: Sleep Diary Template
[See separate document]

### Appendix G: Informed Consent Form
[See separate document: INFORMED_CONSENT_FORM.md]

### Appendix H: Investigator's Brochure
[See separate document: INVESTIGATORS_BROCHURE.md]

---

## PROTOCOL APPROVAL SIGNATURES

### Sponsor Representative

```
_____________________________________________    _______________
Name / ФИО                                       Date / Дата

_____________________________________________
Signature / Подпись

Title: _______________________________________
```

### Principal Investigator

```
_____________________________________________    _______________
Name / ФИО                                       Date / Дата

_____________________________________________
Signature / Подпись

Institution: _________________________________
```

---

## AMENDMENT HISTORY

| Version | Date | Description of Changes |
|---------|------|------------------------|
| 1.0 | 2026-01-08 | Initial version |

---

*Protocol prepared in accordance with SPIRIT 2025 guidelines and ICH E6(R3) Good Clinical Practice.*
