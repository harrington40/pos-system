import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search,
  Filter,
  Calendar,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'request';
  amount: number;
  currency: string;
  recipient?: {
    phoneNumber: string;
    name: string;
  };
  sender?: {
    phoneNumber: string;
    name: string;
  };
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  description?: string;
  fee: number;
}

export const TransactionHistory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'send' | 'receive'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  const transactions: Transaction[] = [
    {
      id: '1',
      type: 'send',
      amount: 50000,
      currency: 'UGX',
      recipient: { phoneNumber: '+256 781 234 567', name: 'John Doe' },
      status: 'completed',
      timestamp: '2 hours ago',
      description: 'Lunch payment',
      fee: 0
    },
    {
      id: '2',
      type: 'receive',
      amount: 75000,
      currency: 'UGX',
      sender: { phoneNumber: '+256 772 345 678', name: 'Jane Smith' },
      status: 'completed',
      timestamp: '1 day ago',
      description: 'Payment for services',
      fee: 0
    },
    {
      id: '3',
      type: 'send',
      amount: 25000,
      currency: 'UGX',
      recipient: { phoneNumber: '+256 783 456 789', name: 'Mike Johnson' },
      status: 'pending',
      timestamp: '2 days ago',
      description: 'Transport money',
      fee: 0
    },
    {
      id: '4',
      type: 'receive',
      amount: 120000,
      currency: 'UGX',
      sender: { phoneNumber: '+256 794 567 890', name: 'Sarah Wilson' },
      status: 'completed',
      timestamp: '3 days ago',
      description: 'Rent payment',
      fee: 0
    },
    {
      id: '5',
      type: 'send',
      amount: 30000,
      currency: 'UGX',
      recipient: { phoneNumber: '+256 785 678 901', name: 'David Brown' },
      status: 'failed',
      timestamp: '1 week ago',
      description: 'Failed transaction',
      fee: 0
    },
  ];

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'failed') {
      return <Clock className="w-5 h-5" />;
    }
    
    return type === 'send' ? (
      <ArrowUpRight className="w-5 h-5" />
    ) : (
      <ArrowDownLeft className="w-5 h-5" />
    );
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.recipient?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.sender?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.recipient?.phoneNumber.includes(searchTerm) ||
      transaction.sender?.phoneNumber.includes(searchTerm) ||
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || transaction.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const totalSent = transactions
    .filter(t => t.type === 'send' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalReceived = transactions
    .filter(t => t.type === 'receive' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center space-x-4 mb-4">
          <Link
            to="/"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Transaction History</h1>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-momo-blue focus:border-transparent"
          />
        </div>
      </div>

      <div className="p-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
          >
            <p className="text-sm text-gray-600 mb-1">Total Sent</p>
            <p className="text-lg font-bold text-red-600">{formatAmount(totalSent)}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
          >
            <p className="text-sm text-gray-600 mb-1">Total Received</p>
            <p className="text-lg font-bold text-green-600">{formatAmount(totalReceived)}</p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'send' | 'receive')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-momo-blue"
            >
              <option value="all">All Transactions</option>
              <option value="send">Sent</option>
              <option value="receive">Received</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-momo-blue"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-3">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2">No transactions found</p>
              <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.type === 'send' 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {getTransactionIcon(transaction.type, transaction.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-gray-900">
                          {transaction.type === 'send' ? 'Sent to' : 'Received from'}
                        </p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {transaction.type === 'send' 
                          ? transaction.recipient?.name || transaction.recipient?.phoneNumber
                          : transaction.sender?.name || transaction.sender?.phoneNumber}
                      </p>
                      {transaction.description && (
                        <p className="text-xs text-gray-500 mt-1">{transaction.description}</p>
                      )}
                      <p className="text-xs text-gray-500">{transaction.timestamp}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.type === 'send' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {transaction.type === 'send' ? '-' : '+'}
                      {formatAmount(transaction.amount)}
                    </p>
                    {transaction.fee > 0 && (
                      <p className="text-xs text-gray-500">Fee: {formatAmount(transaction.fee)}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Load More Button */}
        {filteredTransactions.length > 0 && (
          <div className="mt-6 text-center">
            <button className="text-momo-blue font-semibold hover:text-blue-700 transition-colors">
              Load More Transactions
            </button>
          </div>
        )}
      </div>
    </div>
  );
};