/**
 * Inventory Engine — Smart Algorithm
 *
 * Provides intelligent inventory recommendations:
 * - Reorder point calculation based on sales velocity
 * - Stockout prediction (days until empty)
 * - Restock quantity suggestions (14-day supply)
 * - Low-stock priority ranking
 */

class InventoryEngine {
  /**
   * Calculate average daily sales for an item from InventoryLog history
   * @param {string} itemId - MenuItem ObjectId
   * @param {Array} logs - Array of InventoryLog documents
   * @param {number} days - Lookback period (default: 30)
   * @returns {number} Average daily units sold
   */
  getAverageDailySales(itemId, logs, days = 30) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const recentLogs = logs.filter(log =>
      log.menuItem &&
      log.menuItem.toString() === itemId.toString() &&
      log.reason === 'sale' &&
      new Date(log.createdAt).getTime() > cutoff
    );
    const totalSold = recentLogs.reduce((sum, log) => sum + Math.abs(log.change), 0);
    return totalSold / days;
  }

  /**
   * Calculate optimal reorder point
   * reorderPoint = (avgDailySales × leadTime) + safetyStock
   * @param {number} avgDailySales
   * @param {number} leadTime - Days to restock (default: 2)
   * @param {number} safetyStockPct - Buffer percentage (default: 0.5 = 50%)
   * @returns {number} Reorder point (minimum stock before reorder)
   */
  getReorderPoint(avgDailySales, leadTime = 2, safetyStockPct = 0.5) {
    const safetyStock = Math.ceil(avgDailySales * safetyStockPct);
    return Math.ceil(avgDailySales * leadTime) + safetyStock;
  }

  /**
   * Predict days until stockout
   * @param {number} currentStock
   * @param {number} avgDailySales
   * @returns {number|null} Days remaining, or null if no sales data
   */
  predictStockout(currentStock, avgDailySales) {
    if (avgDailySales <= 0) return null;
    return currentStock / avgDailySales;
  }

  /**
   * Suggest restock quantity (14-day supply minus current stock)
   * @param {number} currentStock
   * @param {number} avgDailySales
   * @param {number} daysSupply - Target days of supply (default: 14)
   * @returns {number} Suggested quantity to order
   */
  suggestRestockQty(currentStock, avgDailySales, daysSupply = 14) {
    const targetStock = Math.ceil(avgDailySales * daysSupply);
    return Math.max(0, targetStock - currentStock);
  }

  /**
   * Generate full restock suggestions for all menu items
   * @param {Array} items - Array of MenuItem documents (with stock, lowStockThreshold)
   * @param {Array} logs - Array of InventoryLog documents
   * @returns {Array} Sorted suggestions with priority
   */
  generateSuggestions(items, logs) {
    const suggestions = items.map(item => {
      const avgDailySales = this.getAverageDailySales(item._id, logs);
      const daysUntilStockout = this.predictStockout(item.stock, avgDailySales);
      const suggestedRestockQty = this.suggestRestockQty(item.stock, avgDailySales);
      const reorderPoint = this.getReorderPoint(avgDailySales);
      const isLowStock = item.stock <= item.lowStockThreshold;

      // Priority: high = stockout imminent or already below threshold
      let priority = 'low';
      if (isLowStock || (daysUntilStockout !== null && daysUntilStockout <= 1)) {
        priority = 'high';
      } else if (daysUntilStockout !== null && daysUntilStockout <= 3) {
        priority = 'medium';
      }

      return {
        item: {
          _id: item._id,
          name: item.name,
          category: item.category,
          stock: item.stock,
          lowStockThreshold: item.lowStockThreshold,
          price: item.price,
        },
        avgDailySales: Math.round(avgDailySales * 10) / 10,
        daysUntilStockout: daysUntilStockout !== null
          ? Math.round(daysUntilStockout * 10) / 10
          : null,
        suggestedRestockQty,
        reorderPoint,
        priority,
      };
    });

    // Sort: high priority first, then medium, then low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return suggestions;
  }

  /**
   * Get top-selling items from order data
   * @param {Array} orders - Array of Order documents
   * @param {number} limit - Max items to return
   * @returns {Array} Top selling items with counts
   */
  getTopSelling(orders, limit = 10) {
    const salesMap = {};
    orders.forEach(order => {
      if (order.status === 'refunded') return;
      order.items.forEach(item => {
        const id = item.menuItem.toString();
        if (!salesMap[id]) {
          salesMap[id] = { menuItem: id, name: item.name, totalQty: 0, totalRevenue: 0 };
        }
        salesMap[id].totalQty += item.quantity;
        salesMap[id].totalRevenue += item.price * item.quantity;
      });
    });

    return Object.values(salesMap)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, limit);
  }

  /**
   * Calculate sales summary for a date range
   * @param {Array} orders - Array of Order documents
   * @param {number} days - Lookback period
   * @returns {Object} Sales summary
   */
  getSalesSummary(orders, days = 7) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const filtered = orders.filter(o =>
      o.status !== 'refunded' &&
      new Date(o.createdAt).getTime() > cutoff
    );

    const totalRevenue = filtered.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = filtered.length;
    const totalItems = filtered.reduce((sum, o) =>
      sum + o.items.reduce((s, i) => s + i.quantity, 0), 0
    );

    return {
      period: `${days} days`,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      totalItems,
      avgOrderValue: totalOrders > 0
        ? Math.round((totalRevenue / totalOrders) * 100) / 100
        : 0,
    };
  }

  /**
   * Analyze peak hours from orders
   * @param {Array} orders - Array of Order documents
   * @returns {Array} Hours sorted by order count
   */
  getPeakHours(orders) {
    const hourCounts = {};
    orders.forEach(order => {
      if (order.status === 'refunded') return;
      const hour = new Date(order.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), orders: count }))
      .sort((a, b) => b.orders - a.orders);
  }
}

module.exports = new InventoryEngine();
