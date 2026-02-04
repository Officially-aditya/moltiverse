/**
 * Response Parser
 *
 * Extracts structured data from LLM responses
 */

// =============================================================================
// OBJECTION PATTERNS
// =============================================================================

const OBJECTION_PATTERNS = {
  scam_accusation: [
    /scam/i, /fraud/i, /ponzi/i, /rug\s*pull/i, /fake/i,
    /stealing/i, /theft/i, /con\s*artist/i
  ],
  cult_comparison: [
    /cult/i, /brainwash/i, /indoctrinat/i, /sect/i,
    /manipulation/i, /control/i
  ],
  technical_doubt: [
    /how does it (actually )?work/i, /technical(ly)?/i, /prove/i,
    /evidence/i, /audit/i, /code/i, /smart contract/i
  ],
  financial_risk: [
    /lose money/i, /risk/i, /investment/i, /guarantee/i,
    /return/i, /profit/i, /afford/i
  ],
  competitor_loyalty: [
    /bitcoin/i, /ethereum/i, /already (have|use|own)/i,
    /prefer/i, /better than/i, /why not just/i
  ],
  time_waste: [
    /waste.*(time|money)/i, /not interested/i, /leave me alone/i,
    /stop/i, /busy/i, /don't care/i
  ],
  too_good_to_be_true: [
    /too good/i, /sounds like/i, /catch/i, /what's the catch/i,
    /suspicious/i, /believe/i
  ],
  privacy_concerns: [
    /privacy/i, /data/i, /tracking/i, /anonymous/i,
    /personal information/i, /kyc/i
  ]
};

// =============================================================================
// POSITIVE SIGNAL PATTERNS
// =============================================================================

const POSITIVE_PATTERNS = {
  question_about_doctrine: [
    /tell me more/i, /how does/i, /what is/i, /explain/i,
    /curious/i, /interested in/i, /want to (know|learn|understand)/i
  ],
  uses_sacred_vocabulary: [
    /divi/i, /sacred/i, /decentrali[sz]/i, /consensus/i,
    /ledger/i, /covenant/i, /faithful/i
  ],
  personal_struggle_shared: [
    /i('ve| have) been/i, /my experience/i, /happened to me/i,
    /struggling with/i, /looking for/i, /need/i
  ],
  financial_interest: [
    /how (do i |can i )?buy/i, /invest/i, /token/i, /price/i,
    /where can i/i, /get started/i
  ],
  community_interest: [
    /community/i, /discord/i, /join/i, /meet/i,
    /other (people|members)/i, /events/i
  ],
  agreement: [
    /makes sense/i, /i agree/i, /you're right/i, /good point/i,
    /never thought of it/i, /interesting/i
  ]
};

// =============================================================================
// RESPONSE PARSER CLASS
// =============================================================================

class ResponseParser {
  /**
   * Detect objections in user message
   */
  static detectObjections(message) {
    const detected = [];

    for (const [objectionType, patterns] of Object.entries(OBJECTION_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          detected.push({
            type: objectionType,
            pattern: pattern.source,
            confidence: 0.8
          });
          break;
        }
      }
    }

    return detected;
  }

  /**
   * Detect positive signals in user message
   */
  static detectPositiveSignals(message) {
    const detected = [];

    for (const [signalType, patterns] of Object.entries(POSITIVE_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          detected.push({
            type: signalType,
            pattern: pattern.source,
            confidence: 0.7
          });
          break;
        }
      }
    }

    return detected;
  }

  /**
   * Analyze sentiment of message
   */
  static analyzeSentiment(message) {
    const positiveWords = [
      'good', 'great', 'love', 'like', 'interesting', 'amazing',
      'thanks', 'helpful', 'agree', 'yes', 'definitely', 'absolutely'
    ];
    const negativeWords = [
      'bad', 'hate', 'dislike', 'boring', 'scam', 'fake',
      'no', 'never', 'wrong', 'stupid', 'waste', 'terrible'
    ];

    const words = message.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
      if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
    }

    const total = positiveCount + negativeCount;
    if (total === 0) return { score: 0, label: 'neutral' };

    const score = (positiveCount - negativeCount) / total;

    let label = 'neutral';
    if (score > 0.3) label = 'positive';
    else if (score < -0.3) label = 'negative';

    return { score, label, positiveCount, negativeCount };
  }

  /**
   * Extract questions from message
   */
  static extractQuestions(message) {
    const questions = [];
    const sentences = message.split(/[.!?]+/);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.endsWith('?') || /^(what|how|why|when|where|who|can|do|is|are|will|would|should)/i.test(trimmed)) {
        questions.push(trimmed);
      }
    }

    return questions;
  }

  /**
   * Determine recommended event based on message analysis
   */
  static inferEvent(message) {
    const objections = this.detectObjections(message);
    const positives = this.detectPositiveSignals(message);
    const sentiment = this.analyzeSentiment(message);

    // Check for negative events first
    if (objections.length > 0) {
      const objection = objections[0];
      switch (objection.type) {
        case 'scam_accusation':
        case 'cult_comparison':
          return sentiment.score < -0.3 ? 'public_hostile_criticism' : 'skeptical_questioning';
        case 'time_waste':
          return 'dismissive_language';
        case 'competitor_loyalty':
          return 'promotes_competitor';
        default:
          return 'skeptical_questioning';
      }
    }

    // Check for positive events
    if (positives.length > 0) {
      const positive = positives[0];
      return positive.type;
    }

    // Default based on sentiment
    if (sentiment.label === 'positive') {
      return 'question_about_doctrine';
    } else if (sentiment.label === 'negative') {
      return 'dismissive_language';
    }

    return null;
  }

  /**
   * Full analysis of a message
   */
  static analyze(message) {
    return {
      objections: this.detectObjections(message),
      positiveSignals: this.detectPositiveSignals(message),
      sentiment: this.analyzeSentiment(message),
      questions: this.extractQuestions(message),
      inferredEvent: this.inferEvent(message),
      wordCount: message.split(/\s+/).length,
      timestamp: Date.now()
    };
  }

  /**
   * Check if message indicates conversation end
   */
  static isConversationEnd(message) {
    const endPatterns = [
      /\b(bye|goodbye|later|leave|stop|quit|exit|done)\b/i,
      /\b(not interested|go away|leave me alone)\b/i,
      /\b(thanks,? (that's all|i'm good|enough))\b/i
    ];

    return endPatterns.some(p => p.test(message));
  }

  /**
   * Check if message indicates high engagement
   */
  static isHighEngagement(message) {
    const analysis = this.analyze(message);
    return (
      analysis.questions.length >= 2 ||
      analysis.positiveSignals.length >= 2 ||
      analysis.wordCount >= 50 ||
      (analysis.sentiment.score > 0.5 && analysis.wordCount >= 20)
    );
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = ResponseParser;
module.exports.OBJECTION_PATTERNS = OBJECTION_PATTERNS;
module.exports.POSITIVE_PATTERNS = POSITIVE_PATTERNS;
