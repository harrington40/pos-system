/**
 * Payment Orchestrator Routes
 *
 * Exposes the PaymentOrchestrator service via REST API.
 * Integrates AI-powered orchestration with the existing POS transaction flow.
 *
 * POST /api/orchestrator/pay       - Full orchestrated payment
 * POST /api/orchestrator/resume    - Resume a held transaction
 * POST /api/orchestrator/retry     - Retry a failed transaction
 * GET  /api/orchestrator/status    - Circuit breaker + dead letter queue status
 * POST /api/orchestrator/reset     - Reset circuit breaker
 * POST /api/orchestrator/clear-dlq - Clear dead letter queue
 */

const express = require('express');
const router = express.Router();
const orchestrator = require('../services/paymentOrchestrator');
const Transaction = require('../models/Transaction');

/**
 * POST /api/orchestrator/pay
 * Full orchestrated payment with circuit breaker, idempotency, retry, and AI analysis.
 *
 * Body: {
 *   items: [{ _id, name, price, quantity, category }],
 *   paymentMethod: 'cash' | 'orange_money' | 'mtn_money',
 *   subtotal: number,
 *   tax: number,
 *   total: number,
 *   discountCode?: string,
 *   discountAmount?: number,
 *   discountType?: string,
 *   appliedDiscount?: { code, type },
 *   isMobileMoney?: boolean,
 *   mobileMoneyData?: { provider, phone, transactionId, initiationMode, verifiedBy },
 *   customerPhone?: string,
 *   customerName?: string,
 *   optInMarketing?: boolean,
 *   registerId?: string,
 *   useAI?: boolean  // Enable AI-assisted analysis
 * }
 */
router.post('/pay', async (req, res) => {
  try {
    const { useAI = false, ...paymentData } = req.body;

    const result = await orchestrator.orchestratePayment(paymentData, { useAI });

    if (!result.success) {
      // Determine appropriate HTTP status code
      let statusCode = 400;
      if (result.step === 'circuit_breaker') {
        statusCode = 503; // Service Unavailable
      } else if (result.step === 'validation') {
        statusCode = 422; // Unprocessable Entity
      }

      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('[Orchestrator] Pay error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message,
      step: 'route_error',
    });
  }
});

/**
 * POST /api/orchestrator/resume
 * Resume a held transaction with safety checks.
 *
 * Body: { transactionId: string }
 */
router.post('/resume', async (req, res) => {
  try {
    const { transactionId } = req.body;
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: 'transactionId is required',
      });
    }

    const result = await orchestrator.resumePayment(transactionId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('[Orchestrator] Resume error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/orchestrator/retry
 * Retry a failed transaction.
 *
 * Body: { transactionId: string }
 */
router.post('/retry', async (req, res) => {
  try {
    const { transactionId } = req.body;
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: 'transactionId is required',
      });
    }

    const result = await orchestrator.retryPayment(transactionId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('[Orchestrator] Retry error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/orchestrator/status
 * Get orchestrator status (circuit breaker + dead letter queue).
 */
router.get('/status', async (req, res) => {
  try {
    const circuitBreaker = orchestrator.getCircuitBreakerStatus();
    const deadLetterQueue = orchestrator.getDeadLetterQueue();

    res.json({
      circuitBreaker,
      deadLetterQueueCount: deadLetterQueue.length,
      deadLetterQueue: deadLetterQueue.slice(-10), // Last 10 entries
    });
  } catch (err) {
    console.error('[Orchestrator] Status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/orchestrator/reset
 * Reset circuit breaker manually.
 */
router.post('/reset', async (req, res) => {
  try {
    orchestrator.resetCircuitBreaker();
    res.json({
      message: 'Circuit breaker reset successfully',
      circuitBreaker: orchestrator.getCircuitBreakerStatus(),
    });
  } catch (err) {
    console.error('[Orchestrator] Reset error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/orchestrator/clear-dlq
 * Clear dead letter queue.
 */
router.post('/clear-dlq', async (req, res) => {
  try {
    orchestrator.clearDeadLetterQueue();
    res.json({ message: 'Dead letter queue cleared' });
  } catch (err) {
    console.error('[Orchestrator] Clear DLQ error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
