import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../theme';

const API_URL = Platform.OS === 'web'
  ? 'http://localhost:5001'
  : 'http://10.0.2.2:5001';

/**
 * BarcodeScanner — Scan or type a barcode to look up a discount coupon.
 *
 * Props:
 *   onCouponFound  (discount) => void  — called when a valid coupon is scanned
 *   onClose        () => void           — close the scanner
 *   visible        boolean              — show/hide
 *   cartItems      array                — current cart items (for recommendations)
 *   orderTotal     number               — current order total
 */
export default function BarcodeScanner({ visible, onClose, onCouponFound, cartItems = [], orderTotal = 0 }) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [activeSales, setActiveSales] = useState([]);
  const [tab, setTab] = useState('scan'); // 'scan' | 'qr' | 'recommendations' | 'sales'
  // QR scan state
  const [qrInput, setQrInput] = useState('');
  const [qrResult, setQrResult] = useState(null);
  const [qrProcessing, setQrProcessing] = useState(false);
  const [qrError, setQrError] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 1, damping: 20, stiffness: 200, useNativeDriver: true }),
      ]).start();
      setBarcodeInput('');
      setResult(null);
      setError('');
      setTab('scan');
      setQrInput('');
      setQrResult(null);
      setQrError('');

      // Fetch recommendations when opened
      if (cartItems.length > 0) {
        fetchRecommendations();
      }
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(0);
    }
  }, [visible]);

  const fetchRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const response = await fetch(`${API_URL}/api/discounts/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map(item => ({
            _id: item._id,
            category: item.category,
            price: item.price,
            quantity: item.quantity,
          })),
          orderTotal,
        }),
      });
      const data = await response.json();
      setRecommendations(data.bestDiscounts || []);
      setActiveSales(data.activeSales || []);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleScan = async () => {
    const code = barcodeInput.trim();
    if (!code) return;

    setScanning(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/api/discounts/scan-barcode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: code }),
      });

      const data = await response.json();

      if (data.found && data.discount) {
        setResult(data.discount);
      } else {
        setError(data.error || 'No coupon found for this barcode');
      }
    } catch (err) {
      setError('Failed to scan. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleQrScan = async () => {
    const raw = qrInput.trim();
    if (!raw) return;

    setQrProcessing(true);
    setQrError('');
    setQrResult(null);

    try {
      const response = await fetch(`${API_URL}/api/payments/qr-code/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to process QR code');
      }

      const data = await response.json();
      setQrResult(data);

      // Auto-apply if it's a coupon
      if (data.type === 'coupon' && data.discount && onCouponFound) {
        setTimeout(() => {
          onCouponFound(data.discount);
          if (onClose) onClose();
        }, 1500);
      }
    } catch (err) {
      setQrError(err.message);
    } finally {
      setQrProcessing(false);
    }
  };

  const handleApplyCoupon = (discount) => {
    if (onCouponFound) {
      onCouponFound(discount);
    }
    if (onClose) {
      onClose();
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'percentage': return '% OFF';
      case 'fixed': return '$ OFF';
      case 'bogo': return 'BOGO';
      default: return '';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'percentage': return '#4CAF50';
      case 'fixed': return '#2196F3';
      case 'bogo': return '#FF9800';
      default: return Colors.primary;
    }
  };

  const slideIn = {
    transform: [{
      translateY: slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [300, 0],
      }),
    }],
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <TouchableOpacity style={styles.overlayTouch} onPress={onClose} activeOpacity={1} />
      <Animated.View style={[styles.modal, slideIn]}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Coupons & Discounts</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'scan' && styles.tabActive]}
            onPress={() => setTab('scan')}
          >
            <Text style={[styles.tabText, tab === 'scan' && styles.tabTextActive]}>
              📷 Barcode
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'qr' && styles.tabActive]}
            onPress={() => setTab('qr')}
          >
            <Text style={[styles.tabText, tab === 'qr' && styles.tabTextActive]}>
              📱 QR Code
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'recommendations' && styles.tabActive]}
            onPress={() => setTab('recommendations')}
          >
            <Text style={[styles.tabText, tab === 'recommendations' && styles.tabTextActive]}>
              💡 Best For You
            </Text>
          </TouchableOpacity>
          {activeSales.length > 0 && (
            <TouchableOpacity
              style={[styles.tab, tab === 'sales' && styles.tabActive]}
              onPress={() => setTab('sales')}
            >
              <Text style={[styles.tabText, tab === 'sales' && styles.tabTextActive]}>
                🔥 Sales
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Content */}
        {tab === 'scan' && (
          <View style={styles.scanSection}>
            {/* Barcode Input */}
            <View style={styles.scanRow}>
              <TextInput
                style={styles.scanInput}
                placeholder="Scan or type barcode / coupon code"
                placeholderTextColor={Colors.textMuted}
                value={barcodeInput}
                onChangeText={(text) => {
                  setBarcodeInput(text.toUpperCase());
                  setError('');
                  setResult(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                onSubmitEditing={handleScan}
                returnKeyType="search"
              />
              <TouchableOpacity
                style={[styles.scanBtn, (!barcodeInput.trim() || scanning) && styles.scanBtnDisabled]}
                onPress={handleScan}
                disabled={!barcodeInput.trim() || scanning}
              >
                {scanning ? (
                  <ActivityIndicator size="small" color="#151515" />
                ) : (
                  <Text style={styles.scanBtnText}>Find</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Hint */}
            <Text style={styles.hint}>
              Type a coupon code or scan a barcode number
            </Text>

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            {/* Scanned Result */}
            {result && (
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultCode}>{result.code}</Text>
                  <View style={[styles.resultBadge, { backgroundColor: getTypeColor(result.type) }]}>
                    <Text style={styles.resultBadgeText}>{getTypeLabel(result.type)}</Text>
                  </View>
                </View>
                {result.description ? (
                  <Text style={styles.resultDesc}>{result.description}</Text>
                ) : null}
                <View style={styles.resultValue}>
                  <Text style={styles.resultValueText}>
                    {result.type === 'percentage'
                      ? `${result.value}% off`
                      : result.type === 'fixed'
                        ? `$${result.value} off`
                        : 'Buy One Get One'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={() => handleApplyCoupon(result)}
                >
                  <Text style={styles.applyBtnText}>Apply Coupon</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {tab === 'qr' && (
          <View style={styles.scanSection}>
            {/* QR Input */}
            <View style={styles.scanRow}>
              <TextInput
                style={styles.scanInput}
                placeholder="Paste QR code data here"
                placeholderTextColor={Colors.textMuted}
                value={qrInput}
                onChangeText={(text) => {
                  setQrInput(text);
                  setQrError('');
                  setQrResult(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleQrScan}
                returnKeyType="search"
                multiline
              />
              <TouchableOpacity
                style={[styles.scanBtn, (!qrInput.trim() || qrProcessing) && styles.scanBtnDisabled]}
                onPress={handleQrScan}
                disabled={!qrInput.trim() || qrProcessing}
              >
                {qrProcessing ? (
                  <ActivityIndicator size="small" color="#151515" />
                ) : (
                  <Text style={styles.scanBtnText}>Scan</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Hint */}
            <Text style={styles.hint}>
              Paste QR code content (JSON) to verify receipts, apply coupons, or look up items
            </Text>

            {/* Error */}
            {qrError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {qrError}</Text>
              </View>
            ) : null}

            {/* QR Result */}
            {qrResult && (
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultCode}>
                    {qrResult.type === 'receipt' ? '🧾 Receipt' :
                     qrResult.type === 'coupon' ? '🏷️ Coupon' :
                     qrResult.type === 'item' ? '📦 Item' : '📄 Data'}
                  </Text>
                  <View style={[styles.resultBadge, {
                    backgroundColor: qrResult.type === 'receipt' ? '#9C27B0' :
                      qrResult.type === 'coupon' ? '#4CAF50' : '#2196F3'
                  }]}>
                    <Text style={styles.resultBadgeText}>{qrResult.type.toUpperCase()}</Text>
                  </View>
                </View>

                {qrResult.type === 'receipt' && (
                  <>
                    <Text style={styles.resultDesc}>
                      Receipt: {qrResult.receiptNumber || qrResult.payload?.receipt}
                    </Text>
                    <View style={styles.resultValue}>
                      <Text style={styles.resultValueText}>
                        Total: ${(qrResult.payload?.total || 0).toFixed(2)} • Items: {qrResult.payload?.items || 0}
                      </Text>
                    </View>
                    {qrResult.payload?.discCode && (
                      <Text style={styles.resultDesc}>
                        Discount: {qrResult.payload.discCode} (-${(qrResult.payload.discAmt || 0).toFixed(2)})
                      </Text>
                    )}
                  </>
                )}

                {qrResult.type === 'coupon' && qrResult.discount && (
                  <>
                    <Text style={styles.resultDesc}>{qrResult.discount.description}</Text>
                    <View style={styles.resultValue}>
                      <Text style={styles.resultValueText}>
                        {qrResult.discount.type === 'percentage'
                          ? `${qrResult.discount.value}% off`
                          : qrResult.discount.type === 'fixed'
                            ? `$${qrResult.discount.value} off`
                            : 'Buy One Get One'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.applyBtn}
                      onPress={() => handleApplyCoupon(qrResult.discount)}
                    >
                      <Text style={styles.applyBtnText}>Apply Coupon</Text>
                    </TouchableOpacity>
                  </>
                )}

                {qrResult.type === 'item' && (
                  <>
                    <Text style={styles.resultDesc}>{qrResult.name}</Text>
                    <View style={styles.resultValue}>
                      <Text style={styles.resultValueText}>
                        ${(qrResult.price || 0).toFixed(2)}
                      </Text>
                    </View>
                  </>
                )}

                {qrResult.type === 'text' && (
                  <Text style={styles.resultDesc}>{qrResult.data}</Text>
                )}

                {qrResult.type === 'unknown' && qrResult.payload && (
                  <Text style={styles.resultDesc}>
                    Unknown QR type: {JSON.stringify(qrResult.payload).slice(0, 100)}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {tab === 'recommendations' && (
          <View style={styles.recsSection}>
            {loadingRecs ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Finding best deals...</Text>
              </View>
            ) : recommendations.length === 0 ? (
              <View style={styles.centered}>
                <Text style={styles.emptyIcon}>🏷️</Text>
                <Text style={styles.emptyTitle}>No recommendations yet</Text>
                <Text style={styles.emptyText}>Add items to your cart to see personalized deals</Text>
              </View>
            ) : (
              <>
                <Text style={styles.recsSubtitle}>
                  Top deals for your cart (${orderTotal.toFixed(2)})
                </Text>
                {recommendations.map((rec, index) => (
                  <View key={rec.discount._id || index} style={styles.recCard}>
                    <View style={styles.recHeader}>
                      <View style={styles.recRankBadge}>
                        <Text style={styles.recRankText}>#{index + 1}</Text>
                      </View>
                      <View style={styles.recInfo}>
                        <Text style={styles.recCode}>{rec.discount.code}</Text>
                        <Text style={styles.recSavings}>
                          Save ${rec.potentialSavings.toFixed(2)} • {rec.savingsLabel}
                        </Text>
                      </View>
                      <View style={[styles.recScoreBadge, {
                        backgroundColor: rec.score >= 50 ? '#4CAF50' : rec.score >= 30 ? '#FF9800' : '#FF5722'
                      }]}>
                        <Text style={styles.recScoreText}>{rec.score}</Text>
                      </View>
                    </View>
                    {rec.reasons.length > 0 && (
                      <View style={styles.recReasons}>
                        {rec.reasons.map((reason, i) => (
                          <Text key={i} style={styles.recReason}>✓ {reason}</Text>
                        ))}
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.applyBtn}
                      onPress={() => handleApplyCoupon(rec.discount)}
                    >
                      <Text style={styles.applyBtnText}>Apply {rec.discount.code}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {tab === 'sales' && (
          <View style={styles.salesSection}>
            <Text style={styles.recsSubtitle}>Active sale events you can use</Text>
            {activeSales.map((sale) => (
              <View key={sale._id} style={[styles.saleCard, { borderLeftColor: sale.bannerColor || Colors.primary }]}>
                <View style={styles.saleHeader}>
                  <Text style={styles.saleName}>{sale.name}</Text>
                  <View style={[styles.saleBadge, { backgroundColor: sale.bannerColor || Colors.primary }]}>
                    <Text style={styles.saleBadgeText}>{sale.discountPercentage}% OFF</Text>
                  </View>
                </View>
                <Text style={styles.saleDesc}>{sale.description}</Text>
                {sale.applicableCategories.length > 0 && (
                  <Text style={styles.saleCategories}>
                    Categories: {sale.applicableCategories.join(', ')}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    zIndex: 1000,
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
    maxHeight: '80%',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    fontSize: 20,
    color: Colors.textSecondary,
    padding: Spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  tab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
  },
  tabActive: {
    backgroundColor: 'rgba(221, 155, 29, 0.15)',
  },
  tabText: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  scanSection: {
    gap: Spacing.sm,
  },
  scanRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  scanInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    fontWeight: '600',
    letterSpacing: 2,
  },
  scanBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBtnDisabled: {
    opacity: 0.5,
  },
  scanBtnText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: '#151515',
  },
  hint: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  errorText: {
    fontSize: Typography.body.fontSize,
    color: Colors.error,
    fontWeight: '500',
  },
  resultCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  resultCode: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 3,
  },
  resultBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  resultBadgeText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '700',
    color: '#fff',
  },
  resultDesc: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  resultValue: {
    marginBottom: Spacing.md,
  },
  resultValueText: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: '#4CAF50',
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: '#151515',
  },
  recsSection: {
    gap: Spacing.sm,
  },
  recsSubtitle: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  recCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  recRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recRankText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#151515',
  },
  recInfo: {
    flex: 1,
  },
  recCode: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  recSavings: {
    fontSize: Typography.caption.fontSize,
    color: '#4CAF50',
    fontWeight: '600',
  },
  recScoreBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  recScoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  recReasons: {
    marginTop: Spacing.sm,
    gap: 2,
  },
  recReason: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
  },
  salesSection: {
    gap: Spacing.sm,
  },
  saleCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  saleName: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  saleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  saleBadgeText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '700',
    color: '#fff',
  },
  saleDesc: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
  },
  saleCategories: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
});
