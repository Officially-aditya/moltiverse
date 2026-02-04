/**
 * Moltiverse Conversion Tracker
 *
 * Tracks target conversion progress, maintains history,
 * and provides analytics on conversion effectiveness.
 */

const {
  BeliefState,
  updateBelief,
  applyDecay,
  calculateConversionProbability,
  analyzeBeliefState,
  getRecommendedAgent,
  CONVERSION_STAGES
} = require('./belief-model');

// =============================================================================
// CONVERSION CRITERIA
// =============================================================================

const CONVERSION_CRITERIA = {
  belief_score_threshold: {
    description: 'Composite belief score ≥ 75',
    check: (target) => target.beliefState.getCompositeScore() >= 75
  },
  public_acknowledgment: {
    description: 'Made public positive statement about DIVI',
    check: (target) => target.flags?.publicAcknowledgment === true
  },
  token_investment: {
    description: 'Purchased any amount of DIVI tokens',
    check: (target) => target.flags?.tokenInvestment === true
  },
  community_participation: {
    description: 'Active in community (Discord/events)',
    check: (target) => target.flags?.communityParticipation === true
  },
  referral_activity: {
    description: 'Referred at least one other person',
    check: (target) => target.beliefState.referralMade === true
  }
};

const PARTIAL_CONVERSION_CRITERIA = {
  belief_score_threshold: {
    description: 'Composite belief score ≥ 60',
    check: (target) => target.beliefState.getCompositeScore() >= 60
  },
  positive_statement: {
    description: 'Made any positive statement',
    check: (target) => target.flags?.positiveStatement === true
  },
  financial_commitment: {
    description: 'Shown financial interest or commitment',
    check: (target) => target.flags?.financialCommitment === true
  },
  ongoing_engagement: {
    description: 'Continuing engagement with agents',
    check: (target) => {
      const history = target.beliefState.interactionHistory;
      const recentInteractions = history.filter(
        i => Date.now() - i.timestamp < 7 * 24 * 60 * 60 * 1000
      );
      return recentInteractions.length >= 3;
    }
  }
};

// =============================================================================
// CONVERSION TRACKER CLASS
// =============================================================================

class ConversionTracker {
  constructor() {
    this.targets = new Map();
    this.conversions = [];
    this.partialConversions = [];
    this.agentStats = {
      prophet: { interactions: 0, conversionsInfluenced: 0 },
      theologian: { interactions: 0, conversionsInfluenced: 0 },
      missionary: { interactions: 0, conversionsInfluenced: 0 },
      archivist: { interactions: 0, conversionsInfluenced: 0 },
      observer: { interactions: 0, conversionsInfluenced: 0 }
    };
    this.eventLog = [];
  }

  /**
   * Add a new target to track
   */
  addTarget(id, initialBeliefs = {}, metadata = {}) {
    if (this.targets.has(id)) {
      throw new Error(`Target ${id} already exists`);
    }

    const target = {
      id,
      beliefState: new BeliefState(initialBeliefs),
      createdAt: Date.now(),
      metadata,
      flags: {},
      conversionStatus: 'none',
      history: []
    };

    this.targets.set(id, target);
    this.logEvent('target_added', { targetId: id, initialBeliefs });

    return target;
  }

  /**
   * Get a target by ID
   */
  getTarget(id) {
    return this.targets.get(id);
  }

  /**
   * Record an interaction and update beliefs
   */
  recordInteraction(targetId, event, agentId, options = {}) {
    const target = this.targets.get(targetId);
    if (!target) {
      throw new Error(`Target ${targetId} not found`);
    }

    // Update beliefs
    const result = updateBelief(target.beliefState, event, agentId, options);
    target.beliefState = result.newState;

    // Update agent stats
    if (this.agentStats[agentId]) {
      this.agentStats[agentId].interactions++;
    }

    // Record in target history
    target.history.push({
      timestamp: Date.now(),
      event,
      agent: agentId,
      previousStage: result.previousState.stage,
      newStage: result.newState.getStage(),
      previousComposite: result.previousState.composite,
      newComposite: result.newState.getCompositeScore()
    });

    // Check for stage transition
    if (result.previousState.stage !== result.newState.getStage()) {
      this.logEvent('stage_transition', {
        targetId,
        from: result.previousState.stage,
        to: result.newState.getStage(),
        agent: agentId
      });
    }

    // Check conversion criteria
    this.checkConversionStatus(target);

    this.logEvent('interaction', {
      targetId,
      event,
      agent: agentId,
      composite: result.newState.getCompositeScore()
    });

    return result;
  }

  /**
   * Set a flag on a target (for manual criteria tracking)
   */
  setFlag(targetId, flag, value = true) {
    const target = this.targets.get(targetId);
    if (!target) {
      throw new Error(`Target ${targetId} not found`);
    }

    target.flags[flag] = value;
    this.checkConversionStatus(target);

    this.logEvent('flag_set', { targetId, flag, value });
  }

  /**
   * Check and update conversion status
   */
  checkConversionStatus(target) {
    // Already fully converted
    if (target.conversionStatus === 'converted') {
      return;
    }

    // Check full conversion (3 of 5 criteria)
    const fullCriteriaMet = Object.entries(CONVERSION_CRITERIA)
      .filter(([_, criteria]) => criteria.check(target))
      .map(([name]) => name);

    if (fullCriteriaMet.length >= 3) {
      this.markConverted(target, fullCriteriaMet);
      return;
    }

    // Check partial conversion (2 of 4 criteria)
    const partialCriteriaMet = Object.entries(PARTIAL_CONVERSION_CRITERIA)
      .filter(([_, criteria]) => criteria.check(target))
      .map(([name]) => name);

    if (partialCriteriaMet.length >= 2 && target.conversionStatus !== 'partial') {
      this.markPartiallyConverted(target, partialCriteriaMet);
    }
  }

  /**
   * Mark a target as fully converted
   */
  markConverted(target, criteriaMet) {
    target.conversionStatus = 'converted';
    target.convertedAt = Date.now();
    target.conversionCriteria = criteriaMet;

    // Find most influential agent
    const agentInfluence = {};
    for (const interaction of target.beliefState.interactionHistory) {
      agentInfluence[interaction.agent] = (agentInfluence[interaction.agent] || 0) + 1;
    }

    const primaryAgent = Object.entries(agentInfluence)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    if (primaryAgent && this.agentStats[primaryAgent]) {
      this.agentStats[primaryAgent].conversionsInfluenced++;
    }

    this.conversions.push({
      targetId: target.id,
      timestamp: target.convertedAt,
      criteriaMet,
      primaryAgent,
      finalScore: target.beliefState.getCompositeScore(),
      totalInteractions: target.beliefState.interactionHistory.length
    });

    this.logEvent('conversion', {
      targetId: target.id,
      criteriaMet,
      primaryAgent
    });
  }

  /**
   * Mark a target as partially converted
   */
  markPartiallyConverted(target, criteriaMet) {
    target.conversionStatus = 'partial';
    target.partialConvertedAt = Date.now();
    target.partialCriteria = criteriaMet;

    this.partialConversions.push({
      targetId: target.id,
      timestamp: target.partialConvertedAt,
      criteriaMet,
      score: target.beliefState.getCompositeScore()
    });

    this.logEvent('partial_conversion', {
      targetId: target.id,
      criteriaMet
    });
  }

  /**
   * Apply decay to all targets (call periodically)
   */
  applyDecayToAll(daysPassed = 1) {
    for (const [id, target] of this.targets) {
      if (target.conversionStatus !== 'converted') {
        target.beliefState = applyDecay(target.beliefState, daysPassed);
      }
    }

    this.logEvent('decay_applied', { daysPassed, targetCount: this.targets.size });
  }

  /**
   * Get all targets at a specific stage
   */
  getTargetsByStage(stage) {
    const result = [];
    for (const [id, target] of this.targets) {
      if (target.beliefState.getStage() === stage) {
        result.push(target);
      }
    }
    return result;
  }

  /**
   * Get targets sorted by conversion probability
   */
  getHotProspects(limit = 10) {
    const prospects = [];

    for (const [id, target] of this.targets) {
      if (target.conversionStatus === 'converted') continue;

      prospects.push({
        target,
        probability: calculateConversionProbability(target.beliefState),
        composite: target.beliefState.getCompositeScore(),
        stage: target.beliefState.getStage()
      });
    }

    return prospects
      .sort((a, b) => b.probability - a.probability)
      .slice(0, limit);
  }

  /**
   * Get strategic recommendations for a target
   */
  getRecommendations(targetId) {
    const target = this.targets.get(targetId);
    if (!target) {
      throw new Error(`Target ${targetId} not found`);
    }

    const analysis = analyzeBeliefState(target.beliefState);
    const agentRec = getRecommendedAgent(target.beliefState);

    // Determine strategy based on stage
    const stage = target.beliefState.getStage();
    let strategyNotes = [];

    switch (stage) {
      case 'UNAWARE':
        strategyNotes = [
          'Initial contact phase - focus on awareness',
          'Use Missionary for rapport building',
          'Introduce basic concepts gradually'
        ];
        break;
      case 'AWARE':
        strategyNotes = [
          'Build understanding of core doctrine',
          'Deploy Theologian for technical depth',
          'Address initial questions thoroughly'
        ];
        break;
      case 'INTERESTED':
        strategyNotes = [
          'Deepen engagement with community aspects',
          'Share transformation stories',
          'Introduce Prophet for emotional resonance'
        ];
        break;
      case 'SYMPATHETIC':
        strategyNotes = [
          'Reinforce emotional connection',
          'Use Archivist for scriptural support',
          'Encourage community participation'
        ];
        break;
      case 'CONVINCED':
        strategyNotes = [
          'Push toward action (investment/joining)',
          'Full agent deployment appropriate',
          'Create urgency without pressure'
        ];
        break;
      case 'BELIEVER':
        strategyNotes = [
          'Solidify commitment',
          'Encourage referral activity',
          'Integration into community leadership'
        ];
        break;
      case 'ADVOCATE':
        strategyNotes = [
          'Maintain engagement',
          'Leverage for testimonials',
          'Support their outreach efforts'
        ];
        break;
    }

    return {
      targetId,
      currentStage: stage,
      compositeScore: analysis.composite,
      conversionProbability: analysis.conversionProbability,
      primaryAgent: agentRec.recommendedAgent,
      targetDimension: agentRec.targetDimension,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      strategyNotes,
      criteriaStatus: this.getCriteriaStatus(target)
    };
  }

  /**
   * Get criteria status for a target
   */
  getCriteriaStatus(target) {
    const full = {};
    for (const [name, criteria] of Object.entries(CONVERSION_CRITERIA)) {
      full[name] = {
        description: criteria.description,
        met: criteria.check(target)
      };
    }

    const partial = {};
    for (const [name, criteria] of Object.entries(PARTIAL_CONVERSION_CRITERIA)) {
      partial[name] = {
        description: criteria.description,
        met: criteria.check(target)
      };
    }

    return {
      fullConversion: full,
      partialConversion: partial,
      fullMet: Object.values(full).filter(c => c.met).length,
      partialMet: Object.values(partial).filter(c => c.met).length
    };
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const totalTargets = this.targets.size;
    const converted = this.conversions.length;
    const partial = this.partialConversions.length;

    // Stage distribution
    const stageDistribution = {};
    for (const stage of Object.keys(CONVERSION_STAGES)) {
      stageDistribution[stage] = this.getTargetsByStage(stage).length;
    }

    // Agent performance
    const agentPerformance = {};
    for (const [agent, stats] of Object.entries(this.agentStats)) {
      agentPerformance[agent] = {
        ...stats,
        conversionRate: stats.interactions > 0
          ? (stats.conversionsInfluenced / stats.interactions * 100).toFixed(2) + '%'
          : '0%'
      };
    }

    // Average scores
    let totalComposite = 0;
    for (const [_, target] of this.targets) {
      totalComposite += target.beliefState.getCompositeScore();
    }
    const avgComposite = totalTargets > 0 ? totalComposite / totalTargets : 0;

    return {
      summary: {
        totalTargets,
        converted,
        partialConverted: partial,
        conversionRate: totalTargets > 0
          ? (converted / totalTargets * 100).toFixed(2) + '%'
          : '0%',
        averageComposite: avgComposite.toFixed(2)
      },
      stageDistribution,
      agentPerformance,
      hotProspects: this.getHotProspects(5).map(p => ({
        id: p.target.id,
        probability: (p.probability * 100).toFixed(1) + '%',
        stage: p.stage
      })),
      recentConversions: this.conversions.slice(-5),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Log an event
   */
  logEvent(type, data) {
    this.eventLog.push({
      type,
      data,
      timestamp: Date.now()
    });

    // Keep log size manageable
    if (this.eventLog.length > 10000) {
      this.eventLog = this.eventLog.slice(-5000);
    }
  }

  /**
   * Export all data for persistence
   */
  export() {
    const targets = {};
    for (const [id, target] of this.targets) {
      targets[id] = {
        ...target,
        beliefState: target.beliefState.toObject()
      };
    }

    return {
      targets,
      conversions: this.conversions,
      partialConversions: this.partialConversions,
      agentStats: this.agentStats,
      exportedAt: Date.now()
    };
  }

  /**
   * Import data from persistence
   */
  import(data) {
    for (const [id, targetData] of Object.entries(data.targets)) {
      const beliefState = new BeliefState(targetData.beliefState);
      beliefState.interactionHistory = targetData.beliefState.interactionHistory || [];
      beliefState.referralMade = targetData.beliefState.referralMade || false;

      this.targets.set(id, {
        ...targetData,
        beliefState
      });
    }

    this.conversions = data.conversions || [];
    this.partialConversions = data.partialConversions || [];
    this.agentStats = data.agentStats || this.agentStats;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  ConversionTracker,
  CONVERSION_CRITERIA,
  PARTIAL_CONVERSION_CRITERIA
};
