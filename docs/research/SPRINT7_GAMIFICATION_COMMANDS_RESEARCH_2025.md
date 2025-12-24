# Sprint 7: User-Facing Gamification Commands Research

**Date:** December 2025
**Focus:** Telegram Bot Gamification UX Patterns
**Status:** Research Complete

---

## 1. Executive Summary

This research covers best practices for implementing user-facing gamification commands in Telegram bots based on 2025 UX patterns and academic research.

---

## 2. Research Sources

### Telegram Bot UX Patterns
- [Telegram Casino UX Guide](https://basic-tutorials.com/special/telegram-casino-user-experience-guide-and-ux-patterns-for-chat-based-gaming/)
- [Two Design Patterns for Telegram Bots](https://dev.to/madhead/two-design-patterns-for-telegram-bots-59f5)
- [Grammy Keyboard Plugin](https://grammy.dev/plugins/keyboard)
- [Telegram Bot Development Guide 2025](https://www.algoryte.com/news/everything-you-need-to-know-about-telegram-bot-app-development/)

### Gamification UX
- [Ultimate Guide to Gamification UX/UI](https://medium.com/brightvibe/ultimate-guide-to-gamification-6c17160f2047)
- [Gamification in Product Design 2025](https://arounda.agency/blog/gamification-in-product-design-in-2024-ui-ux)
- [App Gamification Examples](https://clevertap.com/blog/app-gamification-examples/)
- [Best Gamification Practices](https://www.storyly.io/post/best-gamification-practices-to-boost-user-engagement)

### Player Profile & Achievement UI
- [Mobbin Achievement Patterns](https://mobbin.com/explore/mobile/screens/achievements-awards)
- [Collectible Achievements Pattern](https://ui-patterns.com/patterns/CollectibleAchievements)
- [Game UI Database - Quests](https://www.gameuidatabase.com/index.php?scrn=81)

---

## 3. Key UX Findings

### 3.1 Telegram Bot Constraints

**Inline Keyboards:**
- Maximum 8 buttons per row
- Callback data limited to 64 bytes
- Must be attached to a message
- Support hierarchical navigation via message editing

**Best Practices:**
- Keep primary actions within "thumb zone"
- Use `call.answer()` to stop loading animation
- Prefer clean, minimal interfaces
- Inline keyboards for navigation, reply keyboards for high-trust actions

### 3.2 Gamification Profile UI

**Essential Elements:**
1. **Level/XP Display** - Progress bar + numeric values
2. **Avatar/Character** - Visual representation (Sonya evolution)
3. **Streak Counter** - Current + longest streak
4. **Badges Grid** - Visual collection with progress
5. **Quick Stats** - Key metrics at a glance

**Research Finding:**
> "LinkedIn increased profile completion by 60% after implementing a progress bar"

### 3.3 Quest UI Patterns

**Modern Quest Design:**
- Primary: Active quests with progress bars
- Secondary: Available quests categorized by difficulty
- Visual hierarchy: Current > Available > Completed
- Time-sensitive indicators (days remaining)

**Best Practices:**
- Show 3-5 active quests maximum
- Use color coding for difficulty (green/yellow/red)
- Progress bars for tracking
- Celebratory animations on completion

### 3.4 Badge Collection UX

**Collector Psychology:**
- "Catch 'em all" instinct drives engagement
- Locked badges with silhouettes create anticipation
- Rarity tiers (common → legendary) add perceived value
- Recent unlocks should be highlighted

**Visual Design:**
- Grid layout for collections
- Category grouping
- Progress indicators for locked badges
- "New" badge for recently unlocked

---

## 4. Command Architecture

### 4.1 Proposed Commands

| Command | Description | Primary Features |
|---------|-------------|------------------|
| `/profile` | Player profile hub | XP, level, Sonya, quick stats |
| `/quests` | Quest management | Active, available, completed |
| `/badges` | Achievement collection | By category, by rarity, progress |
| `/sonya` | Evolution status | Current stage, abilities, interaction |

### 4.2 Navigation Flow

```
/profile (Hub)
├── 📊 Stats overview
├── 🎯 Quick link to /quests
├── 🏅 Quick link to /badges
└── 🦉 Quick link to /sonya

/quests
├── Active (3 max)
├── Available (by difficulty)
├── Completed (history)
└── Start/Abandon actions

/badges
├── By Category
├── By Rarity
├── Progress (close to unlock)
└── Badge details

/sonya
├── Current stage visual
├── Abilities
├── History
├── Interact
└── Next stage progress
```

### 4.3 Callback Data Convention

```
command:action:param

Examples:
- profile:stats
- quests:active
- quests:start:diary_streak_7
- badges:category:achievement
- sonya:interact
```

---

## 5. Integration with GamificationEngine

### 5.1 Current State

Existing commands use direct service calls:
- `questService` (in-memory)
- `badgeService` (in-memory)
- `sonyaEvolutionService` (in-memory)

### 5.2 Migration Strategy

Create a GamificationContext that provides access to GamificationEngine:

```typescript
interface IGamificationContext {
  gamification: IGamificationEngine;
}

// Extend ISleepCoreContext
interface ISleepCoreContext extends Context, IGamificationContext {
  // ... existing fields
}
```

### 5.3 Data Flow

```
User Action → Bot Command → GamificationEngine → SQLite
                                    ↓
                               EventEmitter
                                    ↓
                            Telegram Notification
```

---

## 6. Implementation Priorities

### Phase 1: /profile Command (New)
- Unified player profile using GamificationEngine
- XP, level, Sonya status, streaks
- Quick navigation to other gamification features

### Phase 2: Update Existing Commands
- Migrate /quests to use GamificationEngine
- Migrate /badges to use GamificationEngine
- Migrate /sonya to use GamificationEngine

### Phase 3: Event Integration
- Level-up notifications
- Badge unlock celebrations
- Quest completion alerts
- Streak reminders

---

## 7. Visual Design Guidelines

### Progress Bars
```
█████████░ 90%  (10 chars width)
████████░░ 80%
███░░░░░░░ 30%
```

### Level Display
```
⭐ Уровень 5
[████████░░] 80%
125/150 XP до уровня 6
```

### Badge Grid (Inline Keyboard)
```
[🥇 First Steps] [🔥 Streak Master]
[📝 Diary Pro   ] [⬜ Locked      ]
```

---

## 8. References

1. Telegram Bot API Documentation
2. Grammy Framework Plugins Guide
3. Game UI Database - Mission Tracking Systems
4. UI-Patterns.com - Collectible Achievements
5. Medium - Ultimate Guide to Gamification UX/UI
6. Arounda - Gamification in Product Design 2025

---

*Research completed December 2025*
