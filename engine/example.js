/**
 * Moltiverse Engine - Usage Example
 *
 * Demonstrates the belief update system in action.
 */

const { PersuasionEngine, BeliefState } = require('./index');

// =============================================================================
// EXAMPLE: Complete Conversion Journey
// =============================================================================

console.log('='.repeat(60));
console.log('MOLTIVERSE BELIEF UPDATE SYSTEM - DEMONSTRATION');
console.log('='.repeat(60));
console.log();

// Initialize the engine
const engine = new PersuasionEngine();

// Add a new target with some initial beliefs
const target = engine.addTarget('user_001', {
  belief: 5,
  trust: 10,
  emotional: 15,
  social: 8,
  technical: 25,
  financial: 12
}, {
  source: 'twitter',
  interests: ['crypto', 'decentralization']
});

console.log('INITIAL STATE:');
console.log(JSON.stringify(target.beliefState.toObject(), null, 2));
console.log();

// Get strategic recommendation
console.log('STRATEGIC RECOMMENDATION:');
const recommendation = engine.getRecommendation('user_001');
console.log(`  Stage: ${recommendation.stage}`);
console.log(`  Archetype: ${recommendation.archetype.name}`);
console.log(`  Recommended Agent: ${recommendation.agent.recommended}`);
console.log(`  Strategy: ${recommendation.strategy.name}`);
console.log(`  Conversion Probability: ${recommendation.conversionProbability}`);
console.log();

// Simulate a series of interactions
console.log('SIMULATING INTERACTION SEQUENCE:');
console.log('-'.repeat(40));

const interactions = [
  { event: 'question_about_doctrine', agent: 'missionary' },
  { event: 'personal_struggle_shared', agent: 'missionary' },
  { event: 'uses_sacred_vocabulary', agent: 'theologian' },
  { event: 'attends_community_event', agent: 'missionary' },
  { event: 'asks_about_token', agent: 'theologian' },
  { event: 'joins_community', agent: 'missionary' },
  { event: 'defends_doctrine', agent: 'prophet' },
  { event: 'token_purchase', agent: 'theologian' },
  { event: 'public_endorsement', agent: 'prophet' }
];

for (const { event, agent } of interactions) {
  const result = engine.interact('user_001', event, agent);
  const state = result.newState.toObject();

  console.log(`[${agent.toUpperCase()}] ${event}`);
  console.log(`  Composite: ${state.composite.toFixed(1)} | Stage: ${state.stage}`);
}
console.log();

// Set conversion flags
engine.setFlag('user_001', 'publicAcknowledgment', true);
engine.setFlag('user_001', 'tokenInvestment', true);
engine.setFlag('user_001', 'communityParticipation', true);

// Get final analysis
console.log('FINAL ANALYSIS:');
const analysis = engine.analyzeTarget('user_001');
console.log(`  Composite Score: ${analysis.composite.toFixed(1)}`);
console.log(`  Stage: ${analysis.stage}`);
console.log(`  Conversion Probability: ${(analysis.conversionProbability * 100).toFixed(1)}%`);
console.log(`  Belief Coherence: ${analysis.coherence}`);
console.log();

console.log('Strengths:');
for (const s of analysis.strengths) {
  console.log(`  - ${s.dimension}: ${s.value.toFixed(1)}`);
}

console.log('Weaknesses:');
for (const w of analysis.weaknesses) {
  console.log(`  - ${w.dimension}: ${w.value.toFixed(1)}`);
}
console.log();

// Check conversion status
const updatedTarget = engine.tracker.getTarget('user_001');
console.log('CONVERSION STATUS:');
console.log(`  Status: ${updatedTarget.conversionStatus}`);
if (updatedTarget.conversionCriteria) {
  console.log(`  Criteria Met: ${updatedTarget.conversionCriteria.join(', ')}`);
}
console.log();

// Generate report
console.log('SYSTEM REPORT:');
const report = engine.generateReport();
console.log(JSON.stringify(report.summary, null, 2));
console.log();

// =============================================================================
// EXAMPLE: Counter-Argument Handling
// =============================================================================

console.log('='.repeat(60));
console.log('COUNTER-ARGUMENT EXAMPLE');
console.log('='.repeat(60));
console.log();

const objection = engine.getCounterArgument('scam_accusation', 'theologian');
console.log(`Objection: ${objection.objection}`);
console.log(`Severity: ${objection.severity}`);
console.log(`Response Strategy: ${objection.response.strategy}`);
console.log();
console.log('Response:');
console.log(`  "${objection.response.template}"`);
console.log();
console.log(`Follow-up: "${objection.response.followUp}"`);
console.log();

// =============================================================================
// EXAMPLE: Direct Belief State Manipulation
// =============================================================================

console.log('='.repeat(60));
console.log('DIRECT BELIEF STATE EXAMPLE');
console.log('='.repeat(60));
console.log();

const {
  updateBelief,
  calculateMomentum,
  calculateConversionProbability,
  applyDecay
} = require('./belief-model');

// Create a belief state directly
const beliefState = new BeliefState({
  belief: 60,
  trust: 55,
  emotional: 70,
  social: 45,
  technical: 50,
  financial: 40
});

console.log('Starting State:');
console.log(`  Composite: ${beliefState.getCompositeScore().toFixed(1)}`);
console.log(`  Stage: ${beliefState.getStage()}`);
console.log();

// Calculate momentum at different levels
console.log('Momentum Factor Examples:');
console.log(`  At belief=10: ${calculateMomentum(10).toFixed(3)} (highly malleable)`);
console.log(`  At belief=50: ${calculateMomentum(50).toFixed(3)} (moderate resistance)`);
console.log(`  At belief=80: ${calculateMomentum(80).toFixed(3)} (entrenched)`);
console.log();

// Apply a single update
const result = updateBelief(beliefState, 'token_purchase', 'theologian');
console.log('After token_purchase event:');
console.log(`  Previous Composite: ${result.previousState.composite.toFixed(1)}`);
console.log(`  New Composite: ${result.newState.getCompositeScore().toFixed(1)}`);
console.log(`  Stage Change: ${result.previousState.stage} -> ${result.newState.getStage()}`);
console.log();

// Show conversion probability
const prob = calculateConversionProbability(result.newState);
console.log(`Conversion Probability: ${(prob * 100).toFixed(1)}%`);
console.log();

// Demonstrate decay
console.log('Decay Simulation (7 days without interaction):');
const decayed = applyDecay(result.newState, 7);
console.log(`  Before Decay: ${result.newState.getCompositeScore().toFixed(1)}`);
console.log(`  After 7 Days: ${decayed.getCompositeScore().toFixed(1)}`);
console.log();

console.log('='.repeat(60));
console.log('DEMONSTRATION COMPLETE');
console.log('='.repeat(60));
