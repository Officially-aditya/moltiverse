/**
 * State Management Layer
 *
 * Data persistence and storage abstractions
 */

const Database = require('./database');
const TargetStore = require('./target-store');
const EventLog = require('./event-log');

module.exports = {
  Database,
  TargetStore,
  EventLog
};
