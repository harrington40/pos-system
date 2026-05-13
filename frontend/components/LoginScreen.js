import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography, Shadows, Gradients } from '../theme';

const API_URL = Platform.OS === 'web' ? 'http://localhost:5001' : 'http://10.0.2.2:5001';

export default function LoginScreen({ visible, onLogin, onSkip }) {
  const [pin, setPin] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [showPinInput, setShowPinInput] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [step, setStep] = useState('select'); // select | pin | result
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pinRef = useRef(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 1, damping: 18, stiffness: 180, useNativeDriver: true }),
      ]).start();
      fetchEmployees();
      resetState();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(0);
    }
  }, [visible]);

  const resetState = () => {
    setPin('');
    setEmployeeId('');
    setAiAnalysis(null);
    setShowPinInput(false);
    setSelectedEmployee(null);
    setStep('select');
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/api/employees`);
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (err) {
      console.warn('Failed to fetch employees:', err);
    }
  };

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setEmployeeId(emp._id);
    setStep('pin');
    setTimeout(() => pinRef.current?.focus(), 300);
  };

  const handleLogin = async () => {
    if (!pin.trim()) return;
    setLoading(true);
    setAiAnalysis(null);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: pin.trim(),
          employeeId: employeeId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setAiAnalysis(data.aiAnalysis);
      setStep('result');

      // Brief delay to show AI analysis, then proceed
      setTimeout(() => {
        onLogin(data.token, data.employee);
      }, data.aiAnalysis?.risk === 'high' ? 3000 : 1000);
    } catch (err) {
      Alert.alert('Login Failed', err.message);
      setPin('');
      setStep('select');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPinLogin = async () => {
    if (!pin.trim()) return;
    setLoading(true);
    setAiAnalysis(null);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid PIN');
      }

      setAiAnalysis(data.aiAnalysis);
      setStep('result');

      setTimeout(() => {
        onLogin(data.token, data.employee);
      }, data.aiAnalysis?.risk === 'high' ? 3000 : 1000);
    } catch (err) {
      Alert.alert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#F44336';
      default: return Colors.textSecondary;
    }
  };

  const getRiskEmoji = (risk) => {
    switch (risk) {
      case 'low': return '✅';
      case 'medium': return '⚠️';
      case 'high': return '🚨';
      default: return '❓';
    }
  };

  const slideIn = {
    transform: [{
      translateY: slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [400, 0],
      }),
    }],
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.modal, slideIn]}>
          <View style={styles.handle} />

          {step === 'select' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.logoSection}>
                <View style={styles.logoCircle}>
                  <Text style={styles.logoEmoji}>🔐</Text>
                </View>
                <Text style={styles.title}>Smart Login</Text>
                <Text style={styles.subtitle}>AI-Powered Employee Authentication</Text>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>🤖 AI Security Active</Text>
                </View>
              </View>

              {/* Employee List */}
              <Text style={styles.sectionTitle}>Select Employee</Text>
              {employees.length === 0 ? (
                <View style={styles.quickPinSection}>
                  <Text style={styles.quickPinHint}>No employees loaded. Use PIN directly.</Text>
                  <TouchableOpacity
                    style={styles.quickPinBtn}
                    onPress={() => setStep('quickPin')}
                  >
                    <Text style={styles.quickPinBtnText}>Enter PIN Directly</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                employees.filter(e => e.isActive).map((emp) => (
                  <TouchableOpacity
                    key={emp._id}
                    style={styles.employeeCard}
                    onPress={() => handleSelectEmployee(emp)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.employeeAvatar, {
                      backgroundColor: emp.role === 'admin' ? '#FFD700' :
                        emp.role === 'manager' ? '#4CAF50' : '#2196F3'
                    }]}>
                      <Text style={styles.employeeAvatarText}>
                        {emp.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.employeeInfo}>
                      <Text style={styles.employeeName}>{emp.name}</Text>
                      <Text style={styles.employeeRole}>
                        {emp.role} · {emp.shift} shift
                      </Text>
                    </View>
                    <Text style={styles.employeeArrow}>→</Text>
                  </TouchableOpacity>
                ))
              )}

              {/* Skip Button */}
              <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
                <Text style={styles.skipBtnText}>Skip Login (Guest Mode)</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {step === 'pin' && selectedEmployee && (
            <View>
              <View style={styles.pinHeader}>
                <TouchableOpacity onPress={() => setStep('select')} style={styles.backBtn}>
                  <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
                <View style={styles.pinEmployeeInfo}>
                  <View style={[styles.pinAvatar, {
                    backgroundColor: selectedEmployee.role === 'admin' ? '#FFD700' :
                      selectedEmployee.role === 'manager' ? '#4CAF50' : '#2196F3'
                  }]}>
                    <Text style={styles.pinAvatarText}>
                      {selectedEmployee.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.pinEmployeeName}>{selectedEmployee.name}</Text>
                  <Text style={styles.pinEmployeeRole}>{selectedEmployee.role}</Text>
                </View>
              </View>

              <Text style={styles.pinLabel}>Enter PIN</Text>
              <TextInput
                ref={pinRef}
                style={styles.pinInput}
                placeholder="••••"
                placeholderTextColor={Colors.textMuted}
                value={pin}
                onChangeText={setPin}
                secureTextEntry
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.loginBtn, (!pin.trim() || loading) && styles.loginBtnDisabled]}
                onPress={handleLogin}
                disabled={!pin.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#151515" />
                ) : (
                  <Text style={styles.loginBtnText}>
                    🔐 Login with AI Security
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {step === 'quickPin' && (
            <View>
              <TouchableOpacity onPress={() => setStep('select')} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>

              <Text style={styles.pinLabel}>Enter PIN</Text>
              <TextInput
                ref={pinRef}
                style={styles.pinInput}
                placeholder="Employee PIN"
                placeholderTextColor={Colors.textMuted}
                value={pin}
                onChangeText={setPin}
                secureTextEntry
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.loginBtn, (!pin.trim() || loading) && styles.loginBtnDisabled]}
                onPress={handleQuickPinLogin}
                disabled={!pin.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#151515" />
                ) : (
                  <Text style={styles.loginBtnText}>
                    🔐 Quick Login
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {step === 'result' && aiAnalysis && (
            <View style={styles.resultSection}>
              <View style={styles.resultIcon}>
                <Text style={styles.resultEmoji}>
                  {aiAnalysis.risk === 'low' ? '✅' : aiAnalysis.risk === 'medium' ? '⚠️' : '🛡️'}
                </Text>
              </View>
              <Text style={styles.resultTitle}>
                {aiAnalysis.risk === 'low'
                  ? 'Login Approved'
                  : aiAnalysis.risk === 'medium'
                    ? 'Login Under Review'
                    : 'Security Alert'}
              </Text>

              <View style={[styles.riskBadge, { backgroundColor: getRiskColor(aiAnalysis.risk) + '20' }]}>
                <Text style={[styles.riskBadgeText, { color: getRiskColor(aiAnalysis.risk) }]}>
                  {getRiskEmoji(aiAnalysis.risk)} Risk Level: {aiAnalysis.risk.toUpperCase()}
                </Text>
              </View>

              <Text style={styles.resultReason}>{aiAnalysis.reason}</Text>

              {aiAnalysis.recommendation && (
                <View style={styles.recommendationBox}>
                  <Text style={styles.recommendationLabel}>AI Recommendation:</Text>
                  <Text style={styles.recommendationText}>{aiAnalysis.recommendation}</Text>
                </View>
              )}

              {loading && (
                <View style={styles.processingRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.processingText}>Completing secure login...</Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>
      </Animated.View>
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
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(221, 155, 29, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logoEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  aiBadge: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
  },
  aiBadgeText: {
    fontSize: Typography.caption.fontSize,
    color: '#2196F3',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  employeeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  employeeAvatarText: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: '#151515',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  employeeRole: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  employeeArrow: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  skipBtn: {
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  skipBtnText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
  },
  pinHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  backBtnText: {
    fontSize: Typography.body.fontSize,
    color: Colors.primary,
    fontWeight: '600',
  },
  pinEmployeeInfo: {
    alignItems: 'center',
  },
  pinAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  pinAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#151515',
  },
  pinEmployeeName: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pinEmployeeRole: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
  },
  pinLabel: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  pinInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 28,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: Spacing.lg,
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  loginBtnDisabled: {
    opacity: 0.5,
  },
  loginBtnText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: '#151515',
  },
  quickPinSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  quickPinHint: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  quickPinBtn: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  quickPinBtnText: {
    fontSize: Typography.body.fontSize,
    color: Colors.primary,
    fontWeight: '600',
  },
  resultSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  resultIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  resultEmoji: {
    fontSize: 40,
  },
  resultTitle: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  riskBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    marginBottom: Spacing.md,
  },
  riskBadgeText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
  },
  resultReason: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  recommendationBox: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    width: '100%',
    marginBottom: Spacing.lg,
  },
  recommendationLabel: {
    fontSize: Typography.caption.fontSize,
    color: '#2196F3',
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  recommendationText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  processingText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
  },
});
