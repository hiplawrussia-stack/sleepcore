/**
 * Run InsomniaResearchAgent
 */
import { InsomniaResearchAgent, ResearchSource } from '../src/research';

async function main() {
  console.log('🚀 Starting InsomniaResearchAgent...\n');

  const agent = new InsomniaResearchAgent({
    enabledSources: [
      ResearchSource.PUBMED,
      ResearchSource.SEMANTIC_SCHOLAR,
      ResearchSource.OPENALEX,
    ],
    minRelevanceScore: 30,
  });

  const status = agent.getStatus();

  console.log('📊 Agent Status:');
  console.log('  - Enabled Sources:', status.enabledSources.join(', '));
  console.log('  - Monitored Keywords:', status.monitoredKeywords);
  console.log('  - Monitored Competitors:', status.monitoredCompetitors);
  console.log('');

  console.log('🔍 Running search...\n');

  try {
    const result = await agent.run();

    console.log('✅ Search Complete:');
    console.log('  - Total Results:', result.totalCount);
    console.log('  - New Results:', result.newCount);
    console.log('  - Breakthroughs:', result.breakthroughs.length);
    console.log('  - Errors:', result.errors.length);

    if (result.results.length > 0) {
      console.log('\n📄 Sample Results:');
      result.results.slice(0, 5).forEach((r, i) => {
        console.log(`  ${i+1}. ${r.title.slice(0, 70)}...`);
        console.log(`     Source: ${r.source} | Score: ${r.relevanceScore}`);
      });
    }

    if (result.breakthroughs.length > 0) {
      console.log('\n🎯 Top Breakthroughs:');
      result.breakthroughs.slice(0, 3).forEach((b, i) => {
        console.log(`  ${i+1}. ${b.title.slice(0, 60)}...`);
        console.log(`     Impact: ${b.impactScore} | Category: ${b.category}`);
      });
    }

    if (result.errors.length > 0) {
      console.log('\n⚠️ Errors:');
      result.errors.forEach(e => console.log(`  - ${e.source}: ${e.error}`));
    }

    // Test GraphRAG if we have results
    if (result.results.length > 0) {
      console.log('\n📊 Initializing GraphRAG...');
      const graphStats = await agent.initializeGraph(30);
      console.log(`  - Nodes: ${graphStats.nodeCount}`);
      console.log(`  - Edges: ${graphStats.edgeCount}`);
      console.log(`  - Communities: ${graphStats.communityCount}`);

      if (graphStats.nodeCount > 0) {
        const communities = agent.getGraphCommunities();
        if (communities.length > 0) {
          console.log('\n🔗 Top Communities:');
          communities.slice(0, 3).forEach((c, i) => {
            console.log(`  ${i+1}. ${c.label} (${c.memberCount} members)`);
          });
        }

        const hubs = agent.getGraphHubs(5);
        if (hubs.length > 0) {
          console.log('\n🌟 Hub Nodes:');
          hubs.forEach((h, i) => {
            console.log(`  ${i+1}. ${h.label} (${h.type}, ${h.degree} connections)`);
          });
        }
      }
    }

    console.log('\n✨ Agent run complete!');

  } catch (error) {
    console.error('❌ Error running agent:', error);
  }
}

main();
