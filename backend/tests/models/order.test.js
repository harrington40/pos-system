const mongoose = require('mongoose');
const Order = require('../../models/Order');
const { connect, disconnect, clearDatabase } = require('../helpers/mongoose');

describe('Order Model', () => {
  const validOrderData = {
    items: [
      {
        menuItem: new mongoose.Types.ObjectId(),
        name: 'Pizza',
        price: 5000,
        quantity: 2,
      },
      {
        menuItem: new mongoose.Types.ObjectId(),
        name: 'Soda',
        price: 1000,
        quantity: 3,
      },
    ],
    subtotal: 13000,
    tax: 650,
    total: 13650,
    paymentMethod: 'cash',
    status: 'completed',
    receiptNumber: 'RCP-001',
  };

  beforeAll(async () => await connect());
  afterAll(async () => await disconnect());
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Validation', () => {
    it('should create a valid order', async () => {
      const order = await Order.create(validOrderData);
      expect(order).toBeDefined();
      expect(order.receiptNumber).toBe('RCP-001');
      expect(order.status).toBe('completed');
    });

    it('should allow empty items array', async () => {
      const data = { ...validOrderData, items: [] };
      const order = await Order.create(data);
      expect(order.items).toEqual([]);
    });

    it('should require subtotal', async () => {
      const data = { ...validOrderData, subtotal: undefined };
      await expect(Order.create(data)).rejects.toThrow();
    });

    it('should require total', async () => {
      const data = { ...validOrderData, total: undefined };
      await expect(Order.create(data)).rejects.toThrow();
    });

    it('should enforce unique receiptNumber', async () => {
      await Order.create(validOrderData);
      await expect(Order.create(validOrderData)).rejects.toThrow();
    });

    it('should accept all valid payment methods', async () => {
      const methods = ['cash', 'card', 'mobile', 'mobile_money', 'orange_money', 'mtn_money'];
      for (const method of methods) {
        const order = await Order.create({
          ...validOrderData,
          receiptNumber: `RCP-PM-${method}`,
          paymentMethod: method,
        });
        expect(order.paymentMethod).toBe(method);
      }
    });

    it('should reject invalid payment method', async () => {
      const data = { ...validOrderData, paymentMethod: 'bitcoin' };
      await expect(Order.create(data)).rejects.toThrow();
    });

    it('should accept all valid status values', async () => {
      const statuses = ['pending', 'completed', 'refunded'];
      for (const status of statuses) {
        const order = await Order.create({
          ...validOrderData,
          receiptNumber: `RCP-ST-${status}`,
          status,
        });
        expect(order.status).toBe(status);
      }
    });

    it('should reject invalid status', async () => {
      const data = { ...validOrderData, status: 'cancelled' };
      await expect(Order.create(data)).rejects.toThrow();
    });
  });

  describe('Order Items', () => {
    it('should store items with correct structure', async () => {
      const order = await Order.create(validOrderData);
      expect(order.items).toHaveLength(2);

      expect(order.items[0].name).toBe('Pizza');
      expect(order.items[0].price).toBe(5000);
      expect(order.items[0].quantity).toBe(2);

      expect(order.items[1].name).toBe('Soda');
      expect(order.items[1].price).toBe(1000);
      expect(order.items[1].quantity).toBe(3);
    });

    it('should require menuItem for each item', async () => {
      const data = {
        ...validOrderData,
        items: [{ name: 'NoRef', price: 100, quantity: 1 }],
      };
      await expect(Order.create(data)).rejects.toThrow();
    });

    it('should require name for each item', async () => {
      const data = {
        ...validOrderData,
        items: [{ menuItem: new mongoose.Types.ObjectId(), price: 100, quantity: 1 }],
      };
      await expect(Order.create(data)).rejects.toThrow();
    });
  });

  describe('Mobile Money Fields', () => {
    it('should store mobile money provider', async () => {
      const order = await Order.create({
        ...validOrderData,
        receiptNumber: 'RCP-MM-001',
        mobileMoneyProvider: 'orange',
        mobileMoneyPhone: '+237670000000',
        mobileMoneyTransactionId: 'TXN-001',
      });
      expect(order.mobileMoneyProvider).toBe('orange');
      expect(order.mobileMoneyPhone).toBe('+237670000000');
    });

    it('should accept valid initiation modes', async () => {
      const modes = ['', 'cashier_initiated', 'customer_initiated'];
      for (const mode of modes) {
        const order = await Order.create({
          ...validOrderData,
          receiptNumber: `RCP-IM-${mode || 'empty'}`,
          mobileMoneyInitiationMode: mode,
        });
        expect(order.mobileMoneyInitiationMode).toBe(mode);
      }
    });

    it('should reject invalid initiation mode', async () => {
      const data = {
        ...validOrderData,
        mobileMoneyInitiationMode: 'invalid',
      };
      await expect(Order.create(data)).rejects.toThrow();
    });
  });

  describe('Discount Fields', () => {
    it('should store discount information', async () => {
      const order = await Order.create({
        ...validOrderData,
        receiptNumber: 'RCP-DISC-001',
        discountCode: 'SAVE10',
        discountAmount: 1300,
        discountType: 'percentage',
      });
      expect(order.discountCode).toBe('SAVE10');
      expect(order.discountAmount).toBe(1300);
      expect(order.discountType).toBe('percentage');
    });
  });

  describe('Customer / Marketing Fields', () => {
    it('should store customer info and opt-in', async () => {
      const order = await Order.create({
        ...validOrderData,
        receiptNumber: 'RCP-CUST-001',
        customerPhone: '+237670000000',
        customerName: 'John Doe',
        optInMarketing: true,
      });
      expect(order.customerPhone).toBe('+237670000000');
      expect(order.customerName).toBe('John Doe');
      expect(order.optInMarketing).toBe(true);
    });

    it('should default optInMarketing to false', async () => {
      const order = await Order.create(validOrderData);
      expect(order.optInMarketing).toBe(false);
    });
  });

  describe('Refund Fields', () => {
    it('should store refund information', async () => {
      const order = await Order.create({
        ...validOrderData,
        receiptNumber: 'RCP-REF-001',
        status: 'refunded',
        refundReason: 'Customer requested cancellation',
        refundedAt: new Date(),
      });
      expect(order.status).toBe('refunded');
      expect(order.refundReason).toBe('Customer requested cancellation');
      expect(order.refundedAt).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt', async () => {
      const order = await Order.create(validOrderData);
      expect(order.createdAt).toBeDefined();
      expect(order.updatedAt).toBeDefined();
      expect(order.createdAt instanceof Date).toBe(true);
    });
  });
});
