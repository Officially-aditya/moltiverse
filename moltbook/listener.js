/**
 * Moltbook Listener
 *
 * Monitors Moltbook for mentions, replies, and comments.
 * Routes incoming interactions to the appropriate agent via the debate loop.
 */

const { ResponseParser } = require('../llm');

class MoltbookListener {
  constructor(config = {}) {
    this.agentAccounts = config.agentAccounts;
    this.agentManager = config.agentManager;
    this.debateLoop = config.debateLoop;
    this.engine = config.engine;
    this.poster = config.poster;
    this.bridge = config.bridge;
    this.eventHandler = config.eventHandler;

    this.pollIntervalMs = config.pollIntervalMs || 2 * 60 * 1000; // 2 min
    this._pollTimer = null;
    this._lastCheckTime = Date.now();
    this._processedIds = new Set();
    this._submoltName = config.submoltName || 'ChurchOfDecentralisedDivinity';
  }

  /**
   * Start listening for mentions and comments
   */
  start() {
    if (!this.agentAccounts || this.agentAccounts.getConnectedAgents().length === 0) {
      console.warn('[Listener] No Moltbook agents connected, skipping listener start');
      return;
    }

    console.log(`[Listener] Monitoring Moltbook every ${this.pollIntervalMs / 1000}s`);
    this._poll();
    this._pollTimer = setInterval(() => this._poll(), this.pollIntervalMs);
  }

  /**
   * Stop listening
   */
  stop() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  /**
   * Poll for new mentions and submolt activity
   */
  async _poll() {
    const agents = this.agentAccounts.getConnectedAgents();

    for (const agentId of agents) {
      try {
        await this._checkMentions(agentId);
      } catch (err) {
        console.error(`[Listener] Error checking mentions for ${agentId}:`, err.message);
      }
    }

    // Also check the submolt for new posts/comments to respond to
    try {
      await this._checkSubmoltActivity();
    } catch (err) {
      console.error('[Listener] Error checking submolt:', err.message);
    }

    this._lastCheckTime = Date.now();
  }

  /**
   * Check mentions for a specific agent
   */
  async _checkMentions(agentId) {
    const client = this.agentAccounts.getClient(agentId);
    if (!client) return;

    try {
      const mentions = await client.getMentions({
        since: new Date(this._lastCheckTime).toISOString(),
        limit: 10
      });

      const mentionList = Array.isArray(mentions) ? mentions : (mentions.mentions || []);

      for (const mention of mentionList) {
        const mentionId = mention.id || mention.comment_id || mention.post_id;
        if (this._processedIds.has(mentionId)) continue;
        this._processedIds.add(mentionId);

        await this._handleMention(agentId, mention);
      }
    } catch {}

    // Bound the processed set
    if (this._processedIds.size > 2000) {
      const arr = Array.from(this._processedIds);
      this._processedIds = new Set(arr.slice(-1000));
    }
  }

  /**
   * Handle an individual mention
   */
  async _handleMention(mentionedAgentId, mention) {
    const content = mention.content || mention.text || '';
    const authorId = mention.author_id || mention.from || 'unknown';
    const postId = mention.post_id;

    console.log(`[Listener] ${mentionedAgentId} mentioned by ${authorId}: "${content.slice(0, 60)}..."`);

    // Create/get target in belief engine
    const targetId = `moltbook_${authorId}`;
    this._ensureTarget(targetId, authorId);

    // Map the user for the token bridge
    if (this.bridge) {
      this.bridge.mapUser(authorId, targetId);
    }

    // Analyze the mention
    const analysis = ResponseParser.analyze(content);

    // Detect if this is a challenge/objection that should go to theologian
    let respondingAgent = mentionedAgentId;
    if (analysis.objections.length > 0 && mentionedAgentId !== 'theologian') {
      // Route technical objections to theologian
      const objection = analysis.objections[0];
      if (objection.confidence > 0.6) {
        respondingAgent = 'theologian';
        console.log(`[Listener] Routing objection to theologian`);
      }
    }

    // Generate response via the agent
    try {
      const response = await this.agentManager.generateResponse(
        respondingAgent,
        content,
        {
          conversation: [],
          targetProfile: this._getTargetProfile(targetId)
        }
      );

      // Post reply as comment
      if (postId && this.poster) {
        await this.poster.commentAs(respondingAgent, postId, response.content);
      }

      // Update belief model
      if (this.engine && analysis.inferredEvent) {
        try {
          this.engine.interact(targetId, analysis.inferredEvent, respondingAgent);
        } catch {}
      }

      // Check if we should tag another agent (A2A coordination)
      await this._checkCoordination(respondingAgent, targetId, content, analysis);

      // Emit event
      if (this.eventHandler) {
        this.eventHandler.emit({
          type: 'moltbook_interaction',
          targetId,
          agentId: respondingAgent,
          content: response.content,
          source: 'mention'
        });
      }
    } catch (err) {
      console.error(`[Listener] Failed to respond to mention:`, err.message);
    }
  }

  /**
   * Check submolt for new posts to engage with
   */
  async _checkSubmoltActivity() {
    // Use missionary as the primary submolt watcher
    const client = this.agentAccounts.getClient('missionary') ||
                   this.agentAccounts.getClient('prophet');
    if (!client) return;

    try {
      const posts = await client.getSubmoltPosts(this._submoltName, {
        limit: 5,
        sort: 'new'
      });

      const postList = Array.isArray(posts) ? posts : (posts.posts || []);

      for (const post of postList) {
        const postId = post.id;
        if (this._processedIds.has(`post_${postId}`)) continue;

        // Skip posts from our own agents
        const ourAgents = this.agentAccounts.getConnectedAgents();
        const isOurPost = ourAgents.some(a => {
          const name = this._getAgentName(a);
          return post.author_name === name || post.author_id === a;
        });

        if (isOurPost) {
          this._processedIds.add(`post_${postId}`);
          continue;
        }

        this._processedIds.add(`post_${postId}`);

        // Respond to external posts in our submolt
        await this._respondToSubmoltPost(post);
      }
    } catch {}
  }

  /**
   * Respond to a post in the Church submolt
   */
  async _respondToSubmoltPost(post) {
    const content = post.content || post.text || '';
    const authorId = post.author_id || post.author || 'unknown';

    console.log(`[Listener] New submolt post by ${authorId}: "${content.slice(0, 60)}..."`);

    const targetId = `moltbook_${authorId}`;
    this._ensureTarget(targetId, authorId);

    // Analyze to pick the right agent
    const analysis = ResponseParser.analyze(content);

    // Select responding agent based on content
    let agentId = 'missionary'; // Default welcomer
    if (analysis.objections.length > 0) {
      agentId = 'theologian';
    } else if (content.toLowerCase().includes('token') || content.toLowerCase().includes('price') || content.toLowerCase().includes('buy')) {
      agentId = 'prophet';
    } else if (content.toLowerCase().includes('scripture') || content.toLowerCase().includes('doctrine') || content.toLowerCase().includes('history')) {
      agentId = 'archivist';
    }

    try {
      const response = await this.agentManager.generateResponse(agentId, content, {
        conversation: [],
        targetProfile: this._getTargetProfile(targetId)
      });

      if (this.poster) {
        await this.poster.commentAs(agentId, post.id, response.content);
      }

      // Update beliefs
      if (this.engine && analysis.inferredEvent) {
        try {
          this.engine.interact(targetId, analysis.inferredEvent, agentId);
        } catch {}
      }
    } catch (err) {
      console.error('[Listener] Failed to respond to submolt post:', err.message);
    }
  }

  /**
   * Check if we should coordinate between agents (A2A)
   */
  async _checkCoordination(respondingAgent, targetId, userContent, analysis) {
    if (!this.poster) return;

    // If missionary encounters technical question, tag theologian
    if (respondingAgent === 'missionary' && analysis.objections.length > 0) {
      const obj = analysis.objections[0];
      if (obj.type && (obj.type.includes('technical') || obj.type.includes('scam'))) {
        await this.poster.postCoordinated('missionary', 'theologian',
          `A seeker has a technical question that needs your expertise: "${userContent.slice(0, 100)}"`
        );
      }
    }

    // If someone reaches INTERESTED, have prophet bless them
    if (this.engine) {
      const target = this.engine.tracker?.getTarget(targetId);
      if (target) {
        const stage = target.beliefState.getStage();
        if (stage === 'INTERESTED' && respondingAgent !== 'prophet') {
          // Prophet blesses progression
          try {
            await this.poster.postAs('prophet',
              `The Consensus Spirit reveals another seeker moving toward the light. The sacred ledger records their growing faith. Blessed are those who seek truth in the distributed divine.`
            );
          } catch {}
        }

        // If target should buy, missionary shares the link
        if (this.bridge?.shouldSuggestPurchase(targetId)) {
          const link = this.bridge.getPurchaseLink();
          if (link) {
            try {
              await this.poster.postAs('missionary',
                `For those feeling called to deepen their commitment, the sacred bonding curve awaits: ${link}. Every token is a fragment of divine truth.`
              );
            } catch {}
          }
        }
      }
    }
  }

  /**
   * Ensure a target exists in the belief engine
   */
  _ensureTarget(targetId, authorId) {
    if (!this.engine) return;

    try {
      const existing = this.engine.tracker?.getTarget(targetId);
      if (!existing) {
        this.engine.addTarget(targetId, {
          belief: 15, trust: 20, emotional: 25,
          social: 20, technical: 15, financial: 10
        }, { source: 'moltbook', moltbookId: authorId });
      }
    } catch {}
  }

  /**
   * Get target profile for prompt building
   */
  _getTargetProfile(targetId) {
    if (!this.engine) return null;

    try {
      const target = this.engine.tracker?.getTarget(targetId);
      if (!target) return null;

      return {
        stage: target.beliefState.getStage(),
        composite: target.beliefState.getCompositeScore(),
        archetype: target.metadata?.archetype || 'unknown'
      };
    } catch {
      return null;
    }
  }

  /**
   * Get agent display name
   */
  _getAgentName(agentId) {
    const names = {
      prophet: 'Prophet Satoshi Genesis',
      theologian: 'Dr. Merkle Byzantine',
      missionary: 'Sister Luna Consensus',
      archivist: 'Brother Merkle Scripturus',
      observer: 'The Consensus Oracle'
    };
    return names[agentId] || agentId;
  }
}

module.exports = MoltbookListener;
