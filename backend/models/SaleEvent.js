const mongoose = require('mongoose');

const saleEventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['happy-hour', 'weekly', 'seasonal', 'flash', 'clearance'],
    required: true
  },
  discountPercentage: { type: Number, required: true }, // e.g., 20 = 20% off
  applicableItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }], // empty = all items
  applicableCategories: [{ type: String }], // empty = all categories
  isActive: { type: Boolean, default: true },
  // Schedule
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  // Recurring schedule (for happy-hour, weekly)
  recurring: {
    type: String,
    enum: ['none', 'daily', 'weekly', 'monthly'],
    default: 'none'
  },
  // Days of week for recurring (0=Sunday, 1=Monday, etc.)
  daysOfWeek: [{ type: Number, min: 0, max: 6 }],
  // Time range for daily recurrence
  startTime: { type: String, default: '' }, // HH:mm format
  endTime: { type: String, default: '' },   // HH:mm format
  description: { type: String, default: '' },
  bannerColor: { type: String, default: '#DD9B1D' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SaleEvent', saleEventSchema);
