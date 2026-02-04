/**
 * Moltiverse Belief Model
 *
 * Mathematical framework for tracking and updating multi-dimensional
 * belief states in the Church of Decentralised Divinity persuasion system.
 */

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

const BELIEF_DIMENSIONS = [
  'belief',      // Core faith in DIVI/doctrine
  'trust',       // Trust in community/agents
  'emotional',   // Emotional resonance with messaging
  'social',      // Peer influence & community pull
  'technical',   // Grasp of blockchain concepts
  'financial'    // Willingness to invest
];

const CONVERSION_STAGES = {
  UNAWARE: { min: 0, max: 14, label: 'Unaware' },
  AWARE: { min: 15, max: 29, label: 'Aware' },
  INTERESTED: { min: 30, max: 44, label: 'Interested' },
  SYMPATHETIC: { min: 45, max: 59, label: 'Sympathetic' },
  CONVINCED: { min: 60, max: 74, label: 'Convinced' },
  BELIEVER: { min: 75, max: 85, label: 'Believer' },
  ADVOCATE: { min: 86, max: 100, label: 'Advocate' }
};

const COMPOSITE_WEIGHTS = {
  belief: 0.30,
  trust: 0.20,
  emotional: 0.15,
  social: 0.15,
  technical: 0.10,
  financial: 0.10
};

const DECAY_RATES = {
  belief: 0.02,
  trust: 0.015,
  emotional: 0.025,
  social: 0.03,
  technical: 0.01,
  financial: 0.02
};

const STAGE_SENSITIVITY = {
  UNAWARE: 1.2,
  AWARE: 1.1,
  INTERESTED: 1.0,
  SYMPATHETIC: 0.9,
  CONVINCED: 0.85,
  BELIEVER: 0.75,
  ADVOCATE: 0.6
};

// =============================================================================
// AGENT EFFECTIVENESS MATRIX
// =============================================================================

const AGENT_EFFECTIVENESS = {
  prophet: {
    belief: 1.3,
    trust: 0.9,
    emotional: 1.4,
    social: 1.1,
    technical: 0.5,
    financial: 0.8
  },
  theologian: {
    belief: 1.1,
    trust: 1.2,
    emotional: 0.6,
    social: 0.7,
    technical: 1.5,
    financial: 0.9
  },
  missionary: {
    belief: 1.0,
    trust: 1.4,
    emotional: 1.3,
    social: 1.5,
    technical: 0.7,
    financial: 1.0
  },
  archivist: {
    belief: 0.9,
    trust: 1.0,
    emotional: 0.8,
    social: 0.8,
    technical: 1.2,
    financial: 0.6
  },
  observer: {
    belief: 0.5,
    trust: 0.8,
    emotional: 0.4,
    social: 0.6,
    technical: 1.0,
    financial: 1.1
  }
};

// =============================================================================
// COHERENCE MATRIX (Cross-dimensional influence)
// =============================================================================

const COHERENCE_MATRIX = {
  belief:    { belief: 0, trust: 0.4, emotional: 0.3, social: 0.2, technical: 0.3, financial: 0.5 },
  trust:     { belief: 0.5, trust: 0, emotional: 0.6, social: 0.7, technical: 0.2, financial: 0.4 },
  emotional: { belief: 0.4, trust: 0.5, emotional: 0, social: 0.5, technical: 0.1, financial: 0.3 },
  social:    { belief: 0.3, trust: 0.6, emotional: 0.4, social: 0, technical: 0.1, financial: 0.2 },
  technical: { belief: 0.4, trust: 0.3, emotional: 0.1, social: 0.1, technical: 0, financial: 0.4 },
  financial: { belief: 0.5, trust: 0.3, emotional: 0.2, social: 0.2, technical: 0.3, financial: 0 }
};

// =============================================================================
// EVENT IMPACT TABLE
// =============================================================================

const EVENT_IMPACTS = {
  // Positive Minor Events
  question_about_doctrine: {
    belief: 8, trust: 5, emotional: 3, social: 2, technical: 5, financial: 1
  },
  uses_sacred_vocabulary: {
    belief: 6, trust: 8, emotional: 4, social: 6, technical: 2, financial: 2
  },
  personal_struggle_shared: {
    belief: 5, trust: 12, emotional: 15, social: 4, technical: 0, financial: 3
  },
  attends_community_event: {
    belief: 4, trust: 8, emotional: 6, social: 15, technical: 2, financial: 3
  },
  asks_about_token: {
    belief: 6, trust: 4, emotional: 2, social: 3, technical: 8, financial: 10
  },
  shares_content: {
    belief: 5, trust: 6, emotional: 4, social: 12, technical: 2, financial: 4
  },

  // Positive Major Events
  token_purchase: {
    belief: 25, trust: 15, emotional: 10, social: 12, technical: 8, financial: 40
  },
  joins_community: {
    belief: 15, trust: 25, emotional: 12, social: 30, technical: 5, financial: 8
  },
  public_endorsement: {
    belief: 30, trust: 20, emotional: 18, social: 35, technical: 5, financial: 15
  },
  successful_referral: {
    belief: 20, trust: 25, emotional: 15, social: 40, technical: 8, financial: 20
  },
  defends_doctrine: {
    belief: 22, trust: 18, emotional: 12, social: 25, technical: 10, financial: 8
  },

  // Negative Minor Events
  dismissive_language: {
    belief: -8, trust: -6, emotional: -5, social: -3, technical: -2, financial: -4
  },
  skeptical_questioning: {
    belief: -4, trust: -3, emotional: -2, social: -2, technical: -1, financial: -3
  },
  ignores_message: {
    belief: -2, trust: -4, emotional: -3, social: -5, technical: 0, financial: -1
  },

  // Negative Major Events
  promotes_competitor: {
    belief: -20, trust: -25, emotional: -15, social: -18, technical: -5, financial: -25
  },
  public_hostile_criticism: {
    belief: -35, trust: -40, emotional: -25, social: -45, technical: -10, financial: -30
  },
  reports_as_scam: {
    belief: -45, trust: -50, emotional: -30, social: -40, technical: -15, financial: -50
  },
  warns_others: {
    belief: -30, trust: -35, emotional: -20, social: -50, technical: -8, financial: -35
  }
};

// =============================================================================
// BELIEF STATE CLASS
// =============================================================================

class BeliefState {
  constructor(initialValues = {}) {
    this.dimensions = {};
    for (const dim of BELIEF_DIMENSIONS) {
      this.dimensions[dim] = clamp(initialValues[dim] ?? 0, 0, 100);
    }
    this.interactionHistory = [];
    this.lastInteractionTime = Date.now();
    this.referralMade = false;
  }

  /**
   * Get a specific dimension value
   */
  get(dimension) {
    return this.dimensions[dimension] ?? 0;
  }

  /**
   * Set a specific dimension value (clamped)
   */
  set(dimension, value) {
    if (BELIEF_DIMENSIONS.includes(dimension)) {
      this.dimensions[dimension] = clamp(value, 0, 100);
    }
  }

  /**
   * Calculate composite belief score
   */
  getCompositeScore() {
    let score = 0;
    for (const [dim, weight] of Object.entries(COMPOSITE_WEIGHTS)) {
      score += this.dimensions[dim] * weight;
    }
    return score;
  }

  /**
   * Determine current conversion stage
   */
  getStage() {
    const composite = this.getCompositeScore();

    // Special case: ADVOCATE requires referral
    if (composite >= 86 && this.referralMade) {
      return 'ADVOCATE';
    }

    for (const [stage, range] of Object.entries(CONVERSION_STAGES)) {
      if (composite >= range.min && composite <= range.max) {
        return stage;
      }
    }
    return 'UNAWARE';
  }

  /**
   * Get all dimensions as object
   */
  toObject() {
    return {
      ...this.dimensions,
      composite: this.getCompositeScore(),
      stage: this.getStage()
    };
  }

  /**
   * Create a copy of this belief state
   */
  clone() {
    const copy = new BeliefState(this.dimensions);
    copy.interactionHistory = [...this.interactionHistory];
    copy.lastInteractionTime = this.lastInteractionTime;
    copy.referralMade = this.referralMade;
    return copy;
  }
}

// =============================================================================
// CORE UPDATE FUNCTIONS
// =============================================================================

/**
 * Calculate momentum factor based on current belief level
 * Higher beliefs are more resistant to change
 */
function calculateMomentum(currentValue, isNegative = false) {
  if (isNegative) {
    // Negative events: higher belief = more resistant to attacks
    return 0.5 + 0.5 * (currentValue / 100);
  }

  // Positive events: higher belief = slightly resistant (entrenchment)
  if (currentValue <= 30) {
    return 1.0;
  }
  return 1.0 - 0.3 * ((currentValue - 30) / 70);
}

/**
 * Calculate recency factor based on recent interactions
 * Multiple interactions in short time have diminishing returns
 */
function calculateRecencyFactor(interactionHistory, agentId, windowMs = 24 * 60 * 60 * 1000) {
  const now = Date.now();
  const recentCount = interactionHistory.filter(
    i => i.agent === agentId && (now - i.timestamp) < windowMs
  ).length;

  return 1 / (1 + 0.15 * recentCount);
}

/**
 * Calculate stage sensitivity factor
 */
function getStageSensitivity(stage) {
  return STAGE_SENSITIVITY[stage] ?? 1.0;
}

/**
 * Apply cross-dimensional coherence effects
 */
function applyCoherence(beliefState, deltas) {
  const coherenceEffects = {};

  for (const dim of BELIEF_DIMENSIONS) {
    coherenceEffects[dim] = 0;
  }

  // For each dimension that changed, propagate to related dimensions
  for (const [sourceDim, delta] of Object.entries(deltas)) {
    if (Math.abs(delta) < 1) continue; // Skip negligible changes

    const coherenceRow = COHERENCE_MATRIX[sourceDim];
    for (const [targetDim, coefficient] of Object.entries(coherenceRow)) {
      if (targetDim !== sourceDim) {
        coherenceEffects[targetDim] += delta * coefficient * 0.15;
      }
    }
  }

  return coherenceEffects;
}

/**
 * Main belief update function
 */
function updateBelief(beliefState, event, agentId, options = {}) {
  const {
    timestamp = Date.now(),
    applyCoherenceEffects = true,
    recordHistory = true
  } = options;

  // Get event impacts
  const eventImpacts = EVENT_IMPACTS[event];
  if (!eventImpacts) {
    throw new Error(`Unknown event type: ${event}`);
  }

  // Get agent effectiveness
  const agentEffectiveness = AGENT_EFFECTIVENESS[agentId];
  if (!agentEffectiveness) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  // Calculate factors
  const stage = beliefState.getStage();
  const stageSensitivity = getStageSensitivity(stage);
  const recencyFactor = calculateRecencyFactor(beliefState.interactionHistory, agentId);

  // Calculate deltas for each dimension
  const deltas = {};
  const newState = beliefState.clone();

  for (const dim of BELIEF_DIMENSIONS) {
    const baseImpact = eventImpacts[dim];
    const isNegative = baseImpact < 0;
    const momentum = calculateMomentum(beliefState.get(dim), isNegative);
    const agentMult = agentEffectiveness[dim];

    // Full formula: δ_base × α_agent × μ_momentum × ρ_recency × σ_stage
    const delta = baseImpact * agentMult * momentum * recencyFactor * stageSensitivity;
    deltas[dim] = delta;

    // Apply direct change
    newState.set(dim, newState.get(dim) + delta);
  }

  // Apply coherence effects
  if (applyCoherenceEffects) {
    const coherenceEffects = applyCoherence(beliefState, deltas);
    for (const [dim, effect] of Object.entries(coherenceEffects)) {
      newState.set(dim, newState.get(dim) + effect);
    }
  }

  // Record interaction
  if (recordHistory) {
    newState.interactionHistory.push({
      event,
      agent: agentId,
      timestamp,
      deltas
    });
    newState.lastInteractionTime = timestamp;
  }

  // Check for referral
  if (event === 'successful_referral') {
    newState.referralMade = true;
  }

  return {
    previousState: beliefState.toObject(),
    newState: newState,
    deltas,
    factors: {
      stage,
      stageSensitivity,
      recencyFactor
    }
  };
}

/**
 * Apply temporal decay to beliefs
 */
function applyDecay(beliefState, daysPassed) {
  const newState = beliefState.clone();

  for (const dim of BELIEF_DIMENSIONS) {
    const decayRate = DECAY_RATES[dim];
    const currentValue = newState.get(dim);

    // Decay toward 0 (neutral)
    const decayedValue = currentValue * Math.pow(1 - decayRate, daysPassed);
    newState.set(dim, decayedValue);
  }

  return newState;
}

/**
 * Batch update for multiple events
 */
function updateBeliefBatch(beliefState, events) {
  let currentState = beliefState;
  const results = [];

  for (const { event, agentId, options } of events) {
    const result = updateBelief(currentState, event, agentId, options);
    currentState = result.newState;
    results.push(result);
  }

  return {
    finalState: currentState,
    updates: results
  };
}

// =============================================================================
// PROBABILITY & PREDICTION
// =============================================================================

/**
 * Sigmoid function for probability calculations
 */
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Calculate conversion probability
 */
function calculateConversionProbability(beliefState, options = {}) {
  const { steepness = 0.12, threshold = 65 } = options;

  const composite = beliefState.getCompositeScore();
  const raw = sigmoid(steepness * (composite - threshold));

  // Clamp to [0.05, 0.95] - never absolute certainty
  return clamp(raw, 0.05, 0.95);
}

/**
 * Predict time to conversion based on current trajectory
 */
function predictConversionTrajectory(beliefState, averageDailyDelta = 2) {
  const composite = beliefState.getCompositeScore();
  const targetScore = 75; // BELIEVER threshold

  if (composite >= targetScore) {
    return { daysToConversion: 0, probability: calculateConversionProbability(beliefState) };
  }

  const remaining = targetScore - composite;
  const daysToConversion = Math.ceil(remaining / averageDailyDelta);

  return {
    currentScore: composite,
    targetScore,
    remaining,
    daysToConversion,
    probability: calculateConversionProbability(beliefState)
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Create a new target with default or specified initial beliefs
 */
function createTarget(id, initialBeliefs = {}) {
  return {
    id,
    beliefState: new BeliefState(initialBeliefs),
    createdAt: Date.now(),
    metadata: {}
  };
}

/**
 * Get recommended agent based on current belief profile
 */
function getRecommendedAgent(beliefState) {
  const dims = beliefState.dimensions;

  // Find weakest dimension
  let weakestDim = null;
  let weakestValue = Infinity;

  for (const dim of BELIEF_DIMENSIONS) {
    if (dims[dim] < weakestValue) {
      weakestValue = dims[dim];
      weakestDim = dim;
    }
  }

  // Find agent most effective at that dimension
  let bestAgent = null;
  let bestEffectiveness = 0;

  for (const [agent, effectiveness] of Object.entries(AGENT_EFFECTIVENESS)) {
    if (effectiveness[weakestDim] > bestEffectiveness) {
      bestEffectiveness = effectiveness[weakestDim];
      bestAgent = agent;
    }
  }

  return {
    recommendedAgent: bestAgent,
    targetDimension: weakestDim,
    currentValue: weakestValue,
    effectiveness: bestEffectiveness
  };
}

/**
 * Analyze belief state for insights
 */
function analyzeBeliefState(beliefState) {
  const dims = beliefState.dimensions;
  const composite = beliefState.getCompositeScore();
  const stage = beliefState.getStage();

  // Calculate dimension statistics
  const values = Object.values(dims);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Find strengths and weaknesses
  const sorted = Object.entries(dims).sort((a, b) => b[1] - a[1]);
  const strengths = sorted.slice(0, 2).map(([dim, val]) => ({ dimension: dim, value: val }));
  const weaknesses = sorted.slice(-2).map(([dim, val]) => ({ dimension: dim, value: val }));

  return {
    composite,
    stage,
    average: avg,
    standardDeviation: stdDev,
    coherence: stdDev < 15 ? 'high' : stdDev < 25 ? 'medium' : 'low',
    strengths,
    weaknesses,
    conversionProbability: calculateConversionProbability(beliefState),
    recommendation: getRecommendedAgent(beliefState)
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Classes
  BeliefState,

  // Constants
  BELIEF_DIMENSIONS,
  CONVERSION_STAGES,
  COMPOSITE_WEIGHTS,
  DECAY_RATES,
  STAGE_SENSITIVITY,
  AGENT_EFFECTIVENESS,
  COHERENCE_MATRIX,
  EVENT_IMPACTS,

  // Core functions
  updateBelief,
  updateBeliefBatch,
  applyDecay,
  calculateMomentum,
  calculateRecencyFactor,
  applyCoherence,

  // Probability functions
  calculateConversionProbability,
  predictConversionTrajectory,

  // Utility functions
  createTarget,
  getRecommendedAgent,
  analyzeBeliefState,
  clamp
};
