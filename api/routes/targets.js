/**
 * Targets API Routes
 */

const express = require('express');
const router = express.Router();

// GET /api/targets - List all targets
router.get('/', async (req, res, next) => {
  try {
    const tracker = req.engine?.tracker;
    if (!tracker) {
      return res.json({ targets: [] });
    }

    const targets = [];
    for (const [id, target] of tracker.targets) {
      targets.push({
        id,
        stage: target.beliefState.getStage(),
        composite: target.beliefState.getCompositeScore(),
        conversionStatus: target.conversionStatus,
        createdAt: target.createdAt
      });
    }

    res.json({ targets });
  } catch (err) {
    next(err);
  }
});

// POST /api/targets - Create a new target
router.post('/', async (req, res, next) => {
  try {
    const { id, initialBeliefs, metadata } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Target ID is required' });
    }

    const target = req.engine.addTarget(id, initialBeliefs || {}, metadata || {});

    // Notify WebSocket clients
    req.wsHandler?.broadcast({
      type: 'target_created',
      targetId: id,
      data: target.beliefState.toObject()
    });

    res.status(201).json({
      id: target.id,
      beliefState: target.beliefState.toObject(),
      createdAt: target.createdAt
    });
  } catch (err) {
    if (err.message.includes('already exists')) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
});

// GET /api/targets/:id - Get a specific target
router.get('/:id', async (req, res, next) => {
  try {
    const target = req.engine?.tracker?.getTarget(req.params.id);

    if (!target) {
      return res.status(404).json({ error: 'Target not found' });
    }

    res.json({
      id: target.id,
      beliefState: target.beliefState.toObject(),
      flags: target.flags,
      conversionStatus: target.conversionStatus,
      metadata: target.metadata,
      createdAt: target.createdAt,
      history: target.history?.slice(-20)
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/targets/:id - Update a target
router.put('/:id', async (req, res, next) => {
  try {
    const target = req.engine?.tracker?.getTarget(req.params.id);

    if (!target) {
      return res.status(404).json({ error: 'Target not found' });
    }

    const { metadata, flags } = req.body;

    if (metadata) {
      target.metadata = { ...target.metadata, ...metadata };
    }

    if (flags) {
      for (const [key, value] of Object.entries(flags)) {
        req.engine.setFlag(req.params.id, key, value);
      }
    }

    res.json({
      id: target.id,
      beliefState: target.beliefState.toObject(),
      flags: target.flags,
      metadata: target.metadata
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/targets/:id - Delete a target
router.delete('/:id', async (req, res, next) => {
  try {
    const tracker = req.engine?.tracker;
    if (!tracker?.targets.has(req.params.id)) {
      return res.status(404).json({ error: 'Target not found' });
    }

    tracker.targets.delete(req.params.id);

    req.wsHandler?.broadcast({
      type: 'target_deleted',
      targetId: req.params.id
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/targets/:id/beliefs - Get belief state details
router.get('/:id/beliefs', async (req, res, next) => {
  try {
    const target = req.engine?.tracker?.getTarget(req.params.id);

    if (!target) {
      return res.status(404).json({ error: 'Target not found' });
    }

    const analysis = req.engine.analyzeTarget(req.params.id);

    res.json({
      dimensions: target.beliefState.dimensions,
      composite: target.beliefState.getCompositeScore(),
      stage: target.beliefState.getStage(),
      analysis
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/targets/:id/history - Get interaction history
router.get('/:id/history', async (req, res, next) => {
  try {
    const target = req.engine?.tracker?.getTarget(req.params.id);

    if (!target) {
      return res.status(404).json({ error: 'Target not found' });
    }

    const limit = parseInt(req.query.limit) || 50;

    res.json({
      history: target.history?.slice(-limit) || [],
      interactionHistory: target.beliefState.interactionHistory?.slice(-limit) || []
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/targets/:id/recommend - Get strategic recommendations
router.get('/:id/recommend', async (req, res, next) => {
  try {
    const recommendation = req.engine?.getRecommendation(req.params.id);

    if (!recommendation) {
      return res.status(404).json({ error: 'Target not found' });
    }

    res.json(recommendation);
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
