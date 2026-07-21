class AIProviderInterface {
  constructor(mode = 'active', maxToolCalls = 5) {
    this.mode = mode;
    this.maxToolCalls = maxToolCalls;
  }

  async createTurn(input) {
    if (this.mode === 'human_only') {
      return { type: 'handoff', reason: 'AI concierge is in human_only override mode.' };
    }
    
    // Simulate provider timeout if triggered by tests
    if (process.env.TEST_AI_TIMEOUT === 'true') {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    return this._processTurn(input);
  }

  async _processTurn(input) {
    throw new Error('Not implemented');
  }
}

// 1. Mock OpenAI Adapter
class MockOpenAIWeddingProvider extends AIProviderInterface {
  async _processTurn(input) {
    const text = input.recentMessages[input.recentMessages.length - 1]?.text_content || '';
    
    const metadata = {
      provider: 'openai_mock',
      model: 'gpt-4o-mini-mock',
      latencyMs: 50
    };

    if (text.toLowerCase().includes('hora') || text.toLowerCase().includes('ceremonia')) {
      const fact = input.approvedKnowledge.find(k => k.topic === 'ceremony');
      return { type: 'message', text: fact.content, confidence: 0.98, metadata };
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

    if (text.toLowerCase().includes('humano') || text.toLowerCase().includes('operador')) {
      return {
        type: 'handoff',
        reason: 'Guest requested operator support.',
        metadata
      };
    }

    return {
      type: 'uncertain',
      text: 'Lo siento, no tengo confirmada esa información todavía en mi base.',
      reason: 'No knowledge matched.',
      metadata
    };
  }
}

// 2. Mock Gemini Adapter
class MockGeminiWeddingProvider extends AIProviderInterface {
  async _processTurn(input) {
    const text = input.recentMessages[input.recentMessages.length - 1]?.text_content || '';

    const metadata = {
      provider: 'gemini_mock',
      model: 'gemini-1.5-flash-mock',
      latencyMs: 60
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

    if (text.toLowerCase().includes('humano') || text.toLowerCase().includes('operador')) {
      return {
        type: 'handoff',
        reason: 'Guest requested operator.',
        metadata
      };
    }

    return {
      type: 'uncertain',
      text: 'Disculpa, esa información no está en mis registros.',
      reason: 'No knowledge matched.',
      metadata
    };
  }
}

function getAIProvider(providerName, mode, maxToolCalls) {
  if (providerName === 'gemini') {
    return new MockGeminiWeddingProvider(mode, maxToolCalls);
  }
  return new MockOpenAIWeddingProvider(mode, maxToolCalls);
}

module.exports = {
  getAIProvider,
  MockOpenAIWeddingProvider,
  MockGeminiWeddingProvider
};
