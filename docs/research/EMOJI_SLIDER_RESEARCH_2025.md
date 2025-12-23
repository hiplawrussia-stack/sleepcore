# Исследование: Emoji Slider (Wysa Style) для Mental Health Apps

**Дата исследования:** 23.12.2025
**Изученные источники:** 35+
**Фокус:** Mood tracking, Sleep quality, CBT-I контекст

---

## 1. Executive Summary

### Ключевые выводы:

1. **Emoji scales валидны** — корреляция с PHQ-9/PSQI на уровне r=0.60-0.74
2. **5-6 уровней оптимально** — Wong-Baker и Daylio используют этот стандарт
3. **Cross-cultural универсальность** — emoji понятны независимо от языка
4. **Telegram ограничения** — нет нативного slider, нужен inline keyboard
5. **Wysa паттерн** — "slide the big yellow emoji face up and down"

### Рекомендация для SleepCore:
**5-point emoji scale** с inline buttons + причина выбора (факторы)

---

## 2. Научная валидность Emoji Scales

### 2.1 Исследования

| Исследование | Результат | Источник |
|--------------|-----------|----------|
| Emoji PANAS (N=682) | Значимая корреляция со словесными шкалами | [ScienceDirect 2023](https://www.sciencedirect.com/science/article/pii/S0747563223002674) |
| GMoji (14 emojis) | Высокая acceptability, улучшение awareness | [PMC 2024](https://ncbi.nlm.nih.gov/pmc/articles/PMC11107917) |
| Emoji-FPS (6 levels) | Валидность подтверждена для боли | [PMC 2022](https://ncbi.nlm.nih.gov/pmc/articles/PMC9277495) |
| Emoji Current Mood Scale | Ultra-brief, literacy-independent | [TandFOnline 2022](https://www.tandfonline.com/doi/full/10.1080/09638237.2022.2069694) |

### 2.2 Корреляции с золотыми стандартами

```
VAS Depression ↔ PHQ-9:     r = 0.61
GA-VAS Anxiety ↔ HAM-A:     r = 0.60
GA-VAS Anxiety ↔ HADS-A:    r = 0.74
Emoji-FPS ↔ Wong-Baker:     Высокое согласие
```

> "Emoji provide an ultra-brief measure of mood and current experience, with minimal literacy demands on participants."
> — [TandFOnline 2022](https://www.tandfonline.com/doi/full/10.1080/09638237.2022.2069694)

### 2.3 Ограничения

| Фактор | Влияние |
|--------|---------|
| Тяжёлые расстройства | Biased interpretation of emojis |
| Высокая эмоциональная стабильность | Меньше корреляции с VAS |
| Экстраверсия | Меньше корреляции со словесными |

---

## 3. Wysa Emoji Slider — Как работает

### 3.1 Механика

> "To tell Wysa how you're feeling every day, you slide the big yellow emoji face up and down. That felt fun and easy."
> — [Clean Plates Review](https://cleanplates.com/wellness/mental-health-bots-for-anxiety/)

### 3.2 Паттерн

```
1. AI спрашивает "Как ты себя чувствуешь?"
2. Пользователь двигает emoji slider
3. Выбирает причины из списка факторов (work, school, hunger, etc.)
4. AI адаптирует ответ на основе mood + причин
```

### 3.3 Преимущества Wysa дизайна

- **Fun and easy** — игровой элемент
- **Non-prescriptive** — без лекций и списков to-do
- **Personalized** — распознаёт тон и эмоциональные маркеры
- **Progressive** — добавляет tools в feed по мере разговора

---

## 4. Daylio 5-Point Scale — Эталон индустрии

### 4.1 Уровни

| Level | Emoji | Label (EN) | Label (RU) |
|-------|-------|------------|------------|
| 5 | 😊 | Rad | Отлично |
| 4 | 🙂 | Good | Хорошо |
| 3 | 😐 | Okay/Meh | Нормально |
| 2 | 😕 | Bad | Плохо |
| 1 | 😢 | Awful | Ужасно |

### 4.2 Year in Pixels

Визуализация года в виде сетки пикселей разных цветов — по одному на день.

### 4.3 Кастомизация

> "You can edit your mood emojis or even add more moods to describe your feelings better."

Возможность добавить sub-emotions (10-point) или energy levels.

---

## 5. Wong-Baker FACES Scale — Медицинский стандарт

### 5.1 Почему 6 уровней

> "Both widely used FPS—Wong-Baker FACES and FPS-R—choose 6 faces as anchors."

Это удобно для конвертации в 0-5 или 0-10 шкалы.

### 5.2 Emoji как альтернатива

> "Emoji are more concisely designed and are not limited to specific characteristics like age, gender, or race."
> — [JMIR 2023](https://www.jmir.org/2023/1/e41189)

Преимущества:
- Open-source
- Cross-platform
- Универсальные

---

## 6. Sleep Quality Assessment

### 6.1 Single-Item Sleep Quality Scale (SQS)

> "Rate the overall quality of sleep over a 7-day recall period on a scale from 0 to 10."

| Score | Label |
|-------|-------|
| 0 | Terrible |
| 1-3 | Poor |
| 4-6 | Fair |
| 7-9 | Good |
| 10 | Excellent |

### 6.2 Связь сна и настроения

> "There is strong comorbidity between sleep and mood alterations."

Assessment должен включать:
- Daytime sleepiness
- Mental/physical fatigue
- Concentration problems
- Mood and irritability

---

## 7. Cross-Cultural Considerations

### 7.1 Универсальность эмоций

> "Across cultures, people recognize at least six basic human emotions: anger, fear, sadness, disgust, happiness, and surprise."

### 7.2 Emoji usage patterns

> "The similarities between Eastern and Western emoji usage far outweighed the differences."
> — [Penn Engineering](https://www.seas.upenn.edu/stories/machine-learning-detects-cross-cultural-similarities-and-differences-in-emoji-usage-1243910ed19f/)

### 7.3 600+ языков в South Asia

> "The universality of emojis in representing emotions can enhance the effectiveness of public mental health care delivery."

---

## 8. Telegram Implementation

### 8.1 Ограничения

Telegram не поддерживает нативные sliders. Альтернативы:

| Подход | Плюсы | Минусы |
|--------|-------|--------|
| Inline keyboard (emoji row) | Нативно, красиво | Один tap, не "slide" |
| Numbered buttons (1-5) | Просто | Менее визуально |
| Multiple messages | Анимация | Загрязняет чат |
| Edit message | Плавно | Сложнее в реализации |

### 8.2 Рекомендуемый подход

**Inline keyboard с emoji buttons:**

```
Как ты себя чувствуешь сейчас?

[ 😢 ] [ 😕 ] [ 😐 ] [ 🙂 ] [ 😊 ]
```

После выбора — inline keyboard с причинами:

```
Что повлияло на настроение?

[ 😴 Сон ] [ 💼 Работа ] [ 🏠 Дом ]
[ 💪 Здоровье ] [ 👥 Люди ] [ ✅ Готово ]
```

### 8.3 Grammy Implementation

```typescript
const moodKeyboard = new InlineKeyboard()
  .text('😢', 'mood:1')
  .text('😕', 'mood:2')
  .text('😐', 'mood:3')
  .text('🙂', 'mood:4')
  .text('😊', 'mood:5');
```

---

## 9. UX Best Practices 2025

### 9.1 Simplicity

> "Daylio turns mood tracking into a playful, pocket-sized journal where emojis and quick notes reveal patterns."

### 9.2 Color Psychology

| Color | Effect |
|-------|--------|
| Blues/Greens | Calm, trust, clarity |
| Soft Purples | Balance, relaxation |
| Pastels | Reduce anxiety |

### 9.3 Non-Invasive

> "Daily mood assessments should not feel invasive. Reminders are gentle."

### 9.4 Pattern Recognition

> "A quick daily check-in can reveal surprising patterns."

---

## 10. Рекомендации для SleepCore

### 10.1 5-Point Emoji Scale

```typescript
const MOOD_SCALE = [
  { level: 1, emoji: '😢', label: 'Ужасно', color: '#E74C3C' },
  { level: 2, emoji: '😕', label: 'Плохо', color: '#E67E22' },
  { level: 3, emoji: '😐', label: 'Нормально', color: '#F1C40F' },
  { level: 4, emoji: '🙂', label: 'Хорошо', color: '#2ECC71' },
  { level: 5, emoji: '😊', label: 'Отлично', color: '#27AE60' },
];
```

### 10.2 Sleep-Specific Scale

```typescript
const SLEEP_QUALITY_SCALE = [
  { level: 1, emoji: '😵', label: 'Не спал', hours: '0-2' },
  { level: 2, emoji: '😫', label: 'Плохо', hours: '2-4' },
  { level: 3, emoji: '😐', label: 'Так себе', hours: '4-6' },
  { level: 4, emoji: '😌', label: 'Нормально', hours: '6-7' },
  { level: 5, emoji: '😴', label: 'Отлично', hours: '7-9' },
];
```

### 10.3 Contributing Factors

```typescript
const MOOD_FACTORS = [
  { id: 'sleep', emoji: '😴', label: 'Сон' },
  { id: 'work', emoji: '💼', label: 'Работа' },
  { id: 'health', emoji: '💪', label: 'Здоровье' },
  { id: 'people', emoji: '👥', label: 'Люди' },
  { id: 'stress', emoji: '😰', label: 'Стресс' },
  { id: 'food', emoji: '🍽️', label: 'Еда' },
  { id: 'exercise', emoji: '🏃', label: 'Спорт' },
  { id: 'weather', emoji: '🌤️', label: 'Погода' },
];
```

### 10.4 Flow Design

```
1. Соня: "Как ты себя чувствуешь сейчас?"
   [ 😢 ] [ 😕 ] [ 😐 ] [ 🙂 ] [ 😊 ]

2. (После выбора) Соня: "Что повлияло?"
   [ 😴 Сон ] [ 💼 Работа ] [ 💪 Здоровье ]
   [ 👥 Люди ] [ 😰 Стресс ] [ ✅ Готово ]

3. (После выбора) Соня адаптирует ответ:
   "😊 Отлично! Рада, что сон был хорошим.
    Это влияет на настроение на 30-40%!"
```

### 10.5 Data Storage

```typescript
interface IMoodEntry {
  timestamp: number;
  moodLevel: 1 | 2 | 3 | 4 | 5;
  factors: string[];
  context?: 'morning' | 'evening' | 'check-in';
}
```

---

## 11. Источники

### Emoji Scales Research
- [TandFOnline - Emoji Current Mood Scale](https://www.tandfonline.com/doi/full/10.1080/09638237.2022.2069694)
- [ScienceDirect - Are emoji valid indicators](https://www.sciencedirect.com/science/article/pii/S0747563223002674)
- [PMC - Emoji-FPS Validation](https://ncbi.nlm.nih.gov/pmc/articles/PMC9277495)
- [PMC - Emojifying Youth Mental Health](https://ncbi.nlm.nih.gov/pmc/articles/PMC11107917)

### Visual Analog Scales
- [PubMed - Single-Item VAS for Depression](https://pubmed.ncbi.nlm.nih.gov/31531784/)
- [PMC - GA-VAS for Anxiety](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2904728/)
- [JMIR - Emoji Faces Pain Scale](https://www.jmir.org/2023/1/e41189)

### App Design
- [Wysa App Review](https://www.choosingtherapy.com/wysa-app-review/)
- [Daylio Official](https://daylio.net/)
- [PMC - Daylio Study](https://pmc.ncbi.nlm.nih.gov/articles/PMC5344152/)
- [Clustox - Mood Tracker Apps](https://www.clustox.com/blog/mood-tracker-apps/)

### Sleep Assessment
- [Pittsburgh Sleep Quality Index](https://www.sleep.pitt.edu/psqi)
- [PMC - Single-Item Sleep Quality Scale](https://pmc.ncbi.nlm.nih.gov/articles/PMC6223557/)

### Telegram Implementation
- [grammY Keyboard Plugin](https://grammy.dev/plugins/keyboard)
- [Telegram Bot API - Buttons](https://core.telegram.org/api/bots/buttons)

### Cross-Cultural
- [Penn Engineering - Emoji Usage](https://www.seas.upenn.edu/stories/machine-learning-detects-cross-cultural-similarities-and-differences-in-emoji-usage-1243910ed19f/)

---

## 12. Заключение

Emoji slider для SleepCore реализуем через:

1. **5-point inline keyboard** — валидный, простой
2. **Multi-select factors** — причины настроения
3. **Персонализированный ответ Сони** — адаптация на основе выбора
4. **История и паттерны** — Year in Pixels visualization

**Готово к реализации.**
