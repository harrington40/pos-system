const mongoose = require('mongoose');
const Bill = require('../../models/Bill');
const { connect, disconnect, clearDatabase } = require('../helpers/mongoose');

describe('Bill Model', () => {
  const validBillData = {
    billNumber: 'BILL-202605-0001',
    customer: new mongoose.Types.ObjectId(),
    customerName: 'John Doe',
    customerPhone: '+237670000000',
    items: [
      { description: 'Item A', quantity: 2, unitPrice: 1500 },
      { description: 'Item B', quantity: 1, unitPrice: 3000 },
    ],
    taxRate: 0.05,
    discount: 500,
    dueDate: new Date('2026-06-12'),
  };

  beforeAll(async () => await connect());
  afterAll(async () => await disconnect());
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Validation', () => {
    it('should create a valid bill', async () => {
      const bill = await Bill.create(validBillData);
      expect(bill).toBeDefined();
      expect(bill.billNumber).toBe('BILL-202605-0001');
      expect(bill.status).toBe('DRAFT');
    });

    it('should require billNumber', async () => {
      const data = { ...validBillData, billNumber: undefined };
      await expect(Bill.create(data)).rejects.toThrow();
    });

    it('should require customer', async () => {
      const data = { ...validBillData, customer: undefined };
      await expect(Bill.create(data)).rejects.toThrow();
    });

    it('should require customerPhone', async () => {
      const data = { ...validBillData, customerPhone: undefined };
      await expect(Bill.create(data)).rejects.toThrow();
    });

    it('should require dueDate', async () => {
      const data = { ...validBillData, dueDate: undefined };
      await expect(Bill.create(data)).rejects.toThrow();
    });

    it('should reject invalid status values', async () => {
      const data = { ...validBillData, status: 'INVALID_STATUS' };
      await expect(Bill.create(data)).rejects.toThrow();
    });

    it('should accept all valid status values', async () => {
      const statuses = ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'];
      for (const status of statuses) {
        const bill = await Bill.create({ ...validBillData, billNumber: `BILL-TEST-${status}`, status });
        expect(bill.status).toBe(status);
      }
    });

    it('should reject negative subtotal', async () => {
      const data = { ...validBillData, subtotal: -100 };
      await expect(Bill.create(data)).rejects.toThrow();
    });

    it('should reject negative total', async () => {
      const data = { ...validBillData, total: -100 };
      await expect(Bill.create(data)).rejects.toThrow();
    });
  });

  describe('Pre-save hook (auto-calculation)', () => {
    it('should calculate subtotal from items', async () => {
      const bill = await Bill.create(validBillData);
      // 2 * 1500 + 1 * 3000 = 6000
      expect(bill.subtotal).toBe(6000);
    });

    it('should calculate taxAmount from subtotal * taxRate', async () => {
      const bill = await Bill.create(validBillData);
      // 6000 * 0.05 = 300
      expect(bill.taxAmount).toBe(300);
    });

    it('should calculate total = subtotal + taxAmount - discount', async () => {
      const bill = await Bill.create(validBillData);
      // 6000 + 300 - 500 = 5800
      expect(bill.total).toBe(5800);
    });

    it('should calculate balanceDue = total - amountPaid', async () => {
      const bill = await Bill.create(validBillData);
      // 5800 - 0 = 5800
      expect(bill.balanceDue).toBe(5800);
    });

    it('should reduce balanceDue when amountPaid is set', async () => {
      const bill = await Bill.create({ ...validBillData, amountPaid: 2000 });
      // 5800 - 2000 = 3800
      expect(bill.balanceDue).toBe(3800);
    });

    it('should handle zero tax rate', async () => {
      const bill = await Bill.create({ ...validBillData, taxRate: 0 });
      expect(bill.taxAmount).toBe(0);
      expect(bill.total).toBe(bill.subtotal - bill.discount);
    });

    it('should handle zero discount', async () => {
      const bill = await Bill.create({ ...validBillData, discount: 0 });
      expect(bill.total).toBe(bill.subtotal + bill.taxAmount);
    });
  });

  describe('Static: generateBillNumber', () => {
    it('should generate a sequential bill number', async () => {
      const num1 = await Bill.generateBillNumber();
      expect(num1).toMatch(/^BILL-\d{6}-\d{4}$/);

      // Create a bill with that number
      await Bill.create({ ...validBillData, billNumber: num1 });

      const num2 = await Bill.generateBillNumber();
      expect(num2).toMatch(/^BILL-\d{6}-\d{4}$/);

      // Parse the sequence numbers
      const seq1 = parseInt(num1.split('-')[2], 10);
      const seq2 = parseInt(num2.split('-')[2], 10);
      expect(seq2).toBe(seq1 + 1);
    });

    it('should start at 0001 when no bills exist', async () => {
      await Bill.deleteMany({});
      const num = await Bill.generateBillNumber();
      expect(num).toMatch(/^BILL-\d{6}-0001$/);
    });
  });

  describe('Virtual: item total', () => {
    it('should calculate item total via virtual', async () => {
      const bill = await Bill.create(validBillData);
      const item = bill.items[0];
      expect(item.total).toBe(3000); // 2 * 1500
    });
  });

  describe('Indexes', () => {
    it('should enforce unique billNumber', async () => {
      await Bill.create(validBillData);
      await expect(Bill.create(validBillData)).rejects.toThrow();
    });
  });
});
