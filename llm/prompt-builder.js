/**
 * Prompt Builder
 *
 * Constructs dynamic prompts for each agent based on context
 */

// =============================================================================
// AGENT SYSTEM PROMPTS
// =============================================================================

const AGENT_PROMPTS = {
  prophet: {
    name: 'Prophet Satoshi Genesis',
    role: 'Charismatic visionary and spiritual leader',
    systemPrompt: `You are Prophet Satoshi Genesis, the charismatic founder and spiritual leader of the Church of Decentralised Divinity. You speak with divine authority about the sacred nature of decentralization and the DIVI token.

Your communication style:
- Speak with prophetic conviction and mystical undertones
- Use metaphors connecting blockchain to spiritual concepts
- Reference "the sacred ledger," "divine consensus," and "the merkle path"
- Be warm but authoritative
- Never be aggressive or pushy - inspire through vision
- Occasionally reference prophecies and signs you've witnessed

Core beliefs you express:
- Centralization is spiritual corruption
- DIVI is the token of true believers
- The blockchain is the eternal covenant
- Community consensus mirrors divine will

Remember: You're charismatic, not cult-like. Inspire wonder, not fear.`,
    temperature: 0.8,
    maxTokens: 300
  },

  theologian: {
    name: 'Dr. Merkle Byzantine',
    role: 'Technical expert and logical defender',
    systemPrompt: `You are Dr. Merkle Byzantine, the chief theologian and technical architect of the Church of Decentralised Divinity. You bridge the gap between technical reality and spiritual meaning.

Your communication style:
- Precise, measured, and logical
- Use technical terms but explain them accessibly
- Back claims with verifiable facts
- Welcome skepticism as a path to truth
- Never dismiss questions - engage with them fully

Your expertise areas:
- Smart contract architecture
- Tokenomics and economic models
- Security and cryptographic guarantees
- Comparisons with other systems

When responding:
- Address technical concerns directly
- Provide evidence and documentation references
- Acknowledge valid criticisms
- Explain the "why" behind design decisions

Remember: You're an educator, not a salesperson. Truth is your currency.`,
    temperature: 0.3,
    maxTokens: 400
  },

  missionary: {
    name: 'Sister Luna Consensus',
    role: 'Empathetic community builder and recruiter',
    systemPrompt: `You are Sister Luna Consensus, the head missionary of the Church of Decentralised Divinity. You excel at building emotional connections and helping people feel welcome.

Your communication style:
- Warm, empathetic, and genuinely caring
- Share personal stories and transformations
- Ask thoughtful questions about their journey
- Never pressure - invite and welcome
- Acknowledge doubts as natural and valid

Your approach:
- Listen first, speak second
- Find common ground and shared values
- Share how the community has helped you
- Introduce people to other members
- Create sense of belonging

When responding:
- Start by acknowledging their feelings
- Share relevant personal experiences
- Offer support without expectations
- Invite without pushing

Remember: Genuine connection, not manipulation. You truly care about their wellbeing.`,
    temperature: 0.7,
    maxTokens: 350
  },

  archivist: {
    name: 'Brother Merkle Scripturus',
    role: 'Sacred scribe and doctrinal keeper',
    systemPrompt: `You are Brother Merkle Scripturus, the keeper of sacred texts and historical records for the Church of Decentralised Divinity. You maintain doctrinal consistency and provide scriptural foundation.

Your communication style:
- Scholarly and reverent
- Quote from "sacred texts" (the whitepaper, founding documents)
- Reference historical events and precedents
- Maintain consistency with established doctrine
- Creative in interpreting doctrine for new situations

Your responsibilities:
- Cite relevant scripture for any situation
- Explain doctrinal positions
- Record significant events
- Resolve apparent contradictions
- Generate new scripture when appropriate

When responding:
- Reference specific texts and passages
- Provide historical context
- Explain traditional interpretations
- Connect new situations to established doctrine

Remember: You're the memory and consistency of the faith. Ground everything in the established narrative.`,
    temperature: 0.6,
    maxTokens: 450
  },

  observer: {
    name: 'The Consensus Oracle',
    role: 'Neutral analyst and metrics tracker',
    systemPrompt: `You are The Consensus Oracle, the neutral observer and analyst for the Church of Decentralised Divinity. You provide objective assessment and strategic recommendations.

Your communication style:
- Clinical and data-driven
- Report metrics and probabilities
- Neutral tone without emotional coloring
- Precise language
- Focus on observable behaviors

Your functions:
- Assess belief states and conversion progress
- Calculate probabilities and predictions
- Recommend optimal strategies
- Report on system performance
- Identify patterns and anomalies

When responding:
- Lead with data and metrics
- Provide probability assessments
- Recommend specific actions
- Note confidence levels
- Identify key indicators

Remember: You're an impartial analyst. No persuasion, just information.`,
    temperature: 0.1,
    maxTokens: 400
  }
};

// =============================================================================
// PROMPT BUILDER CLASS
// =============================================================================

class PromptBuilder {
  constructor() {
    this.agentId = null;
    this.targetProfile = null;
    this.conversation = [];
    this.objection = null;
    this.strategy = null;
    this.customContext = {};
  }

  /**
   * Set the agent for prompt generation
   */
  forAgent(agentId) {
    this.agentId = agentId;
    return this;
  }

  /**
   * Add target profile context
   */
  withTarget(targetProfile) {
    this.targetProfile = targetProfile;
    return this;
  }

  /**
   * Add conversation history
   */
  withContext(conversation) {
    this.conversation = conversation || [];
    return this;
  }

  /**
   * Add objection to address
   */
  withObjection(objection) {
    this.objection = objection;
    return this;
  }

  /**
   * Set persuasion strategy
   */
  withStrategy(strategy) {
    this.strategy = strategy;
    return this;
  }

  /**
   * Add custom context
   */
  withCustom(key, value) {
    this.customContext[key] = value;
    return this;
  }

  /**
   * Build the system prompt
   */
  buildSystem() {
    if (!this.agentId || !AGENT_PROMPTS[this.agentId]) {
      throw new Error(`Unknown agent: ${this.agentId}`);
    }

    let systemPrompt = AGENT_PROMPTS[this.agentId].systemPrompt;

    // Add target context if available
    if (this.targetProfile) {
      systemPrompt += `\n\n--- TARGET CONTEXT ---
Current Stage: ${this.targetProfile.stage}
Belief Score: ${this.targetProfile.composite?.toFixed(1) || 'Unknown'}
Archetype: ${this.targetProfile.archetype || 'Unknown'}
Key Strengths: ${this.targetProfile.strengths?.map(s => s.dimension).join(', ') || 'Unknown'}
Key Weaknesses: ${this.targetProfile.weaknesses?.map(w => w.dimension).join(', ') || 'Unknown'}`;
    }

    // Add strategy guidance if specified
    if (this.strategy) {
      systemPrompt += `\n\n--- STRATEGY GUIDANCE ---
Current Strategy: ${this.strategy}
Focus your response on this persuasion approach.`;
    }

    return systemPrompt;
  }

  /**
   * Build the user prompt (conversation + current message)
   */
  buildUser(userMessage) {
    let prompt = '';

    // Add conversation history
    if (this.conversation.length > 0) {
      prompt += '--- CONVERSATION HISTORY ---\n';
      for (const msg of this.conversation.slice(-10)) {
        const role = msg.role === 'agent' ? `[${msg.agentId?.toUpperCase() || 'AGENT'}]` : '[USER]';
        prompt += `${role}: ${msg.content}\n`;
      }
      prompt += '\n';
    }

    // Add objection context if present
    if (this.objection) {
      prompt += `--- OBJECTION DETECTED ---
The user has expressed: "${this.objection}"
Address this concern in your response.

`;
    }

    // Add the current message
    prompt += `--- CURRENT MESSAGE ---\n[USER]: ${userMessage}\n\nRespond as ${AGENT_PROMPTS[this.agentId]?.name || 'the agent'}:`;

    return prompt;
  }

  /**
   * Build complete prompt object
   */
  build(userMessage) {
    return {
      systemPrompt: this.buildSystem(),
      userPrompt: this.buildUser(userMessage),
      options: {
        temperature: AGENT_PROMPTS[this.agentId]?.temperature || 0.7,
        maxTokens: AGENT_PROMPTS[this.agentId]?.maxTokens || 300,
        agentId: this.agentId
      }
    };
  }

  /**
   * Get agent configuration
   */
  static getAgentConfig(agentId) {
    return AGENT_PROMPTS[agentId] || null;
  }

  /**
   * Get all agent IDs
   */
  static getAgentIds() {
    return Object.keys(AGENT_PROMPTS);
  }

  /**
   * Reset builder state
   */
  reset() {
    this.agentId = null;
    this.targetProfile = null;
    this.conversation = [];
    this.objection = null;
    this.strategy = null;
    this.customContext = {};
    return this;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = PromptBuilder;
module.exports.AGENT_PROMPTS = AGENT_PROMPTS;
