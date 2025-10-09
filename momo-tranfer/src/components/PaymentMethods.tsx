import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CreditCard, 
  Plus, 
  Trash2, 
  Shield,
  Smartphone,
  Building,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentMethodsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaymentMethod {
  id: string;
  type: 'mobile_money' | 'bank_account' | 'card';
  name: string;
  details: string;
  isDefault: boolean;
  isVerified: boolean;
  balance?: number;
  lastUsed?: string;
  icon: any;
  color: string;
}

export const PaymentMethods = ({ isOpen, onClose }: PaymentMethodsProps) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'mobile_money',
      name: 'MTN MoMo',
      details: '+256 781 234 567',
      isDefault: true,
      isVerified: true,
      balance: 150000,
      lastUsed: '2 hours ago',
      icon: Smartphone,
      color: 'bg-yellow-500'
    },
    {
      id: '2',
      type: 'mobile_money',
      name: 'Airtel Money',
      details: '+256 789 876 543',
      isDefault: false,
      isVerified: true,
      balance: 75000,
      lastUsed: '1 day ago',
      icon: Smartphone,
      color: 'bg-red-500'
    },
    {
      id: '3',
      type: 'bank_account',
      name: 'Stanbic Bank',
      details: '**** **** **** 1234',
      isDefault: false,
      isVerified: true,
      lastUsed: '3 days ago',
      icon: Building,
      color: 'bg-blue-600'
    }
  ]);

  const [showAddMethod, setShowAddMethod] = useState(false);
  const [newMethodType, setNewMethodType] = useState<'mobile_money' | 'bank_account' | 'card'>('mobile_money');
  const [newMethodDetails, setNewMethodDetails] = useState('');
  const [newMethodName, setNewMethodName] = useState('');

  const setDefaultMethod = (id: string) => {
    setPaymentMethods(prev => prev.map(method => ({
      ...method,
      isDefault: method.id === id
    })));
    toast.success('Default payment method updated');
  };

  const removeMethod = (id: string) => {
    const method = paymentMethods.find(m => m.id === id);
    if (method?.isDefault) {
      toast.error('Cannot remove default payment method');
      return;
    }
    setPaymentMethods(prev => prev.filter(method => method.id !== id));
    toast.success('Payment method removed');
  };

  const addPaymentMethod = () => {
    if (!newMethodName || !newMethodDetails) {
      toast.error('Please fill in all fields');
      return;
    }

    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: newMethodType,
      name: newMethodName,
      details: newMethodDetails,
      isDefault: false,
      isVerified: false,
      icon: newMethodType === 'mobile_money' ? Smartphone : newMethodType === 'bank_account' ? Building : CreditCard,
      color: newMethodType === 'mobile_money' ? 'bg-green-500' : newMethodType === 'bank_account' ? 'bg-blue-500' : 'bg-purple-500'
    };

    setPaymentMethods(prev => [...prev, newMethod]);
    setShowAddMethod(false);
    setNewMethodName('');
    setNewMethodDetails('');
    toast.success('Payment method added successfully');
  };

  const verifyMethod = (id: string) => {
    setPaymentMethods(prev => prev.map(method => 
      method.id === id ? { ...method, isVerified: true } : method
    ));
    toast.success('Payment method verified');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Payment Methods</h2>
                <p className="text-blue-100 text-sm">Manage your payment accounts</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Add New Method Button */}
            <motion.button
              onClick={() => setShowAddMethod(true)}
              className="w-full mb-6 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-center space-x-2 text-gray-600 group-hover:text-blue-600">
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add New Payment Method</span>
              </div>
            </motion.button>

            {/* Add Method Form */}
            <AnimatePresence>
              {showAddMethod && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 bg-gray-50 rounded-xl p-4"
                >
                  <h3 className="font-semibold text-gray-900 mb-4">Add New Payment Method</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={newMethodType}
                        onChange={(e) => setNewMethodType(e.target.value as any)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="mobile_money">Mobile Money</option>
                        <option value="bank_account">Bank Account</option>
                        <option value="card">Credit/Debit Card</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={newMethodName}
                        onChange={(e) => setNewMethodName(e.target.value)}
                        placeholder="e.g., MTN MoMo, Stanbic Bank"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {newMethodType === 'mobile_money' ? 'Phone Number' : 
                         newMethodType === 'bank_account' ? 'Account Number' : 'Card Number'}
                      </label>
                      <input
                        type="text"
                        value={newMethodDetails}
                        onChange={(e) => setNewMethodDetails(e.target.value)}
                        placeholder={newMethodType === 'mobile_money' ? '+256 781 234 567' : 
                                   newMethodType === 'bank_account' ? '1234567890' : '1234 5678 9012 3456'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={addPaymentMethod}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add Method
                      </button>
                      <button
                        onClick={() => setShowAddMethod(false)}
                        className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Payment Methods List */}
            <div className="space-y-4">
              {paymentMethods.map((method, index) => {
                const Icon = method.icon;
                return (
                  <motion.div
                    key={method.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-white border-2 rounded-xl p-4 ${
                      method.isDefault ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 ${method.color} rounded-lg flex items-center justify-center`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900">{method.name}</h3>
                            {method.isDefault && (
                              <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full font-medium">
                                Default
                              </span>
                            )}
                            {method.isVerified ? (
                              <Shield className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-orange-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{method.details}</p>
                          {method.balance && (
                            <p className="text-sm font-medium text-green-600">
                              UGX {method.balance.toLocaleString()}
                            </p>
                          )}
                          {method.lastUsed && (
                            <p className="text-xs text-gray-500">Last used: {method.lastUsed}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {!method.isVerified && (
                          <button
                            onClick={() => verifyMethod(method.id)}
                            className="px-3 py-1 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors"
                          >
                            Verify
                          </button>
                        )}
                        
                        {!method.isDefault && (
                          <button
                            onClick={() => setDefaultMethod(method.id)}
                            className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            Set Default
                          </button>
                        )}
                        
                        {!method.isDefault && (
                          <button
                            onClick={() => removeMethod(method.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Payment Statistics */}
            <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Payment Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {paymentMethods.filter(m => m.isVerified).length}
                  </p>
                  <p className="text-sm text-gray-600">Verified Methods</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    UGX {paymentMethods.reduce((sum, m) => sum + (m.balance || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Total Balance</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};