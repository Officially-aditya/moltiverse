/**
 * Agents API Routes
 */

const express = require('express');
const router = express.Router();
const { AGENT_PROMPTS } = require('../../llm/prompt-builder');

// GET /api/agents - List all agents
router.get('/', async (req, res, next) => {
  try {
    const agentManager = req.orchestrator?.agentManager;

    if (!agentManager) {
      // Return static agent info if no manager
      const agents = Object.entries(AGENT_PROMPTS).map(([id, config]) => ({
        id,
        name: config.name,
        role: config.role,
        temperature: config.temperature,
        status: 'unknown'
      }));

      return res.json({ agents });
    }

    const agents = agentManager.getAllAgents().map(agent => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      status: agent.status,
      temperature: agent.temperature,
      activeConversations: agent.activeConversations.size
    }));

    res.json({ agents });
  } catch (err) {
    next(err);
  }
});

// GET /api/agents/:id - Get specific agent details
router.get('/:id', async (req, res, next) => {
  try {
    const agentId = req.params.id;
    const config = AGENT_PROMPTS[agentId];

    if (!config) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agentManager = req.orchestrator?.agentManager;
    const agent = agentManager?.getAgent(agentId);

    res.json({
      id: agentId,
      name: config.name,
      role: config.role,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      status: agent?.status || 'unknown',
      activeConversations: agent?.activeConversations.size || 0,
      lastActive: agent?.lastActive
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/agents/:id/metrics - Get agent performance metrics
router.get('/:id/metrics', async (req, res, next) => {
  try {
    const agentId = req.params.id;
    const agentManager = req.orchestrator?.agentManager;

    if (!agentManager) {
      return res.status(503).json({ error: 'Agent manager unavailable' });
    }

    const metrics = agentManager.getAgentMetrics()[agentId];

    if (!metrics) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get agent stats from tracker
    const tracker = req.engine?.tracker;
    const trackerStats = tracker?.agentStats[agentId] || {};

    res.json({
      agentId,
      ...metrics,
      conversionsInfluenced: trackerStats.conversionsInfluenced || 0,
      interactions: trackerStats.interactions || 0
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/agents/status - Get all agent statuses
router.get('/status/all', async (req, res, next) => {
  try {
    const agentManager = req.orchestrator?.agentManager;

    if (!agentManager) {
      return res.json({ status: {} });
    }

    res.json({ status: agentManager.getAgentStatus() });
  } catch (err) {
    next(err);
  }
});

// POST /api/agents/:id/prompt - Test agent with a prompt
router.post('/:id/prompt', async (req, res, next) => {
  try {
    const agentId = req.params.id;
    const { message, targetId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const agentManager = req.orchestrator?.agentManager;

    if (!agentManager) {
      return res.status(503).json({ error: 'Agent manager unavailable' });
    }

    const agent = agentManager.getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get target context if provided
    let context = {};
    if (targetId) {
      const target = req.engine?.tracker?.getTarget(targetId);
      if (target) {
        context.targetProfile = target.beliefState.toObject();
      }
    }

    const response = await agentManager.generateResponse(agentId, message, context);

    res.json({
      agentId: response.agentId,
      agentName: response.agentName,
      content: response.content,
      responseTime: response.responseTime
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/agents/effectiveness - Get agent effectiveness matrix
router.get('/effectiveness/matrix', async (req, res, next) => {
  try {
    const { AGENT_EFFECTIVENESS } = require('../../engine');

    res.json({
      matrix: AGENT_EFFECTIVENESS,
      dimensions: ['belief', 'trust', 'emotional', 'social', 'technical', 'financial']
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
