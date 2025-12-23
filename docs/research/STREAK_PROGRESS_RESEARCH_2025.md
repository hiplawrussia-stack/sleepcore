# Исследование: Streak Counter + Progress Visualization для Mental Health Apps

**Дата исследования:** 23.12.2025
**Изученные источники:** 40+
**Фокус:** CBT-I / Sleep / Mental Health приложения

---

## 1. Executive Summary

### Ключевые выводы:

1. **Streaks эффективны, но требуют осторожности** в mental health контексте
2. **7-дневный streak** — критический порог (2.4x retention по данным Duolingo)
3. **Forgiveness механизмы обязательны** — streak freeze снижает anxiety
4. **66 дней** — научно обоснованный срок формирования привычки (не 21!)
5. **Progress visualization** должна быть простой (3-5 уровней max)

### Рекомендация для SleepCore:
**"Мягкий" streak с grace period** + **Visual progress без наказаний**

---

## 2. Научные данные по Gamification в Mental Health

### 2.1 Эффективность gamification

| Исследование | Результат |
|--------------|-----------|
| JMIR 2021 Meta-analysis | Hedges g=-0.27 (умеренный эффект на депрессию) |
| eQuoo RCT | 90% adherence, +21% retention vs control |
| PMC 2023 Scoping Review | Положительное влияние на well-being и депрессию |

**Важно:** Gamification НЕ показала значимого преимущества над non-gamified apps в мета-регрессии (β=-0.03).

> "Both mental health apps with and without gamification elements were effective in reducing depressive symptoms."
> — [JMIR Mental Health 2021](https://mental.jmir.org/2021/11/e32199)

### 2.2 Риски gamification в mental health

| Риск | Описание | Источник |
|------|----------|----------|
| Streak anxiety | Страх потери streak вызывает compulsive behavior | [Frontiers Psychiatry 2025](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1581779/full) |
| Perfectionism trigger | Missed streak = feelings of guilt | [The Conversation 2025](https://theconversation.com/when-mental-health-apps-become-worry-engines-how-digital-care-can-hijack-our-anxieties-263930) |
| Extrinsic motivation shift | Focus смещается с healing на points | [Psychologs 2025](https://www.psychologs.com/the-dark-side-of-productivity-apps-are-they-helping-or-hurting-mental-health/) |
| Retention over therapy | Apps prioritize engagement over benefit | Frontiers 2025 |

> "Streak-based incentives in apps like Headspace and Calm promote habitual use over genuine improvement."
> — Frontiers in Psychiatry 2025

---

## 3. Duolingo Streak Research (600+ экспериментов)

### 3.1 Ключевые метрики

| Milestone | Impact |
|-----------|--------|
| 7 days | 2.4x more likely to continue |
| 7+ days | 3.6x long-term engagement |
| 0→7 days | Critical habit formation period |

**Изменение:** Разделение streak от daily goals увеличило 7+ day streaks на **40%**.

### 3.2 Streak Freeze парадокс

> "Perhaps surprisingly, being more lenient with streaks actually increases engagement."
> — [Duolingo Blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)

**Streak Freeze привёл к:**
- Skyrocketed DAU
- Снижение anxiety у пользователей
- Более долгосрочный retention

### 3.3 Loss Aversion эволюция

| Stage | Motivation Driver |
|-------|-------------------|
| Days 0-7 | Achievement (50% growth per day feels big) |
| Days 7-30 | Mix of achievement + fear of loss |
| Days 30+ | Primarily loss aversion |

Источник: [Duolingo Psychology](https://www.justanotherpm.com/blog/the-psychology-behind-duolingos-streak-feature)

---

## 4. Habit Formation Science

### 4.1 Мифы vs Реальность

| Миф | Реальность | Источник |
|-----|------------|----------|
| 21 день | Происхождение: Maxwell Maltz 1960, про адаптацию к пластике лица | [UCL Blog](https://blogs.ucl.ac.uk/bsh/2012/06/29/busting-the-21-days-habit-formation-myth/) |
| Фиксированный срок | 18-254 дня, медиана **66 дней** | [Phillippa Lally 2009 Study](https://jamesclear.com/new-habit) |

### 4.2 Три фазы формирования привычки

```
Фаза 1 (дни 1-21):  Сознательные усилия, префронтальная кора активна
Фаза 2 (дни 21-66): Переходный период, становится легче
Фаза 3 (66+ дней):  Автоматизм, привычка сформирована
```

### 4.3 Missing a day

> "Researchers found that missing a single day did not materially affect the habit formation process."
> — [Scientific American](https://www.scientificamerican.com/article/how-long-does-it-really-take-to-form-a-habit/)

**Ключевой insight:** Один пропуск НЕ разрушает привычку. Важна общая trajectory.

---

## 5. Forgiveness Mechanisms

### 5.1 Почему важны

| Проблема | Решение |
|----------|---------|
| Perfectionist streaks → anxiety | Grace mechanics |
| Broken 100-day streak → permanent churn | Streak freeze |
| Willpower burnout | Sustainable streak design |

> "Users who miss a day and break a 100-day streak might never return, not because your product lost value but because the broken streak feels like failure."
> — [Trophy.so](https://trophy.so/blog/designing-streaks-for-long-term-user-growth)

### 5.2 Типы forgiveness

| Механизм | Описание |
|----------|----------|
| **Streak Freeze** | Заморозка на N дней (earned or purchased) |
| **Grace Period** | +3 часа после midnight для действия |
| **Weekend Pass** | Автоматический skip по выходным |
| **Recovery Streak** | Быстрое восстановление после пропуска |

### 5.3 Баланс

> "Too many freezes and the streak loses meaning; too few and users get frustrated."
> — Trophy.so

**Рекомендация:** 1-2 freeze в неделю, автоматически накапливаются

---

## 6. Progress Visualization Best Practices

### 6.1 Типы индикаторов

| Тип | Когда использовать |
|-----|-------------------|
| Determinate | Известно % завершения |
| Indeterminate | Неизвестна длительность |
| Steps-based | Multi-step flows (лучше чем %) |

### 6.2 Design rules

1. **Анимация**: Никогда не останавливать (freeze = "app died")
2. **Скорость**: Начинать медленнее, ускорять к концу
3. **Feedback**: Loading indicator < 100ms от действия
4. **Steps**: Показывать количество шагов, не проценты

### 6.3 Unicode Progress Bars для Telegram

```
Стили:
█████░░░░░ 50%    (Block elements)
▓▓▓▓▓░░░░░ 50%    (Shade characters)
●●●●●○○○○○ 50%    (Circles)
■■■■■□□□□□ 50%    (Squares)
```

Источник: [Unicode Progress Bars](https://changaco.oy.lc/unicode-progress-bars/)

---

## 7. Milestone Celebrations

### 7.1 Оптимальные milestone

| Milestone | Значение | Celebration |
|-----------|----------|-------------|
| 3 дня | Начало привычки | Маленькое признание |
| 7 дней | Critical threshold | Badge + сообщение |
| 14 дней | 2 недели | Badge |
| 30 дней | Месяц | Significant badge |
| 66 дней | Привычка сформирована | Major celebration |

### 7.2 Retention impact

> "Apps using streak and milestone systems reduce 30-day churn by 35%"
> — Forrester 2024

> "Apps combining both streak and milestone mechanisms see 40-60% higher DAU"
> — [Plotline.so](https://www.plotline.so/blog/streaks-for-gamification-in-mobile-apps)

---

## 8. Sleep/CBT-I Specific Research

### 8.1 Sleepio engagement

| Метрика | Sleepio | Другие dCBT-I |
|---------|---------|---------------|
| Dropout rate | 12-20% | 33-49% |
| Module unlock | Weekly | Various |
| Avatar | "The Prof" | Varies |

**Success factors:**
- Weekly module progression
- Animated character (The Prof → наша Соня)
- Sleep diary gamification
- Progress graphs

### 8.2 Sleep app gamification

> "Gamification can contribute to the management of sleep-wake behavior, which is among the most important aspects of subjective well-being."
> — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S1875952121000513)

---

## 9. Ethical Design Recommendations

### 9.1 Для SleepCore

| Принцип | Реализация |
|---------|------------|
| **Transparency** | Объяснять как работает streak |
| **User control** | Возможность отключить gamification |
| **No punishment** | Grace period вместо обнуления |
| **Intrinsic focus** | Progress > points/badges |
| **Crisis priority** | Отключать streak в crisis mode |

### 9.2 Anti-patterns (избегать)

- ❌ Красные индикаторы потери
- ❌ Наказание за пропуск (wilting flowers)
- ❌ Aggressive push notifications
- ❌ Leaderboards (social pressure)
- ❌ Perfect streak requirements

### 9.3 Recommended patterns

- ✅ Мягкие напоминания
- ✅ Celebration без давления
- ✅ "Ты молодец что вернулся" после пропуска
- ✅ Focus на прогресс, не на streak
- ✅ Streak freeze автоматически

---

## 10. Рекомендации для реализации SleepCore

### 10.1 Streak System

```typescript
interface StreakConfig {
  // Forgiveness
  gracePeriodHours: 3,        // +3 часа после midnight
  autoFreezeWeekly: 1,        // 1 freeze в неделю автоматически
  maxFreezes: 3,              // Максимум накопления

  // Milestones
  milestones: [3, 7, 14, 30, 66],

  // Messaging
  missedDayMessage: "Ничего страшного! Продолжим сегодня 💪",
  recoveryEncouragement: true,
}
```

### 10.2 Progress Visualization

```
Формат для Telegram:

📅 Неделя 2 из 8
███████░░░░░░░░░ 43%

🔥 Streak: 7 дней
   ●●●●●●●○○○ (7/10 к следующему badge)

📓 Дневник: 5/7 дней
   ✓ ✓ ✓ ✓ ✓ · ·
```

### 10.3 Milestones & Badges

| Badge | Условие | Сообщение |
|-------|---------|-----------|
| 🌱 Росток | 3 дня streak | "Отличное начало!" |
| 🌿 Побег | 7 дней streak | "Неделя! Привычка формируется" |
| 🌳 Дерево | 14 дней streak | "2 недели стабильности!" |
| 🌲 Лес | 30 дней streak | "Месяц! Ты молодец!" |
| 🏆 Мастер сна | 66 дней streak | "Привычка сформирована!" |

### 10.4 Anti-Anxiety Design

```typescript
// НЕ ДЕЛАТЬ:
"⚠️ Ты потеряешь свой streak через 2 часа!"

// ДЕЛАТЬ:
"🌙 Соня ждёт тебя сегодня вечером"
```

---

## 11. Источники

### Gamification & Mental Health
- [JMIR Mental Health - Gamification Meta-analysis](https://mental.jmir.org/2021/11/e32199)
- [PMC - Gamification Novel Approach](https://pmc.ncbi.nlm.nih.gov/articles/PMC10654169/)
- [Frontiers Psychiatry 2025 - Digital Dependency](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1581779/full)
- [PLOS One - Gamification RCT](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0237220)

### Duolingo & Streaks
- [Duolingo Blog - Streak Habits](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)
- [Duolingo - Improving Streak](https://blog.duolingo.com/improving-the-streak/)
- [Psychology of Duolingo Streak](https://www.justanotherpm.com/blog/the-psychology-behind-duolingos-streak-feature)
- [Trophy.so - Streak Design](https://trophy.so/blog/designing-streaks-for-long-term-user-growth)

### Habit Formation
- [UCL - 21 Day Myth](https://blogs.ucl.ac.uk/bsh/2012/06/29/busting-the-21-days-habit-formation-myth/)
- [James Clear - How Long to Form Habit](https://jamesclear.com/new-habit)
- [PMC - Psychology of Habit Formation](https://pmc.ncbi.nlm.nih.gov/articles/PMC3505409/)
- [Scientific American - Habit Formation](https://www.scientificamerican.com/article/how-long-does-it-really-take-to-form-a-habit/)

### Sleep Apps & CBT-I
- [PMC - Digital CBT-I Review](https://ncbi.nlm.nih.gov/pmc/articles/PMC7999422)
- [Sleepio Research](https://www.sleepio.com/research/)
- [ScienceDirect - Sleep Gamification](https://www.sciencedirect.com/science/article/abs/pii/S1875952121000513)

### Progress & UX
- [Unicode Progress Bars](https://changaco.oy.lc/unicode-progress-bars/)
- [Plotline - Streaks Gamification](https://www.plotline.so/blog/streaks-for-gamification-in-mobile-apps)
- [Telegram Bot API](https://core.telegram.org/bots/api)

### Ethical Design
- [The Conversation - Worry Engines](https://theconversation.com/when-mental-health-apps-become-worry-engines-how-digital-care-can-hijack-our-anxieties-263930)
- [Medium - Dark Patterns](https://medium.com/@jgruver/the-dark-side-of-gamification-ethical-challenges-in-ux-ui-design-576965010dba)
- [PMC - Mental Health App Recommendations](https://pmc.ncbi.nlm.nih.gov/articles/PMC4795320/)

---

## 12. Заключение

Streak + Progress visualization **могут улучшить engagement**, но требуют:

1. **Forgiveness-first design** — grace period, auto-freeze
2. **No punishment** — мягкие напоминания вместо warnings
3. **Milestone focus** — празднование достижений
4. **User control** — возможность отключить
5. **Crisis awareness** — отключение в vulnerable state

**Готово к реализации.**
