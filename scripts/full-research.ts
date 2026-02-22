/**
 * Полный анализ: статьи, конкуренты, прорывы, тренды
 */
import { InsomniaResearchAgent, ResearchSource } from '../src/research';

async function main() {
  console.log('='.repeat(60));
  console.log('  SLEEPCORE RESEARCH AGENT — ПОЛНЫЙ АНАЛИЗ');
  console.log('='.repeat(60));
  console.log('');

  const agent = new InsomniaResearchAgent({
    enabledSources: [
      ResearchSource.PUBMED,
      ResearchSource.SEMANTIC_SCHOLAR,
      ResearchSource.OPENALEX,
      ResearchSource.CLINICAL_TRIALS,
      ResearchSource.ARXIV,
      ResearchSource.COMPETITORS,
    ],
    minRelevanceScore: 20,
  });

  // 1. НАУЧНЫЕ СТАТЬИ
  console.log('📚 1. НОВЫЕ НАУЧНЫЕ СТАТЬИ (последние 30 дней)');
  console.log('-'.repeat(60));

  try {
    const recent = await agent.getRecent(30, 10);
    if (recent.length > 0) {
      recent.forEach((r, i) => {
        console.log(`\n${i+1}. ${r.title}`);
        console.log(`   Источник: ${r.source} | Дата: ${r.publishedAt.toLocaleDateString()}`);
        console.log(`   ${r.summary.slice(0, 150)}...`);
        if (r.url) console.log(`   URL: ${r.url}`);
      });
    } else {
      console.log('   Нет новых статей');
    }
  } catch (e) {
    console.log('   Ошибка:', (e as Error).message);
  }

  // 2. КОНКУРЕНТЫ
  console.log('\n\n🏢 2. МОНИТОРИНГ КОНКУРЕНТОВ');
  console.log('-'.repeat(60));

  try {
    const competitors = await agent.monitorCompetitors();
    if (competitors.length > 0) {
      competitors.slice(0, 5).forEach((c, i) => {
        console.log(`\n${i+1}. ${c.company}${c.product ? ' — ' + c.product : ''}`);
        console.log(`   Тип: ${c.updateType} | Дата: ${c.date.toLocaleDateString()}`);
        console.log(`   ${c.description.slice(0, 150)}...`);
      });
    } else {
      console.log('   Нет обновлений от конкурентов');
    }
  } catch (e) {
    console.log('   Ошибка:', (e as Error).message);
  }

  // 3. ПРОРЫВНЫЕ ТЕХНОЛОГИИ
  console.log('\n\n🚀 3. ПРОРЫВНЫЕ ТЕХНОЛОГИИ В ЛЕЧЕНИИ БЕССОННИЦЫ');
  console.log('-'.repeat(60));

  try {
    const breakthroughs = await agent.getTopBreakthroughs(5);
    if (breakthroughs.length > 0) {
      breakthroughs.forEach((b, i) => {
        console.log(`\n${i+1}. ${b.title}`);
        console.log(`   Категория: ${b.category} | Impact Score: ${b.impactScore}/10`);
        console.log(`   Почему прорыв: ${b.whyBreakthrough}`);
        console.log(`   Применимость к SleepCore: ${b.sleepCoreApplicability}`);
        if (b.actionItems.length > 0) {
          console.log(`   Действия: ${b.actionItems.slice(0, 2).join('; ')}`);
        }
      });
    } else {
      console.log('   Прорывов не обнаружено (нужно больше данных)');
    }
  } catch (e) {
    console.log('   Ошибка:', (e as Error).message);
  }

  // 4. КЛИНИЧЕСКИЕ ИССЛЕДОВАНИЯ
  console.log('\n\n🔬 4. КЛИНИЧЕСКИЕ ИССЛЕДОВАНИЯ');
  console.log('-'.repeat(60));

  try {
    const trials = await agent.searchClinicalTrials('digital therapeutic insomnia');
    if (trials.length > 0) {
      trials.slice(0, 5).forEach((t, i) => {
        console.log(`\n${i+1}. ${t.title}`);
        console.log(`   NCT: ${t.nctId} | Статус: ${t.status} | Фаза: ${t.phase || 'N/A'}`);
        console.log(`   Интервенция: ${t.intervention}`);
        console.log(`   Спонсор: ${t.sponsor} | N=${t.sampleSize || '?'}`);
      });
    } else {
      console.log('   Нет активных исследований');
    }
  } catch (e) {
    console.log('   Ошибка:', (e as Error).message);
  }

  // 5. ТРЕНДЫ
  console.log('\n\n📈 5. ТЕКУЩИЕ ТРЕНДЫ');
  console.log('-'.repeat(60));

  try {
    const trends = await agent.getCurrentTrends();
    if (trends.length > 0) {
      trends.slice(0, 5).forEach((t, i) => {
        console.log(`\n${i+1}. ${t.name}`);
        console.log(`   Сила: ${t.strength} | Зрелость: ${t.maturity}`);
        console.log(`   Упоминаний: ${t.mentionCount} | Релевантность: ${t.sleepCoreRelevance}`);
        if (t.keyPlayers.length > 0) {
          console.log(`   Ключевые игроки: ${t.keyPlayers.slice(0, 3).join(', ')}`);
        }
      });
    } else {
      console.log('   Недостаточно данных для анализа трендов');
    }
  } catch (e) {
    console.log('   Ошибка:', (e as Error).message);
  }

  // СТАТИСТИКА
  console.log('\n\n' + '='.repeat(60));
  console.log('  СТАТИСТИКА');
  console.log('='.repeat(60));

  const stats = await agent.getStats();
  console.log(`  Всего результатов в базе: ${stats.totalResults}`);
  console.log(`  По источникам:`, stats.bySource);

  const cacheStats = agent.getCacheStats();
  console.log(`  Кэш: ${cacheStats.totalEntries} записей, hit rate: ${Math.round(cacheStats.hitRate * 100)}%`);

  console.log('\n✅ Анализ завершён');
}

main().catch(console.error);
