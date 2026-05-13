const express = require('express');
const router = express.Router();
const Discount = require('../models/Discount');
const SaleEvent = require('../models/SaleEvent');
const couponEngine = require('../services/coupon-engine');

// ──────────────────────────────────────────────
// DISCOUNT CODES
// ──────────────────────────────────────────────

// GET /api/discounts — List all discount codes
router.get('/', async (req, res) => {
  try {
    const discounts = await Discount.find().sort({ createdAt: -1 });
    res.json(discounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discounts/active-menu — Get active discounts for menu display (both codes & sales)
router.get('/active-menu', async (req, res) => {
  try {
    const now = new Date();
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const [activeDiscounts, activeSales, upcomingSales] = await Promise.all([
      Discount.find({
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gte: now } }
        ]
      }).lean(),
      SaleEvent.find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now }
      }).lean(),
      SaleEvent.find({
        isActive: true,
        startDate: { $gt: now, $lte: fiveDaysFromNow }
      }).sort({ startDate: 1 }).lean()
    ]);

    // Add countdown info to upcoming sales
    const upcomingWithCountdown = upcomingSales.map(sale => {
      const msUntilStart = new Date(sale.startDate).getTime() - now.getTime();
      const daysUntilStart = Math.floor(msUntilStart / (1000 * 60 * 60 * 24));
      const hoursUntilStart = Math.floor((msUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesUntilStart = Math.floor((msUntilStart % (1000 * 60 * 60)) / (1000 * 60));
      return {
        ...sale,
        countdown: {
          ms: msUntilStart,
          days: daysUntilStart,
          hours: hoursUntilStart,
          minutes: minutesUntilStart,
          startsIn: daysUntilStart > 0
            ? `${daysUntilStart}d ${hoursUntilStart}h`
            : `${hoursUntilStart}h ${minutesUntilStart}m`
        }
      };
    });

    res.json({
      discounts: activeDiscounts,
      sales: activeSales,
      upcomingSales: upcomingWithCountdown
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/discounts — Create discount code
router.post('/', async (req, res) => {
  try {
    const { code, type, value, minOrderAmount, maxDiscount, usageLimit, applicableCategories, expiresAt, description } = req.body;
    if (!code || !type || value === undefined) {
      return res.status(400).json({ error: 'Code, type, and value are required' });
    }
    const discount = new Discount({
      code: code.toUpperCase(),
      type, value, minOrderAmount, maxDiscount, usageLimit,
      applicableCategories, expiresAt, description
    });
    await discount.save();
    res.status(201).json(discount);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Discount code already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/discounts/validate — Validate a discount code
router.post('/validate', async (req, res) => {
  try {
    const { code, orderTotal, categories } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const discount = await Discount.findOne({
      code: code.toUpperCase(),
      isActive: true
    });

    if (!discount) {
      return res.json({ valid: false, error: 'Invalid discount code' });
    }

    // Check expiry
    if (discount.expiresAt && new Date() > new Date(discount.expiresAt)) {
      return res.json({ valid: false, error: 'Discount code has expired' });
    }

    // Check usage limit
    if (discount.usageLimit > 0 && discount.usedCount >= discount.usageLimit) {
      return res.json({ valid: false, error: 'Discount code usage limit reached' });
    }

    // Check minimum order
    if (orderTotal && discount.minOrderAmount > 0 && orderTotal < discount.minOrderAmount) {
      return res.json({
        valid: false,
        error: `Minimum order amount of $${discount.minOrderAmount.toFixed(2)} required`
      });
    }

    // Check applicable categories
    if (discount.applicableCategories.length > 0 && categories) {
      const hasApplicable = categories.some(c => discount.applicableCategories.includes(c));
      if (!hasApplicable) {
        return res.json({ valid: false, error: 'Discount not applicable to items in cart' });
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.type === 'percentage') {
      discountAmount = (orderTotal || 0) * (discount.value / 100);
      if (discount.maxDiscount > 0 && discountAmount > discount.maxDiscount) {
        discountAmount = discount.maxDiscount;
      }
    } else if (discount.type === 'fixed') {
      discountAmount = discount.value;
    }
    // BOGO handled at item level

    res.json({
      valid: true,
      discount: {
        _id: discount._id,
        code: discount.code,
        type: discount.type,
        value: discount.value,
        description: discount.description
      },
      discountAmount: Math.round(discountAmount * 100) / 100
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/discounts/:id — Update discount code
router.put('/:id', async (req, res) => {
  try {
    const discount = await Discount.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { returnDocument: 'after' }
    );
    if (!discount) return res.status(404).json({ error: 'Discount not found' });
    res.json(discount);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/discounts/:id — Smart delete: if active → deactivate; if inactive → delete permanently
router.delete('/:id', async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) return res.status(404).json({ error: 'Discount not found' });

    if (discount.isActive) {
      discount.isActive = false;
      await discount.save();
      return res.json({ message: 'Discount deactivated', discount, action: 'deactivated' });
    } else {
      await Discount.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Discount deleted permanently', action: 'deleted' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// SALE EVENTS
// ──────────────────────────────────────────────

// GET /api/discounts/sales — List all sale events
router.get('/sales', async (req, res) => {
  try {
    const sales = await SaleEvent.find().sort({ startDate: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/discounts/sales — Create sale event
router.post('/sales', async (req, res) => {
  try {
    const { name, type, discountPercentage, applicableItems, applicableCategories,
            startDate, endDate, recurring, daysOfWeek, startTime, endTime,
            description, bannerColor } = req.body;
    if (!name || !type || discountPercentage === undefined || !startDate || !endDate) {
      return res.status(400).json({ error: 'Name, type, discount percentage, start and end dates are required' });
    }
    const sale = new SaleEvent({
      name, type, discountPercentage, applicableItems, applicableCategories,
      startDate, endDate, recurring, daysOfWeek, startTime, endTime,
      description, bannerColor
    });
    await sale.save();
    res.status(201).json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discounts/sales/active — Get currently active sale events
router.get('/sales/active', async (req, res) => {
  try {
    const now = new Date();
    const activeSales = await SaleEvent.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    });
    res.json(activeSales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/discounts/sales/:id — Update sale event
router.put('/sales/:id', async (req, res) => {
  try {
    const sale = await SaleEvent.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { returnDocument: 'after' }
    );
    if (!sale) return res.status(404).json({ error: 'Sale event not found' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/discounts/sales/:id — Permanently delete a sale event
router.delete('/sales/:id', async (req, res) => {
  try {
    const sale = await SaleEvent.findByIdAndDelete(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale event not found' });
    return res.json({ message: 'Sale event deleted permanently', action: 'deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/discounts/sales/:id/toggle — Toggle sale event active state
router.put('/sales/:id/toggle', async (req, res) => {
  try {
    const sale = await SaleEvent.findById(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale event not found' });

    sale.isActive = !sale.isActive;
    await sale.save();

    res.json({
      message: sale.isActive ? 'Sale event enabled' : 'Sale event disabled',
      sale,
      action: sale.isActive ? 'enabled' : 'disabled'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discounts/sales/upcoming — Get upcoming sales with countdown info (within 5 days)
router.get('/sales/upcoming', async (req, res) => {
  try {
    const now = new Date();
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const upcomingSales = await SaleEvent.find({
      isActive: true,
      startDate: { $gt: now, $lte: fiveDaysFromNow }
    }).sort({ startDate: 1 }).lean();

    // Add countdown info
    const salesWithCountdown = upcomingSales.map(sale => {
      const msUntilStart = new Date(sale.startDate).getTime() - now.getTime();
      const daysUntilStart = Math.floor(msUntilStart / (1000 * 60 * 60 * 24));
      const hoursUntilStart = Math.floor((msUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesUntilStart = Math.floor((msUntilStart % (1000 * 60 * 60)) / (1000 * 60));

      return {
        ...sale,
        countdown: {
          ms: msUntilStart,
          days: daysUntilStart,
          hours: hoursUntilStart,
          minutes: minutesUntilStart,
          startsIn: daysUntilStart > 0
            ? `${daysUntilStart}d ${hoursUntilStart}h`
            : `${hoursUntilStart}h ${minutesUntilStart}m`
        }
      };
    });

    res.json({ upcoming: salesWithCountdown, count: salesWithCountdown.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// BARCODE SCANNING & SMART RECOMMENDATIONS
// ──────────────────────────────────────────────

// POST /api/discounts/scan-barcode — Look up discount by barcode
router.post('/scan-barcode', async (req, res) => {
  try {
    const { barcode } = req.body;
    if (!barcode) {
      return res.status(400).json({ error: 'Barcode is required' });
    }

    const result = await couponEngine.lookupByBarcode(barcode);
    if (!result) {
      return res.json({ found: false, error: 'No coupon found for this barcode' });
    }
    if (result.error) {
      return res.json({ found: false, error: result.error });
    }

    res.json({ found: true, discount: result.discount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/discounts/recommendations — Get smart coupon recommendations for cart
router.post('/recommendations', async (req, res) => {
  try {
    const { items, orderTotal } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Cart items are required' });
    }

    const cartCategories = [...new Set(items.map(i => i.category))];

    const [bestDiscounts, activeSales, bundleSuggestions] = await Promise.all([
      couponEngine.getBestDiscounts(items, orderTotal),
      couponEngine.getActiveSaleEvents(cartCategories),
      couponEngine.getBundleSuggestions(
        items.map(i => i.menuItem || i._id).filter(Boolean)
      ),
    ]);

    res.json({
      bestDiscounts,
      activeSales,
      bundleSuggestions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
