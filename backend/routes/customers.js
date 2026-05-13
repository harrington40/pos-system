/**
 * Customers Routes - Business Advertisement System
 * Manages customer data for marketing, SMS campaigns, and loyalty tracking.
 */

const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Order = require('../models/Order');

/**
 * GET /api/customers
 * List all customers with optional search and pagination
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, optInMarketing } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { phone: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (optInMarketing === 'true') filter.optInMarketing = true;
    if (optInMarketing === 'false') filter.optInMarketing = false;

    const customers = await Customer.find(filter)
      .sort({ lastOrderDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Customer.countDocuments(filter);

    res.json({
      customers,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/customers/stats
 * Get customer statistics for marketing dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const totalCustomers = await Customer.countDocuments();
    const marketingOptIns = await Customer.countDocuments({ optInMarketing: true });
    const totalSpent = await Customer.aggregate([
      { $group: { _id: null, total: { $sum: '$totalSpent' } } },
    ]);
    const totalOrders = await Customer.aggregate([
      { $group: { _id: null, total: { $sum: '$orderCount' } } },
    ]);
    const recentCustomers = await Customer.find()
      .sort({ lastOrderDate: -1 })
      .limit(5);

    res.json({
      totalCustomers,
      marketingOptIns,
      optInRate: totalCustomers > 0 ? Math.round((marketingOptIns / totalCustomers) * 100) : 0,
      totalRevenue: totalSpent.length > 0 ? totalSpent[0].total : 0,
      totalOrders: totalOrders.length > 0 ? totalOrders[0].total : 0,
      recentCustomers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/customers/:id
 * Get single customer with order history
 */
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const orders = await Order.find({ customerPhone: customer.phone })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ customer, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/customers/:id
 * Update customer (marketing opt-in, notes, etc.)
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, email, optInMarketing, optInSMS, notes } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;
    if (optInMarketing !== undefined) update.optInMarketing = optInMarketing;
    if (optInSMS !== undefined) update.optInSMS = optInSMS;
    if (notes !== undefined) update.notes = notes;

    const customer = await Customer.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/customers/register
 * Register a new customer (used during checkout)
 */
router.post('/register', async (req, res) => {
  try {
    const { phone, name, optInMarketing } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    let customer = await Customer.findOne({ phone: phone.trim() });
    if (customer) {
      // Update existing
      if (name) customer.name = name;
      if (optInMarketing) {
        customer.optInMarketing = true;
        customer.optInSMS = true;
      }
      await customer.save();
    } else {
      customer = await Customer.create({
        phone: phone.trim(),
        name: name || 'Guest',
        optInMarketing: !!optInMarketing,
        optInSMS: !!optInMarketing,
      });
    }

    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/customers/send-offer
 * Simulate sending marketing offer to opted-in customers
 * Body: { message, filter? }
 */
router.post('/send-offer', async (req, res) => {
  try {
    const { message, filter = {} } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const query = { optInSMS: true, isActive: true, ...filter };
    const recipients = await Customer.find(query);

    // Simulate sending SMS (in production, integrate with Twilio/AfricasTalking)
    const sent = recipients.map(c => ({
      phone: c.phone,
      name: c.name,
      message: `[POS Marketing] Hi ${c.name || 'Valued Customer'}, ${message}`,
      status: 'sent',
      sentAt: new Date(),
    }));

    res.json({
      sent: sent.length,
      recipients: sent,
      note: 'SMS sending simulated. Integrate with SMS provider for production.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
