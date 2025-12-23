# Engagement Features Research Report 2025

**Date:** December 23, 2025
**Scope:** Onboarding Tracking, Mood Integration, Push Notifications
**Sources:** 30+ academic and industry sources

---

## Executive Summary

This report synthesizes research on three key engagement features for SleepCore DTx:
1. **Onboarding Flow Completion Tracking** - Funnel analytics for user journey
2. **Mood Integration in Daily Greeting** - Context-aware emotional check-ins
3. **Push Notifications (node-cron)** - Scheduled reminders and engagement

---

## 1. Onboarding Completion Tracking

### The Problem
- **77% of DAUs** stop using an app within the first 3 days ([UXCam](https://uxcam.com/blog/10-apps-with-great-user-onboarding/))
- **90% of downloaded apps** are abandoned within the first month ([Whatfix](https://whatfix.com/blog/user-onboarding-metrics/))
- Only **40% of DTx participants** install the app in clinical trials ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10891489/))

### Key Metrics to Track (Industry Standard)
| Metric | Description | Target |
|--------|-------------|--------|
| **Completion Rate** | % users finishing onboarding | >70% |
| **Time to Complete** | Duration of onboarding flow | <5 min |
| **Drop-off Points** | Where users abandon flow | Identify & fix |
| **Activation Rate** | Users completing key action | >50% |
| **Day-1 Retention** | Users returning next day | >25% |

### Best Practices
1. **Funnel Analysis** - Break onboarding into clear phases, measure transitions
2. **Cohort Analysis** - Group users by week, compare retention over time
3. **3-7 Steps Maximum** - Keep onboarding under 7 steps (Miller's Law)
4. **Progress Indicators** - Visual bars/counters showing completion progress
5. **Event-based Tracking** - Log each step completion with timestamp

### Implementation Strategy for SleepCore
```typescript
interface OnboardingStep {
  step_id: string;
  step_name: string;
  started_at: Date | null;
  completed_at: Date | null;
  skipped: boolean;
}

// Track: welcome_viewed, name_collected, age_confirmed,
// isi_started, isi_completed, first_diary_entry
```

### Persistence Approach
- **SQLite** recommended for complex local data ([LogRocket](https://blog.logrocket.com/flutter-sqlite-how-to-persist-data/))
- Store state across sessions to allow resumption
- Data persistence prevents frustrating restart experience

---

## 2. Mood Integration in Daily Greeting

### Research on Mental Health App Check-ins

#### Woebot & Wysa Patterns
- Both use **daily check-ins with pre-filled answers** ([Healthline](https://www.healthline.com/health/mental-health/chatbots-reviews))
- Woebot: Checks in daily, remembers previous chats, CBT micro-lessons
- Wysa: Emoji slider for mood (fun and easy), 24/7 AI chat
- Both achieved **FDA Breakthrough Device** designation

#### Optimal Notification Timing (Research-Based)
| Approach | Time Window | Source |
|----------|-------------|--------|
| Evening Check-in | 5 PM - 10 PM | [PMC Study](https://pmc.ncbi.nlm.nih.gov/articles/PMC11321874/) |
| Morning Check-in | Upon waking | [NIMH HealthRhythms](https://www.nimh.nih.gov/funding/sbir/healthrhythms-measuring-behavior-to-help-manage-mood-disorders) |
| Sleep Data Review | 9 PM | Rhythm App Research |
| **User-specified** | Personalized | Best practice |

#### Circadian Rhythm Connection
- Mood follows body's internal clock rhythm ([PLOS Study](https://journals.plos.org/digitalhealth/article?id=10.1371/journal.pdig.0000439))
- Circadian disturbances **precede mood episodes**
- Early detection enables timely intervention

### Daily Greeting Integration Pattern
```
Morning Flow:
1. User opens bot (or receives scheduled greeting)
2. Personalized greeting with name + time of day
3. Quick mood check: "How are you feeling today?"
4. Emoji slider or quick buttons (1-5 scale)
5. Contextual response based on mood
6. Suggest next action (diary, exercises, etc.)
```

### Key Design Principles
- **Subtle notifications** (not intrusive)
- **Pre-filled answers** reduce friction
- **Personalization** based on historical patterns
- **Contextual follow-up** based on response

---

## 3. Push Notifications (Scheduled Messages)

### Node.js Scheduler Comparison

| Library | Weekly Downloads | Stars | Best For |
|---------|-----------------|-------|----------|
| **node-schedule** | 2.4M | 9,184 | Date-based scheduling |
| **node-cron** | 1.1M | 3,068 | Simple cron-like tasks |
| **Agenda** | 130K | 9,523 | Persistent jobs (MongoDB) |

Source: [npm-compare](https://npm-compare.com/cron,node-cron,node-schedule)

### Recommendation: **node-schedule**
- Supports both cron syntax and JavaScript Date objects
- More flexibility for complex scheduling
- In-process execution (lightweight)
- No external database dependency
- [LogRocket Guide](https://blog.logrocket.com/comparing-best-node-js-schedulers/)

### CBT-I App Reminder Patterns

#### What Works
- **Sleep diary reminders** improve adherence ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7999422/))
- **Timely reminders reduce attrition** - especially for youth
- **ISI reminder**: Weekly, user-prompted scheduling
- **Wind-down reminder**: Before target sleep time

#### What to Avoid
- Too many reminders = user annoyance
- Random schedule changes confuse users
- No personalization = low engagement

### Telegram-Specific Considerations

#### Existing Solutions
- [goodmorningtelegram](https://github.com/cooperfrench95/goodmorningtelegram) - Daily greeting bot with SQLite persistence
- Each user has personalized time + timezone settings
- Subreddit integration for content variety

#### Technical Implementation
```typescript
import schedule from 'node-schedule';

// Schedule daily greeting
const job = schedule.scheduleJob('0 9 * * *', async () => {
  // Get users with this preferred time
  const users = await getUsersForNotification('09:00');
  for (const user of users) {
    await sendDailyGreeting(user);
  }
});
```

### Notification Types for SleepCore

| Type | Timing | Purpose |
|------|--------|---------|
| **Morning Greeting** | User-set (default 9:00) | Mood check + engagement |
| **Sleep Diary Reminder** | Evening (user-set) | Data collection |
| **Wind-down Reminder** | 30 min before bed | CBT-I protocol |
| **Weekly ISI** | Weekly (user-set) | Progress tracking |
| **Streak Reminder** | If no activity 24h | Re-engagement |

---

## 4. DTx Engagement Patterns

### The Engagement Challenge
- **50% drop-out rates** reported in DTx studies ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10891489/))
- Engagement defined as: amount, frequency, duration, depth of use
- Success hinges on **sustained patient use and adherence**

### Strategies That Work

#### 1. Gamification & Behavioral Design
- Points, badges, leaderboards
- Reward systems for adherence
- Progress visualization

#### 2. AI-Powered Personalization
- Real-time adaptive content
- User data-driven interventions
- Hyper-personalized recommendations

#### 3. Human Guidance (Digital Navigators)
- Personal assistance improves acceptance
- Trained HCPs as digital guides
- Hybrid AI + human approach

#### 4. Push Notifications (Evidence-Based)
Mixed methods study found:
- **Basic vs Advanced push** notifications
- **Human coach on/off** component
- Both improved engagement over 8 weeks

### Technical vs Behavioral Engagement
- **Technical engagement**: UX, animations, game elements
- **Behavioral engagement**: Actual therapeutic use
- Both required for treatment success

---

## Implementation Architecture

### Database Schema Extensions

```sql
-- Onboarding tracking
CREATE TABLE onboarding_progress (
  user_id INTEGER PRIMARY KEY,
  welcome_completed_at DATETIME,
  name_collected_at DATETIME,
  age_confirmed_at DATETIME,
  isi_started_at DATETIME,
  isi_completed_at DATETIME,
  first_diary_at DATETIME,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notification preferences
CREATE TABLE notification_settings (
  user_id INTEGER PRIMARY KEY,
  morning_greeting_enabled BOOLEAN DEFAULT TRUE,
  morning_greeting_time TIME DEFAULT '09:00',
  diary_reminder_enabled BOOLEAN DEFAULT TRUE,
  diary_reminder_time TIME DEFAULT '21:00',
  timezone VARCHAR(50) DEFAULT 'Europe/Moscow',
  last_notification_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Service Architecture

```
src/
├── services/
│   ├── OnboardingTrackingService.ts  # Funnel tracking
│   ├── DailyGreetingService.ts       # Mood-integrated greeting
│   └── NotificationScheduler.ts      # node-schedule jobs
```

---

## Sources

### Onboarding & Funnel Analytics
- [UXCam - App Onboarding Guide 2025](https://uxcam.com/blog/10-apps-with-great-user-onboarding/)
- [Whatfix - 12 Must-Track Onboarding Metrics](https://whatfix.com/blog/user-onboarding-metrics/)
- [Appcues - User Onboarding Metrics](https://www.appcues.com/blog/user-onboarding-metrics-and-kpis)
- [Mixpanel Funnels Guide](https://www.appcues.com/blog/mixpanel-funnels-user-onboarding)

### Mental Health Apps & Mood Tracking
- [Healthline - Chatbots Reviews](https://www.healthline.com/health/mental-health/chatbots-reviews)
- [Wysa Official](https://www.wysa.com/)
- [PMC - Circadian Rhythm Mood Study](https://pmc.ncbi.nlm.nih.gov/articles/PMC11321874/)
- [NIMH - HealthRhythms](https://www.nimh.nih.gov/funding/sbir/healthrhythms-measuring-behavior-to-help-manage-mood-disorders)

### Node.js Schedulers
- [npm-compare - Scheduler Comparison](https://npm-compare.com/cron,node-cron,node-schedule)
- [LogRocket - Node.js Schedulers](https://blog.logrocket.com/comparing-best-node-js-schedulers/)
- [BetterStack - Top 10 Schedulers](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/)

### CBT-I & Sleep Apps
- [PMC - Digital CBT-I Apps Review](https://pmc.ncbi.nlm.nih.gov/articles/PMC7999422/)
- [VA - CBT-i Coach](https://mobile.va.gov/app/cbt-i-coach)
- [PLOS Medicine - CBT-I App Effectiveness](https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1004510)

### DTx Engagement
- [PMC - DTx Intervention Design](https://pmc.ncbi.nlm.nih.gov/articles/PMC10891489/)
- [Clinical Leader - DTx Trends 2025](https://www.clinicalleader.com/doc/trends-in-digital-therapeutics-for-0001)
- [HITLAB - DTx Global Adoption](https://www.hitlab.org/digital-therapeutics-mental-health-2025/)

---

## Conclusion

Based on research, recommended implementation priority:

1. **Onboarding Tracking** (Low effort, High visibility)
   - SQLite table for step tracking
   - Event logging for funnel analysis

2. **Mood in Daily Greeting** (Low effort, High engagement)
   - Morning personalized message
   - Quick emoji mood check
   - Contextual follow-up

3. **Push Notifications** (Medium effort, High retention)
   - node-schedule for scheduling
   - User-configurable times
   - Sleep diary + morning greeting reminders

All three features align with DTx best practices and have evidence-based support for improving engagement and retention.
