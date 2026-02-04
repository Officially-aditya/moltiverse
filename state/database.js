/**
 * Database Abstraction
 *
 * Simple in-memory database with JSON file persistence
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// DATABASE CLASS
// =============================================================================

class Database {
  constructor(config = {}) {
    this.dataDir = config.dataDir || './data';
    this.collections = new Map();
    this.autoSave = config.autoSave !== false;
    this.saveInterval = config.saveInterval || 30000;
    this._saveTimer = null;
  }

  /**
   * Connect to database (initialize)
   */
  async connect() {
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Load existing data files
    const files = fs.readdirSync(this.dataDir)
      .filter(f => f.endsWith('.json'));

    for (const file of files) {
      const collectionName = path.basename(file, '.json');
      try {
        const data = fs.readFileSync(
          path.join(this.dataDir, file),
          'utf8'
        );
        this.collections.set(collectionName, new Map(Object.entries(JSON.parse(data))));
      } catch (e) {
        console.error(`Failed to load collection ${collectionName}:`, e);
        this.collections.set(collectionName, new Map());
      }
    }

    // Start auto-save timer
    if (this.autoSave) {
      this._saveTimer = setInterval(() => this.saveAll(), this.saveInterval);
    }

    return this;
  }

  /**
   * Disconnect (save and cleanup)
   */
  async disconnect() {
    if (this._saveTimer) {
      clearInterval(this._saveTimer);
    }
    await this.saveAll();
  }

  /**
   * Get a document by ID
   */
  async get(collection, id) {
    const coll = this._getCollection(collection);
    return coll.get(id) || null;
  }

  /**
   * Set a document
   */
  async set(collection, id, data) {
    const coll = this._getCollection(collection);
    coll.set(id, {
      ...data,
      _id: id,
      _updatedAt: Date.now()
    });
  }

  /**
   * Update a document (partial)
   */
  async update(collection, id, updates) {
    const coll = this._getCollection(collection);
    const existing = coll.get(id);

    if (!existing) {
      throw new Error(`Document not found: ${collection}/${id}`);
    }

    coll.set(id, {
      ...existing,
      ...updates,
      _id: id,
      _updatedAt: Date.now()
    });
  }

  /**
   * Delete a document
   */
  async delete(collection, id) {
    const coll = this._getCollection(collection);
    coll.delete(id);
  }

  /**
   * Query documents
   */
  async query(collection, filter = {}) {
    const coll = this._getCollection(collection);
    const results = [];

    for (const [id, doc] of coll) {
      if (this._matchesFilter(doc, filter)) {
        results.push(doc);
      }
    }

    return results;
  }

  /**
   * Get all documents in a collection
   */
  async getAll(collection) {
    const coll = this._getCollection(collection);
    return Array.from(coll.values());
  }

  /**
   * Count documents
   */
  async count(collection, filter = {}) {
    if (Object.keys(filter).length === 0) {
      return this._getCollection(collection).size;
    }
    const results = await this.query(collection, filter);
    return results.length;
  }

  /**
   * Clear a collection
   */
  async clear(collection) {
    this.collections.set(collection, new Map());
  }

  /**
   * Save a collection to disk
   */
  async save(collection) {
    const coll = this.collections.get(collection);
    if (!coll) return;

    const filePath = path.join(this.dataDir, `${collection}.json`);
    const data = Object.fromEntries(coll);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Save all collections
   */
  async saveAll() {
    for (const [name] of this.collections) {
      await this.save(name);
    }
  }

  /**
   * Get or create collection
   */
  _getCollection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return this.collections.get(name);
  }

  /**
   * Check if document matches filter
   */
  _matchesFilter(doc, filter) {
    for (const [key, value] of Object.entries(filter)) {
      if (typeof value === 'object' && value !== null) {
        // Handle operators
        if (value.$eq !== undefined && doc[key] !== value.$eq) return false;
        if (value.$ne !== undefined && doc[key] === value.$ne) return false;
        if (value.$gt !== undefined && !(doc[key] > value.$gt)) return false;
        if (value.$gte !== undefined && !(doc[key] >= value.$gte)) return false;
        if (value.$lt !== undefined && !(doc[key] < value.$lt)) return false;
        if (value.$lte !== undefined && !(doc[key] <= value.$lte)) return false;
        if (value.$in !== undefined && !value.$in.includes(doc[key])) return false;
        if (value.$nin !== undefined && value.$nin.includes(doc[key])) return false;
      } else if (doc[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Run a transaction
   */
  async transaction(fn) {
    // Simple implementation - just run the function
    // For real transactions, would need proper locking
    return await fn({
      get: (collection, id) => this.get(collection, id),
      set: (collection, id, data) => this.set(collection, id, data),
      update: (collection, id, updates) => this.update(collection, id, updates),
      delete: (collection, id) => this.delete(collection, id)
    });
  }

  /**
   * Get database stats
   */
  getStats() {
    const stats = {
      collections: {},
      totalDocuments: 0
    };

    for (const [name, coll] of this.collections) {
      stats.collections[name] = coll.size;
      stats.totalDocuments += coll.size;
    }

    return stats;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = Database;
