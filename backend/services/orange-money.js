const axios = require('axios');
const crypto = require('crypto');

/**
 * Orange API Service
 *
 * Supports three separate Orange API features, each with its own credentials:
 *   1. Orange SMS API     — Send SMS messages (payment links, receipts, reminders)
 *   2. Orange Sale Orders — Process payments and sale orders via Orange Money
 *   3. Orange View Bills  — View/manage bills via Orange API
 *
 * Environment variables (set in .env):
 *   ── Orange SMS API ──
 *   ORANGE_SMS_API_URL
 *   ORANGE_SMS_CLIENT_ID
 *   ORANGE_SMS_CLIENT_SECRET
 *
 *   ── Orange Sale Orders API ──
 *   ORANGE_SALE_API_URL
 *   ORANGE_SALE_CLIENT_ID
 *   ORANGE_SALE_CLIENT_SECRET
 *
 *   ── Orange View Bills API ──
 *   ORANGE_BILLS_API_URL
 *   ORANGE_BILLS_CLIENT_ID
 *   ORANGE_BILLS_CLIENT_SECRET
 *
 *   MOBILE_MONEY_MODE (simulation | production)
 */

class OrangeApiService {
  constructor() {
    this.mode = process.env.MOBILE_MONEY_MODE || 'simulation';

    // ── SMS API config ──
    this.smsConfig = {
      apiUrl: process.env.ORANGE_SMS_API_URL || 'https://api.orange.com/sms/v1',
      clientId: process.env.ORANGE_SMS_CLIENT_ID || '',
      clientSecret: process.env.ORANGE_SMS_CLIENT_SECRET || '',
      accessToken: null,
      tokenExpiresAt: 0,
    };

    // ── Sale Orders API config ──
    this.saleConfig = {
      apiUrl: process.env.ORANGE_SALE_API_URL || 'https://api.orange.com/money/v1',
      clientId: process.env.ORANGE_SALE_CLIENT_ID || '',
      clientSecret: process.env.ORANGE_SALE_CLIENT_SECRET || '',
      accessToken: null,
      tokenExpiresAt: 0,
    };

    // ── View Bills API config ──
    this.billsConfig = {
      apiUrl: process.env.ORANGE_BILLS_API_URL || 'https://api.orange.com/bills/v1',
      clientId: process.env.ORANGE_BILLS_CLIENT_ID || '',
      clientSecret: process.env.ORANGE_BILLS_CLIENT_SECRET || '',
      accessToken: null,
      tokenExpiresAt: 0,
    };
  }

  /**
   * Check if a specific API config is configured for production use
   * @param {'sms'|'sale'|'bills'} apiName
   */
  isConfigured(apiName) {
    const config = this._getConfig(apiName);
    if (!config) return false;
    return config.clientId.length > 0
      && config.clientSecret.length > 0
      && config.clientId !== 'your_sms_client_id'
      && config.clientId !== 'your_sale_client_id'
      && config.clientId !== 'your_bills_client_id';
  }

  /**
   * Get the config object for a given API name
   * @param {'sms'|'sale'|'bills'} apiName
   */
  _getConfig(apiName) {
    switch (apiName) {
      case 'sms': return this.smsConfig;
      case 'sale': return this.saleConfig;
      case 'bills': return this.billsConfig;
      default:
        throw new Error(`Unknown Orange API: ${apiName}. Use 'sms', 'sale', or 'bills'.`);
    }
  }

  /**
   * Get OAuth2 access token for a specific Orange API
   * @param {'sms'|'sale'|'bills'} apiName
   */
  async getAccessToken(apiName) {
    const config = this._getConfig(apiName);

    // Return cached token if still valid
    if (config.accessToken && Date.now() < config.tokenExpiresAt) {
      return config.accessToken;
    }

    if (this.mode === 'simulation') {
      config.accessToken = `sim_token_${apiName}_${Date.now()}`;
      config.tokenExpiresAt = Date.now() + 3600 * 1000;
      return config.accessToken;
    }

    if (!this.isConfigured(apiName)) {
      const envVars = {
        sms: 'ORANGE_SMS_CLIENT_ID and ORANGE_SMS_CLIENT_SECRET',
        sale: 'ORANGE_SALE_CLIENT_ID and ORANGE_SALE_CLIENT_SECRET',
        bills: 'ORANGE_BILLS_CLIENT_ID and ORANGE_BILLS_CLIENT_SECRET',
      };
      throw new Error(`Orange ${apiName} API is not configured. Set ${envVars[apiName]} in .env`);
    }

    try {
      const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
      const response = await axios.post(
        `${config.apiUrl.replace(/\/+$/, '')}/oauth/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
        }
      );

      config.accessToken = response.data.access_token;
      config.tokenExpiresAt = Date.now() + (response.data.expires_in || 3600) * 1000;
      return config.accessToken;
    } catch (error) {
      console.error(`[OrangeApi:${apiName}] Failed to get access token:`, error.response?.data || error.message);
      throw new Error(`Orange ${apiName} authentication failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Generate a unique transaction reference
   */
  generateReference() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `OM-${timestamp}-${random}`;
  }

  // ═══════════════════════════════════════════════════════════════
  //  SMS API Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send an SMS via Orange SMS API
   *
   * @param {Object} params
   * @param {string} params.phone - Recipient phone number
   * @param {string} params.message - SMS message content
   * @param {string} params.template - Template name (optional)
   * @param {Object} params.variables - Template variables (optional)
   * @returns {Object} { success, providerRef, message }
   */
  async sendSms({ phone, message, template = '', variables = {} }) {
    if (this.mode === 'simulation') {
      console.log(`[OrangeApi:SMS:Simulation] Sending SMS to ${phone}:`, { message, template });
      return {
        success: true,
        providerRef: `sim_sms_${Date.now()}`,
        message: 'SMS sent in simulation mode.',
      };
    }

    try {
      const token = await this.getAccessToken('sms');

      const response = await axios.post(
        `${this.smsConfig.apiUrl.replace(/\/+$/, '')}/sms/send`,
        {
          phone,
          message,
          template: template || undefined,
          variables: Object.keys(variables).length > 0 ? variables : undefined,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      return {
        success: true,
        providerRef: response.data.smsRef || response.data.id || `sms_${Date.now()}`,
        message: 'SMS sent successfully.',
      };
    } catch (error) {
      console.error('[OrangeApi:SMS] Failed to send SMS:', error.response?.data || error.message);
      return {
        success: false,
        providerRef: null,
        message: `Failed to send SMS: ${error.response?.data?.message || error.message}`,
      };
    }
  }

  /**
   * Send a bill payment link SMS via Orange SMS API
   *
   * @param {Object} params
   * @param {string} params.phone - Customer phone number
   * @param {string} params.billRef - Orange Money bill reference
   * @param {string} params.billNumber - Internal bill number
   * @param {number} params.amount - Total amount due
   * @param {string} params.paymentUrl - Payment URL
   * @param {Date|string} params.dueDate - Due date
   * @returns {Object} { success, providerRef, message }
   */
  async sendBillSms({ phone, billRef, billNumber, amount, paymentUrl, dueDate }) {
    const dueDateStr = dueDate instanceof Date
      ? dueDate.toLocaleDateString('en-GB')
      : new Date(dueDate).toLocaleDateString('en-GB');

    const message = `Bill ${billNumber} for ${amount.toLocaleString()} XAF is due on ${dueDateStr}.\nPay with Orange Money: ${paymentUrl}`;

    return this.sendSms({
      phone,
      message,
      template: 'bill_payment_link',
      variables: { billNumber, amount: amount.toLocaleString(), currency: 'XAF', dueDate: dueDateStr, paymentUrl },
    });
  }

  /**
   * Send a payment receipt SMS via Orange SMS API
   *
   * @param {Object} params
   * @param {string} params.phone - Customer phone number
   * @param {string} params.billNumber - Internal bill number
   * @param {number} params.amount - Amount paid
   * @param {string} params.transactionRef - Payment transaction reference
   * @returns {Object} { success, providerRef, message }
   */
  async sendReceiptSms({ phone, billNumber, amount, transactionRef }) {
    const message = `Payment received! ✅\nBill: ${billNumber}\nAmount: ${amount.toLocaleString()} XAF\nRef: ${transactionRef}\nThank you for your payment!`;

    return this.sendSms({
      phone,
      message,
      template: 'payment_receipt',
      variables: { billNumber, amount: amount.toLocaleString(), currency: 'XAF', transactionRef },
    });
  }

  /**
   * Send an overdue reminder SMS via Orange SMS API
   *
   * @param {Object} params
   * @param {string} params.phone - Customer phone number
   * @param {string} params.billNumber - Internal bill number
   * @param {number} params.amount - Total amount due
   * @param {string} params.paymentUrl - Payment URL
   * @returns {Object} { success, providerRef, message }
   */
  async sendOverdueSms({ phone, billNumber, amount, paymentUrl }) {
    const message = `⚠️ OVERDUE REMINDER\nBill ${billNumber}: ${amount.toLocaleString()} XAF is now overdue.\nPlease pay immediately to avoid penalties.\nPay now: ${paymentUrl}`;

    return this.sendSms({
      phone,
      message,
      template: 'overdue_reminder',
      variables: { billNumber, amount: amount.toLocaleString(), currency: 'XAF', paymentUrl },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  Sale Orders API Methods (Orange Money payments)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a bill in the Orange Money (Sale Orders) system
   *
   * @param {Object} params
   * @param {string} params.billNumber - Internal bill number (e.g. BILL-202605-0001)
   * @param {string} params.customerPhone - Customer phone number
   * @param {string} params.customerName - Customer name
   * @param {number} params.amount - Total amount due in XAF
   * @param {string} params.description - Bill description
   * @param {Date} params.dueDate - Payment due date
   * @param {Array} params.items - Line items [{description, quantity, unitPrice}]
   * @returns {Object} { success, billRef, paymentUrl, message }
   */
  async createBill({ billNumber, customerPhone, customerName, amount, description, dueDate, items }) {
    const ref = this.generateReference();

    if (this.mode === 'simulation') {
      console.log('[OrangeApi:Sale:Simulation] Creating bill:', {
        billNumber, customerPhone, amount, ref,
      });
      return {
        success: true,
        billRef: ref,
        paymentUrl: `https://pay.orange.cm/bill/${ref}`,
        message: 'Bill created in simulation mode. In production, this would create a real Orange Money bill.',
      };
    }

    try {
      const token = await this.getAccessToken('sale');
      const response = await axios.post(
        `${this.saleConfig.apiUrl.replace(/\/+$/, '')}/bills`,
        {
          billNumber,
          customer: { phone: customerPhone, name: customerName },
          amount: { value: Math.round(amount), currency: 'XAF' },
          description: description || `Bill ${billNumber}`,
          dueDate: dueDate instanceof Date ? dueDate.toISOString() : dueDate,
          items: items?.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: Math.round(item.unitPrice),
            total: Math.round(item.quantity * item.unitPrice),
          })),
          externalReference: ref,
          callbackUrl: process.env.ORANGE_MONEY_CALLBACK_URL || 'http://localhost:5000/api/bills/webhook/orange',
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      return {
        success: true,
        billRef: response.data.billRef || ref,
        paymentUrl: response.data.paymentUrl || `https://pay.orange.cm/bill/${response.data.billRef || ref}`,
        message: 'Bill created successfully in Orange Money system.',
      };
    } catch (error) {
      console.error('[OrangeApi:Sale] Failed to create bill:', error.response?.data || error.message);
      return {
        success: false,
        billRef: ref,
        paymentUrl: null,
        message: `Failed to create bill: ${error.response?.data?.message || error.message}`,
      };
    }
  }

  /**
   * Check the status of a bill in Orange Money (Sale Orders) system
   *
   * @param {string} billRef - Orange Money bill reference
   * @returns {Object} { success, status, amountPaid, paidAt, message }
   */
  async checkBillStatus(billRef) {
    if (this.mode === 'simulation') {
      return {
        success: true,
        status: 'PENDING',
        amountPaid: 0,
        paidAt: null,
        message: 'Bill status checked in simulation mode.',
      };
    }

    try {
      const token = await this.getAccessToken('sale');
      const response = await axios.get(
        `${this.saleConfig.apiUrl.replace(/\/+$/, '')}/bills/${billRef}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        }
      );

      return {
        success: true,
        status: response.data.status || 'PENDING',
        amountPaid: response.data.amountPaid?.value || 0,
        paidAt: response.data.paidAt || null,
        message: 'Bill status retrieved successfully.',
      };
    } catch (error) {
      console.error('[OrangeApi:Sale] Failed to check bill status:', error.response?.data || error.message);
      return {
        success: false,
        status: 'UNKNOWN',
        amountPaid: 0,
        paidAt: null,
        message: `Failed to check bill status: ${error.response?.data?.message || error.message}`,
      };
    }
  }

  /**
   * Initiate a refund for a paid bill via Orange Money (Sale Orders) API
   *
   * @param {string} billRef - Orange Money bill reference
   * @param {number} amount - Amount to refund in XAF
   * @param {string} reason - Reason for refund
   * @returns {Object} { success, refundRef, message }
   */
  async refundBill(billRef, amount, reason = '') {
    const ref = this.generateReference();

    if (this.mode === 'simulation') {
      return {
        success: true,
        refundRef: ref,
        message: 'Refund initiated in simulation mode.',
      };
    }

    try {
      const token = await this.getAccessToken('sale');
      const response = await axios.post(
        `${this.saleConfig.apiUrl.replace(/\/+$/, '')}/bills/${billRef}/refund`,
        {
          amount: { value: Math.round(amount), currency: 'XAF' },
          reason: reason || 'Customer requested refund',
          externalReference: ref,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      return {
        success: true,
        refundRef: response.data.refundRef || ref,
        message: 'Refund processed successfully.',
      };
    } catch (error) {
      console.error('[OrangeApi:Sale] Failed to refund bill:', error.response?.data || error.message);
      return {
        success: false,
        refundRef: null,
        message: `Failed to process refund: ${error.response?.data?.message || error.message}`,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  View Bills API Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * Fetch bills from Orange View Bills API
   *
   * @param {Object} params
   * @param {string} params.customerPhone - Filter by customer phone (optional)
   * @param {string} params.status - Filter by status (optional)
   * @param {string} params.fromDate - Start date (optional)
   * @param {string} params.toDate - End date (optional)
   * @param {number} params.page - Page number (optional)
   * @param {number} params.limit - Results per page (optional)
   * @returns {Object} { success, bills, pagination, message }
   */
  async fetchBills({ customerPhone, status, fromDate, toDate, page = 1, limit = 20 } = {}) {
    if (this.mode === 'simulation') {
      return {
        success: true,
        bills: [],
        pagination: { page, limit, total: 0, pages: 0 },
        message: 'Bills fetched in simulation mode (no external data).',
      };
    }

    try {
      const token = await this.getAccessToken('bills');
      const params = {};
      if (customerPhone) params.phone = customerPhone;
      if (status) params.status = status;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      params.page = page;
      params.limit = limit;

      const response = await axios.get(
        `${this.billsConfig.apiUrl.replace(/\/+$/, '')}/bills`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        }
      );

      return {
        success: true,
        bills: response.data.bills || response.data.data || [],
        pagination: response.data.pagination || { page, limit, total: 0, pages: 0 },
        message: 'Bills fetched successfully.',
      };
    } catch (error) {
      console.error('[OrangeApi:Bills] Failed to fetch bills:', error.response?.data || error.message);
      return {
        success: false,
        bills: [],
        pagination: { page, limit, total: 0, pages: 0 },
        message: `Failed to fetch bills: ${error.response?.data?.message || error.message}`,
      };
    }
  }

  /**
   * Get a specific bill from Orange View Bills API
   *
   * @param {string} billRef - Orange bill reference
   * @returns {Object} { success, bill, message }
   */
  async getBill(billRef) {
    if (this.mode === 'simulation') {
      return {
        success: true,
        bill: null,
        message: 'Bill fetched in simulation mode (no external data).',
      };
    }

    try {
      const token = await this.getAccessToken('bills');
      const response = await axios.get(
        `${this.billsConfig.apiUrl.replace(/\/+$/, '')}/bills/${billRef}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        }
      );

      return {
        success: true,
        bill: response.data,
        message: 'Bill fetched successfully.',
      };
    } catch (error) {
      console.error('[OrangeApi:Bills] Failed to get bill:', error.response?.data || error.message);
      return {
        success: false,
        bill: null,
        message: `Failed to get bill: ${error.response?.data?.message || error.message}`,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  Callback / Webhook Verification
  // ═══════════════════════════════════════════════════════════════

  /**
   * Verify a payment callback from Orange Money
   *
   * @param {Object} body - The callback body from Orange Money
   * @param {Object} headers - The callback headers (for signature verification)
   * @returns {Object} { valid, billRef, transactionRef, amount, status, message }
   */
  verifyCallback(body, headers = {}) {
    // In simulation mode, accept all callbacks
    if (this.mode === 'simulation') {
      return {
        valid: true,
        billRef: body.billRef || body.externalReference || '',
        transactionRef: body.transactionRef || body.id || '',
        amount: body.amount?.value || body.amount || 0,
        status: body.status || 'SUCCESSFUL',
        payerPhone: body.payer?.phone || body.phone || '',
        message: 'Callback verified in simulation mode.',
      };
    }

    try {
      // Verify signature if provided — use sale config secret for payment callbacks
      const signature = headers['x-orange-signature'];
      if (signature) {
        const expectedSig = crypto
          .createHmac('sha256', this.saleConfig.clientSecret)
          .update(JSON.stringify(body))
          .digest('hex');
        if (signature !== expectedSig) {
          console.error('[OrangeApi] Invalid callback signature');
          return { valid: false, message: 'Invalid signature' };
        }
      }

      return {
        valid: true,
        billRef: body.billRef || body.externalReference || '',
        transactionRef: body.transactionRef || body.id || '',
        amount: body.amount?.value || body.amount || 0,
        status: body.status === 'SUCCESS' || body.status === 'SUCCESSFUL' ? 'SUCCESSFUL' : 'FAILED',
        payerPhone: body.payer?.phone || body.phone || '',
        message: 'Callback verified successfully.',
      };
    } catch (error) {
      console.error('[OrangeApi] Callback verification error:', error.message);
      return { valid: false, message: `Verification error: ${error.message}` };
    }
  }
}

// Export singleton instance
module.exports = new OrangeApiService();
