const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Discount = require('../models/Discount');
const InventoryLog = require('../models/InventoryLog');
const Customer = require('../models/Customer');
const MobilePayment = require('../models/MobilePayment');
const Employee = require('../models/Employee');

// ── Helper: Generate sequential receipt number ──
async function generateReceiptNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `RCP-${dateStr}-`;

  // Find the highest receipt number for today
  const lastOrder = await Order.findOne({
    receiptNumber: { $regex: `^${prefix}` }
  }).sort({ receiptNumber: -1 });

  let seq = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.receiptNumber.split('-')[2], 10);
    seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── Helper: Calculate discount amount server-side ──
function calculateDiscountAmount(discount, subtotal, orderItems) {
  const { type, value, maxDiscount, applicableCategories } = discount;

  switch (type) {
    case 'percentage': {
      // Calculate discount on applicable items only
      let applicableTotal = subtotal;
      if (applicableCategories && applicableCategories.length > 0) {
        // We need category info — fetch from items if available
        // Fall back to full subtotal if categories not provided
        applicableTotal = orderItems.reduce((sum, item) => {
          if (applicableCategories.includes(item.category || '')) {
            return sum + (item.price * item.quantity);
          }
          return sum;
        }, 0);
        // If no items matched categories, use full subtotal
        if (applicableTotal === 0) applicableTotal = subtotal;
      }

      let amount = Math.round(applicableTotal * (value / 100) * 100) / 100;
      // Apply max discount cap
      if (maxDiscount > 0 && amount > maxDiscount) {
        amount = maxDiscount;
      }
      return amount;
    }

    case 'fixed': {
      let amount = value;
      if (maxDiscount > 0 && amount > maxDiscount) {
        amount = maxDiscount;
      }
      // Fixed discount cannot exceed subtotal
      if (amount > subtotal) amount = subtotal;
      return amount;
    }

    case 'bogo': {
      // BOGO: find the cheapest item and make it free
      // value indicates how many free items (default 1)
      const freeQty = value || 1;
      const sorted = [...orderItems].sort((a, b) => a.price - b.price);
      let amount = 0;
      let remaining = freeQty;
      for (const item of sorted) {
        const take = Math.min(remaining, item.quantity);
        amount += item.price * take;
        remaining -= take;
        if (remaining <= 0) break;
      }
      return Math.round(amount * 100) / 100;
    }

    default:
      return 0;
  }
}

// ── POST /api/orders — Create order (checkout) ──
router.post('/', async (req, res) => {
  try {
    const { items, paymentMethod = 'cash', discountCode, customerPhone, customerName, optInMarketing } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // Validate and fetch menu items
    const menuItemIds = items.map(i => i.menuItem);
    console.log(`[Order] Creating order with ${items.length} item(s), menuItemIds:`, menuItemIds);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
    console.log(`[Order] Found ${menuItems.length} menu items in DB`);

    if (menuItems.length !== items.length) {
      const foundIds = menuItems.map(m => m._id.toString());
      const missingIds = menuItemIds.filter(id => !foundIds.includes(id));
      console.error(`[Order] Menu item mismatch! Missing IDs:`, missingIds);
      return res.status(400).json({ error: 'One or more menu items not found', missingIds });
    }

    // Build order items with current prices and check stock
    const orderItems = [];
    let subtotal = 0;

    for (const { menuItem: id, quantity } of items) {
      const menuItem = menuItems.find(m => m._id.toString() === id);
      if (!menuItem) continue;

      if (!menuItem.isAvailable) {
        return res.status(400).json({
          error: `${menuItem.name} is currently unavailable`
        });
      }

      if (menuItem.stock < quantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${menuItem.name}. Available: ${menuItem.stock}, requested: ${quantity}`
        });
      }

      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity,
        category: menuItem.category, // include category for discount calculation
      });
      subtotal += menuItem.price * quantity;
    }

    const taxRate = parseFloat(process.env.TAX_RATE || '0.08');
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    let total = Math.round((subtotal + tax) * 100) / 100;

    const receiptNumber = await generateReceiptNumber();

    // ── Server-side Discount Processing ──
    let discountAmount = 0;
    let discountType = '';
    let validatedCode = '';

    if (discountCode) {
      const discount = await Discount.findOne({
        code: discountCode.toUpperCase(),
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gte: new Date() } }
        ]
      });

      if (!discount) {
        return res.status(400).json({ error: 'Invalid or expired discount code' });
      }

      // Check usage limit
      if (discount.usageLimit > 0 && discount.usedCount >= discount.usageLimit) {
        return res.status(400).json({ error: 'Discount code has reached its usage limit' });
      }

      // Check minimum order amount
      if (discount.minOrderAmount > 0 && subtotal < discount.minOrderAmount) {
        return res.status(400).json({
          error: `Minimum order amount of $${discount.minOrderAmount.toFixed(2)} required for this discount`
        });
      }

      // Re-calculate discount amount server-side (DO NOT trust client)
      discountAmount = calculateDiscountAmount(discount, subtotal, orderItems);
      discountType = discount.type;
      validatedCode = discount.code;

      // Apply discount to total
      total = Math.round((subtotal + tax - discountAmount) * 100) / 100;
      if (total < 0) total = 0;

      // Increment usage count
      await Discount.findByIdAndUpdate(discount._id, {
        $inc: { usedCount: 1 }
      });
    }

    // Create order — also pass through any mobile money fields from req.body
    const order = new Order({
      items: orderItems,
      subtotal,
      tax,
      total,
      paymentMethod,
      receiptNumber,
      status: 'completed',
      discountCode: validatedCode,
      discountAmount,
      discountType,
      // Customer / Marketing fields
      customerPhone: customerPhone || '',
      customerName: customerName || '',
      optInMarketing: !!optInMarketing,
      // Mobile Money fields (passed through from frontend)
      mobileMoneyProvider: req.body.mobileMoneyProvider || '',
      mobileMoneyPhone: req.body.mobileMoneyPhone || '',
      mobileMoneyTransactionId: req.body.mobileMoneyTransactionId || '',
      mobileMoneyInitiationMode: req.body.mobileMoneyInitiationMode || '',
      mobileMoneyVerifiedBy: req.body.mobileMoneyVerifiedBy || '',
      // Only set mobilePaymentRef if it's a valid ObjectId string
      ...(req.body.mobilePaymentRef && /^[0-9a-fA-F]{24}$/.test(req.body.mobilePaymentRef)
        ? { mobilePaymentRef: req.body.mobilePaymentRef }
        : {}),
    });

    await order.save();

    // ── Update or Create Customer Record ──
    if (customerPhone && customerPhone.trim()) {
      try {
        const existingCustomer = await Customer.findOne({ phone: customerPhone.trim() });
        if (existingCustomer) {
          existingCustomer.orderCount += 1;
          existingCustomer.totalSpent += total;
          existingCustomer.lastOrderDate = new Date();
          if (customerName) existingCustomer.name = customerName;
          if (optInMarketing) {
            existingCustomer.optInMarketing = true;
            existingCustomer.optInSMS = true;
          }
          await existingCustomer.save();
        } else {
          await Customer.create({
            phone: customerPhone.trim(),
            name: customerName || 'Guest',
            orderCount: 1,
            totalSpent: total,
            lastOrderDate: new Date(),
            optInMarketing: !!optInMarketing,
            optInSMS: !!optInMarketing,
          });
        }
      } catch (custErr) {
        // Non-blocking: don't fail the order if customer tracking fails
        console.warn('[Customer] Failed to update customer record:', custErr.message);
      }
    }

    // Deduct stock and create inventory logs
    const inventoryLogs = [];
    for (const item of orderItems) {
      await MenuItem.findByIdAndUpdate(item.menuItem, {
        $inc: { stock: -item.quantity, sold: item.quantity }
      });

      inventoryLogs.push({
        menuItem: item.menuItem,
        change: -item.quantity,
        reason: 'sale',
        orderId: order._id,
      });
    }
    await InventoryLog.insertMany(inventoryLogs);

    res.status(201).json({ order });
  } catch (err) {
    console.error('[Order] Create order error:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/orders — List orders ──
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({ orders, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/orders/:id — Get single order ──
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/orders/receipt/:receiptNumber — Get receipt data ──
router.get('/receipt/:receiptNumber', async (req, res) => {
  try {
    const order = await Order.findOne({ receiptNumber: req.params.receiptNumber });
    if (!order) return res.status(404).json({ error: 'Receipt not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/orders/:id/refund — Refund an order ──
// If the order was paid via mobile money (orange_money / mtn_money),
// the frontend MUST provide refundedBy (employee ID) and agentPin
// to authorize the mobile money refund via the Disbursements API.
router.post('/:id/refund', async (req, res) => {
  try {
    const { reason = 'Customer request', refundedBy, agentPin } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'refunded') return res.status(400).json({ error: 'Order already refunded' });

    // ── Determine if this is a mobile money order ──
    const isMobileMoney = ['orange_money', 'mtn_money'].includes(order.paymentMethod);

    // ── If mobile money, process the MoMo refund first ──
    if (isMobileMoney) {
      if (!refundedBy || !agentPin) {
        return res.status(400).json({
          error: 'Mobile money refunds require refundedBy (employee ID) and agentPin',
        });
      }

      // Find the associated MobilePayment record
      const mobilePayment = order.mobilePaymentRef
        ? await MobilePayment.findById(order.mobilePaymentRef)
        : await MobilePayment.findOne({ orderId: order._id });

      if (!mobilePayment) {
        return res.status(404).json({ error: 'Associated mobile payment record not found' });
      }

      // Verify agent PIN
      const agent = await Employee.findById(refundedBy);
      if (!agent) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      const pinValid = await agent.comparePin(agentPin);
      if (!pinValid) {
        return res.status(401).json({ error: 'Invalid agent PIN' });
      }

      // Call the mobile-payments refund endpoint internally
      const http = require('http');
      const refundPayload = JSON.stringify({
        transactionRef: mobilePayment.transactionRef,
        refundedBy,
        agentPin,
        reason,
      });

      const refundResponse = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'localhost',
          port: process.env.PORT || 5000,
          path: '/api/mobile-payments/refund',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(refundPayload),
          },
        };
        const reqHttp = http.request(options, (resHttp) => {
          let data = '';
          resHttp.on('data', (chunk) => { data += chunk; });
          resHttp.on('end', () => {
            try {
              resolve({ status: resHttp.statusCode, body: JSON.parse(data) });
            } catch {
              resolve({ status: resHttp.statusCode, body: { error: data } });
            }
          });
        });
        reqHttp.on('error', reject);
        reqHttp.write(refundPayload);
        reqHttp.end();
      });

      if (refundResponse.status !== 200) {
        return res.status(refundResponse.status).json({
          error: refundResponse.body.error || 'Mobile money refund failed',
        });
      }

      // Restock items (after successful MoMo refund)
      const inventoryLogs = [];
      for (const item of order.items) {
        await MenuItem.findByIdAndUpdate(item.menuItem, {
          $inc: { stock: item.quantity, sold: -item.quantity }
        });
        inventoryLogs.push({
          menuItem: item.menuItem,
          change: item.quantity,
          reason: 'refund',
          orderId: order._id,
        });
      }
      await InventoryLog.insertMany(inventoryLogs);

      // Track refund on agent
      agent.refundsProcessed = (agent.refundsProcessed || 0) + 1;
      await agent.save();

      // Order status already updated by the mobile-payments refund endpoint,
      // but ensure it's consistent
      order.status = 'refunded';
      order.refundReason = reason;
      order.refundedAt = new Date();
      await order.save();

      return res.json({
        message: 'Order refunded successfully (mobile money refund processed)',
        order,
        mobileRefund: refundResponse.body.refund,
      });
    }

    // ── Non-mobile-money refund: just restock items ──
    const inventoryLogs = [];
    for (const item of order.items) {
      await MenuItem.findByIdAndUpdate(item.menuItem, {
        $inc: { stock: item.quantity, sold: -item.quantity }
      });

      inventoryLogs.push({
        menuItem: item.menuItem,
        change: item.quantity,
        reason: 'refund',
        orderId: order._id,
      });
    }
    await InventoryLog.insertMany(inventoryLogs);

    // Update order status
    order.status = 'refunded';
    order.refundReason = reason;
    order.refundedAt = new Date();
    await order.save();

    res.json({ message: 'Order refunded successfully', order });
  } catch (err) {
    console.error('[Orders] Refund error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
