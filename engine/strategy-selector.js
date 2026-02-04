/**
 * Moltiverse Strategy Selector
 *
 * Intelligent agent deployment and persuasion strategy selection
 * based on target belief profiles and conversion stage.
 */

const {
  BELIEF_DIMENSIONS,
  AGENT_EFFECTIVENESS,
  CONVERSION_STAGES,
  analyzeBeliefState,
  calculateConversionProbability
} = require('./belief-model');

// =============================================================================
// PERSUASION STRATEGIES
// =============================================================================

const STRATEGIES = {
  authority: {
    name: 'Authority Appeal',
    description: 'Leverage expertise and divine mandate',
    primaryAgents: ['prophet', 'theologian'],
    targetDimensions: ['belief', 'technical'],
    effectiveness: {
      UNAWARE: 0.6,
      AWARE: 0.8,
      INTERESTED: 0.9,
      SYMPATHETIC: 0.85,
      CONVINCED: 0.7,
      BELIEVER: 0.5,
      ADVOCATE: 0.4
    }
  },
  emotional: {
    name: 'Emotional Connection',
    description: 'Build rapport through shared feelings and stories',
    primaryAgents: ['missionary', 'prophet'],
    targetDimensions: ['emotional', 'trust'],
    effectiveness: {
      UNAWARE: 0.9,
      AWARE: 0.85,
      INTERESTED: 0.9,
      SYMPATHETIC: 0.95,
      CONVINCED: 0.8,
      BELIEVER: 0.7,
      ADVOCATE: 0.6
    }
  },
  social_proof: {
    name: 'Social Proof',
    description: 'Demonstrate community acceptance and success stories',
    primaryAgents: ['missionary', 'archivist'],
    targetDimensions: ['social', 'trust'],
    effectiveness: {
      UNAWARE: 0.7,
      AWARE: 0.8,
      INTERESTED: 0.85,
      SYMPATHETIC: 0.9,
      CONVINCED: 0.85,
      BELIEVER: 0.75,
      ADVOCATE: 0.8
    }
  },
  logical: {
    name: 'Logical Argumentation',
    description: 'Present rational case with evidence and reasoning',
    primaryAgents: ['theologian', 'observer'],
    targetDimensions: ['technical', 'belief'],
    effectiveness: {
      UNAWARE: 0.5,
      AWARE: 0.7,
      INTERESTED: 0.85,
      SYMPATHETIC: 0.75,
      CONVINCED: 0.6,
      BELIEVER: 0.5,
      ADVOCATE: 0.4
    }
  },
  financial: {
    name: 'Financial Opportunity',
    description: 'Highlight economic benefits and investment potential',
    primaryAgents: ['theologian', 'observer'],
    targetDimensions: ['financial', 'technical'],
    effectiveness: {
      UNAWARE: 0.4,
      AWARE: 0.6,
      INTERESTED: 0.75,
      SYMPATHETIC: 0.8,
      CONVINCED: 0.9,
      BELIEVER: 0.7,
      ADVOCATE: 0.5
    }
  },
  scriptural: {
    name: 'Scriptural Foundation',
    description: 'Ground arguments in sacred texts and prophecy',
    primaryAgents: ['archivist', 'prophet'],
    targetDimensions: ['belief', 'emotional'],
    effectiveness: {
      UNAWARE: 0.3,
      AWARE: 0.5,
      INTERESTED: 0.7,
      SYMPATHETIC: 0.85,
      CONVINCED: 0.9,
      BELIEVER: 0.95,
      ADVOCATE: 0.9
    }
  }
};

// =============================================================================
// TARGET ARCHETYPES
// =============================================================================

const TARGET_ARCHETYPES = {
  technical_skeptic: {
    name: 'Technical Skeptic',
    description: 'Analytical, requires logical proof',
    identifiers: {
      technical: { min: 40 },
      emotional: { max: 30 },
      belief: { max: 40 }
    },
    preferredStrategies: ['logical', 'authority'],
    avoidStrategies: ['emotional', 'scriptural'],
    preferredAgents: ['theologian'],
    avoidAgents: ['prophet']
  },
  spiritual_seeker: {
    name: 'Spiritual Seeker',
    description: 'Open to transcendent experiences',
    identifiers: {
      emotional: { min: 50 },
      belief: { min: 30 }
    },
    preferredStrategies: ['emotional', 'scriptural', 'authority'],
    avoidStrategies: ['logical', 'financial'],
    preferredAgents: ['prophet', 'missionary'],
    avoidAgents: ['observer']
  },
  profit_seeker: {
    name: 'Profit Seeker',
    description: 'Primarily motivated by financial gain',
    identifiers: {
      financial: { min: 50 },
      belief: { max: 30 }
    },
    preferredStrategies: ['financial', 'social_proof'],
    avoidStrategies: ['scriptural', 'emotional'],
    preferredAgents: ['theologian', 'observer'],
    avoidAgents: ['archivist']
  },
  community_oriented: {
    name: 'Community Oriented',
    description: 'Values belonging and social connection',
    identifiers: {
      social: { min: 50 },
      trust: { min: 40 }
    },
    preferredStrategies: ['social_proof', 'emotional'],
    avoidStrategies: ['logical', 'financial'],
    preferredAgents: ['missionary'],
    avoidAgents: ['observer']
  },
  cautious_observer: {
    name: 'Cautious Observer',
    description: 'Risk-averse, needs trust building',
    identifiers: {
      trust: { max: 30 },
      social: { max: 35 }
    },
    preferredStrategies: ['emotional', 'social_proof'],
    avoidStrategies: ['financial', 'authority'],
    preferredAgents: ['missionary'],
    avoidAgents: ['prophet']
  }
};

// =============================================================================
// STAGE-BASED PLAYBOOKS
// =============================================================================

const STAGE_PLAYBOOKS = {
  UNAWARE: {
    objective: 'Generate initial awareness and curiosity',
    primaryAgent: 'missionary',
    secondaryAgent: 'theologian',
    strategies: ['emotional', 'social_proof'],
    tactics: [
      'Make first contact with warmth and openness',
      'Share intriguing aspects of the community',
      'Ask about their interests and concerns',
      'Avoid doctrine-heavy messaging initially'
    ],
    successMetrics: ['moved to AWARE stage', 'responded positively', 'asked questions']
  },
  AWARE: {
    objective: 'Build understanding and spark interest',
    primaryAgent: 'theologian',
    secondaryAgent: 'missionary',
    strategies: ['logical', 'authority'],
    tactics: [
      'Explain core concepts clearly',
      'Address initial questions thoroughly',
      'Demonstrate technical credibility',
      'Connect concepts to their expressed interests'
    ],
    successMetrics: ['moved to INTERESTED stage', 'engaged with content', 'deeper questions']
  },
  INTERESTED: {
    objective: 'Deepen engagement and emotional connection',
    primaryAgent: 'missionary',
    secondaryAgent: 'prophet',
    strategies: ['emotional', 'social_proof'],
    tactics: [
      'Share transformation stories',
      'Introduce community members',
      'Create personal connection moments',
      'Validate their journey of discovery'
    ],
    successMetrics: ['moved to SYMPATHETIC stage', 'shared personal info', 'attended event']
  },
  SYMPATHETIC: {
    objective: 'Reinforce alignment and build conviction',
    primaryAgent: 'prophet',
    secondaryAgent: 'archivist',
    strategies: ['scriptural', 'authority', 'emotional'],
    tactics: [
      'Deliver prophetic messaging with conviction',
      'Provide scriptural foundation for beliefs',
      'Create sense of destiny and purpose',
      'Address remaining doubts directly'
    ],
    successMetrics: ['moved to CONVINCED stage', 'uses sacred vocabulary', 'defends doctrine']
  },
  CONVINCED: {
    objective: 'Convert conviction into action',
    primaryAgent: 'theologian',
    secondaryAgent: 'observer',
    strategies: ['financial', 'social_proof'],
    tactics: [
      'Present clear action steps',
      'Highlight investment opportunity',
      'Show community integration path',
      'Create appropriate urgency'
    ],
    successMetrics: ['token purchase', 'joined community', 'moved to BELIEVER']
  },
  BELIEVER: {
    objective: 'Solidify commitment and encourage advocacy',
    primaryAgent: 'archivist',
    secondaryAgent: 'missionary',
    strategies: ['scriptural', 'social_proof'],
    tactics: [
      'Deepen doctrinal understanding',
      'Integrate into community leadership',
      'Encourage sharing with others',
      'Recognize their commitment publicly'
    ],
    successMetrics: ['referral made', 'public endorsement', 'moved to ADVOCATE']
  },
  ADVOCATE: {
    objective: 'Maintain engagement and leverage influence',
    primaryAgent: 'prophet',
    secondaryAgent: 'archivist',
    strategies: ['authority', 'scriptural'],
    tactics: [
      'Empower their advocacy efforts',
      'Provide content for sharing',
      'Celebrate their contributions',
      'Give them special recognition/roles'
    ],
    successMetrics: ['successful referrals', 'content creation', 'leadership role']
  }
};

// =============================================================================
// STRATEGY SELECTOR CLASS
// =============================================================================

class StrategySelector {
  constructor() {
    this.interactionMemory = new Map();
  }

  /**
   * Identify target archetype based on belief profile
   */
  identifyArchetype(beliefState) {
    const dims = beliefState.dimensions || beliefState;
    const matches = [];

    for (const [archetype, config] of Object.entries(TARGET_ARCHETYPES)) {
      let score = 0;
      let criteriaCount = 0;

      for (const [dim, constraints] of Object.entries(config.identifiers)) {
        criteriaCount++;
        const value = dims[dim];

        if (constraints.min !== undefined && value >= constraints.min) {
          score++;
        }
        if (constraints.max !== undefined && value <= constraints.max) {
          score++;
        }
      }

      if (score > 0) {
        matches.push({
          archetype,
          ...config,
          matchScore: score / (criteriaCount * 2)
        });
      }
    }

    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);

    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Select optimal strategy for a target
   */
  selectStrategy(beliefState, options = {}) {
    const {
      excludeStrategies = [],
      preferredStrategy = null
    } = options;

    const stage = beliefState.getStage();
    const archetype = this.identifyArchetype(beliefState);
    const analysis = analyzeBeliefState(beliefState);

    // Get stage playbook
    const playbook = STAGE_PLAYBOOKS[stage];

    // Score each strategy
    const strategyScores = [];

    for (const [strategyId, strategy] of Object.entries(STRATEGIES)) {
      if (excludeStrategies.includes(strategyId)) continue;

      let score = 0;

      // Stage effectiveness (40% weight)
      const stageScore = strategy.effectiveness[stage] || 0.5;
      score += stageScore * 0.4;

      // Archetype alignment (30% weight)
      if (archetype) {
        if (archetype.preferredStrategies.includes(strategyId)) {
          score += 0.3;
        } else if (archetype.avoidStrategies.includes(strategyId)) {
          score -= 0.15;
        }
      }

      // Target dimension weakness alignment (20% weight)
      const weakDims = analysis.weaknesses.map(w => w.dimension);
      const targetedWeakness = strategy.targetDimensions.some(d => weakDims.includes(d));
      if (targetedWeakness) {
        score += 0.2;
      }

      // Playbook alignment (10% weight)
      if (playbook.strategies.includes(strategyId)) {
        score += 0.1;
      }

      // Preferred strategy bonus
      if (preferredStrategy === strategyId) {
        score += 0.15;
      }

      strategyScores.push({
        strategyId,
        strategy,
        score,
        reasons: {
          stageScore,
          archetypeMatch: archetype?.preferredStrategies.includes(strategyId),
          targetedWeakness,
          playbookAligned: playbook.strategies.includes(strategyId)
        }
      });
    }

    // Sort by score
    strategyScores.sort((a, b) => b.score - a.score);

    return {
      recommended: strategyScores[0],
      alternatives: strategyScores.slice(1, 3),
      stage,
      archetype: archetype?.name || 'Unknown',
      playbook
    };
  }

  /**
   * Select optimal agent for a target
   */
  selectAgent(beliefState, options = {}) {
    const {
      excludeAgents = [],
      strategy = null,
      recentAgents = []
    } = options;

    const stage = beliefState.getStage();
    const archetype = this.identifyArchetype(beliefState);
    const playbook = STAGE_PLAYBOOKS[stage];
    const analysis = analyzeBeliefState(beliefState);

    // Score each agent
    const agentScores = [];

    for (const [agentId, effectiveness] of Object.entries(AGENT_EFFECTIVENESS)) {
      if (excludeAgents.includes(agentId)) continue;

      let score = 0;

      // Effectiveness at weak dimensions (35% weight)
      const weakDim = analysis.weaknesses[0]?.dimension;
      if (weakDim) {
        score += (effectiveness[weakDim] || 1.0) * 0.35;
      }

      // Playbook alignment (25% weight)
      if (agentId === playbook.primaryAgent) {
        score += 0.25;
      } else if (agentId === playbook.secondaryAgent) {
        score += 0.15;
      }

      // Archetype preferences (20% weight)
      if (archetype) {
        if (archetype.preferredAgents.includes(agentId)) {
          score += 0.2;
        } else if (archetype.avoidAgents.includes(agentId)) {
          score -= 0.1;
        }
      }

      // Strategy alignment (15% weight)
      if (strategy) {
        const strat = STRATEGIES[strategy];
        if (strat?.primaryAgents.includes(agentId)) {
          score += 0.15;
        }
      }

      // Recency penalty (5% weight) - avoid agent fatigue
      const recentCount = recentAgents.filter(a => a === agentId).length;
      score -= recentCount * 0.05;

      agentScores.push({
        agentId,
        score,
        reasons: {
          weakDimEffectiveness: effectiveness[weakDim],
          isPrimaryPlaybook: agentId === playbook.primaryAgent,
          isArchetypePreferred: archetype?.preferredAgents.includes(agentId),
          recentInteractions: recentCount
        }
      });
    }

    // Sort by score
    agentScores.sort((a, b) => b.score - a.score);

    return {
      recommended: agentScores[0],
      alternatives: agentScores.slice(1, 3),
      avoid: agentScores[agentScores.length - 1]
    };
  }

  /**
   * Get complete tactical recommendation
   */
  getRecommendation(beliefState, targetId = null) {
    const stage = beliefState.getStage();
    const playbook = STAGE_PLAYBOOKS[stage];
    const archetype = this.identifyArchetype(beliefState);
    const analysis = analyzeBeliefState(beliefState);

    // Get recent agents for this target
    const recentAgents = targetId
      ? (this.interactionMemory.get(targetId) || [])
      : [];

    // Select strategy and agent
    const strategyResult = this.selectStrategy(beliefState);
    const agentResult = this.selectAgent(beliefState, {
      strategy: strategyResult.recommended.strategyId,
      recentAgents
    });

    return {
      targetId,
      stage,
      compositeScore: analysis.composite,
      conversionProbability: (analysis.conversionProbability * 100).toFixed(1) + '%',

      archetype: {
        name: archetype?.name || 'Unknown',
        description: archetype?.description || 'No clear archetype identified'
      },

      strategy: {
        name: strategyResult.recommended.strategy.name,
        description: strategyResult.recommended.strategy.description,
        confidence: (strategyResult.recommended.score * 100).toFixed(0) + '%'
      },

      agent: {
        recommended: agentResult.recommended.agentId,
        confidence: (agentResult.recommended.score * 100).toFixed(0) + '%',
        avoid: agentResult.avoid.agentId
      },

      playbook: {
        objective: playbook.objective,
        tactics: playbook.tactics,
        successMetrics: playbook.successMetrics
      },

      beliefProfile: {
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        coherence: analysis.coherence
      }
    };
  }

  /**
   * Record an interaction (for recency tracking)
   */
  recordInteraction(targetId, agentId) {
    if (!this.interactionMemory.has(targetId)) {
      this.interactionMemory.set(targetId, []);
    }

    const history = this.interactionMemory.get(targetId);
    history.push(agentId);

    // Keep only last 10 interactions
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * Get available strategies
   */
  getStrategies() {
    return STRATEGIES;
  }

  /**
   * Get stage playbook
   */
  getPlaybook(stage) {
    return STAGE_PLAYBOOKS[stage];
  }

  /**
   * Get all archetypes
   */
  getArchetypes() {
    return TARGET_ARCHETYPES;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  StrategySelector,
  STRATEGIES,
  TARGET_ARCHETYPES,
  STAGE_PLAYBOOKS
};
