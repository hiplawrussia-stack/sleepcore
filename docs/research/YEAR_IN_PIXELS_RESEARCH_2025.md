# Year in Pixels Research Report 2025

**Date:** December 23, 2025
**Feature:** Year in Pixels Mood Visualization
**Sources:** 25+ academic and industry sources

---

## Executive Summary

Year in Pixels is a mood visualization technique originated by Camille de Passion Carnets for Bullet Journals, later popularized by Daylio app. Each day is represented as a colored "pixel" based on mood, creating a visual mosaic of emotional patterns over time.

---

## 1. Origin and Concept

### History
- Created by **Camille** (French bullet journaler, official BuJo community manager)
- Original design: 12 columns (months) × 31 rows (days) = 365 pixels
- Original colors: red, orange, yellow, green, blue (5 levels)
- Source: [Bullet Journal](https://bulletjournal.com/blogs/bulletjournalist/deep-dive-year-in-pixels)

### Core Concept
> "A simple grid with 12 columns for the months, and 30 or 31 blocks or 'pixels' for the days."

The visualization provides:
- Bird's eye view of emotional patterns
- Long-term trend identification
- Monthly comparison capability
- Therapeutic reflection tool

---

## 2. Scientific Basis for Mood Visualization

### Research Evidence

#### User Value (JMIR Mental Health 2021)
- Users **"liked features in which their previous tracked emotions and moods were visualized in figures or calendar form to understand trends"**
- Calendar views help users **"describe the typical mood each day, week, or month"**
- Source: [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8387890/)

#### Visualization Formats (JMIR Human Factors 2022)
- **Color coding** described as "valuable and engaging"
- **Calendar views** help pattern recognition
- Users appreciate **"clear, concise graphing"** for trends
- Source: [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9730209/)

#### Clinical Utility
- Users value ability to **share visualized data with therapists**
- Helps **"support a possible diagnosis"**
- Enables monitoring of symptoms over time

### Design Considerations
- Must be **"context sensitive, personally relevant, and readily understandable"**
- Low mood can affect **"how individuals interact with or interpret their data"**
- Accessibility for colorblind users: **use shapes in addition to colors**

---

## 3. Color Psychology for Mood Representation

### The Four Primary Psychological Colors

| Color | Emotion | Physiological Effect |
|-------|---------|---------------------|
| **Red** | Anger, passion, energy | Increases heart rate, blood pressure |
| **Yellow** | Happiness, joy, hope | Boosts mood, may cause fatigue in excess |
| **Green** | Calm, balance, relaxation | Promotes relaxation and creativity |
| **Blue** | Peace, calm, trust | Lowers stress, promotes calm |
| **Purple** | Luxury, mystery, creativity | Calming (lavender tones) |

Sources: [London Image Institute](https://londonimageinstitute.com/how-to-empower-yourself-with-color-psychology/), [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4383146/)

### Cross-Cultural Study (Germany, Mexico, Poland, Russia, USA)
- Red: universally associated with **anger**, viewed as **strong and active**
- Yellow: most commonly associated with **happiness**
- Color-emotion associations can **vary across cultures**

### Recommended 5-Point Mood Scale

Based on research and Daylio patterns:

| Level | Mood | Color | Emoji | Rationale |
|-------|------|-------|-------|-----------|
| 5 | Great/Rad | 🟢 Green | 😊 | Green = positive, growth, health |
| 4 | Good | 🔵 Blue | 🙂 | Blue = calm, stable, content |
| 3 | Meh/Neutral | 🟡 Yellow | 😐 | Yellow = alert, caution, moderate |
| 2 | Bad | 🟠 Orange | 😕 | Orange = warning, concern |
| 1 | Awful | 🔴 Red | 😢 | Red = high arousal, negative state |

**Alternative (Warm-Cool spectrum):**
- Warm colors (yellow, green) = positive emotions
- Cool/dark colors (blue, purple, gray) = negative/neutral emotions

---

## 4. Daylio Implementation Analysis

### UX Strengths
- **"Incredibly simple, visually appealing, user-friendly"**
- Tap icon to record = **low friction** (important for low mood states)
- **"Does not take much time"** to create daily entries
- Source: [App Review Nest](https://appsreviewnest.com/app-review/daylio-app-review-a-helpful-tool-for-mood-tracking-and-journaling/)

### Visualization Features
- Monthly mood line graph
- Year in Pixels display
- Statistics and pattern correlation
- Activity-mood relationships
- Source: [IntuitionLabs](https://intuitionlabs.ai/software/telepsychiatry-digital-mental-health/mood-tracking-and-journaling/daylio)

### Technical Implementation (GitHub)
```python
# One row per month, one pixel per day
# Black = month has <31 days
# White = no mood tracked
# Color = Daylio color scheme
```
Source: [GitHub](https://github.com/pajowu/daylio-visualisations)

### Accessibility
For colorblind users:
- Square = happy
- Triangle = annoyed
- Star = productive
- Empty vs filled shapes for variants

---

## 5. Mental Health App Trends 2025

### Key Trends

#### AI-Powered Personalization
- Algorithms analyze mood data for **personalized insights**
- **Predict mood changes** and recommend interventions
- Source: [Vocal Media](https://vocal.media/education/the-rise-of-mental-health-apps-trends-in-2025)

#### Gamification
- **Progress badges** and challenges
- **Visual progress tracking**
- Makes mood management **"more fun and engaging"**
- Source: [Life Planner](https://thelifeplanner.co/blog/post/the_future_of_mood_tracking_apps_trends_to_watch_in_2025.html)

#### Clinical Integration
- Users want to **share data with therapists**
- Visualizations support **diagnosis and monitoring**

### Market Growth
- 2025 market: **$7.48-8.03 billion**
- Growth rate: **14-17% annually**
- Projected 2030: **$15.95-17.52 billion**

---

## 6. Telegram Implementation Strategy

### Limitations
- No native image rendering in messages
- Must use **text-based visualization**
- Emoji support varies by device

### Solution: Unicode/Emoji Grid

**Colored Square Emojis:**
```
🟢 = Level 5 (Great)
🔵 = Level 4 (Good)
🟡 = Level 3 (Neutral)
🟠 = Level 2 (Bad)
🔴 = Level 1 (Awful)
⬜ = No data
⬛ = Invalid day (month <31 days)
```

**Month Layout (7 columns = week days):**
```
Янв 2025
Пн Вт Ср Чт Пт Сб Вс
      🟢 🔵 🟡 🟠 🔴
🟢 🔵 🟡 🟠 🔴 🟢 🔵
🟡 🟠 🔴 🟢 🔵 🟡 🟠
🔴 🟢 🔵 🟡 🟠 🔴 🟢
🔵 🟡 🟠
```

**Full Year Grid (compact):**
```
   Я Ф М А М И И А С О Н Д
1  🟢🔵🟡🟠🔴🟢🔵🟡🟠🔴🟢🔵
2  🔵🟡🟠🔴🟢🔵🟡🟠🔴🟢🔵🟡
...
31 🟢⬛🟢⬛🟢⬛🟢🟢⬛🟢⬛🟢
```

### Alternative Formats

**Emoji Blocks (Larger):**
```
🟩🟦🟨🟧🟥 = mood levels
⬜ = no data
```

**Circle Emojis:**
```
🟢🔵🟡🟠🔴 = mood levels
⚪ = no data
```

---

## 7. Implementation Architecture

### Data Structure

```typescript
interface IYearInPixels {
  year: number;
  pixels: Map<string, MoodLevel>; // key: "YYYY-MM-DD"
}

type MoodLevel = 1 | 2 | 3 | 4 | 5;

interface IPixelStats {
  totalDays: number;
  trackedDays: number;
  averageMood: number;
  moodDistribution: Record<MoodLevel, number>;
  streaks: {
    current: number;
    longest: number;
  };
}
```

### Rendering Options

1. **Monthly View** - Current month as calendar grid (7 columns)
2. **Year Grid** - Full year (12 columns × 31 rows)
3. **Quarter View** - 3 months side by side
4. **Statistics Summary** - Numeric breakdown

### Integration Points

```
moodHistory (existing) → YearInPixelsService → /pixels command
                                             → /mood_year command
                                             → Inline button in /mood
```

---

## 8. Recommendations for SleepCore

### Must-Have Features
1. **Monthly pixel calendar** with week alignment
2. **5-level color scale** (green → blue → yellow → orange → red)
3. **Statistics summary** (average mood, distribution)
4. **Legend** explaining colors

### Nice-to-Have Features
1. Full year compact grid
2. Quarter comparison
3. Trend indicators (↑↓→)
4. Streak tracking

### Command Structure
- `/pixels` or `/year` - Show Year in Pixels
- `/mood_year` - Year overview
- Option in `/mood_week` to expand to month/year

### Accessibility
- Include **emoji legend** with text labels
- Provide **numeric summary** alongside visual
- Consider **shape alternatives** for future

---

## Sources

### Primary Research
- [PMC - Mood Tracking Apps Study](https://pmc.ncbi.nlm.nih.gov/articles/PMC8387890/)
- [PMC - Depression Self-Management Apps](https://pmc.ncbi.nlm.nih.gov/articles/PMC9730209/)
- [PMC - Color Psychology](https://pmc.ncbi.nlm.nih.gov/articles/PMC4383146/)

### Industry Sources
- [Bullet Journal - Year in Pixels](https://bulletjournal.com/blogs/bulletjournalist/deep-dive-year-in-pixels)
- [Little Coffee Fox - Year in Pixels Guide](https://littlecoffeefox.com/year-in-pixels/)
- [Daylio Official](https://daylio.net/)
- [Year in Pixels Apps Comparison](https://year-in-pixels.com/year-in-pixels-apps/)

### 2025 Trends
- [Mental Health App Trends 2025](https://vocal.media/education/the-rise-of-mental-health-apps-trends-in-2025)
- [Mood Tracking Future 2025](https://thelifeplanner.co/blog/post/the_future_of_mood_tracking_apps_trends_to_watch_in_2025.html)
- [App Inventiv Features 2025](https://appinventiv.com/blog/mental-health-app-features/)

### Color Psychology
- [London Image Institute](https://londonimageinstitute.com/how-to-empower-yourself-with-color-psychology/)
- [Color Psychology Org](https://www.colorpsychology.org/)
- [iMotions - Color and Behavior](https://imotions.com/blog/insights/color-and-human-behavior/)

---

## Conclusion

Year in Pixels is a research-backed visualization technique that:
1. Helps users identify emotional patterns over time
2. Uses color psychology principles for intuitive understanding
3. Supports clinical utility (shareable with therapists)
4. Aligns with 2025 mental health app trends (gamification, visual progress)

For Telegram implementation, use emoji-based grid with 5-level color scale (🟢🔵🟡🟠🔴) and provide both visual and numeric summaries for accessibility.
