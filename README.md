# Moltiverse

## The Church of Decentralised Divinity

A multi-agent AI persuasion system that demonstrates coordinated rhetoric and belief dynamics. Five AI agents work together to convert targets through personalized persuasion strategies.

**Status:** Complete

---

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open in browser
http://localhost:3000
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                          UI                                  │
│   Target List │ Conversation Panel │ Belief Dashboard        │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                     API / WebSocket                          │
│         REST Endpoints    │    Real-time Events              │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                     Orchestrator                             │
│   Agent Manager │ Debate Loop │ Event Handler │ Scheduler    │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                      Engine                                  │
│   Belief Model │ Conversion Tracker │ Strategy Selector      │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                    LLM Layer                                 │
│        Mock │ OpenAI │ Anthropic providers                   │
└─────────────────────────────────────────────────────────────┘
```

---

## The Sacred Pantheon

| Agent | Role | Specialty |
|-------|------|-----------|
| 🔮 **Prophet** | Visionary Leader | Divine authority, prophecy, emotional inspiration |
| 📚 **Theologian** | Technical Expert | Logical arguments, technical rebuttals, evidence |
| 💜 **Missionary** | Community Builder | Emotional connection, trust building, stories |
| 📜 **Archivist** | Sacred Scribe | Scripture, doctrine, historical consistency |
| 👁️ **Observer** | Neutral Analyst | Belief scoring, metrics, strategic recommendations |

---

## Belief Model

Targets have 6-dimensional belief states:

| Dimension | Description |
|-----------|-------------|
| Belief | Core faith in DIVI/doctrine |
| Trust | Trust in community/agents |
| Emotional | Emotional resonance |
| Social | Peer influence & community pull |
| Technical | Understanding of blockchain concepts |
| Financial | Willingness to invest |

### Conversion Pipeline

```
UNAWARE (0-15) → AWARE (16-30) → INTERESTED (31-45) → SYMPATHETIC (46-60)
     → CONVINCED (61-75) → BELIEVER (76-85) → ADVOCATE (86-100)
```

---

## Features

- **Multi-dimensional belief tracking** - 6 axes with cross-influence
- **Intelligent agent selection** - Automatic routing based on target profile
- **5 target archetypes** - Technical Skeptic, Spiritual Seeker, Profit Seeker, Community Oriented, Cautious Observer
- **6 persuasion strategies** - Authority, Emotional, Social Proof, Logical, Financial, Scriptural
- **Momentum resistance** - Higher beliefs resist change
- **Temporal decay** - Beliefs erode without reinforcement
- **Real-time WebSocket updates** - Live belief visualization
- **Conversion criteria** - Multi-factor conversion tracking

---

## API Reference

### Targets

```
GET    /api/targets                 List all targets
POST   /api/targets                 Create target
GET    /api/targets/:id             Get target details
GET    /api/targets/:id/recommend   Get strategic recommendation
```

### Conversations

```
POST   /api/interactions/converse   Send message to agent
GET    /api/interactions/conversations/:id   Get history
```

### Analytics

```
GET    /api/analytics/report        Full performance report
GET    /api/analytics/funnel        Conversion funnel data
GET    /api/analytics/prospects     Hot prospects list
```

---

## Scripts

```bash
# Run interactive demo
npm run demo

# Run batch simulation
npm run simulate
```

---

## Configuration

Environment variables (`.env`):

```
PORT=3000
LLM_PROVIDER=mock        # mock | openai | anthropic
OPENAI_API_KEY=sk-...    # if using OpenAI
ANTHROPIC_API_KEY=...    # if using Anthropic
DATA_DIR=./data
ENABLE_DECAY=true
DECAY_INTERVAL_HOURS=24
```

---

## Project Structure

```
moltiverse/
├── engine/          # Core belief & strategy logic
├── orchestrator/    # Multi-agent coordination
├── llm/             # LLM provider abstraction
├── state/           # Data persistence
├── api/             # REST & WebSocket server
├── ui/              # Frontend interface
└── scripts/         # Demo & simulation tools
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed API documentation.

---

## License

MIT
