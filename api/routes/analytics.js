/**
 * Analytics API Routes
 */

const express = require('express');
const router = express.Router();
const { CONVERSION_STAGES } = require('../../engine');

// GET /api/analytics/report - Generate full performance report
router.get('/report', async (req, res, next) => {
  try {
    const report = req.engine?.generateReport();

    if (!report) {
      return res.json({
        summary: { totalTargets: 0 },
        message: 'No data available'
      });
    }

    res.json(report);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/funnel - Get conversion funnel data
router.get('/funnel', async (req, res, next) => {
  try {
    const tracker = req.engine?.tracker;

    if (!tracker) {
      return res.json({ funnel: [] });
    }

    const funnel = [];
    const stages = Object.keys(CONVERSION_STAGES);

    for (const stage of stages) {
      const targets = tracker.getTargetsByStage(stage);
      funnel.push({
        stage,
        label: CONVERSION_STAGES[stage].label,
        count: targets.length,
        targets: targets.slice(0, 5).map(t => ({
          id: t.id,
          composite: t.beliefState.getCompositeScore()
        }))
      });
    }

    // Add conversion stats
    const converted = tracker.conversions.length;
    const partial = tracker.partialConversions.length;

    res.json({
      funnel,
      conversions: {
        full: converted,
        partial: partial
      },
      totalTargets: tracker.targets.size
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/agents - Get agent comparison data
router.get('/agents', async (req, res, next) => {
  try {
    const tracker = req.engine?.tracker;
    const agentManager = req.orchestrator?.agentManager;

    const agentData = {};
    const agentIds = ['prophet', 'theologian', 'missionary', 'archivist', 'observer'];

    for (const agentId of agentIds) {
      const trackerStats = tracker?.agentStats[agentId] || {};
      const managerMetrics = agentManager?.getAgentMetrics()[agentId] || {};

      agentData[agentId] = {
        interactions: trackerStats.interactions || 0,
        conversionsInfluenced: trackerStats.conversionsInfluenced || 0,
        conversionRate: trackerStats.interactions > 0
          ? ((trackerStats.conversionsInfluenced / trackerStats.interactions) * 100).toFixed(2)
          : 0,
        messagesGenerated: managerMetrics.messagesGenerated || 0,
        averageResponseTime: managerMetrics.averageResponseTime || 0
      };
    }

    res.json({ agents: agentData });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/trends - Get trend data over time
router.get('/trends', async (req, res, next) => {
  try {
    const tracker = req.engine?.tracker;

    if (!tracker) {
      return res.json({ trends: [] });
    }

    // Get events from last 7 days
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Group by day
    const days = {};
    for (let i = 0; i < 7; i++) {
      const dayStart = now - (i + 1) * 24 * 60 * 60 * 1000;
      const dayKey = new Date(dayStart).toISOString().split('T')[0];
      days[dayKey] = {
        date: dayKey,
        interactions: 0,
        conversions: 0,
        newTargets: 0
      };
    }

    // Count events by day
    for (const event of tracker.eventLog) {
      if (event.timestamp < weekAgo) continue;

      const dayKey = new Date(event.timestamp).toISOString().split('T')[0];
      if (days[dayKey]) {
        if (event.type === 'interaction') {
          days[dayKey].interactions++;
        } else if (event.type === 'conversion') {
          days[dayKey].conversions++;
        } else if (event.type === 'target_added') {
          days[dayKey].newTargets++;
        }
      }
    }

    const trends = Object.values(days).sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );

    res.json({ trends });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/prospects - Get hot prospects
router.get('/prospects', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const prospects = req.engine?.getHotProspects(limit);

    if (!prospects) {
      return res.json({ prospects: [] });
    }

    res.json({
      prospects: prospects.map(p => ({
        id: p.target.id,
        probability: (p.probability * 100).toFixed(1) + '%',
        composite: p.composite.toFixed(1),
        stage: p.stage
      }))
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/stages/:stage - Get targets at a specific stage
router.get('/stages/:stage', async (req, res, next) => {
  try {
    const stage = req.params.stage.toUpperCase();

    if (!CONVERSION_STAGES[stage]) {
      return res.status(400).json({
        error: 'Invalid stage',
        validStages: Object.keys(CONVERSION_STAGES)
      });
    }

    const targets = req.engine?.getTargetsByStage(stage) || [];

    res.json({
      stage,
      count: targets.length,
      targets: targets.map(t => ({
        id: t.id,
        composite: t.beliefState.getCompositeScore(),
        conversionStatus: t.conversionStatus
      }))
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/summary - Quick summary stats
router.get('/summary', async (req, res, next) => {
  try {
    const tracker = req.engine?.tracker;

    if (!tracker) {
      return res.json({
        targets: 0,
        conversions: 0,
        activeConversations: 0
      });
    }

    const debateLoop = req.orchestrator?.debateLoop;

    res.json({
      targets: tracker.targets.size,
      conversions: tracker.conversions.length,
      partialConversions: tracker.partialConversions.length,
      activeConversations: debateLoop?.getActiveDebates().length || 0,
      averageComposite: calculateAverageComposite(tracker)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Calculate average composite score
 */
function calculateAverageComposite(tracker) {
  if (tracker.targets.size === 0) return 0;

  let total = 0;
  for (const [_, target] of tracker.targets) {
    total += target.beliefState.getCompositeScore();
  }

  return (total / tracker.targets.size).toFixed(1);
}

module.exports = router;
