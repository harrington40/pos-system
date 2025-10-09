import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Filter,
  Star,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Users,
  DollarSign,
  RefreshCw,
  CheckCircle,
  Globe,
  Building2
} from 'lucide-react';

interface MoneyExchanger {
  id: string;
  name: string;
  businessName: string;
  rating: number;
  totalTransactions: number;
  isOnline: boolean;
  avatar: string;
  verified: boolean;
  location: string;
  lastActive: string;
  memberSince: string;
  responseTime: string;
  phone: string;
  whatsapp?: string;
  // Exchange rates
  usdBuyRate: number;
  usdSellRate: number;
  eurBuyRate: number;
  eurSellRate: number;
  gbpBuyRate: number;
  gbpSellRate: number;
  // Rate trends (percentage change in last 24h)
  usdTrend: number;
  eurTrend: number;
  gbpTrend: number;
  // Business info
  minAmount: number;
  maxAmount: number;
  workingHours: string;
  paymentMethods: string[];
  languages: string[];
  specialties: string[];
}

export const MoneyExchangers = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rating'); // rating, usd-rate, location
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  const sortOptions = [
    { value: 'rating', label: 'Highest Rated' },
    { value: 'usd-rate', label: 'Best USD Rate' },
    { value: 'transactions', label: 'Most Active' },
    { value: 'location', label: 'Nearest' }
  ];

  const moneyExchangers: MoneyExchanger[] = [
    {
      id: '1',
      name: 'John Mukisa',
      businessName: 'Kampala Forex Center',
      rating: 4.9,
      totalTransactions: 2847,
      isOnline: true,
      avatar: '💱',
      verified: true,
      location: 'Kampala Road, Kampala',
      lastActive: '2 minutes ago',
      memberSince: 'January 2022',
      responseTime: '< 5 minutes',
      phone: '+256781234567',
      whatsapp: '+256781234567',
      usdBuyRate: 3720,
      usdSellRate: 3680,
      eurBuyRate: 4050,
      eurSellRate: 4000,
      gbpBuyRate: 4680,
      gbpSellRate: 4620,
      usdTrend: 2.3,
      eurTrend: -1.2,
      gbpTrend: 1.8,
      minAmount: 100,
      maxAmount: 50000,
      workingHours: '8:00 AM - 8:00 PM',
      paymentMethods: ['Cash', 'Mobile Money', 'Bank Transfer'],
      languages: ['English', 'Luganda', 'Swahili'],
      specialties: ['Bulk Exchange', 'Fast Service', '24/7 WhatsApp']
    },
    {
      id: '2',
      name: 'Sarah Namuli',
      businessName: 'City Exchange Hub',
      rating: 4.8,
      totalTransactions: 1956,
      isOnline: true,
      avatar: '🏦',
      verified: true,
      location: 'Garden City, Kampala',
      lastActive: '1 minute ago',
      memberSince: 'March 2022',
      responseTime: '< 10 minutes',
      phone: '+256782345678',
      whatsapp: '+256782345678',
      usdBuyRate: 3715,
      usdSellRate: 3675,
      eurBuyRate: 4045,
      eurSellRate: 3995,
      gbpBuyRate: 4675,
      gbpSellRate: 4615,
      usdTrend: 1.8,
      eurTrend: 0.5,
      gbpTrend: -0.8,
      minAmount: 50,
      maxAmount: 30000,
      workingHours: '9:00 AM - 7:00 PM',
      paymentMethods: ['Cash', 'Mobile Money'],
      languages: ['English', 'Luganda'],
      specialties: ['Tourist Friendly', 'Good Rates', 'Mall Location']
    },
    {
      id: '3',
      name: 'Peter Ssali',
      businessName: 'Downtown Forex',
      rating: 4.7,
      totalTransactions: 3421,
      isOnline: false,
      avatar: '💰',
      verified: true,
      location: 'Owino Market, Kampala',
      lastActive: '15 minutes ago',
      memberSince: 'September 2021',
      responseTime: '< 30 minutes',
      phone: '+256783456789',
      usdBuyRate: 3710,
      usdSellRate: 3670,
      eurBuyRate: 4040,
      eurSellRate: 3990,
      gbpBuyRate: 4670,
      gbpSellRate: 4610,
      usdTrend: 1.2,
      eurTrend: -0.3,
      gbpTrend: 2.1,
      minAmount: 20,
      maxAmount: 100000,
      workingHours: '7:00 AM - 9:00 PM',
      paymentMethods: ['Cash', 'Mobile Money', 'Bank Transfer', 'Crypto'],
      languages: ['English', 'Luganda', 'Swahili', 'Arabic'],
      specialties: ['Bulk Exchange', 'All Currencies', 'Crypto Exchange']
    },
    {
      id: '4',
      name: 'Mary Nakato',
      businessName: 'Quick Exchange',
      rating: 4.6,
      totalTransactions: 1234,
      isOnline: true,
      avatar: '🔄',
      verified: false,
      location: 'Ntinda, Kampala',
      lastActive: '5 minutes ago',
      memberSince: 'June 2023',
      responseTime: '< 15 minutes',
      phone: '+256784567890',
      whatsapp: '+256784567890',
      usdBuyRate: 3700,
      usdSellRate: 3660,
      eurBuyRate: 4030,
      eurSellRate: 3980,
      gbpBuyRate: 4660,
      gbpSellRate: 4600,
      usdTrend: 0.8,
      eurTrend: 1.1,
      gbpTrend: -1.5,
      minAmount: 100,
      maxAmount: 20000,
      workingHours: '8:00 AM - 6:00 PM',
      paymentMethods: ['Cash', 'Mobile Money'],
      languages: ['English', 'Luganda'],
      specialties: ['Fast Service', 'Competitive Rates', 'New Business']
    },
    {
      id: '5',
      name: 'Ahmed Hassan',
      businessName: 'Global Money Exchange',
      rating: 4.9,
      totalTransactions: 4156,
      isOnline: true,
      avatar: '🌍',
      verified: true,
      location: 'Arua Park, Kampala',
      lastActive: 'Just now',
      memberSince: 'August 2020',
      responseTime: '< 2 minutes',
      phone: '+256785678901',
      whatsapp: '+256785678901',
      usdBuyRate: 3725,
      usdSellRate: 3685,
      eurBuyRate: 4055,
      eurSellRate: 4005,
      gbpBuyRate: 4685,
      gbpSellRate: 4625,
      usdTrend: 3.2,
      eurTrend: 2.1,
      gbpTrend: 1.9,
      minAmount: 10,
      maxAmount: 200000,
      workingHours: '24/7',
      paymentMethods: ['Cash', 'Mobile Money', 'Bank Transfer', 'Western Union', 'MoneyGram'],
      languages: ['English', 'Arabic', 'Swahili', 'French'],
      specialties: ['24/7 Service', 'International Transfers', 'Best Rates', 'All Payment Methods']
    }
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const filteredExchangers = moneyExchangers
    .filter(exchanger => {
      const matchesSearch = exchanger.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           exchanger.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           exchanger.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'usd-rate':
          return b.usdBuyRate - a.usdBuyRate;
        case 'transactions':
          return b.totalTransactions - a.totalTransactions;
        default:
          return 0;
      }
    });

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (trend < 0) return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-gray-400" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const formatRate = (rate: number) => {
    return `UGX ${rate.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading money exchangers...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link
              to="/profile"
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Money Exchangers</h1>
              <p className="text-green-100 text-sm">{filteredExchangers.length} dealers available</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <Filter className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Live Rates Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/20 rounded-lg p-3 mb-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">Live Street Rates</span>
            </div>
            <div className="text-xs text-green-100">Updated 30s ago</div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div className="text-center">
              <div className="text-xs text-green-100">USD</div>
              <div className="text-sm font-bold">3,725</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-green-100">EUR</div>
              <div className="text-sm font-bold">4,055</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-green-100">GBP</div>
              <div className="text-sm font-bold">4,685</div>
            </div>
          </div>
        </motion.div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-green-200 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search exchangers, locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-green-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 space-y-3"
          >
            {/* Sort Options */}
            <div>
              <label className="text-sm text-green-100 mb-2 block">Sort by</label>
              <div className="grid grid-cols-2 gap-2">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      sortBy === option.value
                        ? 'bg-white text-green-700'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Money Exchangers List */}
      <div className="p-4 space-y-4">
        {filteredExchangers.map((exchanger, index) => (
          <motion.div
            key={exchanger.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-2xl">
                      {exchanger.avatar}
                    </div>
                    {exchanger.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                    )}
                    {exchanger.verified && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Shield className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{exchanger.name}</h3>
                    <p className="text-sm font-medium text-blue-600">{exchanger.businessName}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium text-gray-700">{exchanger.rating}</span>
                      </div>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{exchanger.totalTransactions}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  exchanger.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {exchanger.isOnline ? 'ONLINE' : 'OFFLINE'}
                </div>
              </div>
            </div>

            {/* Exchange Rates */}
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span>Current Rates</span>
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {/* USD */}
                <div className="text-center p-2 bg-white rounded-lg border">
                  <div className="text-xs text-gray-500 mb-1">USD</div>
                  <div className="text-sm font-bold text-gray-900">
                    {formatRate(exchanger.usdBuyRate)}
                  </div>
                  <div className="flex items-center justify-center space-x-1 mt-1">
                    {getTrendIcon(exchanger.usdTrend)}
                    <span className={`text-xs font-medium ${getTrendColor(exchanger.usdTrend)}`}>
                      {Math.abs(exchanger.usdTrend)}%
                    </span>
                  </div>
                </div>
                
                {/* EUR */}
                <div className="text-center p-2 bg-white rounded-lg border">
                  <div className="text-xs text-gray-500 mb-1">EUR</div>
                  <div className="text-sm font-bold text-gray-900">
                    {formatRate(exchanger.eurBuyRate)}
                  </div>
                  <div className="flex items-center justify-center space-x-1 mt-1">
                    {getTrendIcon(exchanger.eurTrend)}
                    <span className={`text-xs font-medium ${getTrendColor(exchanger.eurTrend)}`}>
                      {Math.abs(exchanger.eurTrend)}%
                    </span>
                  </div>
                </div>
                
                {/* GBP */}
                <div className="text-center p-2 bg-white rounded-lg border">
                  <div className="text-xs text-gray-500 mb-1">GBP</div>
                  <div className="text-sm font-bold text-gray-900">
                    {formatRate(exchanger.gbpBuyRate)}
                  </div>
                  <div className="flex items-center justify-center space-x-1 mt-1">
                    {getTrendIcon(exchanger.gbpTrend)}
                    <span className={`text-xs font-medium ${getTrendColor(exchanger.gbpTrend)}`}>
                      {Math.abs(exchanger.gbpTrend)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Details */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="flex items-center space-x-1 text-gray-500 mb-1">
                    <MapPin className="w-3 h-3" />
                    <span>Location</span>
                  </div>
                  <p className="font-medium text-gray-900">{exchanger.location}</p>
                </div>
                <div>
                  <div className="flex items-center space-x-1 text-gray-500 mb-1">
                    <Clock className="w-3 h-3" />
                    <span>Hours</span>
                  </div>
                  <p className="font-medium text-gray-900">{exchanger.workingHours}</p>
                </div>
                <div>
                  <div className="flex items-center space-x-1 text-gray-500 mb-1">
                    <DollarSign className="w-3 h-3" />
                    <span>Range</span>
                  </div>
                  <p className="font-medium text-gray-900">
                    ${exchanger.minAmount} - ${exchanger.maxAmount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <div className="flex items-center space-x-1 text-gray-500 mb-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Response</span>
                  </div>
                  <p className="font-medium text-gray-900">{exchanger.responseTime}</p>
                </div>
              </div>

              {/* Specialties */}
              <div className="mt-3">
                <div className="flex flex-wrap gap-1">
                  {exchanger.specialties.slice(0, 3).map((specialty) => (
                    <span
                      key={specialty}
                      className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-md font-medium"
                    >
                      {specialty}
                    </span>
                  ))}
                  {exchanger.specialties.length > 3 && (
                    <span className="text-xs text-gray-500 px-2 py-1">
                      +{exchanger.specialties.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-4 pb-4">
              <div className="grid grid-cols-3 gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center space-x-2 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span className="text-sm font-medium">Call</span>
                </motion.button>
                
                {exchanger.whatsapp && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center space-x-2 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">WhatsApp</span>
                  </motion.button>
                )}
                
                <Link
                  to={`/exchanger/${exchanger.id}`}
                  className="flex items-center justify-center space-x-2 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Profile</span>
                </Link>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredExchangers.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Exchangers Found</h3>
            <p className="text-gray-600">Try adjusting your search criteria.</p>
          </motion.div>
        )}
      </div>

      {/* Floating Refresh Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-6 right-6"
      >
        <button className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-shadow hover:bg-green-600">
          <RefreshCw className="w-6 h-6" />
        </button>
      </motion.div>
    </div>
  );
};