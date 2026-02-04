/**
 * Moltiverse Batch Simulation
 *
 * Simulates multiple conversion journeys for analysis
 */

const { PersuasionEngine, EVENT_IMPACTS, AGENT_EFFECTIVENESS } = require('../engine');

console.log('='.repeat(60));
console.log('MOLTIVERSE BATCH SIMULATION');
console.log('='.repeat(60));
console.log();

// =============================================================================
// SIMULATION CONFIG
// =============================================================================

const NUM_TARGETS = 50;
const MAX_INTERACTIONS = 30;

const ARCHETYPES = [
  { name: 'skeptic', beliefs: { belief: 5, trust: 10, emotional: 15, social: 8, technical: 45, financial: 20 } },
  { name: 'seeker', beliefs: { belief: 30, trust: 35, emotional: 55, social: 40, technical: 15, financial: 25 } },
  { name: 'investor', beliefs: { belief: 20, trust: 25, emotional: 15, social: 20, technical: 35, financial: 55 } },
  { name: 'community', beliefs: { belief: 35, trust: 45, emotional: 40, social: 55, technical: 20, financial: 30 } },
  { name: 'cautious', beliefs: { belief: 15, trust: 12, emotional: 25, social: 15, technical: 25, financial: 18 } }
];

const POSITIVE_EVENTS = Object.keys(EVENT_IMPACTS).filter(e => EVENT_IMPACTS[e].belief > 0);
const AGENTS = Object.keys(AGENT_EFFECTIVENESS);

// =============================================================================
// SIMULATION
// =============================================================================

function runSimulation() {
  const engine = new PersuasionEngine();
  const results = {
    total: NUM_TARGETS,
    converted: 0,
    partial: 0,
    byArchetype: {},
    byAgent: {},
    avgInteractionsToConvert: 0,
    stageDistribution: {}
  };

  // Initialize counters
  for (const archetype of ARCHETYPES) {
    results.byArchetype[archetype.name] = { total: 0, converted: 0 };
  }
  for (const agent of AGENTS) {
    results.byAgent[agent] = { interactions: 0, conversions: 0 };
  }

  console.log(`Simulating ${NUM_TARGETS} targets...`);
  console.log();

  // Create and simulate targets
  for (let i = 0; i < NUM_TARGETS; i++) {
    const archetype = ARCHETYPES[i % ARCHETYPES.length];
    const targetId = `sim_${i}`;

    // Add some randomness to beliefs
    const beliefs = {};
    for (const [key, value] of Object.entries(archetype.beliefs)) {
      beliefs[key] = Math.max(0, Math.min(100, value + (Math.random() - 0.5) * 20));
    }

    engine.addTarget(targetId, beliefs, { archetype: archetype.name });
    results.byArchetype[archetype.name].total++;

    // Simulate interactions
    let interactions = 0;
    let converted = false;

    while (interactions < MAX_INTERACTIONS && !converted) {
      // Get recommendation
      const rec = engine.getRecommendation(targetId);
      const agentId = rec.agent.recommended;

      // Pick a weighted random positive event
      const event = POSITIVE_EVENTS[Math.floor(Math.random() * POSITIVE_EVENTS.length)];

      // Record interaction
      engine.interact(targetId, event, agentId);
      results.byAgent[agentId].interactions++;
      interactions++;

      // Check conversion
      const target = engine.tracker.getTarget(targetId);
      if (target.conversionStatus === 'converted') {
        converted = true;
        results.converted++;
        results.byArchetype[archetype.name].converted++;
        results.byAgent[agentId].conversions++;
        results.avgInteractionsToConvert += interactions;
      } else if (target.conversionStatus === 'partial' && !converted) {
        results.partial++;
      }

      // Occasionally set conversion flags
      if (target.beliefState.getCompositeScore() > 60) {
        if (Math.random() > 0.7) engine.setFlag(targetId, 'publicAcknowledgment', true);
        if (Math.random() > 0.8) engine.setFlag(targetId, 'communityParticipation', true);
      }
      if (event === 'token_purchase') {
        engine.setFlag(targetId, 'tokenInvestment', true);
      }
    }
  }

  // Calculate averages
  if (results.converted > 0) {
    results.avgInteractionsToConvert /= results.converted;
  }

  // Get final stage distribution
  for (const [_, target] of engine.tracker.targets) {
    const stage = target.beliefState.getStage();
    results.stageDistribution[stage] = (results.stageDistribution[stage] || 0) + 1;
  }

  return results;
}

// =============================================================================
// REPORT
// =============================================================================

function printReport(results) {
  console.log('SIMULATION RESULTS');
  console.log('='.repeat(60));
  console.log();

  console.log('OVERALL:');
  console.log(`  Total Targets: ${results.total}`);
  console.log(`  Full Conversions: ${results.converted} (${(results.converted / results.total * 100).toFixed(1)}%)`);
  console.log(`  Partial Conversions: ${results.partial}`);
  console.log(`  Avg Interactions to Convert: ${results.avgInteractionsToConvert.toFixed(1)}`);
  console.log();

  console.log('BY ARCHETYPE:');
  for (const [name, data] of Object.entries(results.byArchetype)) {
    const rate = data.total > 0 ? (data.converted / data.total * 100).toFixed(1) : 0;
    console.log(`  ${name.padEnd(12)} ${data.converted}/${data.total} (${rate}%)`);
  }
  console.log();

  console.log('BY AGENT:');
  for (const [agent, data] of Object.entries(results.byAgent)) {
    const rate = data.interactions > 0 ? (data.conversions / data.interactions * 100).toFixed(2) : 0;
    console.log(`  ${agent.padEnd(12)} ${data.interactions} interactions, ${data.conversions} conversions (${rate}%)`);
  }
  console.log();

  console.log('FINAL STAGE DISTRIBUTION:');
  const stages = ['UNAWARE', 'AWARE', 'INTERESTED', 'SYMPATHETIC', 'CONVINCED', 'BELIEVER', 'ADVOCATE'];
  for (const stage of stages) {
    const count = results.stageDistribution[stage] || 0;
    const bar = '█'.repeat(Math.ceil(count / 2));
    console.log(`  ${stage.padEnd(12)} ${bar} ${count}`);
  }
  console.log();
}

// =============================================================================
// RUN
// =============================================================================

console.log('Starting batch simulation...');
console.log();

const startTime = Date.now();
const results = runSimulation();
const duration = Date.now() - startTime;

printReport(results);

console.log(`Simulation completed in ${duration}ms`);
