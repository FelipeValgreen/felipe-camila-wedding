class AIProviderInterface {
  constructor(mode = 'active', maxToolCalls = 5) {
    this.mode = mode;
    this.maxToolCalls = maxToolCalls;
  }

  async createTurn(input) {
    // Check kill switch
    if (this.mode === 'human_only') {
      return { type: 'handoff', reason: 'AI concierge is in human_only override mode.' };
    }
    
    // Abstract interface resolver
    return this._processTurn(input);
  }

  async _processTurn(input) {
    throw new Error('Not implemented');
  }
}

// 1. OpenAI Adapter Mock
class OpenAIWeddingProvider extends AIProviderInterface {
  async _processTurn(input) {
    const text = input.recentMessages[input.recentMessages.length - 1]?.text_content || '';
    
    // Simulate latency and token usage
    const metadata = {
      provider: 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      latencyMs: 120,
      usage: { prompt_tokens: 150, completion_tokens: 45 }
    };

    // Factual answers from knowledge base
    if (text.toLowerCase().includes('hora') || text.toLowerCase().includes('ceremonia')) {
      const fact = input.approvedKnowledge.find(k => k.topic === 'ceremony');
      return { type: 'message', text: fact.content, confidence: 0.98, metadata };
    }

    // Tool trigger tests: Confirm attendance
    if (text.toLowerCase().includes('confirmo') || text.toLowerCase().includes('asistiré')) {
      return {
        type: 'tool_call',
        tool: 'confirm_attendance',
        arguments: { dietaryRestriction: 'none', dietaryDetail: '' },
        confirmationRequired: true,
        metadata
      };
    }

    // Handoff tests
    if (text.toLowerCase().includes('humano') || text.toLowerCase().includes('operador') || text.toLowerCase().includes('hijo')) {
      return {
        type: 'handoff',
        reason: 'Guest explicitly requested human operator support or asked an exception.',
        metadata
      };
    }

    // Fallback uncertainty response
    return {
      type: 'uncertain',
      text: 'Lo siento, no tengo confirmada esa información todavía en mi base. Prefiero dejar tu consulta al equipo del matrimonio para que te respondan.',
      reason: 'No matching verified knowledge found in system context.',
      metadata
    };
  }
}

// 2. Gemini Adapter Mock
class GeminiWeddingProvider extends AIProviderInterface {
  async _processTurn(input) {
    const text = input.recentMessages[input.recentMessages.length - 1]?.text_content || '';

    const metadata = {
      provider: 'gemini',
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      latencyMs: 145,
      usage: { prompt_tokens: 180, completion_tokens: 50 }
    };

    if (text.toLowerCase().includes('hora') || text.toLowerCase().includes('ceremonia')) {
      const fact = input.approvedKnowledge.find(k => k.topic === 'ceremony');
      return { type: 'message', text: fact.content, confidence: 0.99, metadata };
    }

    if (text.toLowerCase().includes('confirmo') || text.toLowerCase().includes('asistiré')) {
      return {
        type: 'tool_call',
        tool: 'confirm_attendance',
        arguments: { dietaryRestriction: 'none', dietaryDetail: '' },
        confirmationRequired: true,
        metadata
      };
    }

    if (text.toLowerCase().includes('humano') || text.toLowerCase().includes('operador') || text.toLowerCase().includes('hijo')) {
      return {
        type: 'handoff',
        reason: 'Guest explicitly requested human operator support or asked an exception.',
        metadata
      };
    }

    return {
      type: 'uncertain',
      text: 'Disculpa, esa información no está en mis registros. Dejaré tu pregunta con los novios para que te escriban.',
      reason: 'Unresolved query mapping outside knowledge boundary.',
      metadata
    };
  }
}

// Factory to resolve adapter based on environment variable
function getAIProvider(providerName, mode, maxToolCalls) {
  if (providerName === 'gemini') {
    return new GeminiWeddingProvider(mode, maxToolCalls);
  }
  return new OpenAIWeddingProvider(mode, maxToolCalls);
}

module.exports = {
  getAIProvider,
  OpenAIWeddingProvider,
  GeminiWeddingProvider
};
