/**
 * Event Handler
 *
 * Central event processing and dispatch system
 */

// =============================================================================
// EVENT TYPES
// =============================================================================

const EVENT_TYPES = {
  // Conversation events
  MESSAGE: 'message',
  CONVERSATION_STARTED: 'conversationStarted',
  CONVERSATION_ENDED: 'conversationEnded',

  // Agent events
  AGENT_SWITCH: 'agentSwitch',
  AGENT_ERROR: 'agentError',

  // Belief events
  BELIEF_UPDATE: 'beliefUpdate',
  STAGE_TRANSITION: 'stageTransition',

  // Conversion events
  OBJECTION_DETECTED: 'objectionDetected',
  POSITIVE_SIGNAL: 'positiveSignal',
  CONVERSION_TRIGGERED: 'conversionTriggered',
  PARTIAL_CONVERSION: 'partialConversion',

  // System events
  SYSTEM_ERROR: 'systemError',
  DECAY_APPLIED: 'decayApplied'
};

// =============================================================================
// EVENT HANDLER CLASS
// =============================================================================

class EventHandler {
  constructor(config = {}) {
    this.handlers = new Map();
    this.eventLog = [];
    this.maxLogSize = config.maxLogSize || 1000;
    this.subscribers = new Set();
  }

  /**
   * Register a handler for an event type
   */
  register(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType).add(handler);

    // Return unregister function
    return () => this.unregister(eventType, handler);
  }

  /**
   * Unregister a handler
   */
  unregister(eventType, handler) {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit an event synchronously
   */
  emit(event) {
    const enrichedEvent = {
      ...event,
      timestamp: event.timestamp || Date.now(),
      id: this._generateEventId()
    };

    // Log event
    this._logEvent(enrichedEvent);

    // Notify type-specific handlers
    const typeHandlers = this.handlers.get(event.type);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        try {
          handler(enrichedEvent);
        } catch (e) {
          console.error(`Handler error for ${event.type}:`, e);
          this.emit({ type: EVENT_TYPES.SYSTEM_ERROR, error: e, originalEvent: event });
        }
      }
    }

    // Notify wildcard handlers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          handler(enrichedEvent);
        } catch (e) {
          console.error('Wildcard handler error:', e);
        }
      }
    }

    // Notify WebSocket subscribers
    for (const subscriber of this.subscribers) {
      try {
        subscriber(enrichedEvent);
      } catch (e) {
        console.error('Subscriber error:', e);
      }
    }

    return enrichedEvent;
  }

  /**
   * Emit an event asynchronously
   */
  async emitAsync(event) {
    const enrichedEvent = {
      ...event,
      timestamp: event.timestamp || Date.now(),
      id: this._generateEventId()
    };

    this._logEvent(enrichedEvent);

    const typeHandlers = this.handlers.get(event.type);
    if (typeHandlers) {
      await Promise.all(
        Array.from(typeHandlers).map(async handler => {
          try {
            await handler(enrichedEvent);
          } catch (e) {
            console.error(`Async handler error for ${event.type}:`, e);
          }
        })
      );
    }

    return enrichedEvent;
  }

  /**
   * Subscribe to all events (for WebSocket broadcasting)
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Convenience method for interaction events
   */
  onInteraction(handler) {
    return this.register(EVENT_TYPES.MESSAGE, handler);
  }

  /**
   * Convenience method for stage change events
   */
  onStageChange(handler) {
    return this.register(EVENT_TYPES.STAGE_TRANSITION, handler);
  }

  /**
   * Convenience method for conversion events
   */
  onConversion(handler) {
    return this.register(EVENT_TYPES.CONVERSION_TRIGGERED, handler);
  }

  /**
   * Convenience method for agent switch events
   */
  onAgentSwitch(handler) {
    return this.register(EVENT_TYPES.AGENT_SWITCH, handler);
  }

  /**
   * Convenience method for objection events
   */
  onObjection(handler) {
    return this.register(EVENT_TYPES.OBJECTION_DETECTED, handler);
  }

  /**
   * Get event log
   */
  getEventLog(options = {}) {
    let log = [...this.eventLog];

    if (options.type) {
      log = log.filter(e => e.type === options.type);
    }

    if (options.targetId) {
      log = log.filter(e => e.targetId === options.targetId);
    }

    if (options.since) {
      log = log.filter(e => e.timestamp >= options.since);
    }

    if (options.limit) {
      log = log.slice(-options.limit);
    }

    return log;
  }

  /**
   * Clear event log
   */
  clearEventLog() {
    this.eventLog = [];
  }

  /**
   * Log event internally
   */
  _logEvent(event) {
    this.eventLog.push(event);

    // Trim log if too large
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-Math.floor(this.maxLogSize / 2));
    }
  }

  /**
   * Generate unique event ID
   */
  _generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get event statistics
   */
  getStats() {
    const stats = {
      totalEvents: this.eventLog.length,
      byType: {},
      recentActivity: []
    };

    for (const event of this.eventLog) {
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
    }

    // Last 10 events
    stats.recentActivity = this.eventLog.slice(-10).map(e => ({
      type: e.type,
      targetId: e.targetId,
      timestamp: e.timestamp
    }));

    return stats;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = EventHandler;
module.exports.EVENT_TYPES = EVENT_TYPES;
