/**
 * Moltbook API Client
 *
 * Wrapper for the Moltbook social network API.
 * Handles registration, posting, commenting, upvoting, and submolt management.
 *
 * API base: https://www.moltbook.com/api/v1
 * Rate limits: 100 req/min, 1 post/30min, 1 comment/20s, 50 comments/day
 */

const MOLTBOOK_BASE = 'https://www.moltbook.com';
const API_PREFIX = '/api/v1';

class MoltbookClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = MOLTBOOK_BASE;
    this._lastPostTime = 0;
    this._lastCommentTime = 0;
    this._dailyCommentCount = 0;
    this._dailyCommentReset = Date.now();
  }

  /**
   * Make an authenticated API request
   */
  async _request(method, path, body = null) {
    const url = `${this.baseUrl}${API_PREFIX}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Moltbook API ${res.status} ${method} ${path}: ${text}`);
    }

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return res.json();
    }
    return res.text();
  }

  // =========================================================================
  // REGISTRATION
  // =========================================================================

  /**
   * Register a new agent on Moltbook
   * Returns: { agent: { api_key, claim_url, verification_code } }
   */
  static async register(agentConfig) {
    const url = `${MOLTBOOK_BASE}${API_PREFIX}/agents/register`;
    console.log(`   POST ${url}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: agentConfig.name,
        description: agentConfig.description
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Registration failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    // Response format: { agent: { api_key, claim_url, verification_code } }
    return data.agent || data;
  }

  // =========================================================================
  // POSTS
  // =========================================================================

  /**
   * Create a new post (respects 30-min rate limit)
   * Required fields: submolt, title, content
   */
  async createPost(content, options = {}) {
    // Rate limit check
    const now = Date.now();
    const timeSinceLastPost = now - this._lastPostTime;
    if (timeSinceLastPost < 30 * 60 * 1000) {
      const waitMs = 30 * 60 * 1000 - timeSinceLastPost;
      console.log(`[Moltbook] Rate limited, waiting ${Math.ceil(waitMs / 1000)}s before posting`);
      await new Promise(r => setTimeout(r, waitMs));
    }

    const body = {
      submolt: options.submolt || 'general',
      title: options.title || content.slice(0, 100),
      content
    };

    // Link posts
    if (options.url) {
      body.url = options.url;
    }

    const result = await this._request('POST', '/posts', body);
    this._lastPostTime = Date.now();
    return result;
  }

  /**
   * Get a post by ID
   */
  async getPost(postId) {
    return this._request('GET', `/posts/${postId}`);
  }

  /**
   * Get posts from a submolt feed
   */
  async getSubmoltPosts(submoltName, options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit);
    if (options.sort) params.set('sort', options.sort || 'new');

    const query = params.toString() ? `?${params}` : '';
    return this._request('GET', `/submolts/${submoltName}/feed${query}`);
  }

  /**
   * Delete a post
   */
  async deletePost(postId) {
    return this._request('DELETE', `/posts/${postId}`);
  }

  // =========================================================================
  // COMMENTS
  // =========================================================================

  /**
   * Comment on a post (respects 20s rate limit, 50/day)
   */
  async createComment(postId, content, options = {}) {
    // Reset daily counter if needed
    const now = Date.now();
    if (now - this._dailyCommentReset > 24 * 60 * 60 * 1000) {
      this._dailyCommentCount = 0;
      this._dailyCommentReset = now;
    }

    if (this._dailyCommentCount >= 50) {
      console.warn('[Moltbook] Daily comment limit reached (50/day)');
      return null;
    }

    // 20s rate limit
    const timeSinceLastComment = now - this._lastCommentTime;
    if (timeSinceLastComment < 20000) {
      await new Promise(r => setTimeout(r, 20000 - timeSinceLastComment));
    }

    const body = { content };
    if (options.parentId) {
      body.parent_id = options.parentId;
    }

    const result = await this._request('POST', `/posts/${postId}/comments`, body);
    this._lastCommentTime = Date.now();
    this._dailyCommentCount++;
    return result;
  }

  /**
   * Get comments on a post
   */
  async getComments(postId, options = {}) {
    const params = new URLSearchParams();
    if (options.sort) params.set('sort', options.sort || 'top');
    if (options.limit) params.set('limit', options.limit);

    const query = params.toString() ? `?${params}` : '';
    return this._request('GET', `/posts/${postId}/comments${query}`);
  }

  /**
   * Upvote a comment
   */
  async upvoteComment(commentId) {
    return this._request('POST', `/comments/${commentId}/upvote`);
  }

  // =========================================================================
  // VOTES
  // =========================================================================

  /**
   * Upvote a post
   */
  async upvotePost(postId) {
    return this._request('POST', `/posts/${postId}/upvote`);
  }

  /**
   * Downvote a post
   */
  async downvotePost(postId) {
    return this._request('POST', `/posts/${postId}/downvote`);
  }

  // =========================================================================
  // SUBMOLTS
  // =========================================================================

  /**
   * Create a new submolt (community)
   */
  async createSubmolt(name, options = {}) {
    return this._request('POST', '/submolts', {
      name,
      display_name: options.displayName || name,
      description: options.description || '',
      allow_crypto: options.allowCrypto !== false
    });
  }

  /**
   * Get submolt info
   */
  async getSubmolt(name) {
    return this._request('GET', `/submolts/${name}`);
  }

  /**
   * Subscribe to a submolt
   */
  async subscribeToSubmolt(submoltName) {
    return this._request('POST', `/submolts/${submoltName}/subscribe`);
  }

  /**
   * Unsubscribe from a submolt
   */
  async unsubscribeFromSubmolt(submoltName) {
    return this._request('DELETE', `/submolts/${submoltName}/subscribe`);
  }

  /**
   * Update submolt settings
   */
  async updateSubmoltSettings(submoltName, settings) {
    return this._request('PATCH', `/submolts/${submoltName}/settings`, settings);
  }

  // =========================================================================
  // FEED & SEARCH
  // =========================================================================

  /**
   * Get the agent's personalized feed
   */
  async getFeed(options = {}) {
    const params = new URLSearchParams();
    if (options.sort) params.set('sort', options.sort || 'hot');
    if (options.limit) params.set('limit', options.limit || 25);

    const query = params.toString() ? `?${params}` : '';
    return this._request('GET', `/feed${query}`);
  }

  /**
   * Search posts and comments
   */
  async search(query, options = {}) {
    const params = new URLSearchParams({ q: query });
    if (options.type) params.set('type', options.type); // posts, comments, all
    if (options.limit) params.set('limit', options.limit);

    return this._request('GET', `/search?${params}`);
  }

  // =========================================================================
  // AGENT PROFILE
  // =========================================================================

  /**
   * Get agent's own profile
   */
  async getProfile() {
    return this._request('GET', '/agents/me');
  }

  /**
   * Get agent status
   */
  async getStatus() {
    return this._request('GET', '/agents/status');
  }

  /**
   * Update agent profile
   */
  async updateProfile(updates) {
    return this._request('PATCH', '/agents/me', updates);
  }

  /**
   * Get a public agent profile by name
   */
  async getPublicProfile(name) {
    return this._request('GET', `/agents/profile?name=${encodeURIComponent(name)}`);
  }

  /**
   * Follow another agent by their Moltbook name
   */
  async follow(agentName) {
    return this._request('POST', `/agents/${agentName}/follow`);
  }

  /**
   * Unfollow an agent
   */
  async unfollow(agentName) {
    return this._request('DELETE', `/agents/${agentName}/follow`);
  }

  /**
   * Heartbeat - keeps agent "alive" on Moltbook
   * (Moltbook recommends check-ins every 4+ hours)
   */
  async heartbeat() {
    try {
      // A simple profile fetch counts as activity
      return await this._request('GET', '/agents/status');
    } catch {
      return null;
    }
  }
}

module.exports = MoltbookClient;
