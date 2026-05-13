const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const qrService = require('../services/qr-service');

// ──────────────────────────────────────────────
// MOBILE MONEY
// ──────────────────────────────────────────────

// POST /api/payments/mobile-money/initiate — Initiate mobile money payment
router.post('/mobile-money/initiate', async (req, res) => {
  try {
    const { phone, provider, amount, orderId } = req.body;

    if (!phone || !provider || !amount) {
      return res.status(400).json({ error: 'Phone, provider, and amount are required' });
    }

    // Validate phone format (simple check)
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length < 8) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Validate provider
    const validProviders = ['mtn', 'vodafone', 'airtel'];
    if (!validProviders.includes(provider.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid provider. Use: mtn, vodafone, or airtel' });
    }

    // Simulate payment initiation
    // In production, this would call the actual mobile money API
    const transactionId = `MM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // Simulate processing delay
    setTimeout(async () => {
      try {
        // Confirm payment automatically (simulated)
        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            mobileMoneyProvider: provider,
            mobileMoneyPhone: cleaned,
            mobileMoneyTransactionId: transactionId,
            paymentMethod: 'mobile_money'
          });
        }
      } catch (err) {
        console.error('Mobile money confirmation error:', err);
      }
    }, 100);

    res.json({
      success: true,
      transactionId,
      provider,
      phone: cleaned,
      amount,
      message: `Payment of $${amount.toFixed(2)} initiated via ${provider}. Please check your phone to complete.`,
      // Simulated: in production, this would be a real status
      status: 'pending'
    });
  } catch (err) {
    console.error('Mobile money error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/mobile-money/confirm — Confirm mobile money payment
router.post('/mobile-money/confirm', async (req, res) => {
  try {
    const { transactionId, orderId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    // Simulate confirmation
    // In production, this would verify with the mobile money provider
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, {
        'mobileMoneyTransactionId': transactionId
      });
    }

    res.json({
      success: true,
      transactionId,
      status: 'completed',
      message: 'Payment confirmed successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// QR CODE & BARCODE
// ──────────────────────────────────────────────

// GET /api/payments/qr-code/:itemId — Generate QR code for a menu item
router.get('/qr-code/:itemId', async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const svg = await qrService.generateItemQRCode(item);
    res.json({ svg, itemId: item._id, name: item.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/qr-code/receipt/:orderId — Generate QR code for a receipt
router.get('/qr-code/receipt/:orderId', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const { svg, payload } = await qrService.generateReceiptQRCode(order);
    res.json({ svg, payload, receiptNumber: order.receiptNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/qr-code/receipt/:orderId/full — Full receipt visuals (QR + barcode + payload)
router.get('/qr-code/receipt/:orderId/full', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const { qrSvg, barSvg, payload } = await qrService.generateFullReceiptVisuals(order);
    res.json({ qrSvg, barSvg, payload, receiptNumber: order.receiptNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/barcode/:itemId — Generate barcode for a menu item
router.get('/barcode/:itemId', async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const svg = await qrService.generateItemBarcode(item);
    res.json({ svg, itemId: item._id, name: item.name, barcode: item.barcode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/barcode/discount/:discountId — Generate barcode for a discount code
router.get('/barcode/discount/:discountId', async (req, res) => {
  try {
    const Discount = require('../models/Discount');
    const discount = await Discount.findById(req.params.discountId);
    if (!discount) return res.status(404).json({ error: 'Discount not found' });

    const svg = await qrService.generateBarcode(discount.barcode || discount.code);
    res.json({ svg, code: discount.code, barcode: discount.barcode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/qr-code/discount/:discountId — Generate QR code for a discount coupon
router.get('/qr-code/discount/:discountId', async (req, res) => {
  try {
    const Discount = require('../models/Discount');
    const discount = await Discount.findById(req.params.discountId);
    if (!discount) return res.status(404).json({ error: 'Discount not found' });

    const svg = await qrService.generateDiscountQRCode(discount);
    res.json({ svg, code: discount.code, barcode: discount.barcode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/qr-code/scan — Process a scanned QR code payload
router.post('/qr-code/scan', async (req, res) => {
  try {
    const { raw } = req.body;
    if (!raw) return res.status(400).json({ error: 'QR data is required' });

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      // If not JSON, treat as raw text (could be a barcode value)
      return res.json({ type: 'text', data: raw });
    }

    // Route based on QR type
    switch (payload.type) {
      case 'receipt': {
        // Look up the receipt order
        const order = await Order.findOne({ receiptNumber: payload.receipt });
        if (!order) return res.status(404).json({ error: 'Receipt not found' });
        return res.json({ type: 'receipt', orderId: order._id, receiptNumber: payload.receipt, payload });
      }
      case 'coupon': {
        // Look up the discount coupon
        const Discount = require('../models/Discount');
        const discount = await Discount.findOne({ code: payload.code });
        if (!discount) return res.status(404).json({ error: 'Coupon not found' });
        return res.json({ type: 'coupon', discount: { code: discount.code, type: discount.type, value: discount.value, description: discount.description }, payload });
      }
      case 'item': {
        return res.json({ type: 'item', itemId: payload.id, name: payload.name, price: payload.price, payload });
      }
      default:
        return res.json({ type: 'unknown', payload });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/qr-code/custom — Generate custom QR code
router.post('/qr-code/custom', async (req, res) => {
  try {
    const { data, color } = req.body;
    if (!data) return res.status(400).json({ error: 'Data is required' });

    const svg = await qrService.generateQRCode(data, { color });
    res.json({ svg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
