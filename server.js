/**
 * Moltiverse Server
 *
 * Main entry point that initializes and connects all system components
 */

require('dotenv').config();

const { PersuasionEngine } = require('./engine');
const { AgentManager, DebateLoop, EventHandler, Scheduler } = require('./orchestrator');
const { createProvider } = require('./llm');
const { Database, TargetStore, EventLog } = require('./state');
const APIServer = require('./api');

// =============================================================================
// CONFIGURATION
// =============================================================================

const config = {
  port: process.env.PORT || 3000,
  llmProvider: process.env.LLM_PROVIDER || 'mock',
  dataDir: process.env.DATA_DIR || './data',
  enableDecay: process.env.ENABLE_DECAY !== 'false',
  decayIntervalHours: parseInt(process.env.DECAY_INTERVAL_HOURS) || 24
};

// =============================================================================
// SYSTEM INITIALIZATION
// =============================================================================

async function initializeSystem() {
  console.log('Initializing Moltiverse system...');
  console.log('================================');

  // 1. Initialize database
  console.log('1. Initializing database...');
  const database = new Database({ dataDir: config.dataDir });
  await database.connect();

  // 2. Initialize state stores
  console.log('2. Initializing state stores...');
  const targetStore = new TargetStore(database);
  const eventLog = new EventLog(database);
  eventLog.start();

  // 3. Initialize LLM provider
  console.log(`3. Initializing LLM provider (${config.llmProvider})...`);
  const llmProvider = createProvider(config.llmProvider, {
    apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
  });

  // 4. Initialize persuasion engine
  console.log('4. Initializing persuasion engine...');
  const engine = new PersuasionEngine();

  // 5. Initialize event handler
  console.log('5. Initializing event handler...');
  const eventHandler = new EventHandler();

  // Wire up event logging
  eventHandler.subscribe((event) => {
    eventLog.log(event);
  });

  // 6. Initialize agent manager
  console.log('6. Initializing agent manager...');
  const agentManager = new AgentManager({
    llmProvider,
    strategySelector: engine.strategy
  });

  // 7. Initialize debate loop
  console.log('7. Initializing debate loop...');
  const debateLoop = new DebateLoop({
    agentManager,
    conversionTracker: engine.tracker,
    eventHandler
  });

  // 8. Initialize scheduler
  console.log('8. Initializing scheduler...');
  const scheduler = new Scheduler({
    eventHandler,
    conversionTracker: engine.tracker
  });

  // Start decay job if enabled
  if (config.enableDecay) {
    scheduler.startDecayJob(config.decayIntervalHours);
    console.log(`   - Belief decay job scheduled (every ${config.decayIntervalHours}h)`);
  }

  // 9. Create orchestrator bundle
  const orchestrator = {
    agentManager,
    debateLoop,
    eventHandler,
    scheduler
  };

  // 10. Initialize API server
  console.log('9. Initializing API server...');
  const apiServer = new APIServer({
    port: config.port,
    engine,
    orchestrator
  });

  // Store references for cleanup
  const system = {
    database,
    targetStore,
    eventLog,
    engine,
    orchestrator,
    apiServer
  };

  console.log('================================');
  console.log('System initialization complete!');

  return system;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  try {
    const system = await initializeSystem();

    // Start the API server
    await system.apiServer.start();

    // Add some demo targets if in development mode
    if (process.env.NODE_ENV !== 'production') {
      seedDemoData(system.engine);
    }

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down...');

      system.orchestrator.scheduler.cancelAll();
      await system.eventLog.stop();
      await system.database.disconnect();
      await system.apiServer.stop();

      process.exit(0);
    });

    console.log('\n🔮 Moltiverse is ready!');
    console.log(`   API: http://localhost:${config.port}/api`);
    console.log(`   WebSocket: ws://localhost:${config.port}`);
    console.log(`   UI: http://localhost:${config.port}`);
    console.log('\nPress Ctrl+C to stop.\n');

  } catch (error) {
    console.error('Failed to start Moltiverse:', error);
    process.exit(1);
  }
}

// =============================================================================
// DEMO DATA
// =============================================================================

function seedDemoData(engine) {
  console.log('\nSeeding demo data...');

  // Add some demo targets
  const demoTargets = [
    {
      id: 'demo_skeptic',
      beliefs: { belief: 10, trust: 15, emotional: 20, social: 12, technical: 45, financial: 25 },
      metadata: { source: 'twitter', archetype: 'technical_skeptic' }
    },
    {
      id: 'demo_seeker',
      beliefs: { belief: 35, trust: 40, emotional: 55, social: 38, technical: 20, financial: 30 },
      metadata: { source: 'discord', archetype: 'spiritual_seeker' }
    },
    {
      id: 'demo_investor',
      beliefs: { belief: 25, trust: 30, emotional: 20, social: 28, technical: 35, financial: 55 },
      metadata: { source: 'telegram', archetype: 'profit_seeker' }
    },
    {
      id: 'demo_community',
      beliefs: { belief: 40, trust: 50, emotional: 45, social: 60, technical: 25, financial: 35 },
      metadata: { source: 'reddit', archetype: 'community_oriented' }
    },
    {
      id: 'demo_cautious',
      beliefs: { belief: 20, trust: 15, emotional: 30, social: 18, technical: 30, financial: 22 },
      metadata: { source: 'email', archetype: 'cautious_observer' }
    }
  ];

  for (const target of demoTargets) {
    try {
      engine.addTarget(target.id, target.beliefs, target.metadata);
      console.log(`   - Added demo target: ${target.id}`);
    } catch (e) {
      // Target may already exist
    }
  }

  console.log('Demo data seeded.\n');
}

// Run the application
main();
