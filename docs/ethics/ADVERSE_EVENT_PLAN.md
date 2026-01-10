# Adverse Event Reporting Plan: SleepCore Pilot Study

**Document ID:** SC-SAE-2026-001
**Version:** 1.0
**Date:** January 2026
**Protocol Reference:** SC-PILOT-2026-001

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Definitions](#2-definitions)
3. [Adverse Event Categories](#3-adverse-event-categories)
4. [Detection and Assessment](#4-detection-and-assessment)
5. [Reporting Procedures](#5-reporting-procedures)
6. [Reporting Timelines](#6-reporting-timelines)
7. [Causality Assessment](#7-causality-assessment)
8. [Follow-up and Resolution](#8-follow-up-and-resolution)
9. [Regulatory Reporting](#9-regulatory-reporting)
10. [Data Safety Monitoring](#10-data-safety-monitoring)
11. [Forms and Templates](#11-forms-and-templates)

---

## 1. Purpose and Scope

### 1.1 Purpose

This Adverse Event Reporting Plan establishes procedures for:
- Detection, assessment, and documentation of adverse events
- Timely reporting to appropriate authorities
- Participant safety protection
- Regulatory compliance

### 1.2 Regulatory Framework

This plan complies with:
- ICH E6(R3) Good Clinical Practice (January 2025)
- ICH E2A: Clinical Safety Data Management
- ISO 14155:2020 Clinical Investigation of Medical Devices
- Russia Federal Law 61-FZ (Clinical Trials of Medicinal Products)
- Roszdravnadzor Order No. 441 (Safety Reporting)
- EU MDR 2017/745 (Vigilance Requirements)

### 1.3 Scope

This plan applies to:
- All adverse events occurring during study participation
- Events occurring within 30 days of study completion
- Events related to study procedures discovered at any time

---

## 2. Definitions

### 2.1 Adverse Event (AE)

**Definition:** Any untoward medical occurrence in a study participant, which does not necessarily have a causal relationship with the study intervention.

An AE can be:
- Any unfavorable or unintended sign (including abnormal findings)
- Symptom or disease
- Temporally associated with study participation

### 2.2 Adverse Device Effect (ADE)

**Definition:** Any adverse event related to the use of the investigational medical device (SleepCore).

For SleepCore, this includes events related to:
- Sleep restriction therapy implementation
- Content or instructions provided by the application
- Technical malfunctions affecting safety

### 2.3 Serious Adverse Event (SAE)

**Definition:** Any adverse event that:

| Criterion | Description |
|-----------|-------------|
| **Death** | Results in death |
| **Life-threatening** | Places participant at immediate risk of death |
| **Hospitalization** | Requires inpatient hospitalization or prolongs existing hospitalization |
| **Disability** | Results in persistent or significant disability/incapacity |
| **Congenital anomaly** | Results in congenital anomaly/birth defect |
| **Other significant event** | May not be immediately life-threatening but requires medical/surgical intervention to prevent one of the above |

### 2.4 Serious Adverse Device Effect (SADE)

**Definition:** An adverse device effect that meets any SAE criterion.

### 2.5 Unexpected Adverse Event

**Definition:** An adverse event, the nature, severity, or frequency of which is not consistent with the risk information in the Investigator's Brochure or product labeling.

### 2.6 Unanticipated Serious Adverse Device Effect (USADE)

**Definition:** A serious adverse device effect that:
- Was not previously identified in nature, severity, or frequency
- OR was previously identified but determined to be more frequent or severe

---

## 3. Adverse Event Categories

### 3.1 Expected Adverse Events (SleepCore)

Based on CBT-I literature, the following are expected AEs:

| Event | Expected Frequency | Severity | Duration |
|-------|-------------------|----------|----------|
| Daytime sleepiness | >50% | Mild-Moderate | Weeks 1-3 |
| Fatigue | >50% | Mild | Weeks 1-3 |
| Reduced concentration | 30-40% | Mild | Weeks 1-2 |
| Mood changes (irritability) | 20-30% | Mild | Weeks 1-3 |
| Headache | 10-20% | Mild | Days-weeks |
| Anxiety (transient increase) | 5-10% | Mild-Moderate | Weeks 1-2 |

### 3.2 Adverse Events of Special Interest (AESI)

Events requiring enhanced monitoring regardless of causality:

| AESI | Rationale | Action |
|------|-----------|--------|
| Depression symptoms | Sleep restriction may unmask depression | PHQ-2 >3: stop treatment, refer |
| Suicidal ideation | Safety-critical | Immediate stop, emergency referral |
| Mania/hypomania | Sleep restriction can trigger in bipolar | Immediate stop, psychiatric referral |
| Motor vehicle accident | Sleepiness risk | SAE reporting, protocol review |
| Workplace accident | Sleepiness risk | SAE reporting, consider stopping |
| Fall with injury | Sleepiness/fatigue risk | Report, assess causality |
| Seizure | Rare but serious | SAE reporting, neurological evaluation |

### 3.3 Technical Events (Device Malfunctions)

| Event Type | Severity | Reportable |
|------------|----------|------------|
| App crash | Minor | Internal log only |
| Data loss | Moderate | Report if affects treatment |
| Incorrect sleep prescription | Major | Always report |
| Failed safety alert | Critical | USADE if leads to harm |
| Privacy breach | Critical | Always report, regulatory notification |

---

## 4. Detection and Assessment

### 4.1 Detection Methods

#### 4.1.1 Passive Surveillance (Participant-Reported)

- Daily sleep diary "How do you feel today?" question
- Weekly symptom questionnaire
- Open-ended feedback option
- Direct participant contact with study team

#### 4.1.2 Active Surveillance (System-Detected)

| Trigger | Detection Method | Action |
|---------|------------------|--------|
| PHQ-2 ≥3 | Automated scoring | Alert to investigator |
| ESS ≥16 | Automated scoring | Alert + in-app warning |
| ISI increase ≥7 | Trend analysis | Alert to investigator |
| 5+ days no diary | Engagement monitoring | Follow-up contact |
| Safety keyword | NLP detection | Alert to investigator |

#### 4.1.3 Scheduled Assessments

| Timepoint | Assessments | AE Review |
|-----------|-------------|-----------|
| Baseline | ISI, ESS, PHQ-2, Medical history | None (baseline) |
| Weekly (Weeks 1-8) | Sleep diary, ESS, PHQ-2 | Weekly AE review |
| Week 4 | ISI, Usability | Mid-study AE review |
| Week 8 | ISI, ESS, PHQ-2, Satisfaction | End-treatment AE review |
| Week 12 | ISI, ESS | Follow-up AE review |

### 4.2 Assessment Parameters

Each AE must be assessed for:

#### 4.2.1 Severity

| Grade | Description | Examples |
|-------|-------------|----------|
| **Mild** | Awareness of symptoms, easily tolerated | Mild fatigue, slight headache |
| **Moderate** | Discomfort enough to interfere with daily activity | Moderate sleepiness affecting work |
| **Severe** | Incapacitating, unable to perform daily activities | Unable to work, requires medical attention |

#### 4.2.2 Seriousness

Apply SAE criteria (Section 2.3)

#### 4.2.3 Expectedness

- **Expected:** Listed in Investigator's Brochure Section 6
- **Unexpected:** Not listed or more severe/frequent than expected

#### 4.2.4 Relationship to Study Intervention

See Section 7 (Causality Assessment)

#### 4.2.5 Outcome

| Outcome | Description |
|---------|-------------|
| Recovered/Resolved | Event no longer present |
| Recovering/Resolving | Improving but not fully resolved |
| Not recovered/Not resolved | Ongoing at time of report |
| Recovered with sequelae | Resolved but with lasting effects |
| Fatal | Death |
| Unknown | Lost to follow-up |

---

## 5. Reporting Procedures

### 5.1 Internal Reporting Flow

```
Participant/System → Investigator → Study Coordinator → Medical Monitor → Sponsor
                          ↓                                    ↓
                    Documentation                     Regulatory Decision
                          ↓                                    ↓
                    Follow-up                         Authority Notification
```

### 5.2 Investigator Responsibilities

1. **Detect:** Review all reports within 24 hours of receipt
2. **Assess:** Evaluate severity, seriousness, expectedness, causality
3. **Document:** Complete AE form with all required information
4. **Report:** Submit to Medical Monitor per timelines
5. **Follow:** Monitor until resolution or stabilization
6. **Update:** Submit follow-up reports as needed

### 5.3 Documentation Requirements

Each AE report must include:

**Initial Report:**
- Participant ID (de-identified)
- Event onset date
- Event description
- Severity and seriousness assessment
- Current status
- Action taken
- Initial causality assessment

**Follow-up Report:**
- Updated status
- Additional information
- Final outcome
- Final causality assessment
- Resolution date (if applicable)

### 5.4 Participant Communication

| Event Type | Communication | Timing |
|------------|---------------|--------|
| Mild expected AE | In-app reassurance | Automated |
| Moderate AE | Personal contact | Within 24 hours |
| Severe/Serious AE | Immediate phone contact | Same day |
| Medical emergency | Emergency services | Immediate |

---

## 6. Reporting Timelines

### 6.1 Internal Timelines

| Event Type | Initial Report | Follow-up |
|------------|----------------|-----------|
| Non-serious AE | 7 calendar days | Monthly during study |
| Serious AE (SAE) | 24 hours | 7 days (or when new info available) |
| USADE | 24 hours | 7 days (or when new info available) |
| Death | Immediately (phone) + 24 hours (written) | As needed |

### 6.2 Regulatory Timelines (Russia - Roszdravnadzor)

| Event | Timeline | Form |
|-------|----------|------|
| USADE (fatal/life-threatening) | 7 calendar days | CIOMS form |
| USADE (other) | 15 calendar days | CIOMS form |
| SAE (non-USADE) | Within DSUR/ASR | Annual report |
| Device deficiency (without injury) | 15 calendar days | MDR vigilance form |

### 6.3 Regulatory Timelines (EU MDR)

| Event | Timeline | Destination |
|-------|----------|-------------|
| Serious incident (trend) | Within trend report period | Competent Authority |
| SADE | 15 days (non-fatal) / 10 days (fatal) | Competent Authority |
| Field Safety Corrective Action | Before implementation | Competent Authority + NB |

### 6.4 Ethics Committee Reporting

| Event | Timeline | Action |
|-------|----------|--------|
| USADE | Within 7 days | Report to Ethics Council |
| Protocol deviation (safety-related) | Within 7 days | Report to Ethics Council |
| Annual safety summary | Yearly | Include in progress report |

---

## 7. Causality Assessment

### 7.1 Assessment Categories

| Category | Definition | Criteria |
|----------|------------|----------|
| **Related** | Reasonable possibility of relationship | Temporal relationship + biologically plausible + no better explanation |
| **Possibly Related** | Less clear relationship | Temporal relationship + possible mechanism |
| **Unlikely Related** | Probably not related | Poor temporal relationship OR better alternative explanation |
| **Not Related** | No reasonable possibility | Clear alternative cause + no temporal relationship |

### 7.2 Assessment Considerations for SleepCore

For sleep restriction therapy-related events:
- Did event occur during active sleep restriction?
- Did sleep efficiency <80% precede event?
- Did event improve when TIB was increased?
- Are there alternative explanations?

For cognitive content-related events:
- Was distressing content delivered before event?
- Did event relate to specific module content?
- Did participant report distress from content?

### 7.3 Independent Assessment

For serious/unexpected events:
1. Investigator performs initial assessment
2. Medical Monitor performs independent assessment
3. Discrepancies resolved by discussion
4. Final determination by Medical Monitor

---

## 8. Follow-up and Resolution

### 8.1 Follow-up Requirements

| Event Type | Follow-up Frequency | Duration |
|------------|---------------------|----------|
| Mild AE | Monthly or per participant contact | Until resolved |
| Moderate AE | Weekly | Until resolved |
| Severe AE | Every 48-72 hours | Until resolved or stable |
| SAE | Daily until stable, then weekly | Until resolved or 30 days post-study |

### 8.2 Resolution Criteria

An AE is considered resolved when:
- Symptoms have returned to baseline
- No ongoing treatment required
- Participant reports recovery

An AE is considered stable when:
- No change expected
- Chronic condition established
- Ongoing management in place

### 8.3 Lost to Follow-up

If participant cannot be contacted:
1. Attempt contact × 3 (phone, email, Telegram)
2. Document all attempts
3. Mark outcome as "Unknown"
4. Include in study completion data

---

## 9. Regulatory Reporting

### 9.1 Russia (Roszdravnadzor)

**Contact Information:**
Roszdravnadzor (Federal Service for Surveillance in Healthcare)
Address: 4, bld. 1, Slavyanskaya Square, Moscow, 109074
Portal: https://roszdravnadzor.gov.ru

**Reporting Requirements:**
- CIOMS form (Russian translation)
- E2B(R3) compatible format preferred
- MedDRA coding required

### 9.2 Russia Ethics Council

**Contact Information:**
Ethics Council of the Ministry of Health of the Russian Federation
Address: 3, Rakhmanovsky per., Moscow, 127994

**Reporting Requirements:**
- USADE reports within 7 days
- Annual safety report
- Protocol amendments if safety-related

### 9.3 European Union (if applicable)

**EUDAMED** (when fully functional):
- Vigilance module for serious incident reporting
- Trend reports as required

### 9.4 Line Listings and Summaries

| Report | Frequency | Content |
|--------|-----------|---------|
| AE Line Listing | Monthly | All AEs, descriptive |
| SAE Line Listing | As occurs | All SAEs, detailed |
| DSMB Safety Report | Quarterly | Aggregate analysis |
| Annual Safety Report | Yearly | Full year summary |

---

## 10. Data Safety Monitoring

### 10.1 Data Safety Monitoring Board (DSMB)

**Not required** for this pilot study due to:
- Small sample size (N=30-50)
- Known safety profile of CBT-I
- Non-pharmacological intervention
- Short duration (8 weeks)

**Instead:** Medical Monitor oversight with defined stopping rules.

### 10.2 Medical Monitor Responsibilities

- Review all SAEs within 24 hours
- Quarterly aggregate safety review
- Stopping rule evaluation
- Regulatory reporting decisions
- Protocol amendment recommendations

### 10.3 Stopping Rules

**Individual Participant:**
- PHQ-2 ≥3 (positive depression screen)
- ESS ≥16 (severe excessive daytime sleepiness)
- ISI increase ≥7 points from baseline
- Any SAE related to intervention
- Participant request

**Study-Level:**
- ≥2 related SAEs
- ≥10% of participants with severe AEs
- USADE occurrence
- Emerging safety signal not previously identified

### 10.4 Safety Signal Detection

Methods for signal detection:
- Disproportionality analysis (if larger study)
- Trend monitoring (this study)
- Literature surveillance for CBT-I safety data
- Comparison with expected rates from IB

---

## 11. Forms and Templates

### 11.1 Adverse Event Report Form

```
═══════════════════════════════════════════════════════════════════════
                    ADVERSE EVENT REPORT FORM
                    Protocol: SC-PILOT-2026-001
═══════════════════════════════════════════════════════════════════════

SECTION A: IDENTIFICATION
─────────────────────────────────────────────────────────────────────
Participant ID: |__|__|__|__|__|        Report Date: |__|__|/|__|__|/|__|__|__|__|
Investigator: _________________________  Site: _________________________
Report Type:  □ Initial   □ Follow-up #____

SECTION B: EVENT INFORMATION
─────────────────────────────────────────────────────────────────────
Event Description:
___________________________________________________________________
___________________________________________________________________

Onset Date: |__|__|/|__|__|/|__|__|__|__|   Ongoing: □ Yes  □ No
Resolution Date: |__|__|/|__|__|/|__|__|__|__|  (if resolved)

SECTION C: ASSESSMENT
─────────────────────────────────────────────────────────────────────
Severity:        □ Mild      □ Moderate     □ Severe
Serious:         □ Yes       □ No
If Serious (check all that apply):
  □ Death   □ Life-threatening   □ Hospitalization
  □ Disability   □ Congenital anomaly   □ Other significant

Expectedness:    □ Expected  □ Unexpected
Relatedness:     □ Related   □ Possibly related
                 □ Unlikely related   □ Not related

SECTION D: OUTCOME AND ACTION
─────────────────────────────────────────────────────────────────────
Outcome: □ Recovered  □ Recovering  □ Not recovered
         □ Recovered w/ sequelae  □ Fatal  □ Unknown

Action Taken:
□ None          □ Dose/schedule modified    □ Intervention stopped
□ Treatment given (specify): _______________________________________
□ Hospitalization   □ Other: _______________________________________

SECTION E: NARRATIVE
─────────────────────────────────────────────────────────────────────
___________________________________________________________________
___________________________________________________________________
___________________________________________________________________

Investigator Signature: ___________________ Date: ___________________
═══════════════════════════════════════════════════════════════════════
```

### 11.2 Serious Adverse Event Report Form (CIOMS-Compatible)

```
═══════════════════════════════════════════════════════════════════════
             SERIOUS ADVERSE EVENT REPORT (SAE/CIOMS)
═══════════════════════════════════════════════════════════════════════

1. PATIENT INFORMATION
   Initials: |__|__|__|    Age: |__|__|    Sex: □ M □ F
   Weight: |__|__|__| kg   Height: |__|__|__| cm

2. SUSPECTED DEVICE
   Device Name: SleepCore Digital Therapeutic
   Version: ________    Serial/Install ID: ______________

3. EVENT DESCRIPTION
   Diagnosis/Syndrome: ________________________________________
   Date of Onset: |__|__|/|__|__|/|__|__|__|__|
   Date of Report: |__|__|/|__|__|/|__|__|__|__|

4. SERIOUSNESS CRITERIA (check all that apply)
   □ Death (Date: _________)
   □ Life-threatening
   □ Hospitalization (Duration: ____ days)
   □ Prolonged hospitalization
   □ Disability/Incapacity
   □ Congenital anomaly
   □ Other medically important

5. OUTCOME AT TIME OF REPORT
   □ Recovered  □ Not yet recovered  □ Fatal  □ Unknown

6. CAUSALITY ASSESSMENT
   □ Related  □ Possibly related  □ Unlikely  □ Not related

   Rationale: _________________________________________________

7. NARRATIVE (include relevant history, timing, treatment, outcome)
   ___________________________________________________________
   ___________________________________________________________
   ___________________________________________________________
   ___________________________________________________________

8. REPORTER
   Name: _____________________________________________________
   Phone: ____________________  Email: ________________________
   Signature: ______________________  Date: ___________________

9. MEDICAL MONITOR ASSESSMENT
   □ Agree with investigator assessment
   □ Disagree (explain): ______________________________________

   Signature: ______________________  Date: ___________________

═══════════════════════════════════════════════════════════════════════
```

### 11.3 Contact Information

**24-Hour Safety Reporting:**
- Medical Monitor Phone: [To be assigned]
- Email: safety@sleepcore.study
- Emergency: [Local emergency number]

**Non-Urgent Reporting:**
- Study Coordinator: [Name]
- Email: coordinator@sleepcore.study
- Office hours: Monday-Friday, 09:00-18:00 MSK

---

## Appendix A: MedDRA Preferred Terms for Common AEs

| Common Term | MedDRA PT | SOC |
|-------------|-----------|-----|
| Daytime sleepiness | Somnolence | Nervous system disorders |
| Fatigue | Fatigue | General disorders |
| Difficulty concentrating | Disturbance in attention | Nervous system disorders |
| Headache | Headache | Nervous system disorders |
| Irritability | Irritability | Psychiatric disorders |
| Anxiety increased | Anxiety | Psychiatric disorders |
| Depression symptoms | Depressed mood | Psychiatric disorders |
| Insomnia worsening | Insomnia | Psychiatric disorders |

---

## Appendix B: Flowchart - SAE Reporting

```
                    SAE Detected
                         │
                         ▼
              ┌──────────────────────┐
              │ Investigator assesses│
              │ within 24 hours      │
              └──────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Complete SAE form    │
              │ Submit to Med Monitor│
              └──────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Medical Monitor      │
              │ reviews within 24h   │
              └──────────────────────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
      ┌──────────┐              ┌──────────┐
      │ USADE?   │              │ Not USADE│
      │ Yes      │              │          │
      └──────────┘              └──────────┘
            │                         │
            ▼                         ▼
  ┌──────────────────┐      ┌──────────────────┐
  │ Notify Regulatory│      │ Include in       │
  │ within 7-15 days │      │ periodic reports │
  └──────────────────┘      └──────────────────┘
            │                         │
            └────────────┬────────────┘
                         ▼
              ┌──────────────────────┐
              │ Follow-up until      │
              │ resolution/stability │
              └──────────────────────┘
```

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Principal Investigator | | | |
| Medical Monitor | | | |
| Sponsor Representative | | | |

---

**End of Adverse Event Reporting Plan**
