import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput,
  Modal, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';

const ROLES = ['admin', 'manager', 'cashier'];
const SHIFTS = ['morning', 'afternoon', 'evening', 'none'];

/**
 * EmployeeManager — Employee management component
 *
 * Props:
 *   visible: boolean
 *   onClose: () => void
 */
export default function EmployeeManager({ visible, onClose }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [performance, setPerformance] = useState([]);
  const [form, setForm] = useState({ name: '', pin: '', role: 'cashier', shift: 'none', phone: '', email: '' });
  const [editingId, setEditingId] = useState(null);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/employees`);
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error('Fetch employees error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPerformance = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/employees/performance`);
      const data = await res.json();
      setPerformance(data);
    } catch (err) {
      console.error('Fetch performance error:', err);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchEmployees();
    }
  }, [visible, fetchEmployees]);

  const handleSave = async () => {
    if (!form.name || !form.pin) {
      Alert.alert('Required', 'Name and PIN are required');
      return;
    }
    if (!/^\d{4}$/.test(form.pin)) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 4 digits');
      return;
    }

    try {
      const url = editingId
        ? `${API_URL}/api/employees/${editingId}`
        : `${API_URL}/api/employees`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (!res.ok) {
        const err = await res.json();
        Alert.alert('Error', err.error);
        return;
      }

      setShowAddModal(false);
      setForm({ name: '', pin: '', role: 'cashier', shift: 'none', phone: '', email: '' });
      setEditingId(null);
      fetchEmployees();
    } catch (err) {
      Alert.alert('Error', 'Could not save employee');
    }
  };

  const handleEdit = (emp) => {
    setForm({
      name: emp.name,
      pin: '',
      role: emp.role,
      shift: emp.shift,
      phone: emp.phone || '',
      email: emp.email || ''
    });
    setEditingId(emp._id);
    setShowAddModal(true);
  };

  const handleDeactivate = (emp) => {
    Alert.alert(
      'Deactivate Employee',
      `Deactivate ${emp.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_URL}/api/employees/${emp._id}`, { method: 'DELETE' });
              fetchEmployees();
            } catch (err) {
              Alert.alert('Error', 'Could not deactivate employee');
            }
          }
        }
      ]
    );
  };

  const openPerformance = () => {
    fetchPerformance();
    setShowPerformance(true);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return Colors.error;
      case 'manager': return Colors.primary;
      case 'cashier': return Colors.secondary;
      default: return Colors.textMuted;
    }
  };

  const renderEmployee = ({ item }) => (
    <View style={styles.employeeCard}>
      <View style={styles.employeeInfo}>
        <View style={styles.employeeHeader}>
          <Text style={styles.employeeName}>{item.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}>
            <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>{item.role}</Text>
          </View>
        </View>
        <View style={styles.employeeDetails}>
          <Text style={styles.detailText}>Shift: {item.shift}</Text>
          <Text style={styles.detailText}>Orders: {item.ordersProcessed || 0}</Text>
          <Text style={styles.detailText}>Sales: ${(item.totalSalesAmount || 0).toFixed(2)}</Text>
        </View>
        {item.lastLogin && (
          <Text style={styles.lastLogin}>
            Last login: {new Date(item.lastLogin).toLocaleDateString()}
          </Text>
        )}
      </View>
      <View style={styles.employeeActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionDanger]} onPress={() => handleDeactivate(item)}>
          <Text style={[styles.actionBtnText, styles.actionDangerText]}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPerformanceItem = ({ item, index }) => (
    <View style={styles.perfCard}>
      <View style={styles.perfRank}>
        <Text style={styles.perfRankText}>#{index + 1}</Text>
      </View>
      <View style={styles.perfInfo}>
        <Text style={styles.perfName}>{item.name}</Text>
        <Text style={styles.perfRole}>{item.role} · {item.shift} shift</Text>
        <View style={styles.perfStats}>
          <Text style={styles.perfStat}>Orders: {item.ordersProcessed}</Text>
          <Text style={styles.perfStat}>Sales: ${(item.totalSales || 0).toFixed(0)}</Text>
        </View>
      </View>
      <View style={styles.perfScore}>
        <Text style={[styles.perfScoreValue, {
          color: item.score >= 70 ? Colors.success : item.score >= 40 ? Colors.warning : Colors.error
        }]}>
          {Math.round(item.score)}
        </Text>
        <Text style={styles.perfScoreLabel}>Score</Text>
      </View>
    </View>
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Employee Manager</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.addBtn} onPress={() => { setEditingId(null); setForm({ name: '', pin: '', role: 'cashier', shift: 'none', phone: '', email: '' }); setShowAddModal(true); }}>
              <Text style={styles.addBtnText}>+ Add Employee</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.perfBtn} onPress={openPerformance}>
              <Text style={styles.perfBtnText}>Performance</Text>
            </TouchableOpacity>
          </View>

          {/* Employee List */}
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : employees.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No employees yet</Text>
            </View>
          ) : (
            <FlatList
              data={employees}
              renderItem={renderEmployee}
              keyExtractor={item => item._id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Add/Edit Modal */}
          <Modal visible={showAddModal} animationType="fade" transparent>
            <View style={styles.addOverlay}>
              <View style={styles.addModal}>
                <Text style={styles.addTitle}>{editingId ? 'Edit Employee' : 'Add Employee'}</Text>
                <ScrollView keyboardShouldPersistTaps="handled">
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor={Colors.textMuted}
                    value={form.name}
                    onChangeText={v => setForm({ ...form, name: v })}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="4-digit PIN"
                    placeholderTextColor={Colors.textMuted}
                    value={form.pin}
                    onChangeText={v => setForm({ ...form, pin: v })}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                  />
                  <Text style={styles.inputLabel}>Role</Text>
                  <View style={styles.pillRow}>
                    {ROLES.map(r => (
                      <TouchableOpacity
                        key={r}
                        style={[styles.pill, form.role === r && styles.pillActive]}
                        onPress={() => setForm({ ...form, role: r })}
                      >
                        <Text style={[styles.pillText, form.role === r && styles.pillTextActive]}>{r}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.inputLabel}>Shift</Text>
                  <View style={styles.pillRow}>
                    {SHIFTS.map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.pill, form.shift === s && styles.pillActive]}
                        onPress={() => setForm({ ...form, shift: s })}
                      >
                        <Text style={[styles.pillText, form.shift === s && styles.pillTextActive]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Phone (optional)"
                    placeholderTextColor={Colors.textMuted}
                    value={form.phone}
                    onChangeText={v => setForm({ ...form, phone: v })}
                    keyboardType="phone-pad"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Email (optional)"
                    placeholderTextColor={Colors.textMuted}
                    value={form.email}
                    onChangeText={v => setForm({ ...form, email: v })}
                    keyboardType="email-address"
                  />
                </ScrollView>
                <View style={styles.addActions}>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    <Text style={styles.saveBtnText}>{editingId ? 'Update' : 'Save'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelAddBtn} onPress={() => setShowAddModal(false)}>
                    <Text style={styles.cancelAddText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Performance Modal */}
          <Modal visible={showPerformance} animationType="fade" transparent>
            <View style={styles.addOverlay}>
              <View style={styles.addModal}>
                <Text style={styles.addTitle}>Employee Performance</Text>
                {performance.length === 0 ? (
                  <View style={styles.centered}>
                    <Text style={styles.emptyText}>No performance data yet</Text>
                  </View>
                ) : (
                  <FlatList
                    data={performance}
                    renderItem={renderPerformanceItem}
                    keyExtractor={(item, i) => `${item.employeeId}-${i}`}
                    contentContainerStyle={styles.perfList}
                    showsVerticalScrollIndicator={false}
                  />
                )}
                <TouchableOpacity style={styles.cancelAddBtn} onPress={() => setShowPerformance(false)}>
                  <Text style={styles.cancelAddText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
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
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { ...Typography.h2, color: Colors.textPrimary },
  closeBtn: { padding: Spacing.sm },
  closeBtnText: { fontSize: 20, color: Colors.textMuted },
  actionRow: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  addBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: 'center',
  },
  addBtnText: { ...Typography.body, color: Colors.textDark, fontWeight: '700' },
  perfBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  perfBtnText: { ...Typography.body, color: Colors.textPrimary },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  centered: { padding: Spacing.xxxl, alignItems: 'center' },
  emptyText: { ...Typography.body, color: Colors.textMuted },
  employeeCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    ...Shadows.sm,
  },
  employeeInfo: { flex: 1 },
  employeeHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  employeeName: { ...Typography.h3, color: Colors.textPrimary },
  roleBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.xs },
  roleText: { ...Typography.captionSmall, fontWeight: '700' },
  employeeDetails: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.xs },
  detailText: { ...Typography.captionSmall, color: Colors.textSecondary },
  lastLogin: { ...Typography.captionSmall, color: Colors.textMuted },
  employeeActions: { justifyContent: 'center', gap: Spacing.xs },
  actionBtn: { padding: Spacing.sm, borderRadius: BorderRadius.xs, backgroundColor: Colors.surfaceLight },
  actionBtnText: { ...Typography.captionSmall, color: Colors.textPrimary },
  actionDanger: { backgroundColor: Colors.errorGlow },
  actionDangerText: { color: Colors.error },
  // Add Modal
  addOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  addModal: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    maxHeight: '80%',
  },
  addTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.lg },
  input: {
    backgroundColor: Colors.surfaceDark,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputLabel: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.xs },
  pillRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.surfaceDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow },
  pillText: { ...Typography.captionSmall, color: Colors.textSecondary },
  pillTextActive: { color: Colors.primary },
  addActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  saveBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: 'center',
  },
  saveBtnText: { ...Typography.body, color: Colors.textDark, fontWeight: '700' },
  cancelAddBtn: { padding: Spacing.md, alignItems: 'center' },
  cancelAddText: { ...Typography.bodySmall, color: Colors.textMuted },
  // Performance
  perfList: { paddingBottom: Spacing.md },
  perfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceDark,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  perfRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  perfRankText: { ...Typography.captionSmall, color: Colors.primary, fontWeight: '700' },
  perfInfo: { flex: 1 },
  perfName: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600' },
  perfRole: { ...Typography.captionSmall, color: Colors.textMuted },
  perfStats: { flexDirection: 'row', gap: Spacing.md, marginTop: 2 },
  perfStat: { ...Typography.captionSmall, color: Colors.textSecondary },
  perfScore: { alignItems: 'center' },
  perfScoreValue: { ...Typography.adminMetric, fontSize: 22 },
  perfScoreLabel: { ...Typography.captionSmall, color: Colors.textMuted },
});
