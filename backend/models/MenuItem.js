const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, default: '' },
  category: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'drinks', 'desserts'],
    default: 'lunch'
  },
  image: { type: String, default: '' },
  imagePublicId: { type: String, default: '' }, // Backblaze B2 file name/path (for deletion)
  popular: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  // ── Inventory Fields ──
  stock: { type: Number, default: 100 },
  lowStockThreshold: { type: Number, default: 10 },
  sold: { type: Number, default: 0 },
  isAvailable: { type: Boolean, default: true },
  // ── Barcode & QR Code ──
  barcode: { type: String, default: '' },
  qrCode: { type: String, default: '' }, // SVG string for QR code
  // ── Pricing & Profit ──
  costPrice: { type: Number, default: 0 }, // cost to make/purchase
  margin: { type: Number, default: 0 }, // profit margin percentage
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
