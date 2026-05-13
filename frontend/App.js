import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { Colors, Gradients, Spacing, BorderRadius, Typography, Shadows } from './theme';
import {
  GlassCard,
  PrimaryButton,
  Badge,
  LoadingSpinner,
  QuantitySelector,
  CategoryPill,
  BottomBar,
} from './components/UI';
import { PlaceholderImage } from './components/PlaceholderImage';
import CheckoutModal from './components/CheckoutModal';
import ReceiptView from './components/ReceiptView';
import OrderHistory from './components/OrderHistory';
import InventoryPanel from './components/InventoryPanel';
import RestockSuggestions from './components/RestockSuggestions';
import AdminDashboard from './components/AdminDashboard';
import LoginScreen from './components/LoginScreen';
import CustomerPanel from './components/CustomerPanel';
import HeldTransactionsPanel from './components/HeldTransactionsPanel';
import SupplierPayment from './components/SupplierPayment';

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const BASE_URL = 'http://localhost:5001';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;
const CARD_GAP = 12;

const CATEGORIES = [
  { id: 'all', name: 'All', icon: '📋', color: Colors.primary },
  { id: 'food', name: 'Food', icon: '🍔', color: Colors.categoryFood },
  { id: 'beverage', name: 'Beverages', icon: '🥤', color: Colors.categoryBeverage },
  { id: 'dessert', name: 'Desserts', icon: '🍰', color: Colors.categoryDessert },
  { id: 'special', name: 'Specials', icon: '⭐', color: Colors.categorySpecial },
  { id: 'snack', name: 'Snacks', icon: '🍿', color: Colors.categorySnack },
];

// ──────────────────────────────────────────────
// Main App Component
// ──────────────────────────────────────────────
export default function App() {
  const [menuItems, setMenuItems] = useState([]);
  const [activeDiscounts, setActiveDiscounts] = useState([]);
  const [activeSales, setActiveSales] = useState([]);
  const [upcomingSales, setUpcomingSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  // ── Smart Login & Customer Panel ──
  const [showLogin, setShowLogin] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [showCustomerPanel, setShowCustomerPanel] = useState(false);

  // ── Held Transactions ──
  const [heldTransactions, setHeldTransactions] = useState([]);
  const [showHeldPanel, setShowHeldPanel] = useState(false);
  const [resumeTransactionId, setResumeTransactionId] = useState(null);
  const [showSupplierPayment, setShowSupplierPayment] = useState(false);
  const heldCount = heldTransactions.length;

  // ── Animated header scale on scroll ──
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.85],
    extrapolate: 'clamp',
  });

  // ── Poll for held transactions ──
  useEffect(() => {
    const fetchHeld = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/transactions/held`);
        if (res.ok) {
          const data = await res.json();
          setHeldTransactions(data.transactions || []);
        }
      } catch (err) {}
    };
    fetchHeld();
    const interval = setInterval(fetchHeld, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMenuData = useCallback(async (options = {}) => {
    try {
      const cacheBuster = options.force ? `?_=${Date.now()}` : '';
      const [menuRes, activeDiscRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/menu${cacheBuster}`),
        axios.get(`${BASE_URL}/api/discounts/active-menu`)
      ]);
      setMenuItems(menuRes.data);
      if (activeDiscRes.data) {
        setActiveDiscounts(activeDiscRes.data.discounts || []);
        setActiveSales(activeDiscRes.data.sales || []);
        setUpcomingSales(activeDiscRes.data.upcomingSales || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenuData();
  }, [fetchMenuData]);

  const filteredItems = useMemo(() =>
    selectedCategory === 'all'
      ? menuItems
      : menuItems.filter(item => item.category === selectedCategory),
    [menuItems, selectedCategory]
  );

  const addToCart = useCallback((item) => {
    setCart(prev => {
      const existing = prev.find(c => c._id === item._id);
      if (existing) {
        return prev.map(c =>
          c._id === item._id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((itemId) => {
    setCart(prev => prev.filter(item => item._id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId, delta) => {
    setCart(prev =>
      prev.map(c =>
        c._id === itemId
          ? { ...c, quantity: Math.max(1, c.quantity + delta) }
          : c
      ).filter(c => c.quantity > 0)
    );
  }, []);

  const cartTotal = useMemo(() =>
    cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    [cart]
  );
  const cartCount = useMemo(() =>
    cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  // ── Smart Login Handlers ──
  const handleLogin = useCallback((token, employee) => {
    setAuthToken(token);
    setCurrentEmployee(employee);
    setIsLoggedIn(true);
    setShowLogin(false);
  }, []);

  const handleSkipLogin = useCallback(() => {
    setIsLoggedIn(false);
    setCurrentEmployee(null);
    setShowLogin(false);
  }, []);

  const handleLogout = useCallback(() => {
    setAuthToken(null);
    setCurrentEmployee(null);
    setIsLoggedIn(false);
    setShowLogin(true);
  }, []);

  const handleCheckout = useCallback(() => {
    if (cart.length > 0) {
      setShowCheckout(true);
    }
  }, [cart]);

  const handleCheckoutComplete = useCallback((order) => {
    setCart([]);
    setShowCart(false);
    setShowCheckout(false);
    setLastOrder(order);
    setResumeTransactionId(null);
  }, []);

  const handleTransactionHeld = useCallback((transaction) => {
    if (transaction) {
      setHeldTransactions(prev => {
        if (prev.some(t => t._id === transaction._id)) return prev;
        return [transaction, ...prev];
      });
    }
  }, []);

  const handleResumeHeld = useCallback((transaction) => {
    if (transaction) {
      // Remove from held list
      setHeldTransactions(prev => prev.filter(t => t._id !== transaction._id));
      // Restore cart from held transaction's orderData.items
      const items = transaction.orderData?.items;
      if (items && items.length > 0) {
        setCart(items);
      }
      // Cancel the old ON_HOLD transaction in the database so the polling
      // effect does NOT re-add it to the held list after payment completes.
      fetch(`${BASE_URL}/api/transactions/${transaction._id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Resumed by cashier — old transaction cancelled' }),
      }).catch(() => {
        // Non-blocking: best-effort cancellation of the old held transaction
      });
      // Set the resumeTransactionId so CheckoutModal knows to resume this transaction
      setResumeTransactionId(transaction._id);
      // Open checkout modal so user can complete payment
      setShowCheckout(true);
    }
  }, []);

  const handleCancelHeld = useCallback((transactionId) => {
    setHeldTransactions(prev => prev.filter(t => t._id !== transactionId));
  }, []);

  // ── Dismiss all held transactions from local state (does NOT cancel on server) ──
  const handleDismissAllHeld = useCallback(() => {
    setHeldTransactions([]);
  }, []);

  const handleNewTransaction = useCallback(() => {
    setCart([]);
    setShowCart(false);
    setResumeTransactionId(null);
  }, []);

  const handleCloseReceipt = useCallback(() => {
    setShowReceipt(false);
  }, []);

  // ── Loading State ──
  if (loading) {
    return (
      <LinearGradient colors={Gradients.backgroundDeep} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor={Colors.backgroundDeep} />
          <View style={styles.centered}>
            <View style={styles.loadingIconContainer}>
              <View style={styles.loadingIconBg}>
                <Text style={styles.loadingEmoji}>🛒</Text>
              </View>
            </View>
            <Text style={styles.loadingTitle}>POS System</Text>
            <Text style={styles.loadingSubtitle}>Point of Sale · Ready When You Are</Text>
            <View style={styles.loadingDivider} />
            <Text style={styles.loadingText}>Loading menu...</Text>
            <ActivityIndicator
              size="small"
              color={Colors.primary}
              style={{ marginTop: Spacing.xl }}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={Gradients.backgroundDeep} style={styles.container}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.backgroundDeep} />

        {/* ── Header ── */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <View style={styles.headerLeft}>
            <View style={styles.headerBrand}>
              <Text style={styles.headerLogo}>⬡</Text>
              <View>
                <Text style={styles.headerTitle}>POS System</Text>
                <Text style={styles.headerSubtitle}>
                  {currentEmployee
                    ? `${currentEmployee.name} · ${currentEmployee.role}`
                    : `${menuItems.length} items`}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            {heldCount > 0 && (
              <TouchableOpacity
                onPress={() => setShowHeldPanel(true)}
                onLongPress={() => {
                  Alert.alert(
                    'Dismiss Held Items',
                    `Dismiss ${heldCount} held transaction${heldCount !== 1 ? 's' : ''} from view? (They will remain on the server.)`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Dismiss All',
                        onPress: () => setHeldTransactions([]),
                      },
                    ]
                  );
                }}
                style={[styles.headerActionBtn, styles.heldBadgeBtn]}
                activeOpacity={0.7}
              >
                <Text style={styles.headerActionIcon}>⏸️</Text>
                <View style={styles.heldBadge}>
                  <Text style={styles.heldBadgeText}>{heldCount}</Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setShowCustomerPanel(true)}
              style={styles.headerActionBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.headerActionIcon}>👥</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowAdminDashboard(true)}
              style={[styles.headerActionBtn, styles.adminBtn]}
              activeOpacity={0.7}
            >
              <Text style={styles.headerActionIcon}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowSupplierPayment(true)}
              style={styles.headerActionBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.headerActionIcon}>💸</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowInventory(true)}
              style={styles.headerActionBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.headerActionIcon}>📦</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowAnalytics(true)}
              style={styles.headerActionBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.headerActionIcon}>📊</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowOrderHistory(true)}
              style={styles.headerActionBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.headerActionIcon}>📋</Text>
            </TouchableOpacity>
            {isLoggedIn ? (
              <TouchableOpacity
                onPress={handleLogout}
                style={[styles.headerActionBtn, { backgroundColor: 'rgba(201,122,106,0.15)', borderColor: Colors.error }]}
                activeOpacity={0.7}
              >
                <Text style={styles.headerActionIcon}>🚪</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => setShowCart(!showCart)}
              style={[styles.cartButton, cartCount > 0 && styles.cartButtonActive]}
              activeOpacity={0.7}
            >
              <Text style={styles.cartIcon}>🛒</Text>
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Category Pills ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          {CATEGORIES.map(category => {
            const isActive = selectedCategory === category.id;
            return (
              <CategoryPill
                key={category.id}
                label={category.name}
                isActive={isActive}
                color={category.color}
                onPress={() => setSelectedCategory(category.id)}
                icon={category.icon}
              />
            );
          })}
        </ScrollView>

        {/* ── Upcoming Sales Countdown Banner ── */}
        {upcomingSales.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.upcomingSalesScroll}
            contentContainerStyle={styles.upcomingSalesContainer}
          >
            {upcomingSales.map(sale => (
              <View key={sale._id} style={[styles.upcomingSaleCard, { borderLeftColor: sale.bannerColor || '#FF9A76' }]}>
                <Text style={styles.upcomingSaleIcon}>⏰</Text>
                <View style={styles.upcomingSaleInfo}>
                  <Text style={styles.upcomingSaleName}>{sale.name}</Text>
                  <Text style={styles.upcomingSaleCountdown}>
                    {sale.countdown?.startsIn || 'Coming soon'} · {sale.discountPercentage}% OFF
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* ── Main Content ── */}
        {!showCart ? (
          <MenuView
            filteredItems={filteredItems}
            selectedCategory={selectedCategory}
            addToCart={addToCart}
            scrollY={scrollY}
            activeDiscounts={activeDiscounts}
            activeSales={activeSales}
          />
        ) : (
          <CartView
            cart={cart}
            cartTotal={cartTotal}
            onRemove={removeFromCart}
            onUpdateQuantity={updateQuantity}
            onCheckout={handleCheckout}
            onClose={() => setShowCart(false)}
          />
        )}

        {/* ── Bottom Bar ── */}
        {!showCart && (
          <BottomBar
            total={cartTotal}
            itemCount={cartCount}
            onCheckout={handleCheckout}
            onCartPress={() => setShowCart(true)}
          />
        )}

        {/* ── Modals ── */}
        <LoginScreen
          visible={showLogin}
          onLogin={handleLogin}
          onSkip={handleSkipLogin}
        />
        <CustomerPanel
          visible={showCustomerPanel}
          onClose={() => setShowCustomerPanel(false)}
        />
        <CheckoutModal
          visible={showCheckout}
          onClose={() => {
            setShowCheckout(false);
            setResumeTransactionId(null);
          }}
          cart={cart}
          onCheckoutComplete={handleCheckoutComplete}
          onTransactionHold={(data) => {
            console.log('[Transaction] Hold event:', data);
          }}
          onTransactionHeld={handleTransactionHeld}
          onNewTransaction={handleNewTransaction}
          heldCount={heldCount}
          resumeTransactionId={resumeTransactionId}
          initiatedBy={currentEmployee?._id || null}
        />
        <ReceiptView
          visible={showReceipt}
          onClose={handleCloseReceipt}
          order={lastOrder}
        />
        <OrderHistory
          visible={showOrderHistory}
          onClose={() => setShowOrderHistory(false)}
          employeeId={currentEmployee?._id}
        />
        <InventoryPanel
          visible={showInventory}
          onClose={() => setShowInventory(false)}
          onMenuUpdate={() => fetchMenuData({ force: true })}
        />
        <RestockSuggestions
          visible={showAnalytics}
          onClose={() => setShowAnalytics(false)}
        />
        <AdminDashboard
          visible={showAdminDashboard}
          onClose={() => setShowAdminDashboard(false)}
        />
        <HeldTransactionsPanel
          visible={showHeldPanel}
          onClose={() => setShowHeldPanel(false)}
          heldTransactions={heldTransactions}
          onResume={handleResumeHeld}
          onCancel={handleCancelHeld}
          onDismissAll={handleDismissAllHeld}
        />
        <SupplierPayment
          visible={showSupplierPayment}
          onClose={() => setShowSupplierPayment(false)}
          employeeId={currentEmployee?._id}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

// ──────────────────────────────────────────────
// Menu View — 2-column product grid with scroll-driven header
// ──────────────────────────────────────────────
const MenuView = React.memo(({
  filteredItems,
  selectedCategory,
  addToCart,
  scrollY,
  activeDiscounts = [],
  activeSales = [],
}) => {
  const renderItem = useCallback(({ item, index }) => (
    <ProductCard
      item={item}
      onAddPress={() => addToCart(item)}
      index={index}
      activeDiscounts={activeDiscounts}
      activeSales={activeSales}
    />
  ), [addToCart, activeDiscounts, activeSales]);

  const keyExtractor = useCallback((item) => item._id, []);

  const ListHeader = useMemo(() => (
    <View style={styles.menuHeader}>
      <View style={styles.menuHeaderTop}>
        <Text style={styles.menuTitle}>
          {selectedCategory === 'all' ? '☕ Menu' : CATEGORIES.find(c => c.id === selectedCategory)?.icon + ' ' + selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
        </Text>
        <View style={styles.menuCountBadge}>
          <Text style={styles.menuCountText}>{filteredItems.length} items</Text>
        </View>
      </View>
      <Text style={styles.menuSubtitle}>
        {selectedCategory === 'all'
          ? 'All menu items'
          : `Browse ${selectedCategory}`}
      </Text>
    </View>
  ), [selectedCategory, filteredItems.length]);

  return (
    <Animated.FlatList
      data={filteredItems}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      numColumns={2}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={styles.menuListContent}
      columnWrapperStyle={styles.menuRow}
      showsVerticalScrollIndicator={false}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
      )}
      scrollEventThrottle={16}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🔍</Text>
          <Text style={styles.emptyStateText}>No items found</Text>
          <Text style={styles.emptyStateSubtext}>Try a different category</Text>
        </View>
      }
    />
  );
});

// ──────────────────────────────────────────────
// Discount helpers
// ──────────────────────────────────────────────

/**
 * Find the best active discount/sale applicable to a menu item.
 * Returns { type, value, label, discountedPrice } or null.
 * Only sale events are shown on menu items (they apply automatically).
 * Discount codes require a code entry at checkout and are NOT shown here.
 */
const getBestDiscountForItem = (item, activeDiscounts, activeSales) => {
  const itemCategory = item.category;
  const itemPrice = item.price || 0;
  let best = null;

  // Check sale events only (they apply automatically, no code needed)
  for (const sale of activeSales) {
    const appliesToItem =
      (!sale.applicableItems || sale.applicableItems.length === 0 || sale.applicableItems.includes(item._id)) &&
      (!sale.applicableCategories || sale.applicableCategories.length === 0 || sale.applicableCategories.includes(itemCategory));
    if (!appliesToItem) continue;

    const pct = sale.discountPercentage || 0;
    const discountedPrice = itemPrice * (1 - pct / 100);
    const savings = itemPrice - discountedPrice;
    if (!best || savings > (itemPrice - best.discountedPrice)) {
      best = {
        type: 'sale',
        value: pct,
        label: `${pct}% OFF`,
        discountedPrice,
        badgeColor: sale.bannerColor || '#DD9B1D',
        saleName: sale.name,
      };
    }
  }

  return best;
};

// ──────────────────────────────────────────────
// Product Card — premium coffee shop card
// ──────────────────────────────────────────────
const ProductCard = React.memo(({ item, onAddPress, index = 0, activeDiscounts = [], activeSales = [] }) => {
  // Generate a unique image key that changes when the image URL changes.
  // This forces React to unmount/remount the <Image> component when the image
  // is updated, preventing stale cached images from appearing on the wrong card.
  const imageUri = item.image
    ? (item.image.startsWith('/') ? `${BASE_URL}${item.image}` : item.image)
    : null;
  const imageKey = imageUri ? `img-${item._id}-${imageUri}` : `noimg-${item._id}`;

  // Debug log to trace image rendering — helps diagnose cross-contamination
  if (__DEV__) {
    console.log(`[ProductCard] Rendering "${item.name}" (${item._id}) — image: ${imageUri?.substring(0, 80) || 'none'}`);
  }
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'food': return '🍔';
      case 'beverage': return '🥤';
      case 'dessert': return '🍰';
      case 'special': return '⭐';
      case 'snack': return '🍿';
      default: return '📋';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'food': return Colors.categoryFood;
      case 'beverage': return Colors.categoryBeverage;
      case 'dessert': return Colors.categoryDessert;
      case 'special': return Colors.categorySpecial;
      case 'snack': return Colors.categorySnack;
      default: return Colors.primary;
    }
  };

  const cardAccentColor = getCategoryColor(item.category);

  // Calculate best discount for this item
  const bestDiscount = useMemo(
    () => getBestDiscountForItem(item, activeDiscounts, activeSales),
    [item, activeDiscounts, activeSales]
  );

  const hasDiscount = bestDiscount !== null && bestDiscount.discountedPrice < item.price;
  const displayPrice = hasDiscount ? bestDiscount.discountedPrice : item.price;

  return (
    <GlassCard variant="default" style={styles.cardWrapper}>
      {/* Top-left glowing accent dot */}
      <View style={[styles.cardAccentDot, { backgroundColor: cardAccentColor }]}>
        <View style={[styles.cardAccentDotInner, { backgroundColor: cardAccentColor }]} />
      </View>

      {/* Image */}
      <View style={styles.imageContainer}>
        {item.image ? (
          <Image
            key={imageKey}
            source={{ uri: imageUri }}
            style={styles.productImage}
          />
        ) : (
          <View style={styles.placeholderImageContainer}>
            <Text style={styles.placeholderEmoji}>
              {getCategoryIcon(item.category)}
            </Text>
          </View>
        )}

        {/* Category Badge */}
        <View style={[styles.imageBadge, { backgroundColor: getCategoryColor(item.category) }]}>
          <Text style={styles.imageBadgeIcon}>{getCategoryIcon(item.category)}</Text>
          <Text style={styles.imageBadgeText}>{item.category || 'Coffee'}</Text>
        </View>

        {/* Popular Badge */}
        {item.sold && item.sold > 50 && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>🔥 Popular</Text>
          </View>
        )}

        {/* Discount Badge - show on the image */}
        {hasDiscount && (
          <View style={[styles.discountBadge, { backgroundColor: bestDiscount.badgeColor || '#DD9B1D' }]}>
            <Text style={styles.discountBadgeText}>{bestDiscount.label}</Text>
            {bestDiscount.saleName && (
              <Text style={styles.discountBadgeSubtext} numberOfLines={1}>{bestDiscount.saleName}</Text>
            )}
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {item.name}
        </Text>

        {item.description && (
          <Text style={styles.productDescription} numberOfLines={1}>
            {item.description}
          </Text>
        )}

        <View style={styles.priceRow}>
          <View style={styles.priceLeft}>
            {hasDiscount ? (
              <View style={styles.discountPriceRow}>
                <Text style={styles.productPriceOriginal}>
                  ${item.price?.toFixed(2)}
                </Text>
                <Text style={styles.productPriceDiscounted}>
                  ${displayPrice.toFixed(2)}
                </Text>
              </View>
            ) : (
              <Text style={styles.productPrice}>
                ${item.price?.toFixed(2)}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={onAddPress}
            style={styles.addButton}
            activeOpacity={0.7}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom edge glow bar */}
      <View style={[styles.cardBottomGlow, { backgroundColor: cardAccentColor }]}>
        <View style={[styles.cardBottomGlowReflection, { backgroundColor: cardAccentColor }]} />
      </View>
    </GlassCard>
  );
});

// ──────────────────────────────────────────────
// Cart View — full-screen cart overlay
// ──────────────────────────────────────────────
const CartView = React.memo(({
  cart,
  cartTotal,
  onRemove,
  onUpdateQuantity,
  onCheckout,
  onClose,
}) => {
  if (cart.length === 0) {
    return (
      <View style={styles.emptyCart}>
        <View style={styles.emptyCartIconContainer}>
          <View style={styles.emptyCartIconBg}>
            <Text style={styles.emptyCartIcon}>🛒</Text>
          </View>
        </View>
        <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
        <Text style={styles.emptyCartDesc}>
          Browse our menu and add items you love
        </Text>
        <PrimaryButton
          title="Start Shopping"
          onPress={onClose}
          icon="🛒"
          style={{ marginTop: Spacing.xl }}
        />
      </View>
    );
  }

  return (
    <View style={styles.cartContainer}>
      {/* Cart Header */}
      <View style={styles.cartHeader}>
        <Text style={styles.cartHeaderTitle}>Your Order</Text>
        <Text style={styles.cartHeaderCount}>{cart.length} items</Text>
      </View>

      {/* Cart Items */}
      <FlatList
        data={cart}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <CartItemRow
            item={item}
            onRemove={() => onRemove(item._id)}
            onIncrease={() => onUpdateQuantity(item._id, 1)}
            onDecrease={() => onUpdateQuantity(item._id, -1)}
          />
        )}
        contentContainerStyle={styles.cartListContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Cart Footer */}
      <View style={styles.cartFooter}>
        <View style={styles.cartTotalRow}>
          <View>
            <Text style={styles.cartTotalLabel}>Total</Text>
            <Text style={styles.cartTotalItemCount}>
              {cart.reduce((s, i) => s + i.quantity, 0)} items
            </Text>
          </View>
          <Text style={styles.cartTotalPrice}>${cartTotal.toFixed(2)}</Text>
        </View>

        <PrimaryButton
          title="Checkout"
          onPress={onCheckout}
          icon="🎉"
          style={{ marginBottom: Spacing.sm }}
        />

        <TouchableOpacity onPress={onClose} style={styles.continueBtn} activeOpacity={0.7}>
          <Text style={styles.continueBtnText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ──────────────────────────────────────────────
// Cart Item Row
// ──────────────────────────────────────────────
const CartItemRow = React.memo(({
  item,
  onRemove,
  onIncrease,
  onDecrease,
}) => {
  return (
    <GlassCard variant="default" style={styles.cartItem}>
      <View style={styles.cartItemContent}>
        <View style={styles.cartItemImage}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.cartItemThumb} />
          ) : (
            <View style={styles.cartItemPlaceholder}>
              <Text style={styles.cartItemPlaceholderIcon}>📋</Text>
            </View>
          )}
        </View>
        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cartItemPrice}>
            ${(item.price * item.quantity).toFixed(2)}
          </Text>
        </View>
        <QuantitySelector
          quantity={item.quantity}
          onIncrease={onIncrease}
          onDecrease={onDecrease}
        />
      </View>
      <TouchableOpacity
        onPress={onRemove}
        style={styles.cartRemoveBtn}
        activeOpacity={0.7}
      >
        <Text style={styles.cartRemoveText}>Remove</Text>
      </TouchableOpacity>
    </GlassCard>
  );
});

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Loading ──
  loadingIconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  loadingIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingEmoji: {
    fontSize: 48,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    letterSpacing: 1,
  },
  loadingSubtitle: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textMuted,
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.lg,
  },
  loadingDivider: {
    width: 40,
    height: 1,
    backgroundColor: Colors.primary,
    opacity: 0.5,
    marginBottom: Spacing.lg,
  },
  loadingText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerLogo: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: Typography.h1.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: Typography.captionSmall.fontSize,
    color: Colors.textMuted,
    marginTop: 1,
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerActionIcon: {
    fontSize: 14,
  },
  adminBtn: {
    backgroundColor: 'rgba(200, 169, 110, 0.15)',
    borderColor: Colors.primary,
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cartButtonActive: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.primary,
  },
  cartIcon: {
    fontSize: 18,
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: Colors.textDark,
    fontWeight: '700',
    fontSize: 10,
  },

  // ── Held Transactions Badge ──
  heldBadgeBtn: {
    backgroundColor: 'rgba(212, 160, 80, 0.15)',
    borderColor: Colors.warning,
    position: 'relative',
  },
  heldBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heldBadgeText: {
    color: Colors.textDark,
    fontWeight: '800',
    fontSize: 9,
  },

  // ── Categories ──
  categoryScroll: {
    maxHeight: 50,
  },
  categoryContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },

  // ── Menu ──
  menuListContent: {
    paddingHorizontal: Spacing.lg - 2,
    paddingBottom: 100,
  },
  menuRow: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  menuHeader: {
    paddingHorizontal: Spacing.xs,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  menuHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  menuTitle: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  menuCountBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuCountText: {
    fontSize: Typography.captionSmall.fontSize,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  menuSubtitle: {
    fontSize: Typography.captionSmall.fontSize,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },

  // ── Product Cards ──
  cardWrapper: {
    width: CARD_WIDTH,
    borderColor: Colors.border,
    position: 'relative',
  },
  imageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.surfaceLight,
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
  },
  placeholderEmoji: {
    fontSize: 40,
    opacity: 0.6,
  },
  imageBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  imageBadgeIcon: {
    fontSize: 10,
  },
  imageBadgeText: {
    fontSize: 9,
    color: Colors.textDark,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  popularBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
    backgroundColor: 'rgba(212, 160, 80, 0.85)',
  },
  popularBadgeText: {
    fontSize: 9,
    color: Colors.textDark,
    fontWeight: '700',
  },
  productInfo: {
    padding: Spacing.md,
  },
  productName: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  productDescription: {
    fontSize: Typography.captionSmall.fontSize,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  productPrice: {
    fontSize: Typography.priceSmall.fontSize,
    fontWeight: '700',
    color: Colors.primary,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: Colors.textDark,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },

  // ── Discount Badge & Price Display ──
  priceLeft: {
    flex: 1,
    marginRight: Spacing.xs,
  },
  discountPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productPriceOriginal: {
    fontSize: Typography.captionSmall.fontSize,
    fontWeight: '500',
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  productPriceDiscounted: {
    fontSize: Typography.priceSmall.fontSize,
    fontWeight: '700',
    color: Colors.error,
  },
  discountBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
    flexDirection: 'column',
    alignItems: 'flex-start',
    maxWidth: '60%',
  },
  discountBadgeText: {
    fontSize: 10,
    color: Colors.textDark,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  discountBadgeSubtext: {
    fontSize: 8,
    color: Colors.textDark,
    fontWeight: '500',
    opacity: 0.8,
    marginTop: 1,
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
    shadowColor: '#00D4AA',
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
    opacity: 0.7,
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
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
    opacity: 0.2,
  },

  // ── Empty State ──
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.huge,
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  emptyStateText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: Typography.captionSmall.fontSize,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },

  // ── Empty Cart ──
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  emptyCartIconContainer: {
    marginBottom: Spacing.xl,
  },
  emptyCartIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyCartIcon: {
    fontSize: 48,
  },
  emptyCartTitle: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyCartDesc: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Cart ──
  cartContainer: {
    flex: 1,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  cartHeaderTitle: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cartHeaderCount: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textMuted,
    letterSpacing: Typography.caption.letterSpacing,
  },
  cartListContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  cartItem: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderColor: Colors.border,
  },
  cartItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cartItemImage: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  cartItemThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cartItemPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemPlaceholderIcon: {
    fontSize: 20,
    opacity: 0.6,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  cartItemPrice: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '700',
    color: Colors.primary,
  },
  cartRemoveBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.error + '20',
    borderRadius: BorderRadius.xs,
  },
  cartRemoveText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.error,
  },
  cartFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  cartTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.lg,
  },
  cartTotalLabel: {
    fontSize: Typography.body.fontSize,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  cartTotalItemCount: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textMuted,
  },
  cartTotalPrice: {
    fontSize: Typography.h1.fontSize,
    fontWeight: '700',
    color: Colors.primary,
  },
  continueBtn: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  continueBtnText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  // Upcoming Sales Countdown Banner
  upcomingSalesScroll: {
    maxHeight: 50,
    marginVertical: Spacing.xs,
  },
  upcomingSalesContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  upcomingSaleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,154,118,0.12)',
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 3,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  upcomingSaleIcon: {
    fontSize: 16,
  },
  upcomingSaleInfo: {
    flex: 1,
  },
  upcomingSaleName: {
    ...Typography.captionSmall,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  upcomingSaleCountdown: {
    ...Typography.captionSmall,
    color: '#E65100',
    fontSize: 11,
  },
});
