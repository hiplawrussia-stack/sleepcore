# Исследование: Hub Model Navigation для Telegram ботов

**Дата исследования:** 23.12.2025
**Изученные источники:** 30+
**Фокус:** Command hierarchy, Progressive disclosure, Mental health UX

---

## 1. Executive Summary

### Ключевые выводы:

1. **3-5 команд оптимально** — Miller's Law + Material Design + Apple HIG
2. **Hub-and-spoke паттерн** — центральный хаб снижает cognitive load
3. **Progressive disclosure** — показывать простое сначала, сложное по запросу
4. **Telegram limit** — max 100 команд, но best practice: minimal set
5. **Mental health apps** — Woebot/Wysa используют guided conversation

### Рекомендация для SleepCore:
**5-6 команд в BotFather** + **Rich /menu** как центральный хаб

---

## 2. Telegram Bot Menu Best Practices

### 2.1 Официальные рекомендации Telegram

> "Commands should be as specific as possible — for example /newlocation or /newrule is better than a /new command."
> — [Telegram Bot Features](https://core.telegram.org/bots/features)

| Параметр | Лимит |
|----------|-------|
| Max commands | 100 |
| Command length | 32 символа |
| Buttons per row | 4 |
| Button rows | 5 |

### 2.2 Best Practices

> "Limit the number of commands: Too many commands can overwhelm users. Focus on the most essential commands that provide value."
> — [grammY Commands Guide](https://grammy.dev/guide/commands)

> "Use inline buttons: Incorporate inline buttons for common actions. This reduces the need for users to remember commands."
> — Telegram Best Practices

### 2.3 Multi-Level Navigation

> "Always include a 'Back' button — users panic without an escape route. Use emojis in your buttons — they make everything friendlier."
> — [n8n Telegram Menu Template](https://n8n.io/workflows/8844-create-a-dynamic-telegram-bot-menu-system-with-multi-level-navigation/)

---

## 3. Hub-and-Spoke Navigation Pattern

### 3.1 Определение

> "A hub and spoke pattern gives you a central index from which users will navigate out. Users can't navigate between spokes but must return to the hub."
> — [Interaction Design Foundation](https://www.interaction-design.org/literature/article/show-me-the-way-to-go-anywhere-navigation-for-mobile-applications)

### 3.2 Преимущества

| Преимущество | Описание |
|--------------|----------|
| Clarity | Центральный хаб показывает все пути |
| Focus | Нет отвлечений между spokes |
| Scalability | Легко добавлять новые spokes |
| Learning curve | Простая ментальная модель |

### 3.3 Недостатки

> "Hub-and-Spoke works well for centralized applications but limits free exploration. Users must follow predefined paths, reducing flexibility."
> — [Medium: Navigation Patterns](https://medium.com/@preetham.lawrence/navigation-matters-choosing-the-right-ux-pattern-078953351ed3)

### 3.4 Примеры использования

- **Apple Watch UI** — возврат к сетке приложений
- **Game Consoles** — Xbox/PlayStation home screens
- **Task-based apps** — когда пользователь выполняет одну задачу за сессию

---

## 4. Progressive Disclosure

### 4.1 Определение

> "Progressive disclosure means showing information gradually instead of presenting all options at once. In chatbot UX, first ask for the date, then the time, then confirm."
> — [Chatbot UX Design Guide 2025](https://www.parallelhq.com/blog/chatbot-ux-design)

### 4.2 AI Design Pattern

> "Progressive Disclosure is an AI design pattern that reveals complexity gradually. It shows simple features first, then unveils advanced capabilities as needed."
> — [AI UX Design Patterns](https://www.aiuxdesign.guide/patterns/progressive-disclosure)

### 4.3 Реализация в чатботах

> "Present a few options rather than a complex menu, and keep the conversation focused."
> — [Chatbot UX Best Practices](https://www.parallelhq.com/blog/chatbot-ux-design)

| Компонент | Когда показывать |
|-----------|------------------|
| Accordions | Развернуть по клику |
| Tabs | Переключение контента |
| Dropdowns | Список опций |
| Multi-step flows | Шаг за шагом |

---

## 5. Mental Health App Navigation

### 5.1 Woebot

> "Woebot uses a conversational interface, engaging users in CBT techniques through friendly 5-minute chats."
> — [Woebot Case Study](https://uxwritinghub.com/woebot-case-study-in-conversation-design-for-mental-health-products/)

**Паттерн:**
- Pre-filled ответы (кнопки)
- Guided conversation
- Feels like "interactive quiz"

### 5.2 Wysa

> "Wysa checks in daily. It has you rate your mood by sliding a big yellow emoji face. Wysa offers hundreds of self-guided 'tools'."
> — [Wysa App Review 2025](https://www.choosingtherapy.com/wysa-app-review/)

**Паттерн:**
- Emoji mood slider
- Сотни инструментов (скрыты до нужды)
- Progressive tool discovery

### 5.3 Общие паттерны

> "The most popular is 'Guided conversation,' in which users are only permitted to reply using preset input."
> — [PMC: Chatbot Mental Health Apps](https://pmc.ncbi.nlm.nih.gov/articles/PMC10242473/)

---

## 6. Cognitive Load & Menu Size

### 6.1 Miller's Law (7±2)

> "The capacity of an average human being's working memory is limited to approximately seven discrete items or chunks, with variation allowing for five to nine units."
> — [Miller 1956, Psychological Review](https://db.arabpsychology.com/the-magical-number-seven-plus-or-minus-two-2/)

### 6.2 Современные исследования

> "Between three and five choice options are optimal in instructional contexts."
> — [Patall et al. 2008 Meta-analysis](https://onlinelibrary.wiley.com/doi/full/10.1002/hbe2.295)

> "The brain can only count up to four objects at a glance (±2)."
> — [Smashing Magazine: Cognitive Load](https://www.smashingmagazine.com/2016/09/reducing-cognitive-overload-for-a-better-user-experience/)

### 6.3 Bottom Navigation Research

> "Aim for around three to five tabs. This range is the sweet spot for bottom navigation."
> — [AppMySite: Bottom Navigation 2025](https://blog.appmysite.com/bottom-navigation-bar-in-mobile-apps-heres-all-you-need-to-know/)

> "A bottom tab bar contains three to five tabs, as per Material Design guidelines."
> — [UXD World: Tab Bar Best Practices](https://uxdworld.com/bottom-tab-bar-navigation-design-best-practices/)

### 6.4 NN Group

> "If your site has more than 5 options, it's hard to fit them in a tab bar and still keep an optimum touch-target size."
> — [NN Group: Mobile Navigation Patterns](https://www.nngroup.com/articles/mobile-navigation-patterns/)

---

## 7. Рекомендации для SleepCore

### 7.1 Hub Model Architecture

```
BotFather (5-6 команд):
├── /start    — Начало работы
├── /menu     — Все функции (HUB)
├── /diary    — Дневник сна (ежедневное)
├── /mood     — Настроение (быстрый чек)
├── /sos      — Экстренная помощь
└── /help     — Справка

/menu (Hub) → Spokes:
├── Ежедневное
│   ├── /diary
│   ├── /mood
│   ├── /sleep
│   └── /today
├── Терапия
│   ├── /relax
│   ├── /mindful
│   ├── /rehearsal
│   └── /recall
├── Аналитика
│   ├── /progress
│   └── /mood_week
└── Настройки
    └── /settings
```

### 7.2 Обоснование

| Команда в BotFather | Почему |
|---------------------|--------|
| /start | Обязательная (Telegram) |
| /menu | Hub для всего остального |
| /diary | Ежедневное действие (retention) |
| /mood | Быстрый чек (engagement) |
| /sos | Критически важная (безопасность) |
| /help | Обязательная (usability) |

### 7.3 Menu Sections (Progressive Disclosure)

```
📱 *Главное меню*

🔵 *Ежедневное*
[ 📓 Дневник ] [ 💭 Настроение ]
[ 😴 Сон ] [ ☀️ Сегодня ]

🟢 *Терапия*
[ 🧘 Релакс ] [ 🧠 Осознанность ]
[ 🎭 Репетиция ] [ 🎯 Тест памяти ]

📊 *Аналитика*
[ 📈 Прогресс ] [ 📆 Неделя ]

⚙️ *Настройки*
[ ⚙️ Настройки ] [ ❓ Справка ]
```

---

## 8. Источники

### Telegram
- [Telegram Bot Features](https://core.telegram.org/bots/features)
- [grammY Commands Guide](https://grammy.dev/guide/commands)
- [n8n Telegram Menu Template](https://n8n.io/workflows/8844-create-a-dynamic-telegram-bot-menu-system-with-multi-level-navigation/)

### Navigation Patterns
- [IxDF: Mobile Navigation](https://www.interaction-design.org/literature/article/show-me-the-way-to-go-anywhere-navigation-for-mobile-applications)
- [Medium: Navigation Patterns](https://medium.com/@preetham.lawrence/navigation-matters-choosing-the-right-ux-pattern-078953351ed3)
- [NN Group: Mobile Navigation](https://www.nngroup.com/articles/mobile-navigation-patterns/)

### Progressive Disclosure
- [IxDF: Progressive Disclosure](https://www.interaction-design.org/literature/topics/progressive-disclosure)
- [AI UX Design Patterns](https://www.aiuxdesign.guide/patterns/progressive-disclosure)
- [Parallel HQ: Chatbot UX 2025](https://www.parallelhq.com/blog/chatbot-ux-design)

### Cognitive Load
- [Smashing Magazine: Cognitive Overload](https://www.smashingmagazine.com/2016/09/reducing-cognitive-overload-for-a-better-user-experience/)
- [Kern-IT: Miller's Law](https://www.kern-it.be/en/blog/miller-law-less-becomes-a-plus-for-great-user-experience/)

### Mental Health Apps
- [Woebot Case Study](https://uxwritinghub.com/woebot-case-study-in-conversation-design-for-mental-health-products/)
- [Wysa App Review 2025](https://www.choosingtherapy.com/wysa-app-review/)
- [PMC: Chatbot Mental Health Apps](https://pmc.ncbi.nlm.nih.gov/articles/PMC10242473/)

### Bottom Navigation
- [UXD World: Tab Bar Best Practices](https://uxdworld.com/bottom-tab-bar-navigation-design-best-practices/)
- [AppMySite: Bottom Navigation 2025](https://blog.appmysite.com/bottom-navigation-bar-in-mobile-apps-heres-all-you-need-to-know/)

---

## 9. Заключение

Hub Model для SleepCore реализуется через:

1. **5-6 команд в BotFather** — минимум для quick access
2. **/menu как центральный хаб** — все функции с секциями
3. **Progressive disclosure** — секции: Ежедневное → Терапия → Аналитика
4. **Context-Aware** — уже реализовано, интегрировать в hub

**Готово к реализации.**
