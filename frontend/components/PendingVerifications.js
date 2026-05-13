import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../theme';

const API_URL = Platform.OS === 'web'
  ? 'http://localhost:5001'
  : 'http://10.0.2.2:5001';

const PROVIDER_COLORS = {
  orange: '#FF7900',
  mtn: '#FFCC00',
};

const PROVIDER_NAMES = {
  orange: 'Orange Money',
  mtn: 'MTN Mobile Money',
};

/**
 * PendingVerifications — Panel showing payments awaiting agent verification
 *
 * Props:
 *   employeeId: string — current employee ID for verification
 *   onVerified: (payment) => void — called when a payment is verified
 *   style: object — container style override
 */
export default function PendingVerifications({ employeeId, onVerified, style }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [pinInputs, setPinInputs] = useState({});

  const fetchPending = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/mobile-payments/pending-verification`);
      const data = await response.json();
      setPayments(data.payments || []);
    } catch (err) {
      console.error('[PendingVerifications] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, [fetchPending]);

  const handleVerify = async (transactionRef) => {
    const pin = pinInputs[transactionRef];
    if (!pin || pin.length < 4) {
      Alert.alert('PIN Required', 'Enter your agent PIN to verify');
      return;
    }

    setVerifyingId(transactionRef);
    try {
      const response = await fetch(`${API_URL}/api/mobile-payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionRef,
          verifiedBy: employeeId,
          agentPin: pin,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Remove from list
        setPayments((prev) => prev.filter((p) => p.transactionRef !== transactionRef));
        setPinInputs((prev) => {
          const next = { ...prev };
          delete next[transactionRef];
          return next;
        });
        if (onVerified) onVerified(data.payment);
        Alert.alert('Verified!', 'Payment has been verified successfully');
      } else {
        Alert.alert('Verification Failed', data.error || 'Invalid PIN or payment not found');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setVerifyingId(null);
    }
  };

  const renderPayment = ({ item }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={[styles.providerBadge, { backgroundColor: PROVIDER_COLORS[item.provider] || '#ccc' }]}>
          <Text style={styles.providerBadgeText}>
            {item.provider === 'orange' ? 'OM' : 'MTN'}
          </Text>
        </View>
        <Text style={styles.amount}>${item.amount?.toFixed(2)}</Text>
      </View>

      <View style={styles.paymentDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone</Text>
          <Text style={styles.detailValue}>{item.phone || 'N/A'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Ref</Text>
          <Text style={styles.detailValue}>{item.transactionRef}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Mode</Text>
          <Text style={styles.detailValue}>
            {item.initiationMode === 'cashier_initiated' ? 'Cashier Initiated' : 'Customer Initiated (QR)'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Confirmed</Text>
          <Text style={styles.detailValue}>
            {item.confirmedAt ? new Date(item.confirmedAt).toLocaleTimeString() : 'N/A'}
          </Text>
        </View>
        {item.initiatedBy && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Initiated by</Text>
            <Text style={styles.detailValue}>{item.initiatedBy?.name || 'Unknown'}</Text>
          </View>
        )}
      </View>

      <View style={styles.verifySection}>
        <TextInput
          style={styles.pinInput}
          value={pinInputs[item.transactionRef] || ''}
          onChangeText={(text) =>
            setPinInputs((prev) => ({
              ...prev,
              [item.transactionRef]: text.replace(/[^0-9]/g, '').slice(0, 6),
            }))
          }
          placeholder="Enter PIN to verify"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
        />
        <TouchableOpacity
          style={[styles.verifyBtn, verifyingId === item.transactionRef && styles.verifyBtnDisabled]}
          onPress={() => handleVerify(item.transactionRef)}
          disabled={verifyingId === item.transactionRef}
        >
          {verifyingId === item.transactionRef ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.verifyBtnText}>Verify</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading pending verifications...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Pending Verifications</Text>
        <TouchableOpacity onPress={() => { setRefreshing(true); fetchPending(); }}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {payments.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>No pending verifications</Text>
          <Text style={styles.emptySubtext}>All payments have been verified</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          renderItem={renderPayment}
          keyExtractor={(item) => item._id}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchPending(); }}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  refreshText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  listContent: {
    paddingBottom: Spacing.sm,
  },
  paymentCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
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
  amount: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  paymentDetails: {
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  detailLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  detailValue: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  verifySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pinInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 4,
  },
  verifyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
  verifyBtnText: {
    ...Typography.button,
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  emptySubtext: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
