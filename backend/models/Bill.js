const mongoose = require('mongoose');

/**
 * Bill Model
 *
 * Tracks bills through their lifecycle:
 *   DRAFT → SENT → PARTIALLY_PAID → PAID
 *   DRAFT → SENT → OVERDUE → CANCELLED
 *
 * The bill-based Orange Money flow:
 *   1. Create bill (DRAFT)
 *   2. Send SMS to customer with payment link/reference (SENT)
 *   3. Customer pays via Orange Money
 *   4. Orange sends callback → payment verified → PAID
 *   5. Send SMS receipt
 */

const billItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
}, { _id: false });

billItemSchema.virtual('total').get(function () {
  return this.quantity * this.unitPrice;
});

const billSchema = new mongoose.Schema({
  // ── Bill Number (human-readable) ──
  billNumber: {
    type: String,
    unique: true,
    required: true,
  },

  // ── Customer ──
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  customerName: { type: String, default: '' },
  customerPhone: { type: String, required: true },
  customerEmail: { type: String, default: '' },

  // ── Bill Details ──
  items: [billItemSchema],
  subtotal: { type: Number, default: 0, min: 0 },
  taxRate: { type: Number, default: 0 }, // e.g. 0.08 for 8%
  taxAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, default: 0, min: 0 },
  amountPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },

  // ── Status Machine ──
  status: {
    type: String,
    enum: ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'],
    default: 'DRAFT',
    required: true,
  },

  // ── Payment Reference ──
  paymentRef: {
    type: String,
    default: '', // Orange Money transaction reference
  },
  paidAt: { type: Date, default: null },

  // ── Due Date ──
  dueDate: { type: Date, required: true },
  sentAt: { type: Date, default: null },
  overdueAt: { type: Date, default: null },

  // ── Linked Order (optional) ──
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
  },

  // ── Notes ──
  notes: { type: String, default: '' },

  // ── Metadata ──
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null,
  },
}, { timestamps: true });

// ── Indexes ──
billSchema.index({ customer: 1, status: 1 });
billSchema.index({ dueDate: 1 });
billSchema.index({ status: 1, dueDate: 1 });

// ── Generate bill number ──
billSchema.statics.generateBillNumber = async function () {
  const date = new Date();
  const prefix = `BILL-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const last = await this.findOne({ billNumber: new RegExp(`^${prefix}`) })
    .sort({ billNumber: -1 })
    .select('billNumber')
    .lean();
  let seq = 1;
  if (last) {
    const parts = last.billNumber.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}-${String(seq).padStart(4, '0')}`;
};

// ── Auto-calculate totals before save ──
billSchema.pre('save', function (next) {
  this.subtotal = this.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  this.taxAmount = this.subtotal * this.taxRate;
  this.total = this.subtotal + this.taxAmount - this.discount;
  this.balanceDue = this.total - this.amountPaid;
  if (typeof next === 'function') next();
});

module.exports = mongoose.model('Bill', billSchema);
