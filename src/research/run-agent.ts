/**
 * @fileoverview Research Agent Runner
 * @description Запуск AI агента исследований
 */

import { InsomniaResearchAgent } from './agents/InsomniaResearchAgent';
import { ReportGenerator } from './reports/ReportGenerator';
import { ResearchSource } from './types';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   SleepCore AI Research Agent');
  console.log('   Мониторинг исследований инсомнии');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Создаём агента с новыми источниками 2025-2026
  const agent = new InsomniaResearchAgent({
    enabledSources: [
      ResearchSource.PUBMED,
      ResearchSource.SEMANTIC_SCHOLAR,  // NEW: 200M+ papers with AI summaries
      ResearchSource.OPENALEX,          // NEW: 250M+ works, fully open
      ResearchSource.CLINICAL_TRIALS,
      ResearchSource.ARXIV,
      ResearchSource.COMPETITORS,
    ],
    minRelevanceScore: 10, // Низкий порог для захвата всех научных источников
    breakthroughAlertThreshold: 50,
  });

  console.log('📊 Статус агента:');
  const status = agent.getStatus();
  console.log(`   • Источники: ${status.enabledSources.join(', ')}`);
  console.log(`   • Ключевые слова: ${status.monitoredKeywords}`);
  console.log(`   • Конкуренты: ${status.monitoredCompetitors}`);
  console.log('');

  // Запускаем поиск
  console.log('🔍 Запуск поиска по всем источникам...\n');

  try {
    const startTime = Date.now();
    const result = await agent.run();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('   РЕЗУЛЬТАТЫ ПОИСКА');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`⏱️  Время выполнения: ${duration}s`);
    console.log(`📚 Найдено результатов: ${result.totalCount}`);
    console.log(`🆕 Новых: ${result.newCount}`);
    console.log(`🚀 Прорывов обнаружено: ${result.breakthroughs.length}`);

    // Ошибки
    if (result.errors.length > 0) {
      console.log(`\n⚠️  Ошибки (${result.errors.length}):`);
      for (const err of result.errors) {
        console.log(`   • ${err.source}: ${err.error}`);
      }
    }

    // Топ-10 по релевантности
    console.log('\n───────────────────────────────────────────────────────────');
    console.log('   ТОП-10 ПО РЕЛЕВАНТНОСТИ');
    console.log('───────────────────────────────────────────────────────────\n');

    const topResults = result.results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);

    for (let i = 0; i < topResults.length; i++) {
      const r = topResults[i];
      console.log(`${i + 1}. [${r.relevanceScore}] ${r.title.slice(0, 70)}...`);
      console.log(`   📌 ${r.source} | ${r.categories.slice(0, 3).join(', ')}`);
      console.log(`   🔗 ${r.url.slice(0, 60)}...`);
      console.log('');
    }

    // Прорывы
    if (result.breakthroughs.length > 0) {
      console.log('───────────────────────────────────────────────────────────');
      console.log('   🚀 ПРОРЫВЫ');
      console.log('───────────────────────────────────────────────────────────\n');

      for (const bt of result.breakthroughs.slice(0, 5)) {
        console.log(`★ ${bt.title.slice(0, 60)}...`);
        console.log(`  Impact: ${bt.impactScore}/10 | ${bt.category}`);
        console.log(`  ${bt.whyBreakthrough.slice(0, 80)}...`);
        console.log(`  → ${bt.actionItems[0] || 'Review'}`);
        console.log('');
      }
    }

    // Анализ
    console.log('───────────────────────────────────────────────────────────');
    console.log('   📈 АНАЛИЗ ТРЕНДОВ');
    console.log('───────────────────────────────────────────────────────────\n');

    const analysis = await agent.analyze(7);

    console.log(`Тренды обнаружено: ${analysis.trends.length}`);
    for (const trend of analysis.trends.slice(0, 5)) {
      const arrow = trend.strength === 'rising' ? '↑' : trend.strength === 'declining' ? '↓' : '→';
      console.log(`  ${arrow} ${trend.name} (${trend.mentionCount} упоминаний) - ${trend.maturity}`);
    }

    // Рекомендации
    if (analysis.recommendations.length > 0) {
      console.log('\n📋 Рекомендации:');
      for (const rec of analysis.recommendations.slice(0, 5)) {
        console.log(`  • ${rec}`);
      }
    }

    // NEW 2025-2026: Citation Analysis
    console.log('\n───────────────────────────────────────────────────────────');
    console.log('   📈 CITATION ANALYSIS (NEW 2025)');
    console.log('───────────────────────────────────────────────────────────\n');

    const citationAnalysis = await agent.analyzeCitations(30);

    console.log('Field Statistics:');
    console.log(`  • Total papers analyzed: ${citationAnalysis.fieldStats.totalPapers}`);
    console.log(`  • Total citations: ${citationAnalysis.fieldStats.totalCitations}`);
    console.log(`  • Average citations: ${citationAnalysis.fieldStats.averageCitations}`);
    console.log(`  • H-index equivalent: ${citationAnalysis.fieldStats.h_index_equivalent}`);

    if (citationAnalysis.emerging.length > 0) {
      console.log('\n🌟 Emerging Papers (high velocity):');
      for (const paper of citationAnalysis.emerging.slice(0, 3)) {
        const meta = paper.metadata as Record<string, unknown> || {};
        console.log(`  • ${paper.title.slice(0, 50)}...`);
        console.log(`    Citations: ${meta.citationCount || 0} | Influential: ${meta.influentialCitationCount || 0}`);
      }
    }

    if (citationAnalysis.fronts.length > 0) {
      console.log('\n🔬 Research Fronts:');
      for (const front of citationAnalysis.fronts.slice(0, 3)) {
        const status = front.isEmerging ? '(EMERGING)' : '';
        console.log(`  • ${front.name} ${status}`);
        console.log(`    Papers: ${front.paperCount} | Avg citations: ${Math.round(front.averageCitations)}`);
      }
    }

    // NEW 2025-2026: Cache Statistics
    console.log('\n───────────────────────────────────────────────────────────');
    console.log('   💾 CACHE STATISTICS (NEW 2025)');
    console.log('───────────────────────────────────────────────────────────\n');

    const cacheStats = agent.getCacheStats();
    console.log(`  • Total entries: ${cacheStats.totalEntries}`);
    console.log(`  • Hit rate: ${Math.round(cacheStats.hitRate * 100)}%`);
    console.log(`  • Memory usage: ${cacheStats.estimatedMemoryMB} MB`);

    // Статистика
    console.log('\n───────────────────────────────────────────────────────────');
    console.log('   📊 СТАТИСТИКА');
    console.log('───────────────────────────────────────────────────────────\n');

    const stats = await agent.getStats();
    console.log(`Всего в базе: ${stats.totalResults}`);
    console.log('По источникам:');
    for (const [source, count] of Object.entries(stats.bySource)) {
      if (count > 0) {
        console.log(`  • ${source}: ${count}`);
      }
    }

    // Генерация отчёта
    console.log('\n───────────────────────────────────────────────────────────');
    console.log('   📄 ГЕНЕРАЦИЯ ОТЧЁТА');
    console.log('───────────────────────────────────────────────────────────\n');

    const report = await agent.generateWeeklyReport();
    const reportGenerator = new ReportGenerator();
    const markdown = reportGenerator.exportToMarkdown(report);

    // Сохранение отчёта
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportDate = new Date().toISOString().split('T')[0];
    const reportPath = path.join(reportsDir, `research-report-${reportDate}.md`);
    fs.writeFileSync(reportPath, markdown, 'utf-8');

    console.log(`✅ Отчёт сохранён: ${reportPath}`);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   ✅ Агент завершил работу');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Ошибка выполнения:', error);
    process.exit(1);
  }
}

main();
