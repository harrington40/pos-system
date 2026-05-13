import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, BorderRadius, Spacing, Typography, Shadows } from '../theme';

// ──────────────────────────────────────────────
// AnimatedPressScale — wraps children with press animation
// ──────────────────────────────────────────────
const AnimatedPressScale = ({ children, onPress, disabled, scaleTo = 0.96, style }) => {
  const anim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
      stiffness: 200,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(anim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 15,
      stiffness: 200,
    }).start();
  };

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, scaleTo],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// ──────────────────────────────────────────────
// GlassCard — simplified solid dark card
// ──────────────────────────────────────────────
export const GlassCard = ({
  children,
  onPress,
  style,
  variant = 'default',
  hasBorder = true,
}) => {
  const bgColor = variant === 'elevated' ? Colors.surfaceElevated : Colors.surface;
  const borderColor = hasBorder ? Colors.border : 'transparent';

  const content = (
    <View
      style={[
        styles.card,
        { backgroundColor: bgColor, borderColor },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressScale onPress={onPress} scaleTo={0.97}>
        {content}
      </AnimatedPressScale>
    );
  }

  return content;
};

// ──────────────────────────────────────────────
// PrimaryButton — amber solid button
// ──────────────────────────────────────────────
export const PrimaryButton = ({
  title,
  onPress,
  style,
  loading = false,
  disabled = false,
  icon = null,
  size = 'default',
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (loading) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.85,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [loading]);

  const isDisabled = disabled || loading;

  const height = size === 'small' ? 40 : 52;
  const fontSize = size === 'small' ? 14 : 16;

  return (
    <AnimatedPressScale
      onPress={onPress}
      disabled={isDisabled}
      scaleTo={0.95}
      style={[{ opacity: isDisabled ? 0.6 : 1 }, style]}
    >
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <LinearGradient
          colors={isDisabled ? ['#555', '#444'] : Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.primaryButton,
            { height, borderRadius: BorderRadius.md },
            !isDisabled && Shadows.glow,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={Colors.textDark} size="small" />
          ) : (
            <>
              {icon && <Text style={[styles.buttonIcon, { fontSize: fontSize + 2 }]}>{icon}</Text>}
              <Text style={[styles.primaryButtonText, { fontSize }]}>
                {title}
              </Text>
            </>
          )}
        </LinearGradient>
      </Animated.View>
    </AnimatedPressScale>
  );
};

// ──────────────────────────────────────────────
// SecondaryButton — dark border style
// ──────────────────────────────────────────────
export const SecondaryButton = ({
  title,
  onPress,
  style,
  icon = null,
  size = 'default',
}) => {
  const height = size === 'small' ? 38 : 48;
  const fontSize = size === 'small' ? 13 : 15;

  return (
    <AnimatedPressScale onPress={onPress} scaleTo={0.96} style={style}>
      <View style={[styles.secondaryButton, { height, borderRadius: BorderRadius.md }]}>
        {icon && <Text style={[styles.buttonIcon, { fontSize: fontSize + 2 }]}>{icon}</Text>}
        <Text style={[styles.secondaryButtonText, { fontSize }]}>{title}</Text>
      </View>
    </AnimatedPressScale>
  );
};

// ──────────────────────────────────────────────
// Badge — category/status indicator
// ──────────────────────────────────────────────
export const Badge = ({ text, variant = 'primary', style, size = 'default' }) => {
  const getColor = () => {
    switch (variant) {
      case 'primary': return Colors.primary;
      case 'success': return Colors.success;
      case 'error': return Colors.error;
      case 'warning': return Colors.warning;
      case 'info': return Colors.secondary;
      case 'breakfast': return Colors.categoryBreakfast;
      case 'lunch': return Colors.categoryLunch;
      case 'dinner': return Colors.categoryDinner;
      case 'drinks': return Colors.secondary;
      case 'desserts': return Colors.categoryDesserts;
      default: return Colors.primary;
    }
  };

  const isSmall = size === 'small';
  const paddingV = isSmall ? 3 : 5;
  const paddingH = isSmall ? 8 : 12;
  const fontSize = isSmall ? 9 : 11;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: getColor(),
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
          borderRadius: isSmall ? 6 : BorderRadius.sm,
        },
        style,
      ]}
    >
      <Text style={[styles.badgeText, { fontSize }]}>{text}</Text>
    </View>
  );
};

// ──────────────────────────────────────────────
// LoadingSpinner — animated spinner
// ──────────────────────────────────────────────
export const LoadingSpinner = ({ color = Colors.primary, size = 32 }) => {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.spinner}>
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Text style={{ fontSize: size, color }}>⟳</Text>
      </Animated.View>
    </View>
  );
};

// ──────────────────────────────────────────────
// ShimmerPlaceholder — skeleton loading shimmer
// ──────────────────────────────────────────────
export const ShimmerPlaceholder = ({ width, height, style, borderRadius = BorderRadius.md }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: Colors.surfaceLight,
          opacity,
        },
        style,
      ]}
    />
  );
};

// ──────────────────────────────────────────────
// Divider — subtle section separator
// ──────────────────────────────────────────────
export const Divider = ({ style }) => {
  return <View style={[styles.divider, { backgroundColor: Colors.border }, style]} />;
};

// ──────────────────────────────────────────────
// SectionHeader — with optional subtitle and action
// ──────────────────────────────────────────────
export const SectionHeader = ({
  title,
  subtitle,
  action,
  onActionPress,
  style,
}) => {
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.sectionHeaderLeft}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        )}
      </View>
      {action && onActionPress && (
        <TouchableOpacity onPress={onActionPress} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ──────────────────────────────────────────────
// QuantitySelector — for cart item quantity control
// ──────────────────────────────────────────────
export const QuantitySelector = ({ quantity, onIncrease, onDecrease, style }) => {
  return (
    <View style={[styles.quantitySelector, style]}>
      <AnimatedPressScale onPress={onDecrease} scaleTo={0.9}>
        <View style={styles.quantityButton}>
          <Text style={styles.quantityButtonText}>−</Text>
        </View>
      </AnimatedPressScale>
      <Text style={styles.quantityText}>{quantity}</Text>
      <AnimatedPressScale onPress={onIncrease} scaleTo={0.9}>
        <View style={[styles.quantityButton, styles.quantityButtonActive]}>
          <Text style={[styles.quantityButtonText, styles.quantityButtonTextActive]}>+</Text>
        </View>
      </AnimatedPressScale>
    </View>
  );
};

// ──────────────────────────────────────────────
// CategoryPill — horizontal category tab
// ──────────────────────────────────────────────
export const CategoryPill = ({ label, isActive, onPress, color, icon }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.categoryPill,
        isActive && {
          backgroundColor: Colors.primary,
          borderColor: Colors.primary,
        },
      ]}
    >
      {icon && (
        <Text style={[styles.categoryPillIcon, isActive && { color: Colors.textDark }]}>
          {icon}
        </Text>
      )}
      {color && !icon && (
        <View
          style={[
            styles.categoryDot,
            { backgroundColor: color },
          ]}
        />
      )}
      <Text
        style={[
          styles.categoryPillText,
          isActive && { color: Colors.textDark },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// ──────────────────────────────────────────────
// BottomBar — fixed bottom cart summary
// ──────────────────────────────────────────────
export const BottomBar = ({ total, itemCount, onCheckout, onCartPress }) => {
  return (
    <View style={styles.bottomBar}>
      <View style={styles.bottomBarLeft}>
        <Text style={styles.bottomBarTotalLabel}>Total</Text>
        <Text style={styles.bottomBarTotalPrice}>${total.toFixed(2)}</Text>
      </View>
      <View style={styles.bottomBarRight}>
        <TouchableOpacity
          onPress={onCartPress}
          style={styles.bottomBarCartBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.bottomBarCartIcon}>🛒</Text>
          {itemCount > 0 && (
            <View style={styles.bottomBarBadge}>
              <Text style={styles.bottomBarBadgeText}>{itemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onCheckout}
          style={[
            styles.bottomBarCheckoutBtn,
            itemCount === 0 && { opacity: 0.5 },
          ]}
          disabled={itemCount === 0}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bottomBarCheckoutGradient}
          >
            <Text style={styles.bottomBarCheckoutText}>Checkout</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  primaryButton: {
    paddingHorizontal: Spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  primaryButtonText: {
    fontWeight: '700',
    color: Colors.textDark,
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginRight: Spacing.sm,
  },
  secondaryButton: {
    paddingHorizontal: Spacing.xl,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  secondaryButtonText: {
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  badge: {
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: '700',
    color: Colors.textDark,
    letterSpacing: 0.3,
  },
  spinner: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: Typography.h2.fontSize,
    fontWeight: Typography.h2.fontWeight,
    color: Colors.textPrimary,
    letterSpacing: Typography.h2.letterSpacing,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textMuted,
    fontWeight: Typography.caption.fontWeight,
    letterSpacing: Typography.caption.letterSpacing,
  },
  sectionAction: {
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.lg,
  },
  sectionActionText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.primary,
    fontWeight: '600',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quantityButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  quantityButtonTextActive: {
    color: Colors.textDark,
  },
  quantityText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },

  // ── CategoryPill ──
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  categoryPillIcon: {
    fontSize: 14,
    marginRight: Spacing.xs,
  },
  categoryPillText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },

  // ── BottomBar ──
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceDark,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  bottomBarLeft: {
    flex: 1,
  },
  bottomBarTotalLabel: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textMuted,
    fontWeight: Typography.caption.fontWeight,
    letterSpacing: Typography.caption.letterSpacing,
    marginBottom: 2,
  },
  bottomBarTotalPrice: {
    fontSize: Typography.h1.fontSize,
    fontWeight: Typography.h1.fontWeight,
    color: Colors.primary,
    letterSpacing: Typography.h1.letterSpacing,
  },
  bottomBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bottomBarCartBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bottomBarCartIcon: {
    fontSize: 20,
  },
  bottomBarBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBarBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textDark,
  },
  bottomBarCheckoutBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  bottomBarCheckoutGradient: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBarCheckoutText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.textDark,
    letterSpacing: 0.5,
  },
  bottomBarLeft: {
    flex: 1,
  },
  bottomBarTotalLabel: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textMuted,
    fontWeight: Typography.caption.fontWeight,
    letterSpacing: Typography.caption.letterSpacing,
    marginBottom: 2,
  },
  bottomBarTotalPrice: {
    fontSize: Typography.h1.fontSize,
    fontWeight: Typography.h1.fontWeight,
    color: Colors.primary,
    letterSpacing: Typography.h1.letterSpacing,
  },
  bottomBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bottomBarCartBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bottomBarCartIcon: {
    fontSize: 20,
  },
  bottomBarBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBarBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textDark,
  },
  bottomBarCheckoutBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  bottomBarCheckoutGradient: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBarCheckoutText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.textDark,
    letterSpacing: 0.5,
  },
});

export default {
  GlassCard,
  PrimaryButton,
  SecondaryButton,
  Badge,
  LoadingSpinner,
  ShimmerPlaceholder,
  Divider,
  SectionHeader,
  QuantitySelector,
  CategoryPill,
  BottomBar,
};
