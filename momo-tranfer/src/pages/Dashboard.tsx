import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Send, 
  Wallet, 
  History, 
  Eye, 
  EyeOff, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Plus
} from 'lucide-react';
import momoApi from '../services/momoApi';

export const Dashboard = () => {
  const [balance, setBalance] = useState<number>(0);
  const [showBalance, setShowBalance] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currency] = useState('UGX');

  const recentTransactions = [
    {
      id: '1',
      type: 'send',
      amount: 50000,
      recipient: '+256 781 234 567',
      timestamp: '2 hours ago',
      status: 'completed'
    },
    {
      id: '2',
      type: 'receive',
      amount: 75000,
      sender: '+256 772 345 678',
      timestamp: '1 day ago',
      status: 'completed'
    },
    {
      id: '3',
      type: 'send',
      amount: 25000,
      recipient: '+256 783 456 789',
      timestamp: '2 days ago',
      status: 'completed'
    }
  ];

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      const response = await momoApi.mockGetBalance();
      if (response.success && response.data) {
        setBalance(response.data.balance);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const quickActions = [
    {
      name: 'Send Money',
      href: '/send',
      icon: Send,
      color: 'bg-gradient-to-r from-blue-600 to-cyan-500',
      description: 'Transfer to anyone'
    },
    {
      name: 'Receive Money',
      href: '/receive',
      icon: Wallet,
      color: 'bg-gradient-to-r from-emerald-500 to-cyan-500',
      description: 'Request payment'
    },
    {
      name: 'Add Money',
      href: '/add',
      icon: Plus,
      color: 'bg-gradient-to-r from-amber-500 to-orange-500',
      description: 'Top up wallet'
    },
    {
      name: 'History',
      href: '/history',
      icon: History,
      color: 'bg-gradient-to-r from-teal-500 to-blue-500',
      description: 'View transactions'
    }
  ];

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
      {/* Header with Enhanced Design */}
      <div className="bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 text-white p-6 rounded-b-3xl relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-2xl font-bold"
              >
                Welcome back!
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-blue-200 mt-1"
              >
                Ready to transfer money?
              </motion.p>
            </div>
            <motion.div 
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3, type: "spring" }}
              className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
            >
              <span className="text-xl">👋</span>
            </motion.div>
          </div>

          {/* Enhanced Balance Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-blue-200 text-sm">Total Balance</span>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              {loading ? (
                <div className="animate-pulse bg-white/20 h-8 w-32 rounded"></div>
              ) : (
                <motion.span 
                  key={showBalance ? balance : 'hidden'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-3xl font-bold"
                >
                  {showBalance ? formatAmount(balance) : '••••••'}
                </motion.span>
              )}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <TrendingUp className="w-5 h-5 text-green-300" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Enhanced Quick Actions */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            ⚡
          </motion.div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.name}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  duration: 0.5, 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ 
                  scale: 1.05,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to={action.href}
                  className="block p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group"
                >
                  <motion.div 
                    className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}
                    whileHover={{ rotate: 5 }}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </motion.div>
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors duration-300">{action.name}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Enhanced Recent Transactions */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            <Link
              to="/history"
              className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors flex items-center space-x-1"
            >
              <span>View all</span>
              <motion.div
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.div>
            </Link>
          </div>

          <div className="space-y-3">
            {recentTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <motion.div 
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        transaction.type === 'send' 
                          ? 'bg-red-100 text-red-600' 
                          : 'bg-green-100 text-green-600'
                      }`}
                      whileHover={{ rotate: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {transaction.type === 'send' ? (
                        <ArrowUpRight className="w-6 h-6" />
                      ) : (
                        <ArrowDownLeft className="w-6 h-6" />
                      )}
                    </motion.div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-gray-900">
                          {transaction.type === 'send' ? 'Sent to' : 'Received from'}
                        </p>
                        <motion.span 
                          className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                        >
                          {transaction.status}
                        </motion.span>
                      </div>
                      <p className="text-sm text-gray-600 font-medium">
                        {transaction.type === 'send' 
                          ? transaction.recipient 
                          : transaction.sender}
                      </p>
                      <p className="text-xs text-gray-500">{transaction.timestamp}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <motion.p 
                      className={`font-bold text-lg ${
                        transaction.type === 'send' ? 'text-red-600' : 'text-green-600'
                      }`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                    >
                      {transaction.type === 'send' ? '-' : '+'}
                      {formatAmount(transaction.amount)}
                    </motion.p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Enhanced Promotional Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-400 p-4 rounded-2xl shadow-lg relative overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-2 right-4 w-16 h-16 bg-white rounded-full"></div>
            <div className="absolute bottom-2 left-4 w-8 h-8 bg-white rounded-full"></div>
            <div className="absolute top-1/2 right-8 w-4 h-4 bg-white rounded-full"></div>
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div>
              <motion.h3 
                className="font-bold text-gray-900"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                No fees this week!
              </motion.h3>
              <p className="text-sm text-gray-800">Send money without charges</p>
            </div>
            <motion.div 
              className="text-3xl"
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                repeatDelay: 1
              }}
            >
              🎉
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};