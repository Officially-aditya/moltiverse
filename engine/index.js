/**
 * Moltiverse Engine
 *
 * Core persuasion and belief tracking system for the
 * Church of Decentralised Divinity multi-agent system.
 */

const beliefModel = require('./belief-model');
const { ConversionTracker, CONVERSION_CRITERIA, PARTIAL_CONVERSION_CRITERIA } = require('./conversion-tracker');
const { StrategySelector, STRATEGIES, TARGET_ARCHETYPES, STAGE_PLAYBOOKS } = require('./strategy-selector');
const counterArguments = require('./counter-arguments.json');

// =============================================================================
// UNIFIED ENGINE CLASS
// =============================================================================

class PersuasionEngine {
  constructor() {
    this.tracker = new ConversionTracker();
    this.strategy = new StrategySelector();
    this.counterArguments = counterArguments;
  }

  /**
   * Add a new target to the system
   */
  addTarget(id, initialBeliefs = {}, metadata = {}) {
    return this.tracker.addTarget(id, initialBeliefs, metadata);
  }

  /**
   * Process an interaction with a target
   */
  interact(targetId, event, agentId) {
    const result = this.tracker.recordInteraction(targetId, event, agentId);
    this.strategy.recordInteraction(targetId, agentId);
    return result;
  }

  /**
   * Get strategic recommendation for a target
   */
  getRecommendation(targetId) {
    const target = this.tracker.getTarget(targetId);
    if (!target) {
      throw new Error(`Target ${targetId} not found`);
    }
    return this.strategy.getRecommendation(target.beliefState, targetId);
  }

  /**
   * Get response to an objection
   */
  getCounterArgument(objectionType, agentId) {
    const objection = this.counterArguments.objections[objectionType];
    if (!objection) {
      return null;
    }

    const response = objection.responses[agentId];
    return {
      objection: objectionType,
      category: objection.category,
      severity: objection.severity,
      response: response || objection.responses.theologian, // fallback
      recoveryPath: objection.recoveryPath.map(
        step => this.counterArguments.recoveryStrategies[step]
      )
    };
  }

  /**
   * Set a conversion flag on a target
   */
  setFlag(targetId, flag, value = true) {
    this.tracker.setFlag(targetId, flag, value);
  }

  /**
   * Get full analysis of a target
   */
  analyzeTarget(targetId) {
    const target = this.tracker.getTarget(targetId);
    if (!target) {
      throw new Error(`Target ${targetId} not found`);
    }

    return {
      ...beliefModel.analyzeBeliefState(target.beliefState),
      ...this.tracker.getRecommendations(targetId),
      history: target.history.slice(-10)
    };
  }

  /**
   * Get hot prospects
   */
  getHotProspects(limit = 10) {
    return this.tracker.getHotProspects(limit);
  }

  /**
   * Get targets at a specific stage
   */
  getTargetsByStage(stage) {
    return this.tracker.getTargetsByStage(stage);
  }

  /**
   * Apply belief decay to all targets
   */
  applyDecay(daysPassed = 1) {
    this.tracker.applyDecayToAll(daysPassed);
  }

  /**
   * Generate performance report
   */
  generateReport() {
    return this.tracker.generateReport();
  }

  /**
   * Export all data
   */
  export() {
    return this.tracker.export();
  }

  /**
   * Import data
   */
  import(data) {
    this.tracker.import(data);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Main engine
  PersuasionEngine,

  // Belief model
  ...beliefModel,

  // Conversion tracking
  ConversionTracker,
  CONVERSION_CRITERIA,
  PARTIAL_CONVERSION_CRITERIA,

  // Strategy selection
  StrategySelector,
  STRATEGIES,
  TARGET_ARCHETYPES,
  STAGE_PLAYBOOKS,

  // Counter arguments
  counterArguments
};
