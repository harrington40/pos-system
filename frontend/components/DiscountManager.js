import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput,
  Modal, Alert, ActivityIndicator, ScrollView, Switch, Platform
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../theme';
import QRCodeDisplay from './QRCodeDisplay';
import BarcodeDisplay from './BarcodeDisplay';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';

const DISCOUNT_TYPES = [
  { id: 'percentage', label: '% Off', icon: '%' },
  { id: 'fixed', label: '$ Off', icon: '$' },
  { id: 'bogo', label: 'BOGO', icon: '2×1' },
];

const SALE_TYPES = [
  { id: 'happy-hour', label: 'Happy Hour', color: '#FF9A76' },
  { id: 'weekly', label: 'Weekly', color: '#53E79D' },
  { id: 'seasonal', label: 'Seasonal', color: '#E040FB' },
  { id: 'flash', label: 'Flash Sale', color: '#FF5252' },
  { id: 'clearance', label: 'Clearance', color: '#FF9800' },
];

const CATEGORIES = ['breakfast', 'lunch', 'dinner', 'drinks', 'desserts'];

/**
 * DiscountManager — Discount codes and sale events management
 *
 * Props:
 *   visible: boolean
 *   onClose: () => void
 */
export default function DiscountManager({ visible, onClose }) {
  const [tab, setTab] = useState('codes'); // codes | sales
  const [discounts, setDiscounts] = useState([]);
  const [sales, setSales] = useState([]);
  const [upcomingSales, setUpcomingSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddDiscount, setShowAddDiscount] = useState(false);
  const [showAddSale, setShowAddSale] = useState(false);
  const [qrSvgs, setQrSvgs] = useState({});
  const [barSvgs, setBarSvgs] = useState({});
  const [countdowns, setCountdowns] = useState({});

  // Discount form
  const [discForm, setDiscForm] = useState({
    code: '', type: 'percentage', value: '', minOrderAmount: '0',
    maxDiscount: '0', usageLimit: '0', expiresAt: '', description: ''
  });

  // Sale form
  const [saleForm, setSaleForm] = useState({
    name: '', type: 'flash', discountPercentage: '10',
    startDate: '', endDate: '', description: '', bannerColor: '#DD9B1D',
    applicableCategories: []
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [discRes, saleRes, upcomingRes] = await Promise.all([
        fetch(`${API_URL}/api/discounts`),
        fetch(`${API_URL}/api/discounts/sales`),
        fetch(`${API_URL}/api/discounts/sales/upcoming`)
      ]);
      const discData = await discRes.json();
      const saleData = await saleRes.json();
      let upcomingData = [];
      try {
        const upcomingJson = await upcomingRes.json();
        upcomingData = upcomingJson.upcoming || [];
      } catch (e) { /* ignore */ }
      setDiscounts(discData);
      setSales(saleData);
      setUpcomingSales(upcomingData);

      // Fetch QR codes and barcodes for each discount
      const qrMap = {};
      const barMap = {};
      await Promise.all(discData.map(async (d) => {
        try {
          const [qrRes, barRes] = await Promise.all([
            fetch(`${API_URL}/api/payments/qr-code/discount/${d._id}`),
            fetch(`${API_URL}/api/payments/barcode/discount/${d._id}`)
          ]);
          const qrData = await qrRes.json();
          const barData = await barRes.json();
          if (qrData.svg) qrMap[d._id] = qrData.svg;
          if (barData.svg) barMap[d._id] = barData.svg;
        } catch (e) { /* ignore */ }
      }));
      setQrSvgs(qrMap);
      setBarSvgs(barMap);
    } catch (err) {
      console.error('Fetch discounts error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) fetchData();
  }, [visible, fetchData]);

  const handleAddDiscount = async () => {
    if (!discForm.code || !discForm.value) {
      Alert.alert('Required', 'Code and value are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/discounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...discForm,
          value: parseFloat(discForm.value),
          minOrderAmount: parseFloat(discForm.minOrderAmount) || 0,
          maxDiscount: parseFloat(discForm.maxDiscount) || 0,
          usageLimit: parseInt(discForm.usageLimit) || 0,
        })
      });
      if (!res.ok) {
        const err = await res.json();
        Alert.alert('Error', err.error);
        setSubmitting(false);
        return;
      }
      setShowAddDiscount(false);
      setDiscForm({ code: '', type: 'percentage', value: '', minOrderAmount: '0', maxDiscount: '0', usageLimit: '0', expiresAt: '', description: '' });
      setSubmitting(false);
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Could not create discount');
      setSubmitting(false);
    }
  };

  const handleAddSale = async () => {
    if (!saleForm.name || !saleForm.startDate || !saleForm.endDate) {
      Alert.alert('Required', 'Name, start date, and end date are required');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/discounts/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...saleForm,
          discountPercentage: parseFloat(saleForm.discountPercentage),
        })
      });
      if (!res.ok) {
        const err = await res.json();
        Alert.alert('Error', err.error);
        return;
      }
      setShowAddSale(false);
      setSaleForm({ name: '', type: 'flash', discountPercentage: '10', startDate: '', endDate: '', description: '', bannerColor: '#DD9B1D', applicableCategories: [] });
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Could not create sale event');
    }
  };

  const toggleCategory = (cat) => {
    setSaleForm(prev => ({
      ...prev,
      applicableCategories: prev.applicableCategories.includes(cat)
        ? prev.applicableCategories.filter(c => c !== cat)
        : [...prev.applicableCategories, cat]
    }));
  };

  const handleDeleteDiscount = async (id) => {
    // Smart: backend handles it — active → deactivate, inactive → delete permanently
    try {
      const res = await fetch(`${API_URL}/api/discounts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.error || 'Failed to process discount');
        return;
      }
      Alert.alert(
        data.action === 'deactivated' ? '⏸️ Discount Deactivated' : '🗑️ Discount Deleted',
        data.action === 'deactivated'
          ? 'The discount has been deactivated. Click Delete again to permanently remove it.'
          : 'The discount has been permanently deleted.'
      );
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Could not process discount');
    }
  };

  const handleToggleSale = async (id, currentActive) => {
    try {
      const res = await fetch(`${API_URL}/api/discounts/sales/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to toggle sale event');
        return;
      }
      const data = await res.json();
      Alert.alert(
        data.action === 'enabled' ? '✅ Sale Enabled' : '⏸️ Sale Disabled',
        data.action === 'enabled'
          ? 'The sale event is now active and will appear on the menu.'
          : 'The sale event has been disabled and will not appear on the menu.'
      );
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Could not toggle sale event');
    }
  };

  const handleDeleteSale = async (id) => {
    // Permanently delete the sale event from the database
    try {
      const res = await fetch(`${API_URL}/api/discounts/sales/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.error || 'Failed to delete sale event');
        return;
      }
      Alert.alert('🗑️ Sale Deleted', 'The sale event has been permanently deleted.');
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Could not delete sale event');
    }
  };

  const renderDiscount = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.codeText}>{item.code}</Text>
        <View style={[styles.typeBadge, {
          backgroundColor: item.type === 'percentage' ? Colors.primaryGlow :
            item.type === 'fixed' ? Colors.successGlow : Colors.errorGlow
        }]}>
          <Text style={[styles.typeText, {
            color: item.type === 'percentage' ? Colors.primary :
              item.type === 'fixed' ? Colors.success : Colors.error
          }]}>
            {item.type === 'percentage' ? `${item.value}%` :
             item.type === 'fixed' ? `$${item.value}` : 'BOGO'}
          </Text>
        </View>
        {!item.isActive && <Text style={styles.inactiveBadge}>Inactive</Text>}
      </View>
      {item.description ? <Text style={styles.descText}>{item.description}</Text> : null}

      {/* Barcode + QR Code Row */}
      {(item.barcode || barSvgs[item._id] || qrSvgs[item._id]) && (
        <View style={styles.codeRow}>
          {/* Barcode */}
          {barSvgs[item._id] && (
            <View style={styles.codeItem}>
              <BarcodeDisplay svg={barSvgs[item._id]} code={item.barcode} width={140} height={40} />
            </View>
          )}
          {/* QR Code */}
          {qrSvgs[item._id] && (
            <View style={styles.codeItem}>
              <QRCodeDisplay svg={qrSvgs[item._id]} size={60} label={item.code} />
            </View>
          )}
        </View>
      )}

      {/* Barcode Text */}
      {item.barcode && (
        <View style={styles.barcodeRow}>
          <Text style={styles.barcodeLabel}>Code:</Text>
          <Text style={styles.barcodeValue}>{item.barcode}</Text>
          <TouchableOpacity
            style={styles.copyBarcodeBtn}
            onPress={() => {
              try {
                navigator.clipboard?.writeText?.(item.barcode);
              } catch (e) {}
            }}
          >
            <Text style={styles.copyBarcodeText}>📋</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.cardDetails}>
        <Text style={styles.detailText}>Used: {item.usedCount || 0}/{item.usageLimit || '∞'}</Text>
        {item.minOrderAmount > 0 && <Text style={styles.detailText}>Min: ${item.minOrderAmount}</Text>}
        {item.expiresAt && <Text style={styles.detailText}>Exp: {new Date(item.expiresAt).toLocaleDateString()}</Text>}
      </View>
      <TouchableOpacity
        style={[styles.deleteBtn, !item.isActive && styles.deleteBtnDanger]}
        onPress={() => handleDeleteDiscount(item._id)}
      >
        <Text style={[styles.deleteBtnText, !item.isActive && styles.deleteBtnTextDanger]}>
          {item.isActive ? '⏹️ Deactivate' : '🗑️ Delete'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSale = ({ item }) => {
    const now = new Date();
    const startDate = new Date(item.startDate);
    const endDate = new Date(item.endDate);
    const isCurrentlyActive = item.isActive && startDate <= now && endDate >= now;
    const isScheduled = item.isActive && startDate > now;
    const isExpired = endDate < now;

    // Calculate countdown if scheduled within 5 days
    let countdownDisplay = null;
    if (isScheduled) {
      const msUntilStart = startDate.getTime() - now.getTime();
      const daysUntilStart = Math.floor(msUntilStart / (1000 * 60 * 60 * 24));
      const hoursUntilStart = Math.floor((msUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesUntilStart = Math.floor((msUntilStart % (1000 * 60 * 60)) / (1000 * 60));
      if (daysUntilStart <= 5) {
        countdownDisplay = daysUntilStart > 0
          ? `Starts in ${daysUntilStart}d ${hoursUntilStart}h`
          : `Starts in ${hoursUntilStart}h ${minutesUntilStart}m`;
      }
    }

    return (
      <View style={[styles.card, !item.isActive && styles.cardInactive]}>
        {/* Status bar */}
        <View style={[styles.saleStatusBar, {
          backgroundColor: isCurrentlyActive ? '#00D4AA' :
            isScheduled ? '#FF9A76' :
            isExpired ? '#666' : '#888'
        }]} />

        <View style={styles.cardHeader}>
          <View style={[styles.saleTypeDot, { backgroundColor: item.bannerColor || Colors.primary }]} />
          <Text style={styles.codeText}>{item.name}</Text>
          <View style={[styles.typeBadge, {
            backgroundColor: isCurrentlyActive ? Colors.successGlow :
              isScheduled ? '#FFF3E0' :
              isExpired ? '#ECEFF1' : Colors.primaryGlow
          }]}>
            <Text style={[styles.typeText, {
              color: isCurrentlyActive ? Colors.success :
                isScheduled ? '#E65100' :
                isExpired ? '#666' : Colors.primary
            }]}>
              {isCurrentlyActive ? '● Active' :
               isScheduled ? '⏳ Scheduled' :
               isExpired ? '⌛ Expired' : item.type}
            </Text>
          </View>
        </View>

        <Text style={styles.salePercent}>{item.discountPercentage}% OFF</Text>

        {/* Countdown timer for upcoming sales */}
        {countdownDisplay && (
          <View style={styles.countdownBanner}>
            <Text style={styles.countdownIcon}>⏰</Text>
            <Text style={styles.countdownText}>{countdownDisplay}</Text>
          </View>
        )}

        <View style={styles.cardDetails}>
          <Text style={styles.detailText}>
            📅 {startDate.toLocaleDateString()} — {endDate.toLocaleDateString()}
          </Text>
          {item.recurring !== 'none' && (
            <Text style={styles.detailText}>🔄 Recurring: {item.recurring}</Text>
          )}
          {item.description ? (
            <Text style={styles.detailText} numberOfLines={2}>{item.description}</Text>
          ) : null}
        </View>

        {/* Action buttons row */}
        <View style={styles.saleActions}>
          {/* Toggle enable/disable */}
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              item.isActive ? styles.toggleBtnActive : styles.toggleBtnInactive
            ]}
            onPress={() => handleToggleSale(item._id, item.isActive)}
          >
            <Text style={styles.toggleBtnText}>
              {item.isActive ? '⏸️ Disable' : '▶️ Enable'}
            </Text>
          </TouchableOpacity>

          {/* Delete button: active → disable it; inactive → delete permanently */}
          <TouchableOpacity
            style={[styles.deleteBtn, !item.isActive && styles.deleteBtnDanger]}
            onPress={() => handleDeleteSale(item._id)}
          >
            <Text style={[styles.deleteBtnText, !item.isActive && styles.deleteBtnTextDanger]}>
              {item.isActive ? '⏹️ Disable' : '🗑️ Delete'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Discounts & Sales</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity style={[styles.tab, tab === 'codes' && styles.tabActive]} onPress={() => setTab('codes')}>
              <Text style={[styles.tabText, tab === 'codes' && styles.tabTextActive]}>Discount Codes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, tab === 'sales' && styles.tabActive]} onPress={() => setTab('sales')}>
              <Text style={[styles.tabText, tab === 'sales' && styles.tabTextActive]}>Sale Events</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
          ) : tab === 'codes' ? (
            <>
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddDiscount(true)}>
                <Text style={styles.addBtnText}>+ New Discount Code</Text>
              </TouchableOpacity>
              <FlatList
                data={discounts}
                renderItem={renderDiscount}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<Text style={styles.emptyText}>No discount codes</Text>}
              />
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddSale(true)}>
                <Text style={styles.addBtnText}>+ New Sale Event</Text>
              </TouchableOpacity>
              <FlatList
                data={sales}
                renderItem={renderSale}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<Text style={styles.emptyText}>No sale events</Text>}
              />
            </>
          )}

          {/* Add Discount Modal */}
          <Modal visible={showAddDiscount} animationType="fade" transparent>
            <View style={styles.addOverlay}>
              <ScrollView style={styles.addModal} contentContainerStyle={styles.addModalContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.addTitle}>New Discount Code</Text>
                <TextInput style={styles.input} placeholder="Code (e.g., SAVE20)" placeholderTextColor={Colors.textMuted}
                  value={discForm.code} onChangeText={v => setDiscForm({ ...discForm, code: v.toUpperCase() })} autoCapitalize="characters" />
                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.pillRow}>
                  {DISCOUNT_TYPES.map(t => (
                    <TouchableOpacity key={t.id} style={[styles.pill, discForm.type === t.id && styles.pillActive]}
                      onPress={() => setDiscForm({ ...discForm, type: t.id })}>
                      <Text style={[styles.pillText, discForm.type === t.id && styles.pillTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={styles.input} placeholder="Value" placeholderTextColor={Colors.textMuted}
                  value={discForm.value} onChangeText={v => setDiscForm({ ...discForm, value: v })} keyboardType="decimal-pad" />
                <TextInput style={styles.input} placeholder="Min Order Amount (0 = none)" placeholderTextColor={Colors.textMuted}
                  value={discForm.minOrderAmount} onChangeText={v => setDiscForm({ ...discForm, minOrderAmount: v })} keyboardType="decimal-pad" />
                <TextInput style={styles.input} placeholder="Max Discount (0 = unlimited)" placeholderTextColor={Colors.textMuted}
                  value={discForm.maxDiscount} onChangeText={v => setDiscForm({ ...discForm, maxDiscount: v })} keyboardType="decimal-pad" />
                <TextInput style={styles.input} placeholder="Usage Limit (0 = unlimited)" placeholderTextColor={Colors.textMuted}
                  value={discForm.usageLimit} onChangeText={v => setDiscForm({ ...discForm, usageLimit: v })} keyboardType="number-pad" />
                <TextInput style={styles.input} placeholder="Expiry Date (YYYY-MM-DD)" placeholderTextColor={Colors.textMuted}
                  value={discForm.expiresAt} onChangeText={v => setDiscForm({ ...discForm, expiresAt: v })} />
                <TextInput style={[styles.input, styles.textArea]} placeholder="Description" placeholderTextColor={Colors.textMuted}
                  value={discForm.description} onChangeText={v => setDiscForm({ ...discForm, description: v })} multiline />
                <View style={styles.addActions}>
                  <TouchableOpacity style={[styles.saveBtn, submitting && styles.saveBtnDisabled]} onPress={handleAddDiscount} disabled={submitting}><Text style={styles.saveBtnText}>{submitting ? 'Creating...' : 'Create'}</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.cancelAddBtn} onPress={() => setShowAddDiscount(false)}><Text style={styles.cancelAddText}>Cancel</Text></TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </Modal>

          {/* Add Sale Modal */}
          <Modal visible={showAddSale} animationType="fade" transparent>
            <View style={styles.addOverlay}>
              <ScrollView style={styles.addModal} contentContainerStyle={styles.addModalContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.addTitle}>New Sale Event</Text>
                <TextInput style={styles.input} placeholder="Event Name" placeholderTextColor={Colors.textMuted}
                  value={saleForm.name} onChangeText={v => setSaleForm({ ...saleForm, name: v })} />
                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.pillRow}>
                  {SALE_TYPES.map(t => (
                    <TouchableOpacity key={t.id} style={[styles.pill, saleForm.type === t.id && styles.pillActive]}
                      onPress={() => setSaleForm({ ...saleForm, type: t.id })}>
                      <Text style={[styles.pillText, saleForm.type === t.id && styles.pillTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={styles.input} placeholder="Discount %" placeholderTextColor={Colors.textMuted}
                  value={saleForm.discountPercentage} onChangeText={v => setSaleForm({ ...saleForm, discountPercentage: v })} keyboardType="decimal-pad" />
                <TextInput style={styles.input} placeholder="Start Date (YYYY-MM-DD)" placeholderTextColor={Colors.textMuted}
                  value={saleForm.startDate} onChangeText={v => setSaleForm({ ...saleForm, startDate: v })} />
                <TextInput style={styles.input} placeholder="End Date (YYYY-MM-DD)" placeholderTextColor={Colors.textMuted}
                  value={saleForm.endDate} onChangeText={v => setSaleForm({ ...saleForm, endDate: v })} />
                <Text style={styles.inputLabel}>Applicable Categories</Text>
                <View style={styles.pillRow}>
                  {CATEGORIES.map(c => (
                    <TouchableOpacity key={c} style={[styles.pill, saleForm.applicableCategories.includes(c) && styles.pillActive]}
                      onPress={() => toggleCategory(c)}>
                      <Text style={[styles.pillText, saleForm.applicableCategories.includes(c) && styles.pillTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={[styles.input, styles.textArea]} placeholder="Description" placeholderTextColor={Colors.textMuted}
                  value={saleForm.description} onChangeText={v => setSaleForm({ ...saleForm, description: v })} multiline />
                <View style={styles.addActions}>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleAddSale}><Text style={styles.saveBtnText}>Create</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.cancelAddBtn} onPress={() => setShowAddSale(false)}><Text style={styles.cancelAddText}>Cancel</Text></TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '85%', paddingBottom: Spacing.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { ...Typography.h2, color: Colors.textPrimary },
  closeBtn: { padding: Spacing.sm },
  closeBtnText: { fontSize: 20, color: Colors.textMuted },
  tabRow: { flexDirection: 'row', padding: Spacing.lg, gap: Spacing.sm },
  tab: { flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.sm, alignItems: 'center', backgroundColor: Colors.surface },
  tabActive: { backgroundColor: Colors.primaryGlow },
  tabText: { ...Typography.bodySmall, color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  addBtn: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, padding: Spacing.md, alignItems: 'center' },
  addBtnText: { ...Typography.body, color: Colors.textDark, fontWeight: '700' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  centered: { padding: Spacing.xxxl, alignItems: 'center' },
  emptyText: { ...Typography.body, color: Colors.textMuted, textAlign: 'center', padding: Spacing.xl },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, ...Shadows.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  codeText: { ...Typography.h3, color: Colors.textPrimary, flex: 1 },
  typeBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.xs },
  typeText: { ...Typography.captionSmall, fontWeight: '700' },
  inactiveBadge: { ...Typography.captionSmall, color: Colors.error, backgroundColor: Colors.errorGlow, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.xs },
  descText: { ...Typography.bodySmall, color: Colors.textSecondary, marginBottom: Spacing.xs },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  codeItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceDark,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  barcodeLabel: { ...Typography.captionSmall, color: Colors.textMuted },
  barcodeValue: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    letterSpacing: 2,
  },
  copyBarcodeBtn: { padding: Spacing.xs },
  copyBarcodeText: { fontSize: 16 },
  cardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  detailText: { ...Typography.captionSmall, color: Colors.textMuted },
  saleTypeDot: { width: 10, height: 10, borderRadius: 5 },
  salePercent: { ...Typography.h3, color: Colors.primary, marginBottom: Spacing.xs },
  // Sale event status bar
  saleStatusBar: { height: 3, borderRadius: 2, marginBottom: Spacing.sm },
  // Countdown banner for upcoming sales
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FFF3E0',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  countdownIcon: { fontSize: 16 },
  countdownText: { ...Typography.captionSmall, color: '#E65100', fontWeight: '700' },
  // Card inactive state
  cardInactive: { opacity: 0.6 },
  // Sale action buttons row
  saleActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    justifyContent: 'flex-end',
  },
  toggleBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  toggleBtnActive: {
    backgroundColor: Colors.errorGlow,
    borderColor: Colors.error,
  },
  toggleBtnInactive: {
    backgroundColor: Colors.successGlow,
    borderColor: Colors.success,
  },
  toggleBtnText: { ...Typography.captionSmall, fontWeight: '700' },
  toggleBtnDisabled: {
    backgroundColor: Colors.surfaceDark,
    borderColor: Colors.border,
    opacity: 0.5,
  },
  deleteBtn: { marginTop: Spacing.sm, alignSelf: 'flex-end', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: 'transparent' },
  deleteBtnText: { ...Typography.captionSmall, color: Colors.error },
  deleteBtnDanger: { backgroundColor: Colors.errorGlow, borderColor: Colors.error },
  deleteBtnTextDanger: { color: Colors.error, fontWeight: '700' },
  deleteBtnDisabled: {
    opacity: 0.4,
    backgroundColor: Colors.surfaceDark,
    borderColor: Colors.border,
  },
  // Add Modal
  addOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: Spacing.xl },
  addModal: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, maxHeight: '80%' },
  addModalContent: { padding: Spacing.xl },
  addTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.lg },
  input: { backgroundColor: Colors.surfaceDark, borderRadius: BorderRadius.sm, padding: Spacing.md, color: Colors.textPrimary, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  inputLabel: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.xs },
  pillRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap' },
  pill: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.round, backgroundColor: Colors.surfaceDark, borderWidth: 1, borderColor: Colors.border },
  pillActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow },
  pillText: { ...Typography.captionSmall, color: Colors.textSecondary },
  pillTextActive: { color: Colors.primary },
  addActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  saveBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, padding: Spacing.md, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { ...Typography.body, color: Colors.textDark, fontWeight: '700' },
  cancelAddBtn: { padding: Spacing.md, alignItems: 'center' },
  cancelAddText: { ...Typography.bodySmall, color: Colors.textMuted },
});
