/**
 * Conversions API Routes
 *
 * Serves agent conversion data from MongoDB for the UI dashboard.
 */

const express = require('express');
const router = express.Router();

// GET /api/conversions/db/all - All tracked agents from MongoDB
router.get('/db/all', async (req, res, next) => {
  try {
    const monitor = req.conversionMonitor;
    if (!monitor) {
      return res.status(503).json({ error: 'Conversion monitor unavailable' });
    }

    const conversions = await monitor.getAllConversions();
    res.json({ conversions });
  } catch (err) {
    next(err);
  }
});

// GET /api/conversions/db/converted - Only converted agents
router.get('/db/converted', async (req, res, next) => {
  try {
    const monitor = req.conversionMonitor;
    if (!monitor) {
      return res.status(503).json({ error: 'Conversion monitor unavailable' });
    }

    const converted = await monitor.getConvertedAgents();
    res.json({ converted });
  } catch (err) {
    next(err);
  }
});

// GET /api/conversions/db/stats - Aggregate conversion stats
router.get('/db/stats', async (req, res, next) => {
  try {
    const monitor = req.conversionMonitor;
    if (!monitor) {
      return res.status(503).json({ error: 'Conversion monitor unavailable' });
    }

    const stats = await monitor.getStats();
    res.json({ stats: stats || {} });
  } catch (err) {
    next(err);
  }
});

// GET /api/conversions/db/history - Stage transition history
router.get('/db/history', async (req, res, next) => {
  try {
    const monitor = req.conversionMonitor;
    if (!monitor) {
      return res.status(503).json({ error: 'Conversion monitor unavailable' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const history = await monitor.getHistory(limit);
    res.json({ history });
  } catch (err) {
    next(err);
  }
});

// GET /api/conversions/db/stage/:stage - Agents at a specific stage
router.get('/db/stage/:stage', async (req, res, next) => {
  try {
    const monitor = req.conversionMonitor;
    if (!monitor) {
      return res.status(503).json({ error: 'Conversion monitor unavailable' });
    }

    const stage = req.params.stage.toUpperCase();
    const agents = await monitor.getConversionsByStage(stage);
    res.json({ stage, agents });
  } catch (err) {
    next(err);
  }
});

// GET /api/conversions/db/agent/:name - History for a specific agent
router.get('/db/agent/:name', async (req, res, next) => {
  try {
    const monitor = req.conversionMonitor;
    if (!monitor) {
      return res.status(503).json({ error: 'Conversion monitor unavailable' });
    }

    const history = await monitor.getAgentHistory(req.params.name);
    res.json({ agentName: req.params.name, history });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
