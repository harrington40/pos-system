const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  phone: { type: String, required: true, unique: true },
  email: { type: String, default: '' },
  orderCount: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  lastOrderDate: { type: Date },
  optInMarketing: { type: Boolean, default: false },
  optInSMS: { type: Boolean, default: false },
  notes: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
