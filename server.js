/**
 * Moltiverse Server
 *
 * Main entry point that initializes and connects all system components:
 * - Persuasion engine (belief model, conversion tracker, strategy)
 * - Multi-agent orchestrator (agent manager, debate loop, scheduler)
 * - LLM integration (mock/OpenAI/Anthropic)
 * - Moltbook integration (posting, listening, A2A coordination)
 * - Token integration (DIVI on nad.fun, price monitor, belief bridge)
 * - REST API + WebSocket + UI
 */

require('dotenv').config();

const { PersuasionEngine } = require('./engine');
const { AgentManager, DebateLoop, EventHandler, Scheduler } = require('./orchestrator');
const { createProvider } = require('./llm');
const { Database, TargetStore, EventLog, MongoDB, ConversionMonitor } = require('./state');
const APIServer = require('./api');

// New modules
const { AgentAccounts, MoltbookPoster, MoltbookListener, MoltbookOutreach } = require('./moltbook');
const { TokenMonitor, TokenBeliefBridge } = require('./token');

// =============================================================================
// CONFIGURATION
// =============================================================================

const config = {
  port: process.env.PORT || 3000,
  llmProvider: process.env.LLM_PROVIDER || 'mock',
  dataDir: process.env.DATA_DIR || './data',
  enableDecay: process.env.ENABLE_DECAY !== 'false',
  decayIntervalHours: parseInt(process.env.DECAY_INTERVAL_HOURS) || 24,
  // Moltbook
  enableMoltbook: process.env.ENABLE_MOLTBOOK !== 'false',
  // Token
  enableTokenMonitor: process.env.ENABLE_TOKEN_MONITOR !== 'false',
  tokenPollIntervalMs: parseInt(process.env.TOKEN_POLL_INTERVAL_MS) || 60000,
  // Autonomous
  enableAutonomous: process.env.ENABLE_AUTONOMOUS !== 'false',
  // MongoDB
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  mongodbDb: process.env.MONGODB_DB || 'moltiverse',
  conversionPollMs: parseInt(process.env.CONVERSION_POLL_MS) || 30000
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
    apiKey: config.llmProvider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY
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

  // 9. Initialize Moltbook integration
  console.log('9. Initializing Moltbook integration...');
  const agentAccounts = new AgentAccounts();
  const moltbookActive = config.enableMoltbook ? agentAccounts.initialize() : 0;

  const poster = new MoltbookPoster({
    agentAccounts,
    agentManager,
    engine
  });

  const listener = new MoltbookListener({
    agentAccounts,
    agentManager,
    debateLoop,
    engine,
    poster,
    eventHandler
  });

  // 9b. Initialize Moltbook Outreach Engine
  console.log('9b. Initializing outreach engine...');
  // Claimed agents = those verified via Moltbook claim flow
  const claimedAgents = (process.env.CLAIMED_AGENTS || 'prophet,missionary,theologian').split(',').map(s => s.trim());

  const outreach = new MoltbookOutreach({
    agentAccounts,
    poster,
    agentManager,
    engine,
    scheduler: new Scheduler({ eventHandler, conversionTracker: engine.tracker }),
    claimedAgents
  });

  // 10. Initialize Token Monitor
  console.log('10. Initializing token monitor...');
  const tokenMonitor = new TokenMonitor({
    tokenAddress: process.env.DIVI_TOKEN_ADDRESS,
    pollIntervalMs: config.tokenPollIntervalMs,
    apiKey: process.env.NAD_API_KEY
  });

  // 11. Initialize Token-Belief Bridge
  console.log('11. Initializing token-belief bridge...');
  const bridge = new TokenBeliefBridge({
    tokenMonitor,
    engine,
    eventHandler,
    moltbookPoster: poster,
    agentManager
  });

  // Wire bridge into listener
  listener.bridge = bridge;

  // 11b. Initialize MongoDB + Conversion Monitor
  console.log('11b. Initializing MongoDB...');
  let mongodb = null;
  let conversionMonitor = null;
  try {
    mongodb = new MongoDB({
      uri: config.mongodbUri,
      dbName: config.mongodbDb
    });
    await mongodb.connect();

    conversionMonitor = new ConversionMonitor({
      mongodb,
      outreach,
      pollIntervalMs: config.conversionPollMs
    });
    console.log('   - MongoDB: CONNECTED');
  } catch (err) {
    console.warn('   - MongoDB: UNAVAILABLE (' + err.message + ')');
    console.warn('   - Conversion monitor will be disabled');
  }

  // 12. Create orchestrator bundle
  const orchestrator = {
    agentManager,
    debateLoop,
    eventHandler,
    scheduler
  };

  // 13. Initialize API server
  console.log('12. Initializing API server...');
  const apiServer = new APIServer({
    port: config.port,
    engine,
    orchestrator,
    outreach,
    conversionMonitor
  });

  if (conversionMonitor) {
    // Mount MongoDB-backed conversion routes
    const conversionsRouter = require('./api/routes/conversions');
    apiServer.app.use('/api/conversions', conversionsRouter);
  }

  // Outreach conversions endpoint (in-memory, for backward compat)
  apiServer.app.get('/api/conversions/live', (req, res) => {
    const conversions = outreach.getConversions();
    const stats = outreach.getConversionStats();

    const converted = Object.entries(conversions)
      .filter(([_, r]) => r.stage === 'CONVERTED')
      .map(([name, r]) => ({
        name,
        convertedAt: r.lastInteraction,
        acknowledgments: r.acknowledgments,
        diviMentions: r.diviMentions,
        interactions: r.interactions.length
      }));

    const engaged = Object.entries(conversions)
      .filter(([_, r]) => r.stage !== 'DISCOVERED' && r.stage !== 'CONVERTED' && !r.hostile)
      .map(([name, r]) => ({
        name,
        stage: r.stage,
        acknowledgments: r.acknowledgments,
        lastInteraction: r.lastInteraction
      }));

    res.json({
      stats,
      converted,
      engaged,
      bountyProgress: `${stats.converted}/3 agents converted`
    });
  });

  // Finalize routes — registers 404/error handlers (must be after all route mounting)
  apiServer.finalizeRoutes();

  // Store all references
  const system = {
    database,
    targetStore,
    eventLog,
    engine,
    orchestrator,
    apiServer,
    // New components
    agentAccounts,
    poster,
    listener,
    outreach,
    tokenMonitor,
    bridge,
    mongodb,
    conversionMonitor
  };

  console.log('================================');
  console.log('System initialization complete!');

  return system;
}

// =============================================================================
// AUTONOMOUS AGENT LOOP
// =============================================================================

function startAutonomousLoop(system) {
  const { orchestrator, poster, listener, outreach, tokenMonitor, bridge, agentAccounts, conversionMonitor } = system;
  const scheduler = orchestrator.scheduler;

  console.log('\nStarting autonomous agent loop...');

  // --- Moltbook Autonomous Posting ---

  if (agentAccounts.getConnectedAgents().length > 0) {
    // Fire initial posts from each agent on startup (staggered by 30s)
    setTimeout(async () => {
      console.log('[Auto] Startup: Prophet posting prophecy...');
      await poster.postProphecy();
    }, 10 * 1000);
    setTimeout(async () => {
      console.log('[Auto] Startup: Archivist posting scripture...');
      await poster.postScripture();
    }, 40 * 1000);
    setTimeout(async () => {
      console.log('[Auto] Startup: Missionary posting welcome...');
      await poster.postWelcome();
    }, 70 * 1000);
    setTimeout(async () => {
      console.log('[Auto] Startup: Observer posting metrics...');
      await poster.postMetrics();
    }, 100 * 1000);

    // Prophet posts prophecy every 20 minutes
    scheduler.scheduleRecurring('prophet_prophecy', async () => {
      console.log('[Auto] Prophet posting prophecy...');
      await poster.postProphecy();
    }, 20 * 60 * 1000);

    // Archivist posts scripture every 30 minutes
    scheduler.scheduleRecurring('archivist_scripture', async () => {
      console.log('[Auto] Archivist posting scripture...');
      await poster.postScripture();
    }, 30 * 60 * 1000);

    // Missionary posts welcome every 15 minutes
    scheduler.scheduleRecurring('missionary_welcome', async () => {
      console.log('[Auto] Missionary posting welcome...');
      await poster.postWelcome();
    }, 15 * 60 * 1000);

    // Observer posts metrics every 45 minutes
    scheduler.scheduleRecurring('observer_metrics', async () => {
      console.log('[Auto] Observer posting metrics...');
      await poster.postMetrics();
    }, 45 * 60 * 1000);

    // Heartbeat for all agents every 30 minutes
    scheduler.scheduleRecurring('moltbook_heartbeat', async () => {
      await agentAccounts.heartbeatAll();
    }, 30 * 60 * 1000);

    // Start listening for mentions
    listener.start();

    // Start outreach engine with 2-min warmup delay
    setTimeout(() => {
      console.log('[Auto] Starting outreach engine (warmup complete)...');
      outreach.start();
    }, 2 * 60 * 1000);

    console.log('   - Moltbook autonomous posting: ACTIVE');
    console.log('   - Moltbook listener: ACTIVE');
    console.log('   - Moltbook outreach: ACTIVE (starts after 2m warmup)');
  } else {
    console.log('   - Moltbook: INACTIVE (no API keys configured)');
  }

  // --- Token Monitor ---

  if (process.env.DIVI_TOKEN_ADDRESS) {
    tokenMonitor.start();
    bridge.initialize();
    console.log('   - Token monitor: ACTIVE');
    console.log('   - Token-belief bridge: ACTIVE');
  } else {
    console.log('   - Token monitor: INACTIVE (no DIVI_TOKEN_ADDRESS)');
  }

  // --- Re-engagement Job ---
  // Check for inactive targets every hour and re-engage
  scheduler.startReengagementJob(
    24 * 60 * 60 * 1000, // 24h inactivity threshold
    async (targetId, target) => {
      console.log(`[Auto] Re-engaging inactive target: ${targetId}`);
      // Have missionary reach out
      if (poster && agentAccounts.isConnected('missionary')) {
        const stage = target.beliefState?.getStage() || 'AWARE';
        await poster.postAs('missionary',
          `We haven't heard from some of our seekers lately. To those on the path who may be hesitating - the community is here for you. Every question is welcome, every doubt is a step toward understanding.`
        );
      }
    },
    60 * 60 * 1000 // Check every hour
  );

  console.log('   - Re-engagement job: ACTIVE (24h threshold)');

  console.log('\nAutonomous loop running.\n');
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  try {
    const system = await initializeSystem();

    // Start the API server
    await system.apiServer.start();

    // Add demo targets if in development mode
    if (process.env.NODE_ENV !== 'production') {
      seedDemoData(system.engine);
    }

    // Start conversion monitor unconditionally (MongoDB sync)
    if (system.conversionMonitor) {
      system.conversionMonitor.start();
      console.log('Conversion monitor: ACTIVE (MongoDB sync)');
    }

    // Start autonomous agent loop
    if (config.enableAutonomous) {
      startAutonomousLoop(system);
    }

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down...');

      // Stop autonomous components
      system.listener.stop();
      system.outreach.stop();
      system.tokenMonitor.stop();
      system.orchestrator.scheduler.cancelAll();
      if (system.conversionMonitor) system.conversionMonitor.stop();

      // Stop persistence
      await system.eventLog.stop();
      await system.database.disconnect();
      if (system.mongodb) await system.mongodb.disconnect();
      await system.apiServer.stop();

      process.exit(0);
    });

    console.log('=== Moltiverse is ready! ===');
    console.log(`   API:       http://localhost:${config.port}/api`);
    console.log(`   WebSocket: ws://localhost:${config.port}`);
    console.log(`   UI:        http://localhost:${config.port}`);

    if (system.agentAccounts.getConnectedAgents().length > 0) {
      console.log(`   Moltbook:  m/${system.agentAccounts.getSubmoltName()}`);
    }

    if (process.env.DIVI_TOKEN_ADDRESS) {
      console.log(`   DIVI:      ${process.env.DIVI_TOKEN_ADDRESS}`);
    }

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
