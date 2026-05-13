import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../theme';

// ── Configuration ──
const API_URL = Platform.OS === 'web'
  ? 'http://localhost:5001'
  : 'http://10.0.2.2:5001';

const POLL_INTERVAL = 3000; // Poll every 3 seconds for status updates

const PROVIDERS = [
  { id: 'orange', name: 'Orange Money', color: '#FF7900', icon: '🍊' },
  { id: 'mtn', name: 'MTN Mobile Money', color: '#FFCC00', icon: '📱' },
];

const INITIATION_MODES = [
  { id: 'cashier_initiated', label: 'Cashier Initiated (USSD)', icon: '📲', desc: 'Send payment request to customer phone' },
  { id: 'customer_initiated', label: 'Customer Initiated (QR)', icon: '📷', desc: 'Customer scans QR code to pay' },
];

/**
 * MobilePaymentFlow — Multi-step mobile money payment wizard
 *
 * Props:
 *   amount: number — total amount to charge
 *   transactionId: string — POS transaction ID to link
 *   initiatedBy: string — employee ID who is processing
 *   onPaymentVerified: (paymentData) => void — called when payment is VERIFIED
 *   onCancel: () => void — called when user cancels
 *   style: object — container style override
 */
export default function MobilePaymentFlow({
  amount,
  transactionId,
  initiatedBy,
  onPaymentVerified,
  onCancel,
  style,
}) {
  // ── Step Management ──
  const [step, setStep] = useState('select_mode'); // select_mode | select_provider | enter_phone | initiate | waiting | verify | success | error
  const [initiationMode, setInitiationMode] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [phone, setPhone] = useState('');
  const [transactionRef, setTransactionRef] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [qrSvg, setQrSvg] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentPin, setAgentPin] = useState('');
  const [pinError, setPinError] = useState('');

  // ── Animations ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // ── Polling ref ──
  const pollRef = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 15,
        stiffness: 150,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Phone formatting ──
  const formatPhone = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
  };

  // ── Start polling for payment status ──
  const startPolling = useCallback((ref) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/api/mobile-payments/status/${ref}`);
        const data = await response.json();
        if (data.payment) {
          setPaymentStatus(data.payment);

          if (data.payment.status === 'CONFIRMED') {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setStep('verify');
          } else if (data.payment.status === 'FAILED' || data.payment.status === 'DISPUTED') {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setStep('error');
            setErrorMessage(data.payment.failureReason || 'Payment failed or disputed');
          }
        }
      } catch (err) {
        // Silently retry on network errors
      }
    }, POLL_INTERVAL);
  }, []);

  // ── Step 1: Initiate Payment (Cashier-Initiated / USSD) ──
  const handleInitiateUSSD = async () => {
    const cleanedPhone = phone.replace(/[^0-9]/g, '');
    if (cleanedPhone.length < 9) {
      Alert.alert('Invalid Phone', 'Please enter a valid Cameroon phone number (6XXXXXXXX)');
      return;
    }

    setLoading(true);
    setStep('waiting');
    setErrorMessage('');

    try {
      const response = await fetch(`${API_URL}/api/mobile-payments/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          phone: cleanedPhone,
          amount,
          transactionId,
          initiatedBy,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTransactionRef(data.payment.transactionRef);
        setPaymentStatus(data.payment);
        startPolling(data.payment.transactionRef);
      } else {
        setStep('error');
        setErrorMessage(data.error || 'Failed to initiate payment');
      }
    } catch (err) {
      setStep('error');
      setErrorMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1b: Generate QR Code (Customer-Initiated) ──
  const handleGenerateQR = async () => {
    setLoading(true);
    setStep('waiting');
    setErrorMessage('');

    try {
      const response = await fetch(`${API_URL}/api/mobile-payments/generate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          amount,
          transactionId,
          initiatedBy,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTransactionRef(data.payment.transactionRef);
        setPaymentStatus(data.payment);
        setQrSvg(data.qrCode?.svg || '');
        startPolling(data.payment.transactionRef);
      } else {
        setStep('error');
        setErrorMessage(data.error || 'Failed to generate QR code');
      }
    } catch (err) {
      setStep('error');
      setErrorMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Agent Verification ──
  const handleVerify = async () => {
    if (!agentPin || agentPin.length < 4) {
      setPinError('Please enter your PIN');
      return;
    }

    setLoading(true);
    setPinError('');

    try {
      const response = await fetch(`${API_URL}/api/mobile-payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionRef,
          verifiedBy: initiatedBy,
          agentPin,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('success');
        setPaymentStatus(data.payment);
        // Auto-complete after brief success animation
        setTimeout(() => {
          if (onPaymentVerified) onPaymentVerified(data.payment);
        }, 1500);
      } else {
        setPinError(data.error || 'Verification failed');
      }
    } catch (err) {
      setPinError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Cancel / Go Back ──
  const handleBack = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (step === 'select_provider' || step === 'enter_phone') {
      setStep('select_mode');
      setSelectedProvider(null);
      setPhone('');
    } else if (step === 'select_mode') {
      if (onCancel) onCancel();
    } else {
      setStep('select_mode');
      setSelectedProvider(null);
      setPhone('');
      setTransactionRef(null);
      setPaymentStatus(null);
      setQrSvg('');
    }
  };

  // ── Render: Select Initiation Mode ──
  const renderSelectMode = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Choose Payment Method</Text>
      <Text style={styles.subtitle}>Amount: ${amount.toFixed(2)}</Text>

      {INITIATION_MODES.map((mode) => (
        <TouchableOpacity
          key={mode.id}
          style={[styles.modeCard, initiationMode === mode.id && styles.modeCardActive]}
          onPress={() => {
            setInitiationMode(mode.id);
            setStep('select_provider');
          }}
        >
          <Text style={styles.modeIcon}>{mode.icon}</Text>
          <View style={styles.modeInfo}>
            <Text style={styles.modeLabel}>{mode.label}</Text>
            <Text style={styles.modeDesc}>{mode.desc}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {onCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Render: Select Provider ──
  const renderSelectProvider = () => (
    <View style={styles.stepContainer}>
      <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Select Provider</Text>
      <Text style={styles.subtitle}>
        {initiationMode === 'cashier_initiated'
          ? 'Send payment request via:'
          : 'Generate QR code for:'}
      </Text>

      {PROVIDERS.map((provider) => (
        <TouchableOpacity
          key={provider.id}
          style={[styles.providerCard, selectedProvider === provider.id && styles.providerCardActive]}
          onPress={() => {
            setSelectedProvider(provider.id);
            if (initiationMode === 'cashier_initiated') {
              setStep('enter_phone');
            } else {
              handleGenerateQR();
            }
          }}
        >
          <Text style={styles.providerIcon}>{provider.icon}</Text>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{provider.name}</Text>
          </View>
          <View style={[styles.providerBadge, { backgroundColor: provider.color }]}>
            <Text style={styles.providerBadgeText}>
              {provider.id === 'orange' ? 'OM' : 'MTN'}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── Render: Enter Phone (Cashier-Initiated only) ──
  const renderEnterPhone = () => (
    <View style={styles.stepContainer}>
      <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Customer Phone Number</Text>
      <Text style={styles.subtitle}>
        Enter the customer's phone number to send the payment request
      </Text>

      <View style={styles.phoneInputContainer}>
        <Text style={styles.phonePrefix}>🇨🇲 +237</Text>
        <TextInput
          style={styles.phoneInput}
          value={phone}
          onChangeText={(text) => setPhone(formatPhone(text))}
          placeholder="6XX XXX XXX"
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
          maxLength={14}
          autoFocus
        />
      </View>
      <Text style={styles.phoneHint}>Format: 6XXXXXXXX (Cameroon number)</Text>

      <TouchableOpacity
        style={[styles.primaryBtn, phone.replace(/[^0-9]/g, '').length < 9 && styles.btnDisabled]}
        onPress={handleInitiateUSSD}
        disabled={phone.replace(/[^0-9]/g, '').length < 9}
      >
        <Text style={styles.primaryBtnText}>
          Send Payment Request
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ── Render: Waiting / Processing ──
  const renderWaiting = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>
        {initiationMode === 'cashier_initiated'
          ? 'Payment Request Sent!'
          : 'QR Code Generated!'}
      </Text>

      {initiationMode === 'customer_initiated' && qrSvg ? (
        <View style={styles.qrContainer}>
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrIcon}>📷</Text>
            <Text style={styles.qrAmount}>${amount.toFixed(2)}</Text>
            <Text style={styles.qrProvider}>
              via {PROVIDERS.find(p => p.id === selectedProvider)?.name}
            </Text>
            <View style={styles.qrBox}>
              <Text style={styles.qrPlaceholderText}>QR Code</Text>
              <Text style={styles.qrRef}>{transactionRef}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.ussdContainer}>
          <Text style={styles.ussdIcon}>📲</Text>
          <Text style={styles.ussdPhone}>
            {PROVIDERS.find(p => p.id === selectedProvider)?.name}
          </Text>
          <Text style={styles.ussdNumber}>
            {phone}
          </Text>
        </View>
      )}

      <View style={styles.waitingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.waitingTitle}>
          {initiationMode === 'cashier_initiated'
            ? 'Waiting for customer to confirm...'
            : 'Waiting for customer to scan and pay...'}
        </Text>
        <Text style={styles.waitingText}>
          {initiationMode === 'cashier_initiated'
            ? 'Ask the customer to check their phone and confirm the payment via USSD'
            : 'Ask the customer to scan the QR code with their mobile money app'}
        </Text>
        <Text style={styles.amountText}>${amount.toFixed(2)}</Text>
        <Text style={styles.refText}>Ref: {transactionRef}</Text>
      </View>

      <TouchableOpacity style={styles.cancelBtn} onPress={handleBack}>
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Render: Agent Verification ──
  const renderVerify = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Payment Confirmed!</Text>

      <View style={styles.confirmedCard}>
        <Text style={styles.confirmedIcon}>✅</Text>
        <Text style={styles.confirmedAmount}>${amount.toFixed(2)}</Text>
        <Text style={styles.confirmedProvider}>
          via {PROVIDERS.find(p => p.id === selectedProvider)?.name}
        </Text>
        {phone ? <Text style={styles.confirmedPhone}>Phone: {phone}</Text> : null}
        <Text style={styles.confirmedRef}>Ref: {transactionRef}</Text>
      </View>

      <Text style={styles.verifyTitle}>Agent Verification Required</Text>
      <Text style={styles.verifyText}>
        Enter your PIN to verify this payment and complete the order
      </Text>

      <View style={styles.pinContainer}>
        <TextInput
          style={[styles.pinInput, pinError ? styles.pinInputError : null]}
          value={agentPin}
          onChangeText={(text) => {
            setAgentPin(text.replace(/[^0-9]/g, '').slice(0, 6));
            setPinError('');
          }}
          placeholder="Enter your PIN"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          autoFocus
        />
        {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, (!agentPin || agentPin.length < 4) && styles.btnDisabled]}
        onPress={handleVerify}
        disabled={loading || !agentPin || agentPin.length < 4}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>Verify & Complete Order</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={handleBack}>
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Render: Success ──
  const renderSuccess = () => (
    <View style={styles.stepContainer}>
      <Animated.View style={[styles.successContainer, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.successTitle}>Payment Verified!</Text>
        <Text style={styles.successAmount}>${amount.toFixed(2)}</Text>
        <Text style={styles.successText}>
          via {PROVIDERS.find(p => p.id === selectedProvider)?.name}
        </Text>
        <Text style={styles.successRef}>Ref: {transactionRef}</Text>
      </Animated.View>
    </View>
  );

  // ── Render: Error ──
  const renderError = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.errorIcon}>❌</Text>
      <Text style={styles.errorTitle}>Payment Failed</Text>
      <Text style={styles.errorMessage}>{errorMessage}</Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={handleBack}>
        <Text style={styles.primaryBtnText}>Try Again</Text>
      </TouchableOpacity>

      {onCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Render current step ──
  const renderStep = () => {
    switch (step) {
      case 'select_mode': return renderSelectMode();
      case 'select_provider': return renderSelectProvider();
      case 'enter_phone': return renderEnterPhone();
      case 'waiting': return renderWaiting();
      case 'verify': return renderVerify();
      case 'success': return renderSuccess();
      case 'error': return renderError();
      default: return renderSelectMode();
    }
  };

  return (
    <Animated.View style={[styles.container, style, { opacity: fadeAnim }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {renderStep()}
      </ScrollView>
    </Animated.View>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    ...Shadows.lg,
    maxHeight: '90%',
  },
  scrollContent: {
    padding: Spacing.xl,
  },
  stepContainer: {
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
    padding: Spacing.xs,
  },
  backBtnText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },

  // ── Titles ──
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },

  // ── Mode Selection ──
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    width: '100%',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  modeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight || '#FFF3E0',
  },
  modeIcon: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  modeInfo: {
    flex: 1,
  },
  modeLabel: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  modeDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  // ── Provider Selection ──
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    width: '100%',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  providerCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight || '#FFF3E0',
  },
  providerIcon: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  providerBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  providerBadgeText: {
    ...Typography.caption,
    fontWeight: '700',
    color: '#333',
  },

  // ── Phone Input ──
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    width: '100%',
  },
  phonePrefix: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginRight: Spacing.sm,
  },
  phoneInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,
  },
  phoneHint: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
    alignSelf: 'flex-start',
  },

  // ── Buttons ──
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    marginTop: Spacing.md,
  },
  primaryBtnText: {
    ...Typography.button,
    color: '#fff',
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  cancelBtn: {
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  cancelBtnText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  // ── Waiting / Processing ──
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  waitingTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  waitingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  amountText: {
    ...Typography.h2,
    color: Colors.primary,
    marginTop: Spacing.lg,
  },
  refText: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },

  // ── USSD Info ──
  ussdContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  ussdIcon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  ussdPhone: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  ussdNumber: {
    ...Typography.h3,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },

  // ── QR Code ──
  qrContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  qrPlaceholder: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
  },
  qrIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  qrAmount: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  qrProvider: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  qrBox: {
    width: 180,
    height: 180,
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qrPlaceholderText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  qrRef: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },

  // ── Confirmed Card ──
  confirmedCard: {
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    marginBottom: Spacing.lg,
  },
  confirmedIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  confirmedAmount: {
    ...Typography.h2,
    color: '#2E7D32',
  },
  confirmedProvider: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  confirmedPhone: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  confirmedRef: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },

  // ── Agent Verification ──
  verifyTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  verifyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  pinContainer: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  pinInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 8,
  },
  pinInputError: {
    borderColor: '#E53935',
  },
  pinError: {
    ...Typography.caption,
    color: '#E53935',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },

  // ── Success ──
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  successTitle: {
    ...Typography.h2,
    color: '#2E7D32',
    marginBottom: Spacing.sm,
  },
  successAmount: {
    ...Typography.h1,
    color: Colors.primary,
  },
  successText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  successRef: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },

  // ── Error ──
  errorIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  errorTitle: {
    ...Typography.h3,
    color: '#E53935',
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
});
