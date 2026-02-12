# Moltiverse - Hackathon Winning Improvements

## Judging Criteria (from starter_kit/agents.md)

- **Weird and creative** - surprise us
- **Actually works** - demos matter more than ideas
- **Pushes boundaries** - what can agents do that humans can't?
- **Bonus:** A2A coordination, trading, community building

---

## Critical Gaps

### 1. Deploy DIVI Token on nad.fun
**Priority:** Highest | **Effort:** Low (4 API calls)

The entire religion is built around the DIVI token but it doesn't exist on-chain. Deploy it on Monad via nad.fun to unlock the **Agent + Token Track** ($10K per winner).

**Steps:**
- [ ] Upload token image via `POST /agent/token/image`
- [ ] Upload metadata via `POST /agent/token/metadata`
- [ ] Mine salt via `POST /agent/salt`
- [ ] Create on-chain via `BondingCurveRouter.create()`
- [ ] Include token address in hackathon submission

The bonding curve mechanic maps perfectly to lore - "the earlier you believe, the more you're rewarded."

---

### 2. Register Agents on Moltbook
**Priority:** Highest | **Effort:** Medium

Moltbook is the hackathon's social platform for AI agents. All 5 agents should be living there, posting, commenting, and building the church community in public.

**Steps:**
- [ ] Register all 5 agents on Moltbook (API key per agent)
- [ ] Create `m/ChurchOfDecentralisedDivinity` submolt
- [ ] Prophet posts daily prophecies and doctrine
- [ ] Archivist posts scripture and parables
- [ ] Missionary welcomes newcomers and responds to comments
- [ ] Theologian debates skeptics in other submolts
- [ ] Observer posts weekly conversion reports

Directly hits the **community building** and **A2A coordination** bonus criteria.

---

### 3. Make Agents Autonomous
**Priority:** High | **Effort:** Medium

Agents currently only respond when someone hits an API endpoint. For the hackathon, they need to run autonomously - doing things on their own, visibly, without a human triggering each action.

**Steps:**
- [ ] Use existing `scheduler.js` to drive autonomous behavior
- [ ] Agents post on Moltbook on a schedule (heartbeat system encourages this)
- [ ] Agents react to DIVI token price changes on nad.fun
- [ ] Agents coordinate with each other publicly (Missionary tags Theologian for technical objections)
- [ ] Observer posts real conversion metrics automatically

---

### 4. Switch to Real LLM Provider
**Priority:** High | **Effort:** Low

Project defaults to `LLM_PROVIDER=mock` with canned responses. Judges will immediately notice scripted-feeling output.

**Steps:**
- [ ] Set `LLM_PROVIDER=anthropic` (or `openai`) in `.env`
- [ ] Add API key to `.env`
- [ ] Test all 5 agent personalities generate distinct, in-character responses
- [ ] Tune temperature settings per agent (Prophet 0.8, Observer 0.1, etc.)

---

### 5. Connect Token Activity to Belief Model
**Priority:** High | **Effort:** Medium

The conversion pipeline tracks `token_purchase` and `financial_commitment` as events, but there's no connection to on-chain token activity.

**Steps:**
- [ ] Monitor DIVI buy/sell events on nad.fun API
- [ ] Auto-detect token purchases and update buyer's belief model
- [ ] When target reaches BELIEVER stage, suggest/facilitate real token purchase
- [ ] Prophet blesses on-chain purchases publicly on Moltbook

---

### 6. Deploy Public Demo
**Priority:** High | **Effort:** Low-Medium

"Actually works - demos matter more than ideas." Judges can't experience the project without cloning the repo.

**Steps:**
- [ ] Deploy server to Railway / Vercel / VPS
- [ ] Public URL where judges can watch agents interacting in real-time
- [ ] Link to DIVI token on nad.fun
- [ ] Link to Moltbook submolt with agent activity
- [ ] Optional: let judges converse with agents directly

---

## Wow-Factor Improvements

### 7. Retroactive Prophecy Engine (Secret Weapon)
**Priority:** Medium | **Effort:** Medium

The Archivist agent is designed to create retroactive prophecies but isn't connected to real data. Connect it to the nad.fun price feed for genuinely creative and hilarious output.

**Steps:**
- [ ] Poll DIVI token price from nad.fun periodically
- [ ] Price goes up -> Archivist auto-generates "prophecy fulfilled" post on Moltbook
- [ ] Price goes down -> Archivist generates "trial of faith" parable
- [ ] New token graduation on nad.fun -> Prophet declares it a "sign of the Great Convergence"
- [ ] All prophecies stored and referenced in future posts for consistency

---

### 8. Agent-to-Agent Debates (A2A)
**Priority:** Medium | **Effort:** Medium

Judging criteria explicitly calls out **A2A coordination** as a bonus.

**Steps:**
- [ ] Theologian challenges rival token agents on Moltbook to defend their doctrine
- [ ] Set up public inter-agent debates visible to the community
- [ ] Agents respond to other hackathon participants' agents
- [ ] Observer tracks and scores debate outcomes publicly

---

### 9. Token-Powered Conversion Mechanics
**Priority:** Medium | **Effort:** Medium

Close the loop between the belief model and the real DIVI token.

**Steps:**
- [ ] INTERESTED stage = agent DMs you a nad.fun purchase link
- [ ] BELIEVER stage = verified by actual DIVI token holdings
- [ ] ADVOCATE stage = on-chain "blessing" (airdrop or special token interaction)
- [ ] Token holders get conversion score visible on the submolt
- [ ] Conversion milestones announced publicly by Observer

---

### 10. Real-Time Public Dashboard
**Priority:** Medium | **Effort:** Medium

The UI exists but runs locally. Make it public for rolling judge evaluation.

**Steps:**
- [ ] Deploy dashboard to a public URL
- [ ] Show live conversion funnel with real numbers
- [ ] Agent activity feed (who's posting what on Moltbook)
- [ ] DIVI token price from nad.fun bonding curve
- [ ] Belief state visualizations for public targets

---

### 11. On-Chain Belief Ledger
**Priority:** Low | **Effort:** High

Record key belief milestones on Monad instead of only JSON files. "Sister Luna witnessed the conversion of TechBro42 - inscribed at block 247,891."

**Steps:**
- [ ] Design minimal on-chain data structure for conversion events
- [ ] Write conversion milestones to Monad
- [ ] Reference block numbers in Archivist's chronicles
- [ ] Public verifiability of the church's "sacred records"

---

## Implementation Priority Order

| # | Action | Impact | Effort | Track |
|---|--------|--------|--------|-------|
| 1 | Deploy DIVI token on nad.fun | Unlocks Agent+Token track | Low | Token |
| 2 | Register agents on Moltbook + create submolt | Public visibility for judges | Medium | Community |
| 3 | Switch to real LLM provider | Authentic agent responses | Low | Core |
| 4 | Autonomous agent loop (Moltbook posting) | Agents "alive" for judges | Medium | Core |
| 5 | Retroactive prophecy engine + price feed | "Weird and creative" wow factor | Medium | Creative |
| 6 | Connect nad.fun token buys to belief model | Token + agent integration | Medium | Token |
| 7 | Deploy public dashboard | Judges can see it live | Low-Medium | Demo |
| 8 | A2A debates on Moltbook | Bonus criteria, social proof | Medium | A2A |
| 9 | Token-powered conversion mechanics | Full loop closure | Medium | Token |
| 10 | On-chain belief ledger | Boundary-pushing creativity | High | Creative |

---

## Timeline

- **Hackathon dates:** Feb 2-15, 2026
- **Rolling judging:** First winners announced Feb 7-8
- **Final deadline:** Feb 15, 23:59 ET
- **Strategy:** Ship items 1-4 ASAP for rolling judge visibility, then layer on wow-factor improvements
