const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const InventoryLog = require('../models/InventoryLog');

// ── GET /api/inventory — List all items with stock levels ──
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};
    if (category && category !== 'all') filter.category = category;

    const items = await MenuItem.find(filter)
      .select('name price category stock lowStockThreshold isAvailable sold image')
      .sort({ name: 1 });

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/inventory/low-stock — Items below threshold ──
router.get('/low-stock', async (req, res) => {
  try {
    const items = await MenuItem.find({
      $expr: { $lte: ['$stock', '$lowStockThreshold'] },
      isAvailable: true,
    }).select('name price category stock lowStockThreshold isAvailable sold image');

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/inventory/:id — Update stock (restock/adjust) ──
router.put('/:id', async (req, res) => {
  try {
    const { stock, lowStockThreshold, isAvailable } = req.body;
    const updateFields = {};

    if (stock !== undefined) {
      const item = await MenuItem.findById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Item not found' });

      const change = stock - item.stock;
      updateFields.stock = stock;

      // Log the adjustment
      if (change !== 0) {
        await InventoryLog.create({
          menuItem: item._id,
          change,
          reason: change > 0 ? 'restock' : 'adjustment',
        });
      }
    }

    if (lowStockThreshold !== undefined) updateFields.lowStockThreshold = lowStockThreshold;
    if (isAvailable !== undefined) updateFields.isAvailable = isAvailable;

    const updated = await MenuItem.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { returnDocument: 'after' }
    ).select('name price category stock lowStockThreshold isAvailable sold');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/inventory/logs — Inventory change history ──
router.get('/logs', async (req, res) => {
  try {
    const { limit = 50, reason } = req.query;
    const filter = {};
    if (reason) filter.reason = reason;

    const logs = await InventoryLog.find(filter)
      .populate('menuItem', 'name category')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
