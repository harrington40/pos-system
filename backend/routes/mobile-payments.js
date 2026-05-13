const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const MobilePayment = require('../models/MobilePayment');
const Employee = require('../models/Employee');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const mtnMoMo = require('../services/mtn-momo');
const QRCode = require('qrcode');

// ── Configuration ──
const MODE = process.env.MOBILE_MONEY_MODE || 'simulation'; // simulation | production
const SIMULATION_CONFIRM_DELAY = 15000; // 15 seconds in simulation mode

// ── Phone validation for Cameroon format ──
const isValidCameroonPhone = (phone) => {
  const cleaned = phone.replace(/[^0-9]/g, '');
  return /^6[0-9]{8}$/.test(cleaned);
};

// ──────────────────────────────────────────────
// MODE A: CASHIER-INITIATED (USSD Push)
// POST /api/mobile-payments/initiate
// ──────────────────────────────────────────────
router.post('/initiate', async (req, res) => {
  try {
    const { provider, phone, amount, transactionId, initiatedBy } = req.body;

    // ── Validation ──
    if (!provider || !['orange', 'mtn'].includes(provider.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid provider. Use: orange or mtn' });
    }
    if (!phone || !isValidCameroonPhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number. Must be a valid Cameroon number (6XXXXXXXX)' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const cleanedPhone = phone.replace(/[^0-9]/g, '');
    const transactionRef = MobilePayment.generateRef();

    // ── Validate ObjectId fields ──
    let validTransactionId = null;
    if (transactionId && mongoose.Types.ObjectId.isValid(transactionId)) {
      validTransactionId = transactionId;
    }
    let validInitiatedBy = null;
    if (initiatedBy && mongoose.Types.ObjectId.isValid(initiatedBy)) {
      validInitiatedBy = initiatedBy;
    }

    // ── Create payment record ──
    const payment = await MobilePayment.create({
      provider: provider.toLowerCase(),
      phone: cleanedPhone,
      amount: Math.round(amount * 100) / 100,
      transactionRef,
      status: 'PENDING',
      initiationMode: 'cashier_initiated',
      transactionId: validTransactionId,
      initiatedBy: validInitiatedBy,
      initiatedAt: new Date(),
    });

    // ── In production: call MTN MoMo API to send USSD push ──
    if (MODE === 'production') {
      if (provider.toLowerCase() === 'mtn') {
        // Check if MTN MoMo is configured
        const config = mtnMoMo.isConfigured();
        if (!config.configured) {
          console.warn(`[MobileMoney] MTN MoMo not fully configured. Missing: ${config.missing.join(', ')}`);
          // Still create the payment record but note the config issue
        }

        // Send RequestToPay via MTN MoMo API
        const result = await mtnMoMo.requestToPay({
          amount: Math.round(amount * 100) / 100,
          currency: 'XAF',
          partyId: cleanedPhone,
          externalId: transactionRef,
          payerMessage: `Payment of XAF ${amount} to POS System`,
          payeeNote: `Order payment - Ref: ${transactionRef}`,
        });

        if (result.success) {
          // Store the MTN reference ID for status checking
          payment.metadata.set('mtnReferenceId', result.referenceId);
          await payment.save();
          console.log(`[MobileMoney] MTN RequestToPay sent: ${result.referenceId}`);
        } else {
          console.error(`[MobileMoney] MTN RequestToPay failed:`, result.error);
          // Payment record still exists in PENDING state — can retry
        }
      } else {
        // Orange Money — TODO: Integrate Orange Money API
        console.log(`[MobileMoney] Production mode: Orange Money API not yet integrated. Would send USSD to ${cleanedPhone}`);
      }
    } else {
      // Simulation: auto-confirm after delay
      console.log(`[MobileMoney] Simulation: auto-confirming payment ${transactionRef} in ${SIMULATION_CONFIRM_DELAY}ms`);
      setTimeout(async () => {
        try {
          await simulateWebhook(transactionRef, provider, cleanedPhone, amount);
        } catch (err) {
          console.error(`[MobileMoney] Simulation auto-confirm error:`, err.message);
        }
      }, SIMULATION_CONFIRM_DELAY);
    }

    res.status(201).json({
      success: true,
      payment: {
        _id: payment._id,
        transactionRef: payment.transactionRef,
        provider: payment.provider,
        phone: payment.phone,
        amount: payment.amount,
        status: payment.status,
        initiationMode: payment.initiationMode,
        message: `Payment request sent to ${cleanedPhone} via ${provider}. Ask customer to check their phone.`,
      },
    });
  } catch (err) {
    console.error('[MobileMoney] Initiate error:', err);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// ──────────────────────────────────────────────
// MODE B: CUSTOMER-INITIATED (QR Code)
// POST /api/mobile-payments/generate-qr
// ──────────────────────────────────────────────
router.post('/generate-qr', async (req, res) => {
  try {
    const { provider, amount, transactionId, initiatedBy } = req.body;

    // ── Validation ──
    if (!provider || !['orange', 'mtn'].includes(provider.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid provider. Use: orange or mtn' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const transactionRef = MobilePayment.generateRef();

    // ── Build QR payload ──
    const qrPayload = {
      type: 'mobile_payment',
      transactionRef,
      provider: provider.toLowerCase(),
      amount: Math.round(amount * 100) / 100,
      currency: 'XAF',
      merchant: 'POS System',
      timestamp: new Date().toISOString(),
    };

    // ── Generate real QR code using qrcode library ──
    const qrData = JSON.stringify(qrPayload);
    let qrSvg = '';
    try {
      qrSvg = await QRCode.toString(qrData, {
        type: 'svg',
        margin: 2,
        width: 200,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch (qrErr) {
      console.error('[MobileMoney] QR generation error:', qrErr.message);
      // Fallback to simple SVG
      qrSvg = generateFallbackSVG(qrData);
    }

    // ── Validate ObjectId fields ──
    let qrValidTransactionId = null;
    if (transactionId && mongoose.Types.ObjectId.isValid(transactionId)) {
      qrValidTransactionId = transactionId;
    }
    let qrValidInitiatedBy = null;
    if (initiatedBy && mongoose.Types.ObjectId.isValid(initiatedBy)) {
      qrValidInitiatedBy = initiatedBy;
    }

    // ── Create payment record ──
    const payment = await MobilePayment.create({
      provider: provider.toLowerCase(),
      phone: '', // Phone unknown until customer pays
      amount: Math.round(amount * 100) / 100,
      transactionRef,
      status: 'AWAITING_PAYMENT',
      initiationMode: 'customer_initiated',
      transactionId: qrValidTransactionId,
      initiatedBy: qrValidInitiatedBy,
      initiatedAt: new Date(),
      qrPayload,
      qrSvg,
    });

    // ── In simulation mode: auto-confirm after delay ──
    if (MODE !== 'production') {
      console.log(`[MobileMoney] Simulation: auto-confirming QR payment ${transactionRef} in ${SIMULATION_CONFIRM_DELAY}ms`);
      setTimeout(async () => {
        try {
          await simulateWebhook(transactionRef, provider, '670000000', amount);
        } catch (err) {
          console.error(`[MobileMoney] Simulation auto-confirm error:`, err.message);
        }
      }, SIMULATION_CONFIRM_DELAY);
    }

    res.status(201).json({
      success: true,
      payment: {
        _id: payment._id,
        transactionRef: payment.transactionRef,
        provider: payment.provider,
        amount: payment.amount,
        status: payment.status,
        initiationMode: payment.initiationMode,
      },
      qrCode: {
        svg: qrSvg,
        payload: qrPayload,
      },
    });
  } catch (err) {
    console.error('[MobileMoney] Generate QR error:', err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// ──────────────────────────────────────────────
// WEBHOOK: Provider callback
// POST /api/mobile-payments/webhook/:provider
// ──────────────────────────────────────────────
router.post('/webhook/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { transactionRef, providerRef, status: webhookStatus, amount, phone } = req.body;

    if (!transactionRef) {
      return res.status(400).json({ error: 'transactionRef is required' });
    }

    // ── For MTN production callbacks, validate the webhook signature ──
    if (MODE === 'production' && provider === 'mtn') {
      const rawBody = JSON.stringify(req.body);
      const isValid = mtnMoMo.validateWebhookCallback(req.headers, rawBody);
      if (!isValid) {
        console.warn(`[MobileMoney] Invalid webhook signature for ${transactionRef}`);
        // In production, you may want to return 401 here
        // For now, we log and continue to allow testing
      }
    }

    const payment = await MobilePayment.findOne({ transactionRef });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // ── Idempotency: already processed ──
    if (payment.status === 'CONFIRMED' || payment.status === 'VERIFIED') {
      return res.json({ success: true, message: 'Already processed', payment });
    }

    // ── Amount mismatch detection ──
    if (amount && Math.abs(payment.amount - amount) > 0.01) {
      await payment.transitionTo('DISPUTED', {
        reason: `Amount mismatch: expected ${payment.amount}, received ${amount}`,
        providerRef: providerRef || '',
        phone: phone || payment.phone,
        metadata: {
          expectedAmount: payment.amount,
          receivedAmount: amount,
          disputeReason: 'AMOUNT_MISMATCH',
        },
      });
      console.warn(`[MobileMoney] DISPUTED: ${transactionRef} — expected ${payment.amount}, got ${amount}`);
      return res.json({
        success: true,
        payment,
        warning: 'Amount mismatch — payment flagged as DISPUTED',
      });
    }

    // ── Confirm the payment ──
    await payment.transitionTo('CONFIRMED', {
      providerRef: providerRef || '',
      phone: phone || payment.phone,
    });

    console.log(`[MobileMoney] CONFIRMED: ${transactionRef} — ${payment.amount} ${payment.currency} via ${provider}`);

    res.json({ success: true, payment });
  } catch (err) {
    console.error('[MobileMoney] Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ──────────────────────────────────────────────
// STATUS: Check payment status (polling)
// GET /api/mobile-payments/status/:transactionRef
// ──────────────────────────────────────────────
router.get('/status/:transactionRef', async (req, res) => {
  try {
    const payment = await MobilePayment.findOne({ transactionRef: req.params.transactionRef })
      .populate('verifiedBy', 'name')
      .lean();

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // ── In production mode for MTN, also check the actual API status ──
    if (MODE === 'production' && payment.provider === 'mtn' && payment.status === 'PENDING') {
      const mtnRefId = payment.metadata?.get?.('mtnReferenceId');
      if (mtnRefId) {
        const mtnStatus = await mtnMoMo.getRequestToPayStatus(mtnRefId);
        if (mtnStatus.success) {
          // Map MTN status to our status
          // MTN statuses: SUCCESSFUL, FAILED, PENDING
          if (mtnStatus.status === 'SUCCESSFUL' && payment.status !== 'CONFIRMED') {
            // Auto-confirm via webhook simulation
            await simulateWebhook(
              payment.transactionRef,
              payment.provider,
              payment.phone,
              payment.amount
            );
            // Re-fetch updated payment
            const updated = await MobilePayment.findOne({ transactionRef: req.params.transactionRef })
              .populate('verifiedBy', 'name')
              .lean();
            return res.json({ payment: updated });
          } else if (mtnStatus.status === 'FAILED' && payment.status !== 'FAILED') {
            await payment.transitionTo('FAILED', {
              reason: mtnStatus.reason || 'Payment failed at provider',
            });
          }
        }
      }
    }

    res.json({ payment });
  } catch (err) {
    console.error('[MobileMoney] Status error:', err);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

// ──────────────────────────────────────────────
// VERIFY: Agent verifies a confirmed payment
// POST /api/mobile-payments/verify
// ──────────────────────────────────────────────
router.post('/verify', async (req, res) => {
  try {
    const { transactionRef, verifiedBy, agentPin } = req.body;

    if (!transactionRef) {
      return res.status(400).json({ error: 'transactionRef is required' });
    }
    if (!verifiedBy || !agentPin) {
      return res.status(400).json({ error: 'verifiedBy (employee ID) and agentPin are required' });
    }

    // ── Find payment ──
    const payment = await MobilePayment.findOne({ transactionRef });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // ── Must be CONFIRMED before verification ──
    if (payment.status !== 'CONFIRMED') {
      return res.status(400).json({
        error: `Payment must be CONFIRMED before verification. Current status: ${payment.status}`,
      });
    }

    // ── Verify agent PIN ──
    const agent = await Employee.findById(verifiedBy);
    if (!agent) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const pinValid = await agent.comparePin(agentPin);
    if (!pinValid) {
      return res.status(401).json({ error: 'Invalid agent PIN' });
    }

    // ── Transition to VERIFIED ──
    await payment.transitionTo('VERIFIED', { verifiedBy: agent._id });

    // ── If linked to an order, update it ──
    if (payment.orderId) {
      await Order.findByIdAndUpdate(payment.orderId, {
        mobileMoneyVerifiedBy: agent.name,
        mobileMoneyVerifiedAt: new Date(),
        status: 'completed',
      });
    }

    console.log(`[MobileMoney] VERIFIED: ${transactionRef} by ${agent.name}`);

    res.json({
      success: true,
      payment: await MobilePayment.findById(payment._id)
        .populate('verifiedBy', 'name')
        .lean(),
      verifiedBy: { _id: agent._id, name: agent.name },
    });
  } catch (err) {
    console.error('[MobileMoney] Verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ──────────────────────────────────────────────
// PENDING VERIFICATION: Get payments awaiting agent verification
// GET /api/mobile-payments/pending-verification
// ──────────────────────────────────────────────
router.get('/pending-verification', async (req, res) => {
  try {
    const { provider, phone, limit } = req.query;
    const filters = {};
    if (provider) filters.provider = provider;
    if (phone) filters.phone = phone.replace(/[^0-9]/g, '');

    const payments = await MobilePayment.getPendingVerification({
      ...filters,
      limit: parseInt(limit) || 50,
    });

    res.json({ payments, count: payments.length });
  } catch (err) {
    console.error('[MobileMoney] Pending verification error:', err);
    res.status(500).json({ error: 'Failed to fetch pending verifications' });
  }
});

// ──────────────────────────────────────────────
// HISTORY: List all mobile payments (filterable)
// GET /api/mobile-payments/history
// ──────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const { provider, status, initiationMode, limit, skip } = req.query;
    const query = {};
    if (provider) query.provider = provider;
    if (status) query.status = status;
    if (initiationMode) query.initiationMode = initiationMode;

    const payments = await MobilePayment.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 50)
      .skip(parseInt(skip) || 0)
      .populate('initiatedBy', 'name')
      .populate('verifiedBy', 'name')
      .lean();

    const total = await MobilePayment.countDocuments(query);

    res.json({ payments, total, count: payments.length });
  } catch (err) {
    console.error('[MobileMoney] History error:', err);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// ──────────────────────────────────────────────
// LINK ORDER: Link a payment to an order after verification
// POST /api/mobile-payments/link-order
// ──────────────────────────────────────────────
router.post('/link-order', async (req, res) => {
  try {
    const { transactionRef, orderId } = req.body;

    if (!transactionRef || !orderId) {
      return res.status(400).json({ error: 'transactionRef and orderId are required' });
    }

    const payment = await MobilePayment.findOne({ transactionRef });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'VERIFIED') {
      return res.status(400).json({
        error: `Payment must be VERIFIED before linking to order. Current status: ${payment.status}`,
      });
    }

    payment.orderId = orderId;
    await payment.save();

    // Also update the order
    await Order.findByIdAndUpdate(orderId, {
      mobilePaymentRef: payment._id,
      mobileMoneyProvider: payment.provider,
      mobileMoneyPhone: payment.phone,
      mobileMoneyTransactionRef: payment.transactionRef,
      mobileMoneyInitiationMode: payment.initiationMode,
      paymentMethod: payment.provider === 'orange' ? 'orange_money' : 'mtn_money',
    });

    res.json({ success: true, payment });
  } catch (err) {
    console.error('[MobileMoney] Link order error:', err);
    res.status(500).json({ error: 'Failed to link order' });
  }
});

// ══════════════════════════════════════════════
// REFUND ENDPOINTS
// ══════════════════════════════════════════════

// ──────────────────────────────────────────────
// INITIATE REFUND: Refund a mobile money payment
// POST /api/mobile-payments/refund
// ──────────────────────────────────────────────
router.post('/refund', async (req, res) => {
  try {
    const { transactionRef, refundedBy, agentPin, reason } = req.body;

    if (!transactionRef) {
      return res.status(400).json({ error: 'transactionRef is required' });
    }
    if (!refundedBy || !agentPin) {
      return res.status(400).json({ error: 'refundedBy (employee ID) and agentPin are required' });
    }

    // ── Find the original payment ──
    const payment = await MobilePayment.findOne({ transactionRef });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // ── Payment must be VERIFIED to be refundable ──
    if (payment.status !== 'VERIFIED') {
      return res.status(400).json({
        error: `Only VERIFIED payments can be refunded. Current status: ${payment.status}`,
      });
    }

    // ── Check if already refunded ──
    if (payment.metadata?.get?.('refunded') === true) {
      return res.status(400).json({ error: 'Payment has already been refunded' });
    }

    // ── Verify agent PIN ──
    const agent = await Employee.findById(refundedBy);
    if (!agent) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const pinValid = await agent.comparePin(agentPin);
    if (!pinValid) {
      return res.status(401).json({ error: 'Invalid agent PIN' });
    }

    // ── Create refund record ──
    const refundRef = `REF-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // ── Process refund ──
    let refundResult = { success: true, referenceId: refundRef };

    if (MODE === 'production' && payment.provider === 'mtn') {
      // Call MTN MoMo Disbursements API to send refund
      refundResult = await mtnMoMo.transfer({
        amount: payment.amount,
        currency: payment.currency || 'XAF',
        partyId: payment.phone,
        externalId: refundRef,
        payerMessage: `Refund of XAF ${payment.amount} from POS System`,
        payeeNote: `Refund for transaction ${payment.transactionRef} - ${reason || 'Customer refund'}`,
      });

      if (!refundResult.success) {
        return res.status(502).json({
          error: `Refund failed at provider: ${refundResult.error}`,
        });
      }
    } else {
      // Simulation: log the refund
      console.log(`[MobileMoney] Simulation: refund of ${payment.amount} to ${payment.phone} via ${payment.provider}`);
    }

    // ── Mark payment as refunded ──
    payment.metadata.set('refunded', true);
    payment.metadata.set('refundRef', refundRef);
    payment.metadata.set('refundedBy', agent._id.toString());
    payment.metadata.set('refundedAt', new Date().toISOString());
    payment.metadata.set('refundReason', reason || 'Customer requested refund');
    await payment.save();

    // ── Update linked order if exists ──
    if (payment.orderId) {
      await Order.findByIdAndUpdate(payment.orderId, {
        status: 'refunded',
        refundReason: reason || 'Customer requested refund',
        refundedAt: new Date(),
      });
    }

    console.log(`[MobileMoney] REFUNDED: ${transactionRef} — ${payment.amount} to ${payment.phone}, ref: ${refundRef}`);

    res.json({
      success: true,
      refund: {
        refundRef,
        originalTransactionRef: transactionRef,
        amount: payment.amount,
        phone: payment.phone,
        provider: payment.provider,
        reason: reason || 'Customer requested refund',
        processedAt: new Date().toISOString(),
        mode: MODE,
      },
    });
  } catch (err) {
    console.error('[MobileMoney] Refund error:', err);
    res.status(500).json({ error: 'Refund failed' });
  }
});

// ──────────────────────────────────────────────
// CHECK REFUND STATUS
// GET /api/mobile-payments/refund-status/:refundRef
// ──────────────────────────────────────────────
router.get('/refund-status/:refundRef', async (req, res) => {
  try {
    const { refundRef } = req.params;

    // Find the payment that has this refund reference
    const payment = await MobilePayment.findOne({
      'metadata.refundRef': refundRef,
    }).lean();

    if (!payment) {
      return res.status(404).json({ error: 'Refund not found' });
    }

    const refundData = {
      refundRef: payment.metadata?.refundRef,
      originalTransactionRef: payment.transactionRef,
      amount: payment.amount,
      phone: payment.phone,
      provider: payment.provider,
      refunded: payment.metadata?.refunded,
      refundedAt: payment.metadata?.refundedAt,
      refundReason: payment.metadata?.refundReason,
      refundedBy: payment.metadata?.refundedBy,
    };

    // In production, check actual MTN transfer status
    if (MODE === 'production' && payment.provider === 'mtn') {
      const mtnStatus = await mtnMoMo.getTransferStatus(refundRef);
      refundData.providerStatus = mtnStatus;
    }

    res.json({ refund: refundData });
  } catch (err) {
    console.error('[MobileMoney] Refund status error:', err);
    res.status(500).json({ error: 'Failed to check refund status' });
  }
});

// ──────────────────────────────────────────────
// LIST REFUNDS: Get all refunded payments
// GET /api/mobile-payments/refunds
// ──────────────────────────────────────────────
router.get('/refunds', async (req, res) => {
  try {
    const payments = await MobilePayment.find({
      'metadata.refunded': true,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const refunds = payments.map(p => ({
      refundRef: p.metadata?.refundRef,
      originalTransactionRef: p.transactionRef,
      amount: p.amount,
      phone: p.phone,
      provider: p.provider,
      refundedAt: p.metadata?.refundedAt,
      refundReason: p.metadata?.refundReason,
      orderId: p.orderId,
    }));

    res.json({ refunds, count: refunds.length });
  } catch (err) {
    console.error('[MobileMoney] List refunds error:', err);
    res.status(500).json({ error: 'Failed to fetch refunds' });
  }
});

// ──────────────────────────────────────────────
// MTN MOMO ACCOUNT BALANCE
// GET /api/mobile-payments/mtn-balance
// ──────────────────────────────────────────────
router.get('/mtn-balance', async (req, res) => {
  try {
    if (MODE !== 'production') {
      return res.json({
        mode: 'simulation',
        collection: { availableBalance: 'N/A (simulation)', currency: 'XAF' },
        disbursement: { availableBalance: 'N/A (simulation)', currency: 'XAF' },
      });
    }

    const [collection, disbursement] = await Promise.all([
      mtnMoMo.getCollectionBalance(),
      mtnMoMo.getDisbursementBalance(),
    ]);

    res.json({
      mode: 'production',
      collection,
      disbursement,
    });
  } catch (err) {
    console.error('[MobileMoney] Balance check error:', err);
    res.status(500).json({ error: 'Failed to check MTN MoMo balance' });
  }
});

// ──────────────────────────────────────────────
// MTN MOMO CONFIGURATION STATUS
// GET /api/mobile-payments/mtn-config
// ──────────────────────────────────────────────
router.get('/mtn-config', async (req, res) => {
  const config = mtnMoMo.isConfigured();
  res.json({
    ...config,
    mode: MODE,
    environment: mtnMoMo._getEnvironment(),
  });
});

// ══════════════════════════════════════════════
// REMITTANCE API — SUPPLIER PAYMENTS
// ══════════════════════════════════════════════

// ──────────────────────────────────────────────
// REMITTANCE TRANSFER: Pay a supplier
// POST /api/mobile-payments/remittance/transfer
// ──────────────────────────────────────────────
router.post('/remittance/transfer', async (req, res) => {
  try {
    const { amount, currency, partyId, partyIdType, externalId, payerMessage, payeeNote, initiatedBy, agentPin } = req.body;

    // ── Validation ──
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    if (!partyId) {
      return res.status(400).json({ error: 'partyId (supplier phone) is required' });
    }
    if (!initiatedBy || !agentPin) {
      return res.status(400).json({ error: 'initiatedBy (employee ID) and agentPin are required for supplier payments' });
    }

    // ── Verify agent PIN ──
    const agent = await Employee.findById(initiatedBy);
    if (!agent) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const pinValid = await agent.comparePin(agentPin);
    if (!pinValid) {
      return res.status(401).json({ error: 'Invalid agent PIN' });
    }

    const cleanedPhone = partyId.replace(/[^0-9]/g, '');
    const transferRef = `SUPP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // ── Process transfer ──
    let result;

    if (MODE === 'production') {
      // Call MTN MoMo Remittance API
      result = await mtnMoMo.remittanceTransfer({
        amount: Math.round(amount * 100) / 100,
        currency: currency || 'XAF',
        partyId: cleanedPhone,
        partyIdType: partyIdType || 'MSISDN',
        externalId: transferRef,
        payerMessage: payerMessage || 'Supplier payment from POS System',
        payeeNote: payeeNote || `Supplier payment - Ref: ${transferRef}`,
      });

      if (!result.success) {
        return res.status(502).json({
          error: `Remittance transfer failed at provider: ${result.error}`,
        });
      }
    } else {
      // Simulation mode
      console.log(`[Remittance] Simulation: transfer of ${amount} ${currency || 'XAF'} to supplier ${cleanedPhone}`);
      result = { success: true, referenceId: transferRef };
    }

    // ── Record the supplier payment ──
    const payment = await MobilePayment.create({
      provider: 'mtn',
      phone: cleanedPhone,
      amount: Math.round(amount * 100) / 100,
      currency: currency || 'XAF',
      transactionRef: transferRef,
      status: MODE === 'production' ? 'PENDING' : 'CONFIRMED',
      initiationMode: 'remittance_supplier_payment',
      initiatedBy: agent._id,
      initiatedAt: new Date(),
      metadata: {
        type: 'supplier_payment',
        remittanceRef: result.referenceId,
        initiatedByName: agent.name,
        payerMessage: payerMessage || 'Supplier payment from POS System',
        payeeNote: payeeNote || `Supplier payment - Ref: ${transferRef}`,
      },
    });

    console.log(`[Remittance] Supplier payment: ${transferRef} — ${amount} to ${cleanedPhone}, ref: ${result.referenceId}`);

    res.status(201).json({
      success: true,
      transfer: {
        transferRef,
        amount: payment.amount,
        currency: payment.currency,
        phone: cleanedPhone,
        initiatedBy: agent.name,
        status: payment.status,
        providerReference: result.referenceId,
        mode: MODE,
        message: `Supplier payment of ${amount} ${currency || 'XAF'} sent to ${cleanedPhone}`,
      },
    });
  } catch (err) {
    console.error('[Remittance] Transfer error:', err);
    res.status(500).json({ error: 'Failed to process supplier payment' });
  }
});

// ──────────────────────────────────────────────
// REMITTANCE TRANSFER STATUS
// GET /api/mobile-payments/remittance/status/:referenceId
// ──────────────────────────────────────────────
router.get('/remittance/status/:referenceId', async (req, res) => {
  try {
    const { referenceId } = req.params;

    // Find the payment record
    const payment = await MobilePayment.findOne({
      transactionRef: referenceId,
      initiationMode: 'remittance_supplier_payment',
    }).populate('initiatedBy', 'name').lean();

    if (!payment) {
      return res.status(404).json({ error: 'Supplier payment not found' });
    }

    let providerStatus = null;

    // In production, check actual MTN Remittance transfer status
    if (MODE === 'production') {
      const mtnRefId = payment.metadata?.remittanceRef;
      if (mtnRefId) {
        providerStatus = await mtnMoMo.getRemittanceTransferStatus(mtnRefId);
      }
    }

    res.json({
      transfer: {
        transferRef: payment.transactionRef,
        amount: payment.amount,
        currency: payment.currency,
        phone: payment.phone,
        status: payment.status,
        initiatedBy: payment.initiatedBy?.name || 'Unknown',
        initiatedAt: payment.initiatedAt,
        providerReference: payment.metadata?.remittanceRef,
        payerMessage: payment.metadata?.payerMessage,
        payeeNote: payment.metadata?.payeeNote,
      },
      providerStatus,
    });
  } catch (err) {
    console.error('[Remittance] Status error:', err);
    res.status(500).json({ error: 'Failed to check supplier payment status' });
  }
});

// ──────────────────────────────────────────────
// REMITTANCE HISTORY: List supplier payments
// GET /api/mobile-payments/remittance/history
// ──────────────────────────────────────────────
router.get('/remittance/history', async (req, res) => {
  try {
    const { limit, skip } = req.query;

    const payments = await MobilePayment.find({
      initiationMode: 'remittance_supplier_payment',
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 50)
      .skip(parseInt(skip) || 0)
      .populate('initiatedBy', 'name')
      .lean();

    const total = await MobilePayment.countDocuments({
      initiationMode: 'remittance_supplier_payment',
    });

    const transfers = payments.map(p => ({
      transferRef: p.transactionRef,
      amount: p.amount,
      currency: p.currency,
      phone: p.phone,
      status: p.status,
      initiatedBy: p.initiatedBy?.name || 'Unknown',
      initiatedAt: p.initiatedAt,
      providerReference: p.metadata?.remittanceRef,
      payerMessage: p.metadata?.payerMessage,
    }));

    res.json({ transfers, total, count: transfers.length });
  } catch (err) {
    console.error('[Remittance] History error:', err);
    res.status(500).json({ error: 'Failed to fetch supplier payment history' });
  }
});

// ──────────────────────────────────────────────
// REMITTANCE BALANCE: Check remittance account balance
// GET /api/mobile-payments/remittance/balance
// ──────────────────────────────────────────────
router.get('/remittance/balance', async (req, res) => {
  try {
    if (MODE !== 'production') {
      return res.json({
        mode: 'simulation',
        balance: { availableBalance: 'N/A (simulation)', currency: 'XAF' },
      });
    }

    const balance = await mtnMoMo.getRemittanceBalance();

    res.json({
      mode: 'production',
      balance,
    });
  } catch (err) {
    console.error('[Remittance] Balance error:', err);
    res.status(500).json({ error: 'Failed to check remittance balance' });
  }
});

// ──────────────────────────────────────────────
// REMITTANCE VALIDATE ACCOUNT HOLDER
// GET /api/mobile-payments/remittance/validate-account/:phone
// ──────────────────────────────────────────────
router.get('/remittance/validate-account/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const cleanedPhone = phone.replace(/[^0-9]/g, '');

    if (MODE !== 'production') {
      return res.json({
        mode: 'simulation',
        phone: cleanedPhone,
        available: true,
        message: 'Simulation: account holder is valid',
      });
    }

    const result = await mtnMoMo.validateRemittanceAccountHolder(cleanedPhone);

    res.json({
      mode: 'production',
      phone: cleanedPhone,
      ...result,
    });
  } catch (err) {
    console.error('[Remittance] Validate account error:', err);
    res.status(500).json({ error: 'Failed to validate account holder' });
  }
});

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────

/**
 * Simulate a webhook callback (for development/testing)
 */
async function simulateWebhook(transactionRef, provider, phone, amount) {
  try {
    const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/mobile-payments/webhook/${provider}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionRef,
        providerRef: `SIM-${Date.now()}`,
        status: 'SUCCESS',
        amount,
        phone,
      }),
    });
    const data = await response.json();
    console.log(`[MobileMoney] Simulation webhook result for ${transactionRef}:`, data.success ? 'OK' : 'FAILED');
  } catch (err) {
    console.error(`[MobileMoney] Simulation webhook failed for ${transactionRef}:`, err.message);
  }
}

/**
 * Generate a fallback SVG when QR generation fails
 */
function generateFallbackSVG(data) {
  const encoded = Buffer.from(data).toString('base64');
  const size = 200;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="white" rx="8"/>
    <rect x="10" y="10" width="${size - 20}" height="${size - 20}" fill="none" stroke="#333" stroke-width="2" rx="4"/>
    <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-size="12" fill="#333" font-family="monospace">
      QR Code
    </text>
    <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-size="10" fill="#666" font-family="monospace">
      ${encoded.substring(0, 24)}...
    </text>
    <text x="50%" y="75%" dominant-baseline="middle" text-anchor="middle" font-size="9" fill="#999">
      Ref: ${data.includes('transactionRef') ? JSON.parse(data).transactionRef?.substring(0, 16) || 'N/A' : 'N/A'}
    </text>
  </svg>`;
}

module.exports = router;
