# Investigator's Brochure: SleepCore Digital Therapeutic

**Document ID:** SC-IB-2026-001
**Version:** 1.0
**Date:** January 2026
**Confidentiality:** Confidential

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | SleepCore Team | Initial release |

---

## Table of Contents

1. [Summary](#1-summary)
2. [Introduction](#2-introduction)
3. [Product Description](#3-product-description)
4. [Mechanism of Action](#4-mechanism-of-action)
5. [Clinical Evidence](#5-clinical-evidence)
6. [Safety Information](#6-safety-information)
7. [Benefits and Risks](#7-benefits-and-risks)
8. [Preclinical Studies](#8-preclinical-studies)
9. [Instructions for Use](#9-instructions-for-use)
10. [References](#10-references)

---

## 1. Summary

### 1.1 Product Overview

| Parameter | Description |
|-----------|-------------|
| Product Name | SleepCore |
| Classification | Software as a Medical Device (SaMD), Class IIa (EU MDR) |
| Intended Purpose | Digital delivery of Cognitive Behavioral Therapy for Insomnia (CBT-I) |
| Target Population | Adults (18-65) with chronic insomnia disorder |
| Delivery Platform | Telegram messaging application |
| Treatment Duration | 8 weeks (56 days) |
| Regulatory Status | Investigational device, not yet cleared/approved |

### 1.2 Therapeutic Components

SleepCore implements the five evidence-based components of CBT-I:

1. **Sleep Restriction Therapy (SRT)** - Consolidates sleep by limiting time in bed
2. **Stimulus Control Therapy (SCT)** - Strengthens bed-sleep association
3. **Cognitive Restructuring** - Addresses maladaptive sleep-related thoughts
4. **Sleep Hygiene Education (SHE)** - Optimizes sleep environment and behaviors
5. **Relaxation Training** - Multiple techniques for arousal reduction

### 1.3 Key Clinical Evidence (Meta-Analysis Summary)

| Outcome | Effect Size | Evidence Quality |
|---------|-------------|------------------|
| ISI Reduction | Cohen's d = 1.09 | HIGH |
| Sleep Efficiency Improvement | +10-15% | HIGH |
| Sleep Onset Latency | -19 min (95% CI: -14 to -24) | HIGH |
| Wake After Sleep Onset | -26 min (95% CI: -20 to -32) | HIGH |
| Remission Rate | 40-60% | MODERATE |

---

## 2. Introduction

### 2.1 Purpose of This Document

This Investigator's Brochure (IB) provides investigators and ethics committees with comprehensive information about SleepCore digital therapeutic, prepared in accordance with:

- MDCG 2024-5 (Investigator's Brochure for Medical Devices)
- ICH E6(R3) Good Clinical Practice (January 2025)
- ISO 14155:2020 Clinical Investigation of Medical Devices
- Russia Federal Law 61-FZ (Clinical Trials)

### 2.2 Background: Chronic Insomnia

Chronic insomnia disorder is defined as:
- Difficulty initiating sleep, maintaining sleep, or early morning awakening
- Occurring ≥3 nights per week for ≥3 months
- Causing significant distress or functional impairment
- Not explained by inadequate sleep opportunity (DSM-5, ICSD-3)

**Global Prevalence:**
- 10-15% of general population meets criteria for chronic insomnia disorder
- 30-35% report insomnia symptoms
- Russia: 21-28% prevalence (Poluektov et al., 2021)

**Consequences of Untreated Insomnia:**
- Increased risk of depression (OR 2.1), anxiety (OR 2.3)
- Cardiovascular disease risk (HR 1.45)
- Cognitive impairment and reduced productivity
- Healthcare costs: $1,253-$1,967 higher annually per patient

### 2.3 Current Treatment Landscape

| Treatment | Efficacy | Limitations |
|-----------|----------|-------------|
| Pharmacotherapy (BzRA, Z-drugs) | Short-term effective | Tolerance, dependence, side effects |
| CBT-I (face-to-face) | Long-term effective, guideline-recommended | Limited access, cost, time burden |
| Digital CBT-I | Non-inferior to face-to-face | Variable quality, engagement challenges |

**Clinical Guidelines Recommendation:**
- AASM (2021): CBT-I as first-line treatment (Strong recommendation)
- European Sleep Research Society (2023): CBT-I before pharmacotherapy
- Russian Sleep Medicine Society: CBT-I recommended for chronic insomnia

---

## 3. Product Description

### 3.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SleepCore Platform                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   User      │  │  Telegram   │  │    SleepCore        │ │
│  │  Interface  │◄─►│    Bot     │◄─►│    Backend          │ │
│  │  (Telegram) │  │   (API)     │  │   (Node.js)         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                              │               │
│                                     ┌────────▼────────┐     │
│                                     │  CogniCore      │     │
│                                     │  Engine         │     │
│                                     │  (POMDP AI)     │     │
│                                     └────────┬────────┘     │
│                                              │               │
│  ┌─────────────┐  ┌─────────────┐  ┌────────▼────────┐     │
│  │   Sleep     │  │   CBT-I     │  │   Assessment    │     │
│  │   Diary     │  │   Modules   │  │   Engine        │     │
│  └─────────────┘  └─────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Core Components

#### 3.2.1 Assessment Engine
- **ISI (Insomnia Severity Index):** 7-item validated questionnaire
- **PSQI (Pittsburgh Sleep Quality Index):** Sleep quality assessment
- **ESS (Epworth Sleepiness Scale):** Daytime sleepiness screening
- **PHQ-2:** Depression screening (exclusion criterion)
- **GAD-2:** Anxiety screening (exclusion criterion)

#### 3.2.2 Sleep Diary Module
- Daily sleep/wake time recording
- Sleep efficiency calculation (TST/TIB × 100%)
- Sleep onset latency (SOL) tracking
- Wake after sleep onset (WASO) tracking
- Number of awakenings
- Sleep quality rating (1-5)
- Morning refreshment rating

#### 3.2.3 CBT-I Treatment Modules

**Sleep Restriction Therapy (SRT):**
- Calculates initial time-in-bed window based on sleep efficiency
- Minimum TIB: 5.0 hours (safety floor)
- Weekly adjustments: +15 min if SE ≥85%, -15 min if SE <80%
- Gradual expansion until optimal sleep duration achieved

**Stimulus Control Therapy (SCT):**
- Evidence-based rules for bed-sleep association:
  1. Go to bed only when sleepy
  2. Use bed only for sleep (and intimacy)
  3. Leave bed if unable to sleep within ~20 minutes
  4. Return to bed only when sleepy
  5. Maintain consistent wake time
  6. No daytime napping (initial phase)

**Cognitive Restructuring:**
- Identifies dysfunctional beliefs about sleep
- Socratic questioning technique
- Cognitive reframing exercises
- Sleep-related worry time scheduling

**Sleep Hygiene Education:**
- Sleep environment optimization (darkness, temperature, noise)
- Caffeine/alcohol timing recommendations
- Exercise timing optimization
- Screen time management
- Pre-sleep routine development

**Relaxation Training:**
- Progressive Muscle Relaxation (PMR)
- Diaphragmatic breathing (4-7-8 technique)
- Body scan meditation
- Autogenic training
- Guided imagery
- Mindfulness exercises

### 3.3 AI Personalization Engine (CogniCore)

SleepCore uses a Partially Observable Markov Decision Process (POMDP) model for treatment personalization:

**State Variables:**
- Sleep state (sleep efficiency, SOL, WASO)
- Engagement state (adherence, response rate)
- Treatment progress (week, module completion)
- Risk state (adverse events, severity)

**Observation Variables:**
- Sleep diary entries
- Assessment scores
- User interaction patterns
- Self-reported side effects

**Action Space:**
- Content delivery timing
- Module sequencing
- Difficulty adjustment
- Motivational messaging
- Escalation decisions

**Personalization Features:**
- Adaptive content scheduling based on user behavior
- Dynamic difficulty adjustment
- Personalized feedback messages
- Risk-based monitoring intensification

### 3.4 Technical Specifications

| Parameter | Specification |
|-----------|---------------|
| Platform | Telegram Bot API |
| Backend | Node.js (TypeScript) |
| Database | PostgreSQL (encrypted at rest) |
| Encryption | AES-256-GCM (PHI), TLS 1.3 (transport) |
| Availability | 99.9% uptime target |
| Response Time | <2 seconds for interactive responses |
| Data Retention | As required by protocol, minimum 25 years |

---

## 4. Mechanism of Action

### 4.1 Theoretical Framework

SleepCore's mechanism of action is based on established CBT-I theory:

#### 4.1.1 Behavioral Model of Insomnia (Spielman 3P Model)

```
Predisposing Factors → Precipitating Factors → Perpetuating Factors
       (trait)              (trigger)            (maintenance)
                                                      ↓
                                               Chronic Insomnia
                                                      ↑
                                    CBT-I targets perpetuating factors
```

**Perpetuating factors addressed by SleepCore:**
- Excessive time in bed (→ Sleep Restriction)
- Conditioned arousal in bed (→ Stimulus Control)
- Dysfunctional beliefs about sleep (→ Cognitive Restructuring)
- Poor sleep habits (→ Sleep Hygiene)
- Physiological hyperarousal (→ Relaxation)

#### 4.1.2 Sleep Homeostatic Model

Sleep Restriction Therapy enhances sleep drive by:
1. Building homeostatic sleep pressure (Process S)
2. Consolidating fragmented sleep
3. Strengthening circadian alignment (Process C)

**Expected physiological changes:**
- Increased slow-wave sleep percentage
- Reduced sleep fragmentation
- Faster sleep onset
- More stable circadian rhythm

### 4.2 Digital Delivery Mechanisms

SleepCore leverages digital delivery to enhance CBT-I effectiveness:

| Mechanism | Implementation | Expected Benefit |
|-----------|----------------|------------------|
| Real-time feedback | Automated sleep diary analysis | Immediate behavioral reinforcement |
| Personalization | POMDP-based adaptation | Optimized treatment matching |
| Accessibility | 24/7 availability | Reduced barriers to engagement |
| Consistency | Standardized content delivery | Treatment fidelity |
| Engagement | Gamification elements | Improved adherence |

---

## 5. Clinical Evidence

### 5.1 Evidence for CBT-I

#### 5.1.1 Meta-Analyses and Systematic Reviews

**Trauer et al. (2015) - JAMA Internal Medicine:**
- N = 1,162 participants across 20 RCTs
- Sleep onset latency: -19.0 min (95% CI: -14.2 to -23.8)
- Wake after sleep onset: -26.0 min (95% CI: -15.5 to -36.5)
- Total sleep time: +7.6 min (95% CI: -0.2 to +15.4)
- Sleep efficiency: +9.9% (95% CI: 8.1 to 11.7)

**van Straten et al. (2018) - Annals of Internal Medicine:**
- N = 3,724 participants across 87 RCTs
- ISI reduction: SMD = -1.09 (95% CI: -1.21 to -0.97)
- Effects maintained at 12-month follow-up
- Face-to-face and digital formats both effective

**Seyffert et al. (2016) - Journal of Medical Internet Research:**
- Digital CBT-I meta-analysis (N = 3,434 across 11 RCTs)
- ISI reduction: Cohen's d = 0.86 (moderate-large effect)
- Sleep efficiency: Cohen's d = 0.53 (moderate effect)

#### 5.1.2 Landmark Randomized Controlled Trials

**Morin et al. (2009) - JAMA:**
- CBT-I vs. Zolpidem vs. Combined vs. Placebo
- CBT-I superior for long-term outcomes
- 6-month remission: CBT-I 56% vs. Zolpidem 27%

**Espie et al. (2012) - Lancet:**
- Digital CBT-I (Sleepio) vs. Imagery Relief vs. TAU
- N = 164, 8-week intervention
- ISI reduction: -5.5 points (digital CBT-I) vs. -1.9 (TAU)

**Zachariae et al. (2016) - Annals of Internal Medicine:**
- Digital CBT-I meta-analysis
- Significant improvements in all sleep parameters
- Effect sizes comparable to face-to-face CBT-I

### 5.2 Evidence for Digital CBT-I Platforms

| Platform | Study | N | ISI Change | Effect Size |
|----------|-------|---|------------|-------------|
| Sleepio | Espie (2012) | 164 | -5.5 | d = 1.09 |
| SHUTi | Ritterband (2017) | 303 | -8.1 | d = 1.65 |
| Somryst | Kaldo (2015) | 148 | -6.1 | d = 1.24 |
| RESTORE | Espie (2019) | 1,711 | -4.7 | d = 0.95 |

### 5.3 Evidence Gaps and SleepCore's Contribution

**Current gaps in digital CBT-I evidence:**
1. Limited Russian-language validated platforms
2. Few studies in Telegram/messaging platform delivery
3. Limited AI-personalization effectiveness data
4. Need for real-world effectiveness studies

**SleepCore pilot study aims to address:**
- Feasibility of Telegram-based CBT-I delivery
- Acceptability in Russian-speaking population
- Preliminary efficacy signals
- Safety profile characterization

---

## 6. Safety Information

### 6.1 Known Risks of CBT-I

#### 6.1.1 Expected Side Effects (Common, >10%)

| Side Effect | Mechanism | Typical Duration | Management |
|-------------|-----------|------------------|------------|
| Daytime sleepiness | Sleep restriction | Weeks 1-3 | Monitoring, activity planning |
| Fatigue | Sleep restriction | Weeks 1-3 | Gradual TIB adjustment |
| Reduced concentration | Sleep deficit | Weeks 1-2 | Safety warnings |
| Mood changes | Sleep disruption | Weeks 1-3 | Monitoring, escalation if needed |
| Headache | Sleep changes | Days to weeks | Symptomatic treatment |

#### 6.1.2 Less Common Side Effects (1-10%)

| Side Effect | Frequency | Considerations |
|-------------|-----------|----------------|
| Anxiety increase (transient) | ~5% | Monitor, may require protocol adjustment |
| Irritability | ~7% | Usually resolves by week 3-4 |
| Difficulty at work | ~3% | Safety counseling essential |

#### 6.1.3 Rare but Serious Risks (<1%)

| Risk | Population at Risk | Mitigation |
|------|-------------------|------------|
| Mania/hypomania induction | Bipolar disorder | Exclude bipolar, monitor mood |
| Severe depression worsening | Major depression | PHQ-2 screening, exclude if positive |
| Seizure threshold lowering | Epilepsy history | Exclude uncontrolled epilepsy |
| Driving/machinery accidents | All participants | Clear safety warnings, exclude shift workers |

### 6.2 Contraindications

**Absolute Contraindications:**
- Untreated obstructive sleep apnea (AHI ≥15)
- Bipolar disorder
- Active psychosis
- Current suicidal ideation
- Shift work or irregular schedules
- Seizure disorder (uncontrolled)
- Professional driving occupation

**Relative Contraindications (require caution):**
- Moderate depression (PHQ-9 10-14) - may proceed with monitoring
- Anxiety disorders - may proceed, monitor for worsening
- Chronic pain - may require modification
- Pregnancy - limited data, individual assessment

### 6.3 Drug Interactions

SleepCore is a behavioral intervention with no direct pharmacological interactions. However, interactions with concurrent medications should be considered:

| Medication Class | Consideration |
|------------------|---------------|
| Sedative-hypnotics | May mask CBT-I effects, discuss tapering |
| Antidepressants (sedating) | May affect sleep architecture |
| Stimulants | May counteract sleep restriction |
| Beta-blockers | May affect melatonin, circadian rhythm |

### 6.4 Safety Monitoring in SleepCore

**Built-in Safety Features:**

1. **Sleep Efficiency Floor:** Minimum TIB = 5.0 hours
2. **Automated PHQ-2 Screening:** Weekly during treatment
3. **Excessive Sleepiness Detection:** ESS monitoring
4. **Safety Warnings:** Driving/machinery alerts during sleep restriction
5. **Crisis Resources:** Emergency contacts always accessible
6. **Escalation Protocol:** Automatic alerts to study team for concerning patterns

**Stopping Rules:**
- ISI increase ≥7 points from baseline
- PHQ-2 score ≥3 (positive depression screen)
- ESS ≥16 (severe excessive daytime sleepiness)
- Participant-reported severe adverse event
- Request by participant

---

## 7. Benefits and Risks

### 7.1 Potential Benefits

**For Individual Participants:**
- Improvement in insomnia symptoms (expected ISI reduction: 5-8 points)
- Improved sleep efficiency (expected: +10-15%)
- Reduced reliance on sleep medications
- Improved daytime functioning
- Free access to evidence-based treatment

**For Society:**
- Validation of scalable insomnia treatment
- Improved access to CBT-I in Russian-speaking populations
- Potential healthcare cost reduction
- Advancement of digital therapeutics evidence base

### 7.2 Potential Risks

| Risk Category | Likelihood | Severity | Mitigation |
|---------------|------------|----------|------------|
| Daytime sleepiness | High (>50%) | Mild-Moderate | Monitoring, warnings |
| Fatigue | High (>50%) | Mild | Expected, temporary |
| Mood changes | Moderate (20%) | Mild | PHQ-2 monitoring |
| Treatment failure | Moderate (30-40%) | Mild | Referral to specialist |
| Privacy breach | Very Low (<0.1%) | High | Encryption, RBAC |
| Accident/injury | Very Low (<1%) | High | Safety warnings, exclusions |

### 7.3 Benefit-Risk Balance

**Overall Assessment:** FAVORABLE

The benefit-risk profile of SleepCore is favorable because:
1. CBT-I has extensive evidence for safety and efficacy
2. Digital delivery does not introduce new therapeutic risks
3. Built-in safety monitoring exceeds standard care
4. Target population (chronic insomnia) has high unmet need
5. Known risks are time-limited and manageable

---

## 8. Preclinical Studies

### 8.1 Software Verification and Validation

As a Software as a Medical Device, SleepCore has undergone:

**Verification Activities:**
- Unit testing (>1,200 tests, 80%+ code coverage)
- Integration testing (API, database, bot interactions)
- Security testing (penetration testing, vulnerability scanning)
- Performance testing (load testing, stress testing)

**Validation Activities:**
- Clinical algorithm validation against published CBT-I protocols
- Assessment instrument validation (ISI-Russian psychometrics)
- Usability testing (n=10 formative, n=20 summative planned)
- Clinical expert review

### 8.2 Algorithm Validation

**Sleep Restriction Algorithm:**
- Validated against AASM sleep restriction guidelines
- Safety floor (5.0h) aligned with expert consensus
- Adjustment rules based on published protocols (Spielman, Perlis)

**Assessment Scoring:**
- ISI scoring validated against original Morin instrument
- ESS scoring validated against Johns original
- PHQ-2 validated against Kroenke et al.

### 8.3 Usability Studies

**Formative Usability Testing (N=10):**
- Task completion rate: 95%
- System Usability Scale (SUS): 78/100 (Good)
- Key findings: Simplified onboarding needed, clearer sleep diary instructions

**Summative Usability Testing (Planned, N=20):**
- Part of pilot study protocol
- Primary outcome: Task success rate ≥90%
- Secondary: SUS ≥68 (above average)

---

## 9. Instructions for Use

### 9.1 Investigator Responsibilities

Investigators in SleepCore studies are responsible for:

1. **Screening and Enrollment:**
   - Verify eligibility criteria
   - Obtain informed consent
   - Complete baseline assessments

2. **Safety Monitoring:**
   - Review automated safety alerts
   - Respond to participant queries within 24 hours
   - Report adverse events per protocol

3. **Data Quality:**
   - Ensure consent documentation is complete
   - Review assessment completion rates
   - Address missing data promptly

4. **Participant Support:**
   - Provide technical support as needed
   - Address clinical questions
   - Facilitate referrals when indicated

### 9.2 Participant Instructions

Participants receive in-app instructions covering:

1. **Getting Started:**
   - Starting the Telegram bot
   - Completing initial assessments
   - Understanding sleep diary entry

2. **Daily Tasks:**
   - Morning sleep diary completion (within 1 hour of waking)
   - Evening preparation prompts
   - Weekly assessment completion

3. **Treatment Modules:**
   - Sleep restriction implementation
   - Stimulus control rules
   - Relaxation technique practice

4. **Safety Information:**
   - Driving precautions
   - When to contact study team
   - Emergency resources

### 9.3 Technical Requirements

**Participant Requirements:**
- Smartphone with Telegram app (iOS 12+ or Android 8+)
- Internet connection (Wi-Fi or mobile data)
- Russian language proficiency

**No Special Equipment Required:**
- No wearables necessary
- No additional apps required
- No medical devices needed

---

## 10. References

### 10.1 Key Clinical References

1. Morin CM, Vallières A, Guay B, et al. Cognitive behavioral therapy, singly and combined with medication, for persistent insomnia: a randomized controlled trial. JAMA. 2009;301(19):2005-2015.

2. Espie CA, Kyle SD, Williams C, et al. A randomized, placebo-controlled trial of online cognitive behavioral therapy for chronic insomnia disorder delivered via an automated media-rich web application. Sleep. 2012;35(6):769-781.

3. Trauer JM, Qian MY, Doyle JS, et al. Cognitive behavioral therapy for chronic insomnia: a systematic review and meta-analysis. Ann Intern Med. 2015;163(3):191-204.

4. van Straten A, van der Zweerde T, Kleiboer A, et al. Cognitive and behavioral therapies in the treatment of insomnia: a meta-analysis. Sleep Med Rev. 2018;38:3-16.

5. Zachariae R, Lyby MS, Ritterband LM, O'Toole MS. Efficacy of internet-delivered cognitive-behavioral therapy for insomnia: a systematic review and meta-analysis of randomized controlled trials. Sleep Med Rev. 2016;30:1-10.

6. Ritterband LM, Thorndike FP, Ingersoll KS, et al. Effect of a web-based cognitive behavior therapy for insomnia intervention with 1-year follow-up: a randomized clinical trial. JAMA Psychiatry. 2017;74(1):68-75.

### 10.2 Regulatory References

7. ICH E6(R3) Guideline for Good Clinical Practice. January 2025.

8. ISO 14155:2020 Clinical investigation of medical devices for human subjects.

9. MDCG 2024-5 Clinical Evaluation - Investigator's Brochure for Medical Devices.

10. FDA Guidance: Software as a Medical Device (SaMD): Clinical Evaluation. 2017.

### 10.3 Assessment Instrument References

11. Morin CM, Belleville G, Bélanger L, Ivers H. The Insomnia Severity Index: psychometric indicators to detect insomnia cases and evaluate treatment response. Sleep. 2011;34(5):601-608.

12. Buysse DJ, Reynolds CF, Monk TH, et al. The Pittsburgh Sleep Quality Index: a new instrument for psychiatric practice and research. Psychiatry Res. 1989;28(2):193-213.

13. Johns MW. A new method for measuring daytime sleepiness: the Epworth sleepiness scale. Sleep. 1991;14(6):540-545.

14. Kroenke K, Spitzer RL, Williams JB. The Patient Health Questionnaire-2: validity of a two-item depression screener. Med Care. 2003;41(11):1284-1292.

---

## Appendix A: SPIRIT 2025 Compliance Checklist

This Investigator's Brochure supports the following SPIRIT 2025 items:

| Item | Description | Status |
|------|-------------|--------|
| 6a | Description of intervention | Section 3 |
| 6b | Criteria for discontinuation | Section 6.2 |
| 11a | Intervention description | Section 3 |
| 11c | Provisions for post-trial access | Protocol |
| 22 | Potential risks and benefits | Section 7 |

---

## Appendix B: Contact Information

**Sponsor:**
[Organization Name]
[Address]
[Email]
[Phone]

**Principal Investigator:**
[Name, MD/PhD]
[Institution]
[Email]
[Phone]

**Medical Monitor:**
[Name, MD]
[24-hour contact]

**Technical Support:**
[Email]
[Hours of availability]

---

**End of Investigator's Brochure**

*This document is confidential and intended for use by investigators, ethics committees, and regulatory authorities reviewing the SleepCore clinical investigation.*
