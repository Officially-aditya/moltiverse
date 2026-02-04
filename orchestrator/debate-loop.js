/**
 * Debate Loop
 *
 * Manages conversation flow and multi-turn interactions
 */

const { ResponseParser } = require('../llm');
const { updateBelief, analyzeBeliefState } = require('../engine');

// =============================================================================
// DEBATE LOOP CLASS
// =============================================================================

class DebateLoop {
  constructor(config = {}) {
    this.agentManager = config.agentManager;
    this.conversionTracker = config.conversionTracker;
    this.eventHandler = config.eventHandler;

    this.conversations = new Map();
    this.listeners = new Map();
  }

  /**
   * Start a new conversation with a target
   */
  async start(targetId, initialMessage, options = {}) {
    // Get or create target
    let target = this.conversionTracker?.getTarget(targetId);
    if (!target && this.conversionTracker) {
      target = this.conversionTracker.addTarget(targetId, options.initialBeliefs || {});
    }

    // Initialize conversation state
    const conversation = {
      targetId,
      messages: [],
      startedAt: Date.now(),
      status: 'active',
      currentAgent: null,
      agentSwitches: 0,
      stageAtStart: target?.beliefState.getStage() || 'UNAWARE'
    };

    this.conversations.set(targetId, conversation);

    // Process initial message
    return this.continue(targetId, initialMessage);
  }

  /**
   * Continue an existing conversation
   */
  async continue(targetId, userMessage) {
    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      throw new Error(`No active conversation for target: ${targetId}`);
    }

    if (conversation.status !== 'active') {
      throw new Error(`Conversation is ${conversation.status}`);
    }

    const target = this.conversionTracker?.getTarget(targetId);
    const beliefState = target?.beliefState;

    // Add user message to history
    conversation.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    });

    // Analyze user message
    const analysis = ResponseParser.analyze(userMessage);

    // Emit message event
    this._emit('message', {
      targetId,
      role: 'user',
      content: userMessage,
      analysis
    });

    // Check for conversation end signals
    if (ResponseParser.isConversationEnd(userMessage)) {
      return this.end(targetId);
    }

    // Update beliefs based on detected signals
    if (beliefState && analysis.inferredEvent) {
      const previousAgent = conversation.currentAgent || 'missionary';
      this.conversionTracker.recordInteraction(
        targetId,
        analysis.inferredEvent,
        previousAgent
      );

      // Check for stage transition
      const newStage = target.beliefState.getStage();
      if (conversation.lastStage && conversation.lastStage !== newStage) {
        this._emit('stageTransition', {
          targetId,
          from: conversation.lastStage,
          to: newStage
        });
      }
      conversation.lastStage = newStage;
    }

    // Handle objections
    let objection = null;
    if (analysis.objections.length > 0) {
      objection = analysis.objections[0].type;
      this._emit('objectionDetected', {
        targetId,
        objection,
        confidence: analysis.objections[0].confidence
      });
    }

    // Generate agent response
    const response = await this.agentManager.routeMessage(
      targetId,
      userMessage,
      beliefState || { dimensions: {}, getStage: () => 'UNAWARE' },
      conversation.messages
    );

    // Track agent switches
    if (conversation.currentAgent && conversation.currentAgent !== response.agentId) {
      conversation.agentSwitches++;
      this._emit('agentSwitch', {
        targetId,
        from: conversation.currentAgent,
        to: response.agentId
      });
    }
    conversation.currentAgent = response.agentId;

    // Add agent response to history
    conversation.messages.push({
      role: 'agent',
      agentId: response.agentId,
      agentName: response.agentName,
      content: response.content,
      timestamp: response.timestamp
    });

    // Emit agent message event
    this._emit('message', {
      targetId,
      role: 'agent',
      agentId: response.agentId,
      content: response.content
    });

    // Check for conversion
    if (target && target.conversionStatus === 'converted') {
      this._emit('conversionTriggered', {
        targetId,
        criteria: target.conversionCriteria
      });
    }

    return {
      agentId: response.agentId,
      agentName: response.agentName,
      content: response.content,
      analysis: beliefState ? analyzeBeliefState(beliefState) : null,
      conversationLength: conversation.messages.length
    };
  }

  /**
   * Pause a conversation
   */
  pause(targetId) {
    const conversation = this.conversations.get(targetId);
    if (conversation) {
      conversation.status = 'paused';
      conversation.pausedAt = Date.now();
    }
  }

  /**
   * Resume a paused conversation
   */
  resume(targetId) {
    const conversation = this.conversations.get(targetId);
    if (conversation && conversation.status === 'paused') {
      conversation.status = 'active';
      conversation.resumedAt = Date.now();
    }
  }

  /**
   * End a conversation and get summary
   */
  end(targetId) {
    const conversation = this.conversations.get(targetId);
    if (!conversation) {
      return null;
    }

    conversation.status = 'ended';
    conversation.endedAt = Date.now();

    const target = this.conversionTracker?.getTarget(targetId);

    // Clean up agent tracking
    this.agentManager?.endConversation(targetId);

    const summary = {
      targetId,
      duration: conversation.endedAt - conversation.startedAt,
      messageCount: conversation.messages.length,
      agentSwitches: conversation.agentSwitches,
      stageAtStart: conversation.stageAtStart,
      stageAtEnd: target?.beliefState.getStage() || 'UNKNOWN',
      conversionStatus: target?.conversionStatus || 'none',
      finalBeliefs: target?.beliefState.toObject() || null,
      agents: this._getAgentParticipation(conversation)
    };

    this._emit('conversationEnded', summary);

    return summary;
  }

  /**
   * Get conversation history
   */
  getConversation(targetId) {
    const conversation = this.conversations.get(targetId);
    return conversation ? [...conversation.messages] : [];
  }

  /**
   * Get all active debate target IDs
   */
  getActiveDebates() {
    const active = [];
    for (const [targetId, conv] of this.conversations) {
      if (conv.status === 'active') {
        active.push(targetId);
      }
    }
    return active;
  }

  /**
   * Get conversation state
   */
  getConversationState(targetId) {
    const conversation = this.conversations.get(targetId);
    if (!conversation) return null;

    return {
      status: conversation.status,
      messageCount: conversation.messages.length,
      currentAgent: conversation.currentAgent,
      agentSwitches: conversation.agentSwitches,
      duration: Date.now() - conversation.startedAt
    };
  }

  /**
   * Calculate agent participation in conversation
   */
  _getAgentParticipation(conversation) {
    const participation = {};
    for (const msg of conversation.messages) {
      if (msg.role === 'agent') {
        participation[msg.agentId] = (participation[msg.agentId] || 0) + 1;
      }
    }
    return participation;
  }

  /**
   * Register event listener
   */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
  }

  /**
   * Remove event listener
   */
  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
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
        } catch (e) {
          console.error(`Event handler error for ${event}:`, e);
        }
      }
    }

    // Also emit to event handler if configured
    if (this.eventHandler) {
      this.eventHandler.emit({ type: event, ...data });
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = DebateLoop;
