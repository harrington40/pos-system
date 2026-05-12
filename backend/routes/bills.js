const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const SmsLog = require('../models/SmsLog');
const orangeMoney = require('../services/orange-money');
const smsService = require('../services/sms-service');

/**
 * Bill Routes
 *
 * Implements the bill-based Orange Money payment flow:
 *   POST   /api/bills              — Create a bill (DRAFT)
 *   GET    /api/bills              — List bills (with filters)
 *   GET    /api/bills/:id          — Get bill details
 *   PATCH  /api/bills/:id          — Update bill
 *   POST   /api/bills/:id/send     — Send bill SMS → status becomes SENT
 *   POST   /api/bills/:id/cancel   — Cancel bill → status becomes CANCELLED
 *   POST   /api/bills/webhook/orange — Orange Money payment callback
 *   GET    /api/bills/:id/sms-logs — Get SMS logs for a bill
 *   POST   /api/bills/:id/reminder — Send overdue reminder
 */

// ── Create a bill (DRAFT) ──
router.post('/', async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      items,
      taxRate,
      discount,
      dueDate,
      orderId,
      notes,
      createdBy,
    } = req.body;

    // Validate required fields
    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }
    if (!customerPhone) {
      return res.status(400).json({ error: 'customerPhone is required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }
    if (!dueDate) {
      return res.status(400).json({ error: 'dueDate is required' });
    }

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Generate bill number
    const billNumber = await Bill.generateBillNumber();

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * (taxRate || 0);
    const total = subtotal + taxAmount - (discount || 0);

    const bill = await Bill.create({
      billNumber,
      customer: customerId,
      customerName: customerName || customer.name || '',
      customerPhone,
      customerEmail: customerEmail || customer.email || '',
      items,
      subtotal,
      taxRate: taxRate || 0,
      taxAmount,
      discount: discount || 0,
      total,
      amountPaid: 0,
      balanceDue: total,
      status: 'DRAFT',
      dueDate: new Date(dueDate),
      orderId: orderId || null,
      notes: notes || '',
      createdBy: createdBy || null,
    });

    res.status(201).json({
      message: 'Bill created successfully',
      bill,
    });
  } catch (error) {
    console.error('[Bills] Create error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── List bills (with filters) ──
router.get('/', async (req, res) => {
  try {
    const { status, customerId, search, fromDate, toDate, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (customerId) {
      filter.customer = customerId;
    }
    if (search) {
      filter.$or = [
        { billNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
      ];
    }
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bills, total] = await Promise.all([
      Bill.find(filter)
        .populate('customer', 'name phone email')
        .populate('createdBy', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Bill.countDocuments(filter),
    ]);

    res.json({
      bills,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('[Bills] List error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Get bill details ──
router.get('/:id', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('customer', 'name phone email')
      .populate('createdBy', 'name role')
      .populate('orderId')
      .lean();

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Get SMS logs for this bill
    const smsLogs = await SmsLog.find({ bill: bill._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ bill, smsLogs });
  } catch (error) {
    console.error('[Bills] Get error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Update bill ──
router.patch('/:id', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Only allow updates on DRAFT bills
    if (bill.status !== 'DRAFT') {
      return res.status(400).json({
        error: `Cannot update bill in '${bill.status}' status. Only DRAFT bills can be updated.`,
      });
    }

    const allowedFields = [
      'customerName', 'customerPhone', 'customerEmail',
      'items', 'taxRate', 'discount', 'dueDate', 'notes',
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        bill[field] = req.body[field];
      }
    });

    await bill.save(); // pre-save hook recalculates totals

    res.json({
      message: 'Bill updated successfully',
      bill,
    });
  } catch (error) {
    console.error('[Bills] Update error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Send bill SMS → status becomes SENT ──
router.post('/:id/send', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('customer');
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Validate status transition
    if (bill.status !== 'DRAFT') {
      return res.status(400).json({
        error: `Cannot send bill in '${bill.status}' status. Only DRAFT bills can be sent.`,
      });
    }

    // Create bill in Orange Money system
    const omResult = await orangeMoney.createBill({
      billNumber: bill.billNumber,
      customerPhone: bill.customerPhone,
      customerName: bill.customerName,
      amount: bill.total,
      description: `Bill ${bill.billNumber}`,
      dueDate: bill.dueDate,
      items: bill.items,
    });

    if (!omResult.success) {
      return res.status(502).json({
        error: 'Failed to create bill in Orange Money system',
        details: omResult.message,
      });
    }

    // Send SMS with payment link
    const smsResult = await smsService.sendBillPaymentLink({
      phone: bill.customerPhone,
      billId: bill._id,
      billNumber: bill.billNumber,
      amount: bill.total,
      paymentUrl: omResult.paymentUrl,
      dueDate: bill.dueDate,
      customerId: bill.customer?._id || bill.customer,
    });

    // Update bill status to SENT
    bill.status = 'SENT';
    bill.sentAt = new Date();
    bill.paymentRef = omResult.billRef || '';
    await bill.save();

    res.json({
      message: 'Bill sent to customer',
      bill,
      orangeMoney: omResult,
      sms: smsResult,
    });
  } catch (error) {
    console.error('[Bills] Send error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Cancel bill ──
router.post('/:id/cancel', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Can only cancel DRAFT or SENT or OVERDUE bills
    if (!['DRAFT', 'SENT', 'OVERDUE'].includes(bill.status)) {
      return res.status(400).json({
        error: `Cannot cancel bill in '${bill.status}' status.`,
      });
    }

    bill.status = 'CANCELLED';
    await bill.save();

    res.json({
      message: 'Bill cancelled successfully',
      bill,
    });
  } catch (error) {
    console.error('[Bills] Cancel error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Orange Money Payment Callback Webhook ──
router.post('/webhook/orange', async (req, res) => {
  try {
    console.log('[Bills:Webhook] Received Orange Money callback:', JSON.stringify(req.body));

    // Verify the callback
    const verification = orangeMoney.verifyCallback(req.body, req.headers);

    if (!verification.valid) {
      console.error('[Bills:Webhook] Invalid callback:', verification.message);
      return res.status(400).json({ error: verification.message });
    }

    // Find the bill by paymentRef (billRef from Orange)
    const bill = await Bill.findOne({ paymentRef: verification.billRef });
    if (!bill) {
      console.error('[Bills:Webhook] Bill not found for ref:', verification.billRef);
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Process based on payment status
    if (verification.status === 'SUCCESSFUL') {
      const amountPaid = verification.amount || bill.balanceDue;

      // Update bill payment
      bill.amountPaid += amountPaid;
      bill.balanceDue = bill.total - bill.amountPaid;

      if (bill.balanceDue <= 0) {
        bill.status = 'PAID';
        bill.paidAt = new Date();
      } else {
        bill.status = 'PARTIALLY_PAID';
      }

      bill.paymentRef = verification.transactionRef || bill.paymentRef;
      await bill.save();

      // Send receipt SMS
      await smsService.sendPaymentReceipt({
        phone: bill.customerPhone,
        billId: bill._id,
        billNumber: bill.billNumber,
        amount: amountPaid,
        transactionRef: verification.transactionRef,
        customerId: bill.customer,
      });

      console.log(`[Bills:Webhook] Bill ${bill.billNumber} updated to ${bill.status}`);
    } else {
      console.log(`[Bills:Webhook] Payment failed for bill ${bill.billNumber}:`, verification.message);
    }

    // Always respond with 200 to acknowledge receipt
    res.json({ received: true });
  } catch (error) {
    console.error('[Bills:Webhook] Error:', error.message);
    // Always respond with 200 so Orange doesn't retry indefinitely
    res.json({ received: true, error: error.message });
  }
});

// ── Get SMS logs for a bill ──
router.get('/:id/sms-logs', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const smsLogs = await SmsLog.find({ bill: bill._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ smsLogs });
  } catch (error) {
    console.error('[Bills] SMS logs error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Send overdue reminder ──
router.post('/:id/reminder', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('customer');
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    if (!['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(bill.status)) {
      return res.status(400).json({
        error: `Cannot send reminder for bill in '${bill.status}' status.`,
      });
    }

    // Generate payment URL (re-use existing paymentRef or create new one)
    const paymentUrl = bill.paymentRef
      ? `https://pay.orange.cm/bill/${bill.paymentRef}`
      : `https://pay.orange.cm/bill/${bill._id}`;

    const smsResult = await smsService.sendOverdueReminder({
      phone: bill.customerPhone,
      billId: bill._id,
      billNumber: bill.billNumber,
      amount: bill.balanceDue,
      paymentUrl,
      customerId: bill.customer?._id || bill.customer,
    });

    // If bill was overdue, keep it as overdue
    if (bill.status === 'SENT' || bill.status === 'PARTIALLY_PAID') {
      bill.status = 'OVERDUE';
      bill.overdueAt = new Date();
      await bill.save();
    }

    res.json({
      message: 'Overdue reminder sent',
      bill,
      sms: smsResult,
    });
  } catch (error) {
    console.error('[Bills] Reminder error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Bill stats (for dashboard) ──
router.get('/stats/summary', async (req, res) => {
  try {
    const [totalBills, byStatus, totalOutstanding] = await Promise.all([
      Bill.countDocuments(),
      Bill.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } },
      ]),
      Bill.aggregate([
        { $match: { status: { $in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } } },
        { $group: { _id: null, total: { $sum: '$balanceDue' } } },
      ]),
    ]);

    const statusMap = {};
    byStatus.forEach(s => {
      statusMap[s._id] = { count: s.count, total: s.total };
    });

    res.json({
      totalBills,
      byStatus: statusMap,
      totalOutstanding: totalOutstanding[0]?.total || 0,
    });
  } catch (error) {
    console.error('[Bills] Stats error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
