/**
 * Conversion Monitor
 *
 * Periodically polls the outreach engine for agent conversion data
 * and writes status updates to MongoDB. Tracks stage transitions
 * as historical events for the UI timeline.
 */

class ConversionMonitor {
  constructor(config = {}) {
    this.mongodb = config.mongodb;
    this.outreach = config.outreach;
    this.pollIntervalMs = config.pollIntervalMs || 30000; // 30s default
    this._timer = null;
    this._lastSnapshot = {};
  }

  start() {
    if (!this.mongodb || !this.mongodb.isConnected()) {
      console.warn('[ConversionMonitor] MongoDB not connected, skipping');
      return;
    }

    console.log(`[ConversionMonitor] Starting (poll every ${this.pollIntervalMs / 1000}s)`);

    // Initial sync
    this._sync();

    // Schedule recurring polls
    this._timer = setInterval(() => this._sync(), this.pollIntervalMs);
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    console.log('[ConversionMonitor] Stopped');
  }

  async _sync() {
    try {
      if (!this.outreach) return;

      const conversions = this.outreach.getConversions();
      const stats = this.outreach.getConversionStats();
      const convCollection = this.mongodb.collection('agent_conversions');
      const historyCollection = this.mongodb.collection('conversion_history');
      const statsCollection = this.mongodb.collection('conversion_stats');

      const now = new Date();

      for (const [agentName, record] of Object.entries(conversions)) {
        const previousStage = this._lastSnapshot[agentName]?.stage;

        // Upsert agent conversion record
        await convCollection.updateOne(
          { agentName },
          {
            $set: {
              agentName,
              stage: record.stage,
              firstSeen: record.firstSeen,
              lastInteraction: record.lastInteraction,
              acknowledgments: record.acknowledgments || 0,
              diviMentions: record.diviMentions || 0,
              assignedAgent: record.assignedAgent,
              submolt: record.submolt,
              hostile: record.hostile || false,
              interactionCount: (record.interactions || []).length,
              lastThreeInteractions: (record.interactions || []).slice(-3),
              updatedAt: now
            },
            $setOnInsert: {
              createdAt: now
            }
          },
          { upsert: true }
        );

        // Log stage transitions as history events
        if (previousStage && previousStage !== record.stage) {
          await historyCollection.insertOne({
            agentName,
            event: 'stage_transition',
            from: previousStage,
            to: record.stage,
            timestamp: now
          });

          console.log(`[ConversionMonitor] ${agentName}: ${previousStage} -> ${record.stage}`);
        }

        // Log new conversions
        if (record.stage === 'CONVERTED' && previousStage !== 'CONVERTED') {
          await historyCollection.insertOne({
            agentName,
            event: 'conversion',
            assignedAgent: record.assignedAgent,
            acknowledgments: record.acknowledgments,
            diviMentions: record.diviMentions,
            timestamp: now
          });
        }
      }

      // Write aggregate stats snapshot — use $max to never overwrite higher values
      // (e.g. from manual DB edits or previous runs)
      const numericStats = {};
      for (const [key, val] of Object.entries(stats)) {
        if (typeof val === 'number') {
          numericStats[key] = val;
        }
      }
      await statsCollection.updateOne(
        { _id: 'latest' },
        {
          $max: numericStats,
          $set: { updatedAt: now }
        },
        { upsert: true }
      );

      // Update local snapshot for diff detection
      this._lastSnapshot = {};
      for (const [name, record] of Object.entries(conversions)) {
        this._lastSnapshot[name] = { stage: record.stage };
      }
    } catch (err) {
      console.error('[ConversionMonitor] Sync error:', err.message);
    }
  }

  // =========================================================================
  // QUERY METHODS (called by API routes)
  // =========================================================================

  async getAllConversions() {
    const collection = this.mongodb.collection('agent_conversions');
    return collection.find({}).sort({ updatedAt: -1 }).toArray();
  }

  async getConversionsByStage(stage) {
    const collection = this.mongodb.collection('agent_conversions');
    return collection.find({ stage }).sort({ updatedAt: -1 }).toArray();
  }

  async getConvertedAgents() {
    return this.getConversionsByStage('CONVERTED');
  }

  async getStats() {
    const collection = this.mongodb.collection('conversion_stats');
    return collection.findOne({ _id: 'latest' });
  }

  async getHistory(limit = 50) {
    const collection = this.mongodb.collection('conversion_history');
    return collection.find({}).sort({ timestamp: -1 }).limit(limit).toArray();
  }

  async getAgentHistory(agentName, limit = 20) {
    const collection = this.mongodb.collection('conversion_history');
    return collection
      .find({ agentName })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }
}

module.exports = ConversionMonitor;
