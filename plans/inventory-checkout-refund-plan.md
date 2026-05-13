# POS System — Inventory, Checkout, Receipt & Refund Architecture

## Overview

Add inventory tracking, a complete checkout flow with receipt printing, refund processing, and a smart algorithm for inventory optimization and sales insights.

---

## 1. Data Model Changes

### 1.1 [`MenuItem`](backend/models/MenuItem.js) — Add Inventory Fields

```javascript
// New fields to add to existing schema:
stock: { type: Number, default: 100 },         // Current inventory count
lowStockThreshold: { type: Number, default: 10 }, // Alert when stock <= this
sold: { type: Number, default: 0 },            // Total sold count (for popularity)
isAvailable: { type: Boolean, default: true }, // Manually override availability
```

### 1.2 New Model: [`Order`](backend/models/Order.js)

```javascript
const orderSchema = new mongoose.Schema({
  items: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: String,
    price: Number,
    quantity: { type: Number, required: true },
  }],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'mobile'], default: 'cash' },
  status: { type: String, enum: ['pending', 'completed', 'refunded'], default: 'completed' },
  receiptNumber: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now },
  refundedAt: Date,
  refundReason: String,
});
```

### 1.3 New Model: [`InventoryLog`](backend/models/InventoryLog.js)

```javascript
const inventoryLogSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  change: { type: Number, required: true },  // negative for sale, positive for restock
  reason: { type: String, enum: ['sale', 'restock', 'refund', 'adjustment'], required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  createdAt: { type: Date, default: Date.now },
});
```

---

## 2. API Routes

### 2.1 [`backend/routes/orders.js`](backend/routes/orders.js) — Order Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/orders` | Create order (checkout) — deducts inventory |
| `GET` | `/api/orders` | List all orders (with pagination) |
| `GET` | `/api/orders/:id` | Get single order details |
| `POST` | `/api/orders/:id/refund` | Refund an order — restocks inventory |
| `GET` | `/api/orders/receipt/:receiptNumber` | Get receipt data for printing |

### 2.2 [`backend/routes/inventory.js`](backend/routes/inventory.js) — Inventory Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/inventory` | List all items with stock levels |
| `GET` | `/api/inventory/low-stock` | Items below threshold |
| `PUT` | `/api/inventory/:id` | Update stock (restock/adjust) |
| `GET` | `/api/inventory/logs` | Inventory change history |

### 2.3 [`backend/routes/analytics.js`](backend/routes/analytics.js) — Smart Algorithm

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics/sales-summary` | Daily/weekly/monthly sales totals |
| `GET` | `/api/analytics/top-selling` | Top N items by quantity sold |
| `GET` | `/api/analytics/restock-suggestions` | AI-driven restock recommendations |
| `GET` | `/api/analytics/peak-hours` | Busiest hours from order data |

---

## 3. Smart Algorithm Design

### 3.1 Inventory Optimization Engine

Located in [`backend/services/inventory-engine.js`](backend/services/inventory-engine.js)

```javascript
class InventoryEngine {
  // 1. Calculate optimal reorder point based on sales velocity
  getReorderPoint(item, salesHistory) {
    const dailySales = this.getAverageDailySales(item._id, salesHistory);
    const leadTime = 2; // days to restock
    const safetyStock = Math.ceil(dailySales * 0.5); // 50% buffer
    return Math.ceil(dailySales * leadTime) + safetyStock;
  }

  // 2. Predict when an item will run out
  predictStockout(item, salesHistory) {
    const dailySales = this.getAverageDailySales(item._id, salesHistory);
    if (dailySales <= 0) return null;
    return Math.floor(item.stock / dailySales); // days remaining
  }

  // 3. Suggest restock quantity (economic order quantity simplified)
  suggestRestockQty(item, salesHistory) {
    const dailySales = this.getAverageDailySales(item._id, salesHistory);
    const weeksSupply = 14; // 2 weeks
    return Math.max(0, Math.ceil(dailySales * weeksSupply) - item.stock);
  }

  // 4. Get average daily sales from last 30 days
  getAverageDailySales(itemId, salesHistory) {
    const recent = salesHistory.filter(s => 
      s.menuItem.toString() === itemId.toString() &&
      Date.now() - new Date(s.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000
    );
    const totalSold = recent.reduce((sum, s) => sum + Math.abs(s.change), 0);
    return totalSold / 30;
  }
}
```

### 3.2 Smart Checkout Flow

```
User taps "Checkout"
  → Validate cart items have sufficient stock
  → Show checkout modal with:
      - Order summary (items, quantities, prices)
      - Payment method selector (cash/card/mobile)
      - Total with tax calculation
  → User confirms
  → POST /api/orders
      - Create Order document
      - Deduct stock for each item (InventoryLog with reason: 'sale')
      - Increment MenuItem.sold
      - Generate receipt number (format: RCP-{YYYYMMDD}-{XXXX})
  → Show success screen with receipt
  → Clear cart
```

### 3.3 Refund Flow

```
User selects completed order
  → View order details
  → Tap "Refund"
  → Confirm refund reason
  → POST /api/orders/:id/refund
      - Set order.status = 'refunded'
      - Set order.refundedAt, order.refundReason
      - Restock items (InventoryLog with reason: 'refund')
      - Decrement MenuItem.sold
  → Show refund confirmation
```

---

## 4. Receipt Printing

### 4.1 Receipt Data Format

```json
{
  "receiptNumber": "RCP-20260501-0001",
  "date": "2026-05-01T15:30:00Z",
  "items": [
    { "name": "Classic Pancakes", "qty": 2, "price": 12.99, "total": 25.98 }
  ],
  "subtotal": 25.98,
  "tax": 2.08,
  "total": 28.06,
  "paymentMethod": "card",
  "itemsCount": 2
}
```

### 4.2 Receipt Component ([`frontend/components/Receipt.js`](frontend/components/Receipt.js))

- Renders a printable receipt view
- Shows restaurant name, receipt number, date, items, totals
- "Print" button using `window.print()` for web
- For native: can integrate with Bluetooth thermal printer later

### 4.3 Receipt Generation

- Receipt number format: `RCP-YYYYMMDD-XXXX` (sequential per day)
- Stored in Order model
- API endpoint `GET /api/orders/receipt/:receiptNumber` returns formatted data

---

## 5. Frontend Component Changes

### 5.1 New Screens/Modals

| Component | File | Description |
|-----------|------|-------------|
| `CheckoutModal` | [`frontend/components/CheckoutModal.js`](frontend/components/CheckoutModal.js) | Checkout flow with payment selection |
| `OrderHistory` | [`frontend/components/OrderHistory.js`](frontend/components/OrderHistory.js) | List of past orders with refund option |
| `ReceiptView` | [`frontend/components/ReceiptView.js`](frontend/components/ReceiptView.js) | Receipt display + print |
| `InventoryPanel` | [`frontend/components/InventoryPanel.js`](frontend/components/InventoryPanel.js) | Stock levels, low-stock alerts |
| `RestockSuggestions` | [`frontend/components/RestockSuggestions.js`](frontend/components/RestockSuggestions.js) | AI-driven restock recommendations |

### 5.2 Modified Components

| Component | Changes |
|-----------|---------|
| [`App.js`](frontend/App.js) | Add navigation to OrderHistory, InventoryPanel; update BottomBar checkout to open CheckoutModal |
| [`BottomBar`](frontend/components/UI.js) | Update checkout button to trigger modal instead of alert |
| [`ProductCard`](frontend/App.js) | Show stock level indicator, disable add button when out of stock |

### 5.3 Navigation Structure

```
App
├── Main POS View (default)
│   ├── Header (with hamburger menu for Orders/Inventory)
│   ├── CategoryPills
│   ├── ProductGrid
│   └── BottomBar → opens CheckoutModal
├── CheckoutModal (overlay)
│   ├── OrderSummary
│   ├── PaymentMethodSelector
│   ├── TaxDisplay
│   └── ConfirmButton → POST /api/orders → ReceiptView
├── OrderHistory (full screen)
│   ├── OrderList (FlatList)
│   └── OrderDetail → RefundButton
├── InventoryPanel (full screen)
│   ├── StockList
│   ├── LowStockAlerts
│   └── RestockSuggestions
└── ReceiptView (modal or full screen)
    ├── ReceiptContent
    └── PrintButton
```

---

## 6. Data Flow Diagrams

### 6.1 Checkout Flow

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌───────────┐
│  Cart    │────>│Checkout  │────>│ POST     │────>│ Receipt   │
│  State   │     │Modal     │     │ /api/    │     │ View      │
│          │     │          │     │ orders   │     │           │
└─────────┘     └──────────┘     └──────────┘     └───────────┘
                                      │
                                      ▼
                               ┌──────────────┐
                               │  Deduct Stock │
                               │  Create Order │
                               │  Gen Receipt  │
                               │  #            │
                               └──────────────┘
```

### 6.2 Refund Flow

```
┌──────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│  Order   │────>│  Refund  │────>│  POST     │────>│  Refund  │
│  History │     │  Confirm │     │  /api/    │     │  Success │
│          │     │  Modal   │     │  orders/  │     │  View    │
│          │     │          │     │  :id/     │     │          │
│          │     │          │     │  refund   │     │          │
└──────────┘     └──────────┘     └───────────┘     └──────────┘
                                      │
                                      ▼
                               ┌──────────────┐
                               │  Restock     │
                               │  Update      │
                               │  Order       │
                               │  Status      │
                               └──────────────┘
```

### 6.3 Smart Algorithm Data Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Orders  │────>│  Inventory   │────>│  Restock     │
│  DB      │     │  Engine      │     │  Suggestions │
│          │     │              │     │  UI          │
└──────────┘     └──────────────┘     └──────────────┘
                      │
                      ▼
               ┌──────────────┐
               │  Stockout    │
               │  Predictions │
               │  + Alerts    │
               └──────────────┘
```

---

## 7. Implementation Steps

### Phase 1: Backend Models & Routes

| Step | File | Description |
|------|------|-------------|
| 1.1 | [`backend/models/MenuItem.js`](backend/models/MenuItem.js) | Add `stock`, `lowStockThreshold`, `isAvailable` fields |
| 1.2 | [`backend/models/Order.js`](backend/models/Order.js) | Create Order model |
| 1.3 | [`backend/models/InventoryLog.js`](backend/models/InventoryLog.js) | Create InventoryLog model |
| 1.4 | [`backend/routes/orders.js`](backend/routes/orders.js) | Create order CRUD + refund route |
| 1.5 | [`backend/routes/inventory.js`](backend/routes/inventory.js) | Create inventory routes |
| 1.6 | [`backend/routes/analytics.js`](backend/routes/analytics.js) | Create analytics routes |
| 1.7 | [`backend/services/inventory-engine.js`](backend/services/inventory-engine.js) | Smart algorithm implementation |
| 1.8 | [`backend/server.js`](backend/server.js) | Register new routes |
| 1.9 | [`backend/seed.js`](backend/seed.js) | Update seed data with stock values |

### Phase 2: Frontend Components

| Step | File | Description |
|------|------|-------------|
| 2.1 | [`frontend/components/CheckoutModal.js`](frontend/components/CheckoutModal.js) | Checkout flow with payment selection |
| 2.2 | [`frontend/components/ReceiptView.js`](frontend/components/ReceiptView.js) | Receipt display + print |
| 2.3 | [`frontend/components/OrderHistory.js`](frontend/components/OrderHistory.js) | Order list + refund |
| 2.4 | [`frontend/components/InventoryPanel.js`](frontend/components/InventoryPanel.js) | Stock management UI |
| 2.5 | [`frontend/components/RestockSuggestions.js`](frontend/components/RestockSuggestions.js) | AI suggestions display |

### Phase 3: Integration

| Step | File | Description |
|------|------|-------------|
| 3.1 | [`frontend/App.js`](frontend/App.js) | Add navigation, integrate modals, update BottomBar checkout |
| 3.2 | [`frontend/components/UI.js`](frontend/components/UI.js) | Update BottomBar to accept onCheckout callback |
| 3.3 | [`frontend/AppClean.js`](frontend/AppClean.js) | Mirror App.js changes |

---

## 8. API Response Examples

### POST /api/orders — Create Order

**Request:**
```json
{
  "items": [
    { "menuItem": "60f7...", "quantity": 2 },
    { "menuItem": "60f8...", "quantity": 1 }
  ],
  "paymentMethod": "card"
}
```

**Response (201):**
```json
{
  "order": {
    "_id": "60f9...",
    "receiptNumber": "RCP-20260501-0001",
    "items": [...],
    "subtotal": 40.97,
    "tax": 3.28,
    "total": 44.25,
    "paymentMethod": "card",
    "status": "completed",
    "createdAt": "2026-05-01T15:30:00Z"
  }
}
```

### POST /api/orders/:id/refund — Refund Order

**Request:**
```json
{
  "reason": "Customer requested cancellation"
}
```

**Response (200):**
```json
{
  "message": "Order refunded successfully",
  "order": {
    "_id": "60f9...",
    "status": "refunded",
    "refundedAt": "2026-05-01T16:00:00Z",
    "refundReason": "Customer requested cancellation"
  }
}
```

### GET /api/analytics/restock-suggestions

**Response:**
```json
{
  "suggestions": [
    {
      "item": { "_id": "...", "name": "Classic Pancakes", "stock": 5, "lowStockThreshold": 10 },
      "dailySales": 8.2,
      "daysUntilStockout": 0.6,
      "suggestedRestockQty": 110,
      "priority": "high"
    },
    {
      "item": { "_id": "...", "name": "Avocado Toast", "stock": 12, "lowStockThreshold": 10 },
      "dailySales": 5.1,
      "daysUntilStockout": 2.4,
      "suggestedRestockQty": 60,
      "priority": "medium"
    }
  ]
}
```

---

## 9. Key Design Decisions

1. **Inventory deduction happens server-side** during checkout to prevent race conditions
2. **Receipt numbers are sequential per day** using a MongoDB counter collection
3. **Tax is calculated server-side** at 8% (configurable via env var)
4. **Refunds restore inventory** to maintain accurate stock counts
5. **Smart algorithm runs on-demand** (not scheduled) — called when user views suggestions
6. **Low-stock alerts** are computed from `stock <= lowStockThreshold` on each item
7. **Printing uses `window.print()`** for web; native printer support can be added later
