# SleepCore - Research Findings

**Date**: December 2025
**Status**: Pre-development Research Complete

---

## Executive Summary

This document summarizes research findings that inform the SleepCore architecture - a digital therapeutic for insomnia treatment based on CBT-I principles, built on the CogniCore Engine platform.

---

## 1. Market Analysis

### Market Size & Growth

| Metric | Value | Source |
|--------|-------|--------|
| Global DTx Sleep Market (2024) | $2.34B | Growth Market Reports |
| Projected Market (2033) | $12.06B | Growth Market Reports |
| CAGR | 18.7% | Growth Market Reports |
| Sleep Coaching Market (2024) | $1.4B | GM Insights |
| Projected (2034) | $5.1B | GM Insights |

### Key Competitors

| Product | Company | FDA Status | Pricing | Key Features |
|---------|---------|------------|---------|--------------|
| **SleepioRx** | Big Health | FDA Cleared (Aug 2024) | $100-450 | 26 RCTs, 76% efficacy, NICE recommended |
| **Somryst** | Pear Therapeutics | FDA Authorized | $899 | Prescription DTx, 90-day treatment |
| **CBT-i Coach** | VA/DoD | Free | Free | Basic CBT-I, no personalization |
| **Calm/Headspace** | - | Wellness | Subscription | Meditation-focused, not clinical |

### Competitive Advantage Opportunity

- Sleepio: Strong evidence but expensive ($100-450)
- Somryst: Very expensive ($899)
- Free apps: Lack personalization and clinical rigor
- **Gap**: Affordable, AI-personalized, evidence-based CBT-I with CogniCore Engine

---

## 2. Scientific Foundation

### CBT-I Core Components (Evidence-Based)

Research shows effectiveness ranking (meta-analysis):

| Component | Improvement Odds Ratio | Mechanism |
|-----------|------------------------|-----------|
| **Cognitive Restructuring** | 1.68 | Changes perception/beliefs about sleep |
| **Sleep Restriction** | 1.49 | Manipulates sleep homeostasis |
| **Stimulus Control** | 1.43 | Attenuates sleep effort, reconditioning |
| **Sleep Hygiene** | Supportive | Environmental optimization |
| **Relaxation Training** | Supportive | Reduces arousal |

### Clinical Efficacy (Sleepio Benchmark)

- **76%** of patients achieve healthy sleep
- **54%** reduction in time to fall asleep
- **62%** less time awake at night
- **45%** better next-day functioning
- **3-year** sustained benefits

### Key Scientific References

- Espie et al. (2012) - Landmark RCT for digital CBT-I
- Freeman et al. (2017) - OASIS RCT, mental health comorbidities
- Morin et al. - CBT-I meta-analyses
- Perlis & Posner - Behavioral sleep medicine protocols

---

## 3. Technology Trends 2025

### AI-Powered Features

| Feature | Implementation |
|---------|----------------|
| **Sleep Stage Detection** | ML on wearable data (HR, HRV, motion) |
| **Personalization** | Transfer learning, individual fine-tuning |
| **Circadian Forecasting** | Light exposure + timing optimization |
| **Digital Twin** | Real-time state prediction and intervention |
| **Anomaly Detection** | Early warning for sleep disorders |

### Wearable Integration

- **Dominant devices**: Oura Ring, Apple Watch, Fitbit, WHOOP, Garmin
- **Key signals**: Heart rate, HRV, skin temperature, SpO2, motion
- **EEG headbands**: Emerging for precise sleep staging

### Smart Environment

- Temperature-regulating mattresses
- Smart lighting (circadian-aligned)
- Ambient sound optimization

---

## 4. Regulatory Landscape

### FDA Pathways

| Pathway | Use Case | Timeline | Requirements |
|---------|----------|----------|--------------|
| **General Wellness** | Sleep support, no medical claims | No clearance needed | Low risk, no diagnosis |
| **510(k)** | Predicate exists | ~152 days | Substantial equivalence |
| **De Novo** | Novel device | ~262 days | Safety & effectiveness data |

### Wellness vs Medical Device

**Wellness (No FDA):**
- "Sleep support", "relaxation", "stress management"
- Cannot use "insomnia" (medical condition)
- Low risk, non-invasive

**Medical Device (FDA Required):**
- Diagnoses or treats insomnia
- Uses term "insomnia" in claims
- Prescription digital therapeutic (PDT)

### Recommended Strategy for SleepCore

**Phase 1**: Launch as General Wellness product
- Use "sleep support" language
- No diagnosis claims
- Faster time-to-market

**Phase 2**: Pursue FDA 510(k) clearance
- Predicate: SleepioRx
- Enables "insomnia treatment" claims
- Medicare/insurance reimbursement (2025+)

### EU MDR Considerations

- Class IIa likely for wellness
- Class IIb for medical device claims
- Need Notified Body assessment
- CER (Clinical Evaluation Report) required

---

## 5. Architecture Implications

### CogniCore Engine Integration

| CogniCore Module | SleepCore Application |
|------------------|----------------------|
| State Vector (S_t) | Extended with ISleepState |
| Belief Update | Bayesian sleep quality inference |
| Temporal Echo | Sleep pattern prediction |
| Intervention Optimizer | CBT-I component selection |
| Safety Envelope | Crisis detection (insomnia + depression) |
| Digital Twin | Sleep state simulation |
| Explainability | "Why this recommendation" |

### SleepCore-Specific Modules

| Module | Purpose |
|--------|---------|
| **Sleep Diary** | Structured input, sleep efficiency calculation |
| **CBT-I Engine** | 5-component delivery system |
| **Circadian Module** | Light exposure, chronotype adaptation |
| **Wearable Bridge** | Apple Health, Google Fit, Oura API |
| **Sleep Stage Detector** | ML-based staging from wearables |

### Personalization Strategy

1. **Initial Assessment**: ISI (Insomnia Severity Index), chronotype
2. **Continuous Learning**: Transfer learning on individual data
3. **Adaptive Content**: Age, preferences, response patterns
4. **Circadian Optimization**: Individual chronotype-aligned schedules

---

## 6. Success Metrics

### Clinical Outcomes (Target)

| Metric | Target | Benchmark (Sleepio) |
|--------|--------|---------------------|
| ISI Reduction | >7 points | 6-8 points |
| Sleep Efficiency | >85% | 85%+ |
| Sleep Onset Latency | <20 min | 54% reduction |
| WASO | <30 min | 62% reduction |
| Remission Rate | >50% | 76% |

### Engagement Metrics

| Metric | Target |
|--------|--------|
| Completion Rate | >60% |
| Daily Diary Adherence | >80% |
| Week 1 Retention | >70% |
| 90-Day Completion | >40% |

---

## 7. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low engagement | High | High | Gamification, AI personalization |
| Regulatory issues | Medium | High | Start wellness, plan FDA path |
| Competition | High | Medium | CogniCore differentiation |
| Clinical efficacy | Low | High | Evidence-based CBT-I protocol |
| Wearable integration | Medium | Medium | Prioritize Apple Health/Google Fit |

---

## 8. Go-to-Market Strategy

### Phase 1: MVP (Wellness)
- Core CBT-I modules
- Sleep diary
- Basic personalization
- Mobile app (iOS/Android)

### Phase 2: Enhanced
- Wearable integration
- AI-powered personalization
- Circadian optimization

### Phase 3: Clinical
- FDA 510(k) clearance
- Prescription pathway
- B2B (employers, insurers)

---

## Sources

1. [Growth Market Reports - DTx Sleep Market](https://growthmarketreports.com/report/digital-therapeutics-sleep-disorder-market)
2. [Big Health - SleepioRx FDA Clearance](https://www.bighealth.com/news/us-fda-grants-clearance-for-sleepiorx)
3. [PMC - CBT-I Primer](https://pmc.ncbi.nlm.nih.gov/articles/PMC10002474/)
4. [FDA - General Wellness Guidance](https://www.fda.gov/media/90652/download)
5. [JMIR - mHealth Apps for Sleep](https://www.jmir.org/2021/2/e24607/)
6. [npj Digital Medicine - Sleep Data Revolution](https://www.nature.com/articles/s41746-020-0244-4)
7. [Big Health Research](https://www.bighealth.com/research)

---

*SleepCore | CogniCore Platform | December 2025*
