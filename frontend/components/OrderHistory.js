import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
  Image,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';

const API_URL = Platform.OS === 'web'
  ? 'http://localhost:5001'
  : 'http://10.0.2.2:5001';

export default function OrderHistory({ visible, onClose, employeeId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState(null);
  const [filter, setFilter] = useState('all');

  // Mobile money refund state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinOrderId, setPinOrderId] = useState(null);
  const [pinOrder, setPinOrder] = useState(null);
  const [agentPin, setAgentPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [processingPin, setProcessingPin] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const response = await fetch(`${API_URL}/api/orders${statusParam}`);
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (visible) fetchOrders();
  }, [visible, fetchOrders]);

  // ── Handle refund for non-mobile-money orders ──
  const handleRefund = async (orderId) => {
    Alert.alert(
      'Confirm Refund',
      'Are you sure you want to refund this order? This will restock the items.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refund',
          style: 'destructive',
          onPress: async () => {
            setRefunding(orderId);
            try {
              const response = await fetch(`${API_URL}/api/orders/${orderId}/refund`, {
                method: 'POST',
              });
              if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Refund failed');
              }
              Alert.alert('Success', 'Order has been refunded.');
              fetchOrders();
            } catch (error) {
              Alert.alert('Refund Error', error.message);
            } finally {
              setRefunding(null);
            }
          },
        },
      ]
    );
  };

  // ── Handle refund for mobile money orders (requires PIN) ──
  const handleMobileMoneyRefund = (order) => {
    setPinOrderId(order._id);
    setPinOrder(order);
    setAgentPin('');
    setPinError('');
    setShowPinModal(true);
  };

  const submitPinRefund = async () => {
    if (!agentPin || agentPin.length < 4) {
      setPinError('Please enter a valid PIN');
      return;
    }
    if (!employeeId) {
      setPinError('Employee ID not available. Please log in again.');
      return;
    }

    setProcessingPin(true);
    setPinError('');
    setRefunding(pinOrderId);

    try {
      const response = await fetch(`${API_URL}/api/orders/${pinOrderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Customer request',
          refundedBy: employeeId,
          agentPin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Refund failed');
      }

      setShowPinModal(false);
      Alert.alert(
        'Refund Successful',
        data.mobileRefund
          ? `Mobile money refund processed. Ref: ${data.mobileRefund.refundRef}`
          : 'Order has been refunded.'
      );
      fetchOrders();
    } catch (error) {
      setPinError(error.message);
    } finally {
      setProcessingPin(false);
      setRefunding(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'refunded': return '#FF9800';
      case 'pending': return '#2196F3';
      default: return Colors.textSecondary;
    }
  };

  const isMobileMoneyOrder = (item) => {
    return ['orange_money', 'mtn_money'].includes(item.paymentMethod);
  };

  const renderOrder = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.receiptNo}>{item.receiptNumber}</Text>
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleDateString()}{' '}
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.itemsList}>
        {item.items.map((orderItem, idx) => {
          const ohImageUri = orderItem.image
            ? (orderItem.image.startsWith('/') ? `${API_URL}${orderItem.image}` : orderItem.image)
            : null;
          return (
            <View key={idx} style={styles.itemRow}>
              {ohImageUri ? (
                <Image
                  source={{ uri: ohImageUri }}
                  style={styles.itemThumb}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.itemThumbPlaceholder}>
                  <Text style={styles.itemThumbEmoji}>🍽️</Text>
                </View>
              )}
              <Text style={styles.itemQty}>{orderItem.quantity}x</Text>
              <Text style={styles.itemName}>{orderItem.name}</Text>
              <Text style={styles.itemPrice}>
                ${(orderItem.price * orderItem.quantity).toFixed(2)}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.orderFooter}>
        <View>
          <Text style={styles.paymentMethod}>
            {item.paymentMethod.toUpperCase()}
            {isMobileMoneyOrder(item) && (
              <Text style={styles.mobileMoneyHint}> (PIN required)</Text>
            )}
          </Text>
          <Text style={styles.totalText}>
            Total: <Text style={styles.totalAmount}>${item.total.toFixed(2)}</Text>
          </Text>
        </View>
        {item.status === 'completed' && (
          <TouchableOpacity
            style={[styles.refundBtn, refunding === item._id && styles.refundBtnDisabled]}
            onPress={() =>
              isMobileMoneyOrder(item)
                ? handleMobileMoneyRefund(item)
                : handleRefund(item._id)
            }
            disabled={refunding === item._id}
          >
            {refunding === item._id ? (
              <ActivityIndicator size="small" color="#FF9800" />
            ) : (
              <Text style={styles.refundBtnText}>Refund</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'completed', label: 'Completed' },
    { key: 'refunded', label: 'Refunded' },
  ];

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>Order History</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Filters */}
            <View style={styles.filters}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
                  onPress={() => setFilter(f.key)}
                >
                  <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : orders.length === 0 ? (
              <View style={styles.centered}>
                <Text style={styles.emptyText}>No orders found</Text>
              </View>
            ) : (
              <FlatList
                data={orders}
                renderItem={renderOrder}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ── Agent PIN Verification Modal (for mobile money refunds) ── */}
      <Modal visible={showPinModal} transparent animationType="fade" onRequestClose={() => setShowPinModal(false)}>
        <View style={styles.pinOverlay}>
          <View style={styles.pinModal}>
            <Text style={styles.pinTitle}>Authorize Refund</Text>
            {pinOrder && (
              <View style={styles.pinOrderInfo}>
                <Text style={styles.pinOrderReceipt}>{pinOrder.receiptNumber}</Text>
                <Text style={styles.pinOrderAmount}>${pinOrder.total?.toFixed(2)}</Text>
                <Text style={styles.pinOrderMethod}>{pinOrder.paymentMethod?.toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.pinLabel}>Enter your agent PIN to authorize the mobile money refund:</Text>
            <TextInput
              style={styles.pinInput}
              value={agentPin}
              onChangeText={(text) => {
                setAgentPin(text.replace(/[^0-9]/g, '').slice(0, 6));
                setPinError('');
              }}
              placeholder="Agent PIN"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              autoFocus
            />
            {pinError ? <Text style={styles.pinErrorText}>{pinError}</Text> : null}
            <View style={styles.pinActions}>
              <TouchableOpacity
                style={styles.pinCancelBtn}
                onPress={() => {
                  setShowPinModal(false);
                  setRefunding(null);
                }}
                disabled={processingPin}
              >
                <Text style={styles.pinCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pinConfirmBtn, processingPin && styles.pinConfirmBtnDisabled]}
                onPress={submitPinRefund}
                disabled={processingPin}
              >
                {processingPin ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.pinConfirmBtnText}>Confirm Refund</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    fontSize: 20,
    color: Colors.textSecondary,
    padding: 4,
  },
  filters: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.surfaceLight,
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#151515',
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textMuted,
  },
  list: {
    padding: Spacing.md,
  },
  orderCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  receiptNo: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
  },
  date: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  itemsList: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  itemThumb: {
    width: 28,
    height: 28,
    borderRadius: 4,
    marginRight: 6,
    backgroundColor: Colors.surfaceLight,
  },
  itemThumbPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 4,
    marginRight: 6,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemThumbEmoji: {
    fontSize: 12,
    opacity: 0.4,
  },
  itemQty: {
    fontSize: Typography.caption.fontSize,
    color: Colors.primary,
    fontWeight: '600',
    minWidth: 24,
  },
  itemName: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textPrimary,
    flex: 1,
  },
  itemPrice: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  paymentMethod: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  totalAmount: {
    color: Colors.primary,
    fontWeight: '700',
  },
  refundBtn: {
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  refundBtnDisabled: {
    opacity: 0.5,
  },
  refundBtnText: {
    fontSize: Typography.caption.fontSize,
    color: '#FF9800',
    fontWeight: '600',
  },
  mobileMoneyHint: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: '500',
  },
  // ── PIN Modal Styles ──
  pinOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  pinModal: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  pinTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  pinOrderInfo: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pinOrderReceipt: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Platform.OS === 'web' ? 'Courier New' : 'monospace',
  },
  pinOrderAmount: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  pinOrderMethod: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.xs,
  },
  pinLabel: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  pinInput: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 8,
    width: '100%',
    marginBottom: Spacing.sm,
  },
  pinErrorText: {
    fontSize: Typography.caption.fontSize,
    color: '#E53935',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  pinActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
    marginTop: Spacing.sm,
  },
  pinCancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pinCancelBtnText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  pinConfirmBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: '#E53935',
    alignItems: 'center',
  },
  pinConfirmBtnDisabled: {
    opacity: 0.6,
  },
  pinConfirmBtnText: {
    fontSize: Typography.body.fontSize,
    color: '#fff',
    fontWeight: '700',
  },
});
