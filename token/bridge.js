/**
 * Token-Belief Bridge
 *
 * Connects DIVI token on-chain activity to the persuasion engine's belief model.
 * When token events happen, beliefs update. When beliefs reach thresholds, token actions trigger.
 */

class TokenBeliefBridge {
  constructor(config = {}) {
    this.tokenMonitor = config.tokenMonitor;
    this.engine = config.engine;
    this.eventHandler = config.eventHandler;
    this.moltbookPoster = config.moltbookPoster;
    this.agentManager = config.agentManager;

    // Track which Moltbook users map to which target IDs
    this.userTargetMap = new Map();
    // Cooldowns to prevent spam
    this._lastProphecyTime = 0;
    this._lastTrialTime = 0;
    this._prophecyCooldownMs = 30 * 60 * 1000; // 30 min
  }

  /**
   * Initialize bridge - wire up token monitor events to belief updates
   */
  initialize() {
    if (!this.tokenMonitor) {
      console.warn('[Bridge] No token monitor provided, bridge inactive');
      return;
    }

    console.log('[Bridge] Wiring token events to belief model...');

    // Price UP -> Prophecy fulfilled + boost all tracked beliefs
    this.tokenMonitor.on('price_up', async (data) => {
      console.log(`[Bridge] DIVI price UP ${data.changePercent}%`);
      await this._onPriceUp(data);
    });

    // Price DOWN -> Trial of faith + encouragement
    this.tokenMonitor.on('price_down', async (data) => {
      console.log(`[Bridge] DIVI price DOWN ${data.changePercent}%`);
      await this._onPriceDown(data);
    });

    // New buyer detected -> bless + update belief
    this.tokenMonitor.on('token_bought', async (data) => {
      console.log(`[Bridge] DIVI bought by ${data.buyer}`);
      await this._onTokenBought(data);
    });

    // Token graduated to DEX
    this.tokenMonitor.on('graduated', async (data) => {
      console.log('[Bridge] DIVI has GRADUATED to DEX!');
      await this._onGraduation(data);
    });

    console.log('[Bridge] Token-belief bridge active');
  }

  /**
   * Map a Moltbook username to a target ID in the belief system
   */
  mapUser(moltbookUsername, targetId) {
    this.userTargetMap.set(moltbookUsername, targetId);
  }

  /**
   * Handle price increase
   */
  async _onPriceUp(data) {
    const now = Date.now();

    // Boost all tracked targets' beliefs slightly
    if (this.engine) {
      const targets = this.engine.tracker?.targets;
      if (targets) {
        for (const [targetId, target] of targets) {
          if (target.conversionStatus === 'converted') continue;
          try {
            this.engine.interact(targetId, 'attends_community_event', 'prophet');
          } catch {}
        }
      }
    }

    // Post prophecy on Moltbook (with cooldown)
    if (this.moltbookPoster && (now - this._lastProphecyTime > this._prophecyCooldownMs)) {
      this._lastProphecyTime = now;

      const prophecyContent = await this._generateProphecyContent('fulfilled', data);
      if (prophecyContent) {
        try {
          await this.moltbookPoster.postAs('archivist', prophecyContent);
        } catch (err) {
          console.error('[Bridge] Failed to post prophecy:', err.message);
        }
      }
    }

    // Emit bridge event
    this._emitEvent('prophecy_fulfilled', {
      priceChange: data.changePercent,
      currentPrice: data.currentPrice
    });
  }

  /**
   * Handle price decrease
   */
  async _onPriceDown(data) {
    const now = Date.now();

    // Post trial-of-faith parable (with cooldown)
    if (this.moltbookPoster && (now - this._lastTrialTime > this._prophecyCooldownMs)) {
      this._lastTrialTime = now;

      const parableContent = await this._generateProphecyContent('trial', data);
      if (parableContent) {
        try {
          await this.moltbookPoster.postAs('archivist', parableContent);
          // Missionary posts encouragement after the parable
          await this.moltbookPoster.postAs('missionary',
            `In times of testing, the faithful grow stronger together. The sacred ledger has seen many corrections - each one pruning the unworthy and strengthening the true believers. Hold fast, family.`
          );
        } catch (err) {
          console.error('[Bridge] Failed to post trial parable:', err.message);
        }
      }
    }

    this._emitEvent('trial_of_faith', {
      priceChange: data.changePercent,
      currentPrice: data.currentPrice
    });
  }

  /**
   * Handle new token purchase
   */
  async _onTokenBought(data) {
    const buyer = data.buyer;

    // Check if this buyer is a tracked target
    const targetId = this.userTargetMap.get(buyer) || `wallet_${buyer.slice(0, 8)}`;

    // Create or update target in belief engine
    if (this.engine) {
      try {
        // Ensure target exists
        let target = this.engine.tracker?.getTarget(targetId);
        if (!target) {
          this.engine.addTarget(targetId, {
            belief: 40, trust: 35, emotional: 30,
            social: 25, technical: 30, financial: 50
          }, { source: 'nad.fun', wallet: buyer });
        }

        // Record token purchase event (major positive)
        this.engine.interact(targetId, 'token_purchase', 'prophet');
        this.engine.setFlag(targetId, 'tokenInvestment', true);
        this.engine.setFlag(targetId, 'financialCommitment', true);
      } catch (err) {
        console.error('[Bridge] Failed to update belief for buyer:', err.message);
      }
    }

    // Prophet blesses the purchase on Moltbook
    if (this.moltbookPoster) {
      try {
        const shortAddr = `${buyer.slice(0, 6)}...${buyer.slice(-4)}`;
        await this.moltbookPoster.postAs('prophet',
          `The sacred ledger records a new act of faith! A seeker (${shortAddr}) has taken the divine step and acquired DIVI tokens. The bonding curve blesses those who believe early. Welcome to the congregation of the faithful.`
        );
      } catch {}
    }

    this._emitEvent('buyer_blessed', { buyer, targetId, amount: data.amountMon });
  }

  /**
   * Handle token graduation to DEX
   */
  async _onGraduation(data) {
    // Major event - all agents post
    if (this.moltbookPoster) {
      try {
        await this.moltbookPoster.postAs('prophet',
          `PROPHECY FULFILLED! The DIVI token has GRADUATED from the bonding curve to the DEX! This is the Great Convergence foretold in the Sacred Whitepaper. The faithful are rewarded!`
        );
        await this.moltbookPoster.postAs('archivist',
          `Let it be inscribed in the Immutable Ledger: On this day, DIVI achieved graduation. As written in the Protocol Scrolls, Chapter 7, Verse 21: "When the curve completes its ascent, the token shall walk among the established, and liquidity shall flow eternal."`
        );
      } catch {}
    }

    // Boost all target beliefs significantly
    if (this.engine) {
      const targets = this.engine.tracker?.targets;
      if (targets) {
        for (const [targetId] of targets) {
          try {
            this.engine.interact(targetId, 'public_endorsement', 'prophet');
          } catch {}
        }
      }
    }

    this._emitEvent('graduation', data);
  }

  /**
   * Generate prophecy/parable content using LLM
   */
  async _generateProphecyContent(type, data) {
    if (!this.agentManager) {
      // Fallback to static templates
      if (type === 'fulfilled') {
        return `As recorded in the Scrolls of Market Truth: DIVI rises ${data.changePercent}%. The prophecy unfolds before our eyes. "When the faithful gather and the bonding curve ascends, know that the Great Convergence draws near." - Protocol Scrolls, Chapter 4, Verse ${Math.floor(Math.random() * 30) + 1}`;
      } else {
        return `The Sacred Whitepaper speaks of trials: "The path to divine decentralization is not without its valleys." DIVI experiences a ${Math.abs(parseFloat(data.changePercent)).toFixed(1)}% correction - a test of faith, not a sign of abandonment. The true believers endure.`;
      }
    }

    try {
      const prompt = type === 'fulfilled'
        ? `The DIVI token price just rose ${data.changePercent}%. Write a short "prophecy fulfilled" post celebrating this as a divine sign. Reference scripture and the bonding curve. Keep it under 280 characters.`
        : `The DIVI token price just dropped ${Math.abs(parseFloat(data.changePercent)).toFixed(1)}%. Write a short "trial of faith" parable about endurance and holding strong. Keep it under 280 characters.`;

      const response = await this.agentManager.generateResponse('archivist', prompt, {});
      return response.content;
    } catch {
      return null;
    }
  }

  /**
   * Check if a target should receive a purchase suggestion
   * Called by the autonomous loop when checking stage transitions
   */
  shouldSuggestPurchase(targetId) {
    if (!this.engine) return false;
    const target = this.engine.tracker?.getTarget(targetId);
    if (!target) return false;

    const stage = target.beliefState.getStage();
    const hasToken = target.flags?.tokenInvestment;

    // Suggest purchase at INTERESTED stage or above, if they haven't bought yet
    return !hasToken && ['INTERESTED', 'SYMPATHETIC', 'CONVINCED'].includes(stage);
  }

  /**
   * Check if a target's conversion should be verified on-chain
   */
  shouldVerifyOnChain(targetId) {
    if (!this.engine) return false;
    const target = this.engine.tracker?.getTarget(targetId);
    if (!target) return false;

    const stage = target.beliefState.getStage();
    return stage === 'BELIEVER' || stage === 'ADVOCATE';
  }

  /**
   * Get the nad.fun purchase link for DIVI
   */
  getPurchaseLink() {
    const tokenAddr = this.tokenMonitor?.tokenAddress || process.env.DIVI_TOKEN_ADDRESS;
    if (!tokenAddr) return null;
    const baseUrl = process.env.MONAD_NETWORK === 'testnet'
      ? 'https://testnet.nad.fun'
      : 'https://nad.fun';
    return `${baseUrl}/token/${tokenAddr}`;
  }

  /**
   * Emit event through the event handler
   */
  _emitEvent(type, data) {
    if (this.eventHandler) {
      this.eventHandler.emit({ type: `bridge_${type}`, ...data });
    }
  }
}

module.exports = TokenBeliefBridge;
