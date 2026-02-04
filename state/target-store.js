/**
 * Target Store
 *
 * Specialized storage for target data
 */

const { BeliefState } = require('../engine');

// =============================================================================
// TARGET STORE CLASS
// =============================================================================

class TargetStore {
  constructor(database) {
    this.db = database;
    this.collection = 'targets';
  }

  /**
   * Create a new target
   */
  async create(target) {
    const doc = this._serializeTarget(target);
    await this.db.set(this.collection, target.id, doc);
    return target;
  }

  /**
   * Read a target by ID
   */
  async read(id) {
    const doc = await this.db.get(this.collection, id);
    if (!doc) return null;
    return this._deserializeTarget(doc);
  }

  /**
   * Update a target
   */
  async update(id, updates) {
    const existing = await this.read(id);
    if (!existing) {
      throw new Error(`Target not found: ${id}`);
    }

    // Merge updates
    const updated = { ...existing, ...updates };

    // Handle belief state updates
    if (updates.beliefState && !(updates.beliefState instanceof BeliefState)) {
      updated.beliefState = new BeliefState(updates.beliefState);
    }

    await this.db.set(this.collection, id, this._serializeTarget(updated));
    return updated;
  }

  /**
   * Delete a target
   */
  async delete(id) {
    await this.db.delete(this.collection, id);
  }

  /**
   * Find targets by conversion stage
   */
  async findByStage(stage) {
    const all = await this.db.getAll(this.collection);
    return all
      .map(doc => this._deserializeTarget(doc))
      .filter(t => t.beliefState.getStage() === stage);
  }

  /**
   * Find targets by archetype
   */
  async findByArchetype(archetype) {
    const all = await this.db.query(this.collection, {
      'metadata.archetype': archetype
    });
    return all.map(doc => this._deserializeTarget(doc));
  }

  /**
   * Find hot prospects (high conversion probability)
   */
  async findHotProspects(limit = 10) {
    const all = await this.db.getAll(this.collection);

    return all
      .map(doc => this._deserializeTarget(doc))
      .filter(t => t.conversionStatus !== 'converted')
      .map(t => ({
        target: t,
        composite: t.beliefState.getCompositeScore(),
        stage: t.beliefState.getStage()
      }))
      .sort((a, b) => b.composite - a.composite)
      .slice(0, limit);
  }

  /**
   * Search targets
   */
  async search(query) {
    const filters = {};

    if (query.stage) {
      // Can't filter by computed stage in DB, filter after
    }

    if (query.conversionStatus) {
      filters.conversionStatus = query.conversionStatus;
    }

    if (query.minComposite !== undefined) {
      // Can't filter by computed score in DB, filter after
    }

    let results = await this.db.query(this.collection, filters);
    results = results.map(doc => this._deserializeTarget(doc));

    // Apply computed filters
    if (query.stage) {
      results = results.filter(t => t.beliefState.getStage() === query.stage);
    }

    if (query.minComposite !== undefined) {
      results = results.filter(t => t.beliefState.getCompositeScore() >= query.minComposite);
    }

    if (query.maxComposite !== undefined) {
      results = results.filter(t => t.beliefState.getCompositeScore() <= query.maxComposite);
    }

    return results;
  }

  /**
   * Import batch of targets
   */
  async importBatch(targets) {
    for (const target of targets) {
      await this.create(target);
    }
  }

  /**
   * Export all targets
   */
  async exportAll() {
    const all = await this.db.getAll(this.collection);
    return all.map(doc => this._deserializeTarget(doc));
  }

  /**
   * Get statistics
   */
  async getStats() {
    const all = await this.db.getAll(this.collection);
    const targets = all.map(doc => this._deserializeTarget(doc));

    const stats = {
      total: targets.length,
      byStatus: {
        none: 0,
        partial: 0,
        converted: 0
      },
      byStage: {},
      averageComposite: 0
    };

    let totalComposite = 0;

    for (const target of targets) {
      stats.byStatus[target.conversionStatus || 'none']++;

      const stage = target.beliefState.getStage();
      stats.byStage[stage] = (stats.byStage[stage] || 0) + 1;

      totalComposite += target.beliefState.getCompositeScore();
    }

    stats.averageComposite = targets.length > 0
      ? totalComposite / targets.length
      : 0;

    return stats;
  }

  /**
   * Serialize target for storage
   */
  _serializeTarget(target) {
    return {
      id: target.id,
      beliefState: target.beliefState.toObject(),
      interactionHistory: target.beliefState.interactionHistory || [],
      referralMade: target.beliefState.referralMade || false,
      createdAt: target.createdAt,
      metadata: target.metadata || {},
      flags: target.flags || {},
      conversionStatus: target.conversionStatus || 'none',
      convertedAt: target.convertedAt,
      conversionCriteria: target.conversionCriteria,
      history: target.history || []
    };
  }

  /**
   * Deserialize target from storage
   */
  _deserializeTarget(doc) {
    const beliefState = new BeliefState(doc.beliefState);
    beliefState.interactionHistory = doc.interactionHistory || [];
    beliefState.referralMade = doc.referralMade || false;

    return {
      id: doc.id,
      beliefState,
      createdAt: doc.createdAt,
      metadata: doc.metadata || {},
      flags: doc.flags || {},
      conversionStatus: doc.conversionStatus || 'none',
      convertedAt: doc.convertedAt,
      conversionCriteria: doc.conversionCriteria,
      history: doc.history || []
    };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = TargetStore;
