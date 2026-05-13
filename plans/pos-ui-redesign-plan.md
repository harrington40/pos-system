# POS UI Redesign Plan — Behance Reference Match

## Overview
Complete redesign of the frontend UI to match the Behance POS reference image. Keep all existing backend functionality (API, seed data, categories) intact.

## Reference Image Analysis
- **Size**: 1200x560px
- **Background**: `#151515` (true dark, 60% of image)
- **Surfaces**: `#1f1f1f` to `#2b2b2b` layered grays
- **Accent**: `#DD9B1D` amber/gold (2,551 pixels, mid-section buttons)
- **Text**: `#DCDEDC` off-white (7,171 pixels)
- **Cards**: 37,243 pixels of medium-gray card surfaces
- **Layout**: Header bar (top 60px), card grid (Y:60-480), amber accent buttons in center area

## Layout Structure (from reference)

```
┌──────────────────────────────────────────────┐
│  Header Bar (Y:0-60)                         │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐    │
│  │Category│ │Category│ │Category│ │Category│  │
│  └──────┘  └──────┘  └──────┘  └──────┘    │
├──────────────────────────────────────────────┤
│  Content Area (Y:60-480)                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │  Card   │  │  Card   │  │  Card   │     │
│  │  Item   │  │  Item   │  │  Item   │     │
│  │  $12.99 │  │  $14.99 │  │  $11.99 │     │
│  │ [Add]   │  │ [Add]   │  │ [Add]   │     │
│  └─────────┘  └─────────┘  └─────────┘     │
│  ┌─────────┐  ┌─────────┐                   │
│  │  Card   │  │  Card   │                   │
│  │  Item   │  │  Item   │                   │
│  │  $9.99  │  │  $15.99 │                   │
│  │ [Add]   │  │ [Add]   │                   │
│  └─────────┘  └─────────┘                   │
├──────────────────────────────────────────────┤
│  Bottom Bar (Y:480-560)                      │
│  Total: $54.96  [Checkout]  [Cart: 4 items] │
└──────────────────────────────────────────────┘
```

## Key Design Differences from Current App

| Aspect | Current App | Reference Design |
|--------|------------|-----------------|
| Header | "Craving Meter" title + cart button | Category tabs/pills across top |
| Content | Vertical scroll with recommendations | Grid of product cards |
| Cards | Glassmorphic with gradients | Solid dark surfaces with subtle borders |
| Cart | Full-screen overlay | Bottom bar/sheet |
| Colors | Amber + teal accents | Amber dominant, minimal teal |
| Typography | Large display text | Compact, data-dense |
| Layout | Single column scroll | Multi-column grid |
| Animations | Spring/particle effects | Subtle, functional transitions |

## Files to Modify

### 1. [`frontend/theme.js`](../frontend/theme.js) — Update design tokens
- Keep `#151515` background, `#DD9B1D` amber, `#DCDEDC` text
- Add new surface colors matching reference (`#1f1f1f`, `#2b2b2b`)
- Add bottom bar colors
- Add card surface colors

### 2. [`frontend/components/UI.js`](../frontend/UI.js) — Simplify components
- Remove `FloatingParticles` (not in reference)
- Simplify `GlassCard` to solid dark surface with subtle border
- Add `BottomBar` component (cart summary + checkout)
- Add `CategoryPill` component (horizontal category tabs)
- Keep `PrimaryButton`, `QuantitySelector`, `Badge`

### 3. [`frontend/App.js`](../frontend/App.js) — Complete rewrite
- **New layout structure**:
  ```
  SafeAreaView
  └─ LinearGradient (#151515)
     ├─ Header Row (title + cart icon)
     ├─ Category Pills (horizontal ScrollView)
     ├─ Product Grid (2-column FlatList)
     │  └─ ProductCard (solid dark, amber accent)
     └─ Bottom Bar (total + checkout)
  ```
- Remove `FloatingParticles` component
- Remove `SmartRecommendationEngine` class (or keep minimal)
- Remove entrance animation sequences
- Simplify to functional, data-dense POS layout
- Product cards: solid `#1f1f1f` background, subtle `#2b2b2b` border, amber price/add button
- Bottom bar: fixed at bottom, shows total, item count, checkout button
- Category pills: horizontal scroll, active state with amber underline

### 4. [`frontend/AppClean.js`](../frontend/AppClean.js) — Match redesign

### 5. [`frontend/DESIGN-SYSTEM.md`](../frontend/DESIGN-SYSTEM.md) — Update documentation

## Component Architecture

```
App
├── Header
│   ├── Title (compact, left-aligned)
│   └── CartIcon (right, with badge)
├── CategoryPills
│   └── ScrollView horizontal
│       └── Pill (TouchableOpacity, amber when active)
├── ProductGrid
│   └── FlatList 2-column
│       └── ProductCard
│           ├── Image/Placeholder
│           ├── Name
│           ├── Description (1 line)
│           ├── Price (amber)
│           └── AddButton (amber "+")
└── BottomBar
    ├── TotalSection
    │   ├── "Total" label
    │   └── Price (large, amber)
    ├── ItemCount
    └── CheckoutButton
```

## Color Palette (from reference)

```js
background: '#151515',
surface: '#1f1f1f',
surfaceLight: '#2b2b2b',
surfaceDark: '#1a1a1a',
primary: '#DD9B1D',      // Amber
primaryDark: '#C48A1A',
textPrimary: '#DCDEDC',
textSecondary: '#9A9A9A',
textMuted: '#5A5A5A',
border: '#2b2b2b',
borderLight: '#37383a',
success: '#4CAF50',
error: '#FF5252',
```

## Implementation Steps

1. **Update [`theme.js`](../frontend/theme.js)** — Add new surface/border colors, simplify gradients
2. **Rewrite [`UI.js`](../frontend/components/UI.js)** — Add `BottomBar`, `CategoryPill`, simplify `GlassCard`
3. **Rewrite [`App.js`](../frontend/App.js)** — New layout with category pills, product grid, bottom bar
4. **Update [`AppClean.js`](../frontend/AppClean.js)** — Match new design
5. **Update [`DESIGN-SYSTEM.md`](../frontend/DESIGN-SYSTEM.md)** — Document new design system
6. **Verify** — Restart Expo with cache clear, confirm visual match

## Data Flow (unchanged)
- `GET /api/menu` → menuItems state
- `GET /api/menu/popular` → popular items
- Category filter → filteredItems (useMemo)
- Cart state → addToCart, removeFromCart, updateQuantity
- Cart total → cartTotal (useMemo)
