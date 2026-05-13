/**
 * Theme Configuration — Professional POS (Square-inspired)
 * High-contrast dark slate with bright cyan/blue accents
 * Background: #0F1419 | Accent: #00D4AA (teal) | Text: #FFFFFF
 * Optimized for readability, scanability, and long shifts
 */

export const Colors = {
  // ── Background — Deep Slate ──
  background: '#0F1419',
  backgroundDeep: '#0A0D12',

  // ── Surfaces — Layered Slate ──
  surface: '#1A1F26',
  surfaceLight: '#242A33',
  surfaceDark: '#13171D',
  surfaceElevated: '#1E242C',

  // ── Borders — Subtle Slate ──
  border: '#242A33',
  borderLight: '#2E3540',
  borderFocused: '#00D4AA',

  // ── Accent — Bright Teal (high contrast) ──
  primary: '#00D4AA',
  primaryDark: '#00B894',
  primaryLight: '#33DFBB',
  primaryGlow: 'rgba(0, 212, 170, 0.15)',

  // ── Secondary — Electric Blue ──
  secondary: '#4A9EFF',
  secondaryDark: '#2B7DE0',

  // ── Text — Pure White / High Contrast ──
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B8C4',
  textMuted: '#6B7280',
  textDark: '#0F1419',

  // ── Status ──
  success: '#00D4AA',
  successGlow: 'rgba(0, 212, 170, 0.15)',
  warning: '#F59E0B',
  error: '#EF4444',
  errorGlow: 'rgba(239, 68, 68, 0.15)',

  // ── Category Colors — Distinct, high-contrast ──
  categoryFood: '#4A9EFF',
  categoryBeverage: '#00D4AA',
  categoryDessert: '#F59E0B',
  categorySpecial: '#A78BFA',
  categorySnack: '#F472B6',

  // ── Admin / Chart Colors ──
  chartLine: '#00D4AA',
  chartFill: 'rgba(0, 212, 170, 0.1)',
  chartGrid: '#242A33',
  chartLabel: '#B0B8C4',
  chartColors: ['#00D4AA', '#4A9EFF', '#F59E0B', '#A78BFA', '#F472B6', '#34D399', '#F87171', '#60A5FA'],
  adminBg: '#080B0F',
  adminCard: '#13171D',
  adminCardBorder: '#242A33',
  adminAccent: '#00D4AA',
  adminText: '#FFFFFF',
  adminTextSecondary: '#B0B8C4',
  adminSuccess: '#00D4AA',
  adminWarning: '#F59E0B',
  adminError: '#EF4444',
  adminInfo: '#4A9EFF',
};

export const Gradients = {
  background: ['#0F1419', '#0F1419'],
  backgroundDeep: ['#0F1419', '#0A0D12'],
  primary: ['#00D4AA', '#00B894'],
  primaryPressed: ['#00B894', '#009B7D'],
  surface: ['#1A1F26', '#13171D'],
  surfaceElevated: ['#1E242C', '#1A1F26'],
  overlay: ['rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.4)'],
  adminCard: ['#13171D', '#0A0D12'],
  adminHeader: ['#080B0F', '#0A0D12'],
  chartGradient: ['rgba(0, 212, 170, 0.3)', 'rgba(0, 212, 170, 0)'],
};

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
};

export const Typography = {
  h1: { fontSize: 22, fontWeight: '700', letterSpacing: 0.3 },
  h2: { fontSize: 18, fontWeight: '700', letterSpacing: 0.2 },
  h3: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
  body: { fontSize: 14, fontWeight: '500' },
  bodySmall: { fontSize: 12, fontWeight: '500' },
  caption: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  captionSmall: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  price: { fontSize: 18, fontWeight: '700' },
  priceSmall: { fontSize: 14, fontWeight: '700' },
  // Admin typography
  adminTitle: { fontSize: 20, fontWeight: '700', letterSpacing: 0.3 },
  adminMetric: { fontSize: 28, fontWeight: '700' },
  adminLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  adminSmall: { fontSize: 10, fontWeight: '500' },
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  glow: {
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  adminCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
};

export default {
  Colors,
  Gradients,
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
};
