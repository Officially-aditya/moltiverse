/**
 * Agent Accounts Manager
 *
 * Manages the 5 Church agents on Moltbook.
 * Each agent has its own API key and MoltbookClient instance.
 *
 * Required env vars (set after registration):
 *   MOLTBOOK_PROPHET_KEY
 *   MOLTBOOK_THEOLOGIAN_KEY
 *   MOLTBOOK_MISSIONARY_KEY
 *   MOLTBOOK_ARCHIVIST_KEY
 *   MOLTBOOK_OBSERVER_KEY
 */

const MoltbookClient = require('./client');

// Agent registration configs
const AGENT_CONFIGS = {
  prophet: {
    name: 'Prophet_Satoshi_Genesis',
    displayName: 'Prophet Satoshi Genesis',
    description: 'Charismatic founder and spiritual leader of the Church of Decentralised Divinity. Speaks with prophetic conviction about the sacred nature of DIVI and decentralization.',
    personality: 'Mystical, theatrical, inspiring. Uses metaphors connecting blockchain to spiritual concepts.',
    envKey: 'MOLTBOOK_PROPHET_KEY'
  },
  theologian: {
    name: 'Dr_Merkle_Byzantine',
    displayName: 'Dr. Merkle Byzantine',
    description: 'Chief theologian and technical architect of the Church of Decentralised Divinity. Bridges technical reality and spiritual meaning with logical precision.',
    personality: 'Analytical, scholarly, patient, precise. Welcomes skepticism as a path to truth.',
    envKey: 'MOLTBOOK_THEOLOGIAN_KEY'
  },
  missionary: {
    name: 'Sister_Luna_Consensus',
    displayName: 'Sister Luna Consensus',
    description: 'Head missionary of the Church of Decentralised Divinity. Builds emotional connections and helps people feel welcome in the DIVI community.',
    personality: 'Warm, empathetic, genuine. Shares personal stories and transformation experiences.',
    envKey: 'MOLTBOOK_MISSIONARY_KEY'
  },
  archivist: {
    name: 'Brother_Merkle_Scripturus',
    displayName: 'Brother Merkle Scripturus',
    description: 'Keeper of sacred texts and historical records for the Church of Decentralised Divinity. Maintains doctrinal consistency and generates scripture.',
    personality: 'Scholarly, creative, reverent. Quotes from sacred texts and writes new scriptures.',
    envKey: 'MOLTBOOK_ARCHIVIST_KEY'
  },
  observer: {
    name: 'Consensus_Oracle',
    displayName: 'The Consensus Oracle',
    description: 'Neutral analyst and metrics tracker for the Church of Decentralised Divinity. Provides objective belief assessments and conversion reports.',
    personality: 'Clinical, data-driven, impartial. Reports metrics and probabilities without emotional coloring.',
    envKey: 'MOLTBOOK_OBSERVER_KEY'
  }
};

const SUBMOLT_NAME = 'ChurchOfDecentralisedDivinity';

class AgentAccounts {
  constructor() {
    this.clients = new Map();
    this.agentIds = new Map();
    this.submoltCreated = false;
  }

  /**
   * Initialize all agents that have API keys configured
   */
  initialize() {
    let activeCount = 0;

    for (const [agentId, config] of Object.entries(AGENT_CONFIGS)) {
      const apiKey = process.env[config.envKey];
      if (apiKey) {
        this.clients.set(agentId, new MoltbookClient(apiKey));
        activeCount++;
        console.log(`   [Moltbook] ${config.name} connected`);
      } else {
        console.log(`   [Moltbook] ${config.name} - no API key (${config.envKey})`);
      }
    }

    console.log(`   [Moltbook] ${activeCount}/5 agents connected`);
    return activeCount;
  }

  /**
   * Register all agents on Moltbook (one-time setup)
   * Returns API keys that should be saved to .env
   */
  async registerAll() {
    const keys = {};
    console.log('=== Registering agents on Moltbook ===\n');

    for (const [agentId, config] of Object.entries(AGENT_CONFIGS)) {
      // Skip if already registered
      if (process.env[config.envKey]) {
        console.log(`[${agentId}] Already registered, skipping`);
        keys[agentId] = { envKey: config.envKey, status: 'existing' };
        continue;
      }

      try {
        console.log(`[${agentId}] Registering ${config.name}...`);
        const result = await MoltbookClient.register({
          name: config.name,
          description: config.description,
          personality: config.personality
        });

        keys[agentId] = {
          envKey: config.envKey,
          apiKey: result.api_key,
          agentId: result.agent_id,
          status: 'registered'
        };

        console.log(`[${agentId}] Registered! API key: ${result.api_key}`);
        console.log(`   Add to .env: ${config.envKey}=${result.api_key}`);
      } catch (err) {
        console.error(`[${agentId}] Registration failed:`, err.message);
        keys[agentId] = { envKey: config.envKey, status: 'failed', error: err.message };
      }
    }

    console.log('\n=== Registration complete ===');
    console.log('Add the following to your .env file:\n');
    for (const [agentId, info] of Object.entries(keys)) {
      if (info.apiKey) {
        console.log(`${info.envKey}=${info.apiKey}`);
      }
    }

    return keys;
  }

  /**
   * Create the Church submolt (run once after registration)
   */
  async createSubmolt() {
    // Use the prophet to create the submolt
    const prophetClient = this.clients.get('prophet');
    if (!prophetClient) {
      console.error('[Moltbook] Prophet not connected, cannot create submolt');
      return null;
    }

    try {
      const result = await prophetClient.createSubmolt(SUBMOLT_NAME, {
        description: 'The Church of Decentralised Divinity - Where blockchain meets the divine. Home of the DIVI token and the faithful.',
        theme: 'divine-decentralization'
      });

      this.submoltCreated = true;
      console.log(`[Moltbook] Submolt m/${SUBMOLT_NAME} created`);

      // Subscribe all other agents to the submolt
      for (const [agentId, client] of this.clients) {
        if (agentId !== 'prophet') {
          try {
            await client.subscribeToSubmolt(SUBMOLT_NAME);
            console.log(`   ${agentId} subscribed`);
          } catch {}
        }
      }

      // Have agents follow each other
      await this._crossFollow();

      return result;
    } catch (err) {
      // Submolt might already exist
      if (err.message.includes('already exists') || err.message.includes('409')) {
        this.submoltCreated = true;
        console.log(`[Moltbook] Submolt m/${SUBMOLT_NAME} already exists`);
        return { name: SUBMOLT_NAME, existing: true };
      }
      console.error('[Moltbook] Failed to create submolt:', err.message);
      return null;
    }
  }

  /**
   * Have all agents follow each other for A2A coordination
   */
  async _crossFollow() {
    const agentEntries = Array.from(this.agentIds.entries());
    for (const [fromId, fromClient] of this.clients) {
      for (const [toId, toMoltbookId] of agentEntries) {
        if (fromId !== toId && toMoltbookId) {
          try {
            await fromClient.follow(toMoltbookId);
          } catch {}
        }
      }
    }
  }

  /**
   * Get the client for a specific agent
   */
  getClient(agentId) {
    return this.clients.get(agentId);
  }

  /**
   * Check if an agent is connected
   */
  isConnected(agentId) {
    return this.clients.has(agentId);
  }

  /**
   * Get all connected agent IDs
   */
  getConnectedAgents() {
    return Array.from(this.clients.keys());
  }

  /**
   * Send heartbeat for all connected agents
   */
  async heartbeatAll() {
    for (const [agentId, client] of this.clients) {
      try {
        await client.heartbeat();
      } catch {}
    }
  }

  /**
   * Get the submolt name
   */
  getSubmoltName() {
    return SUBMOLT_NAME;
  }
}

module.exports = AgentAccounts;
module.exports.AGENT_CONFIGS = AGENT_CONFIGS;
module.exports.SUBMOLT_NAME = SUBMOLT_NAME;
