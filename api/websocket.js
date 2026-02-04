/**
 * WebSocket Handler
 *
 * Real-time event broadcasting and client communication
 */

// =============================================================================
// WEBSOCKET HANDLER CLASS
// =============================================================================

class WebSocketHandler {
  constructor(wss, config = {}) {
    this.wss = wss;
    this.engine = config.engine;
    this.orchestrator = config.orchestrator;

    this.clients = new Map();
    this.subscriptions = new Map();

    this._setupConnectionHandler();
    this._setupEventForwarding();
  }

  /**
   * Setup WebSocket connection handler
   */
  _setupConnectionHandler() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this._generateClientId();

      // Store client
      this.clients.set(clientId, {
        ws,
        subscribedTargets: new Set(),
        connectedAt: Date.now()
      });

      console.log(`WebSocket client connected: ${clientId}`);

      // Send welcome message
      this._send(ws, {
        type: 'connected',
        clientId,
        timestamp: Date.now()
      });

      // Handle messages from client
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this._handleClientMessage(clientId, message);
        } catch (e) {
          console.error('Invalid WebSocket message:', e);
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        this._handleDisconnect(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for ${clientId}:`, error);
      });
    });
  }

  /**
   * Setup event forwarding from system events
   */
  _setupEventForwarding() {
    // Subscribe to event handler if available
    const eventHandler = this.orchestrator?.eventHandler;
    if (eventHandler) {
      eventHandler.subscribe((event) => {
        this._forwardEvent(event);
      });
    }

    // Subscribe to debate loop events if available
    const debateLoop = this.orchestrator?.debateLoop;
    if (debateLoop) {
      debateLoop.on('message', (data) => {
        this.broadcastToTarget(data.targetId, {
          type: data.role === 'agent' ? 'agent_message' : 'user_message',
          ...data
        });
      });

      debateLoop.on('stageTransition', (data) => {
        this.broadcastToTarget(data.targetId, {
          type: 'stage_change',
          ...data
        });
      });

      debateLoop.on('conversionTriggered', (data) => {
        this.broadcastToTarget(data.targetId, {
          type: 'conversion',
          ...data
        });
      });
    }
  }

  /**
   * Handle messages from clients
   */
  _handleClientMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        this._handleSubscribe(clientId, message.targetId);
        break;

      case 'unsubscribe':
        this._handleUnsubscribe(clientId, message.targetId);
        break;

      case 'message':
        this._handleConversationMessage(clientId, message);
        break;

      case 'ping':
        this._send(client.ws, { type: 'pong', timestamp: Date.now() });
        break;

      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle target subscription
   */
  _handleSubscribe(clientId, targetId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscribedTargets.add(targetId);

    // Add to subscription map
    if (!this.subscriptions.has(targetId)) {
      this.subscriptions.set(targetId, new Set());
    }
    this.subscriptions.get(targetId).add(clientId);

    // Send current state
    const target = this.engine?.tracker?.getTarget(targetId);
    if (target) {
      this._send(client.ws, {
        type: 'subscribed',
        targetId,
        currentState: target.beliefState.toObject()
      });
    } else {
      this._send(client.ws, {
        type: 'subscribed',
        targetId,
        currentState: null
      });
    }
  }

  /**
   * Handle target unsubscription
   */
  _handleUnsubscribe(clientId, targetId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscribedTargets.delete(targetId);

    const targetSubs = this.subscriptions.get(targetId);
    if (targetSubs) {
      targetSubs.delete(clientId);
    }

    this._send(client.ws, {
      type: 'unsubscribed',
      targetId
    });
  }

  /**
   * Handle conversation message from client
   */
  async _handleConversationMessage(clientId, message) {
    const { targetId, content } = message;
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const debateLoop = this.orchestrator?.debateLoop;
      if (!debateLoop) {
        this._send(client.ws, {
          type: 'error',
          message: 'Conversation service unavailable'
        });
        return;
      }

      // Forward user message to all subscribers
      this.broadcastToTarget(targetId, {
        type: 'user_message',
        targetId,
        content,
        timestamp: Date.now()
      });

      // Process through debate loop
      const conversationState = debateLoop.getConversationState(targetId);

      let response;
      if (!conversationState) {
        response = await debateLoop.start(targetId, content);
      } else {
        response = await debateLoop.continue(targetId, content);
      }

      // Response is automatically broadcast through event forwarding

    } catch (error) {
      this._send(client.ws, {
        type: 'error',
        message: error.message
      });
    }
  }

  /**
   * Handle client disconnect
   */
  _handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all subscriptions
    for (const targetId of client.subscribedTargets) {
      const targetSubs = this.subscriptions.get(targetId);
      if (targetSubs) {
        targetSubs.delete(clientId);
      }
    }

    this.clients.delete(clientId);
    console.log(`WebSocket client disconnected: ${clientId}`);
  }

  /**
   * Forward system event to relevant clients
   */
  _forwardEvent(event) {
    // Broadcast to target subscribers if event has targetId
    if (event.targetId) {
      this.broadcastToTarget(event.targetId, event);
    }

    // Broadcast certain events to all clients
    const globalEvents = ['conversion', 'stage_change', 'system_status'];
    if (globalEvents.includes(event.type)) {
      this.broadcast(event);
    }
  }

  /**
   * Send message to a specific WebSocket
   */
  _send(ws, data) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(data) {
    const message = JSON.stringify({
      ...data,
      timestamp: data.timestamp || Date.now()
    });

    for (const [_, client] of this.clients) {
      if (client.ws.readyState === 1) {
        client.ws.send(message);
      }
    }
  }

  /**
   * Broadcast to clients subscribed to a specific target
   */
  broadcastToTarget(targetId, data) {
    const subscribers = this.subscriptions.get(targetId);
    if (!subscribers || subscribers.size === 0) return;

    const message = JSON.stringify({
      ...data,
      timestamp: data.timestamp || Date.now()
    });

    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === 1) {
        client.ws.send(message);
      }
    }
  }

  /**
   * Generate unique client ID
   */
  _generateClientId() {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      totalClients: this.clients.size,
      subscriptions: this.subscriptions.size,
      clientDetails: Array.from(this.clients.entries()).map(([id, client]) => ({
        id,
        connectedAt: client.connectedAt,
        subscribedTargets: Array.from(client.subscribedTargets)
      }))
    };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = WebSocketHandler;
