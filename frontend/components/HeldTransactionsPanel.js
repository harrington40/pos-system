import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Spacing, BorderRadius, Typography, Shadows } from '../theme';

const API_URL = Platform.OS === 'web'
  ? 'http://localhost:5001'
  : 'http://localhost:5000';

// ──────────────────────────────────────────────
// HeldTransactionsPanel — view, resume, or cancel
// transactions that were auto-held on error
// Premium MVP styling with Square POS theme
// ──────────────────────────────────────────────
export default function HeldTransactionsPanel({ visible, onClose, heldTransactions, onResume, onCancel, onDismissAll }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [locallyRemovedIds, setLocallyRemovedIds] = useState(new Set());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Sync with parent-held transactions, filtering out locally removed ones
  const locallyRemovedIdsRef = useRef(locallyRemovedIds);
  locallyRemovedIdsRef.current = locallyRemovedIds;

  useEffect(() => {
    if (visible) {
      setTransactions(prev => {
        const fresh = (heldTransactions || []).filter(tx => !locallyRemovedIdsRef.current.has(tx._id));
        // If lengths differ, use the filtered list; otherwise keep prev to avoid unnecessary re-renders
        if (fresh.length !== prev.length) return fresh;
        return prev;
      });
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          damping: 22,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset locally removed IDs when panel closes
      setLocallyRemovedIds(new Set());
      fadeAnim.setValue(0);
      slideAnim.setValue(0);
    }
  }, [visible, heldTransactions]); // NOTE: locallyRemovedIds intentionally omitted — read via ref to prevent re-render cycle that interferes with Alert.alert

  // ── Fetch held transactions from API ──
  const fetchHeldTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/transactions/held`);
      if (res.ok) {
        const data = await res.json();
        // Filter out locally removed transactions so API fetch doesn't re-add them
        setTransactions((data.transactions || []).filter(tx => !locallyRemovedIdsRef.current.has(tx._id)));
      }
    } catch (e) {
      console.error('[HeldPanel] Fetch error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Refresh on open
  useEffect(() => {
    if (visible) {
      fetchHeldTransactions();
    }
  }, [visible]);

  // ── Resume a held transaction ──
  // SMART LOGIC: Instead of transitioning ON_HOLD → PAYMENT_IN_PROGRESS (which locks the register),
  // we simply pass the held transaction data back to App.js which restores the cart
  // and opens the CheckoutModal. The transaction stays ON_HOLD until payment completes.
  const handleResume = async (tx) => {
    setActionLoading(tx._id);
    try {
      // Close the panel
      onClose();
      // Pass the transaction to App.js — it will restore cart from orderData.items
      // and open the CheckoutModal. The transaction remains ON_HOLD until payment succeeds.
      if (onResume) {
        onResume(tx);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to resume transaction');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Cancel a held transaction ──
  const handleCancel = (tx) => {
    Alert.alert(
      'Cancel Transaction',
      `Cancel transaction ${tx._id.slice(-6)}? This cannot be undone.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(tx._id);
            try {
              const res = await fetch(`${API_URL}/api/transactions/${tx._id}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  reason: 'Cancelled from held transactions panel',
                  errorCode: 'HELD_CANCELLED',
                }),
              });
              if (res.ok) {
                // Track locally removed ID so sync effect doesn't re-add it
                setLocallyRemovedIds(prev => new Set(prev).add(tx._id));
                // Remove from local state immediately
                setTransactions(prev => prev.filter(t => t._id !== tx._id));
                // Notify parent — this will also update heldTransactions prop
                if (onCancel) onCancel(tx._id);
              } else {
                // Parse error from response body
                let errMsg = 'Failed to cancel transaction';
                try {
                  const errData = await res.json();
                  if (errData.error) errMsg = errData.error;
                } catch (_) {}
                Alert.alert('Cancel Failed', errMsg);
              }
            } catch (e) {
              console.error('[HeldPanel] Cancel error:', e.message);
              Alert.alert('Cancel Failed', `Network error: ${e.message}`);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  // ── Format time elapsed ──
  const getTimeElapsed = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m ago`;
  };

  const slideIn = {
    transform: [{
      translateY: slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [400, 0],
      }),
    }],
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.modal, slideIn]}>
          {/* Drag Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* ── Header ── */}
          <LinearGradient colors={Gradients.surfaceElevated} style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <Text style={styles.headerIcon}>⏸️</Text>
              </View>
              <View>
                <Text style={styles.title}>Held Transactions</Text>
                <Text style={styles.subtitle}>
                  {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} on hold
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              {transactions.length > 0 && onDismissAll && (
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Dismiss All',
                      `Dismiss all ${transactions.length} held transaction${transactions.length !== 1 ? 's' : ''} from view? (They will remain on the server.)`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Dismiss All',
                          onPress: () => {
                            setTransactions([]);
                            onDismissAll();
                          },
                        },
                      ]
                    );
                  }}
                  style={styles.dismissAllBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dismissAllBtnText}>Clear All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* ── Info Banner ── */}
          <View style={styles.infoBanner}>
            <View style={styles.infoBannerAccent} />
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Tap "Resume" to restore the cart and continue checkout. The transaction stays on hold until payment is completed.
            </Text>
          </View>

          {/* ── Transaction List ── */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {loading && transactions.length === 0 ? (
              <View style={styles.centered}>
                <View style={styles.loadingContainer}>
                  <View style={styles.loadingSpinner}>
                    {[0, 1, 2].map((i) => (
                      <Animated.View
                        key={i}
                        style={[
                          styles.loadingDot,
                          {
                            backgroundColor: Colors.primary,
                            opacity: loading ? 1 : 0.3,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.loadingText}>Loading held transactions...</Text>
                </View>
              </View>
            ) : transactions.length === 0 ? (
              <View style={styles.centered}>
                <View style={styles.emptyIconContainer}>
                  <Text style={styles.emptyIcon}>✅</Text>
                </View>
                <Text style={styles.emptyTitle}>All Clear</Text>
                <Text style={styles.emptyText}>
                  No held transactions to review.
                </Text>
                <Text style={styles.emptySubtext}>
                  All transactions are processing normally.
                </Text>
              </View>
            ) : (
              transactions.map((tx, index) => {
                const isProcessing = actionLoading === tx._id;
                const timeAgo = getTimeElapsed(tx.onHoldAt || tx.updatedAt);

                // Determine hold type and error info from errorLog
                const holdErrorCode = tx.errorLog?.[0]?.code || '';
                const isManualHold = holdErrorCode === 'MANUAL_HOLD';
                const hasRealError = !!tx.lastError && !isManualHold;
                const errorMsg = hasRealError ? tx.lastError : '';

                return (
                  <View key={tx._id} style={styles.txCard}>
                    {/* Card Accent — top-left glowing dot */}
                    <View style={[styles.cardAccentDot, { backgroundColor: Colors.warning }]}>
                      <View style={[styles.cardAccentDotInner, { backgroundColor: Colors.warning }]} />
                    </View>

                    {/* Card Header */}
                    <View style={styles.txHeader}>
                      <View style={styles.txIdRow}>
                        <View style={styles.txIdBadge}>
                          <Text style={styles.txIdBadgeText}>TX</Text>
                        </View>
                        <Text style={styles.txIdValue} numberOfLines={1}>
                          {tx._id.slice(-8).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.holdBadge}>
                        <Text style={styles.holdBadgeText}>
                          {isManualHold ? '⏸️ HELD BY USER' : '⏸️ ON HOLD'}
                        </Text>
                      </View>
                    </View>

                    {/* Error Info — only show for real errors, not MANUAL_HOLD */}
                    {hasRealError && (
                      <View style={styles.errorBox}>
                        <View style={styles.errorBoxHeader}>
                          <Text style={styles.errorLabel}>Error</Text>
                          <Text style={styles.errorTime}>{timeAgo}</Text>
                        </View>
                        <Text style={styles.errorText} numberOfLines={2}>{errorMsg}</Text>
                      </View>
                    )}

                    {/* Meta Row */}
                    <View style={styles.metaRow}>
                      {tx.registerId && (
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Register</Text>
                          <View style={styles.metaValueRow}>
                            <View style={[styles.metaDot, { backgroundColor: Colors.primary }]} />
                            <Text style={styles.metaValue}>{tx.registerId}</Text>
                          </View>
                        </View>
                      )}
                      {tx.orderData?.items && (
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Items</Text>
                          <Text style={styles.metaValue}>
                            {tx.orderData.items.length} item{tx.orderData.items.length !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                      {tx.orderData?.total && (
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Total</Text>
                          <Text style={[styles.metaValue, styles.metaValuePrice]}>
                            ${Number(tx.orderData.total).toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Bottom Glow Bar */}
                    <View style={[styles.cardBottomGlow, { backgroundColor: Colors.warning }]}>
                      <View style={[styles.cardBottomGlowReflection, { backgroundColor: Colors.warning }]} />
                    </View>

                    {/* Actions */}
                    <View style={styles.txActions}>
                      <TouchableOpacity
                        style={[styles.resumeBtn, isProcessing && styles.btnDisabled]}
                        onPress={() => handleResume(tx)}
                        disabled={isProcessing}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={[Colors.primary, Colors.primaryDark]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.resumeBtnGradient}
                        >
                          <Text style={styles.resumeBtnText}>
                            {isProcessing ? '⏳' : '▶️'} Resume
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.cancelBtn, isProcessing && styles.btnDisabled]}
                        onPress={() => handleCancel(tx)}
                        disabled={isProcessing}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.cancelBtnText}>
                          {isProcessing ? '⏳' : '✕'} Cancel
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// Styles — Premium MVP with Square POS theme
// ──────────────────────────────────────────────
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
    maxHeight: '88%',
    ...Shadows.md,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  headerIcon: {
    fontSize: 20,
  },
  title: {
    fontSize: Typography.h2,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dismissAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    marginRight: 8,
  },
  dismissAllBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warning || '#f59e0b',
  },

  // ── Info Banner ──
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: 'rgba(74, 158, 255, 0.08)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(74, 158, 255, 0.15)',
    overflow: 'hidden',
  },
  infoBannerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.secondary,
    borderTopLeftRadius: BorderRadius.md,
    borderBottomLeftRadius: BorderRadius.md,
  },
  infoIcon: {
    fontSize: 14,
    marginRight: Spacing.sm,
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // ── List ──
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },

  // ── Loading State ──
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.huge * 2,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingSpinner: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  loadingText: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
  },

  // ── Empty State ──
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.2)',
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: Typography.h2,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: Typography.bodySmall,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },

  // ── Transaction Card ──
  txCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
    position: 'relative',
    overflow: 'hidden',
    ...Shadows.sm,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  txIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIdBadge: {
    backgroundColor: 'rgba(0, 212, 170, 0.15)',
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginRight: Spacing.sm,
  },
  txIdBadgeText: {
    fontSize: Typography.caption,
    fontWeight: '700',
    color: Colors.primary,
  },
  txIdValue: {
    fontSize: Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  holdBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  holdBadgeText: {
    fontSize: Typography.caption,
    fontWeight: '700',
    color: Colors.warning,
    letterSpacing: 0.3,
  },

  // ── Error Box ──
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.12)',
  },
  errorBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  errorLabel: {
    fontSize: Typography.caption,
    fontWeight: '700',
    color: Colors.error,
    letterSpacing: 0.3,
  },
  errorTime: {
    fontSize: Typography.captionSmall,
    color: Colors.textMuted,
  },
  errorText: {
    fontSize: Typography.bodySmall,
    color: '#FCA5A5',
    lineHeight: 16,
  },

  // ── Meta Row ──
  metaRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metaItem: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  metaLabel: {
    fontSize: Typography.captionSmall,
    color: Colors.textMuted,
    marginBottom: 2,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  metaValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  metaValue: {
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  metaValuePrice: {
    color: Colors.primary,
    fontWeight: '700',
  },

  // ── Card Accent Effects ──
  cardAccentDot: {
    position: 'absolute',
    top: -3,
    left: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    opacity: 0.9,
    zIndex: 10,
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  cardAccentDotInner: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
  },
  cardBottomGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.6,
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  cardBottomGlowReflection: {
    position: 'absolute',
    bottom: -4,
    left: '10%',
    right: '10%',
    height: 6,
    borderRadius: 3,
    opacity: 0.15,
  },

  // ── Actions ──
  txActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  resumeBtn: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  resumeBtnGradient: {
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeBtnText: {
    fontSize: Typography.bodySmall,
    fontWeight: '700',
    color: Colors.textDark,
    letterSpacing: 0.3,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  cancelBtnText: {
    fontSize: Typography.bodySmall,
    fontWeight: '700',
    color: Colors.error,
    letterSpacing: 0.3,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
