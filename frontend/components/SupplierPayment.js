import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  Animated,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Spacing, BorderRadius, Typography, Shadows } from '../theme';

const API_URL = 'http://localhost:5001';

// ──────────────────────────────────────────────
// SupplierPayment — Premium MVP Supplier Payment Modal
// ──────────────────────────────────────────────
export default function SupplierPayment({ visible, onClose, employeeId }) {
  // ── Form State ──
  const [step, setStep] = useState('form'); // form | confirm | processing | success | history
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [note, setNote] = useState('');
  const [agentPin, setAgentPin] = useState('');
  const [pinError, setPinError] = useState('');

  // ── Data State ──
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastTransfer, setLastTransfer] = useState(null);
  const [error, setError] = useState('');

  // ── Animations ──
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
      fetchHistory();
    } else {
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setStep('form');
    setSupplierName('');
    setSupplierPhone('');
    setAmount('');
    setInvoiceRef('');
    setNote('');
    setAgentPin('');
    setPinError('');
    setError('');
    setLastTransfer(null);
  };

  const formatPhone = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`;
  };

  const formatAmount = (text) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('');
    return cleaned;
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/mobile-payments/remittance/history?limit=10`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.transfers || []);
      }
    } catch (err) {
      console.error('[SupplierPayment] Fetch history error:', err);
    }
  };

  const handleProceed = () => {
    setError('');

    // Validation
    if (!supplierName.trim()) {
      setError('Please enter the supplier name');
      return;
    }
    const cleanedPhone = supplierPhone.replace(/[^0-9]/g, '');
    if (!cleanedPhone || cleanedPhone.length < 9) {
      setError('Please enter a valid phone number');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setStep('confirm');
  };

  const handleConfirm = () => {
    setStep('pin');
  };

  const handleSubmitPayment = async () => {
    if (!agentPin || agentPin.length < 4) {
      setPinError('Please enter your PIN');
      return;
    }

    setProcessing(true);
    setPinError('');

    const cleanedPhone = supplierPhone.replace(/[^0-9]/g, '');
    const parsedAmount = parseFloat(amount);

    try {
      const response = await fetch(`${API_URL}/api/mobile-payments/remittance/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          currency: 'XAF',
          partyId: cleanedPhone,
          initiatedBy: employeeId,
          agentPin,
          payerMessage: `Payment to ${supplierName}${invoiceRef ? ` - ${invoiceRef}` : ''}`,
          payeeNote: note || `Supplier payment - ${supplierName}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setPinError('Invalid PIN. Please try again.');
          setProcessing(false);
          return;
        }
        throw new Error(data.error || 'Payment failed');
      }

      setLastTransfer(data.transfer);
      setStep('success');
      fetchHistory();
    } catch (err) {
      Alert.alert('Payment Failed', err.message);
      setStep('form');
    } finally {
      setProcessing(false);
    }
  };

  const handleNewPayment = () => {
    resetForm();
  };

  // ── Render: Form Step ──
  const renderForm = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.formHeader}>
          <View style={styles.formIconContainer}>
            <LinearGradient colors={['#00D4AA', '#00B894']} style={styles.formIconBg}>
              <Text style={styles.formIcon}>💸</Text>
            </LinearGradient>
          </View>
          <Text style={styles.formTitle}>Supplier Payment</Text>
          <Text style={styles.formSubtitle}>
            Pay suppliers via MTN Mobile Money Remittance
          </Text>
        </View>

        {/* Supplier Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>🏢 Supplier Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Fresh Foods Ltd"
            placeholderTextColor={Colors.textMuted}
            value={supplierName}
            onChangeText={setSupplierName}
            autoCapitalize="words"
          />
        </View>

        {/* Supplier Phone */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>📱 Supplier Phone</Text>
          <View style={styles.phoneInputRow}>
            <View style={styles.phonePrefix}>
              <Text style={styles.phonePrefixText}>🇨🇲 +237</Text>
            </View>
            <TextInput
              style={[styles.input, styles.phoneInput]}
              placeholder="6XX XXX XXX"
              placeholderTextColor={Colors.textMuted}
              value={supplierPhone}
              onChangeText={(t) => setSupplierPhone(formatPhone(t))}
              keyboardType="phone-pad"
              maxLength={12}
            />
          </View>
        </View>

        {/* Amount */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>💰 Amount (XAF)</Text>
          <View style={styles.amountInputRow}>
            <Text style={styles.amountCurrency}>XAF</Text>
            <TextInput
              style={[styles.input, styles.amountInput]}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              value={amount}
              onChangeText={(t) => setAmount(formatAmount(t))}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Invoice Reference */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>🧾 Invoice Reference (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. INV-2024-001"
            placeholderTextColor={Colors.textMuted}
            value={invoiceRef}
            onChangeText={setInvoiceRef}
            autoCapitalize="characters"
          />
        </View>

        {/* Note */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>📝 Note (optional)</Text>
          <TextInput
            style={[styles.input, styles.noteInput]}
            placeholder="Payment notes..."
            placeholderTextColor={Colors.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {/* Proceed Button */}
        <TouchableOpacity
          style={styles.proceedBtn}
          onPress={handleProceed}
          activeOpacity={0.8}
        >
          <LinearGradient colors={Gradients.primary} style={styles.proceedBtnGradient}>
            <Text style={styles.proceedBtnText}>Continue →</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Recent Payments */}
        {history.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.recentTitle}>📋 Recent Supplier Payments</Text>
            {history.slice(0, 3).map((t, i) => (
              <View key={i} style={styles.recentItem}>
                <View style={styles.recentItemLeft}>
                  <Text style={styles.recentItemIcon}>💸</Text>
                  <View>
                    <Text style={styles.recentItemAmount}>
                      {t.amount?.toLocaleString()} {t.currency}
                    </Text>
                    <Text style={styles.recentItemPhone}>
                      📱 {t.phone} · {t.payerMessage?.split(' - ')[0]?.replace('Payment to ', '') || 'Supplier'}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.recentStatusBadge,
                  t.status === 'CONFIRMED' && styles.recentStatusSuccess,
                ]}>
                  <Text style={styles.recentStatusText}>
                    {t.status === 'CONFIRMED' ? '✅ Done' : '⏳ Pending'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ── Render: Confirm Step ──
  const renderConfirm = () => (
    <View style={styles.confirmContainer}>
      <View style={styles.confirmHeader}>
        <View style={styles.confirmIconContainer}>
          <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.confirmIconBg}>
            <Text style={styles.confirmIcon}>🔍</Text>
          </LinearGradient>
        </View>
        <Text style={styles.confirmTitle}>Review Payment</Text>
        <Text style={styles.confirmSubtitle}>Please verify the details below</Text>
      </View>

      <View style={styles.confirmCard}>
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Supplier</Text>
          <Text style={styles.confirmValue}>🏢 {supplierName}</Text>
        </View>
        <View style={styles.confirmDivider} />
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Phone</Text>
          <Text style={styles.confirmValue}>📱 +237 {supplierPhone}</Text>
        </View>
        <View style={styles.confirmDivider} />
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Amount</Text>
          <Text style={[styles.confirmValue, styles.confirmAmount]}>
            💰 {parseFloat(amount).toLocaleString()} XAF
          </Text>
        </View>
        {invoiceRef ? (
          <>
            <View style={styles.confirmDivider} />
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Invoice</Text>
              <Text style={styles.confirmValue}>🧾 {invoiceRef}</Text>
            </View>
          </>
        ) : null}
        {note ? (
          <>
            <View style={styles.confirmDivider} />
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Note</Text>
              <Text style={[styles.confirmValue, styles.confirmNote]}>{note}</Text>
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.confirmActions}>
        <TouchableOpacity
          style={styles.confirmBackBtn}
          onPress={() => setStep('form')}
          activeOpacity={0.7}
        >
          <Text style={styles.confirmBackBtnText}>← Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.confirmPayBtn}
          onPress={handleConfirm}
          activeOpacity={0.8}
        >
          <LinearGradient colors={Gradients.primary} style={styles.confirmPayBtnGradient}>
            <Text style={styles.confirmPayBtnText}>Pay {parseFloat(amount).toLocaleString()} XAF →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Render: PIN Step ──
  const renderPin = () => (
    <View style={styles.pinContainer}>
      <View style={styles.pinHeader}>
        <View style={styles.pinIconContainer}>
          <LinearGradient colors={['#4A9EFF', '#2B7DE0']} style={styles.pinIconBg}>
            <Text style={styles.pinIcon}>🔐</Text>
          </LinearGradient>
        </View>
        <Text style={styles.pinTitle}>Authorize Payment</Text>
        <Text style={styles.pinSubtitle}>
          Enter your PIN to authorize the supplier payment
        </Text>
      </View>

      <View style={styles.pinAmountCard}>
        <Text style={styles.pinAmountLabel}>Amount to pay</Text>
        <Text style={styles.pinAmountValue}>
          {parseFloat(amount).toLocaleString()} XAF
        </Text>
        <Text style={styles.pinAmountTo}>
          to {supplierName} · +237 {supplierPhone}
        </Text>
      </View>

      <View style={styles.pinInputGroup}>
        <Text style={styles.pinInputLabel}>Agent PIN</Text>
        <TextInput
          style={[styles.pinInput, pinError ? styles.pinInputError : null]}
          placeholder="Enter your PIN"
          placeholderTextColor={Colors.textMuted}
          value={agentPin}
          onChangeText={(t) => {
            setAgentPin(t.replace(/[^0-9]/g, ''));
            setPinError('');
          }}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          autoFocus
        />
        {pinError ? (
          <Text style={styles.pinErrorText}>⚠️ {pinError}</Text>
        ) : null}
      </View>

      {processing ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.processingText}>Processing payment...</Text>
          <Text style={styles.processingSubtext}>Sending to MTN Mobile Money</Text>
        </View>
      ) : (
        <View style={styles.pinActions}>
          <TouchableOpacity
            style={styles.pinBackBtn}
            onPress={() => setStep('confirm')}
            activeOpacity={0.7}
          >
            <Text style={styles.pinBackBtnText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pinSubmitBtn, !agentPin ? styles.pinSubmitBtnDisabled : null]}
            onPress={handleSubmitPayment}
            activeOpacity={0.8}
            disabled={!agentPin}
          >
            <LinearGradient
              colors={!agentPin ? ['#374151', '#374151'] : Gradients.primary}
              style={styles.pinSubmitBtnGradient}
            >
              <Text style={styles.pinSubmitBtnText}>Confirm Payment</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // ── Render: Success Step ──
  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIconContainer}>
        <LinearGradient colors={['#00D4AA', '#00B894']} style={styles.successIconBg}>
          <Text style={styles.successIcon}>✅</Text>
        </LinearGradient>
      </View>
      <Text style={styles.successTitle}>Payment Sent!</Text>
      <Text style={styles.successSubtitle}>
        Supplier payment completed successfully
      </Text>

      {lastTransfer && (
        <View style={styles.successCard}>
          <View style={styles.successRow}>
            <Text style={styles.successLabel}>Amount</Text>
            <Text style={styles.successValue}>
              {lastTransfer.amount?.toLocaleString()} {lastTransfer.currency}
            </Text>
          </View>
          <View style={styles.successDivider} />
          <View style={styles.successRow}>
            <Text style={styles.successLabel}>To</Text>
            <Text style={styles.successValue}>{supplierName}</Text>
          </View>
          <View style={styles.successDivider} />
          <View style={styles.successRow}>
            <Text style={styles.successLabel}>Phone</Text>
            <Text style={styles.successValue}>+237 {supplierPhone}</Text>
          </View>
          <View style={styles.successDivider} />
          <View style={styles.successRow}>
            <Text style={styles.successLabel}>Reference</Text>
            <Text style={[styles.successValue, styles.successRef]}>
              {lastTransfer.transferRef}
            </Text>
          </View>
          <View style={styles.successDivider} />
          <View style={styles.successRow}>
            <Text style={styles.successLabel}>Mode</Text>
            <Text style={styles.successValue}>
              {lastTransfer.mode === 'simulation' ? '🧪 Simulation' : '🚀 Production'}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.successActions}>
        <TouchableOpacity
          style={styles.successNewBtn}
          onPress={handleNewPayment}
          activeOpacity={0.8}
        >
          <LinearGradient colors={Gradients.primary} style={styles.successNewBtnGradient}>
            <Text style={styles.successNewBtnText}>Make Another Payment</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.successCloseBtn}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={styles.successCloseBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modal,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <LinearGradient colors={Gradients.backgroundDeep} style={styles.modalGradient}>
            <SafeAreaView style={styles.safeArea}>
              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>

              {/* Step Content */}
              {step === 'form' && renderForm()}
              {step === 'confirm' && renderConfirm()}
              {step === 'pin' && renderPin()}
              {step === 'success' && renderSuccess()}
            </SafeAreaView>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// Styles — Premium MVP Design
// ──────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '92%',
    maxHeight: '90%',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.large,
  },
  modalGradient: {
    borderRadius: BorderRadius.xl,
    padding: 0,
  },
  safeArea: {
    maxHeight: '90%',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  // ── Form Step ──
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: 24,
    paddingBottom: 40,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 8,
  },
  formIconContainer: {
    marginBottom: 16,
  },
  formIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  formIcon: {
    fontSize: 28,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Form Fields ──
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phonePrefix: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 0,
  },
  phonePrefixText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountCurrency: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 0,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  amountInput: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    fontSize: 20,
    fontWeight: '700',
  },
  noteInput: {
    minHeight: 80,
    paddingTop: 14,
  },

  // ── Error Banner ──
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: BorderRadius.md,
    padding: 12,
    marginBottom: 18,
  },
  errorBannerText: {
    fontSize: 13,
    color: Colors.error,
    fontWeight: '500',
  },

  // ── Proceed Button ──
  proceedBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: 24,
    ...Shadows.medium,
  },
  proceedBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  proceedBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
  },

  // ── Recent Payments ──
  recentSection: {
    marginTop: 8,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentItemIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  recentItemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  recentItemPhone: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  recentStatusBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  recentStatusSuccess: {
    backgroundColor: 'rgba(0, 212, 170, 0.15)',
  },
  recentStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // ── Confirm Step ──
  confirmContainer: {
    padding: 24,
  },
  confirmHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  confirmIconContainer: {
    marginBottom: 16,
  },
  confirmIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  confirmIcon: {
    fontSize: 28,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  confirmSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  confirmCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  confirmLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  confirmValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  confirmAmount: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: '700',
  },
  confirmNote: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  confirmDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmBackBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirmBackBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  confirmPayBtn: {
    flex: 2,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  confirmPayBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmPayBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
  },

  // ── PIN Step ──
  pinContainer: {
    padding: 24,
  },
  pinHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  pinIconContainer: {
    marginBottom: 16,
  },
  pinIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  pinIcon: {
    fontSize: 28,
  },
  pinTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  pinSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  pinAmountCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
    alignItems: 'center',
  },
  pinAmountLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
    marginBottom: 8,
  },
  pinAmountValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 6,
  },
  pinAmountTo: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  pinInputGroup: {
    marginBottom: 24,
  },
  pinInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  pinInput: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.borderFocused,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
  },
  pinInputError: {
    borderColor: Colors.error,
  },
  pinErrorText: {
    fontSize: 13,
    color: Colors.error,
    marginTop: 8,
    fontWeight: '500',
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  processingText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  processingSubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
  pinActions: {
    flexDirection: 'row',
    gap: 12,
  },
  pinBackBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pinBackBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  pinSubmitBtn: {
    flex: 2,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  pinSubmitBtnDisabled: {
    opacity: 0.5,
  },
  pinSubmitBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  pinSubmitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
  },

  // ── Success Step ──
  successContainer: {
    padding: 24,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 16,
    marginTop: 8,
  },
  successIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.large,
  },
  successIcon: {
    fontSize: 36,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  successCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  successLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  successValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  successRef: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: Colors.textMuted,
  },
  successDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  successActions: {
    width: '100%',
    gap: 12,
  },
  successNewBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  successNewBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  successNewBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
  },
  successCloseBtn: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  successCloseBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});