# Hardcoded Clinical Content Audit (IEC 62304 §13.4)

**Date:** 2026-02-07
**Auditor:** Claude Code
**Standard:** CLAUDE.md §13.4, IEC 62304 §5.1.6
**Status:** COMPLETE

## Executive Summary

| Location | Status | Severity |
|----------|--------|----------|
| TherapyCommand.ts | HARDCODED | P1-HIGH |
| TodayCommand.ts | FIXED | OK |
| main.ts | MINIMAL | P3-LOW |
| ClinicalContent.ts | CORRECT | Reference |

**Key Finding:** TherapyCommand.ts contains ~400 lines of hardcoded clinical content that should be centralized in ClinicalContent.ts

---

## 1. ClinicalContent.ts (REFERENCE IMPLEMENTATION)

**File:** `src/modules/content/clinical/ClinicalContent.ts`
**Lines:** 100+
**Status:** CORRECT

This is the centralized clinical content repository per CLAUDE.md §13.4:

```typescript
// Correct pattern
export const CBTI_COMPONENT_HELP: Readonly<Record<CBTIComponent, ICBTIComponentHelp>> = {
  sleep_restriction: {
    component: 'sleep_restriction',
    helpMessage: 'Ограничение сна может быть сложным...',
    tips: [...],
    commonChallenges: [...],
    encouragement: '...'
  },
  // ...
};
```

**Features:**
- Typed interfaces for all content
- Scientific references (Spielman 1987, Bootzin 1972)
- Supports future i18n/localization
- Clear separation of code and clinical content

---

## 2. TodayCommand.ts (FIXED)

**File:** `src/bot/commands/TodayCommand.ts`
**Status:** COMPLIANT

**Previous Issue:** Line 596 referenced as hardcoded in Phase 1 audit

**Current Implementation (line 554-556):**
```typescript
// Use centralized clinical content (CLAUDE.md §13.4)
const component = intervention?.component || 'sleep_restriction';
const help = getCBTIComponentHelp(component);
```

**Verdict:** Correctly uses centralized `getCBTIComponentHelp()` from ClinicalContent.

---

## 3. TherapyCommand.ts (HARDCODED)

**File:** `src/bot/commands/TherapyCommand.ts`
**Lines:** 4295 total
**Status:** VIOLATION of §13.4

### 3.1 CORE_SESSIONS Definition (Lines 110-270)

Hardcoded session structure with clinical content:

```typescript
const CORE_SESSIONS: ICoreSession[] = [
  {
    id: 'overview',
    weekNumber: 1,
    titleRu: 'Введение в КПТ-И',
    objectives: [
      'Понять модель бессонницы (3P)',       // Hardcoded
      'Узнать компоненты КПТ-И',              // Hardcoded
    ],
    components: [
      'Модель бессонницы Spielman (3P)',     // Hardcoded
    ],
    homework: [
      'Вести дневник сна каждый день',        // Hardcoded
    ],
  },
  // ... 6 more sessions
];
```

**Count:** ~150 lines of hardcoded session metadata

### 3.2 contentMap (Lines 3607-3767)

Massive hardcoded educational content:

```typescript
private getCoreContent(core: ICoreSession): string {
  const contentMap: Record<TherapyCore, string> = {
    overview: `
*🧠 Что такое инсомния?*

Инсомния — это не просто "плохой сон"...

*📐 3P-модель Spielman*

1️⃣ *Predisposing* (предрасполагающие факторы):
   Генетика, темперамент, склонность к тревоге
...
    `,
    sleep_behavior_1: `
*🛏️ Ограничение сна (Sleep Restriction Therapy)*

*Как это работает:*
1. Рассчитываем среднее время сна (TST) по дневнику
2. Устанавливаем TIB = TST + 30 мин
3. Минимум: *5.5 часов* (безопасность)
...
    `,
    // ... 4 more cores (~160 lines)
  };
}
```

**Count:** ~160 lines of hardcoded clinical education

### 3.3 exerciseMap (Lines 3773-3900+)

Hardcoded exercises for each therapy component:

```typescript
private getCoreExercise(core: ICoreSession): string {
  const exerciseMap: Record<TherapyCore, string> = {
    overview: `
*📝 Упражнение: Анализ вашей инсомнии по 3P*
...
    `,
    sleep_behavior_1: `
*📊 Упражнение: Расчёт вашего окна сна*
...
    `,
  };
}
```

**Count:** ~130 lines of hardcoded exercises

### 3.4 Inline Clinical Thresholds

Scattered throughout the file:

| Line | Content | Issue |
|------|---------|-------|
| 176 | `Корректировка TIB (+15 мин при SE ≥ 85%)` | Threshold in UI text |
| 3180 | `SE ≥90% → increase, < 85% → decrease` | Comment with protocol |
| 3213 | `📈 SE ≥ 90%: можно увеличить TIB на 15 минут` | Protocol in message |
| 3237 | `Минимальный безопасный TIB = 5.5 часов` | Safety value in message |
| 3665-3667 | SE thresholds repeated | Duplicate protocol |
| 4028 | `SE ≥ 90%` / `SE 85-89%` / `SE < 85%` | Thresholds in template |

---

## 4. main.ts (MINIMAL)

**File:** `src/main.ts`
**Status:** P3-LOW

**Found (line 1693):**
```typescript
• ☕ "Без кофеина после 14:00"
```

Single hardcoded clinical recommendation. Low priority.

---

## 5. Other Commands (UI Labels Only)

These Record<> mappings contain **UI labels, not clinical content**:

| File | Line | Type | Status |
|------|------|------|--------|
| DiaryCommand.ts | 544, 569 | Component emojis, approach names | OK (UI) |
| ProgressCommand.ts | 297 | Progress labels | OK (UI) |
| BadgeCommand.ts | 271, 279 | Category names, descriptions | OK (Gamification) |
| InsightsCommand.ts | 662, 679 | Emoji/name maps | OK (UI) |
| RelaxCommand.ts | 284, 308, 324 | Technique names | OK (UI) |
| ChronotypeCommand.ts | 56, 67, 78 | Chronotype labels | OK (UI) |

---

## 6. Clinical Constants (SEPARATE ISSUE)

Clinical thresholds should be centralized in constants:

| Constant | Value | Current Location | Should Be |
|----------|-------|------------------|-----------|
| MIN_TIB | 300 min | SleepRestrictionEngine.ts | ✅ Correct |
| SE_INCREASE_THRESHOLD | 90% | TherapyCommand.ts (scattered) | Centralize |
| SE_MAINTAIN_THRESHOLD | 85% | TherapyCommand.ts (scattered) | Centralize |
| SE_DECREASE_THRESHOLD | 85% | TherapyCommand.ts (scattered) | Centralize |
| TIB_ADJUSTMENT_STEP | 15 min | TherapyCommand.ts (scattered) | Centralize |
| ISI_SEVERE_CUTOFF | 22 | ISIRussian.ts | ✅ Correct |

---

## 7. Findings Summary

### P1-HIGH

| ID | Finding | File:Lines | Impact |
|----|---------|------------|--------|
| HC-1 | CORE_SESSIONS hardcoded | TherapyCommand.ts:110-270 | Clinical review blocked |
| HC-2 | contentMap hardcoded | TherapyCommand.ts:3607-3767 | Localization blocked |
| HC-3 | exerciseMap hardcoded | TherapyCommand.ts:3773-3900 | Clinical review blocked |

### P2-MEDIUM

| ID | Finding | File:Lines | Impact |
|----|---------|------------|--------|
| HC-4 | SE thresholds scattered | TherapyCommand.ts (multiple) | Maintenance risk |

### P3-LOW

| ID | Finding | File:Lines | Impact |
|----|---------|------------|--------|
| HC-5 | Caffeine recommendation | main.ts:1693 | Single instance |

### OK (No Action)

| ID | Status | Reason |
|----|--------|--------|
| TodayCommand.ts | FIXED | Uses ClinicalContent correctly |
| UI label mappings | OK | Not clinical content |
| Safety constants | OK | Centralized in engines |

---

## 8. Recommendations

### Immediate (P1-HIGH)

1. **Extend ClinicalContent.ts** to include:
   - Session definitions (CORE_SESSIONS)
   - Educational content (contentMap)
   - Exercises (exerciseMap)

2. **Refactor TherapyCommand.ts** to import from ClinicalContent

### Short-term (P2-MEDIUM)

3. **Centralize clinical constants** in a new file:
   ```
   src/cbt-i/constants/ClinicalThresholds.ts
   ```

4. **Add i18n structure** for future localization

### Documentation

5. **Update CLAUDE.md §13.4** with:
   - Link to ClinicalContent.ts
   - Checklist for adding new clinical content
   - Review process for clinical text changes

---

## 9. Compliance

| Requirement | Status | Evidence |
|-------------|--------|----------|
| CLAUDE.md §13.4 Centralization | PARTIAL | ClinicalContent exists but underutilized |
| IEC 62304 §5.1.6 Maintainability | PARTIAL | Hardcoded content blocks updates |
| Clinical Review Process | BLOCKED | Content scattered across code |

---

## 10. Lines of Hardcoded Content

| File | Hardcoded Lines | Percentage |
|------|-----------------|------------|
| TherapyCommand.ts | ~440 | 10% of file |
| main.ts | ~1 | <0.1% |
| Other commands | 0 | 0% |
| **Total** | **~441 lines** | - |

---

*Audit completed: 2026-02-07*
*Auditor: Claude Code (IEC 62304 §13.4)*
