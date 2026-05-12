const SmsLog = require('../models/SmsLog');
const orangeApi = require('./orange-money');

/**
 * SMS Service
 *
 * Handles sending SMS messages through configured providers.
 * Currently supports:
 *   - Orange SMS API (for bill payment links, receipts, reminders)
 *   - Simulation mode (logs messages instead of sending)
 *
 * All sent messages are logged to the SmsLog model for auditing.
 *
 * Uses the Orange SMS API credentials from .env:
 *   ORANGE_SMS_CLIENT_ID
 *   ORANGE_SMS_CLIENT_SECRET
 *   ORANGE_SMS_API_URL
 */

class SmsService {
  constructor() {
    this.mode = process.env.MOBILE_MONEY_MODE || 'simulation';
  }

  /**
   * Send a bill payment link SMS to a customer
   *
   * @param {Object} params
   * @param {string} params.phone - Customer phone number
   * @param {string} params.billId - Bill ObjectId
   * @param {string} params.billNumber - Human-readable bill number
   * @param {number} params.amount - Total amount due
   * @param {string} params.paymentUrl - Payment URL
   * @param {Date} params.dueDate - Due date
   * @param {string} params.customerId - Customer ObjectId (optional)
   * @returns {Object} { success, smsLog, message }
   */
  async sendBillPaymentLink({ phone, billId, billNumber, amount, paymentUrl, dueDate, customerId }) {
    const dueDateStr = dueDate instanceof Date
      ? dueDate.toLocaleDateString('en-GB')
      : new Date(dueDate).toLocaleDateString('en-GB');

    const message = `Bill ${billNumber} for ${amount.toLocaleString()} XAF is due on ${dueDateStr}.\nPay with Orange Money: ${paymentUrl}`;

    // Create SMS log entry
    const smsLog = await SmsLog.create({
      phone,
      customer: customerId || null,
      message,
      template: 'bill_payment_link',
      bill: billId,
      status: 'QUEUED',
    });

    try {
      // Send via Orange SMS API
      const result = await orangeApi.sendBillSms({
        phone,
        billRef: billId.toString(),
        billNumber,
        amount,
        paymentUrl,
        dueDate,
      });

      // Update SMS log
      smsLog.status = result.success ? 'SENT' : 'FAILED';
      smsLog.providerRef = result.providerRef || '';
      smsLog.errorMessage = result.success ? '' : result.message;
      smsLog.sentAt = result.success ? new Date() : null;
      await smsLog.save();

      return {
        success: result.success,
        smsLog,
        message: result.message,
      };
    } catch (error) {
      smsLog.status = 'FAILED';
      smsLog.errorMessage = error.message;
      await smsLog.save();

      return {
        success: false,
        smsLog,
        message: `Failed to send SMS: ${error.message}`,
      };
    }
  }

  /**
   * Send a payment receipt SMS to a customer
   *
   * @param {Object} params
   * @param {string} params.phone - Customer phone number
   * @param {string} params.billId - Bill ObjectId
   * @param {string} params.billNumber - Human-readable bill number
   * @param {number} params.amount - Amount paid
   * @param {string} params.transactionRef - Payment transaction reference
   * @param {string} params.customerId - Customer ObjectId (optional)
   * @returns {Object} { success, smsLog, message }
   */
  async sendPaymentReceipt({ phone, billId, billNumber, amount, transactionRef, customerId }) {
    const message = `Payment received! ✅\nBill: ${billNumber}\nAmount: ${amount.toLocaleString()} XAF\nRef: ${transactionRef}\nThank you for your payment!`;

    const smsLog = await SmsLog.create({
      phone,
      customer: customerId || null,
      message,
      template: 'payment_receipt',
      bill: billId,
      status: 'QUEUED',
    });

    try {
      const result = await orangeApi.sendReceiptSms({
        phone,
        billNumber,
        amount,
        transactionRef,
      });

      smsLog.status = result.success ? 'SENT' : 'FAILED';
      smsLog.providerRef = result.providerRef || '';
      smsLog.errorMessage = result.success ? '' : result.message;
      smsLog.sentAt = result.success ? new Date() : null;
      await smsLog.save();

      return {
        success: result.success,
        smsLog,
        message: result.message,
      };
    } catch (error) {
      smsLog.status = 'FAILED';
      smsLog.errorMessage = error.message;
      await smsLog.save();

      return {
        success: false,
        smsLog,
        message: `Failed to send receipt SMS: ${error.message}`,
      };
    }
  }

  /**
   * Send an overdue reminder SMS
   *
   * @param {Object} params
   * @param {string} params.phone - Customer phone number
   * @param {string} params.billId - Bill ObjectId
   * @param {string} params.billNumber - Human-readable bill number
   * @param {number} params.amount - Total amount due
   * @param {string} params.paymentUrl - Payment URL
   * @param {string} params.customerId - Customer ObjectId (optional)
   * @returns {Object} { success, smsLog, message }
   */
  async sendOverdueReminder({ phone, billId, billNumber, amount, paymentUrl, customerId }) {
    const message = `⚠️ OVERDUE REMINDER\nBill ${billNumber}: ${amount.toLocaleString()} XAF is now overdue.\nPlease pay immediately to avoid penalties.\nPay now: ${paymentUrl}`;

    const smsLog = await SmsLog.create({
      phone,
      customer: customerId || null,
      message,
      template: 'overdue_reminder',
      bill: billId,
      status: 'QUEUED',
    });

    try {
      // Use the Orange SMS API's overdue method
      const result = await orangeApi.sendOverdueSms({
        phone,
        billNumber,
        amount,
        paymentUrl,
      });

      smsLog.status = result.success ? 'SENT' : 'FAILED';
      smsLog.providerRef = result.providerRef || '';
      smsLog.errorMessage = result.success ? '' : result.message;
      smsLog.sentAt = result.success ? new Date() : null;
      await smsLog.save();

      return {
        success: result.success,
        smsLog,
        message: result.message,
      };
    } catch (error) {
      smsLog.status = 'FAILED';
      smsLog.errorMessage = error.message;
      await smsLog.save();

      return {
        success: false,
        smsLog,
        message: `Failed to send reminder: ${error.message}`,
      };
    }
  }

  /**
   * Send a custom SMS message
   *
   * @param {Object} params
   * @param {string} params.phone - Recipient phone number
   * @param {string} params.message - Message content
   * @param {string} params.template - Template name (optional)
   * @param {string} params.billId - Related bill ObjectId (optional)
   * @param {string} params.customerId - Customer ObjectId (optional)
   * @returns {Object} { success, smsLog, message }
   */
  async sendCustomSms({ phone, message, template = '', billId = null, customerId = null }) {
    const smsLog = await SmsLog.create({
      phone,
      customer: customerId || null,
      message,
      template: template || 'custom',
      bill: billId,
      status: 'QUEUED',
    });

    try {
      const result = await orangeApi.sendSms({
        phone,
        message,
        template: template || undefined,
      });

      smsLog.status = result.success ? 'SENT' : 'FAILED';
      smsLog.providerRef = result.providerRef || '';
      smsLog.errorMessage = result.success ? '' : result.message;
      smsLog.sentAt = result.success ? new Date() : null;
      await smsLog.save();

      return {
        success: result.success,
        smsLog,
        message: result.message,
      };
    } catch (error) {
      smsLog.status = 'FAILED';
      smsLog.errorMessage = error.message;
      await smsLog.save();

      return {
        success: false,
        smsLog,
        message: `Failed to send custom SMS: ${error.message}`,
      };
    }
  }

  /**
   * Get SMS logs for a specific bill
   *
   * @param {string} billId - Bill ObjectId
   * @returns {Array} Array of SmsLog documents
   */
  async getBillSmsLogs(billId) {
    return SmsLog.find({ bill: billId }).sort({ createdAt: -1 }).lean();
  }

  /**
   * Get SMS logs for a specific phone number
   *
   * @param {string} phone - Phone number
   * @param {number} limit - Max results
   * @returns {Array} Array of SmsLog documents
   */
  async getPhoneSmsLogs(phone, limit = 20) {
    return SmsLog.find({ phone }).sort({ createdAt: -1 }).limit(limit).lean();
  }
}

module.exports = new SmsService();
