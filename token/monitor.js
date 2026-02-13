/**
 * Token Price Monitor
 *
 * Polls DIVI token price on nad.fun and emits events on significant changes.
 */

const { CONFIG, DIVI_TOKEN, ABIS } = require('./config');

class TokenMonitor {
  constructor(config = {}) {
    this.tokenAddress = config.tokenAddress || DIVI_TOKEN.address;
    this.pollIntervalMs = config.pollIntervalMs || 60000; // 60s
    this.priceChangeThreshold = config.priceChangeThreshold || 0.05; // 5%
    this.apiKey = config.apiKey || process.env.NAD_API_KEY;

    this.lastPrice = null;
    this.lastReserves = null;
    this.priceHistory = [];
    this.listeners = new Map();
    this._pollTimer = null;
    this._recentBuyers = new Set();
  }

  /**
   * Start monitoring
   */
  start() {
    if (!this.tokenAddress) {
      console.warn('[TokenMonitor] No DIVI_TOKEN_ADDRESS set, skipping monitor start');
      return;
    }

    console.log(`[TokenMonitor] Monitoring DIVI at ${this.tokenAddress}`);
    console.log(`[TokenMonitor] Poll interval: ${this.pollIntervalMs / 1000}s`);

    // Initial poll
    this._poll();

    // Recurring poll
    this._pollTimer = setInterval(() => this._poll(), this.pollIntervalMs);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  /**
   * Poll token state from nad.fun API
   */
  async _poll() {
    try {
      const headers = {};
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }

      // Fetch token info from nad.fun indexer API
      const res = await fetch(
        `${CONFIG.apiUrl}/token/${this.tokenAddress}`,
        { headers }
      );

      if (!res.ok) {
        console.warn(`[TokenMonitor] API returned ${res.status}`);
        return;
      }

      const data = await res.json();
      const currentPrice = parseFloat(data.price_mon || data.price || 0);
      const reserveMon = parseFloat(data.reserve_mon || 0);
      const isGraduated = data.is_graduated || false;
      const holders = data.holder_count || 0;
      const volume24h = parseFloat(data.volume_24h || 0);

      // Detect price changes
      if (this.lastPrice !== null && this.lastPrice > 0) {
        const priceChange = (currentPrice - this.lastPrice) / this.lastPrice;

        if (priceChange >= this.priceChangeThreshold) {
          this._emit('price_up', {
            previousPrice: this.lastPrice,
            currentPrice,
            changePercent: (priceChange * 100).toFixed(2),
            reserveMon,
            holders
          });
        } else if (priceChange <= -this.priceChangeThreshold) {
          this._emit('price_down', {
            previousPrice: this.lastPrice,
            currentPrice,
            changePercent: (priceChange * 100).toFixed(2),
            reserveMon,
            holders
          });
        }
      }

      // Check for graduation
      if (isGraduated && !this._wasGraduated) {
        this._emit('graduated', { tokenAddress: this.tokenAddress, reserveMon });
      }
      this._wasGraduated = isGraduated;

      // Record price history
      this.priceHistory.push({
        timestamp: Date.now(),
        price: currentPrice,
        reserveMon,
        holders
      });

      // Keep last 1440 points (24h at 1/min)
      if (this.priceHistory.length > 1440) {
        this.priceHistory = this.priceHistory.slice(-1440);
      }

      this.lastPrice = currentPrice;
      this.lastReserves = { reserveMon, holders, volume24h, isGraduated };

      // Poll recent trades for buy detection
      await this._pollTrades(headers);

    } catch (err) {
      console.error('[TokenMonitor] Poll error:', err.message);
    }
  }

  /**
   * Poll recent trades to detect new buyers
   */
  async _pollTrades(headers) {
    try {
      const res = await fetch(
        `${CONFIG.apiUrl}/token/${this.tokenAddress}/trades?limit=10`,
        { headers }
      );

      if (!res.ok) return;

      const trades = await res.json();
      const recentTrades = Array.isArray(trades) ? trades : (trades.trades || []);

      for (const trade of recentTrades) {
        if (trade.type === 'buy' || trade.side === 'buy') {
          const buyerId = trade.buyer || trade.from || trade.address;
          const tradeKey = `${buyerId}_${trade.timestamp || trade.block}`;

          if (!this._recentBuyers.has(tradeKey)) {
            this._recentBuyers.add(tradeKey);
            this._emit('token_bought', {
              buyer: buyerId,
              amountMon: trade.amount_mon || trade.value,
              amountTokens: trade.amount_tokens || trade.amount,
              txHash: trade.tx_hash || trade.hash
            });

            // Keep set bounded
            if (this._recentBuyers.size > 500) {
              const first = this._recentBuyers.values().next().value;
              this._recentBuyers.delete(first);
            }
          }
        }
      }
    } catch {
      // Trade polling is best-effort
    }
  }

  /**
   * Get current token state
   */
  getState() {
    return {
      tokenAddress: this.tokenAddress,
      lastPrice: this.lastPrice,
      ...this.lastReserves,
      priceHistoryLength: this.priceHistory.length,
      monitoring: this._pollTimer !== null
    };
  }

  /**
   * Get price trend (simple moving average comparison)
   */
  getTrend() {
    if (this.priceHistory.length < 10) return 'unknown';

    const recent = this.priceHistory.slice(-5);
    const older = this.priceHistory.slice(-10, -5);

    const recentAvg = recent.reduce((s, p) => s + p.price, 0) / recent.length;
    const olderAvg = older.reduce((s, p) => s + p.price, 0) / older.length;

    if (olderAvg === 0) return 'unknown';
    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.03) return 'rising';
    if (change < -0.03) return 'falling';
    return 'stable';
  }

  /**
   * Register event listener
   */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  /**
   * Emit event to listeners
   */
  _emit(event, data) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (err) {
          console.error(`[TokenMonitor] Event handler error (${event}):`, err.message);
        }
      }
    }

    // Also emit to wildcard listeners
    const wildcardHandlers = this.listeners.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          handler(event, data);
        } catch {}
      }
    }
  }
}

module.exports = TokenMonitor;
