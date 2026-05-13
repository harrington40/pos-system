/**
 * MTN Mobile Money (MoMo) API Service
 *
 * Implements the MTN MoMo API for:
 *   - OAuth2 Authentication (Client Credentials)
 *   - Collections: Request to Pay (receive payments)
 *   - Disbursements: Transfer (refunds)
 *   - Remittance: Transfer (supplier payments)
 *   - Account Balance (collection, disbursement & remittance)
 *   - Transaction Status
 *   - Webhook Signature Validation
 *   - Account Holder Validation
 *
 * API Reference: https://momodeveloper.mtn.com/
 *
 * Environment Variables Required:
 *   MTN_MOMO_API_URL        - Base URL (sandbox or production)
 *   MTN_MOMO_SUBSCRIPTION_KEY - Primary subscription key (Ocp-Apim-Subscription-Key)
 *   MTN_MOMO_API_USER       - API User (UUID, created via provisioning)
 *   MTN_MOMO_API_KEY        - API Key (base64, created via provisioning)
 *   MTN_MOMO_CALLBACK_URL   - Public URL for MTN to call back on
 *   MTN_MOMO_CURRENCY       - Currency code (default: EUR for sandbox, XAF for production)
 */

const axios = require('axios');
const crypto = require('crypto');

class MTNMoMoService {
  constructor() {
    this.baseUrl = process.env.MTN_MOMO_API_URL || 'https://sandbox.momodeveloper.mtn.com';
    this.subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY || '';
    this.apiUser = process.env.MTN_MOMO_API_USER || '';
    this.apiKey = process.env.MTN_MOMO_API_KEY || '';
    this.callbackUrl = process.env.MTN_MOMO_CALLBACK_URL || '';
    this.currency = process.env.MTN_MOMO_CURRENCY || 'EUR';

    // Token cache
    this._collectionToken = null;
    this._disbursementToken = null;
    this._remittanceToken = null;
    this._collectionTokenExpiry = 0;
    this._disbursementTokenExpiry = 0;
    this._remittanceTokenExpiry = 0;

    // Strip trailing slash from base URL
    if (this.baseUrl.endsWith('/')) {
      this.baseUrl = this.baseUrl.slice(0, -1);
    }
  }

  /**
   * ──────────────────────────────────────────────
   * OAUTH2 TOKEN MANAGEMENT
   * ──────────────────────────────────────────────
   */

  /**
   * Generate a Basic Auth token for API User provisioning
   * Format: base64("API_USER:API_KEY")
   */
  _getBasicAuthToken() {
    const credentials = `${this.apiUser}:${this.apiKey}`;
    return Buffer.from(credentials).toString('base64');
  }

  /**
   * Generate a UUID v4 for X-Reference-Id headers
   */
  _generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * Get or refresh a collection token
   * POST /collection/token/
   *
   * @returns {Promise<string>} Access token
   */
  async getCollectionToken() {
    // Return cached token if still valid (with 5 min buffer)
    if (this._collectionToken && Date.now() < this._collectionTokenExpiry - 300000) {
      return this._collectionToken;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/collection/token/`,
        {},
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Authorization': `Basic ${this._getBasicAuthToken()}`,
          },
        }
      );

      this._collectionToken = response.data.access_token;
      // Token expires in 3600 seconds (1 hour) by default
      this._collectionTokenExpiry = Date.now() + (response.data.expires_in || 3600) * 1000;

      console.log('[MTN MoMo] Collection token acquired, expires in', response.data.expires_in || 3600, 's');
      return this._collectionToken;
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data;
      console.error('[MTN MoMo] Failed to get collection token:', status, JSON.stringify(detail));
      throw new Error(`MTN MoMo auth failed (${status}): ${detail?.message || detail || err.message}`);
    }
  }

  /**
   * Get or refresh a disbursement token
   * POST /disbursement/token/
   *
   * @returns {Promise<string>} Access token
   */
  async getDisbursementToken() {
    if (this._disbursementToken && Date.now() < this._disbursementTokenExpiry - 300000) {
      return this._disbursementToken;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/disbursement/token/`,
        {},
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Authorization': `Basic ${this._getBasicAuthToken()}`,
          },
        }
      );

      this._disbursementToken = response.data.access_token;
      this._disbursementTokenExpiry = Date.now() + (response.data.expires_in || 3600) * 1000;

      console.log('[MTN MoMo] Disbursement token acquired, expires in', response.data.expires_in || 3600, 's');
      return this._disbursementToken;
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data;
      console.error('[MTN MoMo] Failed to get disbursement token:', status, JSON.stringify(detail));
      throw new Error(`MTN MoMo disbursement auth failed (${status}): ${detail?.message || detail || err.message}`);
    }
  }

  /**
   * ──────────────────────────────────────────────
   * API USER PROVISIONING
   * ──────────────────────────────────────────────
   */

  /**
   * Create an API User on the MTN MoMo sandbox
   * POST /v1_0/apiuser
   *
   * This is typically done once via the portal, but included here
   * for automated provisioning.
   *
   * @param {string} providerCallbackHost - Public host for callbacks
   * @returns {Promise<object>} API User details
   */
  async createApiUser(providerCallbackHost = '') {
    const referenceId = this._generateUUID();
    const callbackHost = providerCallbackHost || new URL(this.callbackUrl).hostname || 'localhost';

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1_0/apiuser`,
        {
          providerCallbackHost: callbackHost,
        },
        {
          headers: {
            'X-Reference-Id': referenceId,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        }
      );

      console.log('[MTN MoMo] API User created with reference ID:', referenceId);
      return { referenceId, status: response.status };
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data;
      console.error('[MTN MoMo] Failed to create API User:', status, JSON.stringify(detail));
      throw new Error(`MTN MoMo API User creation failed (${status}): ${detail?.message || detail || err.message}`);
    }
  }

  /**
   * Create an API Key for an existing API User
   * POST /v1_0/apiuser/{referenceId}/apikey
   *
   * @param {string} referenceId - The API User reference ID (UUID)
   * @returns {Promise<string>} API Key
   */
  async createApiKey(referenceId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1_0/apiuser/${referenceId}/apikey`,
        {},
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        }
      );

      console.log('[MTN MoMo] API Key created for user:', referenceId);
      return response.data.apiKey;
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data;
      console.error('[MTN MoMo] Failed to create API Key:', status, JSON.stringify(detail));
      throw new Error(`MTN MoMo API Key creation failed (${status}): ${detail?.message || detail || err.message}`);
    }
  }

  /**
   * ──────────────────────────────────────────────
   * COLLECTIONS — REQUEST TO PAY
   * ──────────────────────────────────────────────
   */

  /**
   * Request a payment from a customer (USSD push)
   * POST /collection/v1_0/requesttopay
   *
   * This sends a USSD push notification to the customer's phone
   * asking them to confirm the payment.
   *
   * @param {object} params
   * @param {string} params.amount - Amount to charge
   * @param {string} params.currency - Currency code (default: EUR)
   * @param {string} params.partyId - Customer phone number (MSISDN)
   * @param {string} params.partyIdType - 'MSISDN' for phone numbers
   * @param {string} params.externalId - Your reference ID for this transaction
   * @param {string} params.payerMessage - Message shown to customer
   * @param {string} params.payeeNote - Note for your records
   * @returns {Promise<object>} { referenceId, status }
   */
  async requestToPay({
    amount,
    currency = this.currency,
    partyId,
    partyIdType = 'MSISDN',
    externalId,
    payerMessage = 'Payment for order',
    payeeNote = 'POS System payment',
  } = {}) {
    const token = await this.getCollectionToken();
    const referenceId = this._generateUUID();

    const body = {
      amount: String(amount),
      currency,
      externalId: externalId || referenceId,
      payer: {
        partyIdType,
        partyId: String(partyId),
      },
      payerMessage,
      payeeNote,
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/collection/v1_0/requesttopay`,
        body,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Reference-Id': referenceId,
            'X-Target-Environment': this._getEnvironment(),
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`[MTN MoMo] RequestToPay sent to ${partyId} for ${amount} ${currency}, ref: ${referenceId}`);
      return {
        success: true,
        referenceId,
        status: response.status,
        // The actual result is async — use getTransactionStatus to check
      };
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data;
      console.error('[MTN MoMo] RequestToPay failed:', status, JSON.stringify(detail));
      return {
        success: false,
        referenceId,
        status,
        error: detail?.message || detail || err.message,
      };
    }
  }

  /**
   * Check the status of a RequestToPay transaction
   * GET /collection/v1_0/requesttopay/{referenceId}
   *
   * @param {string} referenceId - The X-Reference-Id used in requestToPay
   * @returns {Promise<object>} Transaction status
   */
  async getRequestToPayStatus(referenceId) {
    const token = await this.getCollectionToken();

    try {
      const response = await axios.get(
        `${this.baseUrl}/collection/v1_0/requesttopay/${referenceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Target-Environment': this._getEnvironment(),
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        }
      );

      return {
        success: true,
        ...response.data,
      };
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data;
      console.error('[MTN MoMo] Get transaction status failed:', status, JSON.stringify(detail));
      return {
        success: false,
        status,
        error: detail?.message || detail || err.message,
      };
    }
  }

  /**
   * ──────────────────────────────────────────────
   * DISBURSEMENTS — REFUNDS / TRANSFERS
   * ──────────────────────────────────────────────
   */

  /**
   * Transfer money to a customer (refund)
   * POST /disbursement/v1_0/transfer
   *
   * Used for refunding orders paid via MTN Mobile Money.
   *
   * @param {object} params
   * @param {string} params.amount - Amount to refund
   * @param {string} params.currency - Currency code
   * @param {string} params.partyId - Customer phone number (MSISDN)
   * @param {string} params.partyIdType - 'MSISDN' for phone numbers
   * @param {string} params.externalId - Your reference for this refund
   * @param {string} params.payerMessage - Message shown to customer
   * @param {string} params.payeeNote - Note for your records
   * @returns {Promise<object>} { referenceId, status }
   */
  async transfer({
    amount,
    currency = this.currency,
    partyId,
    partyIdType = 'MSISDN',
    externalId,
    payerMessage = 'Refund from POS System',
    payeeNote = 'Order refund',
  } = {}) {
    const token = await this.getDisbursementToken();
    const referenceId = this._generateUUID();

    const body = {
      amount: String(amount),
      currency,
      externalId: externalId || referenceId,
      payee: {
        partyIdType,
        partyId: String(partyId),
      },
      payerMessage,
      payeeNote,
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/disbursement/v1_0/transfer`,
        body,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Reference-Id': referenceId,
            'X-Target-Environment': this._getEnvironment(),
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`[MTN MoMo] Transfer sent to ${partyId} for ${amount} ${currency}, ref: ${referenceId}`);
      return {
        success: true,
        referenceId,
        status: response.status,
      };
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data;
      console.error('[MTN MoMo] Transfer failed:', status, JSON.stringify(detail));
      return {
        success: false,
        referenceId,
        status,
        error: detail?.message || detail || err.message,
      };
    }
  }

  /**
   * Check the status of a disbursement transfer
   * GET /disbursement/v1_0/transfer/{referenceId}
   *
   * @param {string} referenceId - The X-Reference-Id used in transfer
   * @returns {Promise<object>} Transfer status
   */
  async getTransferStatus(referenceId) {
    const token = await this.getDisbursementToken();

    try {
      const response = await axios.get(
        `${this.baseUrl}/disbursement/v1_0/transfer/${referenceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Target-Environment': this._getEnvironment(),
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        }
      );

      return {
        success: true,
        ...response.data,
      };
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data;
      console.error('[MTN MoMo] Get transfer status failed:', status, JSON.stringify(detail));
      return {
        success: false,
        status,
        error: detail?.message || detail || err.message,
      };
    }
  }

  /**
   * ──────────────────────────────────────────────
   * REMITTANCE — SUPPLIER PAYMENTS
   * ──────────────────────────────────────────────
   */

  /**
   * Get or refresh a remittance token
   * POST /remittance/token/
   *
   * @returns {Promise<string>} Access token
   */
  async getRemittanceToken() {
    if (this._remittanceToken && Date.now() < this._remittanceTokenExpiry - 300000) {
      return this._remittanceToken;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/remittance/token/`,
        {},
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Authorization': `Basic ${this._getBasicAuthToken()}`,
          },
        }
      );

      this._remittanceToken = response.data.access_token;
      this._remittanceTokenExpiry = Date.now() + (response.data.expires_in || 3600) * 1000;

      console.log('[MTN MoMo] Remittance token acquired, expires in', response.data.expires_in || 3600, 's');
      return this._remittanceToken;
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data;
      console.error('[MTN MoMo] Failed to get remittance token:', status, JSON.stringify(detail));
      throw new Error(`MTN MoMo remittance auth failed (${status}): ${detail?.message || detail || err.message}`);
    }
  }

  /**
   * Transfer money to a supplier via Remittance API
   * POST /remittance/v1_0/transfer
   *
   * Used for paying suppliers from the business account.
   *
   * @param {object} params
   * @param {string} params.amount - Amount to transfer
   * @param {string} params.currency - Currency code
   * @param {string} params.partyId - Supplier phone number (MSISDN)
   * @param {string} params.partyIdType - 'MSISDN' for phone numbers
   * @param {string} params.externalId - Your reference for this transfer
   * @param {string} params.payerMessage - Message shown to supplier
   * @param {string} params.payeeNote - Note for your records
   * @returns {Promise<object>} { referenceId, status }
   */
  async remittanceTransfer({
    amount,
    currency = this.currency,
    partyId,
    partyIdType = 'MSISDN',
    externalId,
    payerMessage = 'Supplier payment from POS System',
    payeeNote = 'Supplier invoice payment',
  } = {}) {
    const token = await this.getRemittanceToken();
    const referenceId = this._generateUUID();

    const body = {
      amount: String(amount),
      currency,
      externalId: externalId || referenceId,
      payee: {
        partyIdType,
        partyId: String(partyId),
      },
      payerMessage,
      payeeNote,
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/remittance/v1_0/transfer`,
        body,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Reference-Id': referenceId,
            'X-Target-Environment': this._getEnvironment(),
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`[MTN MoMo] Remittance transfer sent to ${partyId} for ${amount} ${currency}, ref: ${referenceId}`);
      return {
        success: true,
        referenceId,
        status: response.status,
      };
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data;
      console.error('[MTN MoMo] Remittance transfer failed:', status, JSON.stringify(detail));
      return {
        success: false,
        referenceId,
        status,
        error: detail?.message || detail || err.message,
      };
    }
  }

  /**
   * Check the status of a remittance transfer
   * GET /remittance/v1_0/transfer/{referenceId}
   *
   * @param {string} referenceId - The X-Reference-Id used in remittanceTransfer
   * @returns {Promise<object>} Transfer status
   */
  async getRemittanceTransferStatus(referenceId) {
    const token = await this.getRemittanceToken();

    try {
      const response = await axios.get(
        `${this.baseUrl}/remittance/v1_0/transfer/${referenceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Target-Environment': this._getEnvironment(),
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        }
      );

      return {
        success: true,
        ...response.data,
      };
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data;
      console.error('[MTN MoMo] Get remittance transfer status failed:', status, JSON.stringify(detail));
      return {
        success: false,
        status,
        error: detail?.message || detail || err.message,
      };
    }
  }

  /**
   * Get remittance account balance
   * GET /remittance/v1_0/account/balance
   *
   * @returns {Promise<object>} { availableBalance, currency }
   */
  async getRemittanceBalance() {
    const token = await this.getRemittanceToken();

    try {
      const response = await axios.get(
        `${this.baseUrl}/remittance/v1_0/account/balance`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Target-Environment': this._getEnvironment(),
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        }
      );

      return {
        success: true,
        availableBalance: response.data.availableBalance,
        currency: response.data.currency,
      };
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data;
      console.error('[MTN MoMo] Get remittance balance failed:', status, JSON.stringify(detail));
      return {
        success: false,
        error: detail?.message || detail || err.message,
      };
    }
  }

  /**
   * Validate an account holder status for Remittance
   * GET /remittance/v1_0/accountholder/msisdn/{phone}
   *
   * Check if a phone number is registered for MTN Mobile Money
   * and can receive remittance transfers.
   *
   * @param {string} phone - Phone number (MSISDN) to validate
   * @returns {Promise<object>} Account holder status
   */
  async validateRemittanceAccountHolder(phone) {
    const token = await this.getRemittanceToken();

    try {
      const response = await axios.get(
        `${this.baseUrl}/remittance/v1_0/accountholder/msisdn/${phone}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Target-Environment': this._getEnvironment(),
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        }
      );

      return {
        success: true,
        available: true,
        ...response.data,
      };
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data;
      // 404 means the account holder is not found (not registered)
      if (status === 404) {
        return {
          success: true,
          available: false,
          message: 'Account holder not found or not registered for MTN Mobile Money',
        };
      }
      console.error('[MTN MoMo] Validate remittance account holder failed:', status, JSON.stringify(detail));
      return {
        success: false,
        error: detail?.message || detail || err.message,
      };
    }
  }

  /**
   * ──────────────────────────────────────────────
   * ACCOUNT BALANCE
   * ──────────────────────────────────────────────
   */

  /**
   * Get collection account balance
   * GET /collection/v1_0/account/balance
   *
   * @returns {Promise<object>} { availableBalance, currency }
   */
  async getCollectionBalance() {
    const token = await this.getCollectionToken();

    try {
      const response = await axios.get(
        `${this.baseUrl}/collection/v1_0/account/balance`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Target-Environment': this._getEnvironment(),
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        }
      );

      return {
        success: true,
        availableBalance: response.data.availableBalance,
        currency: response.data.currency,
      };
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data;
      console.error('[MTN MoMo] Get collection balance failed:', status, JSON.stringify(detail));
      return {
        success: false,
        error: detail?.message || detail || err.message,
      };
    }
  }

  /**
   * Get disbursement account balance
   * GET /disbursement/v1_0/account/balance
   *
   * @returns {Promise<object>} { availableBalance, currency }
   */
  async getDisbursementBalance() {
    const token = await this.getDisbursementToken();

    try {
      const response = await axios.get(
        `${this.baseUrl}/disbursement/v1_0/account/balance`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Target-Environment': this._getEnvironment(),
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        }
      );

      return {
        success: true,
        availableBalance: response.data.availableBalance,
        currency: response.data.currency,
      };
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data;
      console.error('[MTN MoMo] Get disbursement balance failed:', status, JSON.stringify(detail));
      return {
        success: false,
        error: detail?.message || detail || err.message,
      };
    }
  }

  /**
   * ──────────────────────────────────────────────
   * WEBHOOK / CALLBACK VALIDATION
   * ──────────────────────────────────────────────
   */

  /**
   * Validate an incoming webhook callback from MTN MoMo.
   *
   * MTN sends callbacks with the following headers:
   *   - X-Reference-Id: The original reference ID
   *   - X-Callback-Signature: HMAC-SHA256 signature for verification
   *
   * The signature is computed as:
   *   HMAC-SHA256(apiKey, referenceId + "." + callbackBody)
   *
   * @param {object} headers - Request headers
   * @param {string} body - Raw request body (string)
   * @returns {boolean} Whether the callback is valid
   */
  validateWebhookCallback(headers, body) {
    const referenceId = headers['x-reference-id'];
    const signature = headers['x-callback-signature'];

    if (!referenceId || !signature) {
      console.warn('[MTN MoMo] Webhook missing X-Reference-Id or X-Callback-Signature');
      return false;
    }

    if (!this.apiKey) {
      console.warn('[MTN MoMo] No API Key configured for webhook validation');
      return false;
    }

    try {
      // The signature is HMAC-SHA256 of "referenceId.body" using apiKey as the secret
      const payload = `${referenceId}.${body}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.apiKey)
        .update(payload)
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
      );

      if (!isValid) {
        console.warn('[MTN MoMo] Webhook signature mismatch');
      }

      return isValid;
    } catch (err) {
      console.error('[MTN MoMo] Webhook validation error:', err.message);
      return false;
    }
  }

  /**
   * ──────────────────────────────────────────────
   * HELPER METHODS
   * ──────────────────────────────────────────────
   */

  /**
   * Determine the target environment for API calls
   */
  _getEnvironment() {
    if (this.baseUrl.includes('sandbox')) {
      return 'sandbox';
    }
    return 'production';
  }

  /**
   * Check if the service is properly configured for production use
   * @returns {{ configured: boolean, missing: string[] }}
   */
  isConfigured() {
    const missing = [];
    if (!this.subscriptionKey || this.subscriptionKey === 'your_subscription_key') missing.push('MTN_MOMO_SUBSCRIPTION_KEY');
    if (!this.apiUser || this.apiUser === 'your_api_user') missing.push('MTN_MOMO_API_USER');
    if (!this.apiKey || this.apiKey === 'your_api_key') missing.push('MTN_MOMO_API_KEY');

    return {
      configured: missing.length === 0,
      missing,
      mode: this._getEnvironment(),
    };
  }

  /**
   * Get the current mode (simulation vs production)
   */
  getMode() {
    return process.env.MOBILE_MONEY_MODE || 'simulation';
  }
}

module.exports = new MTNMoMoService();
