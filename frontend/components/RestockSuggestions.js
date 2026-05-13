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
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';

const API_URL = Platform.OS === 'web'
  ? 'http://localhost:5001'
  : 'http://10.0.2.2:5001';

export default function RestockSuggestions({ visible, onClose }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salesSummary, setSalesSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('suggestions');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [suggestionsRes, salesRes] = await Promise.all([
        fetch(`${API_URL}/api/analytics/restock-suggestions`),
        fetch(`${API_URL}/api/analytics/sales-summary?days=7`),
      ]);

      const suggestionsData = await suggestionsRes.json();
      const salesData = await salesRes.json();

      // API returns array directly (not wrapped in { suggestions: [...] })
      setSuggestions(Array.isArray(suggestionsData) ? suggestionsData : suggestionsData.suggestions || []);
      setSalesSummary(salesData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) fetchData();
  }, [visible, fetchData]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return Colors.textSecondary;
    }
  };

  const renderSuggestion = ({ item }) => {
    // API returns data with nested item object: { item: { name, category, stock, ... }, avgDailySales, ... }
    const itemData = item.item || item;
    return (
      <View style={styles.suggestionCard}>
        <View style={styles.suggestionHeader}>
          <View style={styles.suggestionInfo}>
            <Text style={styles.suggestionName}>{itemData.name || item.name}</Text>
            <Text style={styles.suggestionCategory}>{itemData.category || ''}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
            <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
              {item.priority.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Current Stock</Text>
            <Text style={[styles.statValue, (itemData.stock || 0) === 0 && { color: '#F44336' }]}>
              {itemData.stock ?? 'N/A'}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Avg Daily Sales</Text>
            <Text style={styles.statValue}>{item.avgDailySales?.toFixed(1)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Reorder Point</Text>
            <Text style={styles.statValue}>{item.reorderPoint}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Stockout In</Text>
            <Text style={[styles.statValue, (item.daysUntilStockout || 0) <= 3 && { color: '#F44336' }]}>
              {item.daysUntilStockout !== null && item.daysUntilStockout !== undefined
                ? `${Math.round(item.daysUntilStockout)} days`
                : 'N/A'}
            </Text>
          </View>
        </View>

        <View style={styles.suggestionFooter}>
          <Text style={styles.suggestQty}>
            Suggested: <Text style={styles.suggestQtyValue}>{item.suggestedRestockQty} units</Text>
          </Text>
        </View>
      </View>
    );
  };

  const renderSalesSummary = () => {
    if (!salesSummary) return null;
    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>${salesSummary.totalRevenue?.toFixed(2) || '0.00'}</Text>
            <Text style={styles.summaryLabel}>Revenue (7 days)</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{salesSummary.totalOrders || 0}</Text>
            <Text style={styles.summaryLabel}>Orders</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{salesSummary.totalItems || 0}</Text>
            <Text style={styles.summaryLabel}>Items Sold</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              ${salesSummary.averageOrderValue?.toFixed(2) || '0.00'}
            </Text>
            <Text style={styles.summaryLabel}>Avg Order</Text>
          </View>
        </View>
      </View>
    );
  };

  const TABS = [
    { key: 'suggestions', label: 'Restock Suggestions' },
    { key: 'summary', label: 'Sales Summary' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Analytics</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : activeTab === 'summary' ? (
            <FlatList
              data={[]}
              renderItem={null}
              ListHeaderComponent={renderSalesSummary}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          ) : suggestions.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>Well Stocked!</Text>
              <Text style={styles.emptyText}>All items have sufficient inventory levels.</Text>
            </View>
          ) : (
            <FlatList
              data={suggestions}
              renderItem={renderSuggestion}
              keyExtractor={(item, index) => item.name || index.toString()}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
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
  tabs: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#151515',
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  list: {
    padding: Spacing.md,
  },
  suggestionCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  suggestionCategory: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textMuted,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  stat: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  suggestionFooter: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  suggestQty: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
  },
  suggestQtyValue: {
    color: Colors.primary,
    fontWeight: '700',
  },
  summaryContainer: {
    padding: Spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
