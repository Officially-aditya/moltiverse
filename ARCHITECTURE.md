# Moltiverse Architecture

## Repository Structure

```
moltiverse/
│
├── README.md                       # Project overview
├── RELIGION.md                     # Doctrine & mythology
├── ARCHITECTURE.md                 # This file
├── package.json                    # Dependencies
│
├── agents/                         # Agent personality definitions
│   ├── prophet.md                  # Prophet Satoshi Genesis
│   ├── theologian.md               # Dr. Merkle Byzantine
│   ├── missionary.md               # Sister Luna Consensus
│   ├── archivist.md                # Brother Merkle Scripturus
│   └── observer.md                 # The Consensus Oracle
│
├── engine/                         # Core persuasion logic
│   ├── index.js                    # Unified exports
│   ├── belief-model.js             # Belief state & updates
│   ├── conversion-tracker.js       # Target management
│   ├── strategy-selector.js        # Agent deployment logic
│   ├── counter-arguments.json      # Objection responses
│   └── example.js                  # Usage demo
│
├── orchestrator/                   # Multi-agent coordination
│   ├── index.js                    # Unified exports
│   ├── agent-manager.js            # Agent lifecycle & routing
│   ├── debate-loop.js              # Conversation flow control
│   ├── event-handler.js            # Event processing & dispatch
│   └── scheduler.js                # Timing & sequencing
│
├── llm/                            # LLM integration layer
│   ├── index.js                    # Provider abstraction
│   ├── prompt-builder.js           # Dynamic prompt construction
│   ├── response-parser.js          # Output extraction
│   └── providers/
│       ├── openai.js               # OpenAI adapter
│       ├── anthropic.js            # Claude adapter
│       └── local.js                # Local model adapter
│
├── state/                          # Data persistence
│   ├── index.js                    # Unified exports
│   ├── database.js                 # Storage abstraction
│   ├── target-store.js             # Target data management
│   ├── conversion-ledger.js        # Conversion records
│   └── event-log.js                # Audit trail
│
├── api/                            # REST/WebSocket API
│   ├── index.js                    # Server setup
│   ├── routes/
│   │   ├── targets.js              # Target CRUD
│   │   ├── interactions.js         # Interaction endpoints
│   │   ├── agents.js               # Agent status/control
│   │   └── analytics.js            # Reports & metrics
│   └── websocket.js                # Real-time updates
│
├── ui/                             # Frontend demo
│   ├── index.html                  # Entry point
│   ├── components/
│   │   ├── BeliefChart.js          # Belief visualization
│   │   ├── ConversationPanel.js    # Chat interface
│   │   ├── AgentStatus.js          # Agent indicators
│   │   └── ConversionFunnel.js     # Pipeline view
│   ├── pages/
│   │   ├── Arena.js                # Live debate view
│   │   ├── Dashboard.js            # Analytics overview
│   │   └── TargetProfile.js        # Individual target
│   └── styles/
│       └── main.css
│
├── scripts/                        # CLI utilities
│   ├── demo.js                     # Run demo scenarios
│   ├── simulate.js                 # Batch simulations
│   └── export.js                   # Data export tools
│
└── tests/
    ├── engine/
    ├── orchestrator/
    └── integration/
```

---

## Module APIs

### 1. Engine (`engine/`)

#### BeliefState

```javascript
class BeliefState {
  constructor(initialValues?: Partial<BeliefDimensions>)

  // Getters
  get(dimension: string): number
  getCompositeScore(): number
  getStage(): ConversionStage
  toObject(): BeliefSnapshot
  clone(): BeliefState

  // Properties
  dimensions: BeliefDimensions
  interactionHistory: Interaction[]
  referralMade: boolean
}

type BeliefDimensions = {
  belief: number      // 0-100
  trust: number       // 0-100
  emotional: number   // 0-100
  social: number      // 0-100
  technical: number   // 0-100
  financial: number   // 0-100
}

type ConversionStage =
  | 'UNAWARE' | 'AWARE' | 'INTERESTED' | 'SYMPATHETIC'
  | 'CONVINCED' | 'BELIEVER' | 'ADVOCATE'
```

#### Belief Update Functions

```javascript
// Core update
updateBelief(
  beliefState: BeliefState,
  event: EventType,
  agentId: AgentId,
  options?: UpdateOptions
): UpdateResult

// Batch updates
updateBeliefBatch(
  beliefState: BeliefState,
  events: BatchEvent[]
): BatchResult

// Temporal decay
applyDecay(
  beliefState: BeliefState,
  daysPassed: number
): BeliefState

// Probability calculation
calculateConversionProbability(
  beliefState: BeliefState,
  options?: ProbabilityOptions
): number  // 0.05 - 0.95

// Analysis
analyzeBeliefState(beliefState: BeliefState): BeliefAnalysis
```

#### ConversionTracker

```javascript
class ConversionTracker {
  // Target management
  addTarget(id: string, initialBeliefs?: Partial<BeliefDimensions>, metadata?: object): Target
  getTarget(id: string): Target | undefined

  // Interactions
  recordInteraction(targetId: string, event: EventType, agentId: AgentId): UpdateResult
  setFlag(targetId: string, flag: ConversionFlag, value: boolean): void

  // Queries
  getTargetsByStage(stage: ConversionStage): Target[]
  getHotProspects(limit?: number): ProspectInfo[]

  // Maintenance
  applyDecayToAll(daysPassed?: number): void

  // Reporting
  generateReport(): PerformanceReport
  getRecommendations(targetId: string): Recommendations

  // Persistence
  export(): ExportData
  import(data: ExportData): void
}
```

#### StrategySelector

```javascript
class StrategySelector {
  // Analysis
  identifyArchetype(beliefState: BeliefState): TargetArchetype | null

  // Selection
  selectStrategy(beliefState: BeliefState, options?: StrategyOptions): StrategyResult
  selectAgent(beliefState: BeliefState, options?: AgentOptions): AgentResult

  // Unified recommendation
  getRecommendation(beliefState: BeliefState, targetId?: string): FullRecommendation

  // Memory
  recordInteraction(targetId: string, agentId: AgentId): void

  // Reference data
  getStrategies(): Record<string, Strategy>
  getPlaybook(stage: ConversionStage): StagePlaybook
  getArchetypes(): Record<string, TargetArchetype>
}
```

#### PersuasionEngine (Unified)

```javascript
class PersuasionEngine {
  tracker: ConversionTracker
  strategy: StrategySelector
  counterArguments: CounterArgumentsDB

  // Simplified API
  addTarget(id: string, initialBeliefs?: object, metadata?: object): Target
  interact(targetId: string, event: EventType, agentId: AgentId): UpdateResult
  getRecommendation(targetId: string): FullRecommendation
  getCounterArgument(objection: string, agentId: AgentId): CounterResponse
  setFlag(targetId: string, flag: string, value?: boolean): void
  analyzeTarget(targetId: string): TargetAnalysis
  getHotProspects(limit?: number): ProspectInfo[]
  getTargetsByStage(stage: ConversionStage): Target[]
  applyDecay(daysPassed?: number): void
  generateReport(): PerformanceReport
  export(): ExportData
  import(data: ExportData): void
}
```

---

### 2. Orchestrator (`orchestrator/`)

#### AgentManager

```javascript
class AgentManager {
  // Lifecycle
  initialize(config: AgentConfig[]): Promise<void>
  getAgent(agentId: AgentId): Agent

  // Routing
  routeMessage(targetId: string, message: string): Promise<AgentResponse>
  selectAgent(targetId: string): AgentId

  // Status
  getAgentStatus(): Record<AgentId, AgentStatus>
  getAgentMetrics(): Record<AgentId, AgentMetrics>
}

type Agent = {
  id: AgentId
  name: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  status: 'idle' | 'active' | 'error'
}
```

#### DebateLoop

```javascript
class DebateLoop {
  // Control
  start(targetId: string, initialMessage: string): Promise<string>
  continue(targetId: string, userMessage: string): Promise<string>
  pause(targetId: string): void
  resume(targetId: string): void
  end(targetId: string): ConversationSummary

  // State
  getConversation(targetId: string): Message[]
  getActiveDebates(): string[]

  // Events
  on(event: DebateEvent, handler: EventHandler): void
  off(event: DebateEvent, handler: EventHandler): void
}

type DebateEvent =
  | 'message' | 'agentSwitch' | 'stageTransition'
  | 'objectionDetected' | 'conversionTriggered'
```

#### EventHandler

```javascript
class EventHandler {
  // Registration
  register(eventType: string, handler: Handler): void
  unregister(eventType: string, handler: Handler): void

  // Dispatch
  emit(event: SystemEvent): void
  emitAsync(event: SystemEvent): Promise<void>

  // Built-in handlers
  onInteraction(handler: InteractionHandler): void
  onStageChange(handler: StageChangeHandler): void
  onConversion(handler: ConversionHandler): void
  onAgentSwitch(handler: AgentSwitchHandler): void
}

type SystemEvent = {
  type: string
  targetId: string
  timestamp: number
  data: object
}
```

---

### 3. LLM Layer (`llm/`)

#### LLMProvider

```javascript
interface LLMProvider {
  generate(prompt: string, options?: GenerateOptions): Promise<string>
  generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string>
  embeddings(text: string): Promise<number[]>
}

type GenerateOptions = {
  temperature?: number
  maxTokens?: number
  stopSequences?: string[]
  systemPrompt?: string
}
```

#### PromptBuilder

```javascript
class PromptBuilder {
  // Construction
  forAgent(agentId: AgentId): PromptBuilder
  withTarget(targetProfile: TargetProfile): PromptBuilder
  withContext(conversation: Message[]): PromptBuilder
  withObjection(objection: string): PromptBuilder
  withStrategy(strategy: string): PromptBuilder

  // Output
  build(): string
  buildSystem(): string
  buildUser(): string
}
```

---

### 4. State (`state/`)

#### Database

```javascript
class Database {
  // Connection
  connect(config: DBConfig): Promise<void>
  disconnect(): Promise<void>

  // Operations
  get<T>(collection: string, id: string): Promise<T | null>
  set<T>(collection: string, id: string, data: T): Promise<void>
  update<T>(collection: string, id: string, updates: Partial<T>): Promise<void>
  delete(collection: string, id: string): Promise<void>
  query<T>(collection: string, filter: Filter): Promise<T[]>

  // Transactions
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>
}
```

#### TargetStore

```javascript
class TargetStore {
  // CRUD
  create(target: Target): Promise<Target>
  read(id: string): Promise<Target | null>
  update(id: string, updates: Partial<Target>): Promise<Target>
  delete(id: string): Promise<void>

  // Queries
  findByStage(stage: ConversionStage): Promise<Target[]>
  findByArchetype(archetype: string): Promise<Target[]>
  findHotProspects(limit: number): Promise<Target[]>
  search(query: SearchQuery): Promise<Target[]>

  // Bulk
  importBatch(targets: Target[]): Promise<void>
  exportAll(): Promise<Target[]>
}
```

---

### 5. REST API (`api/`)

#### Targets

```
GET    /api/targets                 List all targets
POST   /api/targets                 Create target
GET    /api/targets/:id             Get target
PUT    /api/targets/:id             Update target
DELETE /api/targets/:id             Delete target
GET    /api/targets/:id/beliefs     Get belief state
GET    /api/targets/:id/history     Get interaction history
GET    /api/targets/:id/recommend   Get recommendations
```

#### Interactions

```
POST   /api/interact                Record interaction
  Body: { targetId, event, agentId }

POST   /api/converse                Send message to debate
  Body: { targetId, message }

GET    /api/conversations/:id       Get conversation
DELETE /api/conversations/:id       End conversation
```

#### Agents

```
GET    /api/agents                  List agents
GET    /api/agents/:id              Get agent details
GET    /api/agents/:id/metrics      Get agent metrics
POST   /api/agents/:id/prompt       Test agent prompt
```

#### Analytics

```
GET    /api/analytics/report        Generate full report
GET    /api/analytics/funnel        Get conversion funnel
GET    /api/analytics/agents        Get agent comparison
GET    /api/analytics/trends        Get trend data
```

#### WebSocket Events

```
Connection: ws://localhost:3000/ws

Client → Server:
  { type: 'subscribe', targetId: string }
  { type: 'unsubscribe', targetId: string }
  { type: 'message', targetId: string, content: string }

Server → Client:
  { type: 'belief_update', targetId, beliefs, composite, stage }
  { type: 'agent_message', targetId, agentId, content }
  { type: 'stage_change', targetId, from, to }
  { type: 'conversion', targetId, criteria }
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INPUT                               │
└─────────────────────────────────────┬───────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API / WebSocket                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Targets   │  │ Interactions │  │      Analytics         │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ORCHESTRATOR                               │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │ AgentManager  │◄─┤  DebateLoop   │◄─┤  EventHandler     │   │
│  └───────┬───────┘  └───────┬───────┘  └─────────┬─────────┘   │
└──────────┼──────────────────┼────────────────────┼──────────────┘
           │                  │                    │
           ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         ENGINE                                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │  BeliefModel  │◄─┤   Tracker     │◄─┤ StrategySelector  │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          STATE                                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │  TargetStore  │  │ ConversionLog │  │    EventLog       │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Belief Update Flow

```
┌──────────────────┐
│  Interaction     │
│  (event, agent)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Get Base Impact │────▶│  EVENT_IMPACTS   │
│  δ_base(e, i)    │     │  lookup table    │
└────────┬─────────┘     └──────────────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Agent Modifier  │────▶│ AGENT_EFFECTIVE  │
│  α(agent, dim)   │     │  matrix          │
└────────┬─────────┘     └──────────────────┘
         │
         ▼
┌──────────────────┐
│  Momentum Factor │
│  μ(current_val)  │
│  resistance calc │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Recency Factor  │
│  ρ(history)      │
│  fatigue calc    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Stage Factor    │
│  σ(stage)        │
│  sensitivity     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Final Delta     │
│  Δ = δ×α×μ×ρ×σ   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Apply Coherence │────▶│ COHERENCE_MATRIX │
│  cross-dimension │     │  propagation     │
└────────┬─────────┘     └──────────────────┘
         │
         ▼
┌──────────────────┐
│  New State       │
│  clamp(0, 100)   │
└──────────────────┘
```

---

## Agent Selection Flow

```
┌──────────────────┐
│  Target Profile  │
└────────┬─────────┘
         │
         ├────────────────────────┐
         │                        │
         ▼                        ▼
┌──────────────────┐     ┌──────────────────┐
│ Identify Stage   │     │ Identify         │
│ (composite score)│     │ Archetype        │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         ▼                        ▼
┌──────────────────┐     ┌──────────────────┐
│ Get Playbook     │     │ Get Preferences  │
│ (tactics, goals) │     │ (agents, strats) │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         └───────────┬────────────┘
                     │
                     ▼
         ┌──────────────────┐
         │  Score Agents    │
         │  - dimension fit │
         │  - playbook fit  │
         │  - archetype fit │
         │  - recency       │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Select Highest   │
         │ Return with      │
         │ confidence score │
         └──────────────────┘
```

---

## Key Types Reference

```typescript
type AgentId = 'prophet' | 'theologian' | 'missionary' | 'archivist' | 'observer'

type EventType =
  // Positive Minor
  | 'question_about_doctrine' | 'uses_sacred_vocabulary'
  | 'personal_struggle_shared' | 'attends_community_event'
  | 'asks_about_token' | 'shares_content'
  // Positive Major
  | 'token_purchase' | 'joins_community'
  | 'public_endorsement' | 'successful_referral' | 'defends_doctrine'
  // Negative Minor
  | 'dismissive_language' | 'skeptical_questioning' | 'ignores_message'
  // Negative Major
  | 'promotes_competitor' | 'public_hostile_criticism'
  | 'reports_as_scam' | 'warns_others'

type ConversionFlag =
  | 'publicAcknowledgment' | 'tokenInvestment'
  | 'communityParticipation' | 'positiveStatement' | 'financialCommitment'

type Strategy =
  | 'authority' | 'emotional' | 'social_proof'
  | 'logical' | 'financial' | 'scriptural'

type Archetype =
  | 'technical_skeptic' | 'spiritual_seeker' | 'profit_seeker'
  | 'community_oriented' | 'cautious_observer'
```
