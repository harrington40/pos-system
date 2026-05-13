/**
 * Admin Engine — Smart Algorithms for Admin Dashboard
 *
 * Provides:
 *  - Revenue forecasting (linear regression + moving average)
 *  - Dynamic pricing suggestions (price elasticity)
 *  - Employee performance scoring (weighted algorithm)
 *  - Discount impact prediction
 *  - Inventory turnover rate
 *  - Profit margin analysis
 *  - Category trends & growth rate
 *  - Optimal staffing suggestions
 */
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const InventoryLog = require('../models/InventoryLog');
const Employee = require('../models/Employee');
const Discount = require('../models/Discount');
const SaleEvent = require('../models/SaleEvent');

class AdminEngine {

  // ──────────────────────────────────────────────
  // 1. Revenue Forecast (Linear Regression + MA)
  // ──────────────────────────────────────────────
  async getRevenueForecast(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const orders = await Order.find({
      createdAt: { $gte: since },
      status: 'completed'
    }).sort({ createdAt: 1 });

    // Group revenue by day
    const dailyRevenue = {};
    orders.forEach(order => {
      const day = order.createdAt.toISOString().split('T')[0];
      dailyRevenue[day] = (dailyRevenue[day] || 0) + order.total;
    });

    const dates = Object.keys(dailyRevenue).sort();
    const revenues = dates.map(d => dailyRevenue[d]);

    if (revenues.length < 3) {
      return { forecast: [], currentAvg: 0, trend: 'insufficient_data' };
    }

    // Simple linear regression
    const n = revenues.length;
    const xMean = (n - 1) / 2;
    const yMean = revenues.reduce((a, b) => a + b, 0) / n;

    let numerator = 0, denominator = 0;
    revenues.forEach((y, i) => {
      numerator += (i - xMean) * (y - yMean);
      denominator += (i - xMean) ** 2;
    });

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    // 7-day moving average
    const movingAvg = [];
    for (let i = 6; i < revenues.length; i++) {
      const slice = revenues.slice(i - 6, i + 1);
      movingAvg.push({
        date: dates[i],
        avg: slice.reduce((a, b) => a + b, 0) / slice.length
      });
    }

    // Forecast next 7 days
    const forecast = [];
    const lastDate = new Date(dates[dates.length - 1]);
    const recentAvg = revenues.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, revenues.slice(-3).length);

    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + i);
      const x = n + i - 1;
      let predicted = slope * x + intercept;
      // Fallback: if linear regression predicts negative or zero, use recent average
      if (predicted <= 0 && recentAvg > 0) {
        predicted = recentAvg;
      }
      forecast.push({
        date: nextDate.toISOString().split('T')[0],
        predictedRevenue: Math.round(Math.max(0, predicted) * 100) / 100
      });
    }

    const currentAvg = revenues.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, revenues.slice(-7).length);

    return {
      forecast,
      movingAvg,
      dailyRevenue: dates.map((d, i) => ({ date: d, revenue: revenues[i] })),
      currentAvg: Math.round(currentAvg * 100) / 100,
      trend: slope > 0 ? 'up' : slope < 0 ? 'down' : 'stable',
      slope: Math.round(slope * 100) / 100
    };
  }

  // ──────────────────────────────────────────────
  // 2. Dynamic Pricing Suggestions
  // ──────────────────────────────────────────────
  async getPricingSuggestions() {
    const items = await MenuItem.find({ isAvailable: true });
    const orders = await Order.find({ status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(200);

    const suggestions = [];

    // Calculate price elasticity proxy: items with high sales vs price
    const itemSales = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const id = item.menuItem.toString();
        if (!itemSales[id]) {
          itemSales[id] = { sold: 0, revenue: 0, name: item.name, price: item.price };
        }
        itemSales[id].sold += item.quantity;
        itemSales[id].revenue += item.price * item.quantity;
      });
    });

    items.forEach(item => {
      const id = item._id.toString();
      const sales = itemSales[id] || { sold: 0, revenue: 0 };

      // Items selling well below average price — consider price increase
      if (sales.sold > 20 && item.stock > 30) {
        suggestions.push({
          menuItemId: item._id,
          name: item.name,
          currentPrice: item.price,
          suggestedPrice: Math.round(item.price * 1.1 * 100) / 100, // +10%
          reason: 'High demand with ample stock — consider 10% increase',
          confidence: Math.min(85, 50 + sales.sold)
        });
      }

      // Items with low sales and high stock — consider price drop
      if (sales.sold < 5 && item.stock > 50 && item.price > 5) {
        suggestions.push({
          menuItemId: item._id,
          name: item.name,
          currentPrice: item.price,
          suggestedPrice: Math.round(item.price * 0.85 * 100) / 100, // -15%
          reason: 'Low turnover with high stock — consider 15% discount',
          confidence: Math.min(80, 40 + (item.stock / 10))
        });
      }
    });

    return suggestions;
  }

  // ──────────────────────────────────────────────
  // 3. Employee Performance Scoring
  // ──────────────────────────────────────────────
  async getEmployeePerformance() {
    const employees = await Employee.find({ isActive: true });
    const performance = [];

    for (const emp of employees) {
      // Weighted score: orders (30%) + sales (40%) - refunds (20%) + consistency (10%)
      const orderScore = Math.min(100, (emp.ordersProcessed / 100) * 30);
      const salesScore = Math.min(100, (emp.totalSalesAmount / 5000) * 40);
      const refundPenalty = Math.min(30, emp.refundsProcessed * 10);

      // Consistency score based on login recency (0-10)
      let consistencyScore = 5; // default middle value
      if (emp.lastLogin) {
        const daysSinceLogin = (Date.now() - new Date(emp.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLogin <= 1) consistencyScore = 10;
        else if (daysSinceLogin <= 3) consistencyScore = 8;
        else if (daysSinceLogin <= 7) consistencyScore = 6;
        else if (daysSinceLogin <= 14) consistencyScore = 4;
        else consistencyScore = 2;
      }

      const totalScore = Math.max(0, Math.min(100,
        orderScore + salesScore + consistencyScore - refundPenalty
      ));

      performance.push({
        employeeId: emp._id,
        name: emp.name,
        role: emp.role,
        ordersProcessed: emp.ordersProcessed,
        totalSales: emp.totalSalesAmount,
        refunds: emp.refundsProcessed,
        score: Math.round(totalScore * 100) / 100,
        shift: emp.shift,
        lastLogin: emp.lastLogin,
        consistencyScore
      });
    }

    return performance.sort((a, b) => b.score - a.score);
  }

  // ──────────────────────────────────────────────
  // 4. Discount Impact Prediction
  // ──────────────────────────────────────────────
  async predictDiscountImpact(discountPercentage = 10) {
    const orders = await Order.find({ status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(100);

    const avgOrderValue = orders.length > 0
      ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length
      : 0;

    // Estimate: discount attracts ~15-30% more orders
    const estimatedTrafficIncrease = 0.15 + (discountPercentage / 100) * 0.5;
    const estimatedOrderCount = Math.round(orders.length * (1 + estimatedTrafficIncrease));

    // New average after discount
    const discountedAvg = avgOrderValue * (1 - discountPercentage / 100);

    // Revenue estimate
    const currentRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const projectedRevenue = estimatedOrderCount * discountedAvg;

    return {
      currentMetrics: {
        totalOrders: orders.length,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        totalRevenue: Math.round(currentRevenue * 100) / 100
      },
      projectedMetrics: {
        estimatedOrders: estimatedOrderCount,
        estimatedAvgOrderValue: Math.round(discountedAvg * 100) / 100,
        estimatedRevenue: Math.round(projectedRevenue * 100) / 100
      },
      discountPercentage,
      revenueChange: Math.round((projectedRevenue - currentRevenue) / currentRevenue * 10000) / 100,
      recommendation: projectedRevenue > currentRevenue
        ? 'Discount may increase total revenue'
        : 'Discount may reduce total revenue — consider smaller percentage'
    };
  }

  // ──────────────────────────────────────────────
  // 5. Inventory Turnover Rate
  // ──────────────────────────────────────────────
  async getInventoryTurnover(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const items = await MenuItem.find({ isAvailable: true });
    const logs = await InventoryLog.find({
      createdAt: { $gte: since },
      reason: 'sale'
    });

    const turnover = items.map(item => {
      const itemLogs = logs.filter(log =>
        log.menuItem && log.menuItem.toString() === item._id.toString()
      );
      const unitsSold = itemLogs.reduce((sum, log) => sum + Math.abs(log.change), 0);
      const avgStock = item.stock + unitsSold / 2; // approximate average stock
      const turnoverRate = avgStock > 0 ? unitsSold / avgStock : 0;

      return {
        menuItemId: item._id,
        name: item.name,
        category: item.category,
        unitsSold,
        currentStock: item.stock,
        turnoverRate: Math.round(turnoverRate * 100) / 100,
        status: turnoverRate > 3 ? 'high' : turnoverRate > 1 ? 'medium' : 'low'
      };
    });

    return turnover.sort((a, b) => a.turnoverRate - b.turnoverRate);
  }

  // ──────────────────────────────────────────────
  // 6. Profit Margin Analysis
  // ──────────────────────────────────────────────
  async getProfitMargins() {
    const items = await MenuItem.find({ isAvailable: true });

    const margins = items.map(item => {
      const margin = item.price > 0 && item.costPrice > 0
        ? ((item.price - item.costPrice) / item.price) * 100
        : 0;

      return {
        menuItemId: item._id,
        name: item.name,
        category: item.category,
        price: item.price,
        costPrice: item.costPrice || 0,
        margin: Math.round(margin * 100) / 100,
        profitPerUnit: Math.round((item.price - (item.costPrice || 0)) * 100) / 100,
        totalProfit: Math.round((item.price - (item.costPrice || 0)) * item.sold * 100) / 100,
        status: margin >= 50 ? 'excellent' : margin >= 30 ? 'good' : margin >= 15 ? 'fair' : 'low'
      };
    });

    const avgMargin = margins.length > 0
      ? margins.reduce((sum, m) => sum + m.margin, 0) / margins.length
      : 0;

    return {
      items: margins.sort((a, b) => b.margin - a.margin),
      averageMargin: Math.round(avgMargin * 100) / 100,
      totalProfit: Math.round(margins.reduce((sum, m) => sum + m.totalProfit, 0) * 100) / 100,
      topPerformer: margins.length > 0 ? margins.reduce((best, m) => m.margin > best.margin ? m : best) : null
    };
  }

  // ──────────────────────────────────────────────
  // 7. Category Trends & Growth Rate
  // ──────────────────────────────────────────────
  async getCategoryTrends(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const orders = await Order.find({
      createdAt: { $gte: since },
      status: 'completed'
    });

    const categoryStats = {};

    orders.forEach(order => {
      // We need to look up categories — we'll use item names from order
      // and match to MenuItem for categories
      order.items.forEach(item => {
        // We'll aggregate by item name and later map to categories
        const key = item.name;
        if (!categoryStats[key]) {
          categoryStats[key] = { quantity: 0, revenue: 0 };
        }
        categoryStats[key].quantity += item.quantity;
        categoryStats[key].revenue += item.price * item.quantity;
      });
    });

    // Get all menu items for category mapping
    const menuItems = await MenuItem.find();
    const nameToCategory = {};
    menuItems.forEach(mi => { nameToCategory[mi.name] = mi.category; });

    // Aggregate by category
    const categoryData = {};
    Object.entries(categoryStats).forEach(([name, stats]) => {
      const cat = nameToCategory[name] || 'other';
      if (!categoryData[cat]) {
        categoryData[cat] = { quantity: 0, revenue: 0, itemCount: 0 };
      }
      categoryData[cat].quantity += stats.quantity;
      categoryData[cat].revenue += stats.revenue;
      categoryData[cat].itemCount += 1;
    });

    const totalRevenue = Object.values(categoryData).reduce((s, c) => s + c.revenue, 0);

    const trends = Object.entries(categoryData).map(([category, data]) => ({
      category,
      quantity: data.quantity,
      revenue: Math.round(data.revenue * 100) / 100,
      percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 10000) / 100 : 0,
      itemCount: data.itemCount
    }));

    return {
      categories: trends.sort((a, b) => b.revenue - a.revenue),
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      topCategory: trends.length > 0 ? trends.reduce((t, c) => c.revenue > t.revenue ? c : t) : null
    };
  }

  // ──────────────────────────────────────────────
  // 8. Optimal Staffing Suggestions
  // ──────────────────────────────────────────────
  async getStaffingSuggestions() {
    const orders = await Order.find({ status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(200);

    // Analyze peak hours from orders
    const hourlyCount = {};
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hourlyCount[hour] = (hourlyCount[hour] || 0) + 1;
    });

    // Determine peak periods
    const peakHours = [];
    const slowHours = [];
    for (let h = 0; h < 24; h++) {
      const count = hourlyCount[h] || 0;
      if (count >= 5) peakHours.push(h);
      else if (count < 2) slowHours.push(h);
    }

    // Current employee counts by shift
    const employees = await Employee.find({ isActive: true });
    const shiftCounts = { morning: 0, afternoon: 0, evening: 0 };
    employees.forEach(emp => {
      if (shiftCounts[emp.shift] !== undefined) shiftCounts[emp.shift]++;
    });

    const suggestions = [];

    if (peakHours.length > 0) {
      const morningPeak = peakHours.filter(h => h >= 6 && h < 12).length;
      const afternoonPeak = peakHours.filter(h => h >= 12 && h < 18).length;
      const eveningPeak = peakHours.filter(h => h >= 18 || h < 6).length;

      if (morningPeak > 0 && shiftCounts.morning < 2) {
        suggestions.push({
          shift: 'morning',
          currentStaff: shiftCounts.morning,
          recommendedStaff: 2,
          reason: `${morningPeak} peak hours detected in morning shift`,
          priority: 'medium'
        });
      }
      if (afternoonPeak > 0 && shiftCounts.afternoon < 3) {
        suggestions.push({
          shift: 'afternoon',
          currentStaff: shiftCounts.afternoon,
          recommendedStaff: 3,
          reason: `${afternoonPeak} peak hours detected in afternoon shift`,
          priority: 'high'
        });
      }
      if (eveningPeak > 0 && shiftCounts.evening < 2) {
        suggestions.push({
          shift: 'evening',
          currentStaff: shiftCounts.evening,
          recommendedStaff: 2,
          reason: `${eveningPeak} peak hours detected in evening shift`,
          priority: 'medium'
        });
      }
    }

    return {
      peakHours: peakHours.sort((a, b) => (hourlyCount[b] || 0) - (hourlyCount[a] || 0)),
      hourlyDistribution: Object.entries(hourlyCount).map(([hour, count]) => ({
        hour: parseInt(hour),
        orders: count
      })).sort((a, b) => a.hour - b.hour),
      currentStaffing: shiftCounts,
      suggestions
    };
  }

  // ──────────────────────────────────────────────
  // Dashboard Summary — Aggregates key metrics
  // ──────────────────────────────────────────────
  async getDashboardSummary(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [
      totalOrders,
      recentOrders,
      totalRevenue,
      activeItems,
      lowStockItems,
      activeEmployees,
      activeDiscounts,
      activeSales
    ] = await Promise.all([
      Order.countDocuments({ status: 'completed' }),
      Order.find({ createdAt: { $gte: since }, status: 'completed' }),
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      MenuItem.countDocuments({ isAvailable: true }),
      // Fix: countDocuments doesn't support $field references — handled below via find+filter
      Promise.resolve(0),
      Employee.countDocuments({ isActive: true }),
      // Count active discounts (not expired, isActive, within usage limit)
      Discount.countDocuments({
        isActive: true,
        $and: [
          {
            $or: [
              { expiresAt: null },
              { expiresAt: { $gte: new Date() } }
            ]
          },
          {
            $or: [
              { usageLimit: 0 },
              { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
            ]
          }
        ]
      }),
      // Count active sale events (currently within date range)
      SaleEvent.countDocuments({
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      })
    ]);

    // Fix lowStockItems count
    const allItems = await MenuItem.find({ isAvailable: true });
    const lowStock = allItems.filter(item => item.stock <= item.lowStockThreshold).length;

    const periodRevenue = recentOrders.reduce((sum, o) => sum + o.total, 0);
    const periodOrders = recentOrders.length;
    const avgOrderValue = periodOrders > 0 ? periodRevenue / periodOrders : 0;

    return {
      period: `${days} days`,
      totalOrders,
      periodOrders,
      periodRevenue: Math.round(periodRevenue * 100) / 100,
      totalRevenue: totalRevenue.length > 0 ? Math.round(totalRevenue[0].total * 100) / 100 : 0,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      activeItems,
      lowStockItems: lowStock,
      activeEmployees,
      activeDiscounts,
      activeSales
    };
  }
}

module.exports = new AdminEngine();
