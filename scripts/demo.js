/**
 * Moltiverse Demo Script
 *
 * Demonstrates the complete system in action
 */

const { PersuasionEngine, BeliefState, analyzeBeliefState } = require('../engine');
const { AgentManager, DebateLoop, EventHandler } = require('../orchestrator');
const { createProvider } = require('../llm');

console.log('='.repeat(60));
console.log('MOLTIVERSE DEMO');
console.log('Church of Decentralised Divinity - Multi-Agent Persuasion System');
console.log('='.repeat(60));
console.log();

// Initialize components
const engine = new PersuasionEngine();
const eventHandler = new EventHandler();
const llmProvider = createProvider('mock');
const agentManager = new AgentManager({ llmProvider });

const debateLoop = new DebateLoop({
  agentManager,
  conversionTracker: engine.tracker,
  eventHandler
});

// Setup event logging
eventHandler.onStageChange((e) => {
  console.log(`  📊 STAGE CHANGE: ${e.from} → ${e.to}`);
});

eventHandler.onConversion((e) => {
  console.log(`  🎉 CONVERSION! Target: ${e.targetId}`);
});

// =============================================================================
// DEMO SCENARIO
// =============================================================================

async function runDemo() {
  console.log('SCENARIO: Converting a Technical Skeptic');
  console.log('-'.repeat(40));
  console.log();

  // Create a skeptical target
  const target = engine.addTarget('demo_skeptic', {
    belief: 5,
    trust: 10,
    emotional: 15,
    social: 8,
    technical: 45,
    financial: 20
  });

  console.log('Initial Target State:');
  console.log(`  Stage: ${target.beliefState.getStage()}`);
  console.log(`  Composite: ${target.beliefState.getCompositeScore().toFixed(1)}`);
  console.log();

  // Get strategic recommendation
  const rec = engine.getRecommendation('demo_skeptic');
  console.log('Strategic Analysis:');
  console.log(`  Archetype: ${rec.archetype.name}`);
  console.log(`  Recommended Agent: ${rec.agent.recommended}`);
  console.log(`  Strategy: ${rec.strategy.name}`);
  console.log();

  // Simulate conversation
  console.log('SIMULATED CONVERSATION:');
  console.log('-'.repeat(40));

  const messages = [
    "I've heard about DIVI but it sounds like another crypto scam to me.",
    "Okay but how is the technical architecture actually different from other tokens?",
    "That's interesting. What about the community governance model?",
    "I'm starting to see the value here. How would I get started?",
    "I just purchased some DIVI tokens!"
  ];

  for (const userMessage of messages) {
    console.log();
    console.log(`USER: ${userMessage}`);

    const response = await debateLoop.continue('demo_skeptic', userMessage);

    console.log(`[${response.agentName.toUpperCase()}]: ${response.content}`);

    // Show current state
    const state = engine.tracker.getTarget('demo_skeptic').beliefState;
    console.log(`  → Stage: ${state.getStage()} | Score: ${state.getCompositeScore().toFixed(1)}`);

    // Small delay for readability
    await new Promise(r => setTimeout(r, 500));
  }

  // Final report
  console.log();
  console.log('='.repeat(60));
  console.log('FINAL RESULTS');
  console.log('='.repeat(60));

  const finalTarget = engine.tracker.getTarget('demo_skeptic');
  const finalAnalysis = analyzeBeliefState(finalTarget.beliefState);

  console.log();
  console.log('Final Belief State:');
  for (const [dim, value] of Object.entries(finalTarget.beliefState.dimensions)) {
    const bar = '█'.repeat(Math.floor(value / 5)) + '░'.repeat(20 - Math.floor(value / 5));
    console.log(`  ${dim.padEnd(10)} [${bar}] ${value.toFixed(1)}`);
  }

  console.log();
  console.log(`Composite Score: ${finalAnalysis.composite.toFixed(1)}`);
  console.log(`Stage: ${finalAnalysis.stage}`);
  console.log(`Conversion Probability: ${(finalAnalysis.conversionProbability * 100).toFixed(1)}%`);

  // Generate report
  console.log();
  console.log('System Report:');
  const report = engine.generateReport();
  console.log(`  Total Targets: ${report.summary.totalTargets}`);
  console.log(`  Conversions: ${report.summary.converted}`);
  console.log(`  Avg Composite: ${report.summary.averageComposite}`);

  console.log();
  console.log('Demo complete!');
}

// Run the demo
runDemo().catch(console.error);
