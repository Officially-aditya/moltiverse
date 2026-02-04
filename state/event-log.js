/**
 * Event Log
 *
 * Persistent audit trail for all system events
 */

// =============================================================================
// EVENT LOG CLASS
// =============================================================================

class EventLog {
  constructor(database) {
    this.db = database;
    this.collection = 'events';
    this.buffer = [];
    this.bufferSize = 100;
    this.flushInterval = 10000;
    this._flushTimer = null;
  }

  /**
   * Start the event log (begin buffering)
   */
  start() {
    this._flushTimer = setInterval(() => this.flush(), this.flushInterval);
  }

  /**
   * Stop the event log
   */
  async stop() {
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
    }
    await this.flush();
  }

  /**
   * Log an event
   */
  async log(event) {
    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...event
    };

    this.buffer.push(entry);

    // Flush if buffer is full
    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }

    return entry;
  }

  /**
   * Flush buffer to database
   */
  async flush() {
    if (this.buffer.length === 0) return;

    const toFlush = [...this.buffer];
    this.buffer = [];

    for (const entry of toFlush) {
      await this.db.set(this.collection, entry.id, entry);
    }
  }

  /**
   * Query events
   */
  async query(options = {}) {
    // Flush buffer first to ensure all events are queryable
    await this.flush();

    let events = await this.db.getAll(this.collection);

    // Filter by type
    if (options.type) {
      events = events.filter(e => e.type === options.type);
    }

    // Filter by target
    if (options.targetId) {
      events = events.filter(e => e.targetId === options.targetId);
    }

    // Filter by time range
    if (options.since) {
      events = events.filter(e => e.timestamp >= options.since);
    }

    if (options.until) {
      events = events.filter(e => e.timestamp <= options.until);
    }

    // Sort by timestamp descending (newest first)
    events.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (options.limit) {
      events = events.slice(0, options.limit);
    }

    // Apply offset
    if (options.offset) {
      events = events.slice(options.offset);
    }

    return events;
  }

  /**
   * Get events for a specific target
   */
  async getTargetEvents(targetId, limit = 100) {
    return this.query({ targetId, limit });
  }

  /**
   * Get recent events
   */
  async getRecent(limit = 50) {
    return this.query({ limit });
  }

  /**
   * Get events by type
   */
  async getByType(type, limit = 100) {
    return this.query({ type, limit });
  }

  /**
   * Get event statistics
   */
  async getStats(options = {}) {
    const events = await this.query(options);

    const stats = {
      total: events.length,
      byType: {},
      byTarget: {},
      timeRange: {
        earliest: null,
        latest: null
      }
    };

    for (const event of events) {
      // Count by type
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;

      // Count by target
      if (event.targetId) {
        stats.byTarget[event.targetId] = (stats.byTarget[event.targetId] || 0) + 1;
      }

      // Track time range
      if (!stats.timeRange.earliest || event.timestamp < stats.timeRange.earliest) {
        stats.timeRange.earliest = event.timestamp;
      }
      if (!stats.timeRange.latest || event.timestamp > stats.timeRange.latest) {
        stats.timeRange.latest = event.timestamp;
      }
    }

    return stats;
  }

  /**
   * Get activity timeline
   */
  async getTimeline(options = {}) {
    const {
      targetId,
      since = Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
      bucketMs = 60 * 60 * 1000 // 1 hour buckets
    } = options;

    const events = await this.query({ targetId, since });

    // Group into time buckets
    const buckets = new Map();

    for (const event of events) {
      const bucketKey = Math.floor(event.timestamp / bucketMs) * bucketMs;

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, { timestamp: bucketKey, count: 0, types: {} });
      }

      const bucket = buckets.get(bucketKey);
      bucket.count++;
      bucket.types[event.type] = (bucket.types[event.type] || 0) + 1;
    }

    // Convert to sorted array
    return Array.from(buckets.values())
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Prune old events
   */
  async prune(maxAgeMs) {
    const cutoff = Date.now() - maxAgeMs;
    const events = await this.db.getAll(this.collection);

    let pruned = 0;
    for (const event of events) {
      if (event.timestamp < cutoff) {
        await this.db.delete(this.collection, event.id);
        pruned++;
      }
    }

    return pruned;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = EventLog;
