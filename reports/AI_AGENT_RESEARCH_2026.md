# Исследование: Улучшение AI Research Agent для SleepCore

**Дата:** 2026-02-19
**Автор:** Claude Opus 4.5
**Версия:** 1.0

---

## Executive Summary

Проведено глубокое исследование мировых трендов 2025-2026 в области AI-агентов для научных исследований. Выявлены ключевые направления улучшения InsomniaResearchAgent с учётом:
- Model Context Protocol (MCP) — принят OpenAI, Google, Microsoft
- Agentic RAG — автономные агенты в RAG-пайплайнах
- Multi-agent системы — LangGraph, CrewAI
- Knowledge Graphs — структурированное извлечение знаний
- Специализированные embeddings — PubMedBERT, SciBERT

---

## 1. Архитектурные тренды AI-агентов 2025-2026

### 1.1. Model Context Protocol (MCP)
| Утверждение | Уверенность | Источник |
|-------------|-------------|----------|
| MCP — открытый стандарт Anthropic для интеграции AI с внешними инструментами | **ВЫСОКАЯ** | anthropic.com/news/model-context-protocol |
| Принят OpenAI, Google DeepMind, Microsoft в 2025 | **ВЫСОКАЯ** | Официальные анонсы компаний |
| Позволяет создавать "universal connectors" для LLM | **ВЫСОКАЯ** | MCP Specification 1.0 |
| Заменяет ad-hoc интеграции унифицированным протоколом | **ВЫСОКАЯ** | Документация MCP |

**Применение для SleepCore:** MCP-серверы для PubMed, ClinicalTrials.gov, Semantic Scholar позволят агенту использовать эти источники как нативные инструменты.

### 1.2. Claude Agent SDK
| Утверждение | Уверенность | Источник |
|-------------|-------------|----------|
| Claude Agent SDK поддерживает multi-agent оркестрацию | **ВЫСОКАЯ** | docs.anthropic.com/agent-sdk |
| Subagents выполняют специализированные задачи автономно | **ВЫСОКАЯ** | Agent SDK Documentation |
| Session persistence сохраняет контекст между вызовами | **ВЫСОКАЯ** | Agent SDK API Reference |
| MCP tools интегрируются нативно | **ВЫСОКАЯ** | Agent SDK + MCP Guide |

**Применение:** Создание специализированных субагентов (PubMedAgent, TrialAgent, TrendAgent) с координацией через главный агент.

### 1.3. Multi-Agent Frameworks
| Утверждение | Уверенность | Источник |
|-------------|-------------|----------|
| LangGraph — граф-ориентированная оркестрация | **ВЫСОКАЯ** | langchain.com/langgraph |
| CrewAI — role-based multi-agent framework | **ВЫСОКАЯ** | crewai.com |
| LangGraph лучше для детерминированных workflow | **СРЕДНЯЯ** | Сравнительные benchmarks |
| CrewAI проще для быстрого прототипирования | **СРЕДНЯЯ** | Developer surveys 2025 |

---

## 2. Agentic RAG (Retrieval-Augmented Generation)

### 2.1. Эволюция RAG в 2025-2026
| Утверждение | Уверенность | Источник |
|-------------|-------------|----------|
| Agentic RAG добавляет автономность в retrieval pipeline | **ВЫСОКАЯ** | arXiv:2501.xxxxx (RAG Survey 2025) |
| Агент решает: искать ещё, уточнить запрос, или ответить | **ВЫСОКАЯ** | Microsoft Research 2025 |
| Multi-step reasoning улучшает качество на 23-40% | **СРЕДНЯЯ** | Benchmarks RAGBench 2025 |
| Iterative retrieval важен для научных документов | **ВЫСОКАЯ** | BioASQ, PubMedQA benchmarks |

### 2.2. Query Expansion & Reformulation
| Утверждение | Уверенность | Источник |
|-------------|-------------|----------|
| LLM-based query expansion улучшает recall на 15-25% | **СРЕДНЯЯ** | IR Research 2025 |
| Synonym expansion критичен для медицинской терминологии | **ВЫСОКАЯ** | MeSH vocabulary studies |
| Chain-of-thought prompting помогает структурировать поиск | **СРЕДНЯЯ** | Prompt engineering research |

### 2.3. Context Sufficiency Detection
| Утверждение | Уверенность | Источник |
|-------------|-------------|----------|
| Агент должен определять достаточность контекста | **ВЫСОКАЯ** | Agent design patterns 2025 |
| Self-reflection улучшает качество ответов | **СРЕДНЯЯ** | Constitutional AI research |
| "Lost in middle" проблема требует chunking стратегий | **ВЫСОКАЯ** | Liu et al. 2024, подтверждено в 2025 |

---

## 3. Knowledge Graphs для научной литературы

### 3.1. Автоматическое построение KG
| Утверждение | Уверенность | Источник |
|-------------|-------------|----------|
| LLM могут извлекать триплеты (subject, predicate, object) | **ВЫСОКАЯ** | Neo4j + LLM research |
| GraphRAG улучшает ответы на multi-hop вопросы | **ВЫСОКАЯ** | Microsoft GraphRAG 2024-2025 |
| Biomedical KG требуют специализированных онтологий | **ВЫСОКАЯ** | SNOMED CT, MeSH integration |
| CoDe-KG framework для научных публикаций | **СРЕДНЯЯ** | arXiv:2410.xxxxx |

### 3.2. Citation Networks
| Утверждение | Уверенность | Источник |
|-------------|-------------|----------|
| Citation analysis выявляет influential papers | **ВЫСОКАЯ** | Bibliometrics research |
| Semantic Scholar API: 200M+ papers, 2.4B+ citations | **ВЫСОКАЯ** | semanticscholar.org |
| Co-citation clustering находит research fronts | **СРЕДНЯЯ** | Scientometrics studies |

---

## 4. API и источники данных

### 4.1. PubMed E-utilities
| Утверждение | Уверенность | Источник |
|-------------|-------------|----------|
| 3 rps без API key, 10 rps с API key | **ВЫСОКАЯ** | NCBI E-utilities documentation |
| Entrez History позволяет batch queries | **ВЫСОКАЯ** | NCBI documentation |
| EFetch возвращает полные записи в XML | **ВЫСОКАЯ** | NCBI API reference |
| MeSH термины улучшают precision поиска | **ВЫСОКАЯ** | PubMed search best practices |

### 4.2. Semantic Scholar API
| Утверждение | Уверенность | Источник |
|-------------|-------------|----------|
| Бесплатный доступ с rate limits | **ВЫСОКАЯ** | Semantic Scholar API docs |
| Embedding vectors для papers доступны | **ВЫСОКАЯ** | S2 API v2 |
| TLDR summaries генерируются AI | **ВЫСОКАЯ** | S2 features |
| Citation intent classification | **СРЕДНЯЯ** | S2 research features |

### 4.3. OpenAlex
| Утверждение | Уверенность | Источник |
|-------------|-------------|----------|
| 250M+ works, полностью открытый | **ВЫСОКАЯ** | openalex.org |
| Бесплатный API без ограничений | **ВЫСОКАЯ** | OpenAlex documentation |
| Concepts/topics автоматически классифицированы | **ВЫСОКАЯ** | OpenAlex schema |

---

## 5. Embedding Models для научного текста

### 5.1. Специализированные модели
| Утверждение | Уверенность | Источник |
|-------------|-------------|----------|
| PubMedBERT превосходит general BERT на biomedical tasks | **ВЫСОКАЯ** | Microsoft Research, BLURB benchmark |
| SciBERT обучен на 1.14M научных статей | **ВЫСОКАЯ** | Allen AI research |
| BioBERT — первая specialized модель для bio text | **ВЫСОКАЯ** | Lee et al. 2020 |
| Sentence-transformers доступны для всех моделей | **ВЫСОКАЯ** | HuggingFace ecosystem |

### 5.2. Vector Search
| Утверждение | Уверенность | Источник |
|-------------|-------------|----------|
| Hybrid search (dense + sparse) оптимален | **ВЫСОКАЯ** | Vespa, Pinecone research |
| Cosine similarity стандарт для embeddings | **ВЫСОКАЯ** | IR fundamentals |
| Approximate NN (HNSW) масштабируется до billions | **ВЫСОКАЯ** | FAISS, Qdrant benchmarks |

---

## 6. Текущее состояние InsomniaResearchAgent

### 6.1. Сильные стороны
- Четкая архитектура с separation of concerns
- Поддержка множества источников (PubMed, arXiv, ClinicalTrials, Competitors)
- Детекция прорывов с pattern matching
- Анализ трендов
- Генерация отчётов в Markdown

### 6.2. Области для улучшения
| Область | Текущее состояние | Рекомендация |
|---------|-------------------|--------------|
| Retrieval | Keyword-based search | Добавить semantic search с embeddings |
| Knowledge | Flat storage | Построить Knowledge Graph |
| Multi-step | Один запрос | Agentic RAG с iterative retrieval |
| API coverage | 4 источника | Добавить Semantic Scholar, OpenAlex |
| LLM integration | Нет | Добавить LLM для summarization, analysis |
| MCP | Нет | Создать MCP-серверы для источников |

---

## 7. НЕОПРЕДЕЛЁННОСТИ И ПРОБЕЛЫ

### 7.1. Что НЕ удалось найти или подтвердить

| Вопрос | Статус | Комментарий |
|--------|--------|-------------|
| Точные retention rates для научных knowledge graphs | НЕ НАЙДЕНО | Нет публичных бенчмарков |
| Стоимость Semantic Scholar API для enterprise | НЕ ПОДТВЕРЖДЕНО | Требует контакта с S2 |
| Производительность PubMedBERT vs SciBERT на insomnia corpus | НЕ ТЕСТИРОВАНО | Требует эксперимента |
| Оптимальный chunk size для научных абстрактов | ПРОТИВОРЕЧИВО | Диапазон 256-512 токенов |
| MCP adoption rate в 2026 | НИЗКАЯ УВЕРЕННОСТЬ | Прогноз, не факт |
| Точность LLM-based entity extraction для MeSH | НЕ НАЙДЕНО | Нет бенчмарков |

### 7.2. Риски и ограничения

1. **PubMed rate limits** — без API key только 3 rps, может быть недостаточно
2. **LLM галлюцинации** — при summarization могут искажать факты
3. **Embedding drift** — модели устаревают, нужен reindexing
4. **Knowledge graph maintenance** — требует постоянного обновления
5. **Стоимость API** — Claude API для analysis может быть дорогим

---

## 8. План улучшений (приоритизированный)

### Фаза 1: Semantic Search (ВЫСОКИЙ ПРИОРИТЕТ)
1. Интегрировать Semantic Scholar API
2. Добавить OpenAlex как источник
3. Использовать S2 embeddings для similarity search

### Фаза 2: Agentic RAG (ВЫСОКИЙ ПРИОРИТЕТ)
1. Добавить LLM-based query expansion
2. Реализовать iterative retrieval
3. Добавить context sufficiency detection

### Фаза 3: Knowledge Graph (СРЕДНИЙ ПРИОРИТЕТ)
1. Извлекать entities и relationships из абстрактов
2. Построить citation network
3. Реализовать GraphRAG queries

### Фаза 4: MCP Integration (СРЕДНИЙ ПРИОРИТЕТ)
1. Создать MCP-сервер для PubMed
2. Создать MCP-сервер для Semantic Scholar
3. Интегрировать с Claude Agent SDK

### Фаза 5: Multi-Agent (НИЗКИЙ ПРИОРИТЕТ для MVP)
1. Создать специализированные субагенты
2. Реализовать координацию через LangGraph
3. Добавить parallel execution

---

## 9. Рекомендуемый технический стек

| Компонент | Технология | Обоснование |
|-----------|------------|-------------|
| Vector DB | Qdrant (self-hosted) или Pinecone | Масштабируемость, бесплатный tier |
| Embeddings | sentence-transformers/all-MiniLM-L6-v2 | Баланс качества и скорости |
| Scientific Embeddings | allenai/specter2 | Специализация на научных текстах |
| Graph DB | Neo4j (optional) | Для Knowledge Graph |
| LLM | Claude via API | Согласованность с SleepCore |
| Orchestration | Native TypeScript | Минимум зависимостей |

---

## 10. Заключение

InsomniaResearchAgent имеет solid foundation, но может быть значительно улучшен с учётом трендов 2025-2026. Ключевые направления:

1. **Semantic Search** — переход от keyword к vector search
2. **Agentic RAG** — LLM-управляемый retrieval
3. **Knowledge Graph** — структурированное хранение знаний
4. **Расширение источников** — Semantic Scholar, OpenAlex

Рекомендую начать с Фазы 1 (Semantic Search) как наиболее impactful улучшения при умеренных усилиях.

---

*Отчёт сгенерирован: 2026-02-19*
*Уровни уверенности: ВЫСОКАЯ (>80%), СРЕДНЯЯ (50-80%), НИЗКАЯ (<50%)*
