/**
 * Payment Orchestrator
 *
 * AI-powered payment orchestration service that wraps the existing POS
 * transaction flow with:
 *   - Circuit breaker pattern (prevents cascading failures)
 *   - Idempotency key support (prevents duplicate payments)
 *   - Retry with exponential backoff + jitter
 *   - Dead letter queue for failed transactions
 *   - AI-assisted error analysis via AIService
 *   - Correlation ID tracing
 *
 * Integrates with the existing Transaction state machine:
 *   NEW → IN_PROGRESS → PAYMENT_IN_PROGRESS → COMPLETED
 *                      ↘ ON_HOLD → PAYMENT_IN_PROGRESS (resume)
 *                      ↘ FAILED → NEW (retry)
 */

const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const InventoryLog = require('../models/InventoryLog');
const Customer = require('../models/Customer');
const aiService = require('./ai');

class PaymentOrchestrator {
  constructor() {
    // ── Idempotency Store (in-memory, TTL: 5 minutes) ──
    this.idempotencyStore = new Map();

    // ── Dead Letter Queue ──
    this.deadLetterQueue = [];

    // ── Circuit Breaker ──
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: null,
      isOpen: false,
      threshold: 3,
      resetTimeout: 30000, // 30 seconds
    };

    // ── Retry Configuration ──
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════

  /**
   * Main payment orchestration method.
   * Wraps the full checkout flow with AI-powered error handling,
   * circuit breaker, idempotency, and retry logic.
   *
   * @param {Object} paymentData - Payment request data
   * @param {Object} [options] - Orchestration options
   * @param {boolean} [options.useAI=false] - Enable AI-assisted analysis
   * @returns {Promise<Object>} Orchestration result
   */
  async orchestratePayment(paymentData, options = {}) {
    const correlationId = paymentData.correlationId || crypto.randomUUID();
    const { useAI = false } = options;

    const log = (msg, data = {}) => {
      console.log(`[PaymentOrchestrator:${correlationId}] ${msg}`, data);
    };

    log('Starting payment orchestration', {
      amount: paymentData.total,
      method: paymentData.paymentMethod,
      itemCount: paymentData.items?.length,
    });

    try {
      // ── Step 1: Validate input ──
      const validation = this._validatePaymentInput(paymentData);
      if (!validation.isValid) {
        log('Input validation failed', { errors: validation.errors });
        return {
          success: false,
          errors: validation.errors,
          correlationId,
          step: 'validation',
        };
      }

      // ── Step 2: Check circuit breaker ──
      if (this._isCircuitBreakerOpen()) {
        log('Circuit breaker is open — rejecting request');
        return {
          success: false,
          error: 'Payment service temporarily unavailable. Please try again later.',
          correlationId,
          step: 'circuit_breaker',
          circuitBreakerOpen: true,
        };
      }

      // ── Step 3: Check idempotency ──
      const idempotencyKey = this._generateIdempotencyKey(paymentData);
      const cachedResult = this._checkIdempotency(idempotencyKey);
      if (cachedResult) {
        log('Returning cached result (idempotent request)', { idempotencyKey });
        return {
          ...cachedResult,
          fromCache: true,
          correlationId,
        };
      }

      // ── Step 4: Execute payment with retry ──
      const result = await this._executeWithRetry(paymentData, correlationId, log);

      // ── Step 5: Store idempotency result ──
      this._storeIdempotency(idempotencyKey, result);

      // ── Step 6: AI-assisted analysis (optional) ──
      if (useAI && aiService.isConfigured()) {
        this._analyzeWithAI(result, paymentData, correlationId).catch(err => {
          log('AI analysis failed (non-blocking)', { error: err.message });
        });
      }

      log('Payment orchestration completed', {
        success: result.success,
        transactionId: result.transaction?._id,
        orderId: result.order?._id,
      });

      return {
        ...result,
        correlationId,
      };
    } catch (error) {
      const errorMsg = error.message || 'Unknown error';

      log('Payment orchestration failed with unhandled error', {
        error: errorMsg,
      });

      // ── Detect register lock errors — don't record as circuit breaker failure ──
      const lowerMsg = errorMsg.toLowerCase();
      const isRegisterLockError =
        lowerMsg.includes('register is locked') ||
        lowerMsg.includes('register was locked') ||
        lowerMsg.includes('register locked') ||
        lowerMsg.includes('register is busy') ||
        lowerMsg.includes('register_contention');

      if (!isRegisterLockError) {
        // Only record non-register-lock failures for circuit breaker
        this._recordFailure();

        // Add to dead letter queue
        this._addToDeadLetterQueue({
          paymentData,
          error: errorMsg,
          correlationId,
        });
      }

      return {
        success: false,
        error: errorMsg,
        correlationId,
        step: isRegisterLockError ? 'register_lock' : 'orchestration',
        ...(isRegisterLockError && { registerLocked: true }),
      };
    }
  }

  /**
   * Resume a held transaction with AI-powered safety checks.
   *
   * @param {string} transactionId - The held transaction ID
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async resumePayment(transactionId, options = {}) {
    const correlationId = crypto.randomUUID();
    const log = (msg, data = {}) => {
      console.log(`[PaymentOrchestrator:resume:${correlationId}] ${msg}`, data);
    };

    try {
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        return { success: false, error: 'Transaction not found', correlationId };
      }
      if (transaction.state !== 'ON_HOLD') {
        return {
          success: false,
          error: `Cannot resume transaction in state: ${transaction.state}`,
          correlationId,
        };
      }

      log('Resuming held transaction', {
        transactionId,
        state: transaction.state,
        paymentAttempts: transaction.paymentAttempts,
      });

      // ── Check register availability before resuming ──
      const registerId = transaction.registerId || 'default';
      const isAvailable = await Transaction.isRegisterAvailable(registerId);
      if (!isAvailable) {
        const active = await Transaction.getActiveTransaction(registerId);
        if (active && active._id.toString() !== transactionId) {
          // Another transaction is locking the register
          log('Register locked by another transaction', {
            activeId: active._id,
            activeState: active.state,
          });
          return {
            success: false,
            error: `Register is locked by another transaction (${active._id}). Please cancel or complete it first.`,
            correlationId,
            registerLocked: true,
          };
        }
        // If the active transaction IS this one (shouldn't happen for ON_HOLD), proceed
      }

      // ── Safety: Verify payment status with gateway ──
      let paymentStatus = null;
      if (transaction.paymentGatewayRef) {
        try {
          paymentStatus = await this._checkPaymentGateway(transaction.paymentGatewayRef);
        } catch (gatewayErr) {
          log('Gateway check failed (non-blocking)', { error: gatewayErr.message });
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
        log('Payment was already completed — finalized');
        return {
          success: true,
          transaction,
          message: 'Payment was already completed. Transaction finalized.',
          alreadyCompleted: true,
          correlationId,
        };
      }

      // ── Safe to resume — move back to PAYMENT_IN_PROGRESS ──
      await transaction.transitionTo('PAYMENT_IN_PROGRESS', {
        error: '',
        errorCode: '',
      });

      log('Transaction resumed successfully');
      return {
        success: true,
        transaction,
        message: 'Transaction resumed. You may retry payment.',
        correlationId,
      };
    } catch (error) {
      log('Resume failed', { error: error.message });
      return { success: false, error: error.message, correlationId };
    }
  }

  /**
   * Retry a failed transaction (FAILED → NEW → IN_PROGRESS).
   *
   * @param {string} transactionId
   * @returns {Promise<Object>}
   */
  async retryPayment(transactionId) {
    const correlationId = crypto.randomUUID();
    try {
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        return { success: false, error: 'Transaction not found', correlationId };
      }
      if (transaction.state !== 'FAILED') {
        return {
          success: false,
          error: `Cannot retry transaction in state: ${transaction.state}. Must be FAILED.`,
          correlationId,
        };
      }

      // FAILED → NEW
      await transaction.transitionTo('NEW', { error: '', errorCode: '' });
      // NEW → IN_PROGRESS
      await transaction.transitionTo('IN_PROGRESS');

      return { success: true, transaction, correlationId };
    } catch (error) {
      return { success: false, error: error.message, correlationId };
    }
  }

  /**
   * Get dead letter queue contents (for admin/monitoring).
   */
  getDeadLetterQueue() {
    return [...this.deadLetterQueue];
  }

  /**
   * Get circuit breaker status.
   */
  getCircuitBreakerStatus() {
    return { ...this.circuitBreaker };
  }

  /**
   * Reset circuit breaker manually.
   */
  resetCircuitBreaker() {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.lastFailureTime = null;
    this.circuitBreaker.isOpen = false;
  }

  /**
   * Clear dead letter queue.
   */
  clearDeadLetterQueue() {
    this.deadLetterQueue = [];
  }

  // ═══════════════════════════════════════════════════════════════
  //  PRIVATE: Payment Execution with Retry
  // ═══════════════════════════════════════════════════════════════

  /**
   * Execute the full payment flow with retry logic.
   * This wraps the existing POS transaction flow:
   *   init → start → pay → create order → complete
   */
  async _executeWithRetry(paymentData, correlationId, log) {
    let lastError = null;
    const maxRetries = this.retryConfig.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (this._isCircuitBreakerOpen()) {
          throw new Error('Circuit breaker is open. Service temporarily unavailable.');
        }

        const result = await this._executePaymentFlow(paymentData, correlationId, log);
        this._recordSuccess();
        return result;
      } catch (error) {
        lastError = error;

        // ── Don't retry register lock errors — they won't resolve with retries ──
        const msg = error.message.toLowerCase();
        const isRegisterLockError =
          msg.includes('register is locked') ||
          msg.includes('register was locked') ||
          msg.includes('register locked') ||
          msg.includes('register is busy') ||
          msg.includes('register_contention');

        if (isRegisterLockError) {
          log('Register lock error — not retrying', { error: error.message });
          throw error; // Throw immediately, no retry
        }

        this._recordFailure();

        if (attempt < maxRetries) {
          const delay = this._calculateBackoffDelay(attempt);
          log(`Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`, {
            error: error.message,
          });
          await this._sleep(delay);
        }
      }
    }

    // All retries exhausted — add to dead letter queue
    this._addToDeadLetterQueue({
      paymentData,
      error: lastError.message,
      correlationId,
      retriesExhausted: true,
    });

    throw lastError;
  }

  /**
   * Generate a sequential receipt number (mirrors orders.js logic).
   */
  async _generateReceiptNumber() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `RCP-${dateStr}-`;

    // Match only standard receipt numbers: RCP-YYYYMMDD-NNNN (4 digits)
    const lastOrder = await Order.findOne({
      receiptNumber: { $regex: `^${prefix}\\d{4}$` }
    }).sort({ receiptNumber: -1 });

    let seq = 1;
    if (lastOrder) {
      const parts = lastOrder.receiptNumber.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  /**
   * Execute the actual payment flow using the existing POS system.
   *
   * Flow:
   *   1. Create Transaction (NEW)
   *   2. Start Transaction (NEW → IN_PROGRESS)
   *   3. Pay Transaction (IN_PROGRESS → PAYMENT_IN_PROGRESS)
   *   4. Create Order (with receipt number, inventory deduction, customer tracking)
   *   5. Complete Transaction (PAYMENT_IN_PROGRESS → COMPLETED)
   */
  async _executePaymentFlow(paymentData, correlationId, log) {
    const {
      items,
      paymentMethod = 'cash',
      subtotal,
      tax,
      total,
      discountCode,
      discountAmount,
      discountType,
      appliedDiscount,
      isMobileMoney,
      mobileMoneyData,
      customerPhone,
      customerName,
      optInMarketing,
      registerId = 'default',
      gatewayRef = '',
    } = paymentData;

    let transaction = null;
    let order = null;

    // ── Step 0: Check register availability and auto-resolve ALL stale transactions ──
    log('Step 0: Checking register availability');
    const STALE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
    let isAvailable = await Transaction.isRegisterAvailable(registerId);
    if (!isAvailable) {
      // Find ALL stale PAYMENT_IN_PROGRESS transactions and resolve them all at once
      const staleTransactions = await Transaction.find({
        registerId,
        state: 'PAYMENT_IN_PROGRESS',
      }).sort({ createdAt: -1 });

      if (staleTransactions.length > 0) {
        let allStale = true;
        let anyResolved = false;
        for (const lockingTx of staleTransactions) {
          if (lockingTx.startedAt) {
            const elapsed = Date.now() - new Date(lockingTx.startedAt).getTime();
            if (elapsed > STALE_TIMEOUT_MS) {
              log('Auto-resolving stale PAYMENT_IN_PROGRESS transaction', {
                transactionId: lockingTx._id,
                ageSeconds: Math.round(elapsed / 1000),
              });
              try {
                await lockingTx.transitionTo('ON_HOLD', {
                  reason: 'Auto-held stale transaction by orchestrator',
                  errorCode: 'STALE_TIMEOUT',
                  onHoldAt: new Date(),
                });
                anyResolved = true;
                log('Stale transaction auto-resolved to ON_HOLD');
              } catch (holdErr) {
                log('Failed to auto-hold stale transaction', { error: holdErr.message, transactionId: lockingTx._id });
                allStale = false;
              }
            } else {
              allStale = false;
            }
          }
        }

        if (allStale && anyResolved) {
          // All were stale and at least one was resolved — re-check availability
          isAvailable = await Transaction.isRegisterAvailable(registerId);
          if (isAvailable) {
            log('All stale transactions resolved, register is now available');
          } else {
            // Some couldn't be resolved — throw
            throw new Error(
              `Register is locked by ${staleTransactions.length} stale transaction(s). ` +
              `Auto-resolve could not clear all of them.`
            );
          }
        } else if (!allStale) {
          // At least one transaction is recent — cannot proceed
          const recentTx = staleTransactions.find(t => {
            if (!t.startedAt) return false;
            return (Date.now() - new Date(t.startedAt).getTime()) <= STALE_TIMEOUT_MS;
          });
          const elapsed = recentTx.startedAt ? Math.round((Date.now() - new Date(recentTx.startedAt).getTime()) / 1000) : 0;
          const waitSeconds = Math.round((STALE_TIMEOUT_MS - (recentTx.startedAt ? Date.now() - new Date(recentTx.startedAt).getTime() : 0)) / 1000);
          log('Register locked by active transaction', {
            transactionId: recentTx._id,
            state: recentTx.state,
            ageSeconds: elapsed,
            waitSeconds,
          });
          throw new Error(
            `Register is locked by transaction ${recentTx._id} (${recentTx.state}, ${elapsed}s old). ` +
            `Please wait ~${waitSeconds}s or cancel the active transaction first.`
          );
        }
      } else {
        // No PAYMENT_IN_PROGRESS found but isRegisterAvailable said false — race condition
        const active = await Transaction.getActiveTransaction(registerId);
        log('Register appears locked (race condition)', {
          transactionId: active?._id,
          state: active?.state,
        });
        throw new Error(
          `Register is currently busy. Please try again in a moment.`
        );
      }
    }

    // ── Step 1: Create Transaction (NEW) ──
    log('Step 1: Creating transaction');
    transaction = await Transaction.create({
      registerId,
      state: 'NEW',
      orderData: {
        items: items.map(item => ({
          _id: item._id || item.menuItem,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
        })),
        subtotal,
        tax,
        total,
      },
      customerPhone: customerPhone || '',
      customerName: customerName || '',
      optInMarketing: optInMarketing || false,
    });
    log('Transaction created', { transactionId: transaction._id });

    // ── Step 2: Start Transaction (NEW → IN_PROGRESS) ──
    log('Step 2: Starting transaction');
    await transaction.transitionTo('IN_PROGRESS');

    // ── Step 2.5: Verify register still available before locking ──
    // (Race condition guard: another request may have locked the register between steps 1-2)
    const stillAvailable = await Transaction.isRegisterAvailable(registerId);
    if (!stillAvailable) {
      // Try to auto-resolve stale PAYMENT_IN_PROGRESS transactions
      const lockingTx = await Transaction.findOne({
        registerId,
        state: 'PAYMENT_IN_PROGRESS',
        _id: { $ne: transaction._id }, // Not our own transaction
      }).sort({ createdAt: -1 });

      if (lockingTx && lockingTx.startedAt) {
        const elapsed = Date.now() - new Date(lockingTx.startedAt).getTime();
        const STALE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
        if (elapsed > STALE_TIMEOUT_MS) {
          log('Auto-resolving stale PAYMENT_IN_PROGRESS transaction (race condition guard)', {
            transactionId: lockingTx._id,
            ageSeconds: Math.round(elapsed / 1000),
          });
          try {
            await lockingTx.transitionTo('ON_HOLD', {
              reason: 'Auto-held stale transaction by orchestrator (race condition guard)',
              errorCode: 'STALE_TIMEOUT',
              onHoldAt: new Date(),
            });
            log('Stale transaction auto-resolved, proceeding with payment');
            // Proceed to Step 3 — register is now free
          } catch (holdErr) {
            log('Failed to auto-hold stale transaction in race guard', { error: holdErr.message });
            await transaction.transitionTo('FAILED', {
              reason: 'Register locked by another transaction',
              errorCode: 'REGISTER_CONTENTION',
            });
            throw new Error(
              'Register was locked by another payment. Please try again.'
            );
          }
        } else {
          // Recent transaction — cannot proceed
          log('Register locked by recent transaction (race condition guard)', {
            transactionId: lockingTx._id,
            ageSeconds: Math.round(elapsed / 1000),
          });
          await transaction.transitionTo('FAILED', {
            reason: 'Register locked by another transaction',
            errorCode: 'REGISTER_CONTENTION',
          });
          throw new Error(
            'Register is busy with another payment. Please wait a moment and try again.'
          );
        }
      } else {
        // No PAYMENT_IN_PROGRESS found — race condition resolved itself
        log('Register no longer locked (race condition resolved)');
      }
    }

    // ── Step 3: Lock Register (IN_PROGRESS → PAYMENT_IN_PROGRESS) ──
    log('Step 3: Locking register for payment');
    await transaction.transitionTo('PAYMENT_IN_PROGRESS', {
      gatewayRef,
    });

    // ── Step 4: Create Order (with full server-side processing) ──
    log('Step 4: Creating order');

    // Generate receipt number
    const receiptNumber = await this._generateReceiptNumber();

    // Build order items
    const orderItems = items.map(item => ({
      menuItem: item._id || item.menuItem,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      category: item.category,
    }));

    const orderPayload = {
      items: orderItems,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      paymentMethod,
      receiptNumber,
      status: 'completed',
      discountCode: (appliedDiscount?.code || discountCode || ''),
      discountAmount: Math.round((discountAmount || 0) * 100) / 100,
      discountType: (discountType || appliedDiscount?.type || ''),
      ...(isMobileMoney && mobileMoneyData && {
        mobileMoneyProvider: mobileMoneyData.provider,
        mobileMoneyPhone: mobileMoneyData.phone,
        mobileMoneyTransactionId: mobileMoneyData.transactionId,
        mobileMoneyInitiationMode: mobileMoneyData.initiationMode || 'cashier_initiated',
        mobileMoneyVerifiedBy: mobileMoneyData.verifiedBy,
      }),
      ...(customerPhone && { customerPhone }),
      ...(customerName && { customerName }),
      optInMarketing: !!optInMarketing,
    };

    order = new Order(orderPayload);
    await order.save();
    log('Order created', { orderId: order._id, receiptNumber });

    // ── Deduct stock and create inventory logs ──
    const inventoryLogs = [];
    for (const item of orderItems) {
      try {
        await MenuItem.findByIdAndUpdate(item.menuItem, {
          $inc: { stock: -item.quantity, sold: item.quantity }
        });
        inventoryLogs.push({
          menuItem: item.menuItem,
          change: -item.quantity,
          reason: 'sale',
          orderId: order._id,
        });
      } catch (invErr) {
        log('Inventory deduction failed (non-blocking)', {
          item: item.name,
          error: invErr.message,
        });
      }
    }
    if (inventoryLogs.length > 0) {
      await InventoryLog.insertMany(inventoryLogs).catch(err => {
        log('Inventory log insert failed (non-blocking)', { error: err.message });
      });
    }

    // ── Update or Create Customer Record ──
    if (customerPhone && customerPhone.trim()) {
      try {
        const existingCustomer = await Customer.findOne({ phone: customerPhone.trim() });
        if (existingCustomer) {
          existingCustomer.orderCount += 1;
          existingCustomer.totalSpent += total;
          existingCustomer.lastOrderDate = new Date();
          if (customerName) existingCustomer.name = customerName;
          if (optInMarketing) {
            existingCustomer.optInMarketing = true;
            existingCustomer.optInSMS = true;
          }
          await existingCustomer.save();
        } else {
          await Customer.create({
            phone: customerPhone.trim(),
            name: customerName || 'Guest',
            orderCount: 1,
            totalSpent: total,
            lastOrderDate: new Date(),
            optInMarketing: !!optInMarketing,
            optInSMS: !!optInMarketing,
          });
        }
      } catch (custErr) {
        log('Customer tracking failed (non-blocking)', { error: custErr.message });
      }
    }

    // ── Step 5: Complete Transaction (PAYMENT_IN_PROGRESS → COMPLETED) ──
    log('Step 5: Completing transaction');
    await transaction.transitionTo('COMPLETED', {
      orderId: order._id,
      gatewayRef,
    });

    log('Payment flow completed successfully');
    return {
      success: true,
      transaction,
      order,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  PRIVATE: Input Validation
  // ═══════════════════════════════════════════════════════════════

  _validatePaymentInput(data) {
    const errors = [];

    if (!data.items || !Array.isArray(data.items)) {
      errors.push('Items must be an array');
    } else if (data.items.length === 0) {
      errors.push('At least one item is required');
    } else {
      data.items.forEach((item, index) => {
        if (!item._id && !item.menuItem) {
          errors.push(`Item ${index}: product identifier (_id or menuItem) is required`);
        }
        if (!item.quantity || item.quantity < 1) {
          errors.push(`Item ${index}: quantity must be at least 1`);
        }
        if (!item.price || item.price <= 0) {
          errors.push(`Item ${index}: price must be greater than 0`);
        }
      });
    }

    if (!data.total || typeof data.total !== 'number' || data.total <= 0) {
      errors.push('Total must be a positive number');
    }

    if (!data.paymentMethod) {
      errors.push('Payment method is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  PRIVATE: Idempotency
  // ═══════════════════════════════════════════════════════════════

  _generateIdempotencyKey(paymentData) {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify({
      items: paymentData.items?.map(i => ({
        id: i._id || i.menuItem,
        qty: i.quantity,
        price: i.price,
      })),
      total: paymentData.total,
      paymentMethod: paymentData.paymentMethod,
      customerPhone: paymentData.customerPhone,
      timestamp: Math.floor(Date.now() / 60000), // 1-minute window
    }));
    return hash.digest('hex');
  }

  _checkIdempotency(key) {
    const entry = this.idempotencyStore.get(key);
    if (entry) {
      // Check TTL (5 minutes)
      if (Date.now() - entry.timestamp > 300000) {
        this.idempotencyStore.delete(key);
        return null;
      }
      return entry.result;
    }
    return null;
  }

  _storeIdempotency(key, result) {
    this.idempotencyStore.set(key, {
      result,
      timestamp: Date.now(),
    });

    // Cleanup old entries every 100 stores
    if (this.idempotencyStore.size > 100) {
      this._cleanupIdempotencyStore();
    }
  }

  _cleanupIdempotencyStore() {
    const now = Date.now();
    for (const [key, value] of this.idempotencyStore.entries()) {
      if (now - value.timestamp > 300000) {
        this.idempotencyStore.delete(key);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  PRIVATE: Circuit Breaker
  // ═══════════════════════════════════════════════════════════════

  _isCircuitBreakerOpen() {
    if (this.circuitBreaker.isOpen) {
      const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailureTime;
      if (timeSinceLastFailure > this.circuitBreaker.resetTimeout) {
        // Reset circuit breaker after timeout
        this.circuitBreaker.isOpen = false;
        this.circuitBreaker.failures = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  _recordFailure() {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
      this.circuitBreaker.isOpen = true;
      console.error(
        `[PaymentOrchestrator] Circuit breaker OPEN after ${this.circuitBreaker.failures} consecutive failures`
      );
    }
  }

  _recordSuccess() {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.isOpen = false;
  }

  // ═══════════════════════════════════════════════════════════════
  //  PRIVATE: Retry Helpers
  // ═══════════════════════════════════════════════════════════════

  _calculateBackoffDelay(retryCount) {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(2, retryCount),
      this.retryConfig.maxDelay
    );
    return delay + Math.random() * 1000; // Add jitter
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ═══════════════════════════════════════════════════════════════
  //  PRIVATE: Dead Letter Queue
  // ═══════════════════════════════════════════════════════════════

  _addToDeadLetterQueue(entry) {
    this.deadLetterQueue.push({
      ...entry,
      timestamp: Date.now(),
    });

    // Keep only last 100 failed transactions
    if (this.deadLetterQueue.length > 100) {
      this.deadLetterQueue.shift();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  PRIVATE: Gateway Check
  // ═══════════════════════════════════════════════════════════════

  async _checkPaymentGateway(gatewayRef) {
    // Simulate network call — in production, call actual payment gateway
    await this._sleep(100);
    return null; // null = unknown, so resume proceeds
  }

  // ═══════════════════════════════════════════════════════════════
  //  PRIVATE: AI-Assisted Analysis
  // ═══════════════════════════════════════════════════════════════

  async _analyzeWithAI(result, paymentData, correlationId) {
    try {
      const analysis = await aiService.analyzeData(
        {
          correlationId,
          success: result.success,
          transactionId: result.transaction?._id,
          orderId: result.order?._id,
          total: paymentData.total,
          paymentMethod: paymentData.paymentMethod,
          itemCount: paymentData.items?.length,
          hasDiscount: !!paymentData.appliedDiscount,
          isMobileMoney: !!paymentData.isMobileMoney,
        },
        'Analyze this completed payment for anomalies or optimization opportunities.'
      );
      console.log(`[PaymentOrchestrator:AI] Analysis for ${correlationId}:`, analysis);
    } catch (err) {
      // Non-blocking — don't fail the payment if AI analysis fails
      console.warn(`[PaymentOrchestrator:AI] Analysis failed: ${err.message}`);
    }
  }
}

// Export singleton
module.exports = new PaymentOrchestrator();
