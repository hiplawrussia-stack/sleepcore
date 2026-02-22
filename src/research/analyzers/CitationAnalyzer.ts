/**
 * @fileoverview Citation Network Analyzer
 * @module research/analyzers/CitationAnalyzer
 * @description Анализ сетей цитирования для выявления влиятельных работ
 *
 * Функции:
 * - Выявление highly cited papers
 * - Анализ citation velocity (рост цитирований)
 * - Определение research fronts
 * - Кластеризация по co-citation
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import { IResearchResult, ResearchCategory, ConfidenceLevel } from '../types';

/**
 * Citation metrics for a paper
 */
export interface ICitationMetrics {
  /** Paper ID */
  paperId: string;

  /** Total citations */
  totalCitations: number;

  /** Influential citations (high-quality citing papers) */
  influentialCitations: number;

  /** Citations per year */
  citationsPerYear: number;

  /** Citation velocity (recent citations growth) */
  velocity: 'accelerating' | 'stable' | 'declining';

  /** Field normalized citation impact */
  normalizedImpact: number;

  /** Is this a highly cited paper? */
  isHighlyCited: boolean;

  /** Is this an emerging paper? (new but gaining traction) */
  isEmerging: boolean;
}

/**
 * Research front - cluster of related papers
 */
export interface IResearchFront {
  /** Front name/topic */
  name: string;

  /** Description */
  description: string;

  /** Core papers defining this front */
  corePapers: IResearchResult[];

  /** Total papers in front */
  paperCount: number;

  /** Average citations */
  averageCitations: number;

  /** Growth rate (new papers/month) */
  growthRate: number;

  /** Is this front emerging? */
  isEmerging: boolean;

  /** Related SleepCore categories */
  categories: ResearchCategory[];
}

/**
 * Citation network analysis results
 */
export interface ICitationAnalysis {
  /** Top cited papers */
  topCited: IResearchResult[];

  /** Emerging papers (recent with high velocity) */
  emerging: IResearchResult[];

  /** Research fronts */
  fronts: IResearchFront[];

  /** Field statistics */
  fieldStats: {
    totalPapers: number;
    totalCitations: number;
    averageCitations: number;
    medianCitations: number;
    h_index_equivalent: number;
  };
}

/**
 * Citation thresholds by field
 */
const CITATION_THRESHOLDS = {
  // Sleep medicine is a relatively small field
  highlyCited: 50,
  influential: 10,
  emerging: {
    minCitations: 5,
    maxAge: 2, // years
    minVelocity: 3, // citations per year
  },
};

/**
 * Citation Network Analyzer
 */
export class CitationAnalyzer {
  /**
   * Analyze citation patterns in research results
   */
  analyze(results: IResearchResult[]): ICitationAnalysis {
    // Filter results with citation data
    const withCitations = results.filter(r => this.getCitationCount(r) !== null);

    // Calculate metrics for each paper
    const metrics = withCitations.map(r => this.calculateMetrics(r));

    // Find top cited
    const topCited = this.findTopCited(withCitations, metrics);

    // Find emerging papers
    const emerging = this.findEmerging(withCitations, metrics);

    // Detect research fronts
    const fronts = this.detectResearchFronts(withCitations);

    // Calculate field statistics
    const fieldStats = this.calculateFieldStats(withCitations, metrics);

    return {
      topCited,
      emerging,
      fronts,
      fieldStats,
    };
  }

  /**
   * Calculate citation metrics for a single paper
   */
  calculateMetrics(result: IResearchResult): ICitationMetrics {
    const citations = this.getCitationCount(result) || 0;
    const influential = this.getInfluentialCitations(result) || 0;
    const age = this.getPaperAge(result);

    const citationsPerYear = age > 0 ? citations / age : citations;

    // Determine velocity based on recent citations if available
    const velocity = this.determineVelocity(result, citationsPerYear);

    // Normalized impact (simplified - would need field averages for accurate calculation)
    const normalizedImpact = citationsPerYear / 10; // Rough normalization

    // Is highly cited?
    const isHighlyCited = citations >= CITATION_THRESHOLDS.highlyCited;

    // Is emerging?
    const isEmerging = age <= CITATION_THRESHOLDS.emerging.maxAge &&
                       citations >= CITATION_THRESHOLDS.emerging.minCitations &&
                       citationsPerYear >= CITATION_THRESHOLDS.emerging.minVelocity;

    return {
      paperId: result.id,
      totalCitations: citations,
      influentialCitations: influential,
      citationsPerYear,
      velocity,
      normalizedImpact,
      isHighlyCited,
      isEmerging,
    };
  }

  /**
   * Rank papers by citation impact
   */
  rankByImpact(results: IResearchResult[]): IResearchResult[] {
    return [...results].sort((a, b) => {
      const citationsA = this.getCitationCount(a) || 0;
      const citationsB = this.getCitationCount(b) || 0;

      // Factor in influential citations
      const influentialA = this.getInfluentialCitations(a) || 0;
      const influentialB = this.getInfluentialCitations(b) || 0;

      // Score = total citations + 2x influential citations
      const scoreA = citationsA + influentialA * 2;
      const scoreB = citationsB + influentialB * 2;

      return scoreB - scoreA;
    });
  }

  /**
   * Find emerging papers (recent but gaining traction quickly)
   */
  findEmergingPapers(results: IResearchResult[]): IResearchResult[] {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    return results.filter(r => {
      // Must be recent
      if (r.publishedAt < twoYearsAgo) return false;

      const citations = this.getCitationCount(r) || 0;
      const age = this.getPaperAge(r);
      const velocity = age > 0 ? citations / age : citations;

      // Must have decent citations for age
      return citations >= CITATION_THRESHOLDS.emerging.minCitations &&
             velocity >= CITATION_THRESHOLDS.emerging.minVelocity;
    }).sort((a, b) => {
      const velocityA = (this.getCitationCount(a) || 0) / Math.max(0.5, this.getPaperAge(a));
      const velocityB = (this.getCitationCount(b) || 0) / Math.max(0.5, this.getPaperAge(b));
      return velocityB - velocityA;
    });
  }

  /**
   * Get citation count from result metadata
   */
  private getCitationCount(result: IResearchResult): number | null {
    const metadata = result.metadata as Record<string, unknown> | undefined;
    if (!metadata) return null;

    // Different sources use different field names
    const citationCount = metadata.citationCount ?? metadata.cited_by_count ?? metadata.citations;
    if (typeof citationCount === 'number') return citationCount;
    if (typeof citationCount === 'string') return parseInt(citationCount, 10) || null;

    return null;
  }

  /**
   * Get influential citation count
   */
  private getInfluentialCitations(result: IResearchResult): number | null {
    const metadata = result.metadata as Record<string, unknown> | undefined;
    if (!metadata) return null;

    const influential = metadata.influentialCitationCount;
    if (typeof influential === 'number') return influential;

    return null;
  }

  /**
   * Calculate paper age in years
   */
  private getPaperAge(result: IResearchResult): number {
    const now = new Date();
    const published = result.publishedAt;
    const diffMs = now.getTime() - published.getTime();
    const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365);
    return Math.max(0.1, diffYears); // Minimum 0.1 to avoid division by zero
  }

  /**
   * Determine citation velocity
   */
  private determineVelocity(
    result: IResearchResult,
    citationsPerYear: number
  ): 'accelerating' | 'stable' | 'declining' {
    const metadata = result.metadata as Record<string, unknown> | undefined;

    // If we have yearly citation data, use it
    const countsByYear = metadata?.counts_by_year as Array<{ year: number; cited_by_count: number }> | undefined;
    if (countsByYear && countsByYear.length >= 2) {
      const recent = countsByYear.slice(0, 2);
      const recentAvg = recent.reduce((sum, y) => sum + y.cited_by_count, 0) / recent.length;

      const older = countsByYear.slice(2);
      if (older.length > 0) {
        const olderAvg = older.reduce((sum, y) => sum + y.cited_by_count, 0) / older.length;

        if (recentAvg > olderAvg * 1.5) return 'accelerating';
        if (recentAvg < olderAvg * 0.5) return 'declining';
      }
    }

    // Fallback: use citations per year
    if (citationsPerYear >= 10) return 'accelerating';
    if (citationsPerYear >= 3) return 'stable';
    return 'declining';
  }

  /**
   * Find top cited papers
   */
  private findTopCited(
    results: IResearchResult[],
    _metrics: ICitationMetrics[]
  ): IResearchResult[] {
    return [...results]
      .sort((a, b) => (this.getCitationCount(b) || 0) - (this.getCitationCount(a) || 0))
      .slice(0, 20);
  }

  /**
   * Find emerging papers
   */
  private findEmerging(
    results: IResearchResult[],
    metrics: ICitationMetrics[]
  ): IResearchResult[] {
    const emergingIds = new Set(
      metrics.filter(m => m.isEmerging).map(m => m.paperId)
    );

    return results
      .filter(r => emergingIds.has(r.id))
      .sort((a, b) => {
        const velocityA = (this.getCitationCount(a) || 0) / Math.max(0.5, this.getPaperAge(a));
        const velocityB = (this.getCitationCount(b) || 0) / Math.max(0.5, this.getPaperAge(b));
        return velocityB - velocityA;
      })
      .slice(0, 10);
  }

  /**
   * Detect research fronts (clusters of related papers)
   */
  private detectResearchFronts(results: IResearchResult[]): IResearchFront[] {
    const fronts: IResearchFront[] = [];

    // Group by category
    const byCategory = new Map<ResearchCategory, IResearchResult[]>();
    for (const result of results) {
      for (const category of result.categories) {
        const existing = byCategory.get(category) || [];
        existing.push(result);
        byCategory.set(category, existing);
      }
    }

    // Create fronts from significant clusters
    for (const [category, papers] of byCategory) {
      if (papers.length < 3) continue;

      const citations = papers.map(p => this.getCitationCount(p) || 0);
      const avgCitations = citations.reduce((a, b) => a + b, 0) / papers.length;

      // Calculate growth rate (papers published recently)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const recentPapers = papers.filter(p => p.publishedAt >= oneYearAgo);
      const growthRate = recentPapers.length / 12; // papers per month

      fronts.push({
        name: this.categoryToFrontName(category),
        description: this.categoryToDescription(category),
        corePapers: this.rankByImpact(papers).slice(0, 5),
        paperCount: papers.length,
        averageCitations: avgCitations,
        growthRate,
        isEmerging: growthRate > 0.5 && avgCitations < 20, // Active but not yet highly cited
        categories: [category],
      });
    }

    // Sort by activity
    return fronts.sort((a, b) => {
      const scoreA = a.growthRate * 10 + a.averageCitations;
      const scoreB = b.growthRate * 10 + b.averageCitations;
      return scoreB - scoreA;
    });
  }

  /**
   * Calculate field statistics
   */
  private calculateFieldStats(
    results: IResearchResult[],
    metrics: ICitationMetrics[]
  ): ICitationAnalysis['fieldStats'] {
    const citations = results.map(r => this.getCitationCount(r) || 0);
    const totalCitations = citations.reduce((a, b) => a + b, 0);
    const averageCitations = citations.length > 0 ? totalCitations / citations.length : 0;

    // Median
    const sorted = [...citations].sort((a, b) => a - b);
    const medianCitations = sorted.length > 0
      ? sorted[Math.floor(sorted.length / 2)]
      : 0;

    // H-index equivalent (number of papers with at least h citations)
    let h = 0;
    const descCitations = [...citations].sort((a, b) => b - a);
    for (let i = 0; i < descCitations.length; i++) {
      if (descCitations[i] >= i + 1) {
        h = i + 1;
      } else {
        break;
      }
    }

    return {
      totalPapers: results.length,
      totalCitations,
      averageCitations: Math.round(averageCitations * 10) / 10,
      medianCitations,
      h_index_equivalent: h,
    };
  }

  /**
   * Convert category to front name
   */
  private categoryToFrontName(category: ResearchCategory): string {
    const names: Record<ResearchCategory, string> = {
      [ResearchCategory.CBT_I]: 'CBT-I Digital Delivery',
      [ResearchCategory.THIRD_WAVE]: 'Third-Wave Therapies for Insomnia',
      [ResearchCategory.PHARMACOLOGICAL]: 'Pharmacological Sleep Interventions',
      [ResearchCategory.DEVICE_BASED]: 'Device-Based Sleep Therapy',
      [ResearchCategory.AI_ML]: 'AI/ML in Sleep Medicine',
      [ResearchCategory.DIGITAL_TWIN]: 'Digital Twin Sleep Modeling',
      [ResearchCategory.WEARABLES]: 'Wearable Sleep Tracking',
      [ResearchCategory.BIOMARKERS]: 'Sleep Biomarkers',
      [ResearchCategory.COMPETITORS]: 'DTx Sleep Market',
      [ResearchCategory.MARKET]: 'Sleep Health Market',
      [ResearchCategory.REGULATORY]: 'DTx Regulatory',
      [ResearchCategory.FUNDING]: 'Sleep Tech Investment',
      [ResearchCategory.NEUROSCIENCE]: 'Sleep Neuroscience',
      [ResearchCategory.CHRONOBIOLOGY]: 'Chronobiology',
      [ResearchCategory.GENETICS]: 'Sleep Genetics',
      [ResearchCategory.MICROBIOME]: 'Gut-Sleep Axis',
    };
    return names[category] || category;
  }

  /**
   * Convert category to description
   */
  private categoryToDescription(category: ResearchCategory): string {
    const descriptions: Record<ResearchCategory, string> = {
      [ResearchCategory.CBT_I]: 'Research on digital delivery of cognitive behavioral therapy for insomnia',
      [ResearchCategory.THIRD_WAVE]: 'Mindfulness, ACT, and metacognitive approaches to sleep disorders',
      [ResearchCategory.PHARMACOLOGICAL]: 'Drug-based treatments for sleep disorders',
      [ResearchCategory.DEVICE_BASED]: 'Neurostimulation and device-based sleep interventions',
      [ResearchCategory.AI_ML]: 'Machine learning applications in sleep medicine',
      [ResearchCategory.DIGITAL_TWIN]: 'Computational modeling and simulation of sleep',
      [ResearchCategory.WEARABLES]: 'Consumer and clinical wearable sleep tracking',
      [ResearchCategory.BIOMARKERS]: 'Biological markers of sleep quality and disorders',
      [ResearchCategory.COMPETITORS]: 'Competitive landscape in digital sleep therapeutics',
      [ResearchCategory.MARKET]: 'Market analysis and business trends',
      [ResearchCategory.REGULATORY]: 'Regulatory pathways for digital therapeutics',
      [ResearchCategory.FUNDING]: 'Investment and funding in sleep technology',
      [ResearchCategory.NEUROSCIENCE]: 'Neural mechanisms of sleep and insomnia',
      [ResearchCategory.CHRONOBIOLOGY]: 'Circadian rhythms and chronotype research',
      [ResearchCategory.GENETICS]: 'Genetic factors in sleep and insomnia',
      [ResearchCategory.MICROBIOME]: 'Gut microbiome influence on sleep',
    };
    return descriptions[category] || `Research related to ${category}`;
  }
}

/**
 * Singleton instance
 */
export const citationAnalyzer = new CitationAnalyzer();
