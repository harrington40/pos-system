/**
 * AI Utilities - Helper functions for using AI in POS system
 * DEVELOPMENT ONLY - Not shipped with final product
 */

const aiService = require('./ai');

/**
 * Suggest order improvements based on current orders
 * @param {array} orders - Array of order objects
 * @returns {Promise<string>}
 */
async function suggestOrderOptimizations(orders) {
  const orderSummary = orders.map(o => ({
    id: o._id,
    items: o.items?.length,
    total: o.total,
    status: o.status,
  }));

  return aiService.analyzeData(orderSummary, 'Analyze these POS orders and suggest optimization strategies');
}

/**
 * Generate product recommendations based on inventory
 * @param {array} products - Array of product objects
 * @returns {Promise<string>}
 */
async function generateProductRecommendations(products) {
  const productSummary = products.map(p => ({
    name: p.name,
    price: p.price,
    sold: p.sold || 0,
    stock: p.stock || 'unknown',
  }));

  return aiService.analyzeData(productSummary, 'Based on these products, suggest which items should be promoted or restocked');
}

/**
 * Get AI help with a specific issue
 * @param {string} issue - Description of the issue
 * @param {string} context - Additional context
 * @returns {Promise<string>}
 */
async function getAIHelp(issue, context = '') {
  return aiService.generate(
    `POS System Issue: ${issue}\n${context ? `Context: ${context}` : ''}`,
    {
      systemPrompt: 'You are a POS system expert. Provide practical, immediate solutions.',
      temperature: 0.5,
    }
  );
}

/**
 * Implement a multi-step workflow orchestration
 * Example: Generate invoice -> Add items -> Calculate tax -> Apply discount
 * @param {object} orderData - Order information
 * @returns {Promise<array>}
 */
async function orchestrateOrderWorkflow(orderData) {
  const steps = [
    {
      prompt: 'Generate a professional invoice header for order {{orderId}} from {{storeName}} ordered at {{date}}',
      options: { maxTokens: 500 },
    },
    {
      prompt: 'List the items: {{items}} with their prices and quantities',
      options: { maxTokens: 500 },
    },
    {
      prompt: 'Calculate total with {{taxRate}}% tax and suggest {{discountType}} discount',
      options: { maxTokens: 500 },
    },
    {
      prompt: 'Generate thank you message and return policy based on previous results',
      options: { maxTokens: 500 },
    },
  ];

  return aiService.orchestrate(steps, orderData);
}

module.exports = {
  suggestOrderOptimizations,
  generateProductRecommendations,
  getAIHelp,
  orchestrateOrderWorkflow,
  aiService, // Direct access to aiService if needed
};
