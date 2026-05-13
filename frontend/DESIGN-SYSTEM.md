# POS System — Design System

> Reference: Behance POS Dashboard (1200x560)
> Background: `#151515` | Accent: `#DD9B1D` | Text: `#DCDEDC`

---

## 🎨 Color Palette

### Background & Surfaces

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#151515` | Main app background |
| `backgroundDeep` | `#111111` | Loading screen, deep areas |
| `surface` | `#1f1f1f` | Card backgrounds, buttons |
| `surfaceLight` | `#2b2b2b` | Elevated surfaces, hover states |
| `surfaceDark` | `#1a1a1a` | Bottom bar, footer areas |
| `surfaceElevated` | `#242424` | Modal/dialog surfaces |

### Borders

| Token | Hex | Usage |
|-------|-----|-------|
| `border` | `#2b2b2b` | Default card/component borders |
| `borderLight` | `#37383a` | Pill borders, subtle dividers |
| `borderFocused` | `#DD9B1D` | Active/focused state borders |

### Accent — Warm Amber/Gold

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#DD9B1D` | Primary buttons, prices, active states |
| `primaryDark` | `#C48A1A` | Button pressed state |
| `primaryLight` | `#F0B830` | Hover/highlight variations |
| `primaryGlow` | `rgba(221, 155, 29, 0.15)` | Subtle glow effects |

### Text Hierarchy

| Token | Hex | Usage |
|-------|-----|-------|
| `textPrimary` | `#DCDEDC` | Primary content, headings |
| `textSecondary` | `#9A9A9A` | Secondary info, subtitles |
| `textMuted` | `#5A5A5A` | Placeholder, disabled, captions |
| `textDark` | `#151515` | Text on amber backgrounds |

### Status Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#4CAF50` | Popular badge, success states |
| `warning` | `#FF9800` | Warning indicators |
| `error` | `#FF5252` | Remove buttons, errors |

### Category Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `categoryBreakfast` | `#FF9A76` | Breakfast category |
| `categoryLunch` | `#DD9B1D` | Lunch category |
| `categoryDinner` | `#E040FB` | Dinner category |
| `categoryDrinks` | `#53E79D` | Drinks category |
| `categoryDesserts` | `#FF80AB` | Desserts category |

---

## 📐 Typography

| Token | Size | Weight | Letter-Spacing | Usage |
|-------|------|--------|----------------|-------|
| `h1` | 22px | 700 | 0.3px | Page titles |
| `h2` | 18px | 700 | 0.2px | Section headers |
| `h3` | 16px | 600 | 0.1px | Card titles |
| `body` | 14px | 500 | — | Body text |
| `bodySmall` | 12px | 500 | — | Small body, card names |
| `caption` | 11px | 600 | 0.5px (uppercase) | Labels, badges |
| `captionSmall` | 10px | 600 | 0.3px | Tiny labels |
| `price` | 18px | 700 | — | Large prices |
| `priceSmall` | 14px | 700 | — | Card prices |

---

## 🔲 Spacing System

| Token | Value | Usage |
|-------|-------|-------|
| `xxs` | 2px | Micro spacing |
| `xs` | 4px | Tight spacing |
| `sm` | 8px | Compact spacing |
| `md` | 12px | Default spacing |
| `lg` | 16px | Section padding |
| `xl` | 20px | Large padding |
| `xxl` | 24px | Container padding |
| `xxxl` | 32px | Wide padding |
| `huge` | 48px | Hero spacing |

---

## 🎯 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Badges, tiny elements |
| `sm` | 8px | Buttons, add-to-cart |
| `md` | 12px | Cards, inputs |
| `lg` | 16px | Large cards |
| `xl` | 20px | Modals |
| `round` | 999px | Category pills |

---

## 📐 Layout Structure

```
┌──────────────────────────────────────┐
│  Header (48px)                       │
│  "POS Menu"        [🛒 badge]        │
├──────────────────────────────────────┤
│  Category Pills (40px)               │
│  [All] [Breakfast] [Lunch] [Dinner]  │
├──────────────────────────────────────┤
│                                      │
│  Product Grid (2-column FlatList)    │
│  ┌────────┐  ┌────────┐             │
│  │  Card  │  │  Card  │             │
│  │  Name  │  │  Name  │             │
│  │ $12.99 │  │ $14.99 │             │
│  │  [+]   │  │  [+]   │             │
│  └────────┘  └────────┘             │
│  ┌────────┐  ┌────────┐             │
│  │  Card  │  │  Card  │             │
│  │  Name  │  │  Name  │             │
│  │  $9.99 │  │ $15.99 │             │
│  │  [+]   │  │  [+]   │             │
│  └────────┘  └────────┘             │
│                                      │
├──────────────────────────────────────┤
│  Bottom Bar (64px)                   │
│  Total: $54.96    [🛒] [Checkout]   │
└──────────────────────────────────────┘
```

---

## 🧩 Component Architecture

### App
- **Header**: Title + cart icon with badge count
- **CategoryPills**: Horizontal scrollable pill buttons
- **ProductGrid**: 2-column FlatList with ProductCard items
- **BottomBar**: Fixed bottom bar with total, cart icon, checkout button

### Components

#### GlassCard
- Solid `#1f1f1f` background
- `#2b2b2b` border (1px)
- `BorderRadius.lg` (16px)
- Optional `elevated` variant with `#242424` background
- No gradients, no glassmorphism

#### CategoryPill
- Rounded pill shape (`BorderRadius.round`)
- Default: `#1f1f1f` bg, `#37383a` border, `#9A9A9A` text
- Active: `#DD9B1D` bg, `#DD9B1D` border, `#151515` text
- Optional colored dot indicator

#### BottomBar
- Fixed at bottom of screen
- `#1a1a1a` background with `#2b2b2b` top border
- Left: "Total" label + amber price
- Right: Cart icon button (with badge) + amber Checkout button

#### ProductCard
- GlassCard wrapper
- Image/Placeholder (120px height)
- Category badge (top-right, color-coded)
- Popular badge (bottom-left, green)
- Name (1 line), Description (1 line, optional)
- Price (amber) + Add button (amber `+`)

#### PrimaryButton
- Amber gradient background
- Dark text (`#151515`)
- Loading state with pulse animation
- Disabled state with reduced opacity

#### QuantitySelector
- `−` button (dark) | quantity number | `+` button (amber)
- Used in cart items

#### Badge
- Color-coded by variant (primary, success, error, category colors)
- Small or default size
- Dark text on colored background

---

## 📱 Responsive Behavior

- **Card width**: `(SCREEN_WIDTH - 44) / 2` — adapts to screen size
- **Card gap**: 12px between columns
- **Padding**: 16px horizontal on container
- **Bottom bar**: Fixed at bottom, safe area aware
- **Category pills**: Horizontal scroll, no wrapping

---

## 🔗 File Structure

```
frontend/
├── App.js                    # Main app — POS layout
├── AppClean.js               # Clean version (same layout)
├── theme.js                  # Design tokens (colors, typography, spacing)
├── DESIGN-SYSTEM.md          # This file
├── components/
│   ├── UI.js                 # Reusable components
│   └── PlaceholderImage.js   # Category-based placeholder images
└── index.js                  # Entry point
```

---

## 📋 Component Checklist

| Component | Status | File |
|-----------|--------|------|
| GlassCard | ✅ Simplified | `UI.js` |
| PrimaryButton | ✅ Updated colors | `UI.js` |
| SecondaryButton | ✅ Updated colors | `UI.js` |
| Badge | ✅ Updated colors | `UI.js` |
| QuantitySelector | ✅ Updated colors | `UI.js` |
| CategoryPill | ✅ New | `UI.js` |
| BottomBar | ✅ New | `UI.js` |
| ProductCard | ✅ Redesigned | `App.js` |
| CartView | ✅ Redesigned | `App.js` |
| LoadingScreen | ✅ Simplified | `App.js` |
