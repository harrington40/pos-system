const mongoose = require('mongoose');
const MobilePayment = require('../../models/MobilePayment');
const { connect, disconnect, clearDatabase } = require('../helpers/mongoose');

describe('MobilePayment Model', () => {
  const validPaymentData = {
    provider: 'orange',
    phone: '+237670000000',
    amount: 5000,
    currency: 'XAF',
    initiationMode: 'cashier_initiated',
    transactionRef: 'MP-1700000000-ABCDEF',
  };

  beforeAll(async () => await connect());
  afterAll(async () => await disconnect());
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Validation', () => {
    it('should create a valid mobile payment', async () => {
      const payment = await MobilePayment.create(validPaymentData);
      expect(payment).toBeDefined();
      expect(payment.status).toBe('PENDING');
      expect(payment.provider).toBe('orange');
    });

    it('should require provider', async () => {
      const data = { ...validPaymentData, provider: undefined };
      await expect(MobilePayment.create(data)).rejects.toThrow();
    });

    it('should reject invalid provider', async () => {
      const data = { ...validPaymentData, provider: 'invalid' };
      await expect(MobilePayment.create(data)).rejects.toThrow();
    });

    it('should accept orange and mtn providers', async () => {
      const orange = await MobilePayment.create({
        ...validPaymentData,
        transactionRef: 'MP-ORANGE-001',
        provider: 'orange',
      });
      expect(orange.provider).toBe('orange');

      const mtn = await MobilePayment.create({
        ...validPaymentData,
        transactionRef: 'MP-MTN-001',
        provider: 'mtn',
      });
      expect(mtn.provider).toBe('mtn');
    });

    it('should require amount', async () => {
      const data = { ...validPaymentData, amount: undefined };
      await expect(MobilePayment.create(data)).rejects.toThrow();
    });

    it('should reject negative amount', async () => {
      const data = { ...validPaymentData, amount: -100 };
      await expect(MobilePayment.create(data)).rejects.toThrow();
    });

    it('should require transactionRef', async () => {
      const data = { ...validPaymentData, transactionRef: undefined };
      await expect(MobilePayment.create(data)).rejects.toThrow();
    });

    it('should enforce unique transactionRef', async () => {
      await MobilePayment.create(validPaymentData);
      await expect(MobilePayment.create(validPaymentData)).rejects.toThrow();
    });

    it('should default to XAF currency', async () => {
      const payment = await MobilePayment.create({
        ...validPaymentData,
        transactionRef: 'MP-CURRENCY-001',
        currency: undefined,
      });
      expect(payment.currency).toBe('XAF');
    });

    it('should default to cashier_initiated mode', async () => {
      const payment = await MobilePayment.create({
        ...validPaymentData,
        transactionRef: 'MP-MODE-001',
        initiationMode: undefined,
      });
      expect(payment.initiationMode).toBe('cashier_initiated');
    });

    it('should reject invalid initiationMode', async () => {
      const data = { ...validPaymentData, initiationMode: 'invalid' };
      await expect(MobilePayment.create(data)).rejects.toThrow();
    });

    it('should reject invalid status values', async () => {
      const data = { ...validPaymentData, status: 'INVALID' };
      await expect(MobilePayment.create(data)).rejects.toThrow();
    });
  });

  describe('Static: isValidTransition', () => {
    it('should allow PENDING -> CONFIRMED', () => {
      expect(MobilePayment.isValidTransition('PENDING', 'CONFIRMED')).toBe(true);
    });

    it('should allow PENDING -> FAILED', () => {
      expect(MobilePayment.isValidTransition('PENDING', 'FAILED')).toBe(true);
    });

    it('should allow PENDING -> DISPUTED', () => {
      expect(MobilePayment.isValidTransition('PENDING', 'DISPUTED')).toBe(true);
    });

    it('should allow CONFIRMED -> VERIFIED', () => {
      expect(MobilePayment.isValidTransition('CONFIRMED', 'VERIFIED')).toBe(true);
    });

    it('should allow CONFIRMED -> DISPUTED', () => {
      expect(MobilePayment.isValidTransition('CONFIRMED', 'DISPUTED')).toBe(true);
    });

    it('should allow AWAITING_PAYMENT -> CONFIRMED', () => {
      expect(MobilePayment.isValidTransition('AWAITING_PAYMENT', 'CONFIRMED')).toBe(true);
    });

    it('should reject PENDING -> VERIFIED (skip CONFIRMED)', () => {
      expect(MobilePayment.isValidTransition('PENDING', 'VERIFIED')).toBe(false);
    });

    it('should reject transitions from terminal states', () => {
      expect(MobilePayment.isValidTransition('VERIFIED', 'FAILED')).toBe(false);
      expect(MobilePayment.isValidTransition('FAILED', 'CONFIRMED')).toBe(false);
      expect(MobilePayment.isValidTransition('DISPUTED', 'CONFIRMED')).toBe(false);
    });

    it('should reject unknown state transitions', () => {
      expect(MobilePayment.isValidTransition('UNKNOWN', 'CONFIRMED')).toBe(false);
    });
  });

  describe('Method: transitionTo', () => {
    it('should transition PENDING -> CONFIRMED with providerRef', async () => {
      const payment = await MobilePayment.create(validPaymentData);
      const result = await payment.transitionTo('CONFIRMED', {
        providerRef: 'PROV-REF-123',
        phone: '+237671111111',
      });

      expect(result.status).toBe('CONFIRMED');
      expect(result.providerRef).toBe('PROV-REF-123');
      expect(result.phone).toBe('+237671111111');
      expect(result.confirmedAt).toBeDefined();
    });

    it('should transition CONFIRMED -> VERIFIED with verifiedBy', async () => {
      const payment = await MobilePayment.create(validPaymentData);
      await payment.transitionTo('CONFIRMED', { providerRef: 'PROV-REF' });

      const verifiedBy = new mongoose.Types.ObjectId();
      const result = await payment.transitionTo('VERIFIED', { verifiedBy });

      expect(result.status).toBe('VERIFIED');
      expect(result.verifiedBy.toString()).toBe(verifiedBy.toString());
      expect(result.verifiedAt).toBeDefined();
    });

    it('should transition PENDING -> FAILED with reason', async () => {
      const payment = await MobilePayment.create(validPaymentData);
      const result = await payment.transitionTo('FAILED', { reason: 'Insufficient funds' });

      expect(result.status).toBe('FAILED');
      expect(result.failureReason).toBe('Insufficient funds');
      expect(result.failedAt).toBeDefined();
    });

    it('should transition PENDING -> DISPUTED with metadata', async () => {
      const payment = await MobilePayment.create(validPaymentData);
      const result = await payment.transitionTo('DISPUTED', {
        reason: 'Customer claims not paid',
        metadata: { disputeNote: 'Customer showed receipt but no payment found' },
      });

      expect(result.status).toBe('DISPUTED');
      expect(result.failureReason).toBe('Customer claims not paid');
      expect(result.metadata.get('disputeNote')).toBe('Customer showed receipt but no payment found');
    });

    it('should throw on invalid transition', async () => {
      const payment = await MobilePayment.create(validPaymentData);
      await expect(payment.transitionTo('VERIFIED')).rejects.toThrow('Invalid MobilePayment state transition');
    });

    it('should throw on transition from terminal state', async () => {
      const payment = await MobilePayment.create(validPaymentData);
      await payment.transitionTo('FAILED', { reason: 'Timeout' });
      await expect(payment.transitionTo('CONFIRMED')).rejects.toThrow('Invalid MobilePayment state transition');
    });

    it('should link orderId when provided', async () => {
      const payment = await MobilePayment.create(validPaymentData);
      const orderId = new mongoose.Types.ObjectId();
      const result = await payment.transitionTo('CONFIRMED', { orderId });

      expect(result.orderId.toString()).toBe(orderId.toString());
    });
  });

  describe('Static: generateRef', () => {
    it('should generate a unique reference', () => {
      const ref1 = MobilePayment.generateRef();
      const ref2 = MobilePayment.generateRef();

      expect(ref1).toMatch(/^MP-\d+-[A-Z0-9]+$/);
      expect(ref1).not.toBe(ref2);
    });
  });

  describe('Static: getPendingVerification', () => {
    it('should return only CONFIRMED payments', async () => {
      // Create payments in different states
      await MobilePayment.create({ ...validPaymentData, transactionRef: 'MP-PEND-001', status: 'PENDING' });
      const confirmed = await MobilePayment.create({
        ...validPaymentData,
        transactionRef: 'MP-CONF-001',
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      });
      await MobilePayment.create({ ...validPaymentData, transactionRef: 'MP-VER-001', status: 'VERIFIED' });

      const pending = await MobilePayment.getPendingVerification();
      expect(pending).toHaveLength(1);
      expect(pending[0].transactionRef).toBe('MP-CONF-001');
    });

    it('should filter by provider', async () => {
      await MobilePayment.create({
        ...validPaymentData,
        transactionRef: 'MP-ORANGE-PEND',
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        provider: 'orange',
      });
      await MobilePayment.create({
        ...validPaymentData,
        transactionRef: 'MP-MTN-PEND',
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        provider: 'mtn',
      });

      const orangePending = await MobilePayment.getPendingVerification({ provider: 'orange' });
      expect(orangePending).toHaveLength(1);
      expect(orangePending[0].provider).toBe('orange');
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await MobilePayment.create({
          ...validPaymentData,
          transactionRef: `MP-LIMIT-${i}`,
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        });
      }

      const limited = await MobilePayment.getPendingVerification({ limit: 3 });
      expect(limited).toHaveLength(3);
    });
  });
});
