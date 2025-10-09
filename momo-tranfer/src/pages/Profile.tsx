import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Shield,
  CreditCard,
  Bell,
  Users,
  HelpCircle,
  Settings,
  LogOut,
  Edit,
  Camera,
  CheckCircle,
  Star,
  Award,
  TrendingUp,
  Building2,
  ToggleLeft,
  ToggleRight,
  X,
  MapPin,
  Clock,
  Globe,
  Calendar,
  PhoneCall
} from 'lucide-react';

// Import components
import { SecuritySettings } from '../components/SecuritySettings';
import { PaymentMethods } from '../components/PaymentMethods';
import { NotificationSettings } from '../components/NotificationSettings';
import { ContactManagement } from '../components/ContactManagement';

const Profile = () => {
  // Modal states
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showContactManagement, setShowContactManagement] = useState(false);
  
  // Exchange Rate Card Toggle State
  const [showCommercialBusiness, setShowCommercialBusiness] = useState(false);
  
  // Business Details Popup State
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [showBusinessDetails, setShowBusinessDetails] = useState(false);

  // Enhanced Commercial Business Data
  const commercialBusinesses = [
    { 
      id: 1,
      name: 'Stanbic Bank', 
      type: 'Bank', 
      logo: '🏦',
      rates: { USD: '3,715/3,760', EUR: '4,040/4,090', GBP: '4,670/4,730' },
      details: {
        fullName: 'Stanbic Bank Uganda Limited',
        license: 'BOU-001',
        established: '1906',
        branches: '85+ Locations',
        phone: '+256 414 255 566',
        email: 'customercare@stanbicbank.co.ug',
        website: 'www.stanbicbank.co.ug',
        address: 'Crested Towers, Hannington Road, Kampala',
        services: ['Foreign Exchange', 'Wire Transfers', 'Trade Finance', 'Corporate Banking'],
        workingHours: 'Mon-Fri: 8:30AM-4:00PM, Sat: 8:30AM-12:30PM',
        rating: 4.8,
        description: 'Leading commercial bank in Uganda with comprehensive foreign exchange services and competitive rates for businesses and individuals.'
      }
    },
    { 
      id: 2,
      name: 'Centenary Bank', 
      type: 'Bank', 
      logo: '🏛️',
      rates: { USD: '3,710/3,765', EUR: '4,035/4,095', GBP: '4,665/4,735' },
      details: {
        fullName: 'Centenary Rural Development Bank',
        license: 'BOU-002',
        established: '1983',
        branches: '250+ Branches',
        phone: '+256 417 171 000',
        email: 'info@centenarybank.co.ug',
        website: 'www.centenarybank.co.ug',
        address: 'Centenary House, 7 Entebbe Road, Kampala',
        services: ['Forex Trading', 'Money Transfer', 'SME Banking', 'Agricultural Finance'],
        workingHours: 'Mon-Fri: 8:00AM-5:00PM, Sat: 8:00AM-1:00PM',
        rating: 4.6,
        description: 'Uganda\'s largest indigenous bank serving rural and urban communities with accessible forex services nationwide.'
      }
    },
    { 
      id: 3,
      name: 'FX Pro Bureau', 
      type: 'Bureau', 
      logo: '💱',
      rates: { USD: '3,722/3,748', EUR: '4,048/4,082', GBP: '4,678/4,722' },
      details: {
        fullName: 'FX Pro Foreign Exchange Bureau',
        license: 'BOU-FB-045',
        established: '2015',
        branches: 'Garden City Mall',
        phone: '+256 701 555 888',
        email: 'rates@fxpro.ug',
        website: 'www.fxpro.ug',
        address: 'Garden City Mall, Shop G24, Kampala',
        services: ['Currency Exchange', 'Money Transfer', 'Travel Money', 'Bulk Trading'],
        workingHours: 'Mon-Sun: 9:00AM-9:00PM',
        rating: 4.7,
        description: 'Professional forex bureau offering competitive rates and fast service for all your currency exchange needs.'
      }
    }
  ];

  // Mock user data
  const user = {
    name: 'John Doe',
    phoneNumber: '+256 771 234 567',
    email: 'john.doe@example.com',
    avatar: null,
    isVerified: true,
    joinDate: 'January 2024'
  };

  const handleLogout = () => {
    toast.success('Logged out successfully');
    // Add logout logic here
  };

  const menuItems = [
    {
      icon: Shield,
      title: 'Security Settings',
      description: 'PIN, biometrics, 2FA',
      action: () => setShowSecuritySettings(true)
    },
    {
      icon: CreditCard,
      title: 'Payment Methods',
      description: 'Manage cards and accounts',
      action: () => setShowPaymentMethods(true)
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Alerts and preferences',
      action: () => setShowNotificationSettings(true)
    },
    {
      icon: Users,
      title: 'Contact Management',
      description: 'Trusted contacts, approvals',
      action: () => setShowContactManagement(true)
    },
    {
      icon: HelpCircle,
      title: 'Help & Support',
      description: 'FAQs, contact support',
      action: () => toast.success('Help & Support coming soon!')
    },
    {
      icon: Settings,
      title: 'App Settings',
      description: 'General app preferences',
      action: () => toast.success('App Settings coming soon!')
    }
  ];

  const stats = [
    { label: 'Total Sent', value: 'UGX 2.5M', color: 'text-red-600' },
    { label: 'Total Received', value: 'UGX 1.8M', color: 'text-green-600' },
    { label: 'Transactions', value: '156', color: 'text-blue-600' }
  ];

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
        </div>
      </div>

      <div className="p-6">
        {/* Enhanced Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 shadow-lg mb-6 text-white"
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover border-3 border-white"
                />
              ) : (
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border-3 border-white">
                  <User className="w-8 h-8 text-white" />
                </div>
              )}
              <motion.button 
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => toast.success('Camera feature coming soon!')}
              >
                <Camera className="w-4 h-4 text-gray-900" />
              </motion.button>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h2 className="text-xl font-bold">{user.name}</h2>
                {user.isVerified && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </motion.div>
                )}
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium">VIP</span>
                </div>
              </div>
              <p className="text-blue-100 text-sm mb-2">{user.phoneNumber}</p>
              <p className="text-blue-100 text-xs">Member since {user.joinDate}</p>
            </div>

            <motion.button
              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toast.success('Profile edit coming soon!')}
            >
              <Edit className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <motion.p 
                className="text-2xl font-bold"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {stats[2].value}
              </motion.p>
              <p className="text-blue-100 text-xs">Transactions</p>
            </div>
            <div className="text-center">
              <motion.p 
                className="text-2xl font-bold text-green-300"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {stats[1].value}
              </motion.p>
              <p className="text-blue-100 text-xs">Received</p>
            </div>
            <div className="text-center">
              <motion.p 
                className="text-2xl font-bold text-red-300"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                {stats[0].value}
              </motion.p>
              <p className="text-blue-100 text-xs">Sent</p>
            </div>
          </div>
        </motion.div>

        {/* Achievement Badge */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 mb-6"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800">Power User</h3>
              <p className="text-sm text-yellow-700">You've completed 100+ transactions this month!</p>
            </div>
            <TrendingUp className="w-6 h-6 text-yellow-600" />
          </div>
        </motion.div>

        {/* Exchange Rate Card with Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mb-6"
        >
          <div className={`rounded-xl p-6 text-white shadow-lg transition-all duration-300 ${
            showCommercialBusiness 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-700' 
              : 'bg-gradient-to-r from-green-500 to-emerald-600'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  {showCommercialBusiness ? (
                    <Building2 className="w-6 h-6" />
                  ) : (
                    <TrendingUp className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {showCommercialBusiness ? 'Commercial Rates' : 'Exchange Rates'}
                  </h3>
                  <p className={`text-sm ${
                    showCommercialBusiness ? 'text-blue-100' : 'text-green-100'
                  }`}>
                    {showCommercialBusiness ? 'Banks & licensed institutions' : 'Street money exchangers'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className={`text-sm ${
                    showCommercialBusiness ? 'text-blue-100' : 'text-green-100'
                  }`}>
                    {showCommercialBusiness ? 'Professional' : 'Live Rates'}
                  </div>
                  <div className={`text-xs ${
                    showCommercialBusiness ? 'text-blue-200' : 'text-green-200'
                  }`}>
                    {showCommercialBusiness ? 'Regulated' : 'Updated now'}
                  </div>
                </div>
                
                {/* Toggle Button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowCommercialBusiness(!showCommercialBusiness);
                  }}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200"
                  title={showCommercialBusiness ? 'Switch to Street Exchangers' : 'Switch to Commercial Business'}
                >
                  {showCommercialBusiness ? (
                    <ToggleRight className="w-5 h-5" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                </motion.button>
              </div>
            </div>
            
            <div className="bg-white/20 rounded-lg p-4">
              {showCommercialBusiness ? (
                // Commercial Business View - Horizontal Cards
                <div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {commercialBusinesses.map((business) => (
                      <motion.div
                        key={business.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedBusiness(business);
                          setShowBusinessDetails(true);
                        }}
                        className="bg-white/20 rounded-lg p-3 cursor-pointer hover:bg-white/30 transition-all duration-200"
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-1">{business.logo}</div>
                          <div className="font-medium text-xs text-white truncate">{business.name}</div>
                          <div className="text-xs text-blue-200 mb-2">{business.type}</div>
                          <div className="text-xs font-medium">USD: {business.rates.USD.split('/')[0]}</div>
                          <div className="text-xs text-blue-200">Buy Rate</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <Link to="/commercial-exchange-rates" className="block">
                    <div className="text-center">
                      <span className="text-xs text-blue-200">
                        Compare all banks & bureaus →
                      </span>
                    </div>
                  </Link>
                </div>
              ) : (
                // Street Exchangers View
                <div>
                  <div className="grid grid-cols-3 gap-4 text-center mb-4">
                    <div>
                      <div className="text-xs text-green-100 mb-1">USD</div>
                      <div className="font-bold">3,720</div>
                    </div>
                    <div>
                      <div className="text-xs text-green-100 mb-1">EUR</div>
                      <div className="font-bold">4,050</div>
                    </div>
                    <div>
                      <div className="text-xs text-green-100 mb-1">GBP</div>
                      <div className="font-bold">4,680</div>
                    </div>
                  </div>
                  <Link to="/exchange-rates" className="block">
                    <div className="text-center">
                      <span className="text-xs text-green-200">Tap to view all exchangers →</span>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Personal Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium text-gray-900">{user.name}</p>
              </div>
              <button 
                className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors"
                onClick={() => toast.success('Edit name feature coming soon!')}
              >
                Edit
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="font-medium text-gray-900">{user.phoneNumber}</p>
              </div>
              <button 
                className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors"
                onClick={() => toast.success('Change phone feature coming soon!')}
              >
                Change
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
              <button 
                className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors"
                onClick={() => toast.success('Change email feature coming soon!')}
              >
                Change
              </button>
            </div>
          </div>
        </motion.div>

        {/* Menu Items */}
        <div className="space-y-3 mb-6">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.05 }}
                onClick={item.action}
                className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <Icon className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                  <div className="text-gray-400 group-hover:text-blue-600 transition-colors text-lg">→</div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Account Verification Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-xl border border-green-100 mb-6"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Account Verified</h3>
              <p className="text-sm text-gray-600">Your account is fully verified and secure</p>
            </div>
            <div className="text-green-500 text-2xl">✓</div>
          </div>
        </motion.div>

        {/* Logout Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          onClick={handleLogout}
          className="w-full bg-red-50 border border-red-200 p-4 rounded-xl hover:bg-red-100 transition-colors"
        >
          <div className="flex items-center justify-center space-x-2">
            <LogOut className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-600">Log Out</span>
          </div>
        </motion.button>

        {/* App Version Info */}
        <div className="text-center mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">MoMo Transfer App v1.0.0</p>
          <p className="text-xs text-gray-400 mt-1">Built with MTN MoMo API</p>
        </div>
      </div>

      {/* Modal Components */}
      <SecuritySettings
        isOpen={showSecuritySettings}
        onClose={() => setShowSecuritySettings(false)}
      />

      <PaymentMethods
        isOpen={showPaymentMethods}
        onClose={() => setShowPaymentMethods(false)}
      />

      <NotificationSettings
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />

      <ContactManagement
        isOpen={showContactManagement}
        onClose={() => setShowContactManagement(false)}
      />

      {/* Modern Business Details Popup */}
      {showBusinessDetails && selectedBusiness && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowBusinessDetails(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white relative">
              <button
                onClick={() => setShowBusinessDetails(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
                  {selectedBusiness.logo}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedBusiness.name}</h2>
                  <p className="text-blue-100">{selectedBusiness.details.fullName}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="px-2 py-1 bg-white/20 rounded-full text-xs">
                      {selectedBusiness.type}
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm">{selectedBusiness.details.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-96 overflow-y-auto">
              {/* Description */}
              <div className="mb-6">
                <p className="text-gray-700 text-sm leading-relaxed">
                  {selectedBusiness.details.description}
                </p>
              </div>

              {/* Exchange Rates */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Current Exchange Rates</h3>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(selectedBusiness.rates).map(([currency, rate]: [string, any]) => (
                    <div key={currency} className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="font-medium text-gray-900">{currency}</div>
                      <div className="text-sm text-gray-600 mt-1">{String(rate)}</div>
                      <div className="text-xs text-gray-500">Buy/Sell</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Business Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Established</p>
                      <p className="font-medium text-gray-900">{selectedBusiness.details.established}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Branches</p>
                      <p className="font-medium text-gray-900">{selectedBusiness.details.branches}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Address</p>
                    <p className="font-medium text-gray-900">{selectedBusiness.details.address}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Working Hours</p>
                    <p className="font-medium text-gray-900">{selectedBusiness.details.workingHours}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">License</p>
                    <p className="font-medium text-gray-900">{selectedBusiness.details.license}</p>
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Services Offered</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedBusiness.details.services.map((service: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>

              {/* Contact Actions */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    window.open(`tel:${selectedBusiness.details.phone}`);
                    toast.success(`Calling ${selectedBusiness.name}...`);
                  }}
                  className="flex flex-col items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-200"
                >
                  <PhoneCall className="w-5 h-5 text-green-600 mb-1" />
                  <span className="text-xs font-medium text-green-700">Call</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    window.open(`mailto:${selectedBusiness.details.email}`);
                    toast.success(`Opening email to ${selectedBusiness.name}...`);
                  }}
                  className="flex flex-col items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                >
                  <Mail className="w-5 h-5 text-blue-600 mb-1" />
                  <span className="text-xs font-medium text-blue-700">Email</span>
                </motion.button>

                {selectedBusiness.details.website && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      window.open(`https://${selectedBusiness.details.website}`, '_blank');
                      toast.success(`Opening ${selectedBusiness.name} website...`);
                    }}
                    className="flex flex-col items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors duration-200"
                  >
                    <Globe className="w-5 h-5 text-purple-600 mb-1" />
                    <span className="text-xs font-medium text-purple-700">Website</span>
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Profile;
