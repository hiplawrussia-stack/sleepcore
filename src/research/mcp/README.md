# SleepCore Research MCP Server

Model Context Protocol (MCP) server для интеграции Research Agent с Claude и другими AI.

## Что это?

MCP — открытый стандарт от Anthropic для подключения AI к внешним инструментам. Этот сервер позволяет Claude напрямую использовать возможности research agent.

## Возможности

### Tools (Инструменты)

| Tool | Описание |
|------|----------|
| `search_research` | Поиск научных публикаций |
| `search_agentic` | Agentic search с авто-уточнением |
| `analyze_citations` | Анализ цитирований |
| `detect_breakthroughs` | Детекция прорывов |
| `analyze_trends` | Анализ трендов |
| `monitor_competitors` | Мониторинг конкурентов |
| `search_clinical_trials` | Поиск клинических исследований |
| `find_similar_papers` | Поиск похожих статей |
| `get_citation_network` | Граф цитирований |
| `generate_report` | Генерация отчёта |
| `get_agent_status` | Статус агента |

### Resources (Ресурсы)

| URI | Описание |
|-----|----------|
| `research://stats` | Статистика репозитория |
| `research://cache` | Статистика кэша |
| `research://sources` | Доступность источников |

### Prompts (Шаблоны)

| Prompt | Описание |
|--------|----------|
| `research_summary` | Саммари по теме |
| `breakthrough_analysis` | Анализ прорыва |
| `competitor_report` | Отчёт о конкуренте |

## Установка

### Для Claude Desktop

Добавить в `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sleepcore-research": {
      "command": "npx",
      "args": ["ts-node", "C:/path/to/sleepcore/src/research/mcp/cli.ts", "--stdio"]
    }
  }
}
```

### HTTP Server

```bash
# Запуск на порту 3002
npx ts-node src/research/mcp/cli.ts --http

# Запуск на другом порту
npx ts-node src/research/mcp/cli.ts --http 8080
```

## Использование

### С Claude Desktop

После настройки Claude сможет использовать команды:

```
> Найди последние исследования по CBT-I digital therapeutic

> Какие прорывы в области sleep medicine за последний месяц?

> Проанализируй цитирования в области insomnia research

> Что нового у Big Health и Pear Therapeutics?
```

### HTTP API

```bash
# Поиск
curl -X POST http://localhost:3002 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_research",
      "arguments": {
        "query": "CBT-I digital therapeutic efficacy",
        "days_back": 30
      }
    }
  }'

# Список tools
curl -X POST http://localhost:3002 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

## Пример ответа

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": {
          "total": 15,
          "query": "CBT-I digital therapeutic",
          "results": [
            {
              "title": "Digital CBT-I vs. Sleep Hygiene...",
              "source": "pubmed",
              "relevanceScore": 85,
              "url": "https://pubmed.ncbi.nlm.nih.gov/..."
            }
          ]
        }
      }
    ]
  }
}
```

## Архитектура

```
┌─────────────────────────────────────────┐
│           Claude Desktop                │
│     или другой MCP Client               │
└────────────────┬────────────────────────┘
                 │ JSON-RPC 2.0
                 ▼
┌─────────────────────────────────────────┐
│         MCP Transport                   │
│    (stdio или HTTP)                     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│       ResearchMCPServer                 │
│  ├── Tools handler                      │
│  ├── Resources handler                  │
│  └── Prompts handler                    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│     InsomniaResearchAgent               │
│  ├── SemanticScholarSource              │
│  ├── OpenAlexSource                     │
│  ├── PubMedSource                       │
│  ├── CitationAnalyzer                   │
│  ├── AgenticSearchStrategy              │
│  └── ParallelSearchExecutor             │
└─────────────────────────────────────────┘
```

## Требования

- Node.js 18+
- TypeScript
- ts-node (для development)

## Безопасность

- Сервер работает только локально (localhost)
- Нет аутентификации (предполагается доверенная среда)
- Для production рекомендуется добавить API key
