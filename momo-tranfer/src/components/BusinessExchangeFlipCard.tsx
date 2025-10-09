import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Globe,
  Shield,
  Users,
  Star,
  RefreshCw,
  Store,
  RotateCcw,
  ChevronRight,
  Plus,
  Eye,
  EyeOff,
  Activity,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  X,
  CheckCircle,
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { exchangeService } from '../services/exchangeService';
import type { ExchangeVendor, ExchangeRate } from '../types/exchange';

interface BusinessPartner {
  id: string;
  name: string;
  category: string;
  rating: number;
  totalTransactions: number;
  isOnline: boolean;
  avatar: string;
  verified: boolean;
  services: string[];
  location: string;
  lastActive: string;
}

export const BusinessExchangeFlipCard = () => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [businessEnabled, setBusinessEnabled] = useState(false);
  const [topVendors, setTopVendors] = useState<ExchangeVendor[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [businessPartners, setBusinessPartners] = useState<BusinessPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExchanger, setSelectedExchanger] = useState<ExchangeVendor | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessPartner | null>(null);
  const [showExchangerPopup, setShowExchangerPopup] = useState(false);
  const [showBusinessPopup, setShowBusinessPopup] = useState(false);

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
      
      // Mock business partners data
      setBusinessPartners([
        {
          id: '1',
          name: 'Kampala Electronics Hub',
          category: 'Electronics',
          rating: 4.8,
          totalTransactions: 1247,
          isOnline: true,
          avatar: '🏪',
          verified: true,
          services: ['Buy', 'Sell', 'Repair'],
          location: 'Kampala, Uganda',
          lastActive: '2 minutes ago'
        },
        {
          id: '2',
          name: 'Fresh Market Vendors',
          category: 'Agriculture',
          rating: 4.6,
          totalTransactions: 856,
          isOnline: true,
          avatar: '🥬',
          verified: true,
          services: ['Fresh Produce', 'Wholesale'],
          location: 'Nakawa Market',
          lastActive: '5 minutes ago'
        },
        {
          id: '3',
          name: 'Fashion Forward Boutique',
          category: 'Fashion',
          rating: 4.9,
          totalTransactions: 634,
          isOnline: false,
          avatar: '👗',
          verified: true,
          services: ['Retail', 'Custom Design'],
          location: 'Garden City Mall',
          lastActive: '1 hour ago'
        }
      ]);
    } catch (error) {
      console.error('Failed to load exchange data:', error);
    } finally {
      setLoading(false);
    }
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

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const toggleBusinessMode = () => {
    setBusinessEnabled(!businessEnabled);
  };

  const handleExchangerClick = (vendor: ExchangeVendor, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip
    setSelectedExchanger(vendor);
    setShowExchangerPopup(true);
  };

  const handleBusinessClick = (business: BusinessPartner, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip
    setSelectedBusiness(business);
    setShowBusinessPopup(true);
  };

  const closeExchangerPopup = () => {
    setShowExchangerPopup(false);
    setSelectedExchanger(null);
  };

  const closeBusinessPopup = () => {
    setShowBusinessPopup(false);
    setSelectedBusiness(null);
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white h-64"
      >
        <div className="flex items-center justify-center h-full space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </motion.div>
    );
  }

  const bestRate = getBestRate();

  return (
    <div className="relative w-full h-80" style={{ perspective: '1000px' }}>
      <motion.div
        className="relative w-full h-full cursor-pointer"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
        onClick={handleFlip}
      >
        {/* Front Side - Exchange Rates */}
        <motion.div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-full">
            {/* Header */}
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
              <div className="flex items-center space-x-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </motion.button>
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
                  <p className="text-green-100 text-sm">Best USD Rate</p>
                  <p className="text-2xl font-bold">UGX {bestRate.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1 text-green-200">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">+2.5%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Vendors */}
            <div className="space-y-2">
              {topVendors.slice(0, 2).map((vendor, index) => {
                const rate = rates.find(r => r.vendorId === vendor.id);
                return (
                  <motion.div
                    key={vendor.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                    onClick={(e) => handleExchangerClick(vendor, e)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                          <Store className="w-4 h-4" />
                        </div>
                        {vendor.verified && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <Shield className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{vendor.name}</p>
                        <div className="flex items-center space-x-1">
                          <Star className="w-3 h-3 text-yellow-300 fill-current" />
                          <span className="text-xs text-green-200">{vendor.rating}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{rate?.buyRate.toLocaleString()}</p>
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Flip Indicator */}
            <div className="absolute bottom-4 right-4 opacity-60">
              <div className="flex items-center space-x-1 text-xs">
                <RotateCcw className="w-3 h-3" />
                <span>Flip for Business</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Back Side - Street Money Exchanger */}
        <motion.div
          className="absolute inset-0"
          style={{ 
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)"
          }}
        >
          <div className="relative rounded-xl overflow-hidden shadow-lg h-full">
            {/* Street Market Background */}
            <div className="absolute inset-0">
              {/* Base gradient resembling street/market colors */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-700 via-orange-800 to-red-900"></div>
              
              {/* Texture overlay for street feel */}
              <div className="absolute inset-0 opacity-30">
                <div className="grid grid-cols-16 grid-rows-16 h-full">
                  {Array.from({ length: 256 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="bg-white"
                      animate={{
                        opacity: [0.02, 0.08, 0.02],
                      }}
                      transition={{
                        duration: 4,
                        delay: i * 0.01,
                        repeat: Infinity,
                      }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Gritty overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
            </div>

            <div className="relative z-10 p-6 text-white h-full">
              {/* Street Exchanger Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center border-2 border-yellow-300 shadow-lg transform rotate-3">
                      <Store className="w-6 h-6 text-amber-900" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-yellow-100 uppercase tracking-wide">Street Exchange</h3>
                    <p className="text-orange-200 text-sm font-semibold">Money Changers • Forex</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBusinessMode();
                    }}
                    className={`p-2 rounded-lg border-2 transition-all duration-300 ${
                      businessEnabled 
                        ? 'bg-green-600 border-green-400 text-white shadow-lg shadow-green-500/50' 
                        : 'bg-red-700 border-red-500 hover:bg-red-600'
                    }`}
                  >
                    {businessEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </motion.button>
                </div>
              </div>

              {/* Market Status Banner */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`mb-4 p-3 rounded-lg border-2 transition-all duration-300 ${
                  businessEnabled 
                    ? 'bg-green-600/40 border-green-400 shadow-lg shadow-green-500/30' 
                    : 'bg-red-600/40 border-red-400 shadow-lg shadow-red-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      businessEnabled 
                        ? 'bg-green-400 border-green-300 shadow-lg shadow-green-400/50 animate-pulse' 
                        : 'bg-red-400 border-red-300 animate-pulse'
                    }`} />
                    <span className="text-sm font-bold uppercase tracking-wider">
                      Market Status: {businessEnabled ? 'OPEN FOR BUSINESS' : 'CLOSED'}
                    </span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBusinessMode();
                    }}
                    className={`text-xs font-bold px-3 py-1 rounded-lg border-2 transition-all uppercase ${
                      businessEnabled 
                        ? 'bg-red-600 border-red-500 hover:bg-red-700 shadow-lg' 
                        : 'bg-green-600 border-green-500 hover:bg-green-700 shadow-lg'
                    }`}
                  >
                    {businessEnabled ? 'CLOSE SHOP' : 'OPEN SHOP'}
                  </motion.button>
                </div>
              </motion.div>

              {businessEnabled ? (
                <>
                  {/* Business Directory */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-yellow-200 flex items-center space-x-2 uppercase">
                        <Activity className="w-4 h-4 animate-pulse" />
                        <span>Business Directory</span>
                      </span>
                      <span className="text-xs bg-gradient-to-r from-blue-600 to-purple-500 border border-blue-400 px-3 py-1 rounded-full font-bold shadow-lg uppercase tracking-wide">
                        {businessPartners.length} BUSINESSES
                      </span>
                    </div>
                    
                    {/* Horizontal Scrolling Business Cards */}
                    <div className="overflow-x-auto pb-2">
                      <div className="flex space-x-3" style={{ width: 'max-content' }}>
                        {businessPartners.map((business, index) => (
                          <motion.div
                            key={business.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex-shrink-0 w-40 p-3 rounded-lg border-2 transition-all duration-300 cursor-pointer group"
                            style={{
                              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(147, 51, 234, 0.3))',
                              borderColor: 'rgba(59, 130, 246, 0.6)',
                              boxShadow: '0 4px 20px rgba(59, 130, 246, 0.2)'
                            }}
                            whileHover={{
                              scale: 1.05,
                              y: -2,
                            }}
                            onClick={(e) => handleBusinessClick(business, e)}
                          >
                            <div className="text-center">
                              <div className="relative mx-auto mb-2">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center border-2 border-blue-300 shadow-lg">
                                  <span className="text-lg font-bold text-white">
                                    {business.name.charAt(0)}
                                  </span>
                                </div>
                                {business.isOnline && (
                                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                                )}
                              </div>
                              <p className="text-xs font-bold text-white truncate mb-1">{business.name}</p>
                              <p className="text-xs text-blue-200 truncate mb-2">{business.category}</p>
                              <div className="flex items-center justify-center space-x-1">
                                <Star className="w-3 h-3 text-yellow-300 fill-current" />
                                <span className="text-xs text-yellow-200 font-semibold">{business.rating}</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <motion.div
                      whileHover={{
                        scale: 1.05,
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link
                        to="/money-exchangers"
                        onClick={(e) => e.stopPropagation()}
                        className="relative overflow-hidden flex items-center justify-center space-x-2 p-3 rounded-lg transition-all duration-300 border-2 border-blue-400 group"
                        style={{
                          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                          boxShadow: '0 8px 32px rgba(37, 99, 235, 0.3)'
                        }}
                      >
                        <Users className="w-5 h-5 z-10" />
                        <span className="text-sm font-bold uppercase z-10">Find Dealers</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      </Link>
                    </motion.div>
                    
                    <motion.div
                      whileHover={{
                        scale: 1.05,
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link
                        to="/business/register"
                        onClick={(e) => e.stopPropagation()}
                        className="relative overflow-hidden flex items-center justify-center space-x-2 p-3 rounded-lg transition-all duration-300 border-2 border-green-400 group"
                        style={{
                          background: 'linear-gradient(135deg, #059669, #10b981)',
                          boxShadow: '0 8px 32px rgba(5, 150, 105, 0.3)'
                        }}
                      >
                        <Plus className="w-5 h-5 z-10" />
                        <span className="text-sm font-bold uppercase z-10">Join Network</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      </Link>
                    </motion.div>
                  </div>
                </>
              ) : (
                /* Market Closed State */
                <div className="flex flex-col items-center justify-center h-40">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="relative w-24 h-24 mb-4"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-800 rounded-xl border-4 border-red-400 shadow-2xl shadow-red-500/50 flex items-center justify-center transform rotate-12">
                      <Store className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute top-0 right-0 w-6 h-6 bg-yellow-400 rounded-full border-2 border-white transform rotate-45">
                      <div className="w-full h-full bg-red-600 rounded-full transform scale-75"></div>
                    </div>
                  </motion.div>
                  <p className="text-center text-red-200 text-lg font-bold mb-2 uppercase tracking-wide">
                    Market Closed
                  </p>
                  <p className="text-center text-orange-200 text-sm font-medium leading-tight">
                    Open the exchange network to connect<br />with street money dealers & forex traders
                  </p>
                </div>
              )}

              {/* Flip Indicator */}
              <div className="absolute bottom-4 right-4 opacity-80">
                <div className="flex items-center space-x-1 text-xs font-bold px-3 py-2 rounded-lg border-2 border-yellow-400/50 uppercase tracking-wider"
                     style={{ background: 'rgba(0, 0, 0, 0.4)' }}>
                  <RotateCcw className="w-3 h-3" />
                  <span>Flip to Rates</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Exchanger Popup */}
      {showExchangerPopup && selectedExchanger && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeExchangerPopup}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{selectedExchanger.name}</h3>
                    <p className="text-green-100">Money Exchanger</p>
                  </div>
                </div>
                <button
                  onClick={closeExchangerPopup}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Trust Indicators */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <span className="font-bold text-gray-900">{selectedExchanger.rating}</span>
                  </div>
                  {selectedExchanger.verified && (
                    <div className="flex items-center space-x-1 text-blue-600">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm font-medium">Verified</span>
                    </div>
                  )}
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedExchanger.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {selectedExchanger.isOnline ? 'Online' : 'Offline'}
                </div>
              </div>

              {/* Exchange Rates */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span>Today's Rates</span>
                </h4>
                <div className="space-y-3">
                  {rates.filter(rate => rate.vendorId === selectedExchanger.id).map((rate) => (
                    <div key={rate.toCurrency} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">{rate.toCurrency}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Buy: UGX {rate.buyRate.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">Sell: UGX {rate.sellRate.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-bold text-gray-900 mb-3">Contact & Safety</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="font-medium text-gray-900">Location</p>
                      <p className="text-sm text-gray-600">{selectedExchanger.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900">Working Hours</p>
                      <p className="text-sm text-gray-600">8:00 AM - 8:00 PM</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="font-medium text-gray-900">Safety Verified</p>
                      <p className="text-sm text-gray-600">Licensed & Regulated</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center space-x-2 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors">
                  <Phone className="w-4 h-4" />
                  <span>Call Now</span>
                </button>
                <button className="flex items-center justify-center space-x-2 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
              </div>

              {/* Safety Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Safety Reminder</p>
                    <p className="text-xs text-yellow-700">
                      Always verify rates before transactions. Meet in public places and count money carefully.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Business Popup */}
      {showBusinessPopup && selectedBusiness && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeBusinessPopup}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl">
                    {selectedBusiness.avatar}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{selectedBusiness.name}</h3>
                    <p className="text-blue-100">{selectedBusiness.category}</p>
                  </div>
                </div>
                <button
                  onClick={closeBusinessPopup}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Business Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Star className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900">{selectedBusiness.rating}</p>
                  <p className="text-xs text-gray-600">Rating</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <Users className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900">{selectedBusiness.totalTransactions}</p>
                  <p className="text-xs text-gray-600">Deals</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900">{selectedBusiness.verified ? 'Yes' : 'No'}</p>
                  <p className="text-xs text-gray-600">Verified</p>
                </div>
              </div>

              {/* Services */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">Services Offered</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedBusiness.services.map((service) => (
                    <span
                      key={service}
                      className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>

              {/* Business Information */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-bold text-gray-900 mb-3">Business Details</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="font-medium text-gray-900">Location</p>
                      <p className="text-sm text-gray-600">{selectedBusiness.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900">Last Active</p>
                      <p className="text-sm text-gray-600">{selectedBusiness.lastActive}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center space-x-2 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  <span>Message</span>
                </button>
                <Link
                  to={`/business/partner/${selectedBusiness.id}`}
                  className="flex items-center justify-center space-x-2 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"
                  onClick={closeBusinessPopup}
                >
                  <Eye className="w-4 h-4" />
                  <span>View Profile</span>
                </Link>
              </div>

              {/* Trust Badge */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Trusted Business Partner</p>
                    <p className="text-xs text-blue-700">
                      Verified business with secure transaction history. Always confirm details before engaging.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};