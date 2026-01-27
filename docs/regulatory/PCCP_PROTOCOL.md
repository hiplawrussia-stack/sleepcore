# Predetermined Change Control Plan (PCCP) — SleepCore

**Document Version:** 1.0
**Date:** January 2026
**Compliance:** FDA PCCP Guidance (Sept 2023), EU MDR 2017/745 Article 120
**Applicable To:** AI/ML-enabled SleepCore components

---

## 1. Executive Summary

This Predetermined Change Control Plan (PCCP) defines the framework for managing modifications to SleepCore's AI/ML components without requiring separate premarket submissions, while maintaining safety and effectiveness throughout the product lifecycle.

### 1.1 Scope

This PCCP applies to the following AI/ML components:

| Component | Function | Algorithm Type |
|-----------|----------|----------------|
| **POMDP Personalization** | Treatment sequencing | Reinforcement Learning |
| **Thompson Sampling** | Intervention selection | Bayesian Optimization |
| **PLRNN Digital Twin** | Sleep state prediction | Recurrent Neural Network |
| **PAT Adapter** | Actigraphy phenotyping | Transformer (Foundation Model) |
| **Crisis Detection** | Safety monitoring | Rule-based + ML hybrid |

### 1.2 PCCP Principles

1. **Bounded Modifications** — Changes must stay within predefined performance boundaries
2. **Continuous Validation** — Real-world performance monitoring validates modifications
3. **Safety Preservation** — Safety-critical components have stricter change limits
4. **Transparency** — All modifications logged and traceable

---

## 2. SaMD Pre-Specifications (SPS)

The SaMD Pre-Specifications define WHAT aspects of the AI/ML components are intended to change.

### 2.1 Modifiable Aspects

#### 2.1.1 POMDP Personalization Engine

| Aspect | Current Value | Permitted Change Range | Rationale |
|--------|---------------|------------------------|-----------|
| Discount factor (γ) | 0.95 | 0.90 – 0.99 | Standard RL range |
| Belief update rate | 0.1 | 0.05 – 0.2 | Affects adaptation speed |
| State space dimensions | 8 | 6 – 12 | Feature expansion/contraction |
| Action space | 12 actions | Add/remove ≤3 | New intervention types |
| Reward weights | Clinical defined | ±25% per weight | Outcome prioritization |

#### 2.1.2 Thompson Sampling Module

| Aspect | Current Value | Permitted Change Range | Rationale |
|--------|---------------|------------------------|-----------|
| Prior parameters (α, β) | (1, 1) | (0.5, 0.5) – (2, 2) | Exploration/exploitation |
| Confidence threshold | 0.95 | 0.90 – 0.99 | Decision certainty |
| Exploration bonus | 0.1 | 0 – 0.2 | Novel intervention testing |

#### 2.1.3 PLRNN Sleep Prediction

| Aspect | Current Value | Permitted Change Range | Rationale |
|--------|---------------|------------------------|-----------|
| Hidden units | 64 | 32 – 128 | Model capacity |
| Sequence length | 7 days | 5 – 14 days | Input window |
| Learning rate | 0.001 | 0.0001 – 0.01 | Training dynamics |
| Dropout rate | 0.2 | 0.1 – 0.4 | Regularization |
| Retraining frequency | Monthly | Weekly – Quarterly | Model freshness |

#### 2.1.4 PAT Foundation Model

| Aspect | Current Value | Permitted Change Range | Rationale |
|--------|---------------|------------------------|-----------|
| Model variant | PAT-M | PAT-S, PAT-M, PAT-L | Architecture selection |
| Ensemble weight (PAT) | 40% | 20% – 60% | Prediction blending |
| Phenotype threshold | 0.5 | 0.3 – 0.7 | Classification sensitivity |
| Fine-tuning epochs | 0 (frozen) | 0 – 10 | Domain adaptation |

### 2.2 Non-Modifiable Aspects (Locked)

The following aspects require new regulatory submission if changed:

| Component | Locked Aspect | Rationale |
|-----------|---------------|-----------|
| **All** | Intended use/indications | Regulatory scope |
| **SRT Engine** | MIN_TIB = 5 hours | Patient safety |
| **Crisis Detection** | Detection always ON | Life safety |
| **ISI Assessment** | Cutoff thresholds | Validated instrument |
| **All AI/ML** | Output interpretation | Clinical meaning |
| **POMDP** | Safety action veto | Risk mitigation |

---

## 3. Algorithm Change Protocol (ACP)

The Algorithm Change Protocol defines HOW modifications will be implemented and verified.

### 3.1 Change Categories

#### Category A: Parameter Tuning (Low Risk)
- Hyperparameter adjustments within SPS bounds
- Example: Adjusting learning rate from 0.001 to 0.0005
- **Approval:** Automated validation + Engineering review
- **Timeline:** Continuous deployment allowed

#### Category B: Architecture Modification (Medium Risk)
- Model structure changes within SPS bounds
- Example: Increasing PLRNN hidden units from 64 to 96
- **Approval:** Clinical review + Validation study
- **Timeline:** Quarterly release cycle

#### Category C: Algorithm Replacement (High Risk)
- Replacing algorithm with new approach
- Example: Switching from PLRNN to Transformer for prediction
- **Approval:** Full PCCP review + May require new submission
- **Timeline:** Annual review cycle

### 3.2 Modification Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AI/ML MODIFICATION WORKFLOW                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. PROPOSAL                                                            │
│     ┌──────────────────────────────────────────────────────────────┐   │
│     │ • Identify modification need (performance data, research)     │   │
│     │ • Classify change category (A/B/C)                           │   │
│     │ • Document expected benefits and risks                        │   │
│     └──────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  2. SPS VERIFICATION                                                    │
│     ┌──────────────────────────────────────────────────────────────┐   │
│     │ • Verify change within SPS bounds                             │   │
│     │ • If outside bounds → STOP → New submission required          │   │
│     │ • Document SPS compliance evidence                            │   │
│     └──────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  3. DEVELOPMENT & TESTING                                               │
│     ┌──────────────────────────────────────────────────────────────┐   │
│     │ • Implement modification in development environment           │   │
│     │ • Unit tests: Algorithm correctness                          │   │
│     │ • Integration tests: System compatibility                     │   │
│     │ • Performance tests: Speed, memory                           │   │
│     └──────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  4. VALIDATION                                                          │
│     ┌──────────────────────────────────────────────────────────────┐   │
│     │ • Retrospective validation: Historical data performance       │   │
│     │ • Prospective validation: Shadow mode deployment              │   │
│     │ • Safety validation: Red team testing                        │   │
│     │ • Verify performance bounds (Section 4)                       │   │
│     └──────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  5. APPROVAL                                                            │
│     ┌──────────────────────────────────────────────────────────────┐   │
│     │ • Category A: Automated + Engineering sign-off               │   │
│     │ • Category B: + Clinical review + QA sign-off                │   │
│     │ • Category C: + PCCP Committee + Executive approval          │   │
│     └──────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  6. DEPLOYMENT                                                          │
│     ┌──────────────────────────────────────────────────────────────┐   │
│     │ • Staged rollout (5% → 25% → 50% → 100%)                     │   │
│     │ • Real-time monitoring dashboard                              │   │
│     │ • Rollback capability verified                               │   │
│     │ • Documentation updated                                       │   │
│     └──────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  7. POST-DEPLOYMENT MONITORING                                          │
│     ┌──────────────────────────────────────────────────────────────┐   │
│     │ • Performance metrics vs. bounds                              │   │
│     │ • Safety signal detection                                     │   │
│     │ • User feedback analysis                                      │   │
│     │ • 30-day post-deployment report                              │   │
│     └──────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Validation Requirements by Category

| Validation Type | Category A | Category B | Category C |
|-----------------|------------|------------|------------|
| Unit tests | Required | Required | Required |
| Integration tests | Required | Required | Required |
| Retrospective study | 100 users | 500 users | 1000+ users |
| Prospective shadow mode | 7 days | 14 days | 30 days |
| Clinical review | Optional | Required | Required |
| Safety red team | Automated | Manual | Formal |
| Rollback test | Required | Required | Required |

---

## 4. Performance Bounds

### 4.1 Clinical Effectiveness Bounds

Modifications must maintain performance within these bounds:

| Metric | Baseline | Lower Bound | Upper Bound | Measurement |
|--------|----------|-------------|-------------|-------------|
| ISI Reduction | 8 points | 6 points | — | 8-week outcome |
| Response Rate | 60% | 50% | — | ≥8 point ISI drop |
| Remission Rate | 40% | 30% | — | ISI ≤7 at 8 weeks |
| Sleep Efficiency | +15% | +10% | — | Diary-based |
| Treatment Adherence | 70% | 60% | — | Engagement rate |

### 4.2 Safety Bounds

| Metric | Threshold | Action if Breached |
|--------|-----------|-------------------|
| Crisis Detection Sensitivity | ≥95% | Immediate rollback |
| False Negative Rate (Crisis) | <1% | Immediate rollback |
| Adverse Event Rate | <5% | Investigation required |
| TIB Recommendation Errors | 0 (<5h) | Immediate rollback |
| User Dropout (Safety) | <10% | Investigation required |

### 4.3 Technical Performance Bounds

| Metric | Requirement | Measurement |
|--------|-------------|-------------|
| Prediction Latency | <500ms p99 | API monitoring |
| Model Inference Time | <100ms | Profiling |
| Memory Usage | <512MB | Container metrics |
| Error Rate | <0.1% | Sentry monitoring |
| Availability | >99.9% | Uptime monitoring |

---

## 5. Real-World Performance Monitoring

### 5.1 Continuous Monitoring Metrics

```typescript
interface IPCCPMonitoring {
  // Clinical Metrics (Weekly aggregation)
  clinicalMetrics: {
    avgIsiReduction: number;        // Target: ≥6
    responseRate: number;            // Target: ≥50%
    remissionRate: number;           // Target: ≥30%
    adherenceRate: number;           // Target: ≥60%
    adverseEventRate: number;        // Threshold: <5%
  };

  // Safety Metrics (Real-time)
  safetyMetrics: {
    crisisDetectionCount: number;
    crisisEscalationCount: number;
    falseNegativeEstimate: number;   // Threshold: <1%
    tibViolationCount: number;       // Must be 0
  };

  // Technical Metrics (Real-time)
  technicalMetrics: {
    predictionLatencyP99: number;    // Threshold: <500ms
    errorRate: number;                // Threshold: <0.1%
    modelDriftScore: number;         // Threshold: <0.3
  };

  // Comparison
  priorPeriodComparison: {
    clinicalDelta: number;
    statisticalSignificance: number;
  };
}
```

### 5.2 Drift Detection

| Drift Type | Detection Method | Threshold | Action |
|------------|------------------|-----------|--------|
| Data Drift | KL divergence on inputs | >0.5 | Alert + investigation |
| Concept Drift | Performance degradation | >10% | Model retraining trigger |
| Label Drift | Outcome distribution shift | >15% | Clinical review |

### 5.3 Monitoring Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  SLEEPCORE AI/ML PERFORMANCE DASHBOARD                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CLINICAL EFFECTIVENESS (Last 30 days)                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ISI Reduction: [████████████████░░░░] 7.2 pts (≥6 ✓)     │ │
│  │ Response Rate: [██████████████░░░░░░] 58% (≥50% ✓)       │ │
│  │ Remission:     [███████████░░░░░░░░░] 35% (≥30% ✓)       │ │
│  │ Adherence:     [█████████████░░░░░░░] 65% (≥60% ✓)       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  SAFETY METRICS (Last 7 days)                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Crisis Detections: 12    Escalations: 3                   │ │
│  │ Estimated False Neg: 0.2% (<1% ✓)                         │ │
│  │ TIB Violations: 0 (Required: 0 ✓)                         │ │
│  │ Adverse Events: 2 (Rate: 0.8% <5% ✓)                      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  MODEL HEALTH                                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ POMDP: ● Active | Drift: 0.12 | Last update: 2 days ago  │ │
│  │ PLRNN: ● Active | Drift: 0.08 | Last update: 5 days ago  │ │
│  │ PAT:   ● Active | Drift: 0.05 | Version: PAT-M           │ │
│  │ Thompson: ● Active | Exploration: 8%                      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  RECENT MODIFICATIONS                                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 2026-01-15: PLRNN learning rate: 0.001 → 0.0008 (Cat A)  │ │
│  │ 2026-01-10: Ensemble weights: PAT 35% → 40% (Cat A)      │ │
│  │ 2025-12-20: POMDP discount: 0.94 → 0.95 (Cat A)          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Rollback Procedures

### 6.1 Automatic Rollback Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| Safety Bound Breach | Any safety metric exceeds threshold | Immediate auto-rollback |
| Error Rate Spike | >1% error rate for 5 minutes | Auto-rollback |
| Performance Degradation | >20% ISI reduction drop | Alert + manual review |
| System Instability | >5% users affected by errors | Auto-rollback |

### 6.2 Rollback Procedure

```
1. DETECTION
   ├── Automated monitoring detects trigger condition
   └── Alert sent to on-call engineer + clinical team

2. ASSESSMENT (within 15 minutes)
   ├── Confirm trigger condition
   ├── Assess user impact scope
   └── Determine rollback scope (component vs. full)

3. EXECUTION
   ├── Deploy previous stable version
   ├── Clear model cache/state if needed
   ├── Verify rollback success
   └── Monitor stabilization

4. NOTIFICATION
   ├── Internal incident report created
   ├── Affected users notified if clinical impact
   └── Regulatory notification if required

5. ROOT CAUSE ANALYSIS
   ├── Investigate modification failure
   ├── Document lessons learned
   └── Update PCCP if needed
```

### 6.3 Version Control for AI/ML

All model versions maintained with full rollback capability:

```
models/
├── pomdp/
│   ├── v1.0.0/           # Initial release
│   ├── v1.0.1/           # Current production
│   └── v1.1.0-beta/      # Staging
├── plrnn/
│   ├── v2.0.0/
│   └── v2.1.0/           # Current production
└── pat/
    ├── PAT-S/
    ├── PAT-M/            # Current production
    └── PAT-L/
```

---

## 7. Documentation and Records

### 7.1 Required Documentation per Modification

| Document | Category A | Category B | Category C |
|----------|------------|------------|------------|
| Modification Request Form | ✓ | ✓ | ✓ |
| SPS Compliance Checklist | ✓ | ✓ | ✓ |
| Validation Protocol | — | ✓ | ✓ |
| Validation Report | Automated | Full | Full |
| Clinical Review Record | — | ✓ | ✓ |
| Approval Record | ✓ | ✓ | ✓ |
| Deployment Log | ✓ | ✓ | ✓ |
| Post-Deployment Report | 7 days | 30 days | 90 days |

### 7.2 Record Retention

- All PCCP records retained for device lifetime + 10 years
- Version-controlled in regulatory document repository
- Audit trail maintained for all changes

### 7.3 Annual PCCP Review

Annual review includes:
- Performance against bounds (full year data)
- Modification history and outcomes
- SPS appropriateness reassessment
- Bound adjustments if justified by evidence
- Lessons learned integration

---

## 8. Regulatory Reporting

### 8.1 FDA Reporting Requirements

| Modification Category | FDA Notification |
|----------------------|------------------|
| Category A | Annual summary in periodic report |
| Category B | Include in next periodic report |
| Category C | May require 510(k) if outside SPS |

### 8.2 EU MDR Reporting

| Modification Category | Notified Body Notification |
|----------------------|---------------------------|
| Category A | Annual surveillance summary |
| Category B | Notify within 30 days |
| Category C | Requires NB assessment |

---

## 9. PCCP Governance

### 9.1 PCCP Committee

| Role | Responsibility |
|------|----------------|
| Clinical Lead | Clinical safety and effectiveness review |
| Engineering Lead | Technical feasibility and validation |
| QA/RA Lead | Regulatory compliance and documentation |
| Data Science Lead | Algorithm performance and monitoring |

### 9.2 Decision Authority

| Decision | Authority Level |
|----------|-----------------|
| Category A approval | Engineering Lead |
| Category B approval | Clinical Lead + QA/RA Lead |
| Category C approval | Full PCCP Committee + Executive |
| Emergency rollback | Any Committee member |
| SPS modification | Full Committee + Regulatory submission |

---

## 10. References

1. FDA Guidance: Marketing Submission Recommendations for a Predetermined Change Control Plan for AI/ML-Enabled Device Software Functions (Sept 2023)
2. IMDRF/AIMD WG/N67: Machine Learning-enabled Medical Devices: Key Terms and Definitions (2022)
3. EU MDR 2017/745 Article 120 — Significant changes
4. ISO 13485:2016 — Design and development changes
5. IEC 62304:2006+AMD1:2015 — Software maintenance
6. GAMP 5: A Risk-Based Approach to Compliant GxP Computerized Systems

---

**Document Control:**
- Author: SleepCore AI/ML Team + Regulatory
- Clinical Review: [Pending]
- QA Review: [Pending]
- Approved: [Pending]
- Next Review: January 2027
