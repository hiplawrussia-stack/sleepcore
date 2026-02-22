# Research Agent — Недостающие компоненты

## ✅ Реализовано

| Компонент | Статус | Описание |
|-----------|--------|----------|
| PubMed | ✅ | Научные публикации |
| ClinicalTrials.gov | ✅ | Клинические исследования США |
| arXiv | ✅ | AI/ML препринты |
| Competitors | ✅ | Мониторинг конкурентов |
| GitHub | ✅ | Open source проекты |
| Regional Config | ✅ | Конфигурация международных источников |
| Breakthrough Detector | ✅ | Детекция прорывов |
| Trend Analyzer | ✅ | Анализ трендов |
| Report Generator | ✅ | Генерация отчётов |

---

## 🔴 КРИТИЧЕСКИ ВАЖНО (P0)

### 1. MedRxiv/BioRxiv Source
**Почему:** Медицинские препринты появляются на 6-12 месяцев раньше PubMed
```
Приоритет: HIGH
Сложность: MEDIUM
Зависимости: нет
```

### 2. Patent Sources (USPTO, EPO, WIPO)
**Почему:** Отслеживание технологического ландшафта и IP конкурентов
```
Приоритет: HIGH
Сложность: HIGH (разные API)
Зависимости: нет
```

### 3. Cochrane/PROSPERO Source
**Почему:** Систематические обзоры = высший уровень доказательности
```
Приоритет: HIGH
Сложность: MEDIUM
Зависимости: нет
```

### 4. FDA 510(k) Database
**Почему:** Отслеживание регуляторных одобрений DTx в США
```
Приоритет: HIGH
Сложность: MEDIUM
Зависимости: нет
```

### 5. Alert/Notification System
**Почему:** Моментальные уведомления о прорывах (Telegram, Email, Webhook)
```typescript
interface IBreakthroughAlert {
  channel: 'telegram' | 'email' | 'webhook';
  threshold: number; // breakthrough score
  filters: ResearchCategory[];
}
```

---

## 🟡 ВЫСОКИЙ ПРИОРИТЕТ (P1)

### 6. Conference Proceedings
**Почему:** SLEEP, ESRS, AASM — ключевые конференции по сну
```
Источники:
- SLEEP (American Academy of Sleep Medicine)
- ESRS (European Sleep Research Society)
- AASM abstracts
- World Sleep Congress
```

### 7. Semantic Search / NLP
**Почему:** Поиск по смыслу, а не только по ключевым словам
```typescript
// Пример: "find papers similar to this Digital Twin paper"
async findSimilar(paperId: string, limit: number): Promise<IResearchResult[]>
```

### 8. Citation Network Analysis
**Почему:** Понять какие работы влиятельны, кто кого цитирует
```typescript
interface ICitationGraph {
  getCitedBy(paperId: string): string[];
  getCites(paperId: string): string[];
  getInfluenceScore(paperId: string): number;
}
```

### 9. Market Intelligence (Crunchbase, PitchBook)
**Почему:** Отслеживание инвестиций, M&A в DTx секторе
```
Данные:
- Раунды финансирования
- Оценка компаний
- M&A сделки
- Ключевые инвесторы
```

### 10. DiGA Directory Integration
**Почему:** Прямой мониторинг немецкого реестра DTx
```
URL: https://diga.bfarm.de
Данные: новые приложения, оценки, отзывы
```

---

## 🟢 СРЕДНИЙ ПРИОРИТЕТ (P2)

### 11. Real-World Evidence Sources
- Reddit r/insomnia, r/sleep
- Patient forums (PatientsLikeMe)
- App Store reviews (конкуренты)

### 12. Expert Network
- Key Opinion Leaders (KOLs) tracking
- Author affiliation analysis
- Collaboration network

### 13. Scheduled Runs (Cron)
```typescript
// Автоматический запуск агента
schedule: {
  daily: '09:00 UTC',
  weekly: 'Monday 09:00 UTC',
  monthly: '1st 09:00 UTC'
}
```

### 14. Historical Analysis
- Trend over time (5 years)
- Publication velocity
- Technology adoption curves

### 15. Integration with SleepCore Engines
```typescript
// Автоматические предложения обновлений протоколов
interface IProtocolUpdateSuggestion {
  engine: string; // e.g., 'SleepRestrictionEngine'
  currentProtocol: string;
  suggestedChange: string;
  evidence: IResearchResult[];
  confidenceLevel: ConfidenceLevel;
}
```

---

## 🔵 НИЗКИЙ ПРИОРИТЕТ (P3)

### 16. Video/Podcast Monitoring
- Expert interviews
- Conference recordings
- Webinars

### 17. Social Media Intelligence
- Twitter/X academic discussions
- LinkedIn thought leaders

### 18. Grant Database
- NIH Reporter
- EU Horizon
- Wellcome Trust

### 19. Preregistration Tracking
- OSF Preprints
- AsPredicted

### 20. PDF Full-Text Analysis
- Extract figures, tables
- Methods section parsing
- Results extraction

---

## Архитектурные улучшения

### A. Persistent Storage
```
Текущее: In-memory Map
Нужно: PostgreSQL + Redis cache
```

### B. Rate Limiting
```typescript
// Защита от блокировки API
interface IRateLimiter {
  source: ResearchSource;
  requestsPerMinute: number;
  backoffStrategy: 'linear' | 'exponential';
}
```

### C. Caching Layer
```
- Redis для частых запросов
- CDN для PDF/images
- Local cache для offline
```

### D. Error Recovery
```typescript
// Retry logic с exponential backoff
interface IRetryPolicy {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}
```

### E. Observability
```
- Structured logging
- Metrics (Prometheus)
- Tracing (OpenTelemetry)
- Alerting (PagerDuty)
```

---

## Приоритеты для MVP

### Phase 1 (Неделя 1-2)
1. ✅ Core sources (PubMed, CT.gov, arXiv, Competitors)
2. ✅ Breakthrough detection
3. ✅ Basic reports
4. ⏳ MedRxiv/BioRxiv
5. ⏳ Telegram alerts

### Phase 2 (Неделя 3-4)
6. Patent sources
7. Cochrane/PROSPERO
8. FDA database
9. PostgreSQL storage
10. Scheduled runs

### Phase 3 (Месяц 2)
11. Semantic search
12. Citation analysis
13. Market intelligence
14. Conference tracking
15. DiGA integration

---

## API Keys Required

| Source | API | Free Tier |
|--------|-----|-----------|
| PubMed | NCBI E-utilities | Yes (3 req/sec) |
| GitHub | GitHub API | Yes (60 req/hr unauthenticated) |
| Semantic Scholar | S2 API | Yes (100 req/5min) |
| Crunchbase | Crunchbase API | No ($) |
| USPTO | PatentsView | Yes |
| EPO | OPS | Yes (with registration) |

---

## Оценка трудозатрат

| Компонент | Часы | Сложность |
|-----------|------|-----------|
| MedRxiv Source | 4-6 | Medium |
| Patent Sources | 12-16 | High |
| Cochrane Source | 4-6 | Medium |
| FDA Database | 6-8 | Medium |
| Alert System | 8-12 | Medium |
| Semantic Search | 16-24 | High |
| Citation Network | 12-16 | High |
| PostgreSQL Migration | 8-12 | Medium |
| Scheduled Runs | 4-6 | Low |

**Total MVP Enhancement: ~80-100 часов**
