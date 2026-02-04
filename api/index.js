/**
 * API Server
 *
 * REST and WebSocket API for the Moltiverse system
 */

const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');

const targetsRouter = require('./routes/targets');
const interactionsRouter = require('./routes/interactions');
const agentsRouter = require('./routes/agents');
const analyticsRouter = require('./routes/analytics');
const WebSocketHandler = require('./websocket');

// =============================================================================
// API SERVER CLASS
// =============================================================================

class APIServer {
  constructor(config = {}) {
    this.port = config.port || 3000;
    this.engine = config.engine;
    this.orchestrator = config.orchestrator;

    // Create Express app
    this.app = express();
    this.server = http.createServer(this.app);

    // Create WebSocket server
    this.wss = new WebSocketServer({ server: this.server });
    this.wsHandler = new WebSocketHandler(this.wss, {
      engine: this.engine,
      orchestrator: this.orchestrator
    });

    this._setupMiddleware();
    this._setupRoutes();
    this._setupErrorHandling();
  }

  /**
   * Setup middleware
   */
  _setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());

    // Attach dependencies to request
    this.app.use((req, res, next) => {
      req.engine = this.engine;
      req.orchestrator = this.orchestrator;
      req.wsHandler = this.wsHandler;
      next();
    });

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
      });
      next();
    });
  }

  /**
   * Setup routes
   */
  _setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    // API routes
    this.app.use('/api/targets', targetsRouter);
    this.app.use('/api/interactions', interactionsRouter);
    this.app.use('/api/agents', agentsRouter);
    this.app.use('/api/analytics', analyticsRouter);

    // Serve static files for UI
    this.app.use(express.static('ui'));

    // Catch-all for SPA
    this.app.get('*', (req, res) => {
      res.sendFile('index.html', { root: 'ui' });
    });
  }

  /**
   * Setup error handling
   */
  _setupErrorHandling() {
    // 404 handler
    this.app.use((req, res, next) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      console.error('API Error:', err);
      res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
      });
    });
  }

  /**
   * Start the server
   */
  async start() {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`Moltiverse API server running on http://localhost:${this.port}`);
        console.log(`WebSocket server running on ws://localhost:${this.port}`);
        resolve(this);
      });
    });
  }

  /**
   * Stop the server
   */
  async stop() {
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.server.close(() => {
          console.log('Server stopped');
          resolve();
        });
      });
    });
  }

  /**
   * Get Express app (for testing)
   */
  getApp() {
    return this.app;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = APIServer;
