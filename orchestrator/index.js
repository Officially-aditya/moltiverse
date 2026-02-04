/**
 * Orchestrator Module
 *
 * Multi-agent coordination and conversation management
 */

const AgentManager = require('./agent-manager');
const DebateLoop = require('./debate-loop');
const EventHandler = require('./event-handler');
const Scheduler = require('./scheduler');

module.exports = {
  AgentManager,
  DebateLoop,
  EventHandler,
  Scheduler
};
