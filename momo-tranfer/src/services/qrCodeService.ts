import QRCode from 'qrcode';

export interface PaymentInfo {
  recipientPhone: string;
  recipientName?: string;
  amount?: number;
  currency?: string;
  reference?: string;
  timestamp: number;
  country?: string;
  provider?: string;
}

export interface QRPaymentData {
  type: 'MOMO_PAYMENT';
  version: '1.0';
  data: PaymentInfo;
}

export class QRCodeService {
  /**
   * Generate QR code for payment information
   */
  static async generatePaymentQR(paymentInfo: PaymentInfo): Promise<string> {
    const qrData: QRPaymentData = {
      type: 'MOMO_PAYMENT',
      version: '1.0',
      data: {
        ...paymentInfo,
        timestamp: Date.now()
      }
    };

    try {
      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 300,
        margin: 2,
        color: {
          dark: '#1E40AF', // Blue color to match theme
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Parse QR code data
   */
  static parsePaymentQR(qrData: string): PaymentInfo | null {
    try {
      const parsed = JSON.parse(qrData) as QRPaymentData;
      
      if (parsed.type === 'MOMO_PAYMENT' && parsed.data) {
        return parsed.data;
      }
    } catch (error) {
      console.warn('Error parsing QR data:', error);
    }
    return null;
  }

  /**
   * Generate QR code for receiving money
   */
  static async generateReceiveQR(
    phoneNumber: string, 
    name?: string, 
    amount?: number,
    currency = 'UGX'
  ): Promise<string> {
    const paymentInfo: PaymentInfo = {
      recipientPhone: phoneNumber,
      recipientName: name,
      amount,
      currency,
      timestamp: Date.now()
    };

    return this.generatePaymentQR(paymentInfo);
  }

  /**
   * Generate shareable payment link
   */
  static generatePaymentLink(paymentInfo: PaymentInfo): string {
    const encodedData = encodeURIComponent(JSON.stringify(paymentInfo));
    return `${window.location.origin}/pay?data=${encodedData}`;
  }

  /**
   * Scan QR code from camera
   */
  static async scanQRFromCamera(): Promise<PaymentInfo | null> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera access not supported');
    }

    try {
      // This would typically use a QR scanner library like jsQR
      // For now, we'll return a placeholder implementation
      console.log('QR Scanner would be implemented here');
      return null;
    } catch (error) {
      console.error('Error accessing camera:', error);
      throw new Error('Failed to access camera');
    }
  }

  /**
   * Validate payment QR data
   */
  static validatePaymentData(data: PaymentInfo): boolean {
    if (!data.recipientPhone) return false;
    
    // Check if timestamp is not too old (24 hours)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (Date.now() - data.timestamp > maxAge) return false;

    return true;
  }

  /**
   * Generate smart payment suggestions based on recent transactions
   */
  static generatePaymentSuggestions(recentTransactions: any[]): PaymentInfo[] {
    // This would analyze user's transaction history
    // and suggest frequent contacts/amounts
    return recentTransactions
      .slice(0, 5)
      .map(tx => ({
        recipientPhone: tx.recipientPhone,
        recipientName: tx.recipientName,
        amount: tx.amount,
        currency: tx.currency,
        timestamp: Date.now()
      }));
  }
}