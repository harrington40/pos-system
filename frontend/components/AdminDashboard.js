import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, ActivityIndicator, RefreshControl, Dimensions
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../theme';
import { LineChart, BarChart, DonutChart, MetricCard } from './AdminCharts';
import EmployeeManager from './EmployeeManager';
import DiscountManager from './DiscountManager';
import TransactionMonitor from './TransactionMonitor';
import BillManager from './BillManager';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'revenue', label: 'Revenue', icon: '💰' },
  { id: 'inventory', label: 'Inventory', icon: '📦' },
  { id: 'transactions', label: 'Transactions', icon: '📋' },
  { id: 'employees', label: 'Employees', icon: '👥' },
  { id: 'discounts', label: 'Discounts', icon: '🏷️' },
];

/**
 * AdminDashboard — Main admin/manager dashboard
 *
 * Props:
 *   visible: boolean
 *   onClose: () => void
 */
export default function AdminDashboard({ visible, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [dashboard, setDashboard] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [profitData, setProfitData] = useState(null);
  const [turnoverData, setTurnoverData] = useState(null);
  const [staffingData, setStaffingData] = useState(null);
  const [pricingData, setPricingData] = useState(null);
  const [inventoryItems, setInventoryItems] = useState(null);

  // Sub-modals
  const [showEmployeeMgr, setShowEmployeeMgr] = useState(false);
  const [showDiscountMgr, setShowDiscountMgr] = useState(false);
  const [showTransactionMonitor, setShowTransactionMonitor] = useState(false);
  const [showBillMgr, setShowBillMgr] = useState(false);

  const fetchAllData = useCallback(async () => {
    try {
      const [
        dashRes, revRes, catRes, profRes, turnRes, staffRes, priceRes, invRes
      ] = await Promise.all([
        fetch(`${API_URL}/api/admin/dashboard?days=7`),
        fetch(`${API_URL}/api/admin/revenue-chart?days=30`),
        fetch(`${API_URL}/api/admin/category-breakdown?days=30`),
        fetch(`${API_URL}/api/admin/profit-margins`),
        fetch(`${API_URL}/api/admin/inventory-turnover?days=30`),
        fetch(`${API_URL}/api/admin/staffing-suggestions`),
        fetch(`${API_URL}/api/admin/sales-forecast?days=30`),
        fetch(`${API_URL}/api/admin/inventory-items`)
      ]);

      setDashboard(await dashRes.json());
      setRevenueData(await revRes.json());
      setCategoryData(await catRes.json());
      setProfitData(await profRes.json());
      setTurnoverData(await turnRes.json());
      setStaffingData(await staffRes.json());
      const priceJson = await priceRes.json();
      setPricingData(priceJson);
      setInventoryItems(await invRes.json());
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchAllData();
    }
  }, [visible, fetchAllData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  if (!visible) return null;

  const renderOverview = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Metric Cards */}
      <View style={styles.metricsRow}>
        <MetricCard
          title="Period Revenue"
          value={`$${dashboard?.periodRevenue?.toFixed(2) || '0.00'}`}
          subtitle={`${dashboard?.periodOrders || 0} orders`}
          color={Colors.primary}
          icon="💰"
        />
        <MetricCard
          title="Avg Order"
          value={`$${dashboard?.avgOrderValue?.toFixed(2) || '0.00'}`}
          color={Colors.secondary}
          icon="📈"
        />
      </View>
      <View style={styles.metricsRow}>
        <MetricCard
          title="Active Items"
          value={dashboard?.activeItems || 0}
          subtitle={`${dashboard?.lowStockItems || 0} low stock`}
          color={Colors.chartColors[2]}
          icon="🍽️"
        />
        <MetricCard
          title="Employees"
          value={dashboard?.activeEmployees || 0}
          color={Colors.chartColors[3]}
          icon="👥"
        />
      </View>

      {/* Revenue Trend */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Revenue Trend (30d)</Text>
        <Text style={styles.trendIndicator}>
          Trend: {revenueData?.trend === 'up' ? '📈' : revenueData?.trend === 'down' ? '📉' : '➡️'}
          {' '}{revenueData?.trend || 'N/A'} ({revenueData?.slope ? `$${revenueData.slope}/day` : ''})
        </Text>
        {revenueData?.dailyRevenue ? (
          <LineChart
            data={revenueData.dailyRevenue.map(d => ({ value: d.revenue, label: d.date }))}
            width={SCREEN_WIDTH - 64}
            height={160}
          />
        ) : (
          <ActivityIndicator size="small" color={Colors.primary} />
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => setShowEmployeeMgr(true)}>
            <Text style={styles.quickBtnIcon}>👥</Text>
            <Text style={styles.quickBtnText}>Employees</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => setShowDiscountMgr(true)}>
            <Text style={styles.quickBtnIcon}>🏷️</Text>
            <Text style={styles.quickBtnText}>Discounts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => setShowBillMgr(true)}>
            <Text style={styles.quickBtnIcon}>🧾</Text>
            <Text style={styles.quickBtnText}>Bills</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => setActiveTab('revenue')}>
            <Text style={styles.quickBtnIcon}>💰</Text>
            <Text style={styles.quickBtnText}>Revenue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => setActiveTab('inventory')}>
            <Text style={styles.quickBtnIcon}>📦</Text>
            <Text style={styles.quickBtnText}>Inventory</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Staffing Suggestions */}
      {staffingData?.suggestions?.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Staffing Suggestions</Text>
          {staffingData.suggestions.map((s, i) => (
            <View key={i} style={styles.suggestionItem}>
              <View style={[styles.priorityDot, {
                backgroundColor: s.priority === 'high' ? Colors.error : Colors.warning
              }]} />
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionText}>
                  {s.shift} shift: {s.currentStaff} → {s.recommendedStaff} staff
                </Text>
                <Text style={styles.suggestionReason}>{s.reason}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Pricing Suggestions */}
      {pricingData?.pricingSuggestions?.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Pricing Suggestions</Text>
          {pricingData.pricingSuggestions.slice(0, 3).map((p, i) => (
            <View key={i} style={styles.pricingItem}>
              <Text style={styles.pricingName}>{p.name}</Text>
              <Text style={styles.pricingChange}>
                ${p.currentPrice.toFixed(2)} → ${p.suggestedPrice.toFixed(2)}
              </Text>
              <Text style={styles.pricingReason}>{p.reason}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderRevenue = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Revenue Chart */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Daily Revenue</Text>
        {revenueData?.dailyRevenue ? (
          <LineChart
            data={revenueData.dailyRevenue.map(d => ({ value: d.revenue, label: d.date }))}
            width={SCREEN_WIDTH - 64}
            height={200}
          />
        ) : <ActivityIndicator size="small" color={Colors.primary} />}
      </View>

      {/* 7-Day Moving Average */}
      {revenueData?.movingAvg?.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>7-Day Moving Average</Text>
          <LineChart
            data={revenueData.movingAvg.map(d => ({ value: d.avg, label: d.date }))}
            width={SCREEN_WIDTH - 64}
            height={140}
            color={Colors.secondary}
            fillColor="rgba(83, 231, 157, 0.1)"
          />
        </View>
      )}

      {/* Forecast */}
      {revenueData?.forecast?.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>7-Day Forecast</Text>
          <BarChart
            data={revenueData.forecast.map(d => ({ value: d.predictedRevenue, label: d.date }))}
            width={SCREEN_WIDTH - 64}
            height={160}
          />
        </View>
      )}

      {/* Category Breakdown */}
      {categoryData?.categories?.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          <DonutChart
            data={categoryData.categories.map(c => ({ value: c.revenue, label: c.category }))}
            size={140}
          />
        </View>
      )}
    </ScrollView>
  );

  // ── Helper: get category color ──
  const getCatColor = (cat) => {
    const map = {
      breakfast: Colors.categoryBreakfast,
      lunch: Colors.categoryLunch,
      dinner: Colors.categoryDinner,
      drinks: Colors.categoryDrinks,
      desserts: Colors.categoryDesserts,
    };
    return map[cat] || Colors.primary;
  };

  // ── Helper: get stock status color ──
  const getStockColor = (status) => {
    switch (status) {
      case 'out': return Colors.error;
      case 'low': return Colors.warning;
      default: return Colors.success;
    }
  };

  const renderInventory = () => {
    const inv = inventoryItems;
    const summary = inv?.summary;
    const items = inv?.items || [];

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Premium Summary Cards Row ── */}
        {summary && (
          <View style={styles.invSummaryRow}>
            <View style={[styles.invSummaryCard, { backgroundColor: 'rgba(221, 155, 29, 0.12)', borderColor: 'rgba(221, 155, 29, 0.3)' }]}>
              <Text style={styles.invSummaryIcon}>📦</Text>
              <Text style={styles.invSummaryValue}>{summary.totalItems}</Text>
              <Text style={styles.invSummaryLabel}>Total Items</Text>
            </View>
            <View style={[styles.invSummaryCard, { backgroundColor: 'rgba(76, 175, 80, 0.12)', borderColor: 'rgba(76, 175, 80, 0.3)' }]}>
              <Text style={styles.invSummaryIcon}>💰</Text>
              <Text style={[styles.invSummaryValue, { color: Colors.success }]}>${(summary.totalValue || 0).toFixed(0)}</Text>
              <Text style={styles.invSummaryLabel}>Stock Value</Text>
            </View>
            <View style={[styles.invSummaryCard, { backgroundColor: 'rgba(255, 152, 0, 0.12)', borderColor: 'rgba(255, 152, 0, 0.3)' }]}>
              <Text style={styles.invSummaryIcon}>⚠️</Text>
              <Text style={[styles.invSummaryValue, { color: Colors.warning }]}>{summary.lowStock}</Text>
              <Text style={styles.invSummaryLabel}>Low Stock</Text>
            </View>
            <View style={[styles.invSummaryCard, { backgroundColor: 'rgba(255, 82, 82, 0.12)', borderColor: 'rgba(255, 82, 82, 0.3)' }]}>
              <Text style={styles.invSummaryIcon}>🚫</Text>
              <Text style={[styles.invSummaryValue, { color: Colors.error }]}>{summary.outOfStock}</Text>
              <Text style={styles.invSummaryLabel}>Out of Stock</Text>
            </View>
          </View>
        )}

        {/* ── Profit Margins ── */}
        {profitData && (
          <View style={styles.sectionCard}>
            <View style={styles.invSectionHeader}>
              <Text style={styles.sectionTitle}>📈 Profit Margins</Text>
              <View style={styles.invSectionBadge}>
                <Text style={styles.invSectionBadgeText}>{profitData.items?.length || 0} items</Text>
              </View>
            </View>
            <View style={styles.metricsRow}>
              <MetricCard
                title="Avg Margin"
                value={`${profitData.averageMargin?.toFixed(1) || 0}%`}
                color={Colors.primary}
              />
              <MetricCard
                title="Total Profit"
                value={`$${profitData.totalProfit?.toFixed(2) || '0.00'}`}
                color={Colors.success}
              />
            </View>
            {profitData.topPerformer && (
              <View style={styles.invTopPerformer}>
                <Text style={styles.invTopPerformerIcon}>🏆</Text>
                <View style={styles.invTopPerformerInfo}>
                  <Text style={styles.invTopPerformerName}>{profitData.topPerformer.name}</Text>
                  <Text style={styles.invTopPerformerDetail}>{profitData.topPerformer.margin.toFixed(1)}% margin · ${profitData.topPerformer.profitPerUnit.toFixed(2)}/unit</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Inventory Turnover ── */}
        {turnoverData?.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.invSectionHeader}>
              <Text style={styles.sectionTitle}>🔄 Inventory Turnover</Text>
            </View>
            <BarChart
              data={turnoverData.slice(0, 8).map(t => ({ value: t.turnoverRate, label: t.name }))}
              width={SCREEN_WIDTH - 64}
              height={180}
            />
            <View style={styles.turnoverLegend}>
              <Text style={styles.legendLabel}>{'🟢 High (>3)  ·  🟡 Medium (1-3)  ·  🔴 Low (<1)'}</Text>
            </View>
          </View>
        )}

        {/* ── Low Stock Alert Banner ── */}
        {summary?.lowStock > 0 && (
          <View style={styles.invAlertBanner}>
            <Text style={styles.invAlertIcon}>⚠️</Text>
            <View style={styles.invAlertContent}>
              <Text style={styles.invAlertTitle}>Low Stock Alert</Text>
              <Text style={styles.invAlertDesc}>
                {summary.lowStock} item{summary.lowStock > 1 ? 's' : ''} below threshold
                {summary.outOfStock > 0 ? ` · ${summary.outOfStock} out of stock` : ''}
              </Text>
            </View>
          </View>
        )}

        {/* ── Premium Inventory Item Cards ── */}
        {items.length > 0 && (
          <>
            <View style={styles.invSectionHeader}>
              <Text style={styles.sectionTitle}>📋 All Inventory Items</Text>
              <Text style={styles.invCount}>{items.length} items</Text>
            </View>
            {items.map((item) => {
              const catColor = getCatColor(item.category);
              const stockColor = getStockColor(item.status);
              const barWidth = Math.min(100, Math.max(2, item.stockPct || 0));

              return (
                <View key={item._id} style={styles.invItemCard}>
                  {/* Top row: name + status badge */}
                  <View style={styles.invItemTop}>
                    <View style={styles.invItemNameRow}>
                      <View style={[styles.invCategoryDot, { backgroundColor: catColor }]} />
                      <Text style={styles.invItemName}>{item.name}</Text>
                    </View>
                    <View style={[styles.invStatusBadge, {
                      backgroundColor: item.status === 'out' ? 'rgba(255,82,82,0.15)' :
                        item.status === 'low' ? 'rgba(255,152,0,0.15)' : 'rgba(76,175,80,0.15)',
                      borderColor: item.status === 'out' ? 'rgba(255,82,82,0.3)' :
                        item.status === 'low' ? 'rgba(255,152,0,0.3)' : 'rgba(76,175,80,0.3)',
                    }]}>
                      <Text style={[styles.invStatusText, { color: stockColor }]}>
                        {item.status === 'out' ? 'OUT' : item.status === 'low' ? 'LOW' : 'OK'}
                      </Text>
                    </View>
                  </View>

                  {/* Category + Price row */}
                  <View style={styles.invItemMeta}>
                    <View style={[styles.invCatPill, { backgroundColor: catColor + '20', borderColor: catColor + '40' }]}>
                      <Text style={[styles.invCatPillText, { color: catColor }]}>{item.category}</Text>
                    </View>
                    <Text style={styles.invItemPrice}>${item.price.toFixed(2)}</Text>
                  </View>

                  {/* Stock bar */}
                  <View style={styles.invStockBarBg}>
                    <View style={[styles.invStockBarFill, {
                      width: `${barWidth}%`,
                      backgroundColor: item.status === 'out' ? Colors.error :
                        item.status === 'low' ? Colors.warning : Colors.success,
                    }]} />
                  </View>

                  {/* Stock details row */}
                  <View style={styles.invItemDetails}>
                    <View style={styles.invDetailItem}>
                      <Text style={styles.invDetailLabel}>Stock</Text>
                      <Text style={[styles.invDetailValue, { color: stockColor }]}>
                        {item.stock}
                        <Text style={styles.invDetailMuted}> / {item.lowStockThreshold}</Text>
                      </Text>
                    </View>
                    <View style={styles.invDetailItem}>
                      <Text style={styles.invDetailLabel}>Sold</Text>
                      <Text style={styles.invDetailValue}>{item.sold}</Text>
                    </View>
                    <View style={styles.invDetailItem}>
                      <Text style={styles.invDetailLabel}>Margin</Text>
                      <Text style={[styles.invDetailValue, {
                        color: item.margin >= 30 ? Colors.success : item.margin >= 15 ? Colors.warning : Colors.error
                      }]}>{item.margin}%</Text>
                    </View>
                    <View style={styles.invDetailItem}>
                      <Text style={styles.invDetailLabel}>Cost</Text>
                      <Text style={styles.invDetailValue}>${item.costPrice.toFixed(2)}</Text>
                    </View>
                  </View>

                  {/* Barcode display if available */}
                  {item.barcode ? (
                    <View style={styles.invBarcodeRow}>
                      <Text style={styles.invBarcodeText}>{item.barcode}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'revenue': return renderRevenue();
      case 'inventory': return renderInventory();
      case 'transactions':
        return (
          <View style={styles.tabPlaceholder}>
            <TransactionMonitor visible={showTransactionMonitor || activeTab === 'transactions'} onClose={() => setShowTransactionMonitor(false)} />
          </View>
        );
      case 'employees':
        return (
          <View style={styles.tabPlaceholder}>
            <EmployeeManager visible={showEmployeeMgr || activeTab === 'employees'} onClose={() => setShowEmployeeMgr(false)} />
          </View>
        );
      case 'discounts':
        return (
          <View style={styles.tabPlaceholder}>
            <DiscountManager visible={showDiscountMgr || activeTab === 'discounts'} onClose={() => { setShowDiscountMgr(false); setActiveTab('overview'); }} />
          </View>
        );
      default: return renderOverview();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Admin Dashboard</Text>
              <Text style={styles.subtitle}>Smart Analytics & Management</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tab Bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading dashboard data...</Text>
            </View>
          ) : (
            renderTabContent()
          )}

          {/* Sub-modals */}
          <EmployeeManager visible={showEmployeeMgr} onClose={() => setShowEmployeeMgr(false)} />
          <DiscountManager visible={showDiscountMgr} onClose={() => { setShowDiscountMgr(false); setActiveTab('overview'); }} />
          <BillManager visible={showBillMgr} onClose={() => setShowBillMgr(false)} employeeId={null} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.adminBg || '#0d0d0d',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    height: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    ...Typography.adminTitle,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.captionSmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.round,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 18,
    color: Colors.textMuted,
  },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabBarContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm,
    gap: Spacing.xs,
  },
  tabActive: {
    backgroundColor: Colors.primaryGlow,
  },
  tabIcon: {
    fontSize: 14,
  },
  tabLabel: {
    ...Typography.captionSmall,
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.huge,
    gap: Spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  sectionCard: {
    backgroundColor: Colors.adminCard || Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.adminCardBorder || Colors.border,
    ...Shadows.adminCard,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  trendIndicator: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    minWidth: '45%',
    flex: 1,
  },
  quickBtnIcon: {
    fontSize: 18,
  },
  quickBtnText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceDark,
    borderRadius: BorderRadius.sm,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  suggestionReason: {
    ...Typography.captionSmall,
    color: Colors.textMuted,
    marginTop: 2,
  },
  pricingItem: {
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceDark,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  pricingName: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  pricingChange: {
    ...Typography.captionSmall,
    color: Colors.primary,
    marginTop: 2,
  },
  pricingReason: {
    ...Typography.captionSmall,
    color: Colors.textMuted,
    marginTop: 2,
  },
  topPerformer: {
    ...Typography.bodySmall,
    color: Colors.success,
    marginTop: Spacing.sm,
  },
  turnoverLegend: {
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  legendLabel: {
    ...Typography.captionSmall,
    color: Colors.textMuted,
  },
  lowStockText: {
    ...Typography.body,
    color: Colors.error,
  },
  tabPlaceholder: {
    flex: 1,
  },

  // ── Premium Inventory Styles ──
  invSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  invSummaryCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  invSummaryIcon: {
    fontSize: 22,
  },
  invSummaryValue: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  invSummaryLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  invSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  invSectionBadge: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.round,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  invSectionBadgeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  invCount: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  invTopPerformer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.15)',
  },
  invTopPerformerIcon: {
    fontSize: 24,
  },
  invTopPerformerInfo: {
    flex: 1,
  },
  invTopPerformerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.success,
  },
  invTopPerformerDetail: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  invAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.25)',
  },
  invAlertIcon: {
    fontSize: 28,
  },
  invAlertContent: {
    flex: 1,
  },
  invAlertTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.warning,
  },
  invAlertDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  invItemCard: {
    backgroundColor: Colors.adminCard || Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.adminCardBorder || Colors.border,
    marginBottom: Spacing.sm,
    ...Shadows.adminCard,
  },
  invItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  invCategoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  invItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  invStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
  },
  invStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  invItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  invCatPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
  },
  invCatPillText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  invItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  invStockBarBg: {
    height: 6,
    backgroundColor: Colors.surfaceDark,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  invStockBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  invItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  invDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  invDetailLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  invDetailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  invDetailMuted: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '400',
  },
  invBarcodeRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  invBarcodeText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
});
