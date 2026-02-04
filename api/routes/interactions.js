/**
 * Interactions API Routes
 */

const express = require('express');
const router = express.Router();

// POST /api/interactions - Record an interaction event
router.post('/', async (req, res, next) => {
  try {
    const { targetId, event, agentId } = req.body;

    if (!targetId || !event || !agentId) {
      return res.status(400).json({
        error: 'targetId, event, and agentId are required'
      });
    }

    const result = req.engine.interact(targetId, event, agentId);

    // Notify WebSocket clients
    req.wsHandler?.broadcast({
      type: 'belief_update',
      targetId,
      beliefs: result.newState.dimensions,
      composite: result.newState.getCompositeScore(),
      stage: result.newState.getStage()
    });

    res.json({
      success: true,
      previousState: result.previousState,
      newState: result.newState.toObject(),
      deltas: result.deltas
    });
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('Unknown')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/interactions/converse - Send a message in conversation
router.post('/converse', async (req, res, next) => {
  try {
    const { targetId, message } = req.body;

    if (!targetId || !message) {
      return res.status(400).json({
        error: 'targetId and message are required'
      });
    }

    const debateLoop = req.orchestrator?.debateLoop;
    if (!debateLoop) {
      return res.status(503).json({ error: 'Conversation service unavailable' });
    }

    // Check if conversation exists, if not start one
    let response;
    const conversationState = debateLoop.getConversationState(targetId);

    if (!conversationState) {
      response = await debateLoop.start(targetId, message);
    } else if (conversationState.status === 'active') {
      response = await debateLoop.continue(targetId, message);
    } else {
      return res.status(400).json({
        error: `Conversation is ${conversationState.status}`
      });
    }

    // Notify WebSocket clients
    req.wsHandler?.broadcastToTarget(targetId, {
      type: 'agent_message',
      targetId,
      agentId: response.agentId,
      agentName: response.agentName,
      content: response.content
    });

    res.json({
      agentId: response.agentId,
      agentName: response.agentName,
      content: response.content,
      analysis: response.analysis,
      conversationLength: response.conversationLength
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/interactions/conversations/:id - Get conversation history
router.get('/conversations/:id', async (req, res, next) => {
  try {
    const debateLoop = req.orchestrator?.debateLoop;
    if (!debateLoop) {
      return res.status(503).json({ error: 'Conversation service unavailable' });
    }

    const conversation = debateLoop.getConversation(req.params.id);
    const state = debateLoop.getConversationState(req.params.id);

    if (!state) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      targetId: req.params.id,
      status: state.status,
      messageCount: state.messageCount,
      currentAgent: state.currentAgent,
      messages: conversation
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/interactions/conversations/:id - End a conversation
router.delete('/conversations/:id', async (req, res, next) => {
  try {
    const debateLoop = req.orchestrator?.debateLoop;
    if (!debateLoop) {
      return res.status(503).json({ error: 'Conversation service unavailable' });
    }

    const summary = debateLoop.end(req.params.id);

    if (!summary) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// GET /api/interactions/conversations - List active conversations
router.get('/conversations', async (req, res, next) => {
  try {
    const debateLoop = req.orchestrator?.debateLoop;
    if (!debateLoop) {
      return res.json({ conversations: [] });
    }

    const activeIds = debateLoop.getActiveDebates();
    const conversations = activeIds.map(id => ({
      targetId: id,
      ...debateLoop.getConversationState(id)
    }));

    res.json({ conversations });
  } catch (err) {
    next(err);
  }
});

// POST /api/interactions/objection - Get counter-argument for objection
router.post('/objection', async (req, res, next) => {
  try {
    const { objection, agentId } = req.body;

    if (!objection) {
      return res.status(400).json({ error: 'objection is required' });
    }

    const response = req.engine.getCounterArgument(
      objection,
      agentId || 'theologian'
    );

    if (!response) {
      return res.status(404).json({ error: 'Unknown objection type' });
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
