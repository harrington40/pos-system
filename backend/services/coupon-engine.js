/**
 * Coupon Engine — Smart Coupon Recommendation Algorithms
 *
 * Provides intelligent discount matching, BOGO detection,
 * expiring-soon prioritization, and bundle deal suggestions
 * based on cart contents and customer behavior.
 */
const Discount = require('../models/Discount');
const SaleEvent = require('../models/SaleEvent');
const Order = require('../models/Order');

class CouponEngine {

  /**
   * Find the BEST discount for a given cart
   * Scores each active discount by:
   *   - Category match bonus (+30)
   *   - Higher savings amount (+0-25 based on % of total)
   *   - Expiring soon bonus (+15 if within 7 days)
   *   - BOGO priority (+10)
   * Returns top 3 sorted by score descending
   */
  async getBestDiscounts(cartItems, orderTotal) {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const discounts = await Discount.find({
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gte: now } }
      ]
    });

    const cartCategories = [...new Set(cartItems.map(i => i.category))];
    const cartTotal = orderTotal || cartItems.reduce((s, i) => s + (i.price * (i.quantity || 1)), 0);

    const scored = discounts.map(d => {
      let score = 0;
      let reasons = [];

      // ── Category match bonus ──
      const hasCategoryMatch = d.applicableCategories.length === 0 ||
        d.applicableCategories.some(c => cartCategories.includes(c));
      if (hasCategoryMatch && d.applicableCategories.length > 0) {
        score += 30;
        reasons.push('Matches items in your cart');
      }

      // ── Minimum order check ──
      if (d.minOrderAmount > 0 && cartTotal < d.minOrderAmount) {
        return null; // Skip — doesn't qualify
      }

      // ── Usage limit check ──
      if (d.usageLimit > 0 && d.usedCount >= d.usageLimit) {
        return null; // Skip — exhausted
      }

      // ── Calculate potential savings ──
      let potentialSavings = 0;
      if (d.type === 'percentage') {
        potentialSavings = cartTotal * (d.value / 100);
        if (d.maxDiscount > 0 && potentialSavings > d.maxDiscount) {
          potentialSavings = d.maxDiscount;
        }
      } else if (d.type === 'fixed') {
        potentialSavings = Math.min(d.value, cartTotal);
      } else if (d.type === 'bogo') {
        // BOGO: find cheapest item
        const cheapest = Math.min(...cartItems.map(i => i.price));
        potentialSavings = cheapest;
        score += 10;
        reasons.push('Buy One Get One deal available');
      }

      // ── Savings score (0-25 based on % of total) ──
      const savingsPct = cartTotal > 0 ? (potentialSavings / cartTotal) * 100 : 0;
      score += Math.min(25, savingsPct * 1.5);

      // ── Expiring soon bonus ──
      if (d.expiresAt && d.expiresAt <= sevenDaysFromNow) {
        score += 15;
        const daysLeft = Math.ceil((d.expiresAt - now) / (1000 * 60 * 60 * 24));
        reasons.push(`Expiring in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`);
      }

      return {
        discount: {
          _id: d._id,
          code: d.code,
          type: d.type,
          value: d.value,
          description: d.description,
          barcode: d.barcode,
          maxDiscount: d.maxDiscount,
          minOrderAmount: d.minOrderAmount,
          applicableCategories: d.applicableCategories,
          expiresAt: d.expiresAt,
        },
        score: Math.round(score),
        potentialSavings: Math.round(potentialSavings * 100) / 100,
        savingsLabel: d.type === 'percentage'
          ? `${d.value}% OFF${d.maxDiscount > 0 ? ` (up to $${d.maxDiscount})` : ''}`
          : d.type === 'fixed'
            ? `$${d.value} OFF`
            : 'BOGO',
        reasons,
      };
    }).filter(Boolean); // Remove nulls (non-qualifying)

    // Sort by score descending, return top 3
    return scored.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  /**
   * Look up a discount by barcode number
   */
  async lookupByBarcode(barcode) {
    if (!barcode || barcode.trim().length === 0) {
      return null;
    }

    const cleanBarcode = barcode.trim();

    // Try exact barcode match first
    let discount = await Discount.findOne({
      barcode: cleanBarcode,
      isActive: true,
    });

    // Fallback: try matching by code (in case they typed the code)
    if (!discount) {
      discount = await Discount.findOne({
        code: cleanBarcode.toUpperCase(),
        isActive: true,
      });
    }

    if (!discount) return null;

    // Check expiry
    if (discount.expiresAt && new Date() > new Date(discount.expiresAt)) {
      return { discount: null, error: 'This coupon has expired' };
    }

    // Check usage limit
    if (discount.usageLimit > 0 && discount.usedCount >= discount.usageLimit) {
      return { discount: null, error: 'This coupon has reached its usage limit' };
    }

    return {
      discount: {
        _id: discount._id,
        code: discount.code,
        type: discount.type,
        value: discount.value,
        description: discount.description,
        barcode: discount.barcode,
        maxDiscount: discount.maxDiscount,
        minOrderAmount: discount.minOrderAmount,
        applicableCategories: discount.applicableCategories,
        expiresAt: discount.expiresAt,
      },
      error: null,
    };
  }

  /**
   * Get currently active sale events that apply to cart items
   */
  async getActiveSaleEvents(cartCategories = []) {
    const now = new Date();
    const activeSales = await SaleEvent.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    return activeSales
      .filter(sale => {
        // Check recurring schedule
        if (sale.recurring && sale.recurring !== 'none') {
          const currentDay = now.getDay(); // 0=Sun, 6=Sat
          const currentMinutes = now.getHours() * 60 + now.getMinutes();

          // Check day of week
          if (sale.daysOfWeek && sale.daysOfWeek.length > 0) {
            if (!sale.daysOfWeek.includes(currentDay)) return false;
          }

          // Check time window
          if (sale.startTime && sale.endTime) {
            const [startH, startM] = sale.startTime.split(':').map(Number);
            const [endH, endM] = sale.endTime.split(':').map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            if (currentMinutes < startMinutes || currentMinutes > endMinutes) return false;
          }
        }

        // Check if applicable to cart categories
        if (cartCategories.length > 0 && sale.applicableCategories.length > 0) {
          return sale.applicableCategories.some(c => cartCategories.includes(c));
        }

        return true;
      })
      .map(sale => ({
        _id: sale._id,
        name: sale.name,
        type: sale.type,
        discountPercentage: sale.discountPercentage,
        description: sale.description,
        applicableCategories: sale.applicableCategories,
        bannerColor: sale.bannerColor,
      }));
  }

  /**
   * Suggest bundle deals based on frequently bought together items
   * Uses order history to find item pairings
   */
  async getBundleSuggestions(cartItemIds = []) {
    if (cartItemIds.length === 0) return [];

    // Filter out invalid IDs (non-ObjectId strings)
    const validIds = cartItemIds.filter(id => {
      if (!id || typeof id !== 'string') return false;
      return /^[0-9a-fA-F]{24}$/.test(id);
    });

    if (validIds.length === 0) return [];

    try {
      // Find orders that contain any of the cart items
      const recentOrders = await Order.find({
        'items.menuItem': { $in: validIds },
        status: 'completed',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }).limit(50);

      // Count co-occurrence of items with cart items
      const coOccurrence = {};
      for (const order of recentOrders) {
        for (const item of order.items) {
          const id = item.menuItem?.toString();
          if (id && !validIds.includes(id)) {
            coOccurrence[id] = (coOccurrence[id] || 0) + 1;
            coOccurrence[`${id}_name`] = item.name;
          }
        }
      }

      // Sort by frequency and return top 5
      return Object.entries(coOccurrence)
        .filter(([key]) => !key.endsWith('_name'))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, count]) => ({
          menuItemId: id,
          name: coOccurrence[`${id}_name`] || 'Unknown',
          frequency: count,
          suggestion: `Often bought together (${count} orders)`,
        }));
    } catch (err) {
      console.error('Bundle suggestions error:', err.message);
      return [];
    }
  }
}

module.exports = new CouponEngine();
