const mongoose = require('mongoose');

// Mock the orange-money module BEFORE requiring sms-service
// orange-money exports a singleton instance, so we mock the module directly
jest.mock('../../services/orange-money', () => ({
  sendSms: jest.fn(),
  sendBillSms: jest.fn(),
  sendReceiptSms: jest.fn(),
  sendOverdueSms: jest.fn(),
  isConfigured: jest.fn().mockReturnValue(true),
}));

// sms-service exports a singleton instance (new SmsService()), not a class
const smsService = require('../../services/sms-service');
const orangeApi = require('../../services/orange-money');
const SmsLog = require('../../models/SmsLog');
const { connect, disconnect, clearDatabase } = require('../helpers/mongoose');

describe('SmsService', () => {
  beforeAll(async () => {
    await connect();
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('sendBillPaymentLink', () => {
    const validInput = {
      phone: '+237670000000',
      billId: new mongoose.Types.ObjectId().toString(),
      billNumber: 'BILL-001',
      amount: 5000,
      paymentUrl: 'https://pay.orange.com/bill/BILL-001',
      dueDate: '2026-06-12',
      customerId: new mongoose.Types.ObjectId().toString(),
    };

    it('should send bill payment link SMS successfully', async () => {
      orangeApi.sendBillSms.mockResolvedValue({
        success: true,
        data: { messageId: 'MSG-001' },
      });

      const result = await smsService.sendBillPaymentLink(validInput);

      expect(result.success).toBe(true);
      expect(orangeApi.sendBillSms).toHaveBeenCalledWith({
        phone: validInput.phone,
        billRef: validInput.billId,
        billNumber: validInput.billNumber,
        amount: validInput.amount,
        paymentUrl: validInput.paymentUrl,
        dueDate: validInput.dueDate,
      });

      // Verify SMS log was created
      const log = await SmsLog.findOne({ phone: validInput.phone });
      expect(log).toBeDefined();
      expect(log.status).toBe('SENT');
      expect(log.template).toBe('bill_payment_link');
    });

    it('should handle API failure gracefully', async () => {
      orangeApi.sendBillSms.mockResolvedValue({
        success: false,
        message: 'API Error',
      });

      const result = await smsService.sendBillPaymentLink(validInput);

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();

      // Verify SMS log was created with FAILED status
      const log = await SmsLog.findOne({ phone: validInput.phone });
      expect(log).toBeDefined();
      expect(log.status).toBe('FAILED');
    });

    it('should handle exceptions gracefully', async () => {
      orangeApi.sendBillSms.mockRejectedValue(new Error('Network error'));

      const result = await smsService.sendBillPaymentLink(validInput);

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });
  });

  describe('sendPaymentReceipt', () => {
    const validInput = {
      phone: '+237670000000',
      billId: new mongoose.Types.ObjectId().toString(),
      billNumber: 'BILL-001',
      amount: 5000,
      transactionRef: 'TXN-001',
      customerId: new mongoose.Types.ObjectId().toString(),
    };

    it('should send payment receipt SMS successfully', async () => {
      orangeApi.sendReceiptSms.mockResolvedValue({
        success: true,
        data: { messageId: 'MSG-002' },
      });

      const result = await smsService.sendPaymentReceipt(validInput);

      expect(result.success).toBe(true);
      expect(orangeApi.sendReceiptSms).toHaveBeenCalledWith({
        phone: validInput.phone,
        billNumber: validInput.billNumber,
        amount: validInput.amount,
        transactionRef: validInput.transactionRef,
      });

      const log = await SmsLog.findOne({ template: 'payment_receipt' });
      expect(log).toBeDefined();
      expect(log.status).toBe('SENT');
    });

    it('should handle failure', async () => {
      orangeApi.sendReceiptSms.mockResolvedValue({
        success: false,
        error: 'Failed',
      });

      const result = await smsService.sendPaymentReceipt(validInput);
      expect(result.success).toBe(false);
    });
  });

  describe('sendOverdueReminder', () => {
    const validInput = {
      phone: '+237670000000',
      billId: new mongoose.Types.ObjectId().toString(),
      billNumber: 'BILL-001',
      amount: 5000,
      paymentUrl: 'https://pay.orange.com/bill/BILL-001',
      customerId: new mongoose.Types.ObjectId().toString(),
    };

    it('should send overdue reminder SMS successfully', async () => {
      orangeApi.sendOverdueSms.mockResolvedValue({
        success: true,
        data: { messageId: 'MSG-003' },
      });

      const result = await smsService.sendOverdueReminder(validInput);

      expect(result.success).toBe(true);
      expect(orangeApi.sendOverdueSms).toHaveBeenCalledWith({
        phone: validInput.phone,
        billNumber: validInput.billNumber,
        amount: validInput.amount,
        paymentUrl: validInput.paymentUrl,
      });

      const log = await SmsLog.findOne({ template: 'overdue_reminder' });
      expect(log).toBeDefined();
      expect(log.status).toBe('SENT');
    });
  });

  describe('sendCustomSms', () => {
    const validInput = {
      phone: '+237670000000',
      message: 'Custom message for customer',
      template: 'custom_template',
      billId: new mongoose.Types.ObjectId().toString(),
      customerId: new mongoose.Types.ObjectId().toString(),
    };

    it('should send custom SMS successfully', async () => {
      orangeApi.sendSms.mockResolvedValue({
        success: true,
        data: { messageId: 'MSG-004' },
      });

      const result = await smsService.sendCustomSms(validInput);

      expect(result.success).toBe(true);
      expect(orangeApi.sendSms).toHaveBeenCalledWith({
        phone: validInput.phone,
        message: validInput.message,
        template: validInput.template,
      });

      const log = await SmsLog.findOne({ template: 'custom_template' });
      expect(log).toBeDefined();
      expect(log.status).toBe('SENT');
    });

    it('should send custom SMS without optional params', async () => {
      orangeApi.sendSms.mockResolvedValue({
        success: true,
        data: { messageId: 'MSG-005' },
      });

      const result = await smsService.sendCustomSms({
        phone: '+237670000000',
        message: 'Simple message',
      });

      expect(result.success).toBe(true);
    });
  });
});
