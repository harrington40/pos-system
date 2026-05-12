const mongoose = require('mongoose');

/**
 * SmsLog Model
 *
 * Tracks all SMS messages sent through the system:
 *   - Bill payment links sent to customers
 *   - Payment receipt SMS
 *   - Overdue reminders
 *   - Marketing/notification messages
 */

const smsLogSchema = new mongoose.Schema({
  // ── Recipient ──
  phone: { type: String, required: true },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null,
  },

  // ── Message ──
  message: { type: String, required: true },
  template: { type: String, default: '' }, // e.g. 'bill_payment_link', 'payment_receipt', 'overdue_reminder'

  // ── Related Entity ──
  bill: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    default: null,
  },

  // ── Delivery Status ──
  status: {
    type: String,
    enum: ['QUEUED', 'SENT', 'DELIVERED', 'FAILED'],
    default: 'QUEUED',
  },
  providerRef: { type: String, default: '' }, // Reference from SMS provider
  errorMessage: { type: String, default: '' },

  // ── Metadata ──
  sentAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
  cost: { type: Number, default: 0 }, // Cost in XAF
}, { timestamps: true });

// ── Indexes ──
smsLogSchema.index({ phone: 1, createdAt: -1 });
smsLogSchema.index({ bill: 1 });
smsLogSchema.index({ status: 1 });

module.exports = mongoose.model('SmsLog', smsLogSchema);
