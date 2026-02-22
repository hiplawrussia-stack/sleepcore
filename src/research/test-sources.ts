/**
 * @fileoverview Test individual research sources
 */

import { PubMedSource } from './sources/PubMedSource';
import { ClinicalTrialsSource } from './sources/ClinicalTrialsSource';
import { ArxivSource } from './sources/ArxivSource';
import { ResearchSource } from './types';

async function testPubMed() {
  console.log('\n🔬 Testing PubMed...');
  const source = new PubMedSource();

  const available = await source.isAvailable();
  console.log(`   Available: ${available}`);

  if (!available) return;

  try {
    // Простой поиск за последний месяц
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const results = await source.search({
      topic: 'insomnia CBT-I',
      sources: [ResearchSource.PUBMED],
      dateRange: { from: monthAgo, to: new Date() },
      keywords: ['insomnia', 'CBT-I'],
      maxResultsPerSource: 10,
    });

    console.log(`   Found: ${results.length} results`);

    for (const r of results.slice(0, 3)) {
      console.log(`   • [${r.relevanceScore}] ${r.title.slice(0, 60)}...`);
    }
  } catch (e) {
    console.log(`   Error: ${e}`);
  }
}

async function testClinicalTrials() {
  console.log('\n🏥 Testing ClinicalTrials.gov...');
  const source = new ClinicalTrialsSource();

  const available = await source.isAvailable();
  console.log(`   Available: ${available}`);

  if (!available) return;

  try {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 90); // 3 months for clinical trials

    const results = await source.search({
      topic: 'insomnia',
      sources: [ResearchSource.CLINICAL_TRIALS],
      dateRange: { from: monthAgo, to: new Date() },
      keywords: ['insomnia'],
      maxResultsPerSource: 10,
    });

    console.log(`   Found: ${results.length} results`);

    for (const r of results.slice(0, 3)) {
      console.log(`   • [${r.relevanceScore}] ${r.title.slice(0, 60)}...`);
    }
  } catch (e) {
    console.log(`   Error: ${e}`);
  }
}

async function testArxiv() {
  console.log('\n📄 Testing arXiv...');
  const source = new ArxivSource();

  const available = await source.isAvailable();
  console.log(`   Available: ${available}`);

  if (!available) return;

  try {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 60); // 2 months

    const results = await source.search({
      topic: 'sleep machine learning',
      sources: [ResearchSource.ARXIV],
      dateRange: { from: monthAgo, to: new Date() },
      keywords: ['sleep', 'machine learning'],
      maxResultsPerSource: 10,
    });

    console.log(`   Found: ${results.length} results`);

    for (const r of results.slice(0, 3)) {
      console.log(`   • [${r.relevanceScore}] ${r.title.slice(0, 60)}...`);
    }
  } catch (e) {
    console.log(`   Error: ${e}`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Testing Research Sources');
  console.log('═══════════════════════════════════════════════════════════');

  await testPubMed();
  await testClinicalTrials();
  await testArxiv();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   Done');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main();
