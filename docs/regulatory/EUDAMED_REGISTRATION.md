# EUDAMED Registration Documentation — SleepCore

**Document Version:** 1.0
**Date:** January 2026
**Compliance:** EU MDR 2017/745, Decision (EU) 2025/2371
**Deadline:** May 28, 2026 (Mandatory EUDAMED)

---

## 1. Executive Summary

This document outlines SleepCore's registration requirements for the European Database on Medical Devices (EUDAMED) in accordance with EU MDR 2017/745. Following the European Commission's confirmation of EUDAMED functionality on November 27, 2025, mandatory registration becomes effective May 28, 2026.

### 1.1 Key Milestones

| Milestone | Deadline | Status |
|-----------|----------|--------|
| Actor Registration (SRN) | May 28, 2026 | Planned |
| Device Registration (New) | May 28, 2026 | Planned |
| Legacy Device Registration | Nov 28, 2026 | N/A (new device) |
| Certificate Upload | May 28, 2027 | Pending certification |

### 1.2 Device Classification

| Parameter | Value |
|-----------|-------|
| Device Name | SleepCore |
| Device Type | Software as a Medical Device (SaMD) |
| Intended Purpose | Digital therapeutic for chronic insomnia using CBT-I |
| Risk Class | Class IIa (per MDR Annex VIII, Rule 11) |
| GMDN Code | 62888 (Software application for sleep disorder management) |
| EMDN Code | V0305 (Software for treatment support) |

---

## 2. Actor Registration

### 2.1 Economic Operator Information

**Manufacturer:**
```
Legal Name: БФ "Другой путь" (Alternative Path Foundation)
Type: Not-for-profit foundation
Country: Russian Federation
Registration: [Pending EU Authorized Representative]

EU Authorized Representative: [TBD - Required for non-EU manufacturer]
Country: [TBD - EU Member State]
```

### 2.2 Required SRN (Single Registration Number)

Prior to any regulatory activity in EUDAMED, the manufacturer must obtain:

1. **Manufacturer SRN** — Primary registration
2. **EU Authorized Representative SRN** — Required for non-EU manufacturers
3. **Importer SRN(s)** — If applicable for distribution channels

### 2.3 Actor Registration Checklist

| Item | Requirement | Status |
|------|-------------|--------|
| Legal entity documentation | Certificate of incorporation, VAT | Pending |
| EU Authorized Representative agreement | Written contract per MDR Art. 11 | Required |
| Person Responsible for Regulatory Compliance | CV, qualifications per MDR Art. 15 | Required |
| Quality Management System certificate | ISO 13485:2016 | In progress |
| Company address verification | Official registration documents | Available |

---

## 3. UDI System

### 3.1 Basic UDI-DI

The Basic UDI-DI is the primary identifier for a device model in EUDAMED.

```
Basic UDI-DI: [To be assigned by issuing entity]
Issuing Entity: GS1 (preferred) or HIBCC/ICCBBA

Structure:
┌────────────────────────────────────────────────────────┐
│  Basic UDI-DI Format (GS1)                             │
├────────────────────────────────────────────────────────┤
│  (01) [GTIN-14]                                        │
│  Example: (01)05412345678900                           │
│                                                        │
│  Device Identifier (DI) portion only                   │
│  No production identifiers (PI) in Basic UDI-DI       │
└────────────────────────────────────────────────────────┘
```

### 3.2 UDI-DI Structure

For software medical devices, the UDI-DI structure follows:

| Element | Description | SleepCore Value |
|---------|-------------|-----------------|
| Device Identifier (DI) | Identifies device labeller and version | [Pending GS1 assignment] |
| Software Version | Required for SaMD | 1.0.0-alpha.4 |
| Labeller | Manufacturer or AR | БФ "Другой путь" |

### 3.3 UDI Carrier Requirements

For software, the UDI must appear in:

1. **User interface** — About/Settings screen
2. **Documentation** — IFU (Instructions for Use)
3. **Package** — If physical media distributed
4. **Website** — Download page

```typescript
// Implementation in SleepCore
interface IUDIDisplay {
  basicUdiDi: string;        // "05412345678900"
  udiDi: string;             // Full UDI-DI with version
  softwareVersion: string;   // "1.0.0-alpha.4"
  manufacturerName: string;  // "БФ Другой путь"
  displayFormat: 'HRI' | 'AIDC';  // Human Readable or Machine Readable
}

// Location: /about or /settings in Telegram bot
// Location: Mini App footer
```

### 3.4 UDI Database Registration Data

Required fields for EUDAMED device registration:

| Field | Value | Notes |
|-------|-------|-------|
| Basic UDI-DI | [Pending] | Main identifier |
| Device Name | SleepCore | Trade name |
| Manufacturer SRN | [Pending] | From Actor registration |
| Risk Class | IIa | Per MDR classification |
| Intended Purpose | Digital therapeutic for chronic insomnia treatment using evidence-based CBT-I protocol | < 2000 chars |
| GMDN Code | 62888 | Software for sleep disorder |
| Clinical Investigation | No | Post-market clinical follow-up planned |
| Device Status | Active | Upon market placement |
| MRI Information | N/A | Software only |
| Single-use | No | Subscription-based |
| Sterile | N/A | Software only |
| Containing Latex | No | Software only |
| Containing DEHP/CMR/ED | No | Software only |

---

## 4. Technical Documentation Summary

### 4.1 Required Documentation per MDR Annex II

| Section | Document | Status |
|---------|----------|--------|
| 1.1 | Device description and specification | Complete |
| 1.2 | Reference to previous generations | N/A (new device) |
| 2 | Information supplied by manufacturer | Complete |
| 3 | Design and manufacturing information | Complete |
| 4 | General safety and performance requirements | In progress |
| 5 | Benefit-risk analysis | In progress |
| 6 | Product verification and validation | In progress |

### 4.2 Software-Specific Documentation (MDR Annex I, Section 17)

| Requirement | Document | Status |
|-------------|----------|--------|
| Software lifecycle processes | IEC 62304 compliance | Complete |
| IT security requirements | Cybersecurity documentation | Complete |
| Verification of compatibility | Platform compatibility matrix | Complete |
| Minimum hardware requirements | System requirements spec | Complete |
| Software version identification | UDI implementation | In progress |
| AI/ML algorithm validation | PCCP, clinical validation | In progress |

---

## 5. Notified Body and Certification

### 5.1 Conformity Assessment Route

For Class IIa SaMD:
- **Route:** MDR Annex IX (QMS) + Annex XI Part A (Product verification)
- **Alternative:** MDR Annex IX (QMS) + Type examination

### 5.2 Notified Body Selection Criteria

| Criterion | Requirement | Notes |
|-----------|-------------|-------|
| MDR designation | Active for Class IIa | Check NANDO database |
| SaMD expertise | Demonstrated competence | Verify scope |
| AI/ML experience | Understanding of PCCP | Preferred |
| Language capability | Russian/English | For documentation review |
| Capacity | Reasonable audit timeline | < 6 months preferred |

### 5.3 Target Notified Bodies

1. **BSI** (UK-0086) — Strong SaMD experience
2. **TÜV SÜD** (0123) — AI/ML expertise
3. **DEKRA** (0124) — European coverage
4. **SGS** (1639) — Multilingual support

---

## 6. Post-Market Surveillance (PMS)

### 6.1 PMS Plan Summary

| Element | Approach |
|---------|----------|
| Complaint handling | In-app feedback, CrisisDetectionService |
| Trend analysis | Automated ISI outcome tracking |
| Clinical follow-up | 12-month PMCF study planned |
| Vigilance reporting | Integration with EUDAMED module (Q2 2027) |
| PSUR frequency | Annually (Class IIa) |

### 6.2 EUDAMED PMS Module Preparation

The Vigilance & PMS module expected Q2 2027. Preparation includes:

- Serious incident reporting procedures
- Field Safety Corrective Action (FSCA) templates
- Periodic Safety Update Report (PSUR) structure
- Trend reporting thresholds

---

## 7. Timeline and Action Items

### 7.1 Critical Path to May 28, 2026

```
Q1 2026 (Jan-Mar):
├── [x] Complete EUDAMED registration documentation
├── [ ] Engage EU Authorized Representative
├── [ ] Initiate Notified Body selection
└── [ ] Complete ISO 13485 gap closure

Q2 2026 (Apr-Jun):
├── [ ] Submit Actor Registration (before May 28)
├── [ ] Obtain SRN
├── [ ] Complete UDI-DI assignment with GS1
├── [ ] Submit device registration (before May 28)
└── [ ] Notified Body audit scheduled

Q3 2026 (Jul-Sep):
├── [ ] Notified Body audit completed
├── [ ] Address audit findings
└── [ ] Certificate expected

Q4 2026 (Oct-Dec):
├── [ ] CE Mark affixed
├── [ ] Market placement (EU)
└── [ ] Begin PMCF activities
```

### 7.2 Responsible Parties

| Task | Owner | Deadline |
|------|-------|----------|
| EU AR Selection | Management | Feb 28, 2026 |
| GS1 Registration | Regulatory | Mar 15, 2026 |
| EUDAMED Actor Registration | EU AR + Regulatory | May 15, 2026 |
| Device Registration | Regulatory | May 25, 2026 |
| Technical File Completion | Engineering + QA | Apr 30, 2026 |

---

## 8. References

1. Regulation (EU) 2017/745 — Medical Device Regulation
2. Commission Decision (EU) 2025/2371 — EUDAMED functionality confirmation
3. MDCG 2019-16 — Guidance on Cybersecurity for medical devices
4. MDCG 2021-24 — Guidance on UDI-DI and EUDAMED
5. ISO 13485:2016 — Medical device QMS
6. IEC 62304:2006+AMD1:2015 — Medical device software lifecycle
7. IEC 82304-1:2016 — Health software product safety

---

**Document Control:**
- Author: SleepCore Regulatory Team
- Reviewed: [Pending]
- Approved: [Pending]
- Next Review: April 2026
