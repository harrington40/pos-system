# Admin Dashboard & Smart Algorithms — Architecture Plan

## Overview

Major feature expansion adding:
1. **Admin/Manager Dashboard** — Charts, graphs, discount/sale management, employee management
2. **Smart Algorithms** — For admin analytics, pricing optimization, sales forecasting
3. **Payment Flow Fix** — Receipt for every transaction (already partially done, needs QR code)
4. **QR Code & Barcode** — For menu items, receipts, payments
5. **Mobile Money Payment** — New payment method integration

---

## 1. New Dependencies

### Backend (`backend/package.json`)
```json
{
  "qrcode": "^1.5.4",        // Generate QR codes server-side
  "canvas": "^3.1.0",        // For barcode generation (or use jsbarcode)
  "jsbarcode": "^3.11.6",    // Barcode generation (pure JS, no canvas needed)
}
```

### Frontend (`frontend/package.json`)
```json
{
  "react-native-svg-charts": "^5.4.0",  // Charts (or victory-native)
  "victory-native": "^41.12.0",         // Alternative: Victory charts
  "react-native-qrcode-svg": "^6.3.2",  // QR code display
}
```

---

## 2. Data Model Changes

### 2.1 New Model: [`Employee`](backend/models/Employee.js)
```javascript
const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true },
  pin: { type: String, required: true },       // 4-digit PIN for POS login
  role: { type: String, enum: ['admin', 'manager', 'cashier'], default: 'cashier' },
  isActive: { type: Boolean, default: true },
  shiftStart: Date,
  shiftEnd: Date,
  totalSales: { type: Number, default: 0 },
  ordersProcessed: { type: Number, default: 0 },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
});
```

### 2.2 New Model: [`Discount`](backend/models/Discount.js)
```javascript
const discountSchema = new mongoose.Schema({
  code: { type: String, unique: true },          // e.g., "SUMMER20"
  type: { type: String, enum: ['percentage', 'fixed', 'bogo'], required: true },
  value: { type: Number, required: true },        // 20 for 20%, or $5 for fixed
  minPurchase: { type: Number, default: 0 },
  applicableCategories: [String],                 // ['breakfast', 'lunch'] or [] for all
  applicableItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }],
  startDate: Date,
  endDate: Date,
  maxUses: { type: Number, default: 0 },          // 0 = unlimited
  currentUses: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});
```

### 2.3 New Model: [`SaleEvent`](backend/models/SaleEvent.js)
```javascript
const saleEventSchema = new mongoose.Schema({
  name: { type: String, required: true },         // "Happy Hour", "Weekend Special"
  type: { type: String, enum: ['happy_hour', 'weekly', 'seasonal', 'flash', 'clearance'] },
  discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  discountValue: { type: Number, required: true },
  applicableCategories: [String],
  applicableItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }],
  schedule: {
    daysOfWeek: [Number],                          // 0-6 (Sun-Sat)
    startTime: String,                             // "14:00"
    endTime: String,                               // "18:00"
  },
  isActive: { type: Boolean, default: true },
  startDate: Date,
  endDate: Date,
  createdAt: { type: Date, default: Date.now },
});
```

### 2.4 Update [`Order`](backend/models/Order.js) — Add Discount & Mobile Money Fields
```javascript
// New fields to add:
discountCode: String,
discountAmount: { type: Number, default: 0 },
discountType: String,
mobileMoneyRef: String,          // Transaction reference for mobile money
mobileMoneyProvider: { type: String, enum: ['mtn', 'vodafone', 'airtel', null] },
qrCodeData: String,              // QR code string for payment
```

### 2.5 Update [`MenuItem`](backend/models/MenuItem.js) — Add Barcode & QR Fields
```javascript
// New fields to add:
barcode: { type: String, unique: true, sparse: true },  // EAN-13 or custom
qrCode: { type: String },                                // QR data for menu item
costPrice: { type: Number, default: 0 },                 // For profit margin calc
margin: { type: Number, default: 0 },                    // Auto-calculated %
```

---

## 3. New API Routes

### 3.1 [`backend/routes/admin.js`](backend/routes/admin.js) — Admin Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/dashboard` | Full dashboard data (summary, charts, trends) |
| `GET` | `/api/admin/revenue-chart` | Revenue data points for charts (daily/weekly/monthly) |
| `GET` | `/api/admin/category-breakdown` | Sales by category (pie chart data) |
| `GET` | `/api/admin/peak-hours` | Busiest hours (already exists, enhance) |
| `GET` | `/api/admin/profit-margins` | Profit analysis per item |
| `GET` | `/api/admin/sales-forecast` | Smart prediction for next 7 days |

### 3.2 [`backend/routes/employees.js`](backend/routes/employees.js) — Employee Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/employees` | List all employees |
| `POST` | `/api/employees` | Create employee |
| `PUT` | `/api/employees/:id` | Update employee |
| `DELETE` | `/api/employees/:id` | Deactivate employee |
| `POST` | `/api/employees/login` | PIN-based login |
| `GET` | `/api/employees/:id/performance` | Employee sales performance |

### 3.3 [`backend/routes/discounts.js`](backend/routes/discounts.js) — Discount & Sale Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/discounts` | List all discounts |
| `POST` | `/api/discounts` | Create discount code |
| `PUT` | `/api/discounts/:id` | Update discount |
| `DELETE` | `/api/discounts/:id` | Delete discount |
| `POST` | `/api/discounts/validate` | Validate discount code |
| `GET` | `/api/sales` | List sale events |
| `POST` | `/api/sales` | Create sale event |
| `PUT` | `/api/sales/:id` | Update sale event |
| `GET` | `/api/sales/active` | Get currently active sales |

### 3.4 [`backend/routes/payments.js`](backend/routes/payments.js) — Payment Enhancements

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/payments/mobile-money/initiate` | Initiate mobile money payment |
| `POST` | `/api/payments/mobile-money/confirm` | Confirm mobile money transaction |
| `GET` | `/api/payments/qr/:orderId` | Generate QR code for order payment |
| `GET` | `/api/payments/barcode/:itemId` | Generate barcode for menu item |

---

## 4. Smart Algorithms — Admin Intelligence

### 4.1 [`backend/services/admin-engine.js`](backend/services/admin-engine.js)

```javascript
class AdminEngine {
  // 1. Revenue Forecasting (Linear Regression)
  forecastRevenue(orders, days = 7) { ... }
  
  // 2. Dynamic Pricing Suggestions
  suggestOptimalPrice(item, salesHistory) { ... }
  
  // 3. Employee Performance Scoring
  scoreEmployee(employee, orders) { ... }
  
  // 4. Discount Impact Prediction
  predictDiscountImpact(discount, salesHistory) { ... }
  
  // 5. Inventory Turnover Rate
  calculateTurnoverRate(item, logs) { ... }
  
  // 6. Profit Margin Analysis
  analyzeProfitMargins(items, orders) { ... }
  
  // 7. Category Performance Trends
  getCategoryTrends(orders) { ... }
  
  // 8. Optimal Staffing Suggestions
  suggestStaffing(peakHours, employeeCount) { ... }
}
```

### 4.2 Algorithm Details

#### Revenue Forecasting
```
Input: Historical orders (last 90 days)
Process: 
  1. Group revenue by day
  2. Calculate 7-day moving average
  3. Apply linear regression for trend
  4. Factor in day-of-week seasonality
Output: Predicted revenue for next 7 days
```

#### Dynamic Pricing Suggestions
```
Input: Item sales data, competitor pricing (manual input)
Process:
  1. Calculate price elasticity: %change in qty / %change in price
  2. Find optimal price point where revenue is maximized
  3. Consider time-of-day and day-of-week factors
Output: Suggested price range (min, optimal, max)
```

#### Employee Performance Scoring
```
Input: Employee order history, sales totals, refund rates
Process:
  1. Total revenue processed (weight: 30%)
  2. Orders per hour (weight: 25%)
  3. Refund rate (weight: 20%, lower is better)
  4. Customer rating (weight: 15%)
  5. Attendance consistency (weight: 10%)
Output: Score 0-100 with breakdown
```

---

## 5. Frontend Architecture

### 5.1 New Components

```
frontend/components/
├── AdminDashboard.js          # Main admin dashboard screen
├── AdminCharts.js             # Chart components (revenue, category, trends)
├── EmployeeManager.js         # Employee CRUD + performance
├── DiscountManager.js         # Discount code + sale event management
├── QRCodeDisplay.js           # QR code generation/display component
├── BarcodeDisplay.js          # Barcode display component
├── MobileMoneyPayment.js      # Mobile money payment UI
└── ReceiptWithQR.js           # Enhanced receipt with QR code
```

### 5.2 Admin Dashboard Layout

```
AdminDashboard
├── Header (admin title, date range selector, refresh)
├── Summary Cards Row
│   ├── Total Revenue (today)
│   ├── Orders Count
│   ├── Avg Order Value
│   └── Active Employees
├── Revenue Chart (line chart, 7/30 days)
├── Category Breakdown (pie/donut chart)
├── Top Selling Items (bar chart)
├── Peak Hours Chart (bar chart)
├── Low Stock Alerts (mini list)
├── Employee Performance (mini table)
└── Quick Actions
    ├── Create Discount
    ├── Start Sale Event
    ├── Add Employee
    └── View Reports
```

### 5.3 Navigation Structure (Updated)

```
App
├── Main POS View (default)
│   ├── Header (hamburger menu → Admin, Orders, Inventory)
│   ├── CategoryPills
│   ├── ProductGrid
│   └── BottomBar → opens CheckoutModal
├── CheckoutModal (overlay)
│   ├── OrderSummary
│   ├── Discount Code Input
│   ├── PaymentMethodSelector
│   │   ├── Cash
│   │   ├── Card
│   │   ├── Mobile Money (new)
│   │   └── QR Pay (new)
│   ├── TaxDisplay
│   └── ConfirmButton → POST /api/orders → ReceiptView
├── ReceiptView (enhanced with QR code)
├── OrderHistory
├── InventoryPanel
├── RestockSuggestions
├── AdminDashboard (new - full screen)
│   ├── Analytics Tab
│   │   ├── RevenueChart
│   │   ├── CategoryChart
│   │   ├── TopSellingChart
│   │   └── PeakHoursChart
│   ├── Employees Tab
│   │   ├── EmployeeList
│   │   ├── AddEmployeeModal
│   │   └── PerformanceView
│   ├── Discounts Tab
│   │   ├── DiscountList
│   │   ├── CreateDiscountModal
│   │   ├── SaleEventList
│   │   └── CreateSaleModal
│   └── Reports Tab
│       ├── ProfitMargins
│       ├── SalesForecast
│       └── Export Data
└── EmployeeLogin (new - PIN screen)
```

---

## 6. Data Flow Diagrams

### 6.1 Mobile Money Payment Flow
```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐
│ Customer │───>│  Checkout    │───>│  POST /api/  │───>│  Mobile  │
│ selects  │    │  Modal       │    │  payments/   │    │  Money   │
│ Mobile   │    │  (enter      │    │  mobile-     │    │  API     │
│ Money    │    │  phone #)    │    │  money/      │    │  (sim.)  │
│          │    │              │    │  initiate    │    │          │
└──────────┘    └──────────────┘    └──────────────┘    └──────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │  User confirms│
                                   │  on phone     │
                                   │  (simulated)  │
                                   └──────────────┘
                                          │
                                          ▼
                                   ┌──────────────┐    ┌──────────┐
                                   │  POST /api/  │───>│  Order   │
                                   │  payments/   │    │  Created │
                                   │  mobile-     │    │  + Receipt│
                                   │  money/      │    │  + QR    │
                                   │  confirm     │    │          │
                                   └──────────────┘    └──────────┘
```

### 6.2 Discount Application Flow
```
┌──────────┐    ┌──────────────┐    ┌──────────────┐
│  User    │───>│  Enter Code  │───>│  POST /api/  │
│ enters   │    │  in Checkout │    │  discounts/  │
│ discount │    │  Modal       │    │  validate    │
└──────────┘    └──────────────┘    └──────────────┘
                                          │
                                    ┌─────┴─────┐
                                    │           │
                                    ▼           ▼
                              ┌──────────┐  ┌──────────┐
                              │ Valid    │  │ Invalid  │
                              │ Apply to │  │ Show     │
                              │ total    │  │ error    │
                              └──────────┘  └──────────┘
```

### 6.3 Admin Dashboard Data Flow
```
┌──────────┐    ┌──────────────┐    ┌──────────────┐
│  Orders  │───>│  AdminEngine │───>│  Dashboard   │
│  DB      │    │  (smart      │    │  API         │
│          │    │   algorithms)│    │  Response    │
├──────────┤    │              │    │              │
│Inventory │    │  - Forecast  │    │  - Summary   │
│ Logs     │    │  - Trends    │    │  - Charts    │
├──────────┤    │  - Scoring   │    │  - Tables    │
│Employees │    │  - Margins   │    │  - Alerts    │
└──────────┘    └──────────────┘    └──────────────┘
```

---

## 7. QR Code & Barcode Integration

### 7.1 QR Code Use Cases
| Location | Data Encoded | Purpose |
|----------|-------------|---------|
| Receipt | `{ receiptNo, total, date }` | Digital receipt verification |
| Menu Item | `{ itemId, name, price }` | Quick lookup / mobile ordering |
| Payment | `{ orderId, amount, merchant }` | Scan to pay |
| Table (future) | `{ tableId }` | Table-side ordering |

### 7.2 Barcode Use Cases
| Location | Format | Purpose |
|----------|--------|---------|
| Menu Item | EAN-13 | Inventory scanning |
| Receipt | Code128 | Receipt lookup |
| Employee ID | Code39 | Employee badge |

### 7.3 QR Code Generation
- Server-side: [`qrcode`](backend/services/qr-service.js) npm package generates QR as SVG/PNG
- Client-side: [`react-native-qrcode-svg`](frontend/components/QRCodeDisplay.js) renders QR in app
- Receipt QR encodes: `{ receiptNumber, total, date, storeName }` as JSON → base64

---

## 8. Implementation Steps

### Phase 1: Backend Models & Services
| Step | File | Description |
|------|------|-------------|
| 1.1 | [`backend/models/Employee.js`](backend/models/Employee.js) | Create Employee model |
| 1.2 | [`backend/models/Discount.js`](backend/models/Discount.js) | Create Discount model |
| 1.3 | [`backend/models/SaleEvent.js`](backend/models/SaleEvent.js) | Create SaleEvent model |
| 1.4 | [`backend/models/MenuItem.js`](backend/models/MenuItem.js) | Add barcode, qrCode, costPrice, margin fields |
| 1.5 | [`backend/models/Order.js`](backend/models/Order.js) | Add discount, mobile money fields |
| 1.6 | [`backend/services/admin-engine.js`](backend/services/admin-engine.js) | Smart admin algorithms |
| 1.7 | [`backend/services/qr-service.js`](backend/services/qr-service.js) | QR/barcode generation service |

### Phase 2: Backend Routes
| Step | File | Description |
|------|------|-------------|
| 2.1 | [`backend/routes/admin.js`](backend/routes/admin.js) | Admin dashboard + analytics endpoints |
| 2.2 | [`backend/routes/employees.js`](backend/routes/employees.js) | Employee CRUD + login + performance |
| 2.3 | [`backend/routes/discounts.js`](backend/routes/discounts.js) | Discount + sale event management |
| 2.4 | [`backend/routes/payments.js`](backend/routes/payments.js) | Mobile money + QR/barcode endpoints |
| 2.5 | [`backend/server.js`](backend/server.js) | Register new routes |

### Phase 3: Frontend Components
| Step | File | Description |
|------|------|-------------|
| 3.1 | [`frontend/components/AdminDashboard.js`](frontend/components/AdminDashboard.js) | Main admin dashboard with tabs |
| 3.2 | [`frontend/components/AdminCharts.js`](frontend/components/AdminCharts.js) | Reusable chart components (line, bar, pie) |
| 3.3 | [`frontend/components/EmployeeManager.js`](frontend/components/EmployeeManager.js) | Employee list, add, edit, performance |
| 3.4 | [`frontend/components/DiscountManager.js`](frontend/components/DiscountManager.js) | Discount codes + sale events CRUD |
| 3.5 | [`frontend/components/QRCodeDisplay.js`](frontend/components/QRCodeDisplay.js) | QR code display component |
| 3.6 | [`frontend/components/BarcodeDisplay.js`](frontend/components/BarcodeDisplay.js) | Barcode display component |
| 3.7 | [`frontend/components/MobileMoneyPayment.js`](frontend/components/MobileMoneyPayment.js) | Mobile money payment UI |
| 3.8 | [`frontend/components/ReceiptWithQR.js`](frontend/components/ReceiptWithQR.js) | Enhanced receipt with QR code |

### Phase 4: Integration
| Step | File | Description |
|------|------|-------------|
| 4.1 | [`frontend/App.js`](frontend/App.js) | Add admin dashboard navigation, employee login, enhanced checkout |
| 4.2 | [`frontend/components/CheckoutModal.js`](frontend/components/CheckoutModal.js) | Add discount input, mobile money, QR payment options |
| 4.3 | [`frontend/components/ReceiptView.js`](frontend/components/ReceiptView.js) | Add QR code to receipt |
| 4.4 | [`frontend/AppClean.js`](frontend/AppClean.js) | Mirror changes |
| 4.5 | [`frontend/theme.js`](frontend/theme.js) | Add admin-specific colors/tokens |

---

## 9. UI/UX Design Notes

### Admin Dashboard Visual Style
- **Same dark theme** as main POS (`#151515` background, `#DD9B1D` amber accent)
- **Card-based layout** with subtle borders
- **Charts**: Amber/gold line colors, dark gridlines, tooltip on hover
- **Summary cards**: Large numbers with amber accent, subtle icon
- **Tab navigation**: Pill-style tabs matching CategoryPill design
- **Responsive**: Adapts to screen width, charts stack on mobile

### Color Additions for Admin
```javascript
// New tokens in theme.js
adminCard: '#1a1a1a',
adminCardHover: '#1f1f1f',
chartLine: '#DD9B1D',
chartGrid: '#2b2b2b',
chartLabel: '#9A9A9A',
profitGreen: '#4CAF50',
lossRed: '#FF5252',
forecastBlue: '#53E79D',
```

### Chart Library Decision
Use **pure SVG-based charts** (no heavy charting library) to keep bundle size small:
- Line chart: Custom SVG `<Polyline>` with gradient fill
- Bar chart: Custom SVG `<Rect>` elements
- Pie/donut chart: Custom SVG `<Path>` arcs
- This avoids adding `victory-native` or `react-native-svg-charts` dependencies

---

## 10. Key Design Decisions

1. **Charts built with `react-native-svg`** (already installed) — no new heavy dependencies
2. **QR codes generated server-side** as SVG strings, rendered client-side with `react-native-svg`
3. **Barcodes use `jsbarcode`** on server, rendered as SVG on client
4. **Mobile money simulated** — no real payment gateway integration (configurable for production)
5. **Employee PIN-based login** — simple 4-digit PIN, hashed with bcrypt
6. **Discounts stackable** — only one discount per order (simpler), but sale events auto-apply
7. **Admin dashboard data cached** — 5-minute cache to reduce DB load
8. **All charts responsive** — use `Dimensions` to adapt to screen width
9. **Receipt QR encodes JSON** — scannable for digital verification
10. **Employee performance scored** — weighted algorithm, not just raw sales

---

## 11. File Structure (Updated)

```
pos-system/
├── backend/
│   ├── models/
│   │   ├── MenuItem.js        ← Add barcode, qrCode, costPrice, margin
│   │   ├── Order.js           ← Add discount, mobile money fields
│   │   ├── InventoryLog.js
│   │   ├── Employee.js        ★ NEW
│   │   ├── Discount.js        ★ NEW
│   │   └── SaleEvent.js       ★ NEW
│   ├── routes/
│   │   ├── menu.js
│   │   ├── orders.js
│   │   ├── inventory.js
│   │   ├── analytics.js
│   │   ├── admin.js           ★ NEW
│   │   ├── employees.js       ★ NEW
│   │   ├── discounts.js       ★ NEW
│   │   └── payments.js        ★ NEW
│   ├── services/
│   │   ├── inventory-engine.js
│   │   ├── admin-engine.js    ★ NEW
│   │   ├── qr-service.js      ★ NEW
│   │   ├── ai.js
│   │   └── ai-utils.js
│   └── server.js              ← Register new routes
├── frontend/
│   ├── App.js                 ← Add admin nav, employee login
│   ├── AppClean.js
│   ├── theme.js               ← Add admin colors
│   ├── components/
│   │   ├── UI.js
│   │   ├── CheckoutModal.js   ← Add discount, mobile money
│   │   ├── ReceiptView.js     ← Add QR code
│   │   ├── OrderHistory.js
│   │   ├── InventoryPanel.js
│   │   ├── RestockSuggestions.js
│   │   ├── PlaceholderImage.js
│   │   ├── AdminDashboard.js  ★ NEW
│   │   ├── AdminCharts.js     ★ NEW
│   │   ├── EmployeeManager.js ★ NEW
│   │   ├── DiscountManager.js ★ NEW
│   │   ├── QRCodeDisplay.js   ★ NEW
│   │   ├── BarcodeDisplay.js  ★ NEW
│   │   └── MobileMoneyPayment.js ★ NEW
│   └── plans/
│       └── admin-dashboard-smart-algorithms-plan.md
└── plans/
    └── admin-dashboard-smart-algorithms-plan.md
```
