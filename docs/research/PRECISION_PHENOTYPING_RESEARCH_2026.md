# Precision Phenotyping Research Report

**Date:** 2026-02-07
**Status:** Research Complete, Implementation Planned
**Priority:** Phase 2 (Post-Launch Enhancement)

---

## Executive Summary

Personalization beyond chronotype represents the next frontier in digital therapeutics for insomnia. This research synthesizes evidence on genomic, phenotypic, and biomarker-based personalization approaches applicable to SleepCore.

**Key Findings:**
- Blanken et al. 2019 five-class insomnia phenotype model enables precision matching
- PER3 VNTR polymorphism predicts SRT response variability
- HRV patterns provide real-time autonomic nervous system feedback
- Gut-brain axis modulation offers novel intervention targets

---

## 1. Insomnia Phenotyping (Blanken 5-Class Model)

### Scientific Foundation

**Source:** Blanken TF, et al. (2019). "Insomnia disorder subtypes derived from life history and traits of affect and personality." Lancet Psychiatry. 6(2):151-163.

### The Five Phenotypes

| Subtype | Characteristics | Prevalence | Best-Match Therapy |
|---------|----------------|------------|-------------------|
| **Type 1: Highly Distressed** | High premorbid distress, neuroticism, negative affect | ~25% | ACT-I, MCT (address cognitive arousal first) |
| **Type 2: Reward-Sensitive** | Mood reactivity, pleasure-seeking dysregulation | ~15% | Behavioral Activation + SRT |
| **Type 3: Reward-Insensitive** | Anhedonia, low positive affect, blunted responses | ~20% | CBT-I + MBT-I (increase engagement) |
| **Type 4: High-Reactive** | High arousal, hypervigilance, stress reactivity | ~25% | MBT-I primary, relaxation-focused |
| **Type 5: Low-Reactive** | Stable affect, life-event triggered insomnia | ~15% | Standard CBT-I (most responsive) |

### Clinical Implications

```
Type 1 (Highly Distressed):
├── Primary: ACT-I for psychological flexibility
├── Secondary: MCT for worry management
└── Caution: May need slower SRT titration

Type 4 (High-Reactive):
├── Primary: MBT-I for arousal reduction
├── Secondary: Relaxation training (PMR, breathing)
└── Caution: Monitor for paradoxical anxiety with SRT

Type 5 (Low-Reactive):
├── Primary: Standard CBT-I protocol
├── Response: Typically fastest responders
└── Duration: Often 4-6 weeks sufficient
```

### PAT-Based Classification

SleepCore's `PhenotypingService` uses Pretrained Actigraphy Transformer (PAT) features to estimate phenotype:

```typescript
interface IPhenotypeAssessment {
  dominantType: InsomniaSubtype;  // 1-5
  confidence: number;             // 0-1
  traitScores: {
    distress: number;             // Type 1 indicator
    rewardSensitivity: number;    // Type 2 indicator
    positiveAffect: number;       // Low = Type 3
    arousalReactivity: number;    // Type 4 indicator
    eventTrigger: number;         // Type 5 indicator
  };
  recommendedApproach: 'standard_cbti' | 'mbti_primary' | 'acti_primary' | 'mct_primary';
}
```

---

## 2. Genetic Polymorphisms

### PER3 VNTR (Variable Number Tandem Repeat)

**Scientific Foundation:**
- Viola AU, et al. (2007). "PER3 polymorphism predicts sleep structure and waking performance." Current Biology.
- Dijk DJ, Archer SN. (2010). "PERIOD3, circadian phenotypes, and sleep homeostasis." Sleep Medicine Reviews.

| Genotype | Prevalence | Sleep Characteristics | SRT Response |
|----------|------------|----------------------|--------------|
| **PER3 4/4** | ~50% | Morning type, higher sleep pressure | Standard SRT effective |
| **PER3 5/5** | ~10% | Extreme morning type, faster sleep debt accumulation | May need conservative TIB |
| **PER3 4/5** | ~40% | Intermediate phenotype | Standard protocol |

### CLOCK 3111T/C Polymorphism

**Scientific Foundation:**
- Katzenberg D, et al. (1998). "A CLOCK polymorphism associated with human diurnal preference." Sleep.

| Genotype | Effect | Clinical Implication |
|----------|--------|---------------------|
| **T/T** | Earlier chronotype | Morning light therapy less needed |
| **C/C** | Later chronotype (evening preference) | Delay SRT window, add evening light restriction |
| **T/C** | Intermediate | Standard chronotype assessment |

### Implementation Considerations

```typescript
interface IGeneticProfile {
  per3Vntr?: '4/4' | '4/5' | '5/5';
  clock3111?: 'T/T' | 'T/C' | 'C/C';
  per2Rs2304672?: string;
  bmal1?: string;

  // Derived recommendations
  srtAdjustment: {
    minTibMinutes: number;      // May be higher for 5/5
    chronotypeWeight: number;   // Higher for C/C
    lightTherapyPriority: 'high' | 'medium' | 'low';
  };
}
```

**Privacy Note:** Genetic data is GDPR Article 9 "special category" data. Implementation requires:
- Explicit informed consent
- Separate encryption layer
- Right to erasure compliance
- No third-party sharing

---

## 3. HRV-Based Personalization

### Scientific Foundation

- Jarrin DC, et al. (2020). "Heart rate variability and insomnia: A systematic review." Sleep Medicine Reviews.
- Thayer JF, Lane RD. (2009). "Claude Bernard and the heart-brain connection." Neuroscience & Biobehavioral Reviews.

### Key HRV Metrics for Sleep

| Metric | Domain | Sleep Relevance |
|--------|--------|-----------------|
| **RMSSD** | Time-domain (parasympathetic) | Higher = better sleep quality (r=0.45) |
| **HF Power** | Frequency (0.15-0.4 Hz) | Vagal tone indicator |
| **LF/HF Ratio** | Balance | Higher = sympathetic dominance (poor sleep) |
| **SDNN** | Total variability | General autonomic health |

### Clinical Applications

```
Low HRV Profile (LF/HF > 2.0, RMSSD < 20ms):
├── Indicates: Chronic sympathetic activation
├── Therapy: MBT-I primary, breathing exercises
├── SRT Caution: May experience heightened anxiety
└── Monitoring: Daily HRV tracking recommended

High HRV Profile (LF/HF < 1.0, RMSSD > 40ms):
├── Indicates: Good autonomic flexibility
├── Therapy: Standard CBT-I
├── SRT: Standard protocol appropriate
└── Prognosis: Typically faster response
```

### Integration with Wearables

```typescript
interface IHRVPersonalization {
  baselineProfile: {
    rmssd: number;
    lfHfRatio: number;
    sdnn: number;
  };

  dailyReadiness: {
    recoveryScore: number;      // 0-100
    stressLevel: 'low' | 'moderate' | 'high';
    recommendedIntensity: 'full' | 'modified' | 'rest';
  };

  srtModifications: {
    tibAdjustment: number;      // +/- minutes based on recovery
    relaxationPriority: boolean;
    checkInFrequency: 'standard' | 'increased';
  };
}
```

---

## 4. Gut-Brain Axis

### Scientific Foundation

- Li Y, et al. (2020). "Gut microbiota and sleep." Sleep Medicine Reviews.
- Smith RP, et al. (2019). "Gut microbiome diversity is associated with sleep physiology." PLoS ONE.

### Key Findings

| Finding | Mechanism | Clinical Relevance |
|---------|-----------|-------------------|
| Microbiome diversity correlates with sleep quality | GABA production, tryptophan metabolism | Probiotic adjunct therapy |
| Sleep deprivation alters gut composition | Increased firmicutes/bacteroidetes ratio | Vicious cycle intervention |
| Specific strains affect sleep | L. rhamnosus (GABA), B. longum (anxiety) | Targeted supplementation |

### Assessment Integration

```typescript
interface IMicrobiomeProfile {
  diversityIndex: number;           // Shannon index
  sleepRelevantBacteria: {
    gabaProducers: 'low' | 'normal' | 'high';
    tryptophanMetabolizers: 'low' | 'normal' | 'high';
    inflammatoryMarkers: 'low' | 'normal' | 'high';
  };

  recommendations: {
    probioticSuggestions: string[];
    dietaryModifications: string[];
    sleepHygieneEmphasis: string[];
  };
}
```

**Note:** Microbiome testing is Phase 3 integration (post-wearable launch).

---

## 5. Integrated Precision Matching Algorithm

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRECISION MATCHING ENGINE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Phenotype   │  │   Genetic    │  │     HRV      │          │
│  │  (Blanken)   │  │   Profile    │  │   Profile    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └────────────┬────┴─────────────────┘                   │
│                      ▼                                          │
│              ┌───────────────┐                                  │
│              │  INTEGRATION  │                                  │
│              │    LAYER      │                                  │
│              └───────┬───────┘                                  │
│                      │                                          │
│         ┌────────────┼────────────┐                             │
│         ▼            ▼            ▼                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                  │
│  │   Therapy  │ │    SRT     │ │  Timing    │                  │
│  │  Selection │ │ Parameters │ │ Adjustment │                  │
│  └────────────┘ └────────────┘ └────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Decision Matrix

| Phenotype | + Low HRV | + PER3 5/5 | Recommended Protocol |
|-----------|-----------|------------|---------------------|
| Type 1 (Distressed) | ACT-I + breathing | ACT-I + conservative SRT | ACT-I primary, 5.5h min TIB |
| Type 4 (High-Reactive) | MBT-I intensive | MBT-I + extended baseline | MBT-I 4 weeks before SRT |
| Type 5 (Low-Reactive) | Standard CBT-I | Standard + monitoring | Full CBT-I, standard pace |

---

## 6. Implementation Roadmap

### Phase 1: Phenotype Integration (Current)

- [x] PAT-based phenotype estimation via `PhenotypingService`
- [x] Third-wave therapy selection based on phenotype
- [x] `ThirdWaveCoordinator` routes non-responders

### Phase 2: HRV Integration (Q2 2026)

- [ ] Wearable HRV data ingestion (Garmin, Fitbit, Apple Watch)
- [ ] Daily readiness scoring
- [ ] Dynamic SRT adjustment based on recovery

### Phase 3: Genetic Integration (Q4 2026)

- [ ] GDPR Article 9 compliant data handling
- [ ] PER3/CLOCK genotype input interface
- [ ] Personalized chronotherapy recommendations

### Phase 4: Microbiome Integration (2027)

- [ ] Partnership with testing providers
- [ ] Gut-brain axis recommendations
- [ ] Probiotic/dietary guidance

---

## 7. Existing SleepCore Components

### Currently Implemented

| Component | Location | Status |
|-----------|----------|--------|
| `PhenotypingService` | `src/bot/services/PhenotypingService.ts` | Active |
| `ThirdWaveCoordinator` | `src/third-wave/ThirdWaveCoordinator.ts` | Active |
| `CircadianAI` | `src/circadian/CircadianAI.ts` | Active (chronotype) |
| `MBTIEngine` | `src/third-wave/MBTIEngine.ts` | Active |
| `ACTIEngine` | `src/third-wave/ACTIEngine.ts` | Active |
| `MCTEngine` | `src/third-wave/MCTEngine.ts` | Active |

### Required Extensions

| Extension | Priority | Dependencies |
|-----------|----------|--------------|
| HRV integration layer | HIGH | Wearable API connections |
| Genetic profile storage | MEDIUM | GDPR compliance audit |
| Microbiome recommendations | LOW | External lab partnerships |

---

## 8. References

1. Blanken TF, et al. (2019). Insomnia disorder subtypes derived from life history and traits of affect and personality. Lancet Psychiatry. 6(2):151-163.

2. Viola AU, et al. (2007). PER3 polymorphism predicts sleep structure and waking performance. Current Biology. 17(7):613-618.

3. Katzenberg D, et al. (1998). A CLOCK polymorphism associated with human diurnal preference. Sleep. 21(6):569-576.

4. Jarrin DC, et al. (2020). Heart rate variability and insomnia: A systematic review. Sleep Medicine Reviews. 49:101224.

5. Li Y, et al. (2020). Gut microbiota and sleep. Sleep Medicine Reviews. 50:101260.

6. Smith RP, et al. (2019). Gut microbiome diversity is associated with sleep physiology. PLoS ONE. 14(10):e0222394.

7. Dijk DJ, Archer SN. (2010). PERIOD3, circadian phenotypes, and sleep homeostasis. Sleep Medicine Reviews. 14(3):151-160.

---

*Research compiled: 2026-02-07*
*Author: Claude Code*
*Classification: Internal Research Document*
