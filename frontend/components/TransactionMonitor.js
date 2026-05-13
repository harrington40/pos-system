import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, ActivityIndicator, RefreshControl, Dimensions, Animated,
  TextInput, FlatList,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TYPE_CONFIG = {
  pos: {
    label: 'POS',
    icon: '💳',
    color: '#4CAF50',
    bgColor: 'rgba(76, 175, 80, 0.12)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  mobile_money: {
    label: 'Mobile Money',
    icon: '📱',
    color: '#FF9800',
    bgColor: 'rgba(255, 152, 0, 0.12)',
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  order: {
    label: 'Order',
    icon: '🧾',
    color: '#2196F3',
    bgColor: 'rgba(33, 150, 243, 0.12)',
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
};

const STATE_COLORS = {
  NEW: { color: '#9E9E9E', bg: 'rgba(158,158,158,0.15)' },
  IN_PROGRESS: { color: '#2196F3', bg: 'rgba(33,150,243,0.15)' },
  PAYMENT_IN_PROGRESS: { color: '#FF9800', bg: 'rgba(255,152,0,0.15)' },
  COMPLETED: { color: '#4CAF50', bg: 'rgba(76,175,80,0.15)' },
  ON_HOLD: { color: '#FF5722', bg: 'rgba(255,87,34,0.15)' },
  FAILED: { color: '#F44336', bg: 'rgba(244,67,54,0.15)' },
  CANCELLED: { color: '#9E9E9E', bg: 'rgba(158,158,158,0.15)' },
  AWAITING_PAYMENT: { color: '#FF9800', bg: 'rgba(255,152,0,0.15)' },
  PENDING: { color: '#2196F3', bg: 'rgba(33,150,243,0.15)' },
  CONFIRMED: { color: '#4CAF50', bg: 'rgba(76,175,80,0.15)' },
  VERIFIED: { color: '#009688', bg: 'rgba(0,150,136,0.15)' },
  DISPUTED: { color: '#F44336', bg: 'rgba(244,67,54,0.15)' },
  completed: { color: '#4CAF50', bg: 'rgba(76,175,80,0.15)' },
  refunded: { color: '#F44336', bg: 'rgba(244,67,54,0.15)' },
  cancelled: { color: '#9E9E9E', bg: 'rgba(158,158,158,0.15)' },
};

const FILTER_TABS = [
  { id: 'all', label: 'All', icon: '📋' },
  { id: 'pos', label: 'POS', icon: '💳' },
  { id: 'mobile_money', label: 'Mobile Money', icon: '📱' },
  { id: 'order', label: 'Orders', icon: '🧾' },
];

const TIME_FILTERS = [
  { id: 1, label: '24h' },
  { id: 7, label: '7 days' },
  { id: 30, label: '30 days' },
  { id: 90, label: '90 days' },
];

export default function TransactionMonitor({ visible, onClose }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState(7);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
      fetchData();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        days: timeFilter,
        limit: 100,
      });
      if (activeFilter !== 'all') params.set('type', activeFilter);
      const res = await fetch(`${API_URL}/api/admin/transactions?${params}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('[TransactionMonitor] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchData();
    }
  }, [activeFilter, timeFilter, visible]);

  const getStateStyle = (state) => {
    return STATE_COLORS[state] || { color: '#9E9E9E', bg: 'rgba(158,158,158,0.15)' };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '\u2014';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatAmount = (amount, currency) => {
    if (!amount && amount !== 0) return '\u2014';
    const sym = currency === 'XAF' ? 'FCFA' : '$';
    return `${sym}${Number(amount).toLocaleString()}`;
  };

  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'orange': return '\uD83D\uDFE0';
      case 'mtn': return '\uD83D\uDFE1';
      default: return '\uD83D\uDCF1';
    }
  };

  const renderDetailModal = () => {
    if (!selectedTx) return null;
    const tx = selectedTx;
    const typeCfg = TYPE_CONFIG[tx.type] || {};
    const stateStyle = getStateStyle(tx.state);

    return (
      <Modal visible={!!selectedTx} animationType="fade" transparent>
        <View style={styles.detailOverlay}>
          <View style={styles.detailModal}>
            <View style={styles.detailHeader}>
              <View style={[styles.detailTypeBadge, {
                backgroundColor: typeCfg.bgColor,
                borderColor: typeCfg.borderColor,
              }]}>
                <Text style={styles.detailTypeIcon}>{typeCfg.icon}</Text>
                <Text style={[styles.detailTypeLabel, { color: typeCfg.color }]}>
                  {typeCfg.label}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTx(null)} style={styles.detailClose}>
                <Text style={styles.detailCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.detailRefRow}>
              <Text style={styles.detailRefLabel}>Reference</Text>
              <Text style={styles.detailRefValue}>{tx.transactionRef || 'N/A'}</Text>
            </View>
            <View style={[styles.detailStateBadge, {
              backgroundColor: stateStyle.bg,
              borderColor: stateStyle.color + '40',
            }]}>
              <View style={[styles.detailStateDot, { backgroundColor: stateStyle.color }]} />
              <Text style={[styles.detailStateText, { color: stateStyle.color }]}>
                {tx.state}
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Transaction Details</Text>
              <View style={styles.detailGrid}>
                <DetailRow label="Amount" value={formatAmount(tx.amount, tx.currency)} highlight />
                {tx.currency && <DetailRow label="Currency" value={tx.currency} />}
                {tx.paymentMethod && <DetailRow label="Payment Method" value={tx.paymentMethod} />}
                {tx.provider && (
                  <DetailRow label="Provider" value={`${getProviderIcon(tx.provider)} ${tx.provider.toUpperCase()}`} />
                )}
                {tx.phone && <DetailRow label="Phone" value={tx.phone} />}
                {tx.items !== undefined && <DetailRow label="Items" value={`${tx.items} item(s)`} />}
                {tx.initiationMode && <DetailRow label="Mode" value={tx.initiationMode.replace(/_/g, ' ')} />}
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Timeline</Text>
              <View style={styles.timeline}>
                <TimelineItem label="Created" date={tx.createdAt} isFirst />
                {tx.startedAt && <TimelineItem label="Started" date={tx.startedAt} />}
                {tx.initiatedAt && <TimelineItem label="Initiated" date={tx.initiatedAt} />}
                {tx.confirmedAt && <TimelineItem label="Confirmed" date={tx.confirmedAt} />}
                {tx.verifiedAt && <TimelineItem label="Verified" date={tx.verifiedAt} />}
                {tx.completedAt && <TimelineItem label="Completed" date={tx.completedAt} />}
                {tx.onHoldAt && <TimelineItem label="On Hold" date={tx.onHoldAt} />}
                {tx.failedAt && <TimelineItem label="Failed" date={tx.failedAt} />}
              </View>
            </View>

            {(tx.initiatedBy || tx.verifiedBy) && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>People</Text>
                {tx.initiatedBy && <DetailRow label="Initiated By" value={tx.initiatedBy} />}
                {tx.verifiedBy && <DetailRow label="Verified By" value={tx.verifiedBy} />}
              </View>
            )}

            {tx.lastError && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Errors</Text>
                <View style={styles.errorCard}>
                  <Text style={styles.errorCardText}>{tx.lastError}</Text>
                </View>
                {tx.errorLog?.length > 0 && (
                  <Text style={styles.errorCount}>{tx.errorLog.length} error(s) logged</Text>
                )}
              </View>
            )}

            {tx.refunded && (
              <View style={[styles.detailSection, { backgroundColor: 'rgba(244,67,54,0.05)', borderRadius: BorderRadius.sm, padding: Spacing.sm }]}>
                <Text style={[styles.detailSectionTitle, { color: '#F44336' }]}>⚠️ Refunded</Text>
              </View>
            )}

            <TouchableOpacity style={styles.detailDoneBtn} onPress={() => setSelectedTx(null)}>
              <Text style={styles.detailDoneBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderSummary = () => {
    if (!data?.summary) return null;
    const s = data.summary;
    return (
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: 'rgba(76, 175, 80, 0.1)', borderColor: 'rgba(76, 175, 80, 0.25)' }]}>
          <Text style={styles.summaryIcon}>💰</Text>
          <Text style={styles.summaryValue}>{formatAmount(s.totalRevenue)}</Text>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: 'rgba(33, 150, 243, 0.1)', borderColor: 'rgba(33, 150, 243, 0.25)' }]}>
          <Text style={styles.summaryIcon}>📊</Text>
          <Text style={styles.summaryValue}>{s.total}</Text>
          <Text style={styles.summaryLabel}>Transactions</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: 'rgba(255, 152, 0, 0.1)', borderColor: 'rgba(255, 152, 0, 0.25)' }]}>
          <Text style={styles.summaryIcon}>⏳</Text>
          <Text style={styles.summaryValue}>{s.pendingVerifications}</Text>
          <Text style={styles.summaryLabel}>Pending Verify</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: 'rgba(244, 67, 54, 0.1)', borderColor: 'rgba(244, 67, 54, 0.25)' }]}>
          <Text style={styles.summaryIcon}>❌</Text>
          <Text style={styles.summaryValue}>{s.failed}</Text>
          <Text style={styles.summaryLabel}>Failed</Text>
        </View>
      </View>
    );
  };

  const renderTypeBreakdown = () => {
    if (!data?.summary) return null;
    const s = data.summary;
    const types = [
      { id: 'pos', label: 'POS', count: s.pos, color: TYPE_CONFIG.pos.color, bg: TYPE_CONFIG.pos.bgColor },
      { id: 'mobile_money', label: 'Mobile Money', count: s.mobile_money, color: TYPE_CONFIG.mobile_money.color, bg: TYPE_CONFIG.mobile_money.bgColor },
      { id: 'order', label: 'Orders', count: s.order, color: TYPE_CONFIG.order.color, bg: TYPE_CONFIG.order.bgColor },
    ];
    const maxCount = Math.max(...types.map(t => t.count), 1);

    return (
      <View style={styles.breakdownCard}>
        <Text style={styles.breakdownTitle}>Transaction Breakdown</Text>
        {types.map(t => (
          <View key={t.id} style={styles.breakdownRow}>
            <View style={[styles.breakdownDot, { backgroundColor: t.color }]} />
            <Text style={styles.breakdownLabel}>{t.label}</Text>
            <View style={styles.breakdownBarBg}>
              <View style={[styles.breakdownBarFill, {
                width: `${(t.count / maxCount) * 100}%`,
                backgroundColor: t.color,
              }]} />
            </View>
            <Text style={[styles.breakdownCount, { color: t.color }]}>{t.count}</Text>
          </View>
        ))}
      </View>
    );
  };

  const filteredTransactions = data?.transactions || [];

  const searchedTransactions = searchQuery
    ? filteredTransactions.filter(tx => {
        const q = searchQuery.toLowerCase();
        return (
          (tx.transactionRef && tx.transactionRef.toLowerCase().includes(q)) ||
          (tx.phone && tx.phone.includes(q)) ||
          (tx.initiatedBy && tx.initiatedBy.toLowerCase().includes(q)) ||
          (tx.paymentMethod && tx.paymentMethod.toLowerCase().includes(q)) ||
          (tx.provider && tx.provider.toLowerCase().includes(q))
        );
      })
    : filteredTransactions;

  const renderTransaction = ({ item: tx }) => {
    const typeCfg = TYPE_CONFIG[tx.type] || {};
    const stateStyle = getStateStyle(tx.state);

    return (
      <TouchableOpacity
        style={styles.txCard}
        onPress={() => setSelectedTx(tx)}
        activeOpacity={0.7}
      >
        <View style={styles.txTop}>
          <View style={[styles.txTypeBadge, {
            backgroundColor: typeCfg.bgColor,
            borderColor: typeCfg.borderColor,
          }]}>
            <Text style={styles.txTypeIcon}>{typeCfg.icon}</Text>
            <Text style={[styles.txTypeLabel, { color: typeCfg.color }]}>{typeCfg.label}</Text>
          </View>
          <View style={[styles.txStateBadge, {
            backgroundColor: stateStyle.bg,
            borderColor: stateStyle.color + '40',
          }]}>
            <View style={[styles.txStateDot, { backgroundColor: stateStyle.color }]} />
            <Text style={[styles.txStateText, { color: stateStyle.color }]}>
              {tx.state?.replace(/_/g, ' ')}
            </Text>
          </View>
          <Text style={styles.txTime}>{formatDate(tx.createdAt)}</Text>
        </View>

        <View style={styles.txMiddle}>
          <View style={styles.txRefRow}>
            <Text style={styles.txRefLabel}>Ref:</Text>
            <Text style={styles.txRefValue}>{tx.transactionRef || 'N/A'}</Text>
          </View>
          <Text style={styles.txAmount}>{formatAmount(tx.amount, tx.currency)}</Text>
        </View>

        <View style={styles.txBottom}>
          {tx.provider && (
            <Text style={styles.txMeta}>{getProviderIcon(tx.provider)} {tx.provider.toUpperCase()}</Text>
          )}
          {tx.phone && <Text style={styles.txMeta}>📞 {tx.phone}</Text>}
          {tx.paymentMethod && (
            <Text style={styles.txMeta}>
              {tx.paymentMethod === 'orange_money' ? '🟠 Orange' :
               tx.paymentMethod === 'mtn_money' ? '🟡 MTN' :
               tx.paymentMethod === 'cash' ? '💵 Cash' :
               tx.paymentMethod === 'card' ? '💳 Card' : tx.paymentMethod}
            </Text>
          )}
          {tx.items !== undefined && <Text style={styles.txMeta}>📦 {tx.items} items</Text>}
          {tx.initiatedBy && <Text style={styles.txMeta}>👤 {tx.initiatedBy}</Text>}
          {tx.refunded && <Text style={[styles.txMeta, { color: '#F44336' }]}>⚠️ Refunded</Text>}
        </View>

        <View style={styles.txChevron}>
          <Text style={styles.txChevronText}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.modal, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerIcon}>📊</Text>
              <View>
                <Text style={styles.title}>Transaction Monitor</Text>
                <Text style={styles.subtitle}>Real-time unified transaction feed</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by ref, phone, name..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
                <Text style={styles.searchClearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeFilterBar} contentContainerStyle={styles.timeFilterContent}>
            {TIME_FILTERS.map(tf => (
              <TouchableOpacity
                key={tf.id}
                style={[styles.timeFilterBtn, timeFilter === tf.id && styles.timeFilterBtnActive]}
                onPress={() => setTimeFilter(tf.id)}
              >
                <Text style={[styles.timeFilterText, timeFilter === tf.id && styles.timeFilterTextActive]}>
                  {tf.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
            {FILTER_TABS.map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.filterTab, activeFilter === tab.id && styles.filterTabActive]}
                onPress={() => setActiveFilter(tab.id)}
              >
                <Text style={styles.filterIcon}>{tab.icon}</Text>
                <Text style={[styles.filterLabel, activeFilter === tab.id && styles.filterLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : (
            <FlatList
              data={searchedTransactions}
              keyExtractor={(item) => item._id}
              renderItem={renderTransaction}
              ListHeaderComponent={
                <>
                  {renderSummary()}
                  {renderTypeBreakdown()}
                  {searchedTransactions.length > 0 && (
                    <View style={styles.countBar}>
                      <Text style={styles.countText}>
                        Showing {searchedTransactions.length} of {data?.summary?.total || 0} transactions
                      </Text>
                    </View>
                  )}
                </>
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📭</Text>
                  <Text style={styles.emptyTitle}>No transactions found</Text>
                  <Text style={styles.emptyDesc}>
                    {searchQuery ? 'Try a different search term' : 'No transactions in this period'}
                  </Text>
                </View>
              }
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />}
              showsVerticalScrollIndicator={false}
            />
          )}

          {renderDetailModal()}
        </Animated.View>
      </View>
    </Modal>
  );
}

const DetailRow = ({ label, value, highlight }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailRowLabel}>{label}</Text>
    <Text style={[styles.detailRowValue, highlight && styles.detailRowValueHighlight]}>
      {value || '\u2014'}
    </Text>
  </View>
);

const TimelineItem = ({ label, date, isFirst }) => (
  <View style={styles.timelineItem}>
    <View style={styles.timelineLine}>
      <View style={[styles.timelineDot, isFirst && styles.timelineDotActive]} />
      {!isFirst && <View style={styles.timelineConnector} />}
    </View>
    <View style={styles.timelineContent}>
      <Text style={styles.timelineLabel}>{label}</Text>
      <Text style={styles.timelineDate}>
        {date ? new Date(date).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : '\u2014'}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#0d0d0d',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '94%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 42,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    height: '100%',
  },
  searchClear: {
    padding: 4,
  },
  searchClearText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  timeFilterBar: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  timeFilterContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  timeFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  timeFilterBtnActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  timeFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  timeFilterTextActive: {
    color: '#4CAF50',
  },
  filterBar: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  filterIcon: {
    fontSize: 13,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  filterLabelActive: {
    color: '#4CAF50',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryIcon: {
    fontSize: 20,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  summaryLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    width: 100,
  },
  breakdownBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownCount: {
    fontSize: 14,
    fontWeight: '800',
    width: 40,
    textAlign: 'right',
  },
  countBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  countText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  listContent: {
    paddingBottom: 40,
  },
  txCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  txTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  txTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  txTypeIcon: {
    fontSize: 11,
  },
  txTypeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  txStateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  txStateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  txStateText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },
  txTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    marginLeft: 'auto',
    fontWeight: '500',
  },
  txMiddle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  txRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  txRefLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
  txRefValue: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    fontFamily: 'monospace',
    letterSpacing: 0.3,
  },
  txAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#4CAF50',
    letterSpacing: -0.3,
  },
  txBottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  txMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  txChevron: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -10,
  },
  txChevronText: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.15)',
    fontWeight: '300',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  emptyDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  // ── Detail Modal ──
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  detailModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  detailTypeIcon: {
    fontSize: 14,
  },
  detailTypeLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  detailClose: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailCloseText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  detailRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  detailRefLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
  detailRefValue: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  detailStateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  detailStateDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  detailStateText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  detailGrid: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  detailRowLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  detailRowValue: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  detailRowValueHighlight: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '800',
  },
  timeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  timelineLine: {
    alignItems: 'center',
    width: 12,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  timelineDotActive: {
    backgroundColor: '#4CAF50',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineConnector: {
    width: 1,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    minHeight: 20,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 12,
  },
  timelineLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  timelineDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
  },
  errorCard: {
    backgroundColor: 'rgba(244,67,54,0.08)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.2)',
  },
  errorCardText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '500',
  },
  errorCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 4,
  },
  detailDoneBtn: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    marginTop: 4,
  },
  detailDoneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
});