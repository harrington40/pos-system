import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../theme';

const PROVIDERS = [
  { id: 'mtn', name: 'MTN Mobile Money', color: '#FFCC00', icon: '📱' },
  { id: 'vodafone', name: 'Vodafone Cash', color: '#E60000', icon: '📲' },
  { id: 'airtel', name: 'Airtel Money', color: '#ED1C24', icon: '💳' },
];

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';

/**
 * MobileMoneyPayment — Mobile money payment form
 *
 * Props:
 *   amount: number — total amount to charge
 *   orderId: string — order ID to associate payment with
 *   onSuccess: (transactionId) => void — called on successful payment
 *   onCancel: () => void — called when user cancels
 *   style: object — container style override
 */
export default function MobileMoneyPayment({ amount, orderId, onSuccess, onCancel, style }) {
  const [phone, setPhone] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('form'); // form | processing | success

  const formatPhone = (text) => {
    // Only allow digits
    const cleaned = text.replace(/[^0-9]/g, '');
    // Format as 0XX XXX XXXX
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
  };

  const handleSubmit = async () => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length < 8) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number');
      return;
    }
    if (!selectedProvider) {
      Alert.alert('Select Provider', 'Please select a mobile money provider');
      return;
    }

    setLoading(true);
    setStep('processing');

    try {
      const response = await fetch(`${API_URL}/api/payments/mobile-money/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleaned,
          provider: selectedProvider,
          amount,
          orderId
        })
      });

      const data = await response.json();

      if (data.success) {
        setStep('success');
        // Simulate confirmation after 2 seconds
        setTimeout(() => {
          if (onSuccess) onSuccess(data.transactionId);
        }, 2000);
      } else {
        Alert.alert('Payment Failed', data.error || 'Something went wrong');
        setStep('form');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not process payment. Please try again.');
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'processing') {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.processingTitle}>Processing Payment</Text>
          <Text style={styles.processingText}>
            Please check your phone to complete the transaction
          </Text>
          <Text style={styles.amountText}>${amount.toFixed(2)}</Text>
          <Text style={styles.processingSubtext}>
            via {PROVIDERS.find(p => p.id === selectedProvider)?.name}
          </Text>
        </View>
      </View>
    );
  }

  if (step === 'success') {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successText}>
            ${amount.toFixed(2)} paid via mobile money
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Mobile Money Payment</Text>
      <Text style={styles.amount}>Amount: ${amount.toFixed(2)}</Text>

      {/* Phone Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="024 XXX XXXX"
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
          maxLength={14}
        />
      </View>

      {/* Provider Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Select Provider</Text>
        <View style={styles.providerGrid}>
          {PROVIDERS.map(provider => (
            <TouchableOpacity
              key={provider.id}
              style={[
                styles.providerBtn,
                selectedProvider === provider.id && styles.providerBtnActive
              ]}
              onPress={() => setSelectedProvider(provider.id)}
            >
              <Text style={styles.providerIcon}>{provider.icon}</Text>
              <Text style={[
                styles.providerName,
                selectedProvider === provider.id && styles.providerNameActive
              ]} numberOfLines={1}>
                {provider.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.payBtn, (!phone || !selectedProvider) && styles.payBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || !phone || !selectedProvider}
        >
          <Text style={styles.payBtnText}>
            {loading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
          </Text>
        </TouchableOpacity>
        {onCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadows.md,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  amount: {
    ...Typography.price,
    color: Colors.primary,
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surfaceDark,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  providerGrid: {
    gap: Spacing.sm,
  },
  providerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceDark,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  providerBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  providerIcon: {
    fontSize: 24,
  },
  providerName: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  providerNameActive: {
    color: Colors.primary,
  },
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  payBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  payBtnDisabled: {
    opacity: 0.5,
  },
  payBtnText: {
    ...Typography.body,
    color: Colors.textDark,
    fontWeight: '700',
  },
  cancelBtn: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  processingTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  processingText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  amountText: {
    ...Typography.adminMetric,
    color: Colors.primary,
  },
  processingSubtext: {
    ...Typography.captionSmall,
    color: Colors.textMuted,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  successIcon: {
    fontSize: 48,
  },
  successTitle: {
    ...Typography.h2,
    color: Colors.success,
  },
  successText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
