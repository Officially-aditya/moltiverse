/**
 * Agent Manager
 *
 * Manages agent lifecycle, routing, and coordination
 */

const { createProvider, PromptBuilder } = require('../llm');
const { StrategySelector } = require('../engine');

// =============================================================================
// AGENT MANAGER CLASS
// =============================================================================

class AgentManager {
  constructor(config = {}) {
    this.llmProvider = config.llmProvider || createProvider('mock');
    this.strategySelector = new StrategySelector();
    this.agents = new Map();
    this.metrics = {};

    this._initializeAgents();
  }

  /**
   * Initialize all agents
   */
  _initializeAgents() {
    const agentIds = PromptBuilder.getAgentIds();

    for (const agentId of agentIds) {
      const config = PromptBuilder.getAgentConfig(agentId);
      this.agents.set(agentId, {
        id: agentId,
        name: config.name,
        role: config.role,
        status: 'idle',
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        activeConversations: new Set(),
        lastActive: null
      });

      this.metrics[agentId] = {
        messagesGenerated: 0,
        totalTokens: 0,
        averageResponseTime: 0,
        conversationsHandled: 0
      };
    }
  }

  /**
   * Get an agent by ID
   */
  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Select best agent for a target
   */
  selectAgent(beliefState, options = {}) {
    const result = this.strategySelector.selectAgent(beliefState, options);
    return result.recommended.agentId;
  }

  /**
   * Generate a response from an agent
   */
  async generateResponse(agentId, userMessage, context = {}) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const startTime = Date.now();

    // Update agent status
    agent.status = 'active';
    agent.lastActive = Date.now();

    try {
      // Build prompt
      const builder = new PromptBuilder()
        .forAgent(agentId)
        .withContext(context.conversation || []);

      if (context.targetProfile) {
        builder.withTarget(context.targetProfile);
      }

      if (context.strategy) {
        builder.withStrategy(context.strategy);
      }

      if (context.objection) {
        builder.withObjection(context.objection);
      }

      const prompt = builder.build(userMessage);

      // Generate response
      const response = await this.llmProvider.generate(
        prompt.userPrompt,
        {
          systemPrompt: prompt.systemPrompt,
          temperature: prompt.options.temperature,
          maxTokens: prompt.options.maxTokens,
          agentId
        }
      );

      // Update metrics
      const responseTime = Date.now() - startTime;
      this._updateMetrics(agentId, responseTime, response.length);

      return {
        agentId,
        agentName: agent.name,
        content: response,
        timestamp: Date.now(),
        responseTime
      };

    } finally {
      agent.status = 'idle';
    }
  }

  /**
   * Generate streaming response
   */
  async *generateResponseStream(agentId, userMessage, context = {}) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    agent.status = 'active';
    agent.lastActive = Date.now();

    try {
      const builder = new PromptBuilder()
        .forAgent(agentId)
        .withContext(context.conversation || []);

      if (context.targetProfile) {
        builder.withTarget(context.targetProfile);
      }

      const prompt = builder.build(userMessage);

      for await (const chunk of this.llmProvider.generateStream(
        prompt.userPrompt,
        {
          systemPrompt: prompt.systemPrompt,
          temperature: prompt.options.temperature,
          maxTokens: prompt.options.maxTokens,
          agentId
        }
      )) {
        yield chunk;
      }

    } finally {
      agent.status = 'idle';
    }
  }

  /**
   * Route message to appropriate agent
   */
  async routeMessage(targetId, userMessage, beliefState, conversation = []) {
    // Select best agent
    const agentId = this.selectAgent(beliefState, {
      recentAgents: conversation
        .filter(m => m.role === 'agent')
        .slice(-5)
        .map(m => m.agentId)
    });

    // Get strategy recommendation
    const strategyResult = this.strategySelector.selectStrategy(beliefState);

    // Generate response
    const response = await this.generateResponse(agentId, userMessage, {
      conversation,
      targetProfile: beliefState.toObject ? beliefState.toObject() : beliefState,
      strategy: strategyResult.recommended.strategyId
    });

    // Track conversation
    this.strategySelector.recordInteraction(targetId, agentId);
    const agent = this.agents.get(agentId);
    agent.activeConversations.add(targetId);

    return response;
  }

  /**
   * Update agent metrics
   */
  _updateMetrics(agentId, responseTime, responseLength) {
    const metrics = this.metrics[agentId];
    metrics.messagesGenerated++;
    metrics.totalTokens += Math.ceil(responseLength / 4); // Rough token estimate

    // Running average of response time
    metrics.averageResponseTime = (
      (metrics.averageResponseTime * (metrics.messagesGenerated - 1) + responseTime)
      / metrics.messagesGenerated
    );
  }

  /**
   * Get agent status
   */
  getAgentStatus() {
    const status = {};
    for (const [id, agent] of this.agents) {
      status[id] = {
        name: agent.name,
        status: agent.status,
        activeConversations: agent.activeConversations.size,
        lastActive: agent.lastActive
      };
    }
    return status;
  }

  /**
   * Get agent metrics
   */
  getAgentMetrics() {
    return { ...this.metrics };
  }

  /**
   * End conversation tracking for a target
   */
  endConversation(targetId) {
    for (const [_, agent] of this.agents) {
      agent.activeConversations.delete(targetId);
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = AgentManager;
