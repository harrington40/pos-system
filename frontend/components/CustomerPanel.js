import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../theme';

const API_URL = Platform.OS === 'web' ? 'http://localhost:5001' : 'http://10.0.2.2:5001';

export default function CustomerPanel({ visible, onClose }) {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [showDetail, setShowDetail] = useState(false);
  const [marketingFilter, setMarketingFilter] = useState('all'); // all | opted-in | opted-out
  const [offerMessage, setOfferMessage] = useState('');
  const [sendingOffer, setSendingOffer] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 1, damping: 20, stiffness: 200, useNativeDriver: true }),
      ]).start();
      fetchData();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(0);
      setSelectedCustomer(null);
      setShowDetail(false);
    }
  }, [visible]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [custRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/customers?limit=50`),
        fetch(`${API_URL}/api/customers/stats`),
      ]);
      const custData = await custRes.json();
      const statsData = await statsRes.json();
      setCustomers(custData.customers || []);
      setStats(statsData);
    } catch (err) {
      console.warn('Failed to fetch customer data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!search.trim()) {
      fetchData();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/customers?search=${encodeURIComponent(search)}&limit=50`);
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (err) {
      console.warn('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setShowDetail(true);
    try {
      const res = await fetch(`${API_URL}/api/customers/${customer._id}`);
      const data = await res.json();
      setCustomerOrders(data.orders || []);
    } catch (err) {
      console.warn('Failed to fetch customer details:', err);
      setCustomerOrders([]);
    }
  };

  const handleToggleMarketing = async (customer) => {
    try {
      const res = await fetch(`${API_URL}/api/customers/${customer._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optInMarketing: !customer.optInMarketing,
          optInSMS: !customer.optInMarketing,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCustomers(prev => prev.map(c => c._id === updated._id ? updated : c));
        if (selectedCustomer?._id === updated._id) {
          setSelectedCustomer(updated);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update marketing preference');
    }
  };

  const handleSendOffer = async () => {
    if (!offerMessage.trim()) return;
    setSendingOffer(true);
    try {
      const filter = marketingFilter === 'opted-in' ? { optInMarketing: true } : {};
      const res = await fetch(`${API_URL}/api/customers/send-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: offerMessage.trim(),
          filter,
        }),
      });
      const data = await res.json();
      Alert.alert(
        '📨 Marketing Sent',
        `Offer sent to ${data.sent} customer(s)\n\nNote: SMS sending is simulated. Integrate with an SMS provider for production.`
      );
      setOfferMessage('');
    } catch (err) {
      Alert.alert('Error', 'Failed to send offer');
    } finally {
      setSendingOffer(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    if (marketingFilter === 'opted-in') return c.optInMarketing;
    if (marketingFilter === 'opted-out') return !c.optInMarketing;
    return true;
  });

  const slideIn = {
    transform: [{
      translateY: slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [300, 0],
      }),
    }],
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.overlayTouch} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[styles.modal, slideIn]}>
          <View style={styles.handle} />

          {!showDetail ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <Text style={styles.title}>📋 Customers</Text>
                <Text style={styles.subtitle}>Business Advertisement & Marketing</Text>
              </View>

              {/* Stats Cards */}
              {stats && (
                <View style={styles.statsRow}>
                  <View style={[styles.statCard, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
                    <Text style={[styles.statValue, { color: '#2196F3' }]}>{stats.totalCustomers}</Text>
                    <Text style={styles.statLabel}>Total Customers</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                    <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.marketingOptIns}</Text>
                    <Text style={styles.statLabel}>Marketing Opt-Ins</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: 'rgba(255, 152, 0, 0.1)' }]}>
                    <Text style={[styles.statValue, { color: '#FF9800' }]}>{stats.optInRate}%</Text>
                    <Text style={styles.statLabel}>Opt-In Rate</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: 'rgba(156, 39, 176, 0.1)' }]}>
                    <Text style={[styles.statValue, { color: '#9C27B0' }]}>
                      ${stats.totalRevenue ? stats.totalRevenue.toFixed(0) : '0'}
                    </Text>
                    <Text style={styles.statLabel}>Revenue</Text>
                  </View>
                </View>
              )}

              {/* Search */}
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, phone, or email..."
                  placeholderTextColor={Colors.textMuted}
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                  <Text style={styles.searchBtnText}>🔍</Text>
                </TouchableOpacity>
              </View>

              {/* Marketing Filter */}
              <View style={styles.filterRow}>
                {['all', 'opted-in', 'opted-out'].map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterBtn, marketingFilter === f && styles.filterBtnActive]}
                    onPress={() => setMarketingFilter(f)}
                  >
                    <Text style={[styles.filterText, marketingFilter === f && styles.filterTextActive]}>
                      {f === 'all' ? 'All' : f === 'opted-in' ? '✅ Opted In' : '❌ Opted Out'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Marketing Send Offer */}
              <View style={styles.marketingSection}>
                <Text style={styles.sectionTitle}>📢 Send Marketing Offer</Text>
                <TextInput
                  style={styles.offerInput}
                  placeholder="e.g., Get 20% off your next order! Show this message at checkout."
                  placeholderTextColor={Colors.textMuted}
                  value={offerMessage}
                  onChangeText={setOfferMessage}
                  multiline
                  numberOfLines={3}
                />
                <TouchableOpacity
                  style={[styles.sendOfferBtn, (!offerMessage.trim() || sendingOffer) && styles.sendOfferBtnDisabled]}
                  onPress={handleSendOffer}
                  disabled={!offerMessage.trim() || sendingOffer}
                >
                  {sendingOffer ? (
                    <ActivityIndicator size="small" color="#151515" />
                  ) : (
                    <Text style={styles.sendOfferBtnText}>📨 Send to Opted-In Customers</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Customer List */}
              <Text style={styles.sectionTitle}>
                Customers ({filteredCustomers.length})
              </Text>

              {loading ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading customers...</Text>
                </View>
              ) : filteredCustomers.length === 0 ? (
                <View style={styles.centered}>
                  <Text style={styles.emptyText}>No customers found</Text>
                </View>
              ) : (
                filteredCustomers.map((customer) => (
                  <TouchableOpacity
                    key={customer._id}
                    style={styles.customerCard}
                    onPress={() => handleViewCustomer(customer)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.customerTop}>
                      <View style={styles.customerInfo}>
                        <Text style={styles.customerName}>
                          {customer.name || 'Unknown'}
                        </Text>
                        <Text style={styles.customerPhone}>📞 {customer.phone}</Text>
                        {customer.email ? (
                          <Text style={styles.customerEmail}>✉️ {customer.email}</Text>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        style={[styles.optInBadge, customer.optInMarketing ? styles.optInActive : styles.optInInactive]}
                        onPress={() => handleToggleMarketing(customer)}
                      >
                        <Text style={styles.optInText}>
                          {customer.optInMarketing ? '✅ Opted In' : '❌ Opt Out'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.customerStats}>
                      <View style={styles.customerStat}>
                        <Text style={styles.customerStatValue}>{customer.orderCount}</Text>
                        <Text style={styles.customerStatLabel}>Orders</Text>
                      </View>
                      <View style={styles.customerStat}>
                        <Text style={styles.customerStatValue}>
                          ${customer.totalSpent?.toFixed(2) || '0.00'}
                        </Text>
                        <Text style={styles.customerStatLabel}>Spent</Text>
                      </View>
                      <View style={styles.customerStat}>
                        <Text style={styles.customerStatValue}>
                          {customer.lastOrderDate
                            ? new Date(customer.lastOrderDate).toLocaleDateString()
                            : 'N/A'}
                        </Text>
                        <Text style={styles.customerStatLabel}>Last Order</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          ) : (
            /* Customer Detail View */
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setShowDetail(false)}>
                <Text style={styles.backBtnText}>← Back to Customers</Text>
              </TouchableOpacity>

              {selectedCustomer && (
                <>
                  <View style={styles.detailHeader}>
                    <View style={styles.detailAvatar}>
                      <Text style={styles.detailAvatarText}>
                        {(selectedCustomer.name || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.detailName}>{selectedCustomer.name || 'Unknown'}</Text>
                    <Text style={styles.detailPhone}>📞 {selectedCustomer.phone}</Text>
                    {selectedCustomer.email ? (
                      <Text style={styles.detailEmail}>✉️ {selectedCustomer.email}</Text>
                    ) : null}
                    <TouchableOpacity
                      style={[styles.detailOptInBtn, selectedCustomer.optInMarketing ? styles.optInActive : styles.optInInactive]}
                      onPress={() => handleToggleMarketing(selectedCustomer)}
                    >
                      <Text style={styles.optInText}>
                        {selectedCustomer.optInMarketing ? '✅ Marketing Opted In' : '❌ Marketing Opted Out'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.detailStats}>
                    <View style={styles.detailStatCard}>
                      <Text style={styles.detailStatValue}>{selectedCustomer.orderCount}</Text>
                      <Text style={styles.detailStatLabel}>Total Orders</Text>
                    </View>
                    <View style={styles.detailStatCard}>
                      <Text style={styles.detailStatValue}>
                        ${selectedCustomer.totalSpent?.toFixed(2) || '0.00'}
                      </Text>
                      <Text style={styles.detailStatLabel}>Total Spent</Text>
                    </View>
                    <View style={styles.detailStatCard}>
                      <Text style={styles.detailStatValue}>
                        {selectedCustomer.orderCount > 0
                          ? `$${(selectedCustomer.totalSpent / selectedCustomer.orderCount).toFixed(2)}`
                          : '$0.00'}
                      </Text>
                      <Text style={styles.detailStatLabel}>Avg. Order</Text>
                    </View>
                  </View>

                  {/* Order History */}
                  <Text style={styles.sectionTitle}>Order History</Text>
                  {customerOrders.length === 0 ? (
                    <Text style={styles.emptyText}>No orders found for this customer</Text>
                  ) : (
                    customerOrders.map((order) => (
                      <View key={order._id} style={styles.orderCard}>
                        <View style={styles.orderHeader}>
                          <Text style={styles.orderReceipt}>#{order.receiptNumber}</Text>
                          <Text style={styles.orderDate}>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={styles.orderItems}>
                          {order.items?.slice(0, 3).map((item, i) => (
                            <Text key={i} style={styles.orderItemText}>
                              {item.quantity}x {item.name}
                            </Text>
                          ))}
                          {order.items?.length > 3 && (
                            <Text style={styles.orderMoreText}>+{order.items.length - 3} more items</Text>
                          )}
                        </View>
                        <View style={styles.orderFooter}>
                          <Text style={styles.orderTotal}>${order.total?.toFixed(2)}</Text>
                          <Text style={styles.orderPayment}>{order.paymentMethod}</Text>
                        </View>
                      </View>
                    ))
                  )}

                  {selectedCustomer.notes ? (
                    <View style={styles.notesSection}>
                      <Text style={styles.sectionTitle}>Notes</Text>
                      <Text style={styles.notesText}>{selectedCustomer.notes}</Text>
                    </View>
                  ) : null}
                </>
              )}
            </ScrollView>
          )}
        </Animated.View>
      </Animated.View>
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
    maxHeight: '90%',
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
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchBtn: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchBtnText: {
    fontSize: 18,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  filterBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(221, 155, 29, 0.1)',
  },
  filterText: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: Colors.primary,
  },
  marketingSection: {
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  sectionTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  offerInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sendOfferBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  sendOfferBtnDisabled: {
    opacity: 0.5,
  },
  sendOfferBtnText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  customerCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  customerPhone: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  customerEmail: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  optInBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
  },
  optInActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  optInInactive: {
    backgroundColor: 'rgba(158, 158, 158, 0.15)',
  },
  optInText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  customerStats: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  customerStat: {
    flex: 1,
    alignItems: 'center',
  },
  customerStatValue: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  customerStatLabel: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  backBtn: {
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  backBtnText: {
    fontSize: Typography.body.fontSize,
    color: Colors.primary,
    fontWeight: '600',
  },
  detailHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  detailAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  detailAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#151515',
  },
  detailName: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  detailPhone: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  detailEmail: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  detailOptInBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
  },
  detailStats: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  detailStatCard: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailStatValue: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.primary,
  },
  detailStatLabel: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    marginTop: 2,
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
    marginBottom: Spacing.xs,
  },
  orderReceipt: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.primary,
  },
  orderDate: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
  },
  orderItems: {
    marginBottom: Spacing.xs,
  },
  orderItemText: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textPrimary,
  },
  orderMoreText: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.xs,
  },
  orderTotal: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  orderPayment: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
  },
  notesSection: {
    marginTop: Spacing.md,
  },
  notesText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
});
