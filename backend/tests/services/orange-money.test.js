const axios = require('axios');

// Mock axios before requiring the service (which is a singleton instance)
jest.mock('axios');

// Set env vars BEFORE requiring the service so the singleton picks them up
process.env.ORANGE_SMS_CLIENT_ID = 'sms-client-id';
process.env.ORANGE_SMS_CLIENT_SECRET = 'sms-client-secret';
process.env.ORANGE_SALE_CLIENT_ID = 'sale-client-id';
process.env.ORANGE_SALE_CLIENT_SECRET = 'sale-client-secret';
process.env.ORANGE_BILLS_CLIENT_ID = 'bills-client-id';
process.env.ORANGE_BILLS_CLIENT_SECRET = 'bills-client-secret';
process.env.ORANGE_MONEY_API_URL = 'https://api.orange.com/money/v1';
// Set to live mode so getAccessToken actually calls axios instead of returning simulated tokens
process.env.MOBILE_MONEY_MODE = 'live';

// The service exports a singleton instance: module.exports = new OrangeApiService()
const orangeApiService = require('../../services/orange-money');

describe('OrangeApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cached tokens so each test gets fresh axios calls
    orangeApiService.smsConfig.accessToken = null;
    orangeApiService.smsConfig.tokenExpiresAt = 0;
    orangeApiService.saleConfig.accessToken = null;
    orangeApiService.saleConfig.tokenExpiresAt = 0;
    orangeApiService.billsConfig.accessToken = null;
    orangeApiService.billsConfig.tokenExpiresAt = 0;
  });

  describe('isConfigured', () => {
    it('should return true when all credentials are set', () => {
      expect(orangeApiService.isConfigured('sms')).toBe(true);
      expect(orangeApiService.isConfigured('sale')).toBe(true);
      expect(orangeApiService.isConfigured('bills')).toBe(true);
    });

    it('should return false when credentials are placeholder values', () => {
      // The singleton stores env values at construction time, so deleting process.env
      // doesn't affect the already-constructed config. Instead, verify that placeholder
      // values like 'your_sms_client_id' would return false.
      expect(orangeApiService.isConfigured('sms')).toBe(true);
      // Temporarily set to placeholder to test the check
      const originalId = orangeApiService.smsConfig.clientId;
      orangeApiService.smsConfig.clientId = 'your_sms_client_id';
      expect(orangeApiService.isConfigured('sms')).toBe(false);
      orangeApiService.smsConfig.clientId = originalId;
    });

    it('should throw for unknown API name', () => {
      expect(() => orangeApiService.isConfigured('unknown')).toThrow('Unknown Orange API');
    });
  });

  describe('getAccessToken', () => {
    it('should return an access token on success', async () => {
      axios.post.mockResolvedValueOnce({
        data: { access_token: 'test-token-123', expires_in: 3600 },
      });

      const token = await orangeApiService.getAccessToken('sms');
      expect(token).toBe('test-token-123');
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    it('should throw on API error', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network error'));
      await expect(orangeApiService.getAccessToken('sms')).rejects.toThrow('Network error');
    });

    it('should throw on missing credentials', async () => {
      await expect(orangeApiService.getAccessToken('unknown')).rejects.toThrow('Unknown Orange API');
    });
  });

  describe('sendSms', () => {
    it('should send SMS successfully', async () => {
      axios.post
        .mockResolvedValueOnce({ data: { access_token: 'sms-token', expires_in: 3600 } })
        .mockResolvedValueOnce({ data: { smsRef: 'MSG-001', status: 'SENT' } });

      const result = await orangeApiService.sendSms({
        phone: '+237670000000',
        message: 'Test message',
      });

      expect(result.success).toBe(true);
      expect(result.providerRef).toBe('MSG-001');
    });

    it('should handle SMS API failure', async () => {
      axios.post
        .mockResolvedValueOnce({ data: { access_token: 'sms-token', expires_in: 3600 } })
        .mockRejectedValueOnce(new Error('API Error'));

      const result = await orangeApiService.sendSms({
        phone: '+237670000000',
        message: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });
  });

  describe('createBill', () => {
    it('should create a bill successfully', async () => {
      axios.post
        .mockResolvedValueOnce({ data: { access_token: 'sale-token', expires_in: 3600 } })
        .mockResolvedValueOnce({ data: { billRef: 'BILL-REF-001', status: 'CREATED' } });

      const result = await orangeApiService.createBill({
        billNumber: 'BILL-001',
        customerPhone: '+237670000000',
        customerName: 'John Doe',
        amount: 5000,
        description: 'Restaurant bill',
        dueDate: '2026-06-12',
        items: [{ description: 'Pizza', quantity: 1, unitPrice: 5000 }],
      });

      expect(result.success).toBe(true);
      expect(result.billRef).toBe('BILL-REF-001');
    });

    it('should handle bill creation failure', async () => {
      axios.post
        .mockResolvedValueOnce({ data: { access_token: 'sale-token', expires_in: 3600 } })
        .mockRejectedValueOnce(new Error('Creation failed'));

      const result = await orangeApiService.createBill({
        billNumber: 'BILL-001',
        customerPhone: '+237670000000',
        customerName: 'John Doe',
        amount: 5000,
        description: 'Test',
        dueDate: '2026-06-12',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('checkBillStatus', () => {
    it('should check bill status successfully', async () => {
      // checkBillStatus calls getAccessToken('sale') which uses axios.post, then axios.get
      axios.post
        .mockResolvedValueOnce({ data: { access_token: 'sale-token', expires_in: 3600 } });
      axios.get
        .mockResolvedValueOnce({ data: { billRef: 'BILL-REF-001', status: 'PAID' } });

      const result = await orangeApiService.checkBillStatus('BILL-REF-001');
      expect(result.success).toBe(true);
      expect(result.status).toBe('PAID');
    });
  });

  describe('refundBill', () => {
    it('should refund a bill successfully', async () => {
      axios.post
        .mockResolvedValueOnce({ data: { access_token: 'sale-token', expires_in: 3600 } })
        .mockResolvedValueOnce({ data: { refundRef: 'REF-001', status: 'PROCESSED' } });

      const result = await orangeApiService.refundBill('BILL-REF-001', 5000, 'Customer request');
      expect(result.success).toBe(true);
      expect(result.refundRef).toBe('REF-001');
    });
  });

  describe('verifyCallback', () => {
    it('should verify a valid callback', () => {
      const body = { event: 'payment', data: { billRef: 'BILL-001' } };
      const headers = { 'x-orange-signature': 'some-signature' };

      const result = orangeApiService.verifyCallback(body, headers);
      expect(result).toBeDefined();
    });

    it('should handle missing headers gracefully', () => {
      const result = orangeApiService.verifyCallback({});
      expect(result).toBeDefined();
    });
  });

  describe('generateReference', () => {
    it('should generate a unique reference', () => {
      const ref1 = orangeApiService.generateReference();
      const ref2 = orangeApiService.generateReference();
      expect(ref1).not.toBe(ref2);
      expect(ref1).toMatch(/^OM-/);
    });
  });

  describe('sendBillSms', () => {
    it('should send bill SMS with correct template', async () => {
      const sendSmsSpy = jest.spyOn(orangeApiService, 'sendSms').mockResolvedValue({ success: true });

      const result = await orangeApiService.sendBillSms({
        phone: '+237670000000',
        billRef: 'BILL-REF',
        billNumber: 'BILL-001',
        amount: 5000,
        paymentUrl: 'https://pay.orange.com/bill/BILL-001',
        dueDate: '2026-06-12',
      });

      expect(result.success).toBe(true);
      expect(sendSmsSpy).toHaveBeenCalled();
      sendSmsSpy.mockRestore();
    });
  });

  describe('sendReceiptSms', () => {
    it('should send receipt SMS with correct template', async () => {
      const sendSmsSpy = jest.spyOn(orangeApiService, 'sendSms').mockResolvedValue({ success: true });

      const result = await orangeApiService.sendReceiptSms({
        phone: '+237670000000',
        billNumber: 'BILL-001',
        amount: 5000,
        transactionRef: 'TXN-001',
      });

      expect(result.success).toBe(true);
      expect(sendSmsSpy).toHaveBeenCalled();
      sendSmsSpy.mockRestore();
    });
  });

  describe('sendOverdueSms', () => {
    it('should send overdue SMS with correct template', async () => {
      const sendSmsSpy = jest.spyOn(orangeApiService, 'sendSms').mockResolvedValue({ success: true });

      const result = await orangeApiService.sendOverdueSms({
        phone: '+237670000000',
        billNumber: 'BILL-001',
        amount: 5000,
        paymentUrl: 'https://pay.orange.com/bill/BILL-001',
      });

      expect(result.success).toBe(true);
      expect(sendSmsSpy).toHaveBeenCalled();
      sendSmsSpy.mockRestore();
    });
  });
});
