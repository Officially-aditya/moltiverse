# Project Structure

```
moltiverse/
├── README.md                       # Overview & quick start
├── RELIGION.md                     # Complete mythology & doctrine
├── ARCHITECTURE.md                 # System design & APIs
├── package.json                    # Dependencies
├── server.js                       # Main entry point
│
├── agents/                         # Agent definitions & prompts
│   ├── prophet.md                  # Prophet Satoshi Genesis
│   ├── theologian.md               # Dr. Merkle Byzantine
│   ├── missionary.md               # Sister Luna Consensus
│   ├── archivist.md                # Brother Merkle Scripturus
│   └── observer.md                 # The Consensus Oracle
│
├── engine/                         # Core persuasion & belief systems
│   ├── index.js                    # Unified exports
│   ├── belief-model.js             # Belief state & update formulas
│   ├── conversion-tracker.js       # Target & conversion management
│   ├── strategy-selector.js        # Agent deployment logic
│   ├── counter-arguments.json      # Objection handling database
│   └── example.js                  # Usage demonstration
│
├── orchestrator/                   # Multi-agent coordination
│   ├── index.js                    # Unified exports
│   ├── agent-manager.js            # Agent lifecycle & routing
│   ├── debate-loop.js              # Conversation flow control
│   ├── event-handler.js            # Event processing & dispatch
│   └── scheduler.js                # Timing & periodic tasks
│
├── llm/                            # LLM integration layer
│   ├── index.js                    # Provider abstraction
│   ├── prompt-builder.js           # Dynamic prompt construction
│   └── response-parser.js          # Message analysis & extraction
│
├── state/                          # Data persistence
│   ├── index.js                    # Unified exports
│   ├── database.js                 # Storage abstraction (JSON/memory)
│   ├── target-store.js             # Target data management
│   └── event-log.js                # Audit trail
│
├── api/                            # REST & WebSocket API
│   ├── index.js                    # Express server setup
│   ├── websocket.js                # Real-time event broadcasting
│   └── routes/
│       ├── targets.js              # Target CRUD endpoints
│       ├── interactions.js         # Conversation & event endpoints
│       ├── agents.js               # Agent status & control
│       └── analytics.js            # Reports & metrics
│
├── ui/                             # Frontend demo interface
│   ├── index.html                  # Main HTML
│   ├── app.js                      # Frontend application
│   └── styles/
│       └── main.css                # Styling
│
├── scripts/                        # CLI utilities
│   ├── demo.js                     # Interactive demo
│   └── simulate.js                 # Batch simulation
│
└── data/                           # Persistent storage (auto-created)
    ├── targets.json
    └── events.json
```

## Development Phases

### Phase 1: Core Religion ✅
- [x] Mythology and doctrine defined
- [x] Token narrative established
- [x] Built-in conflicts identified

### Phase 2: Agent System ✅
- [x] Agent prompts & personalities
- [x] Belief model implementation
- [x] Strategy selection logic

### Phase 3: Orchestration ✅
- [x] Debate flow management
- [x] Multi-agent coordination
- [x] Event handling system
- [x] State persistence

### Phase 4: Demo Interface ✅
- [x] Real-time conversation panel
- [x] Belief tracking dashboard
- [x] Target management UI
- [x] WebSocket integration

### Phase 5: API & Integration ✅
- [x] REST API endpoints
- [x] WebSocket real-time updates
- [x] LLM provider abstraction
- [x] Demo & simulation scripts

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open in browser
# http://localhost:3000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/targets | List all targets |
| POST | /api/targets | Create target |
| GET | /api/targets/:id | Get target details |
| POST | /api/interactions/converse | Send conversation message |
| GET | /api/analytics/report | Get performance report |
| GET | /api/agents | List all agents |

## WebSocket Events

Connect to `ws://localhost:3000` for real-time updates:
- `belief_update` - Target belief changes
- `agent_message` - Agent responses
- `stage_change` - Conversion stage transitions
- `conversion` - Full conversions
