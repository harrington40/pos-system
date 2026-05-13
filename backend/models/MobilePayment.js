const mongoose = require('mongoose');

/**
 * MobilePayment Model
 *
 * Tracks mobile money payments through their lifecycle:
 *   Cashier-Initiated:  PENDING → CONFIRMED → VERIFIED
 *   Customer-Initiated: AWAITING_PAYMENT → CONFIRMED → VERIFIED
 *
 * Core Principle:
 *   Only VERIFIED payments can complete an order.
 *   Agent PIN verification is REQUIRED before any order is finalized.
 */

const mobilePaymentSchema = new mongoose.Schema({
  // ── Provider Info ──
  provider: {
    type: String,
    enum: ['orange', 'mtn'],
    required: true,
  },
  phone: {
    type: String,
    default: '', // Empty for QR-initiated (customer phone unknown until they pay)
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'XAF',
  },

  // ── Initiation Mode ──
  initiationMode: {
    type: String,
    enum: ['cashier_initiated', 'customer_initiated', 'remittance_supplier_payment'],
    default: 'cashier_initiated',
    required: true,
  },

  // ── Transaction References ──
  transactionRef: {
    type: String,
    unique: true,
    required: true,
  },
  providerRef: {
    type: String,
    default: '', // Reference from the mobile money provider API
  },

  // ── Status Machine ──
  status: {
    type: String,
    enum: ['AWAITING_PAYMENT', 'PENDING', 'CONFIRMED', 'VERIFIED', 'FAILED', 'DISPUTED'],
    default: 'PENDING',
    required: true,
  },

  // ── Agent Verification ──
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null,
  },
  verifiedAt: {
    type: Date,
    default: null,
  },

  // ── Order Link ──
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null,
  },

  // ── QR Code Data (customer-initiated) ──
  qrPayload: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  qrSvg: {
    type: String,
    default: '',
  },

  // ── Audit Trail ──
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  initiatedAt: {
    type: Date,
    default: Date.now,
  },
  confirmedAt: {
    type: Date,
    default: null,
  },
  failedAt: {
    type: Date,
    default: null,
  },
  failureReason: {
    type: String,
    default: '',
  },

  // ── Metadata (flexible storage for provider-specific data) ──
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// ── Indexes for fast lookups ──
// Note: transactionRef has `unique: true` in schema, so no separate index needed
mobilePaymentSchema.index({ status: 1, createdAt: -1 });
mobilePaymentSchema.index({ phone: 1, status: 1 });
mobilePaymentSchema.index({ provider: 1, status: 1 });
mobilePaymentSchema.index({ initiationMode: 1, status: 1 });

// ── Valid state transitions ──
const VALID_TRANSITIONS = {
  'AWAITING_PAYMENT': ['CONFIRMED', 'FAILED', 'DISPUTED'],
  'PENDING':          ['CONFIRMED', 'FAILED', 'DISPUTED'],
  'CONFIRMED':        ['VERIFIED', 'DISPUTED'],
  'VERIFIED':         [],       // Terminal state
  'FAILED':           [],       // Terminal state
  'DISPUTED':         [],       // Terminal state — requires admin review
};

/**
 * Check if a state transition is valid
 */
mobilePaymentSchema.statics.isValidTransition = function(fromState, toState) {
  const allowed = VALID_TRANSITIONS[fromState];
  if (!allowed) return false;
  return allowed.includes(toState);
};

/**
 * Transition the payment to a new state with validation
 */
mobilePaymentSchema.methods.transitionTo = async function(newState, meta = {}) {
  const currentState = this.status || this.state;
  console.log(`[MobilePayment] transitionTo: status=${this.status}, state=${this.state}, currentState=${currentState}, newState=${newState}`);
  const allowed = VALID_TRANSITIONS[currentState];
  if (!allowed || !allowed.includes(newState)) {
    const allowedStr = allowed ? `[${allowed.join(', ')}]` : 'NONE (terminal state or unknown)';
    throw new Error(
      `Invalid MobilePayment state transition: ${currentState} → ${newState}. ` +
      `Allowed from ${currentState}: ${allowedStr}`
    );
  }

  const now = new Date();
  switch (newState) {
    case 'CONFIRMED':
      this.confirmedAt = now;
      if (meta.providerRef) this.providerRef = meta.providerRef;
      if (meta.phone) this.phone = meta.phone;
      break;
    case 'VERIFIED':
      this.verifiedAt = now;
      if (meta.verifiedBy) this.verifiedBy = meta.verifiedBy;
      break;
    case 'FAILED':
      this.failedAt = now;
      if (meta.reason) this.failureReason = meta.reason;
      break;
    case 'DISPUTED':
      if (meta.reason) this.failureReason = meta.reason;
      break;
  }

  // Store metadata
  if (meta.metadata) {
    for (const [key, value] of Object.entries(meta.metadata)) {
      this.metadata.set(key, value);
    }
  }

  // Link order
  if (meta.orderId) {
    this.orderId = meta.orderId;
  }

  this.status = newState;
  await this.save();
  return this;
};

/**
 * Generate a unique transaction reference
 */
mobilePaymentSchema.statics.generateRef = function() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MP-${timestamp}-${random}`;
};

/**
 * Get all payments pending agent verification
 */
mobilePaymentSchema.statics.getPendingVerification = async function(filters = {}) {
  const query = { status: 'CONFIRMED' };
  if (filters.provider) query.provider = filters.provider;
  if (filters.phone) query.phone = filters.phone;
  return this.find(query)
    .sort({ confirmedAt: -1 })
    .limit(filters.limit || 50)
    .populate('initiatedBy', 'name')
    .lean();
};

module.exports = mongoose.model('MobilePayment', mobilePaymentSchema);
