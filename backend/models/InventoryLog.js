const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  change: { type: Number, required: true }, // negative for sale, positive for restock/refund
  reason: {
    type: String,
    enum: ['sale', 'restock', 'refund', 'adjustment'],
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
}, { timestamps: true });

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
