import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Star,
  MapPin,
  Clock,
  DollarSign,
  Shield,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Globe,
  Heart,
  Share2,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ExchangerProfile {
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
  // Rate trends
  usdTrend: number;
  eurTrend: number;
  gbpTrend: number;
  // Business details
  minAmount: number;
  maxAmount: number;
  workingHours: string;
  paymentMethods: string[];
  languages: string[];
  specialties: string[];
  description: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    swiftCode?: string;
  };
  reviews: {
    id: string;
    rating: number;
    comment: string;
    date: string;
    reviewer: string;
  }[];
}

export const ExchangerProfile = () => {
  const { id } = useParams();
  const [exchanger, setExchanger] = useState<ExchangerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rates'); // rates, reviews, contact

  useEffect(() => {
    loadExchangerProfile();
  }, [id]);

  const loadExchangerProfile = async () => {
    setLoading(true);
    try {
      // Mock data - in real app, fetch from API
      const mockExchanger: ExchangerProfile = {
        id: id || '1',
        name: 'John Mukisa',
        businessName: 'Kampala Forex Center',
        rating: 4.9,
        totalTransactions: 2847,
        isOnline: true,
        avatar: '💱',
        verified: true,
        location: 'Plot 123, Kampala Road, Kampala Central Division',
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
        workingHours: 'Monday - Sunday: 8:00 AM - 8:00 PM',
        paymentMethods: ['Cash', 'Mobile Money (MTN, Airtel)', 'Bank Transfer', 'Western Union'],
        languages: ['English', 'Luganda', 'Swahili'],
        specialties: ['Bulk Exchange', 'Fast Service', '24/7 WhatsApp Support', 'Tourist Friendly'],
        description: 'Experienced money exchanger with over 5 years in the forex business. Known for competitive rates, fast service, and reliability. Specializes in large transactions and provides 24/7 WhatsApp support for urgent exchanges.',
        bankDetails: {
          bankName: 'Stanbic Bank Uganda',
          accountNumber: 'XXXX-XXXX-1234',
          swiftCode: 'SBICUGKX'
        },
        reviews: [
          {
            id: '1',
            rating: 5,
            comment: 'Excellent service! Best rates in town and very professional.',
            date: '2 days ago',
            reviewer: 'Sarah K.'
          },
          {
            id: '2',
            rating: 5,
            comment: 'Fast and reliable. Have been using their services for months.',
            date: '1 week ago',
            reviewer: 'David M.'
          },
          {
            id: '3',
            rating: 4,
            comment: 'Good rates but sometimes takes a bit longer during busy hours.',
            date: '2 weeks ago',
            reviewer: 'Grace N.'
          }
        ]
      };
      
      setExchanger(mockExchanger);
    } catch (error) {
      console.error('Failed to load exchanger profile:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleCall = () => {
    if (exchanger?.phone) {
      window.location.href = `tel:${exchanger.phone}`;
    }
  };

  const handleWhatsApp = () => {
    if (exchanger?.whatsapp) {
      window.open(`https://wa.me/${exchanger.whatsapp.replace('+', '')}`);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${exchanger?.businessName} - Money Exchanger`,
        text: `Check out ${exchanger?.name}'s exchange rates`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Profile link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exchanger profile...</p>
        </motion.div>
      </div>
    );
  }

  if (!exchanger) {
    return (
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Exchanger Not Found</h3>
          <p className="text-gray-600 mb-4">The exchanger profile you're looking for doesn't exist.</p>
          <Link to="/money-exchangers" className="btn-primary">
            Browse Exchangers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white">
        <div className="flex items-center justify-between p-4">
          <Link
            to="/money-exchangers"
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleShare}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <Heart className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Profile Header */}
        <div className="px-4 pb-6">
          <div className="flex items-start space-x-4">
            <div className="relative">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl">
                {exchanger.avatar}
              </div>
              {exchanger.isOnline && (
                <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white animate-pulse"></div>
              )}
              {exchanger.verified && (
                <div className="absolute -top-1 -right-1 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{exchanger.name}</h1>
              <p className="text-green-100 font-medium">{exchanger.businessName}</p>
              <div className="flex items-center space-x-3 mt-2">
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-300 fill-current" />
                  <span className="font-medium">{exchanger.rating}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{exchanger.totalTransactions}</span>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  exchanger.isOnline ? 'bg-green-500/30 text-green-100' : 'bg-gray-500/30 text-gray-200'
                }`}>
                  {exchanger.isOnline ? 'ONLINE' : 'OFFLINE'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4">
          {[
            { id: 'rates', label: 'Rates', icon: DollarSign },
            { id: 'reviews', label: 'Reviews', icon: Star },
            { id: 'contact', label: 'Contact', icon: Phone }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors relative ${
                activeTab === tab.id 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-green-200 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'rates' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Current Rates */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <Globe className="w-5 h-5 text-green-600" />
                <span>Current Exchange Rates</span>
              </h3>
              <div className="space-y-4">
                {[
                  { currency: 'USD', buy: exchanger.usdBuyRate, sell: exchanger.usdSellRate, trend: exchanger.usdTrend },
                  { currency: 'EUR', buy: exchanger.eurBuyRate, sell: exchanger.eurSellRate, trend: exchanger.eurTrend },
                  { currency: 'GBP', buy: exchanger.gbpBuyRate, sell: exchanger.gbpSellRate, trend: exchanger.gbpTrend }
                ].map((rate) => (
                  <div key={rate.currency} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="font-bold text-blue-600">{rate.currency}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Buy: {formatRate(rate.buy)}</p>
                        <p className="text-sm text-gray-600">Sell: {formatRate(rate.sell)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(rate.trend)}
                        <span className={`text-sm font-medium ${getTrendColor(rate.trend)}`}>
                          {Math.abs(rate.trend)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">24h change</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction Limits */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Transaction Limits</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Minimum</p>
                  <p className="text-lg font-bold text-blue-600">${exchanger.minAmount}</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Maximum</p>
                  <p className="text-lg font-bold text-green-600">${exchanger.maxAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Payment Methods</h3>
              <div className="flex flex-wrap gap-2">
                {exchanger.paymentMethods.map((method) => (
                  <span
                    key={method}
                    className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'reviews' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {exchanger.reviews.map((review) => (
              <div key={review.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">
                        {review.reviewer.charAt(0)}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">{review.reviewer}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-gray-700 mb-2">{review.comment}</p>
                <p className="text-xs text-gray-500">{review.date}</p>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'contact' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Contact Information */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">{exchanger.phone}</p>
                    <p className="text-sm text-gray-600">Phone</p>
                  </div>
                </div>
                {exchanger.whatsapp && (
                  <div className="flex items-center space-x-3">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">{exchanger.whatsapp}</p>
                      <p className="text-sm text-gray-600">WhatsApp</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-gray-900">{exchanger.location}</p>
                    <p className="text-sm text-gray-600">Location</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-900">{exchanger.workingHours}</p>
                    <p className="text-sm text-gray-600">Working Hours</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCall}
                className="flex items-center justify-center space-x-2 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
              >
                <Phone className="w-5 h-5" />
                <span className="font-medium">Call Now</span>
              </motion.button>
              
              {exchanger.whatsapp && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleWhatsApp}
                  className="flex items-center justify-center space-x-2 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-medium">WhatsApp</span>
                </motion.button>
              )}
            </div>

            {/* Business Details */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">About {exchanger.businessName}</h3>
              <p className="text-gray-700 mb-4">{exchanger.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Member Since</p>
                  <p className="font-medium text-gray-900">{exchanger.memberSince}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Response Time</p>
                  <p className="font-medium text-gray-900">{exchanger.responseTime}</p>
                </div>
              </div>
            </div>

            {/* Languages */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {exchanger.languages.map((language) => (
                  <span
                    key={language}
                    className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full"
                  >
                    {language}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};