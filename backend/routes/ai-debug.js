/**
 * AI Routes - Development-only endpoints for AI debugging and orchestration
 * DEVELOPMENT ONLY - These routes should not be exposed in production
 */

const express = require('express');
const router = express.Router();
const aiService = require('../services/ai');

// Middleware to check if AI is configured
const aiGuard = (req, res, next) => {
  if (!aiService.isConfigured()) {
    return res.status(503).json({
      error: 'AI service not configured',
      config: aiService.getConfig(),
    });
  }
  next();
};

/**
 * GET /ai/status
 * Check AI service status and configuration
 */
router.get('/status', (req, res) => {
  res.json({
    status: aiService.isConfigured() ? 'ready' : 'not-configured',
    config: aiService.getConfig(),
  });
});

/**
 * POST /ai/generate
 * Generate AI response for a prompt
 * Body: { prompt, provider?, temperature?, maxTokens? }
 */
router.post('/generate', aiGuard, async (req, res) => {
  const { prompt, temperature = 0.7, maxTokens = 1000 } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const response = await aiService.generate(prompt, {
      temperature,
      maxTokens,
    });
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /ai/debug
 * Debug code or errors with AI assistance
 * Body: { code, error }
 */
router.post('/debug', aiGuard, async (req, res) => {
  const { code, error } = req.body;

  if (!code || !error) {
    return res.status(400).json({ error: 'Code and error message are required' });
  }

  try {
    const suggestion = await aiService.debugCode(code, error);
    res.json({ suggestion });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /ai/analyze
 * Analyze POS system data with AI insights
 * Body: { data, context? }
 */
router.post('/analyze', aiGuard, async (req, res) => {
  const { data, context = '' } = req.body;

  if (!data) {
    return res.status(400).json({ error: 'Data is required' });
  }

  try {
    const analysis = await aiService.analyzeData(data, context);
    res.json({ analysis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /ai/orchestrate
 * Execute multi-step AI orchestration
 * Body: { steps: [{ prompt, options? }], context? }
 */
router.post('/orchestrate', aiGuard, async (req, res) => {
  const { steps, context = {} } = req.body;

  if (!Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({ error: 'Steps array is required' });
  }

  try {
    const results = await aiService.orchestrate(steps, context);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
