require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const MenuItem = require('./models/MenuItem');
const Employee = require('./models/Employee');
const Discount = require('./models/Discount');
const SaleEvent = require('./models/SaleEvent');
const MobilePayment = require('./models/MobilePayment');

const items = [
  // ── Breakfast ──
  { name: "Classic Pancakes", price: 12.99, category: "breakfast", description: "Fluffy buttermilk pancakes with maple syrup", popular: true, rating: 4.5, stock: 45, lowStockThreshold: 10, sold: 120, costPrice: 5.50, margin: 57.7 },
  { name: "Avocado Toast", price: 14.99, category: "breakfast", description: "Sourdough with smashed avocado & poached egg", popular: true, rating: 4.7, stock: 30, lowStockThreshold: 8, sold: 95, costPrice: 6.00, margin: 60.0 },
  { name: "Belgian Waffle", price: 13.99, category: "breakfast", description: "Crispy waffle with berries & whipped cream", rating: 4.3, stock: 50, lowStockThreshold: 10, sold: 78, costPrice: 5.80, margin: 58.5 },
  { name: "Eggs Benedict", price: 16.99, category: "breakfast", description: "Poached eggs on English muffin with hollandaise", popular: true, rating: 4.8, stock: 25, lowStockThreshold: 8, sold: 110, costPrice: 7.20, margin: 57.6 },
  { name: "French Toast", price: 11.99, category: "breakfast", description: "Brioche dipped in cinnamon custard", rating: 4.2, stock: 40, lowStockThreshold: 10, sold: 65, costPrice: 4.80, margin: 60.0 },
  { name: "Breakfast Burrito", price: 13.49, category: "breakfast", description: "Scrambled eggs, cheese, salsa in flour tortilla", rating: 4.4, stock: 35, lowStockThreshold: 10, sold: 82, costPrice: 5.60, margin: 58.5 },
  { name: "Acai Bowl", price: 15.99, category: "breakfast", description: "Blended acai with granola & fresh fruit", rating: 4.6, stock: 20, lowStockThreshold: 5, sold: 55, costPrice: 7.00, margin: 56.2 },
  { name: "Croissant Combo", price: 10.99, category: "breakfast", description: "Butter croissant with jam & fresh orange juice", rating: 4.1, stock: 60, lowStockThreshold: 15, sold: 45, costPrice: 4.20, margin: 61.8 },

  // ── Lunch ──
  { name: "Grilled Chicken Wrap", price: 15.99, category: "lunch", description: "Herb chicken with lettuce, tomato & ranch", popular: true, rating: 4.5, stock: 28, lowStockThreshold: 8, sold: 88, costPrice: 6.80, margin: 57.5 },
  { name: "Caesar Salad", price: 13.99, category: "lunch", description: "Romaine, parmesan, croutons & house dressing", rating: 4.3, stock: 35, lowStockThreshold: 10, sold: 72, costPrice: 5.50, margin: 60.7 },
  { name: "Turkey Club Sandwich", price: 14.49, category: "lunch", description: "Triple-decker with bacon, lettuce & tomato", popular: true, rating: 4.6, stock: 22, lowStockThreshold: 8, sold: 105, costPrice: 6.20, margin: 57.2 },
  { name: "Tomato Basil Soup", price: 9.99, category: "lunch", description: "Creamy soup with grilled cheese croutons", rating: 4.2, stock: 40, lowStockThreshold: 12, sold: 60, costPrice: 3.80, margin: 62.0 },
  { name: "Beef Burger", price: 17.99, category: "lunch", description: "Angus beef with cheddar & caramelized onions", popular: true, rating: 4.7, stock: 18, lowStockThreshold: 6, sold: 145, costPrice: 8.00, margin: 55.5 },
  { name: "Veggie Panini", price: 12.99, category: "lunch", description: "Grilled vegetables with pesto & mozzarella", rating: 4.1, stock: 30, lowStockThreshold: 10, sold: 50, costPrice: 5.00, margin: 61.5 },
  { name: "Fish & Chips", price: 16.49, category: "lunch", description: "Beer-battered cod with tartar sauce", rating: 4.4, stock: 25, lowStockThreshold: 8, sold: 68, costPrice: 7.50, margin: 54.5 },
  { name: "Mushroom Risotto", price: 15.99, category: "lunch", description: "Arborio rice with wild mushrooms & parmesan", rating: 4.5, stock: 20, lowStockThreshold: 6, sold: 75, costPrice: 6.50, margin: 59.3 },

  // ── Dinner ──
  { name: "Grilled Salmon", price: 24.99, category: "dinner", description: "Atlantic salmon with lemon butter sauce", popular: true, rating: 4.8, stock: 15, lowStockThreshold: 5, sold: 98, costPrice: 12.00, margin: 52.0 },
  { name: "Filet Mignon", price: 34.99, category: "dinner", description: "8oz prime cut with truffle mashed potatoes", popular: true, rating: 4.9, stock: 10, lowStockThreshold: 4, sold: 85, costPrice: 18.00, margin: 48.6 },
  { name: "Chicken Marsala", price: 21.99, category: "dinner", description: "Pan-seared chicken in marsala wine sauce", rating: 4.6, stock: 20, lowStockThreshold: 6, sold: 62, costPrice: 9.50, margin: 56.8 },
  { name: "Lamb Chops", price: 29.99, category: "dinner", description: "Herb-crusted rack of lamb with mint glaze", rating: 4.7, stock: 12, lowStockThreshold: 4, sold: 55, costPrice: 15.00, margin: 50.0 },
  { name: "Shrimp Scampi", price: 22.99, category: "dinner", description: "Garlic butter shrimp over linguine", popular: true, rating: 4.5, stock: 18, lowStockThreshold: 6, sold: 90, costPrice: 10.50, margin: 54.3 },
  { name: "Vegetable Stir Fry", price: 17.99, category: "dinner", description: "Fresh seasonal vegetables in soy glaze", rating: 4.2, stock: 30, lowStockThreshold: 10, sold: 48, costPrice: 7.00, margin: 61.1 },
  { name: "BBQ Ribs", price: 26.99, category: "dinner", description: "Slow-cooked pork ribs with house BBQ sauce", rating: 4.6, stock: 14, lowStockThreshold: 5, sold: 72, costPrice: 12.50, margin: 53.7 },
  { name: "Stuffed Bell Peppers", price: 19.99, category: "dinner", description: "Rice & beef stuffed peppers with marinara", rating: 4.3, stock: 22, lowStockThreshold: 8, sold: 40, costPrice: 8.50, margin: 57.5 },

  // ── Drinks ──
  { name: "Craft Lemonade", price: 4.99, category: "drinks", description: "Fresh-squeezed with a hint of mint", popular: true, rating: 4.4, stock: 80, lowStockThreshold: 20, sold: 200, costPrice: 1.50, margin: 70.0 },
  { name: "Iced Matcha Latte", price: 6.49, category: "drinks", description: "Ceremonial matcha with oat milk", rating: 4.6, stock: 55, lowStockThreshold: 15, sold: 130, costPrice: 2.20, margin: 66.1 },
  { name: "Espresso", price: 3.99, category: "drinks", description: "Double shot of house blend", rating: 4.3, stock: 100, lowStockThreshold: 25, sold: 250, costPrice: 1.00, margin: 75.0 },
  { name: "Mango Smoothie", price: 7.99, category: "drinks", description: "Alphonso mango with yogurt & honey", popular: true, rating: 4.7, stock: 40, lowStockThreshold: 10, sold: 165, costPrice: 2.80, margin: 65.0 },
  { name: "Sparkling Water", price: 2.99, category: "drinks", description: "Italian mineral water with lime", rating: 4.1, stock: 120, lowStockThreshold: 30, sold: 90, costPrice: 0.80, margin: 73.2 },
  { name: "Chai Tea Latte", price: 5.99, category: "drinks", description: "Spiced chai with steamed milk", rating: 4.5, stock: 45, lowStockThreshold: 12, sold: 110, costPrice: 2.00, margin: 66.6 },
  { name: "Berry Blast Smoothie", price: 7.49, category: "drinks", description: "Mixed berries, banana & almond milk", rating: 4.4, stock: 35, lowStockThreshold: 10, sold: 95, costPrice: 2.60, margin: 65.3 },
  { name: "Cold Brew Coffee", price: 4.49, category: "drinks", description: "24-hour steeped nitro cold brew", rating: 4.6, stock: 65, lowStockThreshold: 15, sold: 180, costPrice: 1.20, margin: 73.3 },

  // ── Desserts ──
  { name: "Chocolate Lava Cake", price: 11.99, category: "desserts", description: "Warm molten center with vanilla ice cream", popular: true, rating: 4.9, stock: 12, lowStockThreshold: 5, sold: 155, costPrice: 4.50, margin: 62.5 },
  { name: "New York Cheesecake", price: 10.99, category: "desserts", description: "Creamy classic with berry compote", rating: 4.7, stock: 18, lowStockThreshold: 6, sold: 88, costPrice: 4.00, margin: 63.6 },
  { name: "Tiramisu", price: 12.49, category: "desserts", description: "Coffee-soaked ladyfingers with mascarpone", popular: true, rating: 4.8, stock: 10, lowStockThreshold: 4, sold: 120, costPrice: 5.00, margin: 60.0 },
  { name: "Crème Brûlée", price: 9.99, category: "desserts", description: "Vanilla custard with caramelized sugar", rating: 4.6, stock: 15, lowStockThreshold: 5, sold: 75, costPrice: 3.50, margin: 65.0 },
  { name: "Apple Pie", price: 8.99, category: "desserts", description: "Warm cinnamon apple with lattice crust", rating: 4.4, stock: 20, lowStockThreshold: 8, sold: 60, costPrice: 3.00, margin: 66.6 },
  { name: "Panna Cotta", price: 10.49, category: "desserts", description: "Italian cream dessert with strawberry sauce", rating: 4.5, stock: 14, lowStockThreshold: 5, sold: 52, costPrice: 3.80, margin: 63.8 },
  { name: "Mango Sticky Rice", price: 9.49, category: "desserts", description: "Thai dessert with coconut milk & mango", rating: 4.3, stock: 16, lowStockThreshold: 6, sold: 45, costPrice: 3.20, margin: 66.3 },
  { name: "Ice Cream Trio", price: 7.99, category: "desserts", description: "Vanilla, chocolate & strawberry scoops", rating: 4.2, stock: 25, lowStockThreshold: 10, sold: 70, costPrice: 2.50, margin: 68.7 },
];

const employees = [
  { name: "Sarah Johnson", pin: "1234", role: "manager", shift: "morning", phone: "024-555-0101", email: "sarah@pos.com" },
  { name: "Michael Chen", pin: "2345", role: "cashier", shift: "morning", phone: "024-555-0102", email: "michael@pos.com" },
  { name: "Emily Rodriguez", pin: "3456", role: "cashier", shift: "afternoon", phone: "024-555-0103", email: "emily@pos.com" },
  { name: "James Wilson", pin: "4567", role: "cashier", shift: "afternoon", phone: "024-555-0104", email: "james@pos.com" },
  { name: "Amara Osei", pin: "5678", role: "admin", shift: "morning", phone: "024-555-0105", email: "amara@pos.com" },
];

// Helper to generate barcode from code
const generateBarcode = (code) => {
  const hash = crypto.createHash('md5').update(code).digest('hex').substring(0, 8).toUpperCase();
  return `20${hash}`;
};

const discountCodes = [
  {
    code: "WELCOME10",
    type: "percentage",
    value: 10,
    description: "10% off for new customers",
    minOrderAmount: 15,
    maxDiscount: 10,
    usageLimit: 100,
    usedCount: 0,
    applicableCategories: [],
    barcode: generateBarcode("WELCOME10"),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
  },
  {
    code: "SAVE5",
    type: "fixed",
    value: 5,
    description: "$5 off any order",
    minOrderAmount: 20,
    usageLimit: 200,
    usedCount: 0,
    applicableCategories: [],
    barcode: generateBarcode("SAVE5"),
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
  },
  {
    code: "HALFOFF",
    type: "percentage",
    value: 50,
    description: "50% off (max $15 discount)",
    minOrderAmount: 10,
    maxDiscount: 15,
    usageLimit: 50,
    usedCount: 0,
    applicableCategories: [],
    barcode: generateBarcode("HALFOFF"),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
  {
    code: "BREAKFAST",
    type: "percentage",
    value: 15,
    description: "15% off breakfast items",
    minOrderAmount: 10,
    maxDiscount: 8,
    usageLimit: 150,
    usedCount: 0,
    applicableCategories: ["breakfast"],
    barcode: generateBarcode("BREAKFAST"),
    expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
  },
  {
    code: "DRINKS20",
    type: "percentage",
    value: 20,
    description: "20% off drinks",
    minOrderAmount: 5,
    maxDiscount: 5,
    usageLimit: 300,
    usedCount: 0,
    applicableCategories: ["drinks"],
    barcode: generateBarcode("DRINKS20"),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
];

const saleEvents = [
  {
    name: "Happy Hour",
    type: "happy-hour",
    discountPercentage: 15,
    description: "15% off all drinks — unwind after work!",
    applicableCategories: ["drinks"],
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    recurring: "daily",
    startTime: "16:00",
    endTime: "19:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    bannerColor: "#FF6B35",
  },
  {
    name: "Weekend Brunch Special",
    type: "weekly",
    discountPercentage: 10,
    description: "10% off breakfast & lunch every weekend",
    applicableCategories: ["breakfast", "lunch"],
    startDate: new Date(),
    endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    recurring: "weekly",
    daysOfWeek: [6, 0],
    bannerColor: "#4CAF50",
  },
  {
    name: "Summer Refresh",
    type: "seasonal",
    discountPercentage: 20,
    description: "20% off all cold drinks & desserts",
    applicableCategories: ["drinks", "desserts"],
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    recurring: "none",
    bannerColor: "#2196F3",
  },
  {
    name: "Flash Sale: Lunch Rush",
    type: "flash",
    discountPercentage: 25,
    description: "25% off lunch items — limited time!",
    applicableCategories: ["lunch"],
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    recurring: "none",
    bannerColor: "#FF5722",
  },
  {
    name: "Clearance: Last Week's Specials",
    type: "clearance",
    discountPercentage: 30,
    description: "30% off select dinner items",
    applicableCategories: ["dinner"],
    startDate: new Date(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    recurring: "none",
    bannerColor: "#9C27B0",
  },
];

// ── Test Mobile Payment Records ──
// These simulate payments at various states for testing the mobile money flow
const mobilePayments = [
  {
    provider: 'orange',
    phone: '671234567',
    amount: 45.99,
    status: 'VERIFIED',
    initiationMode: 'cashier_initiated',
    transactionRef: 'MM-TEST-ORANGE-CASHIER-001',
    metadata: {
      initiatedAt: new Date(Date.now() - 60000),
      confirmedAt: new Date(Date.now() - 45000),
      verifiedAt: new Date(),
      simulationMode: true,
    },
  },
  {
    provider: 'mtn',
    phone: '687654321',
    amount: 32.50,
    status: 'CONFIRMED',
    initiationMode: 'customer_initiated',
    transactionRef: 'MM-TEST-MTN-QR-002',
    metadata: {
      initiatedAt: new Date(Date.now() - 30000),
      confirmedAt: new Date(Date.now() - 15000),
      simulationMode: true,
      qrGenerated: true,
    },
  },
  {
    provider: 'orange',
    phone: '672345678',
    amount: 78.25,
    status: 'PENDING',
    initiationMode: 'cashier_initiated',
    transactionRef: 'MM-TEST-ORANGE-PENDING-003',
    metadata: {
      initiatedAt: new Date(Date.now() - 10000),
      simulationMode: true,
    },
  },
  {
    provider: 'mtn',
    phone: '698765432',
    amount: 15.99,
    status: 'AWAITING_PAYMENT',
    initiationMode: 'customer_initiated',
    transactionRef: 'MM-TEST-MTN-AWAITING-004',
    metadata: {
      initiatedAt: new Date(Date.now() - 5000),
      simulationMode: true,
      qrGenerated: true,
    },
  },
  {
    provider: 'orange',
    phone: '675555555',
    amount: 120.00,
    status: 'FAILED',
    initiationMode: 'cashier_initiated',
    transactionRef: 'MM-TEST-ORANGE-FAILED-005',
    metadata: {
      initiatedAt: new Date(Date.now() - 120000),
      failedAt: new Date(Date.now() - 90000),
      failureReason: 'Customer cancelled USSD request',
      simulationMode: true,
    },
  },
];

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    // Clear existing data
    await MenuItem.deleteMany({});
    await Employee.deleteMany({});
    await Discount.deleteMany({});
    await SaleEvent.deleteMany({});
    await MobilePayment.deleteMany({});

    // Seed menu items
    await MenuItem.insertMany(items);
    console.log(`✓ Menu seeded with ${items.length} items across 5 categories`);

    // Seed employees (PINs will be hashed by the pre-save hook)
    for (const emp of employees) {
      await Employee.create(emp);
    }
    console.log(`✓ Seeded ${employees.length} employees (PINs: 1234, 2345, 3456, 4567, 5678)`);

    // Seed discount codes
    await Discount.insertMany(discountCodes);
    console.log(`✓ Seeded ${discountCodes.length} discount codes`);

    // Seed sale events
    await SaleEvent.insertMany(saleEvents);
    console.log(`✓ Seeded ${saleEvents.length} sale events`);

    // Seed test mobile payments
    // Fetch the first employee to use as initiatedBy/verifiedBy for test records
    const firstEmployee = await Employee.findOne();
    const paymentsWithRefs = mobilePayments.map(p => ({
      ...p,
      initiatedBy: firstEmployee?._id,
      verifiedBy: p.status === 'VERIFIED' ? firstEmployee?._id : undefined,
      verifiedAt: p.status === 'VERIFIED' ? new Date() : undefined,
    }));
    await MobilePayment.insertMany(paymentsWithRefs);
    console.log(`✓ Seeded ${mobilePayments.length} test mobile payment records`);

    console.log('\n✅ Database seeded successfully!');
    console.log('   Employee PINs: 1234 (manager), 2345 (cashier), 3456 (cashier), 4567 (cashier), 5678 (admin)');
    console.log('   Discount codes: WELCOME10, SAVE5, HALFOFF, BREAKFAST, DRINKS20');
    console.log('   Mobile Money test refs: MM-TEST-ORANGE-CASHIER-001 (VERIFIED), MM-TEST-MTN-QR-002 (CONFIRMED), MM-TEST-ORANGE-PENDING-003 (PENDING), MM-TEST-MTN-AWAITING-004 (AWAITING), MM-TEST-ORANGE-FAILED-005 (FAILED)');
    process.exit();
  })
  .catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
