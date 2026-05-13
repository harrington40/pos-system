import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import QRCodeDisplay from './QRCodeDisplay';
import BarcodeDisplay from './BarcodeDisplay';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';

export default function ReceiptView({ visible, onClose, order, autoPrint = false }) {
  const printRef = useRef(null);
  const [qrSvg, setQrSvg] = useState('');
  const [barSvg, setBarSvg] = useState('');
  const [qrPayload, setQrPayload] = useState(null);
  const [hasAutoPrinted, setHasAutoPrinted] = useState(false);

  useEffect(() => {
    if (visible && order?._id) {
      // Fetch full receipt visuals (QR + barcode + smart payload)
      fetch(`${API_URL}/api/payments/qr-code/receipt/${order._id}/full`)
        .then(r => r.json())
        .then(data => {
          if (data.qrSvg) setQrSvg(data.qrSvg);
          if (data.barSvg) setBarSvg(data.barSvg);
          if (data.payload) setQrPayload(data.payload);
        })
        .catch(() => {});
    } else {
      setQrSvg('');
      setBarSvg('');
      setQrPayload(null);
      setHasAutoPrinted(false);
    }
  }, [visible, order]);

  // Auto-print when receipt opens if autoPrint is true
  useEffect(() => {
    if (visible && autoPrint && !hasAutoPrinted && (qrSvg || barSvg)) {
      setHasAutoPrinted(true);
      // Small delay to let SVGs render
      const timer = setTimeout(() => {
        handlePrint();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [visible, autoPrint, hasAutoPrinted, qrSvg, barSvg]);

  if (!order) return null;

  const { receiptNumber, items, subtotal, tax, total, paymentMethod, createdAt, discountCode, discountAmount, discountType, mobileMoneyProvider } = order;
  const date = new Date(createdAt).toLocaleString();
  const storeName = "FLAVOR HAVEN BISTRO";
  const storeAddr = "123 Main Street, City, State 12345";
  const storePhone = "Tel: (555) 123-4567";
  const storeEmail = "info@flavorhaven.com";
  const cashierName = "Sarah Johnson";

  const handlePrint = () => {
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt ${receiptNumber}</title>
            <style>
              @page { margin: 0; }
              body { font-family: 'Courier New', monospace; width: 280px; margin: 0 auto; padding: 15px; color: #222; font-size: 12px; }
              .store-name { text-align: center; font-size: 16px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 2px; }
              .store-info { text-align: center; font-size: 10px; color: #555; line-height: 14px; margin: 0; }
              .dashed { border: none; border-top: 1px dashed #999; margin: 6px 0; }
              .solid { border: none; border-top: 1px solid #ccc; margin: 4px 0; }
              .thick { border: none; border-top: 2px solid #333; margin: 4px 0; }
              .meta-row { display: flex; justify-content: space-between; font-size: 10px; padding: 1px 0; }
              .meta-label { color: #666; font-weight: 600; }
              .meta-value { color: #333; }
              .col-header { display: flex; justify-content: space-between; font-size: 9px; font-weight: 700; color: #444; padding: 2px 0; }
              .col-item { flex: 1; }
              .col-qty { width: 30px; text-align: center; }
              .col-price { width: 65px; text-align: right; }
              .item-row { display: flex; justify-content: space-between; padding: 2px 0; }
              .item-left { flex: 1; }
              .item-name { font-size: 11px; font-weight: 600; color: #333; }
              .item-unit { font-size: 9px; color: #888; }
              .item-qty { width: 30px; text-align: center; font-size: 11px; color: #555; }
              .item-price { width: 65px; text-align: right; font-size: 11px; font-weight: 700; color: #333; }
              .total-row { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
              .total-label { color: #555; font-weight: 600; }
              .total-value { color: #333; font-weight: 600; }
              .grand-total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; padding: 4px 0; }
              .grand-label { color: #1a1a1a; letter-spacing: 1px; }
              .grand-value { color: #1a1a1a; }
              .payment { text-align: center; font-size: 10px; color: #555; margin: 4px 0; }
              .customer { font-size: 10px; color: #333; text-align: center; margin: 2px 0; }
              .customer-label { font-weight: 700; color: #555; }
              .barcode { text-align: center; margin: 8px 0; }
              .barcode-text { font-size: 24px; letter-spacing: 3px; font-weight: 700; color: #333; }
              .barcode-num { font-size: 10px; color: #666; margin-top: 2px; }
              .qr-section { text-align: center; margin: 8px 0; }
              .qr-section svg { max-width: 90px; height: auto; }
              .qr-label { font-size: 8px; color: #999; margin-top: 2px; }
              .footer { text-align: center; margin-top: 10px; }
              .footer-thanks { font-size: 14px; font-weight: 800; letter-spacing: 2px; color: #1a1a1a; margin-bottom: 4px; }
              .footer-text { font-size: 10px; color: #555; line-height: 14px; margin: 0; }
              .footer-small { font-size: 8px; color: #999; line-height: 12px; margin: 0; }
            </style>
          </head>
          <body>
            <div class="store-name">${storeName}</div>
            <hr class="solid">
            <p class="store-info">${storeAddr}<br>${storePhone}<br>${storeEmail}</p>
            <hr class="dashed">
            <div class="meta-row"><span class="meta-label">Receipt #</span><span class="meta-value">${receiptNumber || 'N/A'}</span></div>
            <div class="meta-row"><span class="meta-label">Date</span><span class="meta-value">${date}</span></div>
            <div class="meta-row"><span class="meta-label">Cashier</span><span class="meta-value">${cashierName}</span></div>
            <div class="meta-row"><span class="meta-label">Payment</span><span class="meta-value">${paymentMethod.toUpperCase()}${mobileMoneyProvider ? ' (' + mobileMoneyProvider + ')' : ''}</span></div>
            <hr class="dashed">
            <div class="col-header"><span class="col-item">ITEM</span><span class="col-qty">QTY</span><span class="col-price">AMOUNT</span></div>
            <hr class="solid">
            ${items.map(item => `
              <div class="item-row">
                <div class="item-left">
                  <div class="item-name">${item.name}</div>
                  <div class="item-unit">@ $${(item.price || 0).toFixed(2)}</div>
                </div>
                <div class="item-qty">${item.quantity}</div>
                <div class="item-price">$${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</div>
              </div>
            `).join('')}
            <hr class="dashed">
            <div class="total-row"><span class="total-label">SUBTOTAL</span><span class="total-value">$${(subtotal || 0).toFixed(2)}</span></div>
            <div class="total-row"><span class="total-label">TAX (8%)</span><span class="total-value">$${(tax || 0).toFixed(2)}</span></div>
            ${discountAmount > 0 ? `<div class="total-row"><span class="total-label" style="color:#2e7d32;">DISCOUNT (${discountCode})</span><span class="total-value" style="color:#2e7d32;">-$${discountAmount.toFixed(2)}</span></div>` : ''}
            <hr class="thick">
            <div class="grand-total-row"><span class="grand-label">TOTAL DUE</span><span class="grand-value">$${(total || 0).toFixed(2)}</span></div>
            <hr class="thick">
            <div class="total-row"><span class="total-label">AMOUNT PAID</span><span class="total-value" style="font-weight:700;color:#2e7d32;">$${(total || 0).toFixed(2)}</span></div>
            <div class="total-row"><span class="total-label">CHANGE</span><span class="total-value">$0.00</span></div>
            <hr class="dashed">
            <div class="barcode">
              ${barSvg || '<div class="barcode-text">|||| ||||| ||| ||||</div><div class="barcode-num">' + (receiptNumber || '') + '</div>'}
            </div>
            <div class="qr-section">
              ${qrSvg || ''}
              <div class="qr-label">Scan to verify • ${receiptNumber}</div>
            </div>
            <hr class="dashed">
            <div class="footer">
              <div class="footer-thanks">THANK YOU!</div>
              <p class="footer-text">For dining with us today</p>
              <p class="footer-text">Please come again</p>
              <hr class="solid">
              <p class="footer-small">Receipt is valid without signature</p>
              <p class="footer-small">Items sold are not returnable</p>
              <p class="footer-small">GST: R123456789</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Receipt</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.receipt} ref={printRef}>
            {/* Store Header */}
            <View style={styles.storeHeader}>
              <Text style={styles.storeName}>POS System</Text>
              <Text style={styles.storeInfo}>123 Main Street</Text>
              <Text style={styles.storeInfo}>City, State 12345</Text>
            </View>

            {/* Receipt Number & Date */}
            <View style={styles.receiptMeta}>
              <Text style={styles.receiptNo}>{receiptNumber}</Text>
              <Text style={styles.date}>{date}</Text>
            </View>

            <View style={styles.divider} />

            {/* Items */}
            {items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemQty}>{item.quantity}x</Text>
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}

            <View style={styles.divider} />

            {/* Totals */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
            </View>
            {discountAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: Colors.success }]}>Discount ({discountCode})</Text>
                <Text style={[styles.totalValue, { color: Colors.success }]}>-${discountAmount.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax (8%)</Text>
              <Text style={styles.totalValue}>${tax.toFixed(2)}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text style={styles.grandTotalLabel}>TOTAL</Text>
              <Text style={styles.grandTotalValue}>${total.toFixed(2)}</Text>
            </View>

            {/* Payment */}
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentText}>
                Payment: {paymentMethod.toUpperCase()}
                {mobileMoneyProvider ? ` (${mobileMoneyProvider})` : ''}
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Barcode */}
            <View style={styles.barcodeSection}>
              <BarcodeDisplay svg={barSvg} code={receiptNumber} width={240} height={50} />
            </View>

            {/* QR Code */}
            <View style={styles.qrSection}>
              <QRCodeDisplay svg={qrSvg} size={90} label={`Scan to verify • ${receiptNumber}`} />
            </View>

            {/* Smart Payload Info (if available) */}
            {qrPayload && (
              <View style={styles.payloadInfo}>
                <Text style={styles.payloadText}>
                  Items: {qrPayload.items} • {qrPayload.categories.join(', ')}
                  {qrPayload.discCode ? ` • Discount: ${qrPayload.discCode}` : ''}
                </Text>
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Thank you for your visit!</Text>
              <Text style={styles.footerText}>Please come again</Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
              <Text style={styles.printBtnText}>🖨️ Print Receipt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.historyHint}>Receipt saved to order history</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: '#333',
  },
  closeBtn: {
    fontSize: 20,
    color: '#999',
    padding: 4,
  },
  receipt: {
    padding: Spacing.lg,
    backgroundColor: '#fff',
  },
  storeHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  storeInfo: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
  },
  receiptMeta: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  receiptNo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
  },
  date: {
    fontSize: 11,
    color: '#666',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    borderStyle: 'dashed',
    marginVertical: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemQty: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    minWidth: 28,
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
  },
  itemName: {
    fontSize: 13,
    color: '#333',
    flex: 1,
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
  },
  itemPrice: {
    fontSize: 13,
    color: '#333',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  totalLabel: {
    fontSize: 13,
    color: '#666',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
  },
  totalValue: {
    fontSize: 13,
    color: '#333',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
  },
  grandTotal: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  paymentInfo: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  paymentText: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
  },
  barcodeSection: {
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  qrSection: {
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  payloadInfo: {
    alignItems: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  payloadText: {
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
  },
  actions: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: Spacing.sm,
  },
  printBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  printBtnText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: '#151515',
  },
  doneBtn: {
    padding: Spacing.sm,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: Typography.body.fontSize,
    color: '#666',
  },
  historyHint: {
    textAlign: 'center',
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    marginBottom: 4,
  },
});
