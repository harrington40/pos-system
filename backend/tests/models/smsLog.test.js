const mongoose = require('mongoose');
const SmsLog = require('../../models/SmsLog');
const { connect, disconnect, clearDatabase } = require('../helpers/mongoose');

describe('SmsLog Model', () => {
  const validSmsLogData = {
    phone: '+237670000000',
    message: 'Your bill BILL-001 of 5000 XAF is due on 2026-06-12',
    status: 'SENT',
    bill: new mongoose.Types.ObjectId(),
    customer: new mongoose.Types.ObjectId(),
  };

  beforeAll(async () => await connect());
  afterAll(async () => await disconnect());
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Validation', () => {
    it('should create a valid SMS log', async () => {
      const log = await SmsLog.create(validSmsLogData);
      expect(log).toBeDefined();
      expect(log.phone).toBe('+237670000000');
      expect(log.status).toBe('SENT');
    });

    it('should require phone', async () => {
      const data = { ...validSmsLogData, phone: undefined };
      await expect(SmsLog.create(data)).rejects.toThrow();
    });

    it('should require message', async () => {
      const data = { ...validSmsLogData, message: undefined };
      await expect(SmsLog.create(data)).rejects.toThrow();
    });

    it('should default status to QUEUED', async () => {
      const data = { ...validSmsLogData, status: undefined };
      const log = await SmsLog.create(data);
      expect(log.status).toBe('QUEUED');
    });

    it('should accept all valid status values', async () => {
      const statuses = ['QUEUED', 'SENT', 'DELIVERED', 'FAILED'];
      for (const status of statuses) {
        const log = await SmsLog.create({
          ...validSmsLogData,
          status,
          phone: `+2376700000${Math.floor(Math.random() * 100)}`,
        });
        expect(log.status).toBe(status);
      }
    });

    it('should reject invalid status', async () => {
      const data = { ...validSmsLogData, status: 'INVALID' };
      await expect(SmsLog.create(data)).rejects.toThrow();
    });

    it('should store template as metadata', async () => {
      const log = await SmsLog.create({
        ...validSmsLogData,
        template: 'bill_payment_link',
        phone: `+2376700000${Math.floor(Math.random() * 100)}`,
      });
      expect(log.template).toBe('bill_payment_link');
    });

    it('should store providerRef when available', async () => {
      const log = await SmsLog.create({
        ...validSmsLogData,
        providerRef: 'PROV-REF-001',
        phone: `+2376700000${Math.floor(Math.random() * 100)}`,
      });
      expect(log.providerRef).toBe('PROV-REF-001');
    });
  });

  describe('Optional Fields', () => {
    it('should store error message on failure', async () => {
      const log = await SmsLog.create({
        ...validSmsLogData,
        status: 'FAILED',
        errorMessage: 'Provider rejected: insufficient balance',
      });
      expect(log.errorMessage).toBe('Provider rejected: insufficient balance');
    });

    it('should store cost when available', async () => {
      const log = await SmsLog.create({
        ...validSmsLogData,
        cost: 25,
      });
      expect(log.cost).toBe(25);
    });

    it('should allow null bill reference', async () => {
      const log = await SmsLog.create({
        ...validSmsLogData,
        bill: null,
      });
      expect(log.bill).toBeNull();
    });

    it('should allow null customer reference', async () => {
      const log = await SmsLog.create({
        ...validSmsLogData,
        customer: null,
      });
      expect(log.customer).toBeNull();
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt', async () => {
      const log = await SmsLog.create(validSmsLogData);
      expect(log.createdAt).toBeDefined();
      expect(log.updatedAt).toBeDefined();
      expect(log.createdAt instanceof Date).toBe(true);
    });
  });
});
