const mongoose = require('mongoose');
const crypto = require('crypto');

const discountSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'bogo'],
    required: true
  },
  value: { type: Number, required: true }, // percentage amount or fixed amount
  minOrderAmount: { type: Number, default: 0 },
  maxDiscount: { type: Number, default: 0 }, // 0 = unlimited
  usageLimit: { type: Number, default: 0 }, // 0 = unlimited
  usedCount: { type: Number, default: 0 },
  applicableCategories: [{ type: String }], // empty = all categories
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date },
  description: { type: String, default: '' },
  barcode: { type: String, unique: true, sparse: true }, // unique barcode for scanning
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  createdAt: { type: Date, default: Date.now }
});

// Auto-generate barcode from discount code if not provided
discountSchema.pre('save', function() {
  if (!this.barcode) {
    // Generate a unique numeric barcode: prefix 20 + 8-char hex hash from code
    const hash = crypto.createHash('md5').update(this.code).digest('hex').substring(0, 8).toUpperCase();
    this.barcode = `20${hash}`;
  }
});

module.exports = mongoose.model('Discount', discountSchema);
