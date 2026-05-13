const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');

/**
 * POST /api/transactions/init
 * Create a new transaction (state: NEW)
 * Always succeeds if register is available or creates anyway (non-blocking)
 */
router.post('/init', async (req, res) => {
  try {
    const { registerId = 'default', orderData, customerPhone, customerName, optInMarketing } = req.body;

    // Check if register is locked by a PAYMENT_IN_PROGRESS transaction
    const isAvailable = await Transaction.isRegisterAvailable(registerId);
    if (!isAvailable) {
      const active = await Transaction.getActiveTransaction(registerId);

      // Auto-resolve stale PAYMENT_IN_PROGRESS transactions (older than 2 minutes)
      // This prevents stuck transactions from blocking the register indefinitely
      if (active && active.state === 'PAYMENT_IN_PROGRESS' && active.startedAt) {
        const elapsed = Date.now() - new Date(active.startedAt).getTime();
        const STALE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
        if (elapsed > STALE_TIMEOUT_MS) {
          console.log(`[Transaction] Auto-holding stale PAYMENT_IN_PROGRESS transaction ${active._id} (${Math.round(elapsed / 1000)}s old)`);
          try {
            await active.transitionTo('ON_HOLD', {
              reason: 'Auto-held stale transaction',
              errorCode: 'STALE_TIMEOUT',
              onHoldAt: new Date(),
            });
            // Register is now free — create the new transaction
            const transaction = await Transaction.create({
              registerId,
              state: 'NEW',
              orderData: orderData || null,
              customerPhone: customerPhone || '',
              customerName: customerName || '',
              optInMarketing: optInMarketing || false,
            });
            return res.status(201).json({
              transaction,
              autoResolved: true,
              previousTransaction: { _id: active._id, state: 'ON_HOLD' },
            });
          } catch (holdErr) {
            console.error('[Transaction] Failed to auto-hold stale transaction:', holdErr.message);
            // Fall through to 409 if auto-hold fails
          }
        }
      }

      // Also return held transactions so UI can show them
      const heldTxs = await Transaction.getOnHoldTransactions(registerId);
      return res.status(409).json({
        error: 'Register is currently processing a payment',
        activeTransaction: {
          _id: active._id,
          state: active.state,
          startedAt: active.startedAt,
        },
        heldTransactions: heldTxs,
      });
    }

    const transaction = await Transaction.create({
      registerId,
      state: 'NEW',
      orderData: orderData || null,
      customerPhone: customerPhone || '',
      customerName: customerName || '',
      optInMarketing: optInMarketing || false,
    });

    res.status(201).json({ transaction });
  } catch (err) {
    console.error('[Transaction] Init error:', err);
    res.status(500).json({ error: 'Failed to initialize transaction' });
  }
});

/**
 * POST /api/transactions/:id/start
 * Move transaction from NEW → IN_PROGRESS
 */
router.post('/:id/start', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await transaction.transitionTo('IN_PROGRESS');
    res.json({ transaction });
  } catch (err) {
    console.error('[Transaction] Start error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/transactions/:id/retry
 * Retry a FAILED transaction (FAILED → NEW → IN_PROGRESS)
 * This allows re-initializing a failed transaction without losing audit trail
 */
router.post('/:id/retry', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.state !== 'FAILED') {
      return res.status(400).json({
        error: `Cannot retry transaction in state: ${transaction.state}. Must be FAILED.`,
      });
    }

    // FAILED → NEW
    await transaction.transitionTo('NEW', {
      error: '',
      errorCode: '',
    });

    // NEW → IN_PROGRESS
    await transaction.transitionTo('IN_PROGRESS');

    res.json({ transaction });
  } catch (err) {
    console.error('[Transaction] Retry error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/transactions/:id/pay
 * Move transaction from IN_PROGRESS → PAYMENT_IN_PROGRESS
 * This is the ONLY state that locks the register
 */
router.post('/:id/pay', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Double-check register availability
    const isAvailable = await Transaction.isRegisterAvailable(transaction.registerId);
    if (!isAvailable && transaction.state !== 'PAYMENT_IN_PROGRESS') {
      const active = await Transaction.getActiveTransaction(transaction.registerId);
      return res.status(409).json({
        error: 'Register is locked by another payment in progress',
        activeTransaction: active,
      });
    }

    await transaction.transitionTo('PAYMENT_IN_PROGRESS', {
      gatewayRef: req.body.gatewayRef || '',
    });

    res.json({ transaction });
  } catch (err) {
    console.error('[Transaction] Pay error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/transactions/:id/complete
 * Move transaction from PAYMENT_IN_PROGRESS → COMPLETED
 * Releases the register
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await transaction.transitionTo('COMPLETED', {
      orderId: req.body.orderId || null,
      gatewayRef: req.body.gatewayRef || transaction.paymentGatewayRef,
    });

    res.json({ transaction });
  } catch (err) {
    console.error('[Transaction] Complete error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/transactions/:id/hold
 * Move transaction to ON_HOLD (from PAYMENT_IN_PROGRESS, NEW, or IN_PROGRESS)
 * CRITICAL: This releases the register immediately
 * Also saves orderData (cart items) if provided
 */
router.post('/:id/hold', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Save orderData (cart items) if provided — this is how we persist the cart
    if (req.body.orderData) {
      transaction.orderData = req.body.orderData;
    }

    await transaction.transitionTo('ON_HOLD', {
      error: req.body.reason || 'Payment interrupted - placed on hold',
      errorCode: req.body.errorCode || 'USER_INTERRUPT',
    });

    // ── Register is now AVAILABLE for next customer ──
    res.json({
      transaction,
      message: 'Transaction placed on hold. Register is now available for next customer.',
      registerAvailable: true,
    });
  } catch (err) {
    console.error('[Transaction] Hold error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/transactions/:id/fail
 * Move transaction to FAILED
 */
router.post('/:id/fail', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await transaction.transitionTo('FAILED', {
      error: req.body.reason || 'Payment failed',
      errorCode: req.body.errorCode || 'PAYMENT_FAILED',
    });

    res.json({ transaction });
  } catch (err) {
    console.error('[Transaction] Fail error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/transactions/:id/cancel
 * Cancel a transaction (from NEW, IN_PROGRESS, or ON_HOLD)
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await transaction.transitionTo('CANCELLED', {
      error: req.body.reason || 'Cancelled by user',
      errorCode: 'USER_CANCELLED',
    });

    res.json({ transaction });
  } catch (err) {
    console.error('[Transaction] Cancel error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/transactions/:id/resume
 * Resume an ON_HOLD transaction back to PAYMENT_IN_PROGRESS
 * First verifies payment status with gateway to prevent duplicate charges
 */
router.post('/:id/resume', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.state !== 'ON_HOLD') {
      return res.status(400).json({
        error: `Cannot resume transaction in state: ${transaction.state}. Must be ON_HOLD.`,
      });
    }

    // ── Safety: Verify payment status with gateway before resuming ──
    // This prevents duplicate charges if the payment actually went through
    let paymentStatus = null;
    if (transaction.paymentGatewayRef) {
      try {
        // Simulate gateway check — in production, call actual payment gateway
        paymentStatus = await checkPaymentGateway(transaction.paymentGatewayRef);
      } catch (gatewayErr) {
        console.warn('[Transaction] Gateway check failed:', gatewayErr.message);
        // If gateway is unreachable, we still allow resume
        // but log the warning for audit
        transaction.errorLog.push({
          timestamp: new Date(),
          message: `Gateway check failed: ${gatewayErr.message}`,
          code: 'GATEWAY_UNREACHABLE',
        });
        await transaction.save();
      }
    }

    if (paymentStatus === 'SUCCESS') {
      // Payment already went through — complete the transaction
      await transaction.transitionTo('COMPLETED', {
        error: 'Payment already confirmed by gateway on resume',
        errorCode: 'ALREADY_COMPLETED',
      });
      return res.json({
        transaction,
        message: 'Payment was already completed. Transaction finalized.',
        alreadyCompleted: true,
      });
    }

    // Safe to resume — move back to PAYMENT_IN_PROGRESS
    await transaction.transitionTo('PAYMENT_IN_PROGRESS', {
      error: '',
      errorCode: '',
    });

    res.json({
      transaction,
      message: 'Transaction resumed. You may retry payment.',
    });
  } catch (err) {
    console.error('[Transaction] Resume error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/transactions/register/:registerId/status
 * Check register status and any active/on-hold transactions
 */
router.get('/register/:registerId/status', async (req, res) => {
  try {
    const { registerId } = req.params;
    const isAvailable = await Transaction.isRegisterAvailable(registerId);
    const activeTransaction = await Transaction.getActiveTransaction(registerId);
    const onHoldTransactions = await Transaction.getOnHoldTransactions(registerId);

    res.json({
      registerId,
      registerAvailable: isAvailable,
      activeTransaction: activeTransaction || null,
      onHoldCount: onHoldTransactions.length,
      onHoldTransactions,
    });
  } catch (err) {
    console.error('[Transaction] Register status error:', err);
    res.status(500).json({ error: 'Failed to get register status' });
  }
});

/**
 * GET /api/transactions/held
 * Get all ON_HOLD transactions (across all registers)
 * Used by HeldTransactionsPanel for polling
 */
router.get('/held', async (req, res) => {
  try {
    const transactions = await Transaction.find({ state: 'ON_HOLD' })
      .sort({ updatedAt: -1 })
      .limit(20);
    res.json({ transactions });
  } catch (err) {
    console.error('[Transaction] Get held error:', err);
    res.status(500).json({ error: 'Failed to get held transactions' });
  }
});

/**
 * GET /api/transactions/:id
 * Get a single transaction by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ transaction });
  } catch (err) {
    console.error('[Transaction] Get error:', err);
    res.status(500).json({ error: 'Failed to get transaction' });
  }
});

/**
 * POST /api/transactions/cleanup
 * Manual trigger to delete expired held transactions (older than 2 hours)
 */
router.post('/cleanup', async (req, res) => {
  try {
    const timeoutMs = req.body.timeoutMs || 2 * 60 * 60 * 1000; // default 2 hours
    const deleted = await Transaction.deleteExpiredHeldTransactions(timeoutMs);
    res.json({
      deleted,
      message: `Deleted ${deleted} expired held transaction(s)`,
    });
  } catch (err) {
    console.error('[Transaction] Cleanup error:', err);
    res.status(500).json({ error: 'Failed to cleanup transactions' });
  }
});

/**
 * POST /api/transactions/auto-hold
 * Safety-net: auto-hold a transaction on payment error
 * Always succeeds (best-effort) — never blocks the register
 */
router.post('/auto-hold', async (req, res) => {
  try {
    const { transactionId, reason, orderData } = req.body;
    if (!transactionId) {
      return res.json({ held: false, registerAvailable: true });
    }
    const tx = await Transaction.autoHoldOnError(transactionId, reason, orderData);
    res.json({
      held: !!tx,
      transaction: tx,
      registerAvailable: true,
    });
  } catch (err) {
    // Always return success — this is a non-critical cleanup
    console.error('[Transaction] Auto-hold error:', err.message);
    res.json({ held: false, registerAvailable: true });
  }
});

/**
 * Simulate a payment gateway check
 * In production, replace with actual gateway API call
 */
async function checkPaymentGateway(gatewayRef) {
  // Simulate network call
  await new Promise(resolve => setTimeout(resolve, 100));
  // For simulation, return null (unknown) so resume proceeds
  // In production, call the actual payment provider API
  return null;
}

module.exports = router;
