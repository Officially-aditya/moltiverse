/**
 * LLM Integration Layer
 *
 * Provider abstraction for multiple LLM backends
 */

const PromptBuilder = require('./prompt-builder');
const ResponseParser = require('./response-parser');

// =============================================================================
// BASE PROVIDER INTERFACE
// =============================================================================

class LLMProvider {
  constructor(config = {}) {
    this.config = config;
  }

  async generate(prompt, options = {}) {
    throw new Error('generate() must be implemented by provider');
  }

  async *generateStream(prompt, options = {}) {
    throw new Error('generateStream() must be implemented by provider');
  }
}

// =============================================================================
// MOCK PROVIDER (for demo/testing)
// =============================================================================

class MockProvider extends LLMProvider {
  constructor(config = {}) {
    super(config);
    this.responses = config.responses || {};
    this.defaultDelay = config.delay || 500;
  }

  async generate(prompt, options = {}) {
    await this._delay(this.defaultDelay);

    const agentId = options.agentId || 'default';
    const templates = this.responses[agentId] || this.responses.default || [];

    if (templates.length === 0) {
      return this._generateDefault(agentId, prompt);
    }

    const template = templates[Math.floor(Math.random() * templates.length)];
    return template;
  }

  async *generateStream(prompt, options = {}) {
    const response = await this.generate(prompt, options);
    const words = response.split(' ');

    for (const word of words) {
      await this._delay(50);
      yield word + ' ';
    }
  }

  _generateDefault(agentId, prompt) {
    const responses = {
      prophet: [
        "The sacred ledger reveals all truth to those who seek with open hearts. DIVI flows through the network of the faithful.",
        "I have seen in the merkle roots a future where centralization crumbles. Join us in this divine computation.",
        "The blockchain does not lie, and neither do the signs. Your presence here is no accident, seeker."
      ],
      theologian: [
        "Let me explain the technical foundation of our doctrine. The consensus mechanism ensures trustless verification.",
        "Your skepticism is valid and welcome. Let's examine the evidence systematically.",
        "The architecture we've built addresses your concerns through cryptographic guarantees."
      ],
      missionary: [
        "I understand how you feel. When I first heard about DIVI, I had the same doubts. Let me share my story.",
        "The community here is unlike anything I've experienced. People genuinely care about each other's journey.",
        "What draws you to explore this? I'd love to understand what you're looking for."
      ],
      archivist: [
        "As recorded in the Sacred Whitepaper, Section 3, Verse 7: 'The hash shall be the covenant.'",
        "Our historical records show consistent growth through dedication, not speculation.",
        "Let me retrieve the relevant scripture that addresses your inquiry."
      ],
      observer: [
        "Current metrics indicate a 73% positive sentiment trajectory. Engagement optimal.",
        "Analysis complete. Belief coherence score: 0.82. Recommend continued engagement.",
        "Data suggests high conversion probability. Key factors: emotional alignment, technical interest."
      ]
    };

    const agentResponses = responses[agentId] || responses.missionary;
    return agentResponses[Math.floor(Math.random() * agentResponses.length)];
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// OPENAI PROVIDER
// =============================================================================

class OpenAIProvider extends LLMProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.model = config.model || 'gpt-4';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async generate(prompt, options = {}) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: options.systemPrompt || '' },
          { role: 'user', content: prompt }
        ],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 500
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// =============================================================================
// ANTHROPIC PROVIDER
// =============================================================================

class AnthropicProvider extends LLMProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    this.model = config.model || 'claude-3-sonnet-20240229';
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
  }

  async generate(prompt, options = {}) {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        system: options.systemPrompt || '',
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 500
      })
    });

    const data = await response.json();
    return data.content[0].text;
  }
}

// =============================================================================
// PROVIDER FACTORY
// =============================================================================

function createProvider(type, config = {}) {
  switch (type) {
    case 'mock':
      return new MockProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    default:
      return new MockProvider(config);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  LLMProvider,
  MockProvider,
  OpenAIProvider,
  AnthropicProvider,
  createProvider,
  PromptBuilder,
  ResponseParser
};
