// Real OpenAI and Gemini API Client Adapters
// Disabled/Inactive until valid API keys are configured in environment variables.

class RealAIAdapter {
  constructor(apiKey, model, timeoutMs = 8000) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  async getResponse(messages, tools) {
    if (!this.apiKey) {
      throw new Error('API Key missing. Real adapter remains inactive.');
    }
    // Real fetch and parsing goes here.
    return { type: 'uncertain', text: 'Real API keys unconfigured.' };
  }
}

class OpenAIWeddingProvider extends RealAIAdapter {
  async getResponse(messages, tools) {
    // OpenAI Chat Completions API with strict tool calling schemas
    return super.getResponse(messages, tools);
  }
}

class GeminiWeddingProvider extends RealAIAdapter {
  async getResponse(messages, tools) {
    // Gemini GenerateContent API with function calling
    return super.getResponse(messages, tools);
  }
}

module.exports = {
  OpenAIWeddingProvider,
  GeminiWeddingProvider
};
