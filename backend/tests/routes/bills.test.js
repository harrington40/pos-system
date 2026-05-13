const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');

// Mock orange-money and sms-service BEFORE requiring bills route
// Both export singleton instances, so mock the module directly
jest.mock('../../services/orange-money', () => ({
  isConfigured: jest.fn().mockReturnValue(true),
  createBill: jest.fn().mockResolvedValue({ success: true, data: { billRef: 'ORANGE-REF-001' }, paymentUrl: 'https://pay.orange.cm/bill/test', billRef: 'ORANGE-REF-001' }),
  checkBillStatus: jest.fn().mockResolvedValue({ success: true, data: { status: 'PAID' } }),
  sendBillSms: jest.fn().mockResolvedValue({ success: true, data: { messageId: 'MSG-001' } }),
  sendReceiptSms: jest.fn().mockResolvedValue({ success: true, data: { messageId: 'MSG-002' } }),
  sendOverdueSms: jest.fn().mockResolvedValue({ success: true, data: { messageId: 'MSG-003' } }),
  sendSms: jest.fn().mockResolvedValue({ success: true }),
  getAccessToken: jest.fn().mockResolvedValue('mock-token'),
  generateReference: jest.fn().mockReturnValue('REF-MOCK'),
  verifyCallback: jest.fn().mockReturnValue({ valid: true }),
}));

// sms-service exports a singleton instance (new SmsService()), not a class
jest.mock('../../services/sms-service', () => ({
  sendBillPaymentLink: jest.fn().mockResolvedValue({ success: true, data: { messageId: 'MSG-001' } }),
  sendPaymentReceipt: jest.fn().mockResolvedValue({ success: true, data: { messageId: 'MSG-002' } }),
  sendOverdueReminder: jest.fn().mockResolvedValue({ success: true, data: { messageId: 'MSG-003' } }),
  sendCustomSms: jest.fn().mockResolvedValue({ success: true }),
}));

const app = express();
app.use(express.json());

// Register models before requiring bills route (used in populate)
require('../../models/Employee');
require('../../models/Order');

const billRoutes = require('../../routes/bills');
app.use('/api/bills', billRoutes);

const Bill = require('../../models/Bill');
const Customer = require('../../models/Customer');
const { connect, disconnect, clearDatabase } = require('../helpers/mongoose');

describe('Bills API Routes', () => {
  let customerId;

  beforeAll(async () => {
    await connect();
    await clearDatabase();

    // Create a test customer
    const customer = await Customer.create({
      name: 'Test Customer',
      phone: '+237670000000',
    });
    customerId = customer._id;
  });

  afterAll(async () => {
    await disconnect();
  });

  beforeEach(async () => {
    await clearDatabase();
    // Re-create the test customer after clear
    const customer = await Customer.create({
      name: 'Test Customer',
      phone: '+237670000000',
    });
    customerId = customer._id;
  });

  describe('POST /api/bills', () => {
    it('should create a new bill', async () => {
      const res = await request(app)
        .post('/api/bills')
        .send({
          customerId: customerId.toString(),
          customerName: 'Test Customer',
          customerPhone: '+237670000000',
          items: [
            { description: 'Pizza', quantity: 2, unitPrice: 5000 },
            { description: 'Soda', quantity: 3, unitPrice: 1000 },
          ],
          taxRate: 0.05,
          discount: 500,
          dueDate: '2026-06-12',
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Bill created successfully');
      expect(res.body.bill).toBeDefined();
      expect(res.body.bill.billNumber).toBeDefined();
      expect(res.body.bill.status).toBe('DRAFT');
      expect(res.body.bill.items).toHaveLength(2);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/bills')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 404 for invalid customerId', async () => {
      const res = await request(app)
        .post('/api/bills')
        .send({
          customerId: new mongoose.Types.ObjectId().toString(),
          customerName: 'Unknown',
          customerPhone: '+237670000000',
          items: [{ description: 'Item', quantity: 1, unitPrice: 1000 }],
          dueDate: '2026-06-12',
        });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/bills', () => {
    it('should return paginated bills', async () => {
      // Create some bills
      for (let i = 0; i < 5; i++) {
        await Bill.create({
          billNumber: `BILL-TEST-${String(i + 1).padStart(4, '0')}`,
          customer: customerId,
          customerName: 'Test Customer',
          customerPhone: '+237670000000',
          items: [{ description: 'Item', quantity: 1, unitPrice: 1000 }],
          subtotal: 1000,
          taxRate: 0,
          taxAmount: 0,
          discount: 0,
          total: 1000,
          amountPaid: 0,
          balanceDue: 1000,
          dueDate: new Date('2026-06-12'),
        });
      }

      const res = await request(app).get('/api/bills');

      expect(res.status).toBe(200);
      expect(res.body.bills).toBeDefined();
      expect(res.body.pagination).toBeDefined();
      expect(res.body.bills.length).toBe(5);
    });

    it('should filter bills by status', async () => {
      await Bill.create({
        billNumber: 'BILL-FILTER-001',
        customer: customerId,
        customerName: 'Test',
        customerPhone: '+237670000000',
        items: [{ description: 'Item', quantity: 1, unitPrice: 1000 }],
        subtotal: 1000,
        taxRate: 0,
        taxAmount: 0,
        discount: 0,
        total: 1000,
        amountPaid: 0,
        balanceDue: 1000,
        dueDate: new Date('2026-06-12'),
        status: 'PAID',
      });

      const res = await request(app).get('/api/bills?status=PAID');
      expect(res.status).toBe(200);
      expect(res.body.bills.every(b => b.status === 'PAID')).toBe(true);
    });
  });

  describe('GET /api/bills/stats/summary', () => {
    it('should return bill statistics', async () => {
      const res = await request(app).get('/api/bills/stats/summary');
      expect(res.status).toBe(200);
      expect(res.body.totalBills).toBeDefined();
    });
  });

  describe('GET /api/bills/:id', () => {
    it('should return a bill by ID', async () => {
      const bill = await Bill.create({
        billNumber: 'BILL-GET-001',
        customer: customerId,
        customerName: 'Test',
        customerPhone: '+237670000000',
        items: [{ description: 'Item', quantity: 1, unitPrice: 1000 }],
        subtotal: 1000,
        taxRate: 0,
        taxAmount: 0,
        discount: 0,
        total: 1000,
        amountPaid: 0,
        balanceDue: 1000,
        dueDate: new Date('2026-06-12'),
      });

      const res = await request(app).get(`/api/bills/${bill._id}`);
      expect(res.status).toBe(200);
      expect(res.body.bill.billNumber).toBe('BILL-GET-001');
    });

    it('should return 404 for non-existent bill', async () => {
      const res = await request(app).get(`/api/bills/${new mongoose.Types.ObjectId()}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/bills/:id', () => {
    it('should update a bill', async () => {
      const bill = await Bill.create({
        billNumber: 'BILL-UPD-001',
        customer: customerId,
        customerName: 'Test',
        customerPhone: '+237670000000',
        items: [{ description: 'Item', quantity: 1, unitPrice: 1000 }],
        subtotal: 1000,
        taxRate: 0,
        taxAmount: 0,
        discount: 0,
        total: 1000,
        amountPaid: 0,
        balanceDue: 1000,
        dueDate: new Date('2026-06-12'),
      });

      const res = await request(app)
        .patch(`/api/bills/${bill._id}`)
        .send({ notes: 'Updated notes' });

      expect(res.status).toBe(200);
      expect(res.body.bill.notes).toBe('Updated notes');
    });
  });

  describe('POST /api/bills/:id/cancel', () => {
    it('should cancel a bill', async () => {
      const bill = await Bill.create({
        billNumber: 'BILL-DEL-001',
        customer: customerId,
        customerName: 'Test',
        customerPhone: '+237670000000',
        items: [{ description: 'Item', quantity: 1, unitPrice: 1000 }],
        subtotal: 1000,
        taxRate: 0,
        taxAmount: 0,
        discount: 0,
        total: 1000,
        amountPaid: 0,
        balanceDue: 1000,
        dueDate: new Date('2026-06-12'),
      });

      const res = await request(app).post(`/api/bills/${bill._id}/cancel`);
      expect(res.status).toBe(200);
      expect(res.body.bill.status).toBe('CANCELLED');
    });
  });

  describe('POST /api/bills/:id/send', () => {
    it('should send a bill via SMS', async () => {
      const bill = await Bill.create({
        billNumber: 'BILL-SEND-001',
        customer: customerId,
        customerName: 'Test',
        customerPhone: '+237670000000',
        items: [{ description: 'Item', quantity: 1, unitPrice: 1000 }],
        subtotal: 1000,
        taxRate: 0,
        taxAmount: 0,
        discount: 0,
        total: 1000,
        amountPaid: 0,
        balanceDue: 1000,
        dueDate: new Date('2026-06-12'),
      });

      const res = await request(app).post(`/api/bills/${bill._id}/send`);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Bill sent to customer');
    });
  });

  describe('POST /api/bills/:id/reminder', () => {
    it('should send an overdue reminder', async () => {
      const bill = await Bill.create({
        billNumber: 'BILL-REM-001',
        customer: customerId,
        customerName: 'Test',
        customerPhone: '+237670000000',
        items: [{ description: 'Item', quantity: 1, unitPrice: 1000 }],
        subtotal: 1000,
        taxRate: 0,
        taxAmount: 0,
        discount: 0,
        total: 1000,
        amountPaid: 0,
        balanceDue: 1000,
        dueDate: new Date('2026-05-01'), // overdue
        status: 'SENT',
        sentAt: new Date(),
      });

      const res = await request(app).post(`/api/bills/${bill._id}/reminder`);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Overdue reminder sent');
    });
  });
});
