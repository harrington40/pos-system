import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Animated,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { API_URL } from '../theme';

const STATUS_COLORS = {
  DRAFT: '#6B7280',
  SENT: '#3B82F6',
  PARTIALLY_PAID: '#F59E0B',
  PAID: '#10B981',
  OVERDUE: '#EF4444',
  CANCELLED: '#9CA3AF',
};

const STATUS_ICONS = {
  DRAFT: '📄',
  SENT: '📨',
  PARTIALLY_PAID: '⏳',
  PAID: '✅',
  OVERDUE: '⚠️',
  CANCELLED: '❌',
};

const FILTERS = ['ALL', 'DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

export default function BillManager({ visible, onClose, employeeId }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [sending, setSending] = useState(false);

  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    items: [{ description: '', quantity: '1', unitPrice: '' }],
    taxRate: '0',
    discount: '0',
    dueDate: '',
    notes: '',
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
      ]).start();
      fetchBills();
      fetchCustomers();
      fetchStats();
    } else {
      setSelectedBill(null);
      setShowCreateForm(false);
    }
  }, [visible]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '50' });
      if (activeFilter !== 'ALL') params.append('status', activeFilter);
      if (search) params.append('search', search);
      const res = await fetch(`${API_URL}/api/bills?${params}`);
      const data = await res.json();
      setBills(data.bills || []);
    } catch (err) {
      console.error('Failed to fetch bills:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/customers`);
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/bills/stats/summary`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleSelectCustomer = (customerId) => {
    const customer = customers.find(c => c._id === customerId);
    if (customer) {
      setForm(prev => ({
        ...prev,
        customerId,
        customerName: customer.name || '',
        customerPhone: customer.phone || '',
        customerEmail: customer.email || '',
      }));
    }
  };

  const handleAddItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: '1', unitPrice: '' }],
    }));
  };

  const handleRemoveItem = (index) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    setForm(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const calculateSubtotal = () => {
    return form.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + (qty * price);
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = subtotal * (parseFloat(form.taxRate) || 0);
    const discount = parseFloat(form.discount) || 0;
    return subtotal + tax - discount;
  };

  const handleCreateBill = async () => {
    if (!form.customerId) { Alert.alert('Error', 'Please select a customer'); return; }
    if (!form.customerPhone) { Alert.alert('Error', 'Customer phone is required'); return; }
    if (form.items.length === 0 || !form.items[0].description) { Alert.alert('Error', 'At least one item with a description is required'); return; }
    if (!form.dueDate) { Alert.alert('Error', 'Due date is required'); return; }
    try {
      const res = await fetch(`${API_URL}/api/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: form.customerId,
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          customerEmail: form.customerEmail,
          items: form.items.map(item => ({
            description: item.description,
            quantity: parseInt(item.quantity) || 1,
            unitPrice: parseFloat(item.unitPrice) || 0,
          })),
          taxRate: parseFloat(form.taxRate) || 0,
          discount: parseFloat(form.discount) || 0,
          dueDate: form.dueDate,
          notes: form.notes,
          createdBy: employeeId,
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to create bill'); }
      const data = await res.json();
      Alert.alert('Success', `Bill ${data.bill.billNumber} created successfully`);
      setShowCreateForm(false);
      resetForm();
      fetchBills();
      fetchStats();
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const handleSendBill = async (billId) => {
    try {
      setSending(true);
      const res = await fetch(`${API_URL}/api/bills/${billId}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to send bill'); }
      const data = await res.json();
      Alert.alert('Sent!', `Bill sent via SMS. Payment link: ${data.orangeMoney?.paymentUrl || 'N/A'}`);
      setSelectedBill(null);
      fetchBills();
      fetchStats();
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setSending(false); }
  };

  const handleCancelBill = (billId) => {
    Alert.alert('Cancel Bill', 'Are you sure you want to cancel this bill?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        try {
          const res = await fetch(`${API_URL}/api/bills/${billId}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
          if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to cancel bill'); }
          Alert.alert('Cancelled', 'Bill has been cancelled');
          setSelectedBill(null);
          fetchBills();
          fetchStats();
        } catch (err) { Alert.alert('Error', err.message); }
      }},
    ]);
  };

  const handleSendReminder = async (billId) => {
    try {
      const res = await fetch(`${API_URL}/api/bills/${billId}/reminder`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to send reminder'); }
      Alert.alert('Reminder Sent', 'Overdue reminder has been sent to the customer');
      fetchBills();
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const resetForm = () => {
    setForm({
      customerId: '', customerName: '', customerPhone: '', customerEmail: '',
      items: [{ description: '', quantity: '1', unitPrice: '' }],
      taxRate: '0', discount: '0', dueDate: '', notes: '',
    });
  };

  const getStatusStyle = (status) => ({ backgroundColor: STATUS_COLORS[status] || '#6B7280' });

  const formatCurrency = (amount) => `${(amount || 0).toLocaleString()} XAF`;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderBill = ({ item }) => (
    <TouchableOpacity style={styles.billCard} onPress={() => setSelectedBill(item)} activeOpacity={0.7}>
      <View style={styles.billHeader}>
        <View style={styles.billNumberRow}>
          <Text style={styles.billNumber}>{item.billNumber}</Text>
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={styles.statusText}>{STATUS_ICONS[item.status]} {item.status}</Text>
          </View>
        </View>
        <Text style={styles.billCustomer}>{item.customerName || 'Unknown'}</Text>
      </View>
      <View style={styles.billBody}>
        <View style={styles.billInfoRow}><Text style={styles.billInfoLabel}>Amount</Text><Text style={styles.billInfoValue}>{formatCurrency(item.total)}</Text></View>
        <View style={styles.billInfoRow}><Text style={styles.billInfoLabel}>Paid</Text><Text style={[styles.billInfoValue, { color: '#10B981' }]}>{formatCurrency(item.amountPaid)}</Text></View>
        <View style={styles.billInfoRow}><Text style={styles.billInfoLabel}>Balance</Text><Text style={[styles.billInfoValue, { color: item.balanceDue > 0 ? '#EF4444' : '#10B981' }]}>{formatCurrency(item.balanceDue)}</Text></View>
        <View style={styles.billInfoRow}><Text style={styles.billInfoLabel}>Due</Text><Text style={styles.billInfoValue}>{formatDate(item.dueDate)}</Text></View>
      </View>
      <View style={styles.billFooter}>
        <Text style={styles.billDate}>Created {formatDate(item.createdAt)}</Text>
        <Text style={styles.billItems}>{item.items?.length || 0} item(s)</Text>
      </View>
    </TouchableOpacity>
  );

  const renderBillDetail = () => {
    if (!selectedBill) return null;
    const bill = selectedBill;
    return (
      <Modal visible={!!selectedBill} transparent animationType="slide">
        <View style={styles.detailOverlay}>
          <ScrollView style={styles.detailModal} contentContainerStyle={styles.detailContent}>
            <View style={styles.detailHeader}>
              <View>
                <Text style={styles.detailBillNumber}>{bill.billNumber}</Text>
                <Text style={styles.detailCustomer}>{bill.customerName}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedBill(null)} style={styles.detailCloseBtn}>
                <Text style={styles.detailCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.detailStatusBadge, getStatusStyle(bill.status)]}>
              <Text style={styles.detailStatusText}>{STATUS_ICONS[bill.status]} {bill.status}</Text>
            </View>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Customer Info</Text>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Phone</Text><Text style={styles.detailValue}>{bill.customerPhone}</Text></View>
              {bill.customerEmail ? (<View style={styles.detailRow}><Text style={styles.detailLabel}>Email</Text><Text style={styles.detailValue}>{bill.customerEmail}</Text></View>) : null}
            </View>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Items</Text>
              {bill.items?.map((item, idx) => (
                <View key={idx} style={styles.detailItemRow}>
                  <View style={styles.detailItemInfo}>
                    <Text style={styles.detailItemName}>{item.description}</Text>
                    <Text style={styles.detailItemMeta}>{item.quantity} × {formatCurrency(item.unitPrice)}</Text>
                  </View>
                  <Text style={styles.detailItemTotal}>{formatCurrency(item.quantity * item.unitPrice)}</Text>
                </View>
              ))}
            </View>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Payment Summary</Text>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Subtotal</Text><Text style={styles.detailValue}>{formatCurrency(bill.subtotal)}</Text></View>
              {bill.taxAmount > 0 && (<View style={styles.detailRow}><Text style={styles.detailLabel}>Tax ({(bill.taxRate * 100).toFixed(1)}%)</Text><Text style={styles.detailValue}>{formatCurrency(bill.taxAmount)}</Text></View>)}
              {bill.discount > 0 && (<View style={styles.detailRow}><Text style={[styles.detailLabel, { color: '#EF4444' }]}>Discount</Text><Text style={[styles.detailValue, { color: '#EF4444' }]}>-{formatCurrency(bill.discount)}</Text></View>)}
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}><Text style={[styles.detailLabel, { fontWeight: 'bold' }]}>Total</Text><Text style={[styles.detailValue, { fontWeight: 'bold' }]}>{formatCurrency(bill.total)}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Amount Paid</Text><Text style={[styles.detailValue, { color: '#10B981' }]}>{formatCurrency(bill.amountPaid)}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Balance Due</Text><Text style={[styles.detailValue, { color: bill.balanceDue > 0 ? '#EF4444' : '#10B981', fontWeight: 'bold' }]}>{formatCurrency(bill.balanceDue)}</Text></View>
            </View>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Dates</Text>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Created</Text><Text style={styles.detailValue}>{formatDate(bill.createdAt)}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Due Date</Text><Text style={styles.detailValue}>{formatDate(bill.dueDate)}</Text></View>
              {bill.sentAt && (<View style={styles.detailRow}><Text style={styles.detailLabel}>Sent</Text><Text style={styles.detailValue}>{formatDate(bill.sentAt)}</Text></View>)}
              {bill.paidAt && (<View style={styles.detailRow}><Text style={styles.detailLabel}>Paid</Text><Text style={styles.detailValue}>{formatDate(bill.paidAt)}</Text></View>)}
            </View>
            {bill.notes ? (<View style={styles.detailSection}><Text style={styles.detailSectionTitle}>Notes</Text><Text style={styles.detailNotes}>{bill.notes}</Text></View>) : null}
            <View style={styles.detailActions}>
              {bill.status === 'DRAFT' && (
                <TouchableOpacity style={[styles.actionBtn, styles.sendBtn]} onPress={() => handleSendBill(bill._id)} disabled={sending}>
                  <Text style={styles.actionBtnText}>{sending ? 'Sending...' : '📨 Send Bill via SMS'}</Text>
                </TouchableOpacity>
              )}
              {['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(bill.status) && (
                <TouchableOpacity style={[styles.actionBtn, styles.reminderBtn]} onPress={() => handleSendReminder(bill._id)}>
                  <Text style={styles.actionBtnText}>🔔 Send Reminder</Text>
                </TouchableOpacity>
              )}
              {['DRAFT', 'SENT', 'OVERDUE'].includes(bill.status) && (
                <TouchableOpacity style={[styles.actionBtn, styles.cancelActionBtn]} onPress={() => handleCancelBill(bill._id)}>
                  <Text style={styles.actionBtnText}>❌ Cancel Bill</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderCreateForm = () => (
    <Modal visible={showCreateForm} transparent animationType="slide">
      <View style={styles.formOverlay}>
        <ScrollView style={styles.formModal} contentContainerStyle={styles.formContent}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Create New Bill</Text>
            <TouchableOpacity onPress={() => { setShowCreateForm(false); resetForm(); }}><Text style={styles.formCloseBtn}>✕</Text></TouchableOpacity>
          </View>
          <Text style={styles.formLabel}>Customer *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.customerScroll}>
            {customers.map(c => (
              <TouchableOpacity key={c._id} style={[styles.customerChip, form.customerId === c._id && styles.customerChipActive]} onPress={() => handleSelectCustomer(c._id)}>
                <Text style={[styles.customerChipText, form.customerId === c._id && styles.customerChipTextActive]}>{c.name || c.phone}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput style={styles.formInput} placeholder="Customer Name" value={form.customerName} onChangeText={v => setForm(prev => ({ ...prev, customerName: v }))} />
          <TextInput style={styles.formInput} placeholder="Customer Phone *" value={form.customerPhone} onChangeText={v => setForm(prev => ({ ...prev, customerPhone: v }))} keyboardType="phone-pad" />
          <TextInput style={styles.formInput} placeholder="Customer Email" value={form.customerEmail} onChangeText={v => setForm(prev => ({ ...prev, customerEmail: v }))} keyboardType="email-address" />
          <Text style={styles.formLabel}>Items *</Text>
          {form.items.map((item, idx) => (
            <View key={idx} style={styles.formItemRow}>
              <TextInput style={[styles.formInput, styles.formItemDesc]} placeholder="Description" value={item.description} onChangeText={v => handleItemChange(idx, 'description', v)} />
              <TextInput style={[styles.formInput, styles.formItemQty]} placeholder="Qty" value={item.quantity} onChangeText={v => handleItemChange(idx, 'quantity', v)} keyboardType="numeric" />
              <TextInput style={[styles.formInput, styles.formItemPrice]} placeholder="Price" value={item.unitPrice} onChangeText={v => handleItemChange(idx, 'unitPrice', v)} keyboardType="numeric" />
              {form.items.length > 1 && (<TouchableOpacity onPress={() => handleRemoveItem(idx)} style={styles.removeItemBtn}><Text style={styles.removeItemBtnText}>✕</Text></TouchableOpacity>)}
            </View>
          ))}
          <TouchableOpacity style={styles.addItemBtn} onPress={handleAddItem}><Text style={styles.addItemBtnText}>+ Add Item</Text></TouchableOpacity>
          <View style={styles.formTotals}>
            <View style={styles.formTotalRow}><Text style={styles.formTotalLabel}>Subtotal</Text><Text style={styles.formTotalValue}>{formatCurrency(calculateSubtotal())}</Text></View>
          </View>
          <TextInput style={styles.formInput} placeholder="Tax Rate (e.g. 0.08 for 8%)" value={form.taxRate} onChangeText={v => setForm(prev => ({ ...prev, taxRate: v }))} keyboardType="decimal-pad" />
          <TextInput style={styles.formInput} placeholder="Discount Amount" value={form.discount} onChangeText={v => setForm(prev => ({ ...prev, discount: v }))} keyboardType="decimal-pad" />
          <TextInput style={styles.formInput} placeholder="Due Date (YYYY-MM-DD) *" value={form.dueDate} onChangeText={v => setForm(prev => ({ ...prev, dueDate: v }))} />
          <TextInput style={[styles.formInput, styles.formTextArea]} placeholder="Notes (optional)" value={form.notes} onChangeText={v => setForm(prev => ({ ...prev, notes: v }))} multiline />
          <View style={styles.formGrandTotal}><Text style={styles.formGrandTotalLabel}>Total Due</Text><Text style={styles.formGrandTotalValue}>{formatCurrency(calculateTotal())}</Text></View>
          <TouchableOpacity style={styles.createBtn} onPress={handleCreateBill}><Text style={styles.createBtnText}>Create Bill</Text></TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderStats = () => {
    if (!stats) return null;
    return (
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statValue}>{stats.totalBills || 0}</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={[styles.statCard, { borderColor: '#3B82F6' }]}><Text style={styles.statValue}>{stats.byStatus?.SENT?.count || 0}</Text><Text style={styles.statLabel}>Sent</Text></View>
        <View style={[styles.statCard, { borderColor: '#10B981' }]}><Text style={styles.statValue}>{stats.byStatus?.PAID?.count || 0}</Text><Text style={styles.statLabel}>Paid</Text></View>
        <View style={[styles.statCard, { borderColor: '#EF4444' }]}><Text style={styles.statValue}>{stats.byStatus?.OVERDUE?.count || 0}</Text><Text style={styles.statLabel}>Overdue</Text></View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.modal, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>🧾 Bill Manager</Text>
              <Text style={styles.subtitle}>Orange Money Bill Payments</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}><Text style={styles.closeBtnText}>✕</Text></TouchableOpacity>
          </View>
          {renderStats()}
          <View style={styles.searchRow}>
            <TextInput style={styles.searchInput} placeholder="Search bills..." value={search} onChangeText={setSearch} onSubmitEditing={fetchBills} />
            <TouchableOpacity style={styles.createBillBtn} onPress={() => setShowCreateForm(true)}><Text style={styles.createBillBtnText}>+ New</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {FILTERS.map(f => (
              <TouchableOpacity key={f} style={[styles.filterBtn, activeFilter === f && styles.filterBtnActive]} onPress={() => { setActiveFilter(f); }}>
                <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f === 'ALL' ? '📋 All' : `${STATUS_ICONS[f]} ${f}`}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {loading ? (
            <View style={styles.centered}><ActivityIndicator size="large" color="#F59E0B" /><Text style={styles.loadingText}>Loading bills...</Text></View>
          ) : bills.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No bills found</Text>
              <Text style={styles.emptySubtext}>{activeFilter === 'ALL' ? 'Create a new bill to get started' : `No bills with status "${activeFilter}"`}</Text>
            </View>
          ) : (
            <FlatList data={bills} keyExtractor={item => item._id} renderItem={renderBill} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} onRefresh={fetchBills} refreshing={loading} />
          )}
          {renderBillDetail()}
          {renderCreateForm()}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = {
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1F2937', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#374151' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#F3F4F6' },
  subtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 16, color: '#F3F4F6' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#F3F4F6' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  searchInput: { flex: 1, backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: '#F3F4F6', fontSize: 14, borderWidth: 1, borderColor: '#374151' },
  createBillBtn: { backgroundColor: '#F59E0B', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  createBillBtnText: { color: '#111827', fontWeight: 'bold', fontSize: 14 },
  filterScroll: { paddingHorizontal: 16, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#374151', marginRight: 8 },
  filterBtnActive: { backgroundColor: '#F59E0B' },
  filterText: { fontSize: 13, color: '#9CA3AF' },
  filterTextActive: { color: '#111827', fontWeight: 'bold' },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { color: '#9CA3AF', marginTop: 12, fontSize: 14 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#F3F4F6' },
  emptySubtext: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
  billCard: { backgroundColor: '#111827', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#374151' },
  billHeader: { marginBottom: 10 },
  billNumberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billNumber: { fontSize: 16, fontWeight: 'bold', color: '#F3F4F6' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, color: '#FFFFFF', fontWeight: '600' },
  billCustomer: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  billBody: { borderTopWidth: 1, borderTopColor: '#374151', paddingTop: 8 },
  billInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  billInfoLabel: { fontSize: 13, color: '#6B7280' },
  billInfoValue: { fontSize: 13, color: '#D1D5DB', fontWeight: '500' },
  billFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#374151' },
  billDate: { fontSize: 11, color: '#6B7280' },
  billItems: { fontSize: 11, color: '#6B7280' },
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  detailModal: { backgroundColor: '#1F2937', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  detailContent: { padding: 20, paddingBottom: 34 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  detailBillNumber: { fontSize: 20, fontWeight: 'bold', color: '#F3F4F6' },
  detailCustomer: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
  detailCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' },
  detailCloseBtnText: { fontSize: 16, color: '#F3F4F6' },
  detailStatusBadge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14, marginBottom: 16 },
  detailStatusText: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
  detailSection: { marginBottom: 16 },
  detailSectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#F59E0B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailLabel: { fontSize: 13, color: '#6B7280' },
  detailValue: { fontSize: 13, color: '#D1D5DB' },
  detailDivider: { height: 1, backgroundColor: '#374151', marginVertical: 6 },
  detailItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#F59E0B' },
  detailItemInfo: { flex: 1 },
  detailItemName: { fontSize: 14, color: '#F3F4F6', fontWeight: '500' },
  detailItemMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  detailItemTotal: { fontSize: 14, color: '#D1D5DB', fontWeight: '600' },
  detailNotes: { fontSize: 13, color: '#D1D5DB', fontStyle: 'italic', backgroundColor: '#111827', padding: 10, borderRadius: 8 },
  detailActions: { marginTop: 8, gap: 10 },
  actionBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionBtnText: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  sendBtn: { backgroundColor: '#10B981' },
  reminderBtn: { backgroundColor: '#F59E0B' },
  cancelActionBtn: { backgroundColor: '#EF4444' },
  formOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  formModal: { backgroundColor: '#1F2937', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  formContent: { padding: 20, paddingBottom: 34 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: '#F3F4F6' },
  formCloseBtn: { fontSize: 20, color: '#9CA3AF', padding: 4 },
  formLabel: { fontSize: 13, fontWeight: 'bold', color: '#F59E0B', marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  customerScroll: { marginBottom: 12 },
  customerChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#374151', marginRight: 8 },
  customerChipActive: { backgroundColor: '#F59E0B' },
  customerChipText: { fontSize: 13, color: '#9CA3AF' },
  customerChipTextActive: { color: '#111827', fontWeight: 'bold' },
  formInput: { backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#F3F4F6', fontSize: 14, borderWidth: 1, borderColor: '#374151', marginBottom: 10 },
  formTextArea: { minHeight: 80, textAlignVertical: 'top' },
  formItemRow: { flexDirection: 'row', gap: 6, marginBottom: 8, alignItems: 'center' },
  formItemDesc: { flex: 2 },
  formItemQty: { flex: 0.7, textAlign: 'center' },
  formItemPrice: { flex: 1, textAlign: 'right' },
  removeItemBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  removeItemBtnText: { fontSize: 12, color: '#FFFFFF', fontWeight: 'bold' },
  addItemBtn: { paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#F59E0B', borderStyle: 'dashed', alignItems: 'center', marginBottom: 12 },
  addItemBtnText: { fontSize: 14, color: '#F59E0B', fontWeight: '600' },
  formTotals: { backgroundColor: '#111827', borderRadius: 10, padding: 12, marginBottom: 10 },
  formTotalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  formTotalLabel: { fontSize: 14, color: '#9CA3AF' },
  formTotalValue: { fontSize: 14, color: '#D1D5DB', fontWeight: '600' },
  formGrandTotal: { backgroundColor: '#111827', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F59E0B', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formGrandTotalLabel: { fontSize: 16, fontWeight: 'bold', color: '#F3F4F6' },
  formGrandTotalValue: { fontSize: 20, fontWeight: 'bold', color: '#F59E0B' },
  createBtn: { backgroundColor: '#F59E0B', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  createBtnText: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
};
