const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const InventoryLog = require('../models/InventoryLog');
const MenuItem = require('../models/MenuItem');
const inventoryEngine = require('../services/inventory-engine');

// ── GET /api/analytics/sales-summary ──
router.get('/sales-summary', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const orders = await Order.find({ status: { $ne: 'refunded' } });
    const summary = inventoryEngine.getSalesSummary(orders, days);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/top-selling ──
router.get('/top-selling', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const orders = await Order.find({ status: { $ne: 'refunded' } });
    const topSelling = inventoryEngine.getTopSelling(orders, limit);
    res.json(topSelling);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/restock-suggestions ──
router.get('/restock-suggestions', async (req, res) => {
  try {
    const items = await MenuItem.find({ isAvailable: true });
    const logs = await InventoryLog.find({}).sort({ createdAt: -1 }).limit(1000);
    const suggestions = inventoryEngine.generateSuggestions(items, logs);
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/peak-hours ──
router.get('/peak-hours', async (req, res) => {
  try {
    const orders = await Order.find({ status: { $ne: 'refunded' } });
    const peakHours = inventoryEngine.getPeakHours(orders);
    res.json(peakHours);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
