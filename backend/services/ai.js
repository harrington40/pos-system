/**
 * AI Service - Unified interface for DeepSeek (OpenAI removed)
 * Uses axios for all API calls
 */

const axios = require('axios');

class AIService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'deepseek';
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    this.openaiApiKey = process.env.OPENAI_API_KEY;

    if (!this.deepseekApiKey && !this.openaiApiKey) {
      console.warn('[AI Service] No API keys configured. AI features will be unavailable.');
    }
  }

  /**
   * Generate response using configured AI provider
   * @param {string} prompt - The prompt to send to AI
   * @param {object} options - Configuration options
   * @returns {Promise<string>} - AI response
   */
  async generate(prompt, options = {}) {
    const {
      model = 'deepseek-chat',
      temperature = 0.7,
      maxTokens = 1000,
      systemPrompt = 'You are a helpful assistant for a POS system.',
    } = options;

    try {
      if (this.provider === 'deepseek' || this.provider === 'openai') {
        return await this._generateWithAxios(prompt, { model, temperature, maxTokens, systemPrompt });
      } else {
        throw new Error(`Unknown AI provider: ${this.provider}`);
      }
    } catch (error) {
      console.error(`[AI Service] Error generating response:`, error.message);
      throw error;
    }
  }

  /**
   * Generic AI API call via axios (works with both DeepSeek and OpenAI-compatible APIs)
   */
  async _generateWithAxios(prompt, options) {
    const apiKey = this.provider === 'deepseek' ? this.deepseekApiKey : this.openaiApiKey;
    const baseUrl = this.provider === 'deepseek'
      ? 'https://api.deepseek.com'
      : 'https://api.openai.com/v1';

    if (!apiKey) {
      throw new Error(`${this.provider === 'deepseek' ? 'DeepSeek' : 'OpenAI'} API key not configured`);
    }

    try {
      const response = await axios.post(`${baseUrl}/chat/completions`, {
        model: options.model,
        messages: [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      throw new Error(`${this.provider === 'deepseek' ? 'DeepSeek' : 'OpenAI'} API error: ${error.message}`);
    }
  }

  /**
   * Debug/analyze POS system data
   * @param {object} data - Data to analyze
   * @param {string} context - Context for analysis
   * @returns {Promise<string>} - Analysis result
   */
  async analyzeData(data, context = '') {
    const prompt = `Analyze the following POS system data and provide insights:\n\nContext: ${context}\n\nData:\n${JSON.stringify(data, null, 2)}`;
    
    return this.generate(prompt, {
      systemPrompt: 'You are an expert POS system analyst. Provide concise, actionable insights about the data provided.',
      temperature: 0.5,
    });
  }

  /**
   * Debug code or errors
   * @param {string} code - Code to debug
   * @param {string} error - Error message
   * @returns {Promise<string>} - Debugging suggestions
   */
  async debugCode(code, error) {
    const prompt = `Debug this code issue:\n\nCode:\n\`\`\`\n${code}\n\`\`\`\n\nError:\n${error}\n\nProvide a fix and explanation.`;
    
    return this.generate(prompt, {
      systemPrompt: 'You are an expert JavaScript/Node.js debugger. Provide clear, practical debugging suggestions.',
      temperature: 0.3,
      maxTokens: 1500,
    });
  }

  /**
   * Orchestrate a multi-step AI task
   * @param {array} steps - Array of prompts to execute sequentially
   * @param {object} context - Shared context between steps
   * @returns {Promise<array>} - Results from each step
   */
  async orchestrate(steps, context = {}) {
    const results = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      let prompt = step.prompt;

      // Replace context variables in prompt
      for (const [key, value] of Object.entries(context)) {
        prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }

      try {
        const result = await this.generate(prompt, step.options || {});
        results.push(result);
        context[`step_${i}_result`] = result;
      } catch (error) {
        console.error(`[AI Service] Step ${i} failed:`, error.message);
        results.push(null);
      }
    }

    return results;
  }

  /**
   * Check if AI is properly configured
   * @returns {boolean}
   */
  isConfigured() {
    if (this.provider === 'openai') {
      return !!this.openaiApiKey;
    } else if (this.provider === 'deepseek') {
      return !!this.deepseekApiKey;
    }
    return false;
  }

  /**
   * Get current configuration info (for debugging)
   * @returns {object}
   */
  getConfig() {
    return {
      provider: this.provider,
      configured: this.isConfigured(),
      hasOpenAIKey: !!this.openaiApiKey,
      hasDeepSeekKey: !!this.deepseekApiKey,
    };
  }
}

module.exports = new AIService();
