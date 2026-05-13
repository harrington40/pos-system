const mongoose = require('mongoose');

/**
 * Transaction State Machine
 *
 * NEW ──────────► IN_PROGRESS ──────────► PAYMENT_IN_PROGRESS ──► COMPLETED
 *   │                  │                        │
 *   │                  │                        ├──► ON_HOLD ──► PAYMENT_IN_PROGRESS (resume)
 *   │                  │                        │       │
 *   │                  │                        │       └──► COMPLETED (if gateway confirms success)
 *   │                  │                        │
 *   │                  │                        └──► FAILED
 *   │                  │
 *   └──► CANCELLED     └──► CANCELLED
 *
 * Core Principle:
 *   ONLY transactions in PAYMENT_IN_PROGRESS can lock the register.
 *   ALL other states must release it immediately.
 */

const transactionSchema = new mongoose.Schema({
  registerId: {
    type: String,
    default: 'default',
    index: true,
  },
  state: {
    type: String,
    enum: ['NEW', 'IN_PROGRESS', 'PAYMENT_IN_PROGRESS', 'ON_HOLD', 'FAILED', 'COMPLETED', 'CANCELLED'],
    default: 'NEW',
    required: true,
  },
  // ── Order Data (captured at creation) ──
  orderData: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  // ── Reference to the Order once created ──
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
  },
  // ── Payment tracking ──
  paymentMethod: {
    type: String,
    default: '',
  },
  paymentGatewayRef: {
    type: String,
    default: '',
  },
  paymentAttempts: {
    type: Number,
    default: 0,
  },
  lastPaymentCheck: {
    type: Date,
    default: null,
  },
  // ── Timing ──
  startedAt: {
    type: Date,
    default: null,
  },
  paymentStartedAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  failedAt: {
    type: Date,
    default: null,
  },
  onHoldAt: {
    type: Date,
    default: null,
  },
  // ── Error / Audit ──
  lastError: {
    type: String,
    default: '',
  },
  errorLog: [{
    timestamp: { type: Date, default: Date.now },
    message: String,
    code: String,
  }],
  // ── Customer info (for marketing) ──
  customerPhone: String,
  customerName: String,
  optInMarketing: Boolean,
}, {
  timestamps: true,
});

// ── Index for fast register lookups ──
transactionSchema.index({ registerId: 1, state: 1 });
transactionSchema.index({ state: 1, createdAt: -1 });

// ── Valid state transitions ──
const VALID_TRANSITIONS = {
  'NEW':                ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  'IN_PROGRESS':        ['PAYMENT_IN_PROGRESS', 'CANCELLED', 'FAILED'],
  'PAYMENT_IN_PROGRESS': ['COMPLETED', 'ON_HOLD', 'FAILED'],
  'ON_HOLD':            ['PAYMENT_IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  'FAILED':             ['NEW'],  // Allow retry from failed
  'COMPLETED':          [],       // Terminal state
  'CANCELLED':          [],       // Terminal state
};

/**
 * Check if a state transition is valid
 */
transactionSchema.statics.isValidTransition = function(fromState, toState) {
  const allowed = VALID_TRANSITIONS[fromState];
  if (!allowed) return false;
  return allowed.includes(toState);
};

/**
 * Transition the transaction to a new state with validation
 */
transactionSchema.methods.transitionTo = async function(newState, meta = {}) {
  const allowed = VALID_TRANSITIONS[this.state];
  if (!allowed || !allowed.includes(newState)) {
    throw new Error(
      `Invalid state transition: ${this.state} → ${newState}. ` +
      `Allowed from ${this.state}: [${allowed.join(', ')}]`
    );
  }

  // ── Timestamp tracking ──
  const now = new Date();
  switch (newState) {
    case 'IN_PROGRESS':
      this.startedAt = now;
      break;
    case 'PAYMENT_IN_PROGRESS':
      this.paymentStartedAt = now;
      this.paymentAttempts += 1;
      break;
    case 'COMPLETED':
      this.completedAt = now;
      break;
    case 'FAILED':
      this.failedAt = now;
      break;
    case 'ON_HOLD':
      this.onHoldAt = now;
      break;
    case 'CANCELLED':
      this.cancelledAt = now;
      break;
  }

  // ── Error logging ──
  if (meta.error) {
    this.lastError = meta.error;
    this.errorLog.push({
      timestamp: now,
      message: meta.error,
      code: meta.errorCode || 'UNKNOWN',
    });
  }

  // ── Payment gateway ref ──
  if (meta.gatewayRef) {
    this.paymentGatewayRef = meta.gatewayRef;
  }

  // ── Order reference ──
  if (meta.orderId) {
    this.orderId = meta.orderId;
  }

  this.state = newState;
  await this.save();
  return this;
};

/**
 * Check if the register is available for a new transaction
 */
transactionSchema.statics.isRegisterAvailable = async function(registerId = 'default') {
  const activeTransaction = await this.findOne({
    registerId,
    state: 'PAYMENT_IN_PROGRESS',
  });
  return !activeTransaction;
};

/**
 * Get the current active transaction for a register (if any)
 * Only PAYMENT_IN_PROGRESS locks the register
 */
transactionSchema.statics.getActiveTransaction = async function(registerId = 'default') {
  return this.findOne({
    registerId,
    state: { $in: ['NEW', 'IN_PROGRESS', 'PAYMENT_IN_PROGRESS'] },
  }).sort({ createdAt: -1 });
};

/**
 * Get all on-hold transactions for a register
 */
transactionSchema.statics.getOnHoldTransactions = async function(registerId = 'default') {
  return this.find({
    registerId,
    state: 'ON_HOLD',
  }).sort({ onHoldAt: -1 }).limit(10);
};

/**
 * Auto-hold: safely transition a transaction to ON_HOLD on error
 * This is a safety-net that always succeeds (best-effort)
 * Only transitions from PAYMENT_IN_PROGRESS or IN_PROGRESS
 */
transactionSchema.statics.autoHoldOnError = async function(transactionId, error, orderData) {
  try {
    const tx = await this.findById(transactionId);
    if (!tx) return null;
    // Save orderData (cart items) if provided
    if (orderData) {
      tx.orderData = orderData;
    }
    // Only auto-hold if in a state that can transition to ON_HOLD
    if (['PAYMENT_IN_PROGRESS', 'IN_PROGRESS'].includes(tx.state)) {
      await tx.transitionTo('ON_HOLD', {
        error: error || 'Auto-held due to payment error',
        errorCode: 'AUTO_HOLD',
      });
      return tx;
    }
    return tx;
  } catch (err) {
    console.error(`[Transaction] Auto-hold failed for ${transactionId}:`, err.message);
    return null;
  }
};

/**
 * Delete held transactions older than the specified timeout
 * Only the user can manually release/cancel — this just cleans up stale data
 * Called periodically by a cleanup job
 */
transactionSchema.statics.deleteExpiredHeldTransactions = async function(timeoutMs = 2 * 60 * 60 * 1000) {
  const cutoff = new Date(Date.now() - timeoutMs);
  const expired = await this.find({
    state: 'ON_HOLD',
    onHoldAt: { $lt: cutoff },
  });

  let deleted = 0;
  for (const tx of expired) {
    try {
      await tx.deleteOne();
      deleted++;
    } catch (err) {
      console.error(`[Transaction] Failed to delete expired held ${tx._id}:`, err.message);
    }
  }
  return deleted;
};

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
