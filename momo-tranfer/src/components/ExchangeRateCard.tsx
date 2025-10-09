import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  ArrowRight,
  Globe,
  Shield,
  Users,
  Star,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { exchangeService } from '../services/exchangeService';
import type { ExchangeVendor, ExchangeRate } from '../types/exchange';

export const ExchangeRateCard = () => {
  const [topVendors, setTopVendors] = useState<ExchangeVendor[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vendorData, rateData] = await Promise.all([
        exchangeService.getTopVendors(3),
        exchangeService.getExchangeRates('USD')
      ]);
      setTopVendors(vendorData);
      setRates(rateData);
    } catch (error) {
      console.error('Failed to load exchange data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVendorRate = (vendorId: string): ExchangeRate | undefined => {
    return rates.find(rate => rate.vendorId === vendorId);
  };

  const getBestRate = (): number => {
    const validRates = rates.filter(rate => {
      const vendor = topVendors.find(v => v.id === rate.vendorId);
      return vendor?.verified;
    });
    
    return validRates.length > 0 
      ? Math.max(...validRates.map(rate => rate.buyRate))
      : 0;
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white"
      >
        <div className="flex items-center justify-center space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading rates...</span>
        </div>
      </motion.div>
    );
  }

  const bestRate = getBestRate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Exchange Rates</h3>
            <p className="text-green-100 text-sm">Street money exchangers</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-1">
            <Globe className="w-4 h-4" />
            <span className="text-sm">Live</span>
          </div>
        </div>
      </div>

      {/* Best Rate Display */}
      <div className="bg-white/20 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm">Best USD Rate Today</p>
            <p className="text-2xl font-bold">
              {bestRate > 0 ? `${bestRate.toLocaleString()} UGX` : 'N/A'}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-1 text-green-100">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">+0.8%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs text-green-100">Vendors</span>
          </div>
          <p className="font-semibold">{topVendors.length}+</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <Shield className="w-4 h-4" />
            <span className="text-xs text-green-100">Verified</span>
          </div>
          <p className="font-semibold">
            {topVendors.filter(v => v.verified).length}
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <Star className="w-4 h-4" />
            <span className="text-xs text-green-100">Avg Rating</span>
          </div>
          <p className="font-semibold">
            {topVendors.length > 0 
              ? (topVendors.reduce((acc, v) => acc + v.rating, 0) / topVendors.length).toFixed(1)
              : 'N/A'
            }
          </p>
        </div>
      </div>

      {/* Top Vendors Preview */}
      <div className="space-y-2 mb-4">
        <p className="text-sm text-green-100 font-medium">Top Rated Vendors:</p>
        {topVendors.slice(0, 2).map((vendor) => {
          const rate = getVendorRate(vendor.id);
          return (
            <div key={vendor.id} className="flex items-center justify-between bg-white/10 rounded-lg p-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">{vendor.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">{vendor.businessName}</p>
                  <p className="text-xs text-green-100">{vendor.location}</p>
                </div>
              </div>
              <div className="text-right">
                {rate && (
                  <p className="text-sm font-semibold">
                    {rate.buyRate.toLocaleString()}
                  </p>
                )}
                <div className="flex items-center space-x-1">
                  <Star className="w-3 h-3 text-yellow-400" />
                  <span className="text-xs">{vendor.rating}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Button */}
      <Link
        to="/exchange-rates"
        className="w-full bg-white text-green-600 py-3 px-4 rounded-lg font-semibold hover:bg-green-50 transition-colors flex items-center justify-center space-x-2 group"
      >
        <span>View All Rates</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Link>
    </motion.div>
  );
};