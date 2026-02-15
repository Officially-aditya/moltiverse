/**
 * MongoDB Connection Manager
 *
 * Handles connection lifecycle and provides access to collections
 * for persisting agent conversion data.
 */

const { MongoClient } = require('mongodb');

class MongoDB {
  constructor(config = {}) {
    this.uri = config.uri || process.env.MONGODB_URI || 'mongodb://localhost:27017';
    this.dbName = config.dbName || process.env.MONGODB_DB || 'moltiverse';
    this.client = null;
    this.db = null;
  }

  async connect() {
    try {
      this.client = new MongoClient(this.uri);
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      console.log(`[MongoDB] Connected to ${this.dbName}`);

      // Create indexes for efficient queries
      await this._ensureIndexes();

      return this;
    } catch (err) {
      console.error('[MongoDB] Connection failed:', err.message);
      throw err;
    }
  }

  async _ensureIndexes() {
    const conversions = this.db.collection('agent_conversions');
    await conversions.createIndex({ agentName: 1 }, { unique: true });
    await conversions.createIndex({ stage: 1 });
    await conversions.createIndex({ updatedAt: -1 });

    const conversionHistory = this.db.collection('conversion_history');
    await conversionHistory.createIndex({ agentName: 1, timestamp: -1 });
    await conversionHistory.createIndex({ event: 1 });
  }

  collection(name) {
    if (!this.db) throw new Error('[MongoDB] Not connected');
    return this.db.collection(name);
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('[MongoDB] Disconnected');
    }
  }

  isConnected() {
    return this.client !== null && this.db !== null;
  }
}

module.exports = MongoDB;
