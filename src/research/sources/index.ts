/**
 * @fileoverview Research Sources Index
 * @module research/sources
 */

// Base
export { IResearchSource, BaseResearchSource } from './IResearchSource';

// Scientific Publications
export { PubMedSource } from './PubMedSource';
export { ArxivSource } from './ArxivSource';
export { MedRxivSource } from './MedRxivSource';

// Aggregators (NEW 2025-2026 - high priority sources)
export { SemanticScholarSource } from './SemanticScholarSource';
export { OpenAlexSource } from './OpenAlexSource';

// Clinical Trials
export { ClinicalTrialsSource } from './ClinicalTrialsSource';
export { InternationalTrialsSource } from './InternationalTrialsSource';

// Competitive Intelligence
export { CompetitorSource } from './CompetitorSource';

// Open Source / Development
export { GitHubSource } from './GitHubSource';

// Regional Configuration
export * from './RegionalSourcesConfig';
