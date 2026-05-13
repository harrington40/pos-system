/**
 * QR Code & Barcode Service — Smart Generation Algorithms
 *
 * Generates QR codes and barcodes as SVG strings for embedding in
 * receipts, product displays, discount codes, and admin panels.
 *
 * Smart Receipt QR Algorithm:
 *   Encodes rich order data (items, discounts, totals, store info)
 *   into a compact JSON payload, enabling:
 *   - Digital receipt verification
 *   - Loyalty point accumulation
 *   - Return/refund processing
 *   - Analytics tracking
 *
 * Dependencies:
 *  - qrcode: QR code generation (npm install qrcode)
 *  - jsbarcode: Barcode generation (npm install jsbarcode)
 */
const QRCode = require('qrcode');
const JsBarcode = require('jsbarcode');
const { createCanvas } = require('canvas');

class QRService {

  /**
   * Generate a QR code SVG string
   * @param {string} data - Data to encode
   * @param {object} options - QR code options
   * @returns {Promise<string>} SVG string
   */
  async generateQRCode(data, options = {}) {
    try {
      const opts = {
        type: 'svg',
        margin: 2,
        width: 200,
        color: {
          dark: options.color || '#000000',
          light: '#ffffff'
        },
        ...options
      };
      const svg = await QRCode.toString(data, opts);
      return svg;
    } catch (err) {
      console.error('QR generation error:', err.message);
      return this._fallbackSVG('QR', data);
    }
  }

  /**
   * Generate a barcode SVG string
   * @param {string} data - Data to encode (usually item ID or SKU)
   * @param {object} options - Barcode options
   * @returns {Promise<string>} SVG string
   */
  async generateBarcode(data, options = {}) {
    try {
      const canvas = createCanvas(200, 80);
      JsBarcode(canvas, data, {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 14,
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000',
        ...options
      });
      // Try toSVG() first, fall back to a generated SVG pattern
      if (typeof canvas.toSVG === 'function') {
        return canvas.toSVG();
      }
      // Generate a visual barcode SVG manually
      return this._generateBarcodeSVG(data);
    } catch (err) {
      console.error('Barcode generation error:', err.message);
      return this._generateBarcodeSVG(data);
    }
  }

  /**
   * Generate a visual barcode SVG without jsbarcode dependency
   * Creates a CODE128-like pattern based on the data hash
   */
  _generateBarcodeSVG(data) {
    const str = String(data);
    const width = 200;
    const height = 60;
    const barCount = Math.min(str.length * 4 + 20, 80);
    const barWidth = width / barCount;

    // Generate deterministic bar pattern from data
    let bars = '';
    for (let i = 0; i < barCount; i++) {
      const charCode = str.charCodeAt(i % str.length) || 42;
      const barH = ((charCode * (i + 1)) % 40) + 20; // 20-60px height
      const isBlack = ((charCode + i * 3) % 3) !== 0;
      if (isBlack) {
        bars += `<rect x="${(i * barWidth).toFixed(1)}" y="${(height - barH).toFixed(1)}" width="${Math.max(barWidth - 0.5, 1).toFixed(1)}" height="${barH.toFixed(1)}" fill="#000" />`;
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#ffffff" rx="2"/>
      ${bars}
      <text x="${width / 2}" y="${height - 4}" text-anchor="middle" font-family="monospace" font-size="10" fill="#000">${str}</text>
    </svg>`;
  }

  /**
   * Generate QR code for a menu item (product info + price)
   * @param {object} item - MenuItem document
   * @returns {Promise<string>} SVG string
   */
  async generateItemQRCode(item) {
    const data = JSON.stringify({
      id: item._id,
      name: item.name,
      price: item.price,
      category: item.category,
      barcode: item.barcode || ''
    });
    return this.generateQRCode(data, {
      color: '#DD9B1D',
      width: 150
    });
  }

  /**
   * ── SMART RECEIPT QR ALGORITHM ──
   *
   * Generates a rich QR code for an order receipt.
   * Encodes a comprehensive payload for digital verification,
   * loyalty tracking, and refund processing.
   *
   * Algorithm:
   *   1. Extract order metadata (receipt, date, totals)
   *   2. Encode discount info if present (code, amount, type)
   *   3. Encode item summary (count, categories)
   *   4. Add store identifier and version for forward compatibility
   *   5. Generate checksum for data integrity
   *
   * @param {object} order - Order document (populated with items)
   * @returns {Promise<{svg: string, payload: object}>} SVG string + decoded payload
   */
  async generateReceiptQRCode(order) {
    // Build rich payload
    const itemCategories = [...new Set((order.items || []).map(i => i.category || 'general'))];
    const itemCount = (order.items || []).reduce((s, i) => s + (i.quantity || 0), 0);

    const payload = {
      v: 2, // version for forward compatibility
      type: 'receipt',
      store: 'POS-System',
      receipt: order.receiptNumber,
      date: order.createdAt || new Date().toISOString(),
      subtotal: order.subtotal || 0,
      tax: order.tax || 0,
      total: order.total || 0,
      payment: order.paymentMethod || 'cash',
      items: itemCount,
      categories: itemCategories,
      // Discount data (if applied)
      ...(order.discountCode && order.discountAmount > 0 ? {
        discCode: order.discountCode,
        discAmt: order.discountAmount,
        discType: order.discountType
      } : {}),
      // Checksum for data integrity
      cksum: this._generateChecksum(order)
    };

    const data = JSON.stringify(payload);
    const svg = await this.generateQRCode(data, {
      color: '#000000',
      width: 140
    });

    return { svg, payload };
  }

  /**
   * Generate a lightweight checksum from order data for integrity verification
   */
  _generateChecksum(order) {
    const str = `${order.receiptNumber}|${order.total}|${order.subtotal || 0}|${order.discountAmount || 0}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).toUpperCase();
  }

  /**
   * Generate barcode for a menu item
   * @param {object} item - MenuItem document
   * @returns {Promise<string>} SVG string
   */
  async generateItemBarcode(item) {
    const code = item.barcode || `ITEM-${item._id.toString().slice(-8).toUpperCase()}`;
    return this.generateBarcode(code);
  }

  /**
   * Generate a discount coupon QR code — scan to apply discount
   * @param {object} discount - Discount document
   * @returns {Promise<string>} SVG string
   */
  async generateDiscountQRCode(discount) {
    const payload = {
      v: 1,
      type: 'coupon',
      code: discount.code,
      barcode: discount.barcode,
      value: discount.value,
      discountType: discount.type,
      desc: discount.description || ''
    };
    const data = JSON.stringify(payload);
    return this.generateQRCode(data, {
      color: '#2E7D32',
      width: 150
    });
  }

  /**
   * Generate a combined receipt SVG with both QR code and barcode
   * for printing on physical receipts
   * @param {object} order - Order document
   * @returns {Promise<string>} Combined SVG string
   */
  async generateReceiptBarcode(order) {
    const code = order.receiptNumber || `RCP-${order._id.toString().slice(-8).toUpperCase()}`;
    return this.generateBarcode(code, {
      width: 2,
      height: 50,
      fontSize: 12
    });
  }

  /**
   * Generate a combined receipt visual (QR + barcode side by side)
   * @param {object} order - Order document
   * @returns {Promise<{qrSvg: string, barSvg: string, payload: object}>}
   */
  async generateFullReceiptVisuals(order) {
    const [qrResult, barSvg] = await Promise.all([
      this.generateReceiptQRCode(order),
      this.generateReceiptBarcode(order)
    ]);
    return {
      qrSvg: qrResult.svg,
      barSvg,
      payload: qrResult.payload
    };
  }

  /**
   * Fallback SVG when generation fails
   */
  _fallbackSVG(prefix, data) {
    const short = typeof data === 'string' ? data.slice(0, 20) : 'N/A';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="50" viewBox="0 0 150 50">
      <rect width="150" height="50" fill="#f0f0f0" rx="4"/>
      <text x="75" y="25" text-anchor="middle" font-family="monospace" font-size="10" fill="#333">
        ${prefix}: ${short}
      </text>
    </svg>`;
  }
}

module.exports = new QRService();
