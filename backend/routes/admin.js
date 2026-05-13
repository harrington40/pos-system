const express = require('express');
const router = express.Router();
const adminEngine = require('../services/admin-engine');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const MobilePayment = require('../models/MobilePayment');

// GET /api/admin/dashboard — Summary metrics for admin panel
router.get('/dashboard', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const summary = await adminEngine.getDashboardSummary(days);
    res.json(summary);
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/revenue-chart — Daily revenue data for charts
router.get('/revenue-chart', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await adminEngine.getRevenueForecast(days);
    res.json(data);
  } catch (err) {
    console.error('Revenue chart error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/category-breakdown — Revenue by category
router.get('/category-breakdown', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await adminEngine.getCategoryTrends(days);
    res.json(data);
  } catch (err) {
    console.error('Category breakdown error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/profit-margins — Profit margin analysis
router.get('/profit-margins', async (req, res) => {
  try {
    const data = await adminEngine.getProfitMargins();
    res.json(data);
  } catch (err) {
    console.error('Profit margins error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/sales-forecast — Revenue forecast + pricing suggestions
router.get('/sales-forecast', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const [forecast, pricing] = await Promise.all([
      adminEngine.getRevenueForecast(days),
      adminEngine.getPricingSuggestions()
    ]);
    res.json({ forecast, pricingSuggestions: pricing });
  } catch (err) {
    console.error('Sales forecast error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/inventory-turnover — Inventory turnover rates
router.get('/inventory-turnover', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await adminEngine.getInventoryTurnover(days);
    res.json(data);
  } catch (err) {
    console.error('Inventory turnover error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/staffing-suggestions — Optimal staffing recommendations
router.get('/staffing-suggestions', async (req, res) => {
  try {
    const data = await adminEngine.getStaffingSuggestions();
    res.json(data);
  } catch (err) {
    console.error('Staffing suggestions error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/discount-impact — Predict discount impact
router.get('/discount-impact', async (req, res) => {
  try {
    const percentage = parseFloat(req.query.percentage) || 10;
    const data = await adminEngine.predictDiscountImpact(percentage);
    res.json(data);
  } catch (err) {
    console.error('Discount impact error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/inventory-items — Full inventory with stock details for admin
router.get('/inventory-items', async (req, res) => {
  try {
    const MenuItem = require('../models/MenuItem');
    const items = await MenuItem.find({}).sort({ category: 1, name: 1 });

    const enriched = items.map(item => {
      const stockPct = item.stock > 0 && item.lowStockThreshold > 0
        ? Math.min(100, Math.round((item.stock / (item.lowStockThreshold * 3)) * 100))
        : 100;
      const status = item.stock <= 0 ? 'out' : item.stock <= item.lowStockThreshold ? 'low' : 'ok';
      const margin = item.price > 0 && item.costPrice > 0
        ? Math.round(((item.price - item.costPrice) / item.price) * 100)
        : 0;

      return {
        _id: item._id,
        name: item.name,
        category: item.category,
        stock: item.stock,
        lowStockThreshold: item.lowStockThreshold,
        price: item.price,
        costPrice: item.costPrice || 0,
        margin,
        sold: item.sold || 0,
        isAvailable: item.isAvailable,
        stockPct,
        status,
        barcode: item.barcode || '',
      };
    });

    const summary = {
      totalItems: enriched.length,
      lowStock: enriched.filter(i => i.status === 'low').length,
      outOfStock: enriched.filter(i => i.status === 'out').length,
      totalValue: enriched.reduce((s, i) => s + (i.stock * i.price), 0),
      totalCost: enriched.reduce((s, i) => s + (i.stock * i.costPrice), 0),
    };

    res.json({ items: enriched, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// UNIFIED TRANSACTION FEED: All transaction types in one view
// GET /api/admin/transactions
// ──────────────────────────────────────────────
router.get('/transactions', async (req, res) => {
  try {
    const { type, status, provider, limit, skip, days } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - (parseInt(days) || 7));

    const results = [];

    // ── 1. POS Transactions ──
    if (!type || type === 'pos') {
      const txFilter = { createdAt: { $gte: since } };
      if (status) txFilter.state = status.toUpperCase();

      const transactions = await Transaction.find(txFilter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) || 50)
        .skip(parseInt(skip) || 0)
        .lean();

      transactions.forEach(tx => {
        results.push({
          _id: tx._id,
          type: 'pos',
          transactionRef: tx._id.toString().slice(-8).toUpperCase(),
          state: tx.state,
          amount: tx.orderData?.total || 0,
          paymentMethod: tx.paymentMethod || 'N/A',
          items: tx.orderData?.items?.length || 0,
          initiatedBy: tx.initiatedBy || 'System',
          createdAt: tx.createdAt,
          completedAt: tx.completedAt,
          orderId: tx.orderId,
          paymentGatewayRef: tx.paymentGatewayRef,
          paymentAttempts: tx.paymentAttempts || 0,
          lastError: tx.lastError,
          errorLog: tx.errorLog || [],
          startedAt: tx.startedAt,
          onHoldAt: tx.onHoldAt,
          failedAt: tx.failedAt,
        });
      });
    }

    // ── 2. Mobile Money Payments ──
    if (!type || type === 'mobile_money') {
      const mpFilter = { createdAt: { $gte: since } };
      if (status) mpFilter.status = status.toUpperCase();
      if (provider) mpFilter.provider = provider;

      const mobilePayments = await MobilePayment.find(mpFilter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) || 50)
        .skip(parseInt(skip) || 0)
        .populate('initiatedBy', 'name')
        .populate('verifiedBy', 'name')
        .lean();

      mobilePayments.forEach(mp => {
        results.push({
          _id: mp._id,
          type: 'mobile_money',
          transactionRef: mp.transactionRef,
          provider: mp.provider,
          state: mp.status,
          amount: mp.amount,
          currency: mp.currency,
          phone: mp.phone,
          initiationMode: mp.initiationMode,
          initiatedBy: mp.initiatedBy?.name || 'Unknown',
          verifiedBy: mp.verifiedBy?.name || null,
          initiatedAt: mp.initiatedAt,
          confirmedAt: mp.confirmedAt,
          verifiedAt: mp.verifiedAt,
          failedAt: mp.failedAt,
          failureReason: mp.failureReason,
          orderId: mp.orderId,
          createdAt: mp.createdAt,
          refunded: mp.metadata?.refunded || false,
        });
      });
    }

    // ── 3. Completed Orders (for cash/card payments) ──
    if (!type || type === 'order') {
      const orderFilter = { createdAt: { $gte: since } };
      if (status) orderFilter.status = status.toLowerCase();

      const orders = await Order.find(orderFilter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) || 50)
        .skip(parseInt(skip) || 0)
        .lean();

      orders.forEach(order => {
        // Skip if already represented by a mobile payment
        const alreadyAdded = results.some(r =>
          r.orderId?.toString() === order._id.toString() && r.type !== 'order'
        );
        if (alreadyAdded) return;

        results.push({
          _id: order._id,
          type: 'order',
          transactionRef: order.receiptNumber || order._id.toString().slice(-8).toUpperCase(),
          state: order.status,
          amount: order.total,
          paymentMethod: order.paymentMethod || 'N/A',
          items: order.items?.length || 0,
          customerName: order.customerName || 'Walk-in',
          discountCode: order.discountCode,
          discountAmount: order.discountAmount,
          receiptNumber: order.receiptNumber,
          mobilePaymentRef: order.mobilePaymentRef,
          mobileMoneyProvider: order.mobileMoneyProvider,
          createdAt: order.createdAt,
        });
      });
    }

    // ── Sort all results by createdAt descending ──
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // ── Apply limit after sorting ──
    const finalLimit = parseInt(limit) || 50;
    const finalSkip = parseInt(skip) || 0;
    const paginated = results.slice(finalSkip, finalSkip + finalLimit);

    // ── Summary stats ──
    const summary = {
      total: results.length,
      pos: results.filter(r => r.type === 'pos').length,
      mobile_money: results.filter(r => r.type === 'mobile_money').length,
      order: results.filter(r => r.type === 'order').length,
      totalRevenue: results.reduce((s, r) => s + (r.amount || 0), 0),
      pendingVerifications: results.filter(r => r.type === 'mobile_money' && r.state === 'CONFIRMED').length,
      failed: results.filter(r =>
        (r.type === 'pos' && r.state === 'FAILED') ||
        (r.type === 'mobile_money' && r.state === 'FAILED') ||
        (r.type === 'order' && r.state === 'refunded')
      ).length,
    };

    res.json({ transactions: paginated, summary, count: paginated.length });
  } catch (err) {
    console.error('[Admin] Transactions feed error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
