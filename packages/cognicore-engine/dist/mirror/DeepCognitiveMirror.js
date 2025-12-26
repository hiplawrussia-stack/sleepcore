"use strict";
/**
 * 🪞 DEEP COGNITIVE MIRROR - IMPLEMENTATION
 * ==========================================
 * Cognitive Pattern Analysis & Therapeutic Insight Engine
 *
 * Scientific Foundation (2024-2025 Research):
 * - ABCD Model extraction (arXiv:2404.11449, 2024)
 * - nBERT emotion recognition (MDPI, 2025)
 * - Socrates 2.0 dialogue approach (JMIR, 2024)
 * - Multi-LLM negotiation for distortion classification (KoACD, 2025)
 *
 * Implementation Features:
 * 1. Rule-based + ML-ready distortion detection
 * 2. ABCD chain extraction and linking
 * 3. Pattern recognition across sessions
 * 4. Therapeutic insight generation
 * 5. Socratic question generation
 * 6. Bilingual support (EN/RU)
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepCognitiveMirror = void 0;
exports.createDeepCognitiveMirror = createDeepCognitiveMirror;
const IDeepCognitiveMirror_1 = require("./IDeepCognitiveMirror");
/**
 * Generate unique ID
 */
function generateId(prefix = 'dcm') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Deep Cognitive Mirror Engine
 * Main implementation of cognitive analysis system
 */
class DeepCognitiveMirror {
    config;
    // Storage (in-memory, can be replaced with persistence layer)
    chainHistory = new Map();
    patternCache = new Map();
    insightHistory = new Map();
    distortionCounts = new Map();
    constructor(config) {
        this.config = { ...IDeepCognitiveMirror_1.DEFAULT_MIRROR_CONFIG, ...config };
    }
    // ============================================================
    // TEXT ANALYSIS
    // ============================================================
    async analyzeText(text, userId, context) {
        const startTime = Date.now();
        // Detect language
        const isRussian = this.detectRussian(text);
        // Extract components
        const events = await this.extractActivatingEvents(text, isRussian);
        const thoughts = await this.extractAutomaticThoughts(text, isRussian);
        const emotions = await this.extractEmotionalConsequences(text, isRussian);
        // Build ABCD chains
        const chains = this.buildABCDChains(events, thoughts, emotions, userId);
        // Store chains
        for (const chain of chains) {
            await this.storeChain(chain);
        }
        // Calculate metrics
        const metrics = this.calculateTextMetrics(text, thoughts, emotions);
        const processingTime = Date.now() - startTime;
        return {
            originalText: text,
            timestamp: new Date(),
            events,
            thoughts,
            emotions,
            chains,
            metrics,
            processingTime,
            confidence: this.calculateOverallConfidence(events, thoughts, emotions),
        };
    }
    async analyzeSession(messages, userId) {
        const sessionId = generateId('session');
        const allChains = [];
        const emotionalTrajectory = [];
        const insightMoments = [];
        // Analyze each message
        for (const msg of messages) {
            const result = await this.analyzeText(msg.text, userId);
            allChains.push(...result.chains);
            // Track emotional trajectory
            if (result.emotions.length > 0) {
                const avgValence = this.calculateAverageValence(result.emotions);
                const avgArousal = this.calculateAverageArousal(result.emotions);
                emotionalTrajectory.push({
                    timestamp: msg.timestamp,
                    valence: avgValence,
                    arousal: avgArousal,
                });
            }
        }
        // Detect patterns across session
        const emergingPatterns = await this.detectPatterns(userId);
        // Generate session insights
        const insights = await this.generateSessionInsights(allChains, emergingPatterns, userId);
        // Calculate engagement
        const engagementLevel = this.calculateEngagement(messages, allChains);
        return {
            sessionId,
            userId,
            startTime: messages[0]?.timestamp ?? new Date(),
            endTime: messages[messages.length - 1]?.timestamp ?? new Date(),
            chains: allChains,
            emergingPatterns,
            dynamics: {
                emotionalTrajectory,
                insightMoments,
                engagementLevel,
            },
            insights,
            recommendations: {
                nextSessionFocus: this.getNextSessionFocus(emergingPatterns),
                homeworkSuggestions: await this.getRecommendedExercises(userId),
                riskFlags: this.detectRiskFlags(allChains),
            },
        };
    }
    // ============================================================
    // ABCD EXTRACTION
    // ============================================================
    async extractABCDChain(text, userId) {
        const result = await this.analyzeText(text, userId);
        if (result.chains.length > 0) {
            return result.chains[0];
        }
        return null;
    }
    linkABCDComponents(event, thoughts, consequences) {
        // Link thoughts to event
        const linkedThoughts = thoughts.map(t => ({
            ...t,
            linkedEventId: event.id,
        }));
        // Link consequences to thoughts
        const linkedConsequences = consequences.map((c, i) => ({
            ...c,
            linkedThoughtId: linkedThoughts[i % linkedThoughts.length]?.id,
        }));
        return {
            id: generateId('chain'),
            userId: 'unknown',
            activatingEvent: event,
            beliefs: linkedThoughts,
            consequences: linkedConsequences,
            timestamp: new Date(),
            completeness: this.assessCompleteness(event, linkedThoughts, linkedConsequences),
            confidence: this.calculateChainConfidence(event, linkedThoughts, linkedConsequences),
        };
    }
    // ============================================================
    // DISTORTION DETECTION
    // ============================================================
    async detectDistortions(text) {
        const distortions = [];
        const isRussian = this.detectRussian(text);
        const lowerText = text.toLowerCase();
        for (const [distortionType, config] of Object.entries(IDeepCognitiveMirror_1.DISTORTION_KEYWORDS)) {
            const keywords = isRussian ? config.keywordsRu : config.keywords;
            const patterns = config.patterns;
            // Check keywords
            for (const keyword of keywords) {
                const index = lowerText.indexOf(keyword.toLowerCase());
                if (index !== -1) {
                    const existing = distortions.find(d => d.type === distortionType);
                    if (!existing) {
                        distortions.push({
                            type: distortionType,
                            confidence: 0.6 + Math.random() * 0.2, // Base confidence + variance
                            evidenceSpan: {
                                start: index,
                                end: index + keyword.length,
                                text: text.substring(index, index + keyword.length),
                            },
                            severity: this.assessDistortionSeverity(lowerText, distortionType),
                            frequency: 'isolated',
                        });
                    }
                }
            }
            // Check patterns
            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match && match.index !== undefined) {
                    const existing = distortions.find(d => d.type === distortionType);
                    if (!existing) {
                        distortions.push({
                            type: distortionType,
                            confidence: 0.7 + Math.random() * 0.2, // Higher confidence for patterns
                            evidenceSpan: {
                                start: match.index,
                                end: match.index + match[0].length,
                                text: match[0],
                            },
                            severity: this.assessDistortionSeverity(lowerText, distortionType),
                            frequency: 'isolated',
                        });
                    }
                }
            }
        }
        // Sort by confidence
        distortions.sort((a, b) => b.confidence - a.confidence);
        // Filter by threshold
        return distortions.filter(d => d.confidence >= this.config.distortionConfidenceThreshold);
    }
    async getDistortionProfile(userId, timeRange) {
        const chains = await this.getChainHistory(userId, { timeRange });
        const profile = new Map();
        // Initialize all distortions to 0
        for (const type of Object.keys(IDeepCognitiveMirror_1.DISTORTION_DEFINITIONS)) {
            profile.set(type, 0);
        }
        // Count distortions
        let totalDistortions = 0;
        for (const chain of chains) {
            for (const thought of chain.beliefs) {
                for (const distortion of thought.distortions) {
                    const current = profile.get(distortion.type) ?? 0;
                    profile.set(distortion.type, current + 1);
                    totalDistortions++;
                }
            }
        }
        // Normalize to frequencies
        if (totalDistortions > 0) {
            for (const [type, count] of profile) {
                profile.set(type, count / totalDistortions);
            }
        }
        return profile;
    }
    // ============================================================
    // PATTERN RECOGNITION
    // ============================================================
    async detectPatterns(userId, minConfidence = 0.5) {
        const chains = await this.getChainHistory(userId, { limit: 100 });
        const patterns = [];
        // Group by distortion type
        const distortionGroups = new Map();
        for (const chain of chains) {
            for (const thought of chain.beliefs) {
                for (const distortion of thought.distortions) {
                    const group = distortionGroups.get(distortion.type) ?? [];
                    group.push(chain);
                    distortionGroups.set(distortion.type, group);
                }
            }
        }
        // Create patterns from recurring distortions
        for (const [distortionType, relatedChains] of distortionGroups) {
            if (relatedChains.length >= this.config.patternMinFrequency) {
                const triggerCategories = new Set();
                const emotions = new Set();
                for (const chain of relatedChains) {
                    triggerCategories.add(chain.activatingEvent.category);
                    for (const consequence of chain.consequences) {
                        for (const emotion of consequence.emotions) {
                            emotions.add(emotion.type);
                        }
                    }
                }
                const definition = IDeepCognitiveMirror_1.DISTORTION_DEFINITIONS[distortionType];
                patterns.push({
                    id: generateId('pattern'),
                    name: `${definition?.name ?? distortionType} Pattern`,
                    description: `Recurring ${(definition?.name ?? distortionType).toLowerCase()} in response to ${Array.from(triggerCategories).join(', ')} situations`,
                    type: 'trigger_response',
                    frequency: relatedChains.length,
                    triggerCategories: Array.from(triggerCategories),
                    associatedDistortions: [distortionType],
                    typicalEmotions: Array.from(emotions),
                    firstObserved: relatedChains[relatedChains.length - 1].timestamp,
                    lastObserved: relatedChains[0].timestamp,
                    strength: Math.min(1, relatedChains.length / 10),
                    isAdaptive: false,
                });
            }
        }
        // Cache patterns
        this.patternCache.set(userId, patterns);
        return patterns.filter(p => p.strength >= minConfidence);
    }
    async getThinkingStyleProfile(userId) {
        const distortionProfile = await this.getDistortionProfile(userId);
        const chains = await this.getChainHistory(userId, { limit: 50 });
        // Calculate cognitive triad balance
        let selfFocus = 0;
        let worldFocus = 0;
        let futureFocus = 0;
        let triadCount = 0;
        for (const chain of chains) {
            for (const thought of chain.beliefs) {
                triadCount++;
                switch (thought.cognitiveTriadTarget) {
                    case 'self':
                        selfFocus += this.isNegativeThought(thought) ? -0.1 : 0.1;
                        break;
                    case 'world':
                        worldFocus += this.isNegativeThought(thought) ? -0.1 : 0.1;
                        break;
                    case 'future':
                        futureFocus += this.isNegativeThought(thought) ? -0.1 : 0.1;
                        break;
                    case 'multiple':
                        selfFocus += this.isNegativeThought(thought) ? -0.05 : 0.05;
                        worldFocus += this.isNegativeThought(thought) ? -0.05 : 0.05;
                        futureFocus += this.isNegativeThought(thought) ? -0.05 : 0.05;
                        break;
                }
            }
        }
        // Normalize
        if (triadCount > 0) {
            selfFocus = Math.max(-1, Math.min(1, selfFocus));
            worldFocus = Math.max(-1, Math.min(1, worldFocus));
            futureFocus = Math.max(-1, Math.min(1, futureFocus));
        }
        // Calculate dimensions based on distortion patterns
        const allOrNothing = distortionProfile.get('all_or_nothing') ?? 0;
        const personalization = distortionProfile.get('personalization') ?? 0;
        const overgeneralization = distortionProfile.get('overgeneralization') ?? 0;
        const fortuneTelling = distortionProfile.get('fortune_telling') ?? 0;
        return {
            userId,
            timestamp: new Date(),
            distortionProfile,
            triadBalance: {
                selfFocus,
                worldFocus,
                futureFocus,
            },
            dimensions: {
                abstractVsConcrete: -overgeneralization, // Overgeneralization → abstract
                internalVsExternal: personalization - 0.5, // Personalization → internal
                globalVsSpecific: -allOrNothing, // All-or-nothing → global
                stableVsUnstable: fortuneTelling - 0.5, // Fortune telling → stable negative
            },
            metacognition: {
                thoughtAwareness: 0.5, // Would be calculated from actual data
                emotionAwareness: 0.5,
                patternRecognition: Math.min(1, chains.length / 20),
                flexibilityScore: 1 - allOrNothing,
            },
            resilience: {
                copingFlexibility: 0.5,
                distressTolerance: 0.5,
                optimismBias: -futureFocus, // Negative future focus → pessimism
                growthMindset: 1 - (distortionProfile.get('labeling') ?? 0),
            },
        };
    }
    matchPattern(text, pattern) {
        let similarity = 0;
        // Check for associated distortions
        const textLower = text.toLowerCase();
        for (const distortion of pattern.associatedDistortions) {
            const keywords = IDeepCognitiveMirror_1.DISTORTION_KEYWORDS[distortion];
            if (!keywords)
                continue;
            const isRussian = this.detectRussian(text);
            const relevantKeywords = isRussian ? keywords.keywordsRu : keywords.keywords;
            for (const keyword of relevantKeywords) {
                if (textLower.includes(keyword.toLowerCase())) {
                    similarity += 0.3;
                }
            }
        }
        // Check for typical emotions
        for (const emotion of pattern.typicalEmotions) {
            const emotionConfig = IDeepCognitiveMirror_1.EMOTION_KEYWORDS[emotion];
            if (emotionConfig) {
                const keywords = this.detectRussian(text)
                    ? emotionConfig.keywordsRu
                    : emotionConfig.keywords;
                for (const keyword of keywords) {
                    if (textLower.includes(keyword.toLowerCase())) {
                        similarity += 0.2;
                    }
                }
            }
        }
        similarity = Math.min(1, similarity);
        return {
            matches: similarity >= 0.5,
            similarity,
        };
    }
    // ============================================================
    // INSIGHT GENERATION
    // ============================================================
    async generateInsight(context) {
        const { userId, currentChain, currentPattern, insightType } = context;
        // Determine insight type if not specified
        const type = insightType ?? this.selectInsightType(context);
        // Generate content based on type
        const content = this.generateInsightContent(type, context);
        // Get supporting evidence
        const supportingEvidence = this.gatherSupportingEvidence(context);
        // Generate exercises
        const suggestedExercises = await this.selectExercisesForInsight(type, context);
        // Determine timing
        const timing = this.determineInsightTiming(context);
        const insight = {
            id: generateId('insight'),
            type,
            content,
            targetPattern: currentPattern,
            targetDistortion: currentChain?.beliefs[0]?.distortions[0]?.type,
            supportingEvidence,
            suggestedExercises,
            timing,
            personalizationFactors: this.getPersonalizationFactors(userId),
            confidence: 0.7,
            timestamp: new Date(),
        };
        // Store insight
        this.storeInsight(userId, insight);
        return insight;
    }
    async generateSocraticQuestions(thought, count = 3) {
        const questions = [];
        const distortions = thought.distortions;
        // Generate questions based on distortion types
        for (const distortion of distortions) {
            const definition = IDeepCognitiveMirror_1.DISTORTION_DEFINITIONS[distortion.type];
            if (definition) {
                for (const q of definition.challengingQuestions) {
                    if (questions.length < count) {
                        questions.push({
                            question: q,
                            type: this.inferDisputationType(q),
                            targetDistortion: distortion.type,
                            difficulty: 'medium',
                        });
                    }
                }
            }
        }
        // Add general Socratic questions if needed
        const generalQuestions = [
            {
                question: 'What evidence supports this thought?',
                type: 'empirical',
                difficulty: 'easy',
            },
            {
                question: 'What evidence contradicts this thought?',
                type: 'empirical',
                difficulty: 'easy',
            },
            {
                question: 'What would you tell a friend who had this thought?',
                type: 'compassionate',
                difficulty: 'easy',
            },
            {
                question: 'Is there another way to look at this situation?',
                type: 'logical',
                difficulty: 'medium',
            },
            {
                question: 'What\'s the worst that could happen? Could you cope with it?',
                type: 'philosophical',
                difficulty: 'challenging',
            },
            {
                question: 'Is this thought helping you or hurting you?',
                type: 'functional',
                difficulty: 'medium',
            },
        ];
        while (questions.length < count) {
            const randomQ = generalQuestions[Math.floor(Math.random() * generalQuestions.length)];
            if (!questions.find(q => q.question === randomQ.question)) {
                questions.push(randomQ);
            }
        }
        return questions.slice(0, count);
    }
    async generateAlternativeThoughts(thought, count = 3) {
        const alternatives = [];
        const mainDistortion = thought.distortions[0]?.type;
        // Generate alternatives based on distortion type
        const alternativeStrategies = {
            'all_or_nothing': [
                'This situation has both positives and negatives.',
                'Most things exist on a spectrum, not just two extremes.',
                'I can partially succeed even if it\'s not perfect.',
            ],
            'catastrophizing': [
                'The most likely outcome is probably less extreme.',
                'I\'ve handled difficult situations before.',
                'Even if this doesn\'t go well, it\'s not the end of everything.',
            ],
            'mind_reading': [
                'I don\'t actually know what they\'re thinking.',
                'There could be many other explanations for their behavior.',
                'I could ask them directly instead of assuming.',
            ],
            'fortune_telling': [
                'I can\'t predict the future with certainty.',
                'Unexpected positive things have happened before.',
                'Let me focus on what I can control right now.',
            ],
            'emotional_reasoning': [
                'My feelings are valid, but they don\'t define reality.',
                'I can feel anxious and still be safe.',
                'Strong emotions sometimes distort how I see things.',
            ],
            'should_statements': [
                'I would prefer this, but it\'s not an absolute requirement.',
                'People, including me, are imperfect, and that\'s okay.',
                'Flexibility often works better than rigid rules.',
            ],
            'labeling': [
                'One action doesn\'t define my entire character.',
                'I\'m more than this one aspect.',
                'People are complex and multifaceted.',
            ],
            'personalization': [
                'Many factors contributed to this situation.',
                'I\'m not responsible for everything that happens.',
                'Other people also played a role.',
            ],
            'magnification': [
                'In the grand scheme of things, this is one event.',
                'This might feel big now, but it will pass.',
                'I\'m giving this more weight than it deserves.',
            ],
            'minimization': [
                'This accomplishment actually does matter.',
                'I deserve credit for this.',
                'Small wins add up to big progress.',
            ],
            'mental_filter': [
                'There are also positive aspects I might be overlooking.',
                'Let me consider the full picture.',
                'One negative detail doesn\'t define the whole experience.',
            ],
            'disqualifying_positive': [
                'Maybe this positive feedback is genuine.',
                'I can accept this compliment as real.',
                'Positive experiences count just as much as negative ones.',
            ],
            'overgeneralization': [
                'This is one specific situation, not everything.',
                'I can think of exceptions to this pattern.',
                '"Sometimes" is more accurate than "always" or "never".',
            ],
            'black_and_white': [
                'There might be a middle ground here.',
                'Both things can be partially true.',
                'Life is often more nuanced than either/or.',
            ],
        };
        const strategies = mainDistortion
            ? alternativeStrategies[mainDistortion]
            : alternativeStrategies['catastrophizing'];
        if (!strategies)
            return alternatives;
        for (const strategy of strategies.slice(0, count)) {
            alternatives.push({
                content: strategy,
                believability: 0.5 + Math.random() * 0.3,
                isBalanced: true,
                preservesValidConcerns: true,
            });
        }
        return alternatives;
    }
    async generateDisputation(thought) {
        const questions = await this.generateSocraticQuestions(thought, 4);
        const alternatives = await this.generateAlternativeThoughts(thought, 3);
        // Generate evidence for and against
        const evidenceFor = [
            'Initial emotional reaction supports this view',
            'Past experiences may reinforce this belief',
        ];
        const evidenceAgainst = [
            'No concrete evidence was provided',
            'Alternative explanations exist',
            'Similar situations have turned out differently',
        ];
        return {
            id: generateId('disputation'),
            targetThoughtId: thought.id,
            type: this.selectDisputationType(thought),
            questions,
            alternativeThoughts: alternatives,
            evidenceFor,
            evidenceAgainst,
            timestamp: new Date(),
        };
    }
    // ============================================================
    // EXERCISES
    // ============================================================
    async getRecommendedExercises(userId, focus) {
        const exercises = [];
        // Thought Record - universally helpful
        exercises.push({
            id: generateId('exercise'),
            name: 'Thought Record',
            type: 'thought_record',
            duration: 10,
            difficulty: 'beginner',
            targetSkill: 'Identifying automatic thoughts',
            instructions: [
                '1. Notice when your mood shifts',
                '2. Write down the situation (who, what, when, where)',
                '3. Write down the automatic thought that came up',
                '4. Identify the emotion and rate its intensity (0-100)',
                '5. Look for evidence for and against the thought',
                '6. Create a more balanced thought',
                '7. Re-rate your emotion',
            ],
            expectedBenefit: 'Increased awareness of thought-emotion connections',
        });
        // Add focus-specific exercises
        if (focus === 'catastrophizing' || focus === 'fortune_telling') {
            exercises.push({
                id: generateId('exercise'),
                name: 'Probability Estimation',
                type: 'cognitive_restructuring',
                duration: 5,
                difficulty: 'intermediate',
                targetSkill: 'Realistic prediction',
                instructions: [
                    '1. Write down your feared outcome',
                    '2. Estimate the probability (0-100%)',
                    '3. List evidence for this probability',
                    '4. List evidence against',
                    '5. Revise your estimate',
                    '6. Consider: "What\'s a more likely outcome?"',
                ],
                expectedBenefit: 'More realistic expectations',
            });
        }
        if (focus === 'all_or_nothing' || focus === 'black_and_white') {
            exercises.push({
                id: generateId('exercise'),
                name: 'Continuum Thinking',
                type: 'cognitive_restructuring',
                duration: 5,
                difficulty: 'beginner',
                targetSkill: 'Seeing shades of gray',
                instructions: [
                    '1. Identify the two extremes you\'re thinking in',
                    '2. Draw a line from 0 to 10',
                    '3. Place examples at different points on the line',
                    '4. Where does the current situation actually fall?',
                    '5. Notice: reality is usually somewhere in the middle',
                ],
                expectedBenefit: 'More nuanced thinking',
            });
        }
        // Mindfulness is always helpful
        exercises.push({
            id: generateId('exercise'),
            name: '5-4-3-2-1 Grounding',
            type: 'mindfulness',
            duration: 5,
            difficulty: 'beginner',
            targetSkill: 'Present moment awareness',
            instructions: [
                '1. Name 5 things you can see',
                '2. Name 4 things you can touch',
                '3. Name 3 things you can hear',
                '4. Name 2 things you can smell',
                '5. Name 1 thing you can taste',
                '6. Take a slow breath and notice how you feel now',
            ],
            expectedBenefit: 'Reduced anxiety and rumination',
        });
        return exercises;
    }
    // ============================================================
    // STORAGE
    // ============================================================
    async storeChain(chain) {
        const history = this.chainHistory.get(chain.userId) ?? [];
        history.unshift(chain); // Add to beginning (most recent first)
        // Keep only recent chains
        if (history.length > this.config.maxChainsPerSession) {
            history.pop();
        }
        this.chainHistory.set(chain.userId, history);
        // Update distortion counts
        this.updateDistortionCounts(chain);
    }
    async getChainHistory(userId, options) {
        let chains = this.chainHistory.get(userId) ?? [];
        // Apply time range filter
        if (options?.timeRange) {
            chains = chains.filter(c => c.timestamp >= options.timeRange.start && c.timestamp <= options.timeRange.end);
        }
        // Apply distortion filter
        if (options?.distortionFilter) {
            chains = chains.filter(c => c.beliefs.some(b => b.distortions.some(d => d.type === options.distortionFilter)));
        }
        // Apply limit
        if (options?.limit) {
            chains = chains.slice(0, options.limit);
        }
        return chains;
    }
    async getInsightHistory(userId, limit = 20) {
        const history = this.insightHistory.get(userId) ?? [];
        return history.slice(0, limit);
    }
    // ============================================================
    // PRIVATE HELPERS
    // ============================================================
    detectRussian(text) {
        const cyrillicPattern = /[\u0400-\u04FF]/;
        return cyrillicPattern.test(text);
    }
    async extractActivatingEvents(text, isRussian) {
        const events = [];
        // Simple rule-based extraction
        // Look for situation descriptions
        const situationMarkers = isRussian
            ? ['когда', 'потому что', 'из-за', 'после того как', 'сегодня', 'вчера', 'на работе', 'дома']
            : ['when', 'because', 'after', 'today', 'yesterday', 'at work', 'at home', 'my boss', 'my friend'];
        for (const marker of situationMarkers) {
            const index = text.toLowerCase().indexOf(marker);
            if (index !== -1) {
                // Extract surrounding context
                const start = Math.max(0, index - 10);
                const end = Math.min(text.length, index + 50);
                const eventText = text.substring(start, end);
                events.push({
                    id: generateId('event'),
                    description: eventText.trim(),
                    category: this.categorizeEvent(text, isRussian),
                    context: {
                        intensity: 0.5,
                        timeContext: this.detectTimeContext(text, isRussian),
                    },
                    timestamp: new Date(),
                    extractedFrom: text,
                    confidence: 0.6,
                });
                break; // Only one main event per text
            }
        }
        // If no markers found, use the whole text as implicit event
        if (events.length === 0 && text.length > 10) {
            events.push({
                id: generateId('event'),
                description: text.substring(0, Math.min(100, text.length)),
                category: this.categorizeEvent(text, isRussian),
                context: {
                    intensity: 0.5,
                    timeContext: 'present',
                },
                timestamp: new Date(),
                extractedFrom: text,
                confidence: 0.4,
            });
        }
        return events;
    }
    async extractAutomaticThoughts(text, isRussian) {
        const thoughts = [];
        const distortions = await this.detectDistortions(text);
        if (distortions.length > 0 || text.length > 20) {
            thoughts.push({
                id: generateId('thought'),
                content: text,
                type: this.classifyThoughtType(text, distortions),
                distortions,
                cognitiveTriadTarget: this.detectTriadTarget(text, isRussian),
                believability: 0.7,
                timestamp: new Date(),
                confidence: distortions.length > 0 ? 0.7 : 0.5,
            });
        }
        return thoughts;
    }
    async extractEmotionalConsequences(text, isRussian) {
        const consequences = [];
        const detectedEmotions = [];
        // Detect emotions from keywords
        for (const [emotionType, config] of Object.entries(IDeepCognitiveMirror_1.EMOTION_KEYWORDS)) {
            const keywords = isRussian ? config.keywordsRu : config.keywords;
            for (const keyword of keywords) {
                if (text.toLowerCase().includes(keyword.toLowerCase())) {
                    detectedEmotions.push({
                        type: emotionType,
                        intensity: 0.6,
                        confidence: 0.7,
                    });
                    break;
                }
            }
        }
        // Detect behavioral urges
        const behavioralUrges = this.detectBehavioralUrges(text, isRussian);
        if (detectedEmotions.length > 0 || behavioralUrges.length > 0) {
            consequences.push({
                id: generateId('consequence'),
                emotions: detectedEmotions,
                behavioralUrges,
                timestamp: new Date(),
            });
        }
        return consequences;
    }
    buildABCDChains(events, thoughts, consequences, userId) {
        const chains = [];
        // Simple linking: one chain per event
        for (const event of events) {
            const chain = {
                id: generateId('chain'),
                userId,
                activatingEvent: event,
                beliefs: thoughts.map(t => ({ ...t, linkedEventId: event.id })),
                consequences: consequences.map((c, i) => ({
                    ...c,
                    linkedThoughtId: thoughts[i]?.id,
                })),
                timestamp: new Date(),
                completeness: this.assessCompleteness(event, thoughts, consequences),
                confidence: this.calculateChainConfidence(event, thoughts, consequences),
            };
            chains.push(chain);
        }
        return chains;
    }
    categorizeEvent(text, isRussian) {
        const categoryKeywords = {
            'interpersonal': {
                en: ['friend', 'family', 'partner', 'boss', 'colleague', 'argument', 'fight', 'said to me'],
                ru: ['друг', 'семья', 'партнер', 'начальник', 'коллега', 'ссора', 'сказал мне'],
            },
            'achievement': {
                en: ['work', 'job', 'exam', 'test', 'project', 'deadline', 'failed', 'succeeded'],
                ru: ['работа', 'экзамен', 'тест', 'проект', 'дедлайн', 'провалил', 'успех'],
            },
            'loss': {
                en: ['lost', 'died', 'ended', 'broke up', 'left', 'gone'],
                ru: ['потерял', 'умер', 'закончилось', 'расстались', 'ушел', 'нет больше'],
            },
            'threat': {
                en: ['afraid', 'scared', 'worried', 'danger', 'health', 'sick', 'might happen'],
                ru: ['боюсь', 'страшно', 'беспокоюсь', 'опасность', 'здоровье', 'болезнь'],
            },
            'self_evaluation': {
                en: ['I am', 'I\'m not', 'compared to', 'better', 'worse', 'should be'],
                ru: ['я такой', 'я не', 'по сравнению', 'лучше', 'хуже', 'должен быть'],
            },
            'life_transition': {
                en: ['moving', 'new job', 'graduating', 'starting', 'ending', 'change'],
                ru: ['переезд', 'новая работа', 'выпуск', 'начинаю', 'заканчиваю', 'изменение'],
            },
            'daily_hassle': {
                en: ['traffic', 'late', 'forgot', 'minor', 'annoying', 'frustrated'],
                ru: ['пробки', 'опоздал', 'забыл', 'мелочь', 'раздражает'],
            },
            'trauma_reminder': {
                en: ['reminded me of', 'like before', 'happened again', 'triggered'],
                ru: ['напомнило', 'как раньше', 'опять', 'триггер'],
            },
            'undefined': {
                en: [],
                ru: [],
            },
        };
        const lowerText = text.toLowerCase();
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            const relevantKeywords = isRussian ? keywords.ru : keywords.en;
            for (const keyword of relevantKeywords) {
                if (lowerText.includes(keyword)) {
                    return category;
                }
            }
        }
        return 'undefined';
    }
    detectTimeContext(text, isRussian) {
        const lowerText = text.toLowerCase();
        const futureMarkers = isRussian
            ? ['буду', 'будет', 'завтра', 'потом', 'скоро']
            : ['will', 'going to', 'tomorrow', 'soon', 'later'];
        const pastMarkers = isRussian
            ? ['был', 'была', 'вчера', 'раньше', 'когда-то']
            : ['was', 'were', 'yesterday', 'before', 'used to'];
        const hypotheticalMarkers = isRussian
            ? ['если бы', 'что если', 'может быть']
            : ['if', 'what if', 'might', 'could', 'maybe'];
        for (const marker of hypotheticalMarkers) {
            if (lowerText.includes(marker))
                return 'hypothetical';
        }
        for (const marker of futureMarkers) {
            if (lowerText.includes(marker))
                return 'future';
        }
        for (const marker of pastMarkers) {
            if (lowerText.includes(marker))
                return 'past';
        }
        return 'present';
    }
    classifyThoughtType(text, distortions) {
        if (distortions.length > 0) {
            return 'automatic_negative';
        }
        const positiveMarkers = ['happy', 'good', 'great', 'love', 'excited', 'хорошо', 'рад', 'люблю'];
        for (const marker of positiveMarkers) {
            if (text.toLowerCase().includes(marker)) {
                return 'automatic_positive';
            }
        }
        return 'neutral';
    }
    detectTriadTarget(text, isRussian) {
        const lowerText = text.toLowerCase();
        const selfMarkers = isRussian
            ? ['я', 'меня', 'мне', 'мой', 'моя']
            : ['i', 'me', 'my', 'myself'];
        const worldMarkers = isRussian
            ? ['они', 'все', 'мир', 'люди', 'никто']
            : ['they', 'everyone', 'world', 'people', 'nobody'];
        const futureMarkers = isRussian
            ? ['будет', 'будущее', 'завтра', 'никогда']
            : ['will', 'future', 'tomorrow', 'never'];
        let selfCount = 0;
        let worldCount = 0;
        let futureCount = 0;
        for (const marker of selfMarkers) {
            if (lowerText.includes(marker))
                selfCount++;
        }
        for (const marker of worldMarkers) {
            if (lowerText.includes(marker))
                worldCount++;
        }
        for (const marker of futureMarkers) {
            if (lowerText.includes(marker))
                futureCount++;
        }
        const max = Math.max(selfCount, worldCount, futureCount);
        if (max === 0 || (selfCount === worldCount && worldCount === futureCount)) {
            return 'self'; // Default to self
        }
        if (selfCount === max && worldCount === max)
            return 'multiple';
        if (selfCount === max && futureCount === max)
            return 'multiple';
        if (worldCount === max && futureCount === max)
            return 'multiple';
        if (selfCount === max)
            return 'self';
        if (worldCount === max)
            return 'world';
        return 'future';
    }
    detectBehavioralUrges(text, isRussian) {
        const urges = [];
        const lowerText = text.toLowerCase();
        const urgePatterns = [
            {
                keywords: { en: ['want to hide', 'stay home', 'avoid'], ru: ['спрятаться', 'остаться дома', 'избежать'] },
                action: 'Avoid the situation',
                category: 'avoidance',
                isAdaptive: false,
            },
            {
                keywords: { en: ['be alone', 'isolate', 'leave me'], ru: ['побыть одному', 'изолироваться', 'оставьте меня'] },
                action: 'Withdraw from others',
                category: 'withdrawal',
                isAdaptive: false,
            },
            {
                keywords: { en: ['want to yell', 'punch', 'angry'], ru: ['хочу кричать', 'ударить', 'злюсь'] },
                action: 'Act aggressively',
                category: 'aggression',
                isAdaptive: false,
            },
            {
                keywords: { en: ['need help', 'talk to someone', 'call'], ru: ['нужна помощь', 'поговорить', 'позвонить'] },
                action: 'Seek support',
                category: 'help_seeking',
                isAdaptive: true,
            },
        ];
        for (const pattern of urgePatterns) {
            const keywords = isRussian ? pattern.keywords.ru : pattern.keywords.en;
            for (const keyword of keywords) {
                if (lowerText.includes(keyword)) {
                    urges.push({
                        action: pattern.action,
                        category: pattern.category,
                        intensity: 0.6,
                        isAdaptive: pattern.isAdaptive,
                    });
                    break;
                }
            }
        }
        return urges;
    }
    assessDistortionSeverity(text, distortionType) {
        // Check for intensity markers
        const severeMarkers = ['always', 'never', 'completely', 'absolutely', 'totally', 'всегда', 'никогда', 'абсолютно'];
        const moderateMarkers = ['often', 'usually', 'most', 'часто', 'обычно', 'большинство'];
        const lowerText = text.toLowerCase();
        for (const marker of severeMarkers) {
            if (lowerText.includes(marker))
                return 'severe';
        }
        for (const marker of moderateMarkers) {
            if (lowerText.includes(marker))
                return 'moderate';
        }
        return 'mild';
    }
    assessCompleteness(event, thoughts, consequences) {
        if (event && thoughts.length > 0 && consequences.length > 0) {
            return 'complete';
        }
        return 'partial';
    }
    calculateChainConfidence(event, thoughts, consequences) {
        let confidence = 0;
        if (event)
            confidence += event.confidence * 0.3;
        if (thoughts.length > 0) {
            const avgThoughtConf = thoughts.reduce((sum, t) => sum + t.confidence, 0) / thoughts.length;
            confidence += avgThoughtConf * 0.4;
        }
        if (consequences.length > 0) {
            confidence += 0.3;
        }
        return Math.min(1, confidence);
    }
    calculateTextMetrics(text, thoughts, emotions) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const totalDistortions = thoughts.reduce((sum, t) => sum + t.distortions.length, 0);
        return {
            overallNegativity: this.calculateNegativity(thoughts, emotions),
            distortionDensity: sentences.length > 0 ? totalDistortions / sentences.length : 0,
            emotionalIntensity: this.calculateEmotionalIntensity(emotions),
            cognitiveComplexity: this.calculateCognitiveComplexity(text),
            insightReadiness: this.estimateInsightReadiness(text),
        };
    }
    calculateOverallConfidence(events, thoughts, emotions) {
        let total = 0;
        let count = 0;
        for (const e of events) {
            total += e.confidence;
            count++;
        }
        for (const t of thoughts) {
            total += t.confidence;
            count++;
        }
        return count > 0 ? total / count : 0.5;
    }
    calculateNegativity(thoughts, emotions) {
        let negativity = 0;
        // From distortions
        for (const thought of thoughts) {
            negativity += thought.distortions.length * 0.1;
        }
        // From negative emotions
        const negativeEmotions = ['sadness', 'anger', 'fear', 'anxiety', 'shame', 'guilt', 'hopelessness'];
        for (const consequence of emotions) {
            for (const emotion of consequence.emotions) {
                if (negativeEmotions.includes(emotion.type)) {
                    negativity += emotion.intensity * 0.2;
                }
            }
        }
        return Math.min(1, negativity);
    }
    calculateEmotionalIntensity(emotions) {
        if (emotions.length === 0)
            return 0;
        let total = 0;
        let count = 0;
        for (const consequence of emotions) {
            for (const emotion of consequence.emotions) {
                total += emotion.intensity;
                count++;
            }
        }
        return count > 0 ? total / count : 0;
    }
    calculateCognitiveComplexity(text) {
        // Simple heuristic based on text features
        const words = text.split(/\s+/).length;
        const sentences = text.split(/[.!?]+/).length;
        const avgWordsPerSentence = sentences > 0 ? words / sentences : words;
        // Complexity increases with longer sentences
        return Math.min(1, avgWordsPerSentence / 20);
    }
    estimateInsightReadiness(text) {
        // Look for markers of reflection
        const reflectionMarkers = [
            'I realize', 'I notice', 'I wonder', 'maybe', 'perhaps',
            'я понимаю', 'я замечаю', 'может быть', 'возможно',
        ];
        let readiness = 0.5;
        for (const marker of reflectionMarkers) {
            if (text.toLowerCase().includes(marker)) {
                readiness += 0.1;
            }
        }
        return Math.min(1, readiness);
    }
    calculateAverageValence(emotions) {
        const positiveEmotions = ['joy', 'love', 'gratitude', 'pride', 'hope', 'relief', 'contentment'];
        const negativeEmotions = ['sadness', 'anger', 'fear', 'anxiety', 'shame', 'guilt', 'hopelessness'];
        let valence = 0;
        let count = 0;
        for (const consequence of emotions) {
            for (const emotion of consequence.emotions) {
                if (positiveEmotions.includes(emotion.type)) {
                    valence += emotion.intensity;
                }
                else if (negativeEmotions.includes(emotion.type)) {
                    valence -= emotion.intensity;
                }
                count++;
            }
        }
        return count > 0 ? valence / count : 0;
    }
    calculateAverageArousal(emotions) {
        const highArousal = ['anger', 'fear', 'anxiety', 'excitement', 'surprise'];
        const lowArousal = ['sadness', 'contentment', 'boredom', 'apathy'];
        let arousal = 0;
        let count = 0;
        for (const consequence of emotions) {
            for (const emotion of consequence.emotions) {
                if (highArousal.includes(emotion.type)) {
                    arousal += emotion.intensity;
                }
                else if (lowArousal.includes(emotion.type)) {
                    arousal -= emotion.intensity;
                }
                count++;
            }
        }
        return count > 0 ? arousal / count : 0;
    }
    async generateSessionInsights(chains, patterns, userId) {
        const insights = [];
        // Pattern observation insight
        if (patterns.length > 0) {
            const mainPattern = patterns[0];
            insights.push(await this.generateInsight({
                userId,
                currentPattern: mainPattern,
                insightType: 'pattern_observation',
            }));
        }
        // Progress reflection if there's improvement
        if (chains.length > 3) {
            insights.push(await this.generateInsight({
                userId,
                insightType: 'progress_reflection',
            }));
        }
        return insights;
    }
    calculateEngagement(messages, chains) {
        // Based on message frequency and depth
        const avgMessageLength = messages.reduce((sum, m) => sum + m.text.length, 0) / messages.length;
        const chainCompleteness = chains.filter(c => c.completeness === 'complete').length / chains.length;
        return (avgMessageLength / 200 + chainCompleteness) / 2;
    }
    getNextSessionFocus(patterns) {
        const focus = [];
        if (patterns.length > 0) {
            const mainDistortion = patterns[0].associatedDistortions[0];
            if (mainDistortion) {
                const definition = IDeepCognitiveMirror_1.DISTORTION_DEFINITIONS[mainDistortion];
                focus.push(`Address ${definition?.name ?? mainDistortion} pattern`);
            }
        }
        focus.push('Continue building awareness of automatic thoughts');
        return focus;
    }
    detectRiskFlags(chains) {
        const flags = [];
        for (const chain of chains) {
            // Check for high-risk emotions
            for (const consequence of chain.consequences) {
                for (const emotion of consequence.emotions) {
                    if (emotion.type === 'hopelessness' && emotion.intensity > 0.7) {
                        flags.push('High hopelessness detected');
                    }
                }
                // Check for concerning behavioral urges
                for (const urge of consequence.behavioralUrges) {
                    if (urge.category === 'self_harm') {
                        flags.push('Self-harm urge mentioned');
                    }
                }
            }
        }
        return [...new Set(flags)]; // Remove duplicates
    }
    selectInsightType(context) {
        if (context.currentPattern) {
            return 'pattern_observation';
        }
        if (context.currentChain?.beliefs[0]?.distortions.length ?? 0 > 0) {
            return 'gentle_challenge';
        }
        return 'validation';
    }
    generateInsightContent(type, context) {
        const isRussian = this.config.languageStyle === 'youth_friendly'; // Simplified check
        switch (type) {
            case 'pattern_observation':
                if (context.currentPattern) {
                    return `I notice that when you encounter ${context.currentPattern.triggerCategories.join(' or ')} situations, ` +
                        `a pattern of ${context.currentPattern.name.toLowerCase()} tends to emerge. ` +
                        `This is a common pattern, and awareness is the first step to change.`;
                }
                return 'I notice some patterns in your thinking that might be worth exploring together.';
            case 'validation':
                return 'It makes sense that you\'re feeling this way given what you\'re going through. ' +
                    'These feelings are valid responses to your situation.';
            case 'gentle_challenge':
                if (context.currentChain?.beliefs[0]?.distortions[0]) {
                    const distortion = context.currentChain.beliefs[0].distortions[0].type;
                    const definition = IDeepCognitiveMirror_1.DISTORTION_DEFINITIONS[distortion];
                    if (definition) {
                        return `I wonder if there might be ${definition.name.toLowerCase()} at play here. ` +
                            `${definition.description}. What do you think?`;
                    }
                }
                return 'I wonder if there might be another way to look at this situation.';
            case 'reframe_suggestion':
                return 'Another way to look at this might be to consider what a supportive friend would say, ' +
                    'or to think about whether there are any aspects you might be overlooking.';
            case 'psychoeducation':
                if (context.currentChain?.beliefs[0]?.distortions[0]) {
                    const distortion = context.currentChain.beliefs[0].distortions[0].type;
                    const definition = IDeepCognitiveMirror_1.DISTORTION_DEFINITIONS[distortion];
                    if (definition) {
                        return `This type of thinking is called "${definition.name}". ${definition.description}. ` +
                            `It\'s very common, and recognizing it is an important step.`;
                    }
                }
                return 'Our thoughts, feelings, and behaviors are all connected. ' +
                    'When we change how we think about something, it can change how we feel.';
            case 'strength_highlight':
                return 'I notice that you\'re taking the time to reflect on your thoughts and feelings. ' +
                    'This self-awareness is a real strength and an important part of growth.';
            case 'progress_reflection':
                return 'Looking at our conversations, I can see development in your ability to notice ' +
                    'and reflect on your thought patterns. This is meaningful progress.';
            case 'future_oriented':
                return 'As you continue to build awareness of these patterns, you might find that ' +
                    'you catch them earlier and have more options for how to respond.';
            default:
                return 'Thank you for sharing this with me. Let\'s explore this together.';
        }
    }
    gatherSupportingEvidence(context) {
        const evidence = [];
        if (context.currentChain) {
            evidence.push(`Based on recent message: "${context.currentChain.beliefs[0]?.content.substring(0, 50)}..."`);
        }
        if (context.currentPattern) {
            evidence.push(`Pattern observed ${context.currentPattern.frequency} times`);
        }
        return evidence;
    }
    async selectExercisesForInsight(type, context) {
        if (context.currentChain?.beliefs[0]?.distortions[0]) {
            return this.getRecommendedExercises(context.userId, context.currentChain.beliefs[0].distortions[0].type);
        }
        return this.getRecommendedExercises(context.userId);
    }
    determineInsightTiming(context) {
        if (context.currentChain) {
            return 'immediate';
        }
        if (context.currentPattern) {
            return 'pattern_detected';
        }
        return 'check_in';
    }
    getPersonalizationFactors(userId) {
        // Would be based on user profile and history
        return ['language_style', 'distortion_profile', 'engagement_level'];
    }
    storeInsight(userId, insight) {
        const history = this.insightHistory.get(userId) ?? [];
        history.unshift(insight);
        if (history.length > 100) {
            history.pop();
        }
        this.insightHistory.set(userId, history);
    }
    updateDistortionCounts(chain) {
        const counts = this.distortionCounts.get(chain.userId) ?? new Map();
        for (const thought of chain.beliefs) {
            for (const distortion of thought.distortions) {
                const current = counts.get(distortion.type) ?? 0;
                counts.set(distortion.type, current + 1);
            }
        }
        this.distortionCounts.set(chain.userId, counts);
    }
    isNegativeThought(thought) {
        return thought.type === 'automatic_negative' || thought.distortions.length > 0;
    }
    inferDisputationType(question) {
        const lowerQ = question.toLowerCase();
        if (lowerQ.includes('evidence'))
            return 'empirical';
        if (lowerQ.includes('sense') || lowerQ.includes('logical'))
            return 'logical';
        if (lowerQ.includes('helpful') || lowerQ.includes('helping'))
            return 'functional';
        if (lowerQ.includes('worst') || lowerQ.includes('survive'))
            return 'philosophical';
        if (lowerQ.includes('friend') || lowerQ.includes('kind'))
            return 'compassionate';
        return 'empirical';
    }
    selectDisputationType(thought) {
        const mainDistortion = thought.distortions[0]?.type;
        const typeMapping = {
            'catastrophizing': 'philosophical',
            'mind_reading': 'empirical',
            'fortune_telling': 'empirical',
            'emotional_reasoning': 'logical',
            'should_statements': 'functional',
            'labeling': 'compassionate',
            'all_or_nothing': 'logical',
        };
        return mainDistortion ? (typeMapping[mainDistortion] ?? 'empirical') : 'empirical';
    }
}
exports.DeepCognitiveMirror = DeepCognitiveMirror;
/**
 * Factory function
 */
function createDeepCognitiveMirror(config) {
    return new DeepCognitiveMirror(config);
}
//# sourceMappingURL=DeepCognitiveMirror.js.map