const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  pin: { type: String, required: true }, // 4-digit PIN, hashed
  role: {
    type: String,
    enum: ['admin', 'manager', 'cashier'],
    default: 'cashier'
  },
  isActive: { type: Boolean, default: true },
  shift: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'none'],
    default: 'none'
  },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  // Performance tracking
  ordersProcessed: { type: Number, default: 0 },
  totalSalesAmount: { type: Number, default: 0 },
  refundsProcessed: { type: Number, default: 0 },
  performanceScore: { type: Number, default: 0 }, // 0-100 weighted score
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Hash PIN before saving
employeeSchema.pre('save', async function(next) {
  if (!this.isModified('pin')) return;
  const salt = await bcrypt.genSalt(10);
  this.pin = await bcrypt.hash(this.pin, salt);
});

// Method to compare PIN
employeeSchema.methods.comparePin = async function(candidatePin) {
  return bcrypt.compare(candidatePin, this.pin);
};

module.exports = mongoose.model('Employee', employeeSchema);
