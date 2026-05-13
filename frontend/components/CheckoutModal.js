import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../theme';
import MobileMoneyPayment from './MobileMoneyPayment';
import MobilePaymentFlow from './MobilePaymentFlow';
import PendingVerifications from './PendingVerifications';
import BarcodeScanner from './BarcodeScanner';
import BarcodeDisplay from './BarcodeDisplay';
import QRCodeDisplay from './QRCodeDisplay';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: '💵' },
  { id: 'card', label: 'Card', icon: '💳' },
  { id: 'mobile', label: 'Mobile', icon: '📱' },
  { id: 'orange_money', label: 'Orange Money', icon: '🍊' },
  { id: 'mtn_money', label: 'MTN Mobile Money', icon: '📱' },
];

export default function CheckoutModal({ visible, onClose, cart, onCheckoutComplete, onTransactionHold, onTransactionHeld, onNewTransaction, heldCount = 0, resumeTransactionId = null, initiatedBy = null }) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const isMobileMoney = paymentMethod === 'orange_money' || paymentMethod === 'mtn_money';
  const [processing, setProcessing] = useState(false);
  const [checkoutErrorCount, setCheckoutErrorCount] = useState(0);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [validatingDiscount, setValidatingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState('');
  const [mobileMoneyData, setMobileMoneyData] = useState(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // ── Mobile Payment Flow States (Orange Money / MTN) ──
  const [showMobilePaymentFlow, setShowMobilePaymentFlow] = useState(false);
  const [mobilePaymentTransactionRef, setMobilePaymentTransactionRef] = useState(null);
  const [mobilePaymentVerifiedData, setMobilePaymentVerifiedData] = useState(null);
  const [showPendingVerifications, setShowPendingVerifications] = useState(false);

  // ── Smart Payment Workflow States ──
  const [paymentStep, setPaymentStep] = useState('review'); // review | processing | success | onHold
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [optInMarketing, setOptInMarketing] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  // ── Fatal Error State (circuit breaker for infinite retry loops) ──
  const [fatalErrorMessage, setFatalErrorMessage] = useState('');

  // ── Transaction State Machine ──
  const [currentTransactionId, setCurrentTransactionId] = useState(null);
  const [holdData, setHoldData] = useState(null); // { transaction, message }

  // ── Receipt Preview States ──
  const [receiptQrSvg, setReceiptQrSvg] = useState('');
  const [receiptBarSvg, setReceiptBarSvg] = useState('');
  const [receiptPayload, setReceiptPayload] = useState(null);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
      // Reset state on open
      setDiscountCode('');
      setAppliedDiscount(null);
      setDiscountError('');
      setMobileMoneyData(null);
      setMobilePaymentTransactionRef(null);
      setMobilePaymentVerifiedData(null);
      setShowMobilePaymentFlow(false);
      setShowPendingVerifications(false);
      setPaymentMethod('cash');
      setPaymentStep('review');
      setCustomerPhone('');
      setCustomerName('');
      setOptInMarketing(false);
      setShowCustomerForm(false);
      setPaymentSuccessData(null);
      setCheckoutErrorCount(0);
      setFatalErrorMessage('');
    } else {
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      successScale.setValue(0);
      setPaymentStep('review');
    }
  }, [visible]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const discountAmount = appliedDiscount
    ? appliedDiscount.type === 'percentage'
      ? Math.min(subtotal * (appliedDiscount.value / 100), appliedDiscount.maxDiscount || Infinity)
      : appliedDiscount.type === 'fixed'
        ? Math.min(appliedDiscount.value, subtotal)
        : 0
    : 0;
  const total = Math.max(0, subtotal + tax - discountAmount);

  const handleValidateDiscount = async () => {
    if (!discountCode.trim()) return;
    setValidatingDiscount(true);
    setDiscountError('');
    setAppliedDiscount(null);
    try {
      const API_URL = Platform.OS === 'web'
        ? 'http://localhost:5001'
        : 'http://10.0.2.2:5001';

      const response = await fetch(`${API_URL}/api/discounts/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: discountCode.trim().toUpperCase(),
          orderTotal: subtotal,
          items: cart.map(item => ({
            menuItem: item._id,
            category: item.category,
          })),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Invalid discount code');
      }

      const data = await response.json();
      setAppliedDiscount(data.discount);
      setDiscountError('');
    } catch (error) {
      setDiscountError(error.message);
      setAppliedDiscount(null);
    } finally {
      setValidatingDiscount(false);
    }
  };

  const handleCouponFromScanner = (discount) => {
    setDiscountCode(discount.code);
    setAppliedDiscount(discount);
    setDiscountError('');
  };

  const handleMobileMoneySuccess = (data) => {
    setMobileMoneyData(data);
  };

  // ── Mobile Payment Flow (Orange Money / MTN) Handlers ──
  const handleMobilePaymentVerified = (paymentData) => {
    // Called when MobilePaymentFlow completes agent verification
    setMobilePaymentVerifiedData(paymentData);
    setMobilePaymentTransactionRef(paymentData.transactionRef);
    setShowMobilePaymentFlow(false);
    // Store the mobile money data for order creation
    setMobileMoneyData({
      provider: paymentData.provider,
      phone: paymentData.phone,
      transactionId: paymentData.transactionRef,
      initiationMode: paymentData.initiationMode,
      verifiedBy: paymentData.verifiedBy?._id || paymentData.verifiedBy,
    });
  };

  // ── API URL helper ──
  const getApiUrl = () => Platform.OS === 'web'
    ? 'http://localhost:5001'
    : 'http://10.0.2.2:5001';

  // ── Transaction State Machine: Smart Payment Workflow ──
  // Core Principle: A stuck or pending transaction must never block the register.
  // Only PAYMENT_IN_PROGRESS locks the register; ON_HOLD immediately releases it.
  const handleCheckout = async () => {
    setPaymentStep('processing');
    setProcessing(true);
    const API_URL = getApiUrl();

    try {
      // ── Build payment payload for the orchestrator ──
      const paymentPayload = {
        items: cart.map(item => ({
          _id: item._id,
          menuItem: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
        })),
        paymentMethod,
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        total: Math.round(total * 100) / 100,
        registerId: 'default',
        // ── Discount ──
        ...(appliedDiscount && {
          appliedDiscount: {
            code: appliedDiscount.code,
            type: appliedDiscount.type,
          },
          discountCode: appliedDiscount.code,
          discountAmount: Math.round(discountAmount * 100) / 100,
          discountType: appliedDiscount.type,
        }),
        // ── Mobile Money ──
        ...(isMobileMoney && mobileMoneyData && {
          isMobileMoney: true,
          mobileMoneyData: {
            provider: mobileMoneyData.provider,
            phone: mobileMoneyData.phone,
            transactionId: mobileMoneyData.transactionId,
            initiationMode: mobileMoneyData.initiationMode || 'cashier_initiated',
            verifiedBy: mobileMoneyData.verifiedBy,
          },
        }),
        // ── Customer / Marketing ──
        ...(customerPhone.trim() && { customerPhone: customerPhone.trim() }),
        ...(customerName.trim() && { customerName: customerName.trim() }),
        optInMarketing,
      };

      // ── Call the orchestrator (handles all 5 steps in one request) ──
      const orchestratorRes = await fetch(`${API_URL}/api/orchestrator/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentPayload),
      });

      const orchestratorData = await orchestratorRes.json();

      // ── Handle circuit breaker open ──
      if (orchestratorData.circuitBreakerOpen) {
        setPaymentStep('review');
        Alert.alert(
          'Service Unavailable',
          'Payment service is temporarily unavailable due to high error rate. Please try again in a moment.'
        );
        setProcessing(false);
        return;
      }

      // ── Handle register lock conflict ──
      if (orchestratorData.registerLocked || orchestratorData.step === 'register_lock') {
        setPaymentStep('review');
        Alert.alert(
          'Register Locked',
          orchestratorData.error || 'Another payment is in progress. Please wait or cancel the active transaction.'
        );
        setProcessing(false);
        return;
      }

      // ── Handle validation errors ──
      if (!orchestratorRes.ok && orchestratorData.step === 'validation') {
        throw new Error(orchestratorData.errors?.join(', ') || 'Invalid payment data');
      }

      if (!orchestratorRes.ok) {
        throw new Error(orchestratorData.error || 'Payment orchestration failed');
      }

      if (!orchestratorData.success) {
        throw new Error(orchestratorData.error || 'Payment failed');
      }

      const { transaction, order } = orchestratorData;
      const orderId = order?._id;

      // ── Animate Success ──
      setPaymentSuccessData(order);
      setPaymentStep('success');
      Animated.spring(successScale, {
        toValue: 1,
        damping: 12,
        stiffness: 150,
        useNativeDriver: true,
      }).start();

      // ── Fetch receipt visuals (QR + barcode) for inline preview ──
      if (orderId) {
        fetch(`${API_URL}/api/payments/qr-code/receipt/${orderId}/full`)
          .then(r => r.json())
          .then(data => {
            if (data.qrSvg) setReceiptQrSvg(data.qrSvg);
            if (data.barSvg) setReceiptBarSvg(data.barSvg);
            if (data.payload) setReceiptPayload(data.payload);
          })
          .catch(() => {});
      }
    } catch (error) {
      console.error('[Checkout] Checkout failed:', error.message, error);
      // Track consecutive errors to break infinite retry cycles
      const newErrorCount = checkoutErrorCount + 1;
      setCheckoutErrorCount(newErrorCount);

      // ── If too many consecutive errors, show a fatal error screen ──
      if (newErrorCount >= 3) {
        setPaymentStep('fatalError');
        setFatalErrorMessage(
          `Checkout failed ${newErrorCount} times in a row.\n\nLast error: ${error.message}\n\nPlease close and try again.`
        );
      } else {
        setPaymentStep('review');
        Alert.alert('Checkout Error', error.message);
      }
    } finally {
      setProcessing(false);
    }
  };

  // ── Place a stuck transaction on hold (force release register) ──
  const handleForceHold = async () => {
    const API_URL = getApiUrl();
    const tx = holdData?.transaction;
    if (!tx?._id) {
      setHoldData(null);
      setPaymentStep('review');
      return;
    }
    try {
      await fetch(`${API_URL}/api/transactions/${tx._id}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'User forced hold - register was locked',
          errorCode: 'FORCE_HOLD',
        }),
      });
      // Notify parent that a transaction was held
      if (onTransactionHeld) {
        onTransactionHeld(tx);
      }
    } catch (e) {
      // Non-critical
    }
    setHoldData(null);
    setPaymentStep('review');
  };

  // ── Cancel a stuck transaction ──
  const handleCancelStuckTransaction = async () => {
    const API_URL = getApiUrl();
    const tx = holdData?.transaction;
    if (!tx?._id) {
      setHoldData(null);
      setPaymentStep('review');
      return;
    }
    try {
      await fetch(`${API_URL}/api/transactions/${tx._id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'User cancelled stuck transaction',
          errorCode: 'USER_CANCELLED',
        }),
      });
    } catch (e) {
      // Non-critical
    }
    setHoldData(null);
    setPaymentStep('review');
  };

  // ── Resume an ON_HOLD transaction ──
  const handleResumeTransaction = async () => {
    const API_URL = getApiUrl();
    const tx = holdData?.transaction;
    if (!tx?._id) {
      setHoldData(null);
      setPaymentStep('review');
      return;
    }
    try {
      // Resume: ON_HOLD → PAYMENT_IN_PROGRESS (with gateway verification)
      const resumeRes = await fetch(`${API_URL}/api/transactions/${tx._id}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!resumeRes.ok) {
        const err = await resumeRes.json();
        Alert.alert('Resume Failed', err.error || 'Could not resume transaction');
        return;
      }

      const { transaction } = await resumeRes.json();
      setCurrentTransactionId(transaction._id);
      setHoldData(null);
      setPaymentStep('review');
      Alert.alert('Transaction Resumed', 'The register is now available. You may retry payment.');
    } catch (e) {
      Alert.alert('Error', 'Failed to resume transaction');
    }
  };

  // ── Manual Hold: pause this transaction and start a new one ──
  const handleManualHold = async () => {
    const API_URL = getApiUrl();
    try {
      // Build orderData from current cart — this is how we persist cart items
      const orderData = {
        items: cart.map(item => ({
          _id: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
        })),
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        total: Math.round(total * 100) / 100,
        ...(appliedDiscount && {
          discountCode: appliedDiscount.code,
          discountAmount: Math.round(discountAmount * 100) / 100,
          discountType: appliedDiscount.type,
        }),
        customerPhone: customerPhone.trim() || '',
        customerName: customerName.trim() || '',
        optInMarketing,
      };

      // 1. Initialize a transaction (state: NEW)
      const initRes = await fetch(`${API_URL}/api/transactions/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registerId: 'default',
          customerPhone: customerPhone.trim() || '',
          customerName: customerName.trim() || '',
          optInMarketing,
        }),
      });

      if (!initRes.ok) {
        const errData = await initRes.json();
        // If register is locked (409), try to force-create anyway
        // The hold endpoint will transition NEW → ON_HOLD regardless
        if (initRes.status === 409) {
          // Register is locked — we can still create a held transaction
          // by using a different approach: save the cart data directly
          // and let the user resume later when register is free
          Alert.alert(
            'Register Busy',
            'The register is currently processing a payment. ' +
            'Please resume or cancel the active transaction first, ' +
            'or use the Held Transactions panel to manage existing holds.',
            [{ text: 'OK' }]
          );
          return;
        }
        Alert.alert('Hold Failed', errData.error || 'Could not initialize transaction for hold');
        return;
      }

      const { transaction } = await initRes.json();

      // 2. Place it ON_HOLD immediately with cart data
      const holdRes = await fetch(`${API_URL}/api/transactions/${transaction._id}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'User manually held transaction',
          errorCode: 'MANUAL_HOLD',
          orderData, // Save cart items with the held transaction
        }),
      });

      if (!holdRes.ok) {
        const errData = await holdRes.json();
        Alert.alert('Hold Failed', errData.error || 'Could not place transaction on hold');
        return;
      }

      const holdResult = await holdRes.json();

      // 3. Add to held transactions list in App.js
      if (onTransactionHeld) {
        onTransactionHeld(holdResult.transaction);
      }

      // 4. Close the modal and clear the cart
      onClose();
      if (onNewTransaction) {
        onNewTransaction();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to hold transaction: ' + e.message);
    }
  };

  // ── Print receipt directly (no browser dialogs) ──
  const handlePrintReceipt = () => {
    const order = paymentSuccessData;
    if (!order) return;
    const receiptData = order.order || order;
    const { receiptNumber, items, subtotal, tax, total, paymentMethod: pm, discountCode, discountAmount, mobileMoneyProvider } = receiptData;
    const date = new Date(receiptData.createdAt).toLocaleString();

    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt ${receiptNumber}</title>
            <style>
              body { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 20px; color: #333; }
              h1 { text-align: center; font-size: 18px; margin-bottom: 5px; }
              .header { text-align: center; margin-bottom: 20px; font-size: 12px; }
              .divider { border-top: 1px dashed #333; margin: 10px 0; }
              .item { display: flex; justify-content: space-between; font-size: 13px; margin: 4px 0; }
              .item-left { display: flex; }
              .qty { min-width: 30px; }
              .total-row { display: flex; justify-content: space-between; font-size: 13px; margin: 2px 0; }
              .grand-total { font-weight: bold; font-size: 16px; border-top: 1px solid #333; padding-top: 5px; margin-top: 5px; }
              .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #666; }
              .receipt-no { text-align: center; font-size: 12px; margin-bottom: 5px; }
              .payment { text-align: center; font-size: 12px; margin: 5px 0; }
              .barcode-section { text-align: center; margin: 15px 0; }
              .barcode-section svg { max-width: 260px; height: auto; }
              .qr-section { text-align: center; margin: 10px 0; }
              .qr-section svg { max-width: 100px; height: auto; }
              .qr-label { font-size: 9px; color: #999; margin-top: 2px; }
            </style>
          </head>
          <body>
            <h1>POS System</h1>
            <div class="header">123 Main Street<br>City, State 12345<br>Tel: (555) 123-4567</div>
            <div class="receipt-no"><strong>${receiptNumber}</strong></div>
            <div class="header">${date}</div>
            <div class="divider"></div>
            ${(items || []).map(item => `
              <div class="item">
                <div class="item-left"><span class="qty">${item.quantity}x</span><span>${item.name}</span></div>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
            <div class="divider"></div>
            <div class="total-row"><span>Subtotal</span><span>$${(subtotal || 0).toFixed(2)}</span></div>
            ${discountAmount > 0 ? `<div class="total-row"><span>Discount (${discountCode})</span><span>-$${discountAmount.toFixed(2)}</span></div>` : ''}
            <div class="total-row"><span>Tax (8%)</span><span>$${(tax || 0).toFixed(2)}</span></div>
            <div class="total-row grand-total"><span>TOTAL</span><span>$${(total || 0).toFixed(2)}</span></div>
            <div class="payment">Payment: ${(pm || '').toUpperCase()}${mobileMoneyProvider ? ` (${mobileMoneyProvider})` : ''}</div>
            <div class="divider"></div>
            <div class="barcode-section">
              ${receiptBarSvg || `<p>Receipt #${receiptNumber}</p>`}
            </div>
            <div class="qr-section">
              ${receiptQrSvg || ''}
              <div class="qr-label">Scan to verify • ${receiptNumber}</div>
            </div>
            <div class="divider"></div>
            <div class="footer">Thank you for your visit!<br>Please come again</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // ── Done: close checkout and return to main menu ──
  const handleDone = () => {
    setPaymentStep('review');
    setShowMobilePaymentFlow(false);
    setMobilePaymentTransactionRef(null);
    setMobilePaymentVerifiedData(null);
    setMobileMoneyData(null);
    setPaymentMethod('cash');
    setDiscountCode('');
    setAppliedDiscount(null);
    setCustomerPhone('');
    setCustomerName('');
    setOptInMarketing(false);
    setShowCustomerForm(false);
    setCurrentTransactionId(null);
    // ── Notify parent to clear cart and close checkout ──
    if (onCheckoutComplete) {
      onCheckoutComplete(paymentSuccessData);
    }
    // ── Close the modal to return to main menu ──
    if (onClose) {
      onClose();
    }
  };

  const slideIn = {
    transform: [{
      translateY: slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [300, 0],
      }),
    }],
  };

  const successAnim = {
    transform: [{ scale: successScale }],
  };

  // ── Render Fatal Error Screen (circuit breaker for infinite retry loops) ──
  if (paymentStep === 'fatalError') {
    return (
      <Modal visible={visible} transparent animationType="none">
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.modal, slideIn]}>
            <View style={styles.handle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(244,67,54,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 32 }}>⚠️</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 8, textAlign: 'center' }}>
                Checkout Unavailable
              </Text>
              <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
                {fatalErrorMessage}
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: '#1a1a2e', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 }}
                onPress={() => {
                  setCheckoutErrorCount(0);
                  setPaymentStep('review');
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ marginTop: 12, paddingVertical: 12, paddingHorizontal: 24 }}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#999', fontSize: 14 }}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  }

  // ── Render On-Hold Screen (Register Locked / Transaction Stuck) ──
  if (paymentStep === 'onHold') {
    const tx = holdData?.transaction || {};
    const txState = tx.state || 'UNKNOWN';
    const txStarted = tx.startedAt ? new Date(tx.startedAt).toLocaleString() : 'N/A';
    const isStuck = txState === 'PAYMENT_IN_PROGRESS';

    return (
      <Modal visible={visible} transparent animationType="none">
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.modal, slideIn]}>
            <View style={styles.handle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* ── Warning Header ── */}
              <View style={styles.holdHeader}>
                <View style={styles.holdIconContainer}>
                  <Text style={styles.holdIcon}>
                    {isStuck ? '🔒' : '⏸️'}
                  </Text>
                </View>
                <Text style={styles.holdTitle}>
                  {isStuck ? 'Register Locked' : 'Transaction On Hold'}
                </Text>
                <Text style={styles.holdMessage}>
                  {holdData?.message || 'A transaction is currently blocking the register.'}
                </Text>
              </View>

              {/* ── Transaction Details ── */}
              <View style={styles.holdDetailsCard}>
                <View style={styles.holdDetailRow}>
                  <Text style={styles.holdDetailLabel}>Transaction ID</Text>
                  <Text style={styles.holdDetailValue} numberOfLines={1}>{tx._id || 'N/A'}</Text>
                </View>
                <View style={styles.holdDetailRow}>
                  <Text style={styles.holdDetailLabel}>Current State</Text>
                  <View style={[styles.holdStateBadge, {
                    backgroundColor: isStuck ? 'rgba(244,67,54,0.15)' : 'rgba(255,152,0,0.15)',
                    borderColor: isStuck ? '#F44336' : '#FF9800',
                  }]}>
                    <Text style={[styles.holdStateText, {
                      color: isStuck ? '#F44336' : '#FF9800',
                    }]}>{txState}</Text>
                  </View>
                </View>
                <View style={styles.holdDetailRow}>
                  <Text style={styles.holdDetailLabel}>Started At</Text>
                  <Text style={styles.holdDetailValue}>{txStarted}</Text>
                </View>
              </View>

              {/* ── Core Principle Reminder ── */}
              <View style={styles.holdPrincipleCard}>
                <Text style={styles.holdPrincipleIcon}>⚡</Text>
                <Text style={styles.holdPrincipleText}>
                  {isStuck
                    ? 'A stuck or pending transaction must never block the register.'
                    : 'This transaction has been saved. You can resume it later from the held transactions panel.'}
                  {'\n'}The register is now free to process a new transaction.
                </Text>
              </View>

              {/* ── Held Transaction Count ── */}
              {heldCount > 0 && (
                <View style={styles.holdHeldCountBanner}>
                  <Text style={styles.holdHeldCountIcon}>⏸</Text>
                  <Text style={styles.holdHeldCountText}>
                    You have {heldCount} held transaction{heldCount > 1 ? 's' : ''} saved.
                  </Text>
                </View>
              )}

              {/* ── Actions ── */}
              <View style={styles.holdActions}>
                {isStuck ? (
                  <>
                    <TouchableOpacity
                      style={styles.holdForceBtn}
                      onPress={handleForceHold}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.holdForceBtnText}>🔓 Force Release Register</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.holdCancelBtn}
                      onPress={handleCancelStuckTransaction}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.holdCancelBtnText}>✕ Cancel Transaction</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.holdResumeBtn}
                      onPress={handleResumeTransaction}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.holdResumeBtnText}>▶️ Resume Transaction</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.holdCancelBtn}
                      onPress={handleCancelStuckTransaction}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.holdCancelBtnText}>✕ Cancel & Start Fresh</Text>
                    </TouchableOpacity>
                  </>
                )}
                {/* ── Start a brand new transaction (clear cart, close checkout) ── */}
                <TouchableOpacity
                  style={styles.holdNewTxBtn}
                  onPress={() => {
                    setHoldData(null);
                    setPaymentStep('review');
                    // Notify parent to clear cart and close checkout
                    if (onTransactionHeld && tx._id) {
                      onTransactionHeld(tx);
                    }
                    onClose();
                    if (onNewTransaction) {
                      onNewTransaction();
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.holdNewTxBtnText}>🆕 Start New Transaction</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.holdDismissBtn}
                  onPress={() => {
                    setHoldData(null);
                    setPaymentStep('review');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.holdDismissBtnText}>Back to Checkout (same cart)</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  }

  // ── Render Payment Success Screen (Realistic Receipt Preview) ──
  if (paymentStep === 'success') {
    const receiptData = paymentSuccessData?.order || paymentSuccessData || {};
    const { receiptNumber, items, subtotal, tax, total, paymentMethod: pm, discountCode, discountAmount, mobileMoneyProvider } = receiptData;
    const date = new Date(receiptData.createdAt).toLocaleString();
    const storeName = "FLAVOR HAVEN BISTRO";
    const storeAddr = "123 Main Street, City, State 12345";
    const storePhone = "Tel: (555) 123-4567";
    const storeEmail = "info@flavorhaven.com";
    const cashierName = "Sarah Johnson";
    const receiptWidth = 280;

    return (
      <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.modal, slideIn]}>
            <View style={styles.receiptPreviewContainer}>
              {/* ── Success Header ── */}
              <View style={styles.receiptPreviewHeader}>
                <Animated.View style={[styles.receiptPreviewIcon, successAnim]}>
                  <Text style={styles.receiptPreviewIconText}>✅</Text>
                </Animated.View>
                <Text style={styles.receiptPreviewTitle}>Payment Successful!</Text>
                <Text style={styles.receiptPreviewAmount}>
                  ${(total || 0).toFixed(2)}
                </Text>
              </View>

              {/* ── Realistic Thermal Receipt Preview ── */}
              <ScrollView style={styles.receiptPreviewBody} showsVerticalScrollIndicator={false}>
                {/* ── Store Header (Thermal Style) ── */}
                <View style={styles.rpStoreHeader}>
                  <Text style={styles.rpStoreName}>{storeName}</Text>
                  <View style={styles.rpDividerLight} />
                  <Text style={styles.rpStoreInfo}>{storeAddr}</Text>
                  <Text style={styles.rpStoreInfo}>{storePhone}</Text>
                  <Text style={styles.rpStoreInfo}>{storeEmail}</Text>
                </View>

                <View style={styles.rpDividerDashed} />

                {/* ── Receipt Meta ── */}
                <View style={styles.rpMeta}>
                  <View style={styles.rpMetaRow}>
                    <Text style={styles.rpMetaLabel}>Receipt #</Text>
                    <Text style={styles.rpMetaValue}>{receiptNumber || 'N/A'}</Text>
                  </View>
                  <View style={styles.rpMetaRow}>
                    <Text style={styles.rpMetaLabel}>Date</Text>
                    <Text style={styles.rpMetaValue}>{date}</Text>
                  </View>
                  <View style={styles.rpMetaRow}>
                    <Text style={styles.rpMetaLabel}>Cashier</Text>
                    <Text style={styles.rpMetaValue}>{cashierName}</Text>
                  </View>
                  <View style={styles.rpMetaRow}>
                    <Text style={styles.rpMetaLabel}>Payment</Text>
                    <Text style={styles.rpMetaValue}>
                      {(pm || '').toUpperCase()}
                      {mobileMoneyProvider ? ` (${mobileMoneyProvider})` : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.rpDividerDashed} />

                {/* ── Column Headers ── */}
                <View style={styles.rpColHeader}>
                  <Text style={styles.rpColHeaderItem}>ITEM</Text>
                  <Text style={styles.rpColHeaderQty}>QTY</Text>
                  <Text style={styles.rpColHeaderPrice}>AMOUNT</Text>
                </View>

                <View style={styles.rpDividerLight} />

                {/* ── Items ── */}
                {(items || []).map((item, index) => {
                  const rpImageUri = item.image
                    ? (item.image.startsWith('/') ? `${getApiUrl()}${item.image}` : item.image)
                    : null;
                  return (
                    <View key={index} style={styles.rpItemRow}>
                      {rpImageUri ? (
                        <Image
                          source={{ uri: rpImageUri }}
                          style={styles.rpItemThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.rpItemThumbPlaceholder}>
                          <Text style={styles.rpItemThumbEmoji}>🍽️</Text>
                        </View>
                      )}
                      <View style={styles.rpItemLeft}>
                        <Text style={styles.rpItemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.rpItemUnitPrice}>@ ${(item.price || 0).toFixed(2)}</Text>
                      </View>
                      <Text style={styles.rpItemQty}>{item.quantity}</Text>
                      <Text style={styles.rpItemPrice}>
                        ${((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                      </Text>
                    </View>
                  );
                })}

                <View style={styles.rpDividerDashed} />

                {/* ── Totals ── */}
                <View style={styles.rpTotalRow}>
                  <Text style={styles.rpTotalLabel}>SUBTOTAL</Text>
                  <Text style={styles.rpTotalValue}>${(subtotal || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.rpTotalRow}>
                  <Text style={styles.rpTotalLabel}>TAX (8%)</Text>
                  <Text style={styles.rpTotalValue}>${(tax || 0).toFixed(2)}</Text>
                </View>
                {discountAmount > 0 && (
                  <View style={styles.rpTotalRow}>
                    <Text style={[styles.rpTotalLabel, { color: '#2e7d32' }]}>DISCOUNT ({discountCode})</Text>
                    <Text style={[styles.rpTotalValue, { color: '#2e7d32' }]}>-${discountAmount.toFixed(2)}</Text>
                  </View>
                )}
                <View style={styles.rpDividerThick} />
                <View style={[styles.rpTotalRow, styles.rpGrandTotal]}>
                  <Text style={styles.rpGrandTotalLabel}>TOTAL DUE</Text>
                  <Text style={styles.rpGrandTotalValue}>${(total || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.rpDividerThick} />

                {/* ── Amount Paid Summary ── */}
                <View style={styles.rpTotalRow}>
                  <Text style={styles.rpTotalLabel}>AMOUNT PAID</Text>
                  <Text style={[styles.rpTotalValue, { fontWeight: '700', color: '#2e7d32' }]}>${(total || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.rpTotalRow}>
                  <Text style={styles.rpTotalLabel}>CHANGE</Text>
                  <Text style={styles.rpTotalValue}>$0.00</Text>
                </View>

                {/* ── Customer Info ── */}
                {customerPhone.trim() ? (
                  <>
                    <View style={styles.rpDividerDashed} />
                    <View style={styles.rpCustomerInfo}>
                      <Text style={styles.rpCustomerLabel}>Customer</Text>
                      <Text style={styles.rpCustomerText}>
                        {customerName || customerPhone}
                      </Text>
                      {optInMarketing && (
                        <Text style={styles.rpCustomerOptIn}>✓ Marketing opt-in</Text>
                      )}
                    </View>
                  </>
                ) : null}

                <View style={styles.rpDividerDashed} />

                {/* ── Barcode ── */}
                {receiptBarSvg ? (
                  <View style={styles.rpBarcodeSection}>
                    <BarcodeDisplay svg={receiptBarSvg} code={receiptNumber} width={220} height={45} />
                  </View>
                ) : (
                  <View style={styles.rpBarcodeSection}>
                    <Text style={styles.rpBarcodePlaceholder}>|| ||| || ||||| ||| ||</Text>
                    <Text style={styles.rpBarcodeNumber}>{receiptNumber}</Text>
                  </View>
                )}

                {/* ── QR Code ── */}
                {receiptQrSvg ? (
                  <View style={styles.rpQrSection}>
                    <QRCodeDisplay svg={receiptQrSvg} size={80} label={`Scan to verify • ${receiptNumber}`} />
                  </View>
                ) : null}

                {/* ── Smart Payload Info ── */}
                {receiptPayload && (
                  <View style={styles.rpPayloadInfo}>
                    <Text style={styles.rpPayloadText}>
                      Items: {receiptPayload.items} • {receiptPayload.categories?.join(', ')}
                      {receiptPayload.discCode ? ` • Discount: ${receiptPayload.discCode}` : ''}
                    </Text>
                  </View>
                )}

                {/* ── Footer ── */}
                <View style={styles.rpDividerDashed} />
                <View style={styles.rpFooter}>
                  <Text style={styles.rpFooterThankYou}>THANK YOU!</Text>
                  <Text style={styles.rpFooterText}>For dining with us today</Text>
                  <Text style={styles.rpFooterText}>Please come again</Text>
                  <View style={styles.rpDividerLight} />
                  <Text style={styles.rpFooterSmall}>Receipt is valid without signature</Text>
                  <Text style={styles.rpFooterSmall}>Items sold are not returnable</Text>
                  <Text style={styles.rpFooterSmall}>GST: R123456789</Text>
                </View>
              </ScrollView>

              {/* ── Actions ── */}
              <View style={styles.receiptPreviewActions}>
                <TouchableOpacity style={styles.rpPrintBtn} onPress={handlePrintReceipt}>
                  <Text style={styles.rpPrintBtnText}>🖨️ Print Receipt</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rpDoneBtn} onPress={handleDone}>
                  <Text style={styles.rpDoneBtnText}>Done → Main Menu</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.rpHistoryHint}>Receipt saved to order history</Text>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.overlayTouch} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[styles.modal, slideIn]}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>
              {paymentStep === 'processing' ? 'Processing Payment...' : 'Smart Checkout'}
            </Text>

            {/* ── Held Transaction Banner ── */}
            {heldCount > 0 && (
              <View style={styles.heldBanner}>
                <View style={styles.heldBannerIconWrap}>
                  <Text style={styles.heldBannerIcon}>⏸</Text>
                </View>
                <View style={styles.heldBannerContent}>
                  <Text style={styles.heldBannerTitle}>
                    {heldCount} Held Transaction{heldCount > 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.heldBannerText}>
                    Tap the ⏸ icon in the header to resume or review held transactions.
                  </Text>
                </View>
              </View>
            )}


            {paymentStep === 'processing' ? (
              /* ── Processing View ── */
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.processingTitle}>Processing Payment</Text>
                <Text style={styles.processingAmount}>${total.toFixed(2)}</Text>
                <View style={styles.processingSteps}>
                  <View style={styles.processingStep}>
                    <Text style={styles.processingStepIcon}>💳</Text>
                    <Text style={styles.processingStepText}>Authorizing payment...</Text>
                  </View>
                  <View style={styles.processingStep}>
                    <Text style={styles.processingStepIcon}>📝</Text>
                    <Text style={styles.processingStepText}>Creating order...</Text>
                  </View>
                  <View style={styles.processingStep}>
                    <Text style={styles.processingStepIcon}>📦</Text>
                    <Text style={styles.processingStepText}>Updating inventory...</Text>
                  </View>
                  {customerPhone.trim() && (
                    <View style={styles.processingStep}>
                      <Text style={styles.processingStepIcon}>👤</Text>
                      <Text style={styles.processingStepText}>Saving customer info...</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <>
                {/* ── Order Summary ── */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Order Summary</Text>
                  {cart.map((item, index) => {
                    const itemImageUri = item.image
                      ? (item.image.startsWith('/') ? `${getApiUrl()}${item.image}` : item.image)
                      : null;
                    return (
                      <View key={index} style={styles.orderItem}>
                        <View style={styles.orderItemLeft}>
                          {itemImageUri ? (
                            <Image
                              source={{ uri: itemImageUri }}
                              style={styles.orderItemThumb}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.orderItemThumbPlaceholder}>
                              <Text style={styles.orderItemThumbEmoji}>🍽️</Text>
                            </View>
                          )}
                          <Text style={styles.orderItemQty}>{item.quantity}x</Text>
                          <Text style={styles.orderItemName}>{item.name}</Text>
                        </View>
                        <Text style={styles.orderItemPrice}>
                          ${(item.price * item.quantity).toFixed(2)}
                        </Text>
                      </View>
                    );
                  })}
                  <View style={styles.divider} />
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal</Text>
                    <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tax (8%)</Text>
                    <Text style={styles.totalValue}>${tax.toFixed(2)}</Text>
                  </View>
                  {appliedDiscount && (
                    <View style={styles.totalRow}>
                      <Text style={styles.discountLabel}>
                        Discount ({appliedDiscount.code})
                      </Text>
                      <Text style={styles.discountValue}>
                        -${discountAmount.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.totalRow, styles.grandTotal]}>
                    <Text style={styles.grandTotalLabel}>Total</Text>
                    <Text style={styles.grandTotalValue}>${total.toFixed(2)}</Text>
                  </View>
                </View>

                {/* ── Discount Code ── */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Discount Code</Text>
                  <View style={styles.discountRow}>
                    <TextInput
                      style={styles.discountInput}
                      placeholder="Enter code"
                      placeholderTextColor={Colors.textMuted}
                      value={discountCode}
                      onChangeText={(text) => {
                        setDiscountCode(text.toUpperCase());
                        if (appliedDiscount) {
                          setAppliedDiscount(null);
                          setDiscountError('');
                        }
                      }}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.scanBarcodeBtn}
                      onPress={() => setShowBarcodeScanner(true)}
                    >
                      <Text style={styles.scanBarcodeBtnText}>📷</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.validateBtn,
                        (!discountCode.trim() || validatingDiscount) && styles.validateBtnDisabled,
                      ]}
                      onPress={handleValidateDiscount}
                      disabled={!discountCode.trim() || validatingDiscount}
                    >
                      {validatingDiscount ? (
                        <ActivityIndicator size="small" color="#151515" />
                      ) : (
                        <Text style={styles.validateBtnText}>Apply</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {discountError ? (
                    <Text style={styles.discountErrorText}>{discountError}</Text>
                  ) : null}
                  {appliedDiscount ? (
                    <Text style={styles.discountSuccessText}>
                      {appliedDiscount.type === 'percentage'
                        ? `${appliedDiscount.value}% off applied!`
                        : appliedDiscount.type === 'fixed'
                          ? `$${appliedDiscount.value} off applied!`
                          : 'Discount applied!'}
                    </Text>
                  ) : null}
                </View>

                {/* ── Payment Method ── */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Payment Method</Text>
                  <View style={styles.paymentMethods}>
                    {PAYMENT_METHODS.map(method => (
                      <TouchableOpacity
                        key={method.id}
                        style={[
                          styles.paymentMethod,
                          paymentMethod === method.id && styles.paymentMethodActive,
                        ]}
                        onPress={() => {
                          setPaymentMethod(method.id);
                          // Auto-open mobile payment flow when user selects Orange Money or MTN
                          if (method.id === 'orange_money' || method.id === 'mtn_money') {
                            // Small delay to let the UI update first
                            setTimeout(() => setShowMobilePaymentFlow(true), 100);
                          }
                        }}
                      >
                        <Text style={styles.paymentIcon}>{method.icon}</Text>
                        <Text style={[
                          styles.paymentLabel,
                          paymentMethod === method.id && styles.paymentLabelActive,
                        ]}>{method.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* ── Mobile Money Payment Flow (Orange Money / MTN) ── */}
                {(paymentMethod === 'orange_money' || paymentMethod === 'mtn_money') && !mobilePaymentVerifiedData && (
                  <View style={styles.section}>
                    <TouchableOpacity
                      style={styles.mobileMoneyInitBtn}
                      onPress={() => setShowMobilePaymentFlow(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.mobileMoneyInitIcon}>
                        {paymentMethod === 'orange_money' ? '🍊' : '📱'}
                      </Text>
                      <View style={styles.mobileMoneyInitContent}>
                        <Text style={styles.mobileMoneyInitTitle}>
                          {paymentMethod === 'orange_money' ? 'Orange Money' : 'MTN Mobile Money'}
                        </Text>
                        <Text style={styles.mobileMoneyInitDesc}>
                          Tap to start {paymentMethod === 'orange_money' ? 'Orange' : 'MTN'} payment flow
                        </Text>
                      </View>
                      <Text style={styles.mobileMoneyInitArrow}>→</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ── Mobile Payment Flow Modal (inline) ── */}
                {showMobilePaymentFlow && (
                  <MobilePaymentFlow
                    amount={total}
                    transactionId={currentTransactionId}
                    initiatedBy={initiatedBy}
                    onPaymentVerified={handleMobilePaymentVerified}
                    onCancel={() => {
                      setShowMobilePaymentFlow(false);
                      setPaymentMethod('cash');
                    }}
                  />
                )}

                {/* ── Mobile Payment Verified Badge ── */}
                {mobilePaymentVerifiedData && (
                  <View style={styles.section}>
                    <View style={styles.mobileMoneyVerifiedBadge}>
                      <Text style={styles.mobileMoneyVerifiedIcon}>✅</Text>
                      <View style={styles.mobileMoneyVerifiedContent}>
                        <Text style={styles.mobileMoneyVerifiedTitle}>
                          {mobilePaymentVerifiedData.provider === 'orange' ? 'Orange Money' : 'MTN Mobile Money'} Verified
                        </Text>
                        <Text style={styles.mobileMoneyVerifiedDesc}>
                          Ref: {mobilePaymentVerifiedData.transactionRef}
                        </Text>
                        <Text style={styles.mobileMoneyVerifiedDesc}>
                          Phone: {mobilePaymentVerifiedData.phone}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* ── Pending Verifications Panel ── */}
                {initiatedBy && (
                  <View style={styles.section}>
                    <PendingVerifications
                      employeeId={initiatedBy}
                      onVerified={(payment) => {
                        // When agent verifies from the panel, store the data
                        setMobilePaymentVerifiedData(payment);
                        setMobileMoneyData({
                          provider: payment.provider,
                          phone: payment.phone,
                          transactionId: payment.transactionRef,
                          initiationMode: payment.initiationMode,
                          verifiedBy: payment.verifiedBy?._id || payment.verifiedBy,
                        });
                      }}
                    />
                  </View>
                )}

                {/* ── Customer Info / Marketing Opt-In ── */}
                <View style={styles.section}>
                  <TouchableOpacity
                    style={styles.customerToggle}
                    onPress={() => setShowCustomerForm(!showCustomerForm)}
                  >
                    <Text style={styles.customerToggleIcon}>
                      {showCustomerForm ? '▼' : '▶'}
                    </Text>
                    <Text style={styles.customerToggleText}>
                      {showCustomerForm
                        ? 'Hide Customer Info'
                        : '📢 Add Customer for Marketing & Offers'}
                    </Text>
                  </TouchableOpacity>

                  {showCustomerForm && (
                    <View style={styles.customerForm}>
                      <Text style={styles.customerFormHint}>
                        Capture customer details for business advertisement and loyalty rewards.
                      </Text>
                      <TextInput
                        style={styles.customerInput}
                        placeholder="Customer Name (optional)"
                        placeholderTextColor={Colors.textMuted}
                        value={customerName}
                        onChangeText={setCustomerName}
                      />
                      <TextInput
                        style={styles.customerInput}
                        placeholder="📞 Phone Number (for SMS offers)"
                        placeholderTextColor={Colors.textMuted}
                        value={customerPhone}
                        onChangeText={setCustomerPhone}
                        keyboardType="phone-pad"
                      />
                      <TouchableOpacity
                        style={[styles.optInRow, optInMarketing && styles.optInRowActive]}
                        onPress={() => setOptInMarketing(!optInMarketing)}
                      >
                        <View style={[styles.optInCheckbox, optInMarketing && styles.optInCheckboxActive]}>
                          {optInMarketing && <Text style={styles.optInCheckmark}>✓</Text>}
                        </View>
                        <View style={styles.optInContent}>
                          <Text style={styles.optInTitle}>📢 Receive Marketing Offers</Text>
                          <Text style={styles.optInDesc}>
                            Get SMS notifications about promotions, discounts, and special offers
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* ── Smart Payment Breakdown ── */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Payment Breakdown</Text>
                  <View style={styles.breakdownCard}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Subtotal</Text>
                      <Text style={styles.breakdownValue}>${subtotal.toFixed(2)}</Text>
                    </View>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Tax (8%)</Text>
                      <Text style={styles.breakdownValue}>+${tax.toFixed(2)}</Text>
                    </View>
                    {appliedDiscount && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabelDiscount}>Discount</Text>
                        <Text style={styles.breakdownValueDiscount}>-${discountAmount.toFixed(2)}</Text>
                      </View>
                    )}
                    <View style={styles.breakdownDivider} />
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabelTotal}>Total Due</Text>
                      <Text style={styles.breakdownValueTotal}>${total.toFixed(2)}</Text>
                    </View>
                    {customerPhone.trim() && optInMarketing && (
                      <View style={styles.breakdownMarketingBadge}>
                        <Text style={styles.breakdownMarketingText}>
                          🎉 You'll receive exclusive offers via SMS!
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* ── Actions ── */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.checkoutBtn, processing && styles.checkoutBtnDisabled]}
                    onPress={() => {
                      if (isMobileMoney && !mobileMoneyData) {
                        // Mobile money selected but not yet initiated — open the flow
                        setShowMobilePaymentFlow(true);
                      } else {
                        handleCheckout();
                      }
                    }}
                    disabled={processing}
                  >
                    <Text style={styles.checkoutBtnText}>
                      {processing
                        ? 'Processing...'
                        : isMobileMoney
                          ? mobileMoneyData
                            ? `Pay $${total.toFixed(2)}`
                            : 'Start Mobile Payment'
                          : `💳 Pay $${total.toFixed(2)}`}
                    </Text>
                  </TouchableOpacity>
                  {/* ── Manual Hold: pause this transaction and start fresh ── */}
                  <TouchableOpacity
                    style={styles.holdBtn}
                    onPress={handleManualHold}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.holdBtnText}>⏸ Hold & Start New</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onCouponFound={handleCouponFromScanner}
        cartItems={cart}
        orderTotal={subtotal}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  overlayTouch: {
    flex: 1,
  },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  orderItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderItemQty: {
    fontSize: Typography.body.fontSize,
    color: Colors.primary,
    fontWeight: '600',
    marginRight: Spacing.sm,
    minWidth: 24,
  },
  orderItemName: {
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
    flex: 1,
  },
  orderItemPrice: {
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  orderItemThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    marginRight: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
  },
  orderItemThumbPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 6,
    marginRight: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderItemThumbEmoji: {
    fontSize: 16,
    opacity: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  totalLabel: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
  },
  totalValue: {
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
  },
  discountLabel: {
    fontSize: Typography.body.fontSize,
    color: '#4CAF50',
    fontWeight: '600',
  },
  discountValue: {
    fontSize: Typography.body.fontSize,
    color: '#4CAF50',
    fontWeight: '700',
  },
  grandTotal: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  grandTotalLabel: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  grandTotalValue: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.primary,
  },
  discountRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  discountInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    fontWeight: '600',
    letterSpacing: 2,
  },
  scanBarcodeBtn: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scanBarcodeBtnText: {
    fontSize: 20,
  },
  validateBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validateBtnDisabled: {
    opacity: 0.5,
  },
  validateBtnText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: '#151515',
  },
  discountErrorText: {
    fontSize: Typography.caption.fontSize,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  discountSuccessText: {
    fontSize: Typography.caption.fontSize,
    color: '#4CAF50',
    marginTop: Spacing.xs,
    fontWeight: '600',
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  paymentMethod: {
    flex: 1,
    minWidth: 70,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentMethodActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(221, 155, 29, 0.1)',
  },
  paymentIcon: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  paymentLabel: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  paymentLabelActive: {
    color: Colors.primary,
  },
  // ── Customer / Marketing Styles ──
  customerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  customerToggleIcon: {
    fontSize: 12,
    color: Colors.primary,
    marginRight: Spacing.sm,
  },
  customerToggleText: {
    fontSize: Typography.body.fontSize,
    color: Colors.primary,
    fontWeight: '600',
  },
  customerForm: {
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  customerFormHint: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  customerInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  optInRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optInRowActive: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  optInCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  optInCheckboxActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  optInCheckmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  optInContent: {
    flex: 1,
  },
  optInTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  optInDesc: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // ── Smart Payment Breakdown ──
  breakdownCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  breakdownLabel: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
  },
  breakdownValue: {
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
  },
  breakdownLabelDiscount: {
    fontSize: Typography.body.fontSize,
    color: '#4CAF50',
    fontWeight: '600',
  },
  breakdownValueDiscount: {
    fontSize: Typography.body.fontSize,
    color: '#4CAF50',
    fontWeight: '700',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  breakdownLabelTotal: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  breakdownValueTotal: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.primary,
  },
  breakdownMarketingBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  breakdownMarketingText: {
    fontSize: Typography.caption.fontSize,
    color: '#4CAF50',
    fontWeight: '600',
  },
  // ── Processing ──
  processingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  processingTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  processingAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.xl,
  },
  processingSteps: {
    width: '100%',
    gap: Spacing.md,
  },
  processingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  processingStepIcon: {
    fontSize: 20,
    marginRight: Spacing.md,
  },
  processingStepText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
  },
  // ── Receipt Preview (Success Screen) ──
  receiptPreviewContainer: {
    maxHeight: '100%',
  },
  receiptPreviewHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  receiptPreviewIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  receiptPreviewIconText: {
    fontSize: 32,
  },
  receiptPreviewTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  receiptPreviewAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
  },
  receiptPreviewBody: {
    maxHeight: 320,
    paddingHorizontal: Spacing.sm,
  },
  receiptPreviewActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  // ── Receipt Preview Inner Styles (Realistic Thermal Receipt) ──
  rpStoreHeader: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  rpStoreName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  rpStoreInfo: {
    fontSize: 10,
    color: '#555',
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
    lineHeight: 14,
  },
  rpDividerLight: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 4,
    width: '100%',
  },
  rpDividerDashed: {
    height: 1,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: '#aaa',
    borderStyle: 'dashed',
    marginVertical: 6,
    width: '100%',
  },
  rpDividerThick: {
    height: 2,
    backgroundColor: '#333',
    marginVertical: 4,
    width: '100%',
  },
  rpMeta: {
    marginBottom: Spacing.xs,
    paddingHorizontal: 2,
  },
  rpMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  rpMetaLabel: {
    fontSize: 10,
    color: '#666',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
    fontWeight: '600',
  },
  rpMetaValue: {
    fontSize: 10,
    color: '#333',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
  },
  rpColHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  rpColHeaderItem: {
    fontSize: 9,
    fontWeight: '700',
    color: '#444',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
    flex: 1,
  },
  rpColHeaderQty: {
    fontSize: 9,
    fontWeight: '700',
    color: '#444',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
    width: 30,
    textAlign: 'center',
  },
  rpColHeaderPrice: {
    fontSize: 9,
    fontWeight: '700',
    color: '#444',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
    width: 65,
    textAlign: 'right',
  },
  rpReceiptNo: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  rpDate: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
  },
  rpDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  rpItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  rpItemThumb: {
    width: 28,
    height: 28,
    borderRadius: 4,
    marginRight: 6,
    backgroundColor: '#f0f0f0',
  },
  rpItemThumbPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 4,
    marginRight: 6,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rpItemThumbEmoji: {
    fontSize: 12,
    opacity: 0.4,
  },
  rpItemLeft: {
    flex: 1,
    flexDirection: 'column',
  },
  rpItemName: {
    fontSize: 11,
    color: '#333',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
    fontWeight: '600',
  },
  rpItemUnitPrice: {
    fontSize: 9,
    color: '#888',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
    marginTop: 1,
  },
  rpItemQty: {
    fontSize: 11,
    color: '#555',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
    width: 30,
    textAlign: 'center',
  },
  rpItemPrice: {
    fontSize: 11,
    color: '#333',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
    fontWeight: '700',
    width: 65,
    textAlign: 'right',
  },
  rpTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  rpTotalLabel: {
    fontSize: 11,
    color: '#555',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
    fontWeight: '600',
  },
  rpTotalValue: {
    fontSize: 11,
    color: '#333',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
    fontWeight: '600',
  },
  rpGrandTotal: {
    marginTop: 2,
    paddingTop: 4,
  },
  rpGrandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
    letterSpacing: 1,
  },
  rpGrandTotalValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
  },
  rpPaymentInfo: {
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  rpPaymentText: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
  },
  rpCustomerInfo: {
    paddingHorizontal: 2,
    marginTop: 2,
  },
  rpCustomerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
  },
  rpCustomerText: {
    fontSize: 10,
    color: '#333',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
    fontWeight: '600',
  },
  rpCustomerOptIn: {
    fontSize: 9,
    color: '#2e7d32',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
    marginTop: 1,
  },
  rpBarcodeSection: {
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  rpBarcodePlaceholder: {
    fontSize: 24,
    color: '#333',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
    letterSpacing: 3,
    fontWeight: '700',
  },
  rpBarcodeNumber: {
    fontSize: 10,
    color: '#666',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
    marginTop: 2,
  },
  rpQrSection: {
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  rpPayloadInfo: {
    alignItems: 'center',
    marginTop: 2,
  },
  rpPayloadText: {
    fontSize: 9,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  rpFooter: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  rpFooterThankYou: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
    letterSpacing: 2,
    marginBottom: 4,
  },
  rpFooterText: {
    fontSize: 10,
    color: '#555',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
    lineHeight: 14,
  },
  rpFooterSmall: {
    fontSize: 8,
    color: '#999',
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
    lineHeight: 12,
  },
  rpPrintBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  rpPrintBtnText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: '#151515',
  },
  rpDoneBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  rpDoneBtnText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: '#151515',
  },
  rpHistoryHint: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  // ── Actions ──
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  checkoutBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  checkoutBtnDisabled: {
    opacity: 0.6,
  },
  checkoutBtnText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: '#151515',
  },
  holdBtn: {
    backgroundColor: 'rgba(255,152,0,0.12)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.3)',
    padding: Spacing.md,
    alignItems: 'center',
  },
  holdBtnText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: '#FF9800',
  },
  cancelBtn: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
  },

  // ── On-Hold Screen Styles ──
  holdHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  holdIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,152,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  holdIcon: {
    fontSize: 36,
  },
  holdTitle: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  holdMessage: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  holdDetailsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  holdDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  holdDetailLabel: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    flex: 1,
  },
  holdDetailValue: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  holdStateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  holdStateText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  holdPrincipleCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(33,150,243,0.08)',
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(33,150,243,0.2)',
    alignItems: 'flex-start',
  },
  holdPrincipleIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  holdPrincipleText: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  holdActions: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: 10,
  },
  holdForceBtn: {
    backgroundColor: '#F44336',
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  holdForceBtnText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  holdResumeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  holdResumeBtnText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: '#151515',
  },
  holdCancelBtn: {
    backgroundColor: 'rgba(244,67,54,0.1)',
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.3)',
  },
  holdCancelBtnText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: '#F44336',
  },
  holdDismissBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  holdDismissBtnText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
  },
  holdHeldCountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33,150,243,0.1)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(33,150,243,0.25)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  holdHeldCountIcon: {
    fontSize: 14,
    marginRight: Spacing.sm,
  },
  holdHeldCountText: {
    fontSize: Typography.caption.fontSize,
    color: '#2196F3',
    fontWeight: '600',
    flex: 1,
  },
  holdNewTxBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  holdNewTxBtnText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heldBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,152,0,0.12)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.3)',
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  heldBannerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,152,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: 0,
  },
  heldBannerIcon: {
    fontSize: 16,
  },
  heldBannerContent: {
    flex: 1,
  },
  heldBannerTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: '#FF9800',
    marginBottom: 2,
  },
  heldBannerText: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // ── Mobile Money Initiation Button ──
  mobileMoneyInitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  mobileMoneyInitIcon: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  mobileMoneyInitContent: {
    flex: 1,
  },
  mobileMoneyInitTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  mobileMoneyInitDesc: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
  },
  mobileMoneyInitArrow: {
    fontSize: 20,
    color: Colors.textMuted,
    marginLeft: Spacing.sm,
  },

  // ── Mobile Money Verified Badge ──
  mobileMoneyVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.1)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  mobileMoneyVerifiedIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  mobileMoneyVerifiedContent: {
    flex: 1,
  },
  mobileMoneyVerifiedTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: 2,
  },
  mobileMoneyVerifiedDesc: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
  },
});
