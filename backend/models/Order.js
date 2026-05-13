const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'mobile', 'mobile_money', 'orange_money', 'mtn_money'],
    default: 'cash'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'refunded'],
    default: 'completed'
  },
  receiptNumber: { type: String, unique: true },
  refundReason: { type: String, default: '' },
  refundedAt: { type: Date },
  // ── Discount Fields ──
  discountCode: { type: String, default: '' },
  discountAmount: { type: Number, default: 0 },
  discountType: { type: String, default: '' },
  // ── Mobile Money Fields ──
  mobileMoneyProvider: { type: String, default: '' },
  mobileMoneyPhone: { type: String, default: '' },
  mobileMoneyTransactionId: { type: String, default: '' },
  mobilePaymentRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MobilePayment',
    default: null,
  },
  mobileMoneyTransactionRef: { type: String, default: '' },
  mobileMoneyInitiationMode: {
    type: String,
    enum: ['', 'cashier_initiated', 'customer_initiated'],
    default: '',
  },
  mobileMoneyVerifiedBy: { type: String, default: '' },
  mobileMoneyVerifiedAt: { type: Date, default: null },
  // ── Employee ──
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  employeeName: { type: String, default: '' },
  // ── Customer / Marketing ──
  customerPhone: { type: String, default: '' },
  customerName: { type: String, default: '' },
  optInMarketing: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
