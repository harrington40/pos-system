// Polyfill globalThis.crypto for Node 18 compatibility with MongoDB driver 6.x
if (typeof globalThis.crypto === 'undefined') {
  const crypto = require('crypto');
  globalThis.crypto = crypto;
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const menuRoutes = require('./routes/menu');
const aiDebugRoutes = require('./routes/ai-debug');
const orderRoutes = require('./routes/orders');
const inventoryRoutes = require('./routes/inventory');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');
const employeeRoutes = require('./routes/employees');
const discountRoutes = require('./routes/discounts');
const paymentRoutes = require('./routes/payments');
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const transactionRoutes = require('./routes/transactions');
const mobilePaymentRoutes = require('./routes/mobile-payments');
const orchestratorRoutes = require('./routes/payment-orchestrator');
const uploadRoutes = require('./routes/upload');
const billRoutes = require('./routes/bills');
const b2Service = require('./services/b2-service');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/mobile-payments', mobilePaymentRoutes);
app.use('/api/orchestrator', orchestratorRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/bills', billRoutes);

// ── Periodic cleanup: delete held transactions older than 2 hours ──
const Transaction = require('./models/Transaction');
setInterval(async () => {
  try {
    const deleted = await Transaction.deleteExpiredHeldTransactions(2 * 60 * 60 * 1000);
    if (deleted > 0) {
      console.log(`[Transaction Cleanup] Deleted ${deleted} expired held transaction(s) (older than 2h)`);
    }
  } catch (err) {
    console.error('[Transaction Cleanup] Error:', err.message);
  }
}, 10 * 60 * 1000); // Check every 10 minutes

// AI Debug Routes (Development Only)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/ai', aiDebugRoutes);
  console.log('[Dev] AI debug routes enabled at /api/ai');
}

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');

    // Initialize Backblaze B2 service (non-blocking — logs warning if not configured)
    b2Service.initialize().catch(err => {
      console.warn('[Server] B2 initialization warning:', err.message);
    });

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error(err));
