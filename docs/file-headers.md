# File Header Standard — SleepCore

## Template

```typescript
/**
 * [Module Name] - [Brief Description]
 * ====================================
 * [Extended description]
 *
 * Scientific Foundation:  // for clinical modules
 * - [Source] (year)
 *
 * Compliance:  // for safety-critical
 * - [Standard, e.g. IEC 62304]
 *
 * @see CLAUDE.md §[section]  // for RED LINE requirements
 * @packageDocumentation
 * @module @sleepcore/[path/module]
 */
```

## Required Elements

| Element | Required | Example |
|---------|----------|---------|
| Module name | Always | `SleepRestrictionEngine` |
| Brief description | Always | `Sleep Restriction Therapy Implementation` |
| Separator `===` | Always | Visual separation |
| `@module` | Always | `@sleepcore/cbt-i/engines` |
| Scientific Foundation | Clinical modules | `Spielman et al., 1987` |
| `@see CLAUDE.md` | Safety-critical | `@see CLAUDE.md §2.1` |

## Forbidden Elements

- Other project mentions (e.g., "Adapted from byte-bot")
- Specific package versions
- Sprint numbers
- File creation dates (use git history)

## Optional Emojis

| Emoji | Module Type |
|-------|-------------|
| 🚨 | Crisis/Safety-critical |
| 🧬 | Digital Twin, AI/ML |
| 🔐 | Security, Encryption |
