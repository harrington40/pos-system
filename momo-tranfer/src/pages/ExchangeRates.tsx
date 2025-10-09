import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Star, 
  Shield, 
  MapPin, 
  Phone, 
  MessageCircle, 
  RefreshCw, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ExchangeRate {
  currency: string;
  flag: string;
  buyRate: number;
  sellRate: number;
  change24h: number;
}

interface MoneyExchanger {
  id: string;
  name: string;
  businessName: string;
  avatar: string;
  rating: number;
  isOnline: boolean;
  verified: boolean;
  location: string;
  phone: string;
  whatsapp?: string;
  rates: ExchangeRate[];
  lastUpdate: string;
  totalTransactions: number;
}

const mockExchangers: MoneyExchanger[] = [
  {
    id: '1',
    name: 'Abdul Rahman',
    businessName: 'Rahman Money Exchange',
    avatar: '👨🏽‍💼',
    rating: 4.9,
    isOnline: true,
    verified: true,
    location: 'Kampala Central, Uganda',
    phone: '+256701234567',
    whatsapp: '+256701234567',
    lastUpdate: '2 minutes ago',
    totalTransactions: 1250,
    rates: [
      { currency: 'USD', flag: '🇺🇸', buyRate: 3720, sellRate: 3750, change24h: 2.1 },
      { currency: 'EUR', flag: '🇪🇺', buyRate: 4050, sellRate: 4080, change24h: -1.2 },
      { currency: 'GBP', flag: '🇬🇧', buyRate: 4680, sellRate: 4720, change24h: 0.8 },
      { currency: 'KES', flag: '🇰🇪', buyRate: 28.5, sellRate: 29.2, change24h: 1.5 }
    ]
  },
  {
    id: '2',
    name: 'Sarah Nakato',
    businessName: 'Nakato Exchange Bureau',
    avatar: '👩🏽‍💼',
    rating: 4.7,
    isOnline: true,
    verified: true,
    location: 'Wandegeya, Uganda',
    phone: '+256702345678',
    whatsapp: '+256702345678',
    lastUpdate: '5 minutes ago',
    totalTransactions: 890,
    rates: [
      { currency: 'USD', flag: '🇺🇸', buyRate: 3715, sellRate: 3745, change24h: 1.8 },
      { currency: 'EUR', flag: '🇪🇺', buyRate: 4045, sellRate: 4075, change24h: -0.9 },
      { currency: 'GBP', flag: '🇬🇧', buyRate: 4675, sellRate: 4715, change24h: 0.5 },
      { currency: 'TZS', flag: '🇹🇿', buyRate: 1.58, sellRate: 1.62, change24h: 2.3 }
    ]
  },
  {
    id: '3',
    name: 'Moses Kiprotich',
    businessName: 'Kiprotich Forex',
    avatar: '👨🏿‍💼',
    rating: 4.8,
    isOnline: false,
    verified: true,
    location: 'Owino Market, Uganda',
    phone: '+256703456789',
    lastUpdate: '15 minutes ago',
    totalTransactions: 2100,
    rates: [
      { currency: 'USD', flag: '🇺🇸', buyRate: 3725, sellRate: 3755, change24h: 2.5 },
      { currency: 'EUR', flag: '🇪🇺', buyRate: 4055, sellRate: 4085, change24h: -1.5 },
      { currency: 'GBP', flag: '🇬🇧', buyRate: 4685, sellRate: 4725, change24h: 1.2 },
      { currency: 'RWF', flag: '🇷🇼', buyRate: 3.85, sellRate: 3.92, change24h: 0.7 }
    ]
  }
];

const ExchangeRates = () => {
  const [exchangers] = useState<MoneyExchanger[]>(mockExchangers);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currencies = ['All', 'USD', 'EUR', 'GBP', 'KES', 'TZS', 'RWF'];

  const filteredExchangers = exchangers.filter(exchanger => {
    const matchesSearch = exchanger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exchanger.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exchanger.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCurrency = selectedCurrency === 'All' || 
                           exchanger.rates.some(rate => rate.currency === selectedCurrency);
    
    return matchesSearch && matchesCurrency;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success('Exchange rates updated!');
    setIsRefreshing(false);
  };

  const handleContactExchanger = (exchanger: MoneyExchanger, method: 'call' | 'whatsapp') => {
    if (method === 'call') {
      window.open(`tel:${exchanger.phone}`);
      toast.success(`Calling ${exchanger.name}...`);
    } else if (method === 'whatsapp' && exchanger.whatsapp) {
      window.open(`https://wa.me/${exchanger.whatsapp.replace('+', '')}`);
      toast.success(`Opening WhatsApp chat with ${exchanger.name}...`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center space-x-4">
            <Link
              to="/profile"
              className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Exchange Rates</h1>
              <p className="text-gray-600">Street Money Exchangers</p>
            </div>
          </div>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-blue-600 font-medium">Refresh</span>
          </motion.button>
        </motion.div>

        {/* Safety Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg"
        >
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-yellow-800 font-medium">Safety First</p>
              <p className="text-yellow-700 text-sm">
                Always meet in public places, verify exchanger credentials, and count money carefully before completing transactions.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-lg mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search exchangers by name, business, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              {currencies.map((currency) => (
                <button
                  key={currency}
                  onClick={() => setSelectedCurrency(currency)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    selectedCurrency === currency
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {currency}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Exchange Rates Table Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Live Exchange Rates</h2>
            <p className="text-gray-600">Compare rates from verified street money exchangers</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {filteredExchangers.slice(0, 3).map((exchanger, index) => (
                <motion.div
                  key={exchanger.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xl">
                        {exchanger.avatar}
                      </div>
                      {exchanger.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-800 truncate">{exchanger.name}</h3>
                        {exchanger.verified && (
                          <Shield className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{exchanger.businessName}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm text-gray-600 ml-1">{exchanger.rating}</span>
                        </div>
                        <span className="text-gray-400">•</span>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-3 h-3 mr-1" />
                          <span className="truncate">{exchanger.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {exchanger.rates.slice(0, 2).map((rate) => (
                      <div key={rate.currency} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{rate.flag}</span>
                          <span className="font-medium text-gray-800">{rate.currency}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-800">{rate.buyRate.toLocaleString()}</div>
                          <div className={`text-xs ${rate.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {rate.change24h >= 0 ? '+' : ''}{rate.change24h}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{exchanger.lastUpdate}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleContactExchanger(exchanger, 'call')}
                        className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors duration-200"
                        title="Call"
                      >
                        <Phone className="w-4 h-4" />
                      </motion.button>
                      {exchanger.whatsapp && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleContactExchanger(exchanger, 'whatsapp')}
                          className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors duration-200"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ExchangeRates;