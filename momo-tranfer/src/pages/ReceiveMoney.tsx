import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  DollarSign,
  Phone,
  MessageSquare,
  QrCode,
  Copy,
  Share2,
  Wallet,
  Star,
  TrendingUp,
  Zap,
  Brain,
  Target,
  Award,
  Users,
  Clock,
  Send,
  HistoryIcon,
  Bell,
  Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { smartPaymentService } from '../services/smartPaymentService';

interface RequestMoneyForm {
  phoneNumber: string;
  amount: number;
  message: string;
  requestPermission?: boolean;
}

export const ReceiveMoney = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [requestData, setRequestData] = useState<RequestMoneyForm | null>(null);
  const [requestLink] = useState('https://momo-transfer.app/pay/abc123');
  const [frequentRequesters, setFrequentRequesters] = useState<Array<{
    id: string;
    name: string;
    phone: string;
    avgAmount: number;
    frequency: number;
    successRate: number;
    trustScore: number;
  }>>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [requestHistory, setRequestHistory] = useState<Array<{
    id: string;
    amount: number;
    from: string;
    date: string;
    timestamp: Date;
    status: 'pending' | 'approved' | 'paid';
  }>>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<RequestMoneyForm>();

  const watchedAmount = watch('amount');
  
  // Smart amount suggestions based on AI analysis
  const quickAmounts = [5000, 10000, 25000, 50000, 100000, 200000];
  
  // Enhanced smart suggestions with context
  const smartAmountSuggestions = [
    { amount: 15000, reason: 'Lunch split (4 people)', confidence: 92, icon: '🍽️' },
    { amount: 8000, reason: 'Transport fare', confidence: 94, icon: '🚗' },
    { amount: 25000, reason: 'Weekend hangout', confidence: 78, icon: '🎉' }
  ];

  // Load pending approvals
  useEffect(() => {
    // Initialize frequent requesters
    setFrequentRequesters([
      { 
        id: '1',
        name: "John Mukisa", 
        phone: "+256781234567", 
        avgAmount: 45000, 
        frequency: 8,
        successRate: 95,
        trustScore: 88
      },
      { 
        id: '2',
        name: "Sarah Namuli", 
        phone: "+256782345678", 
        avgAmount: 30000, 
        frequency: 5,
        successRate: 87,
        trustScore: 82
      },
      { 
        id: '3',
        name: "Peter Ssali", 
        phone: "+256783456789", 
        avgAmount: 75000, 
        frequency: 3,
        successRate: 92,
        trustScore: 90
      }
    ]);
    
    // Initialize request history
    setRequestHistory([
      { 
        id: '1',
        amount: 50000, 
        from: "John Mukisa", 
        date: "2 hours ago",
        timestamp: new Date(), 
        status: "paid"
      },
      { 
        id: '2',
        amount: 25000, 
        from: "Sarah Namuli", 
        date: "1 day ago",
        timestamp: new Date(), 
        status: "pending"
      },
      { 
        id: '3',
        amount: 100000, 
        from: "David Kato", 
        date: "3 days ago",
        timestamp: new Date(), 
        status: "approved"
      }
    ]);
  }, []); // Removed setPendingApprovals call

  // Check if contact is approved for requests
  const isContactApproved = (phoneNumber: string) => {
    return smartPaymentService.isApprovedContact('current_user_id', phoneNumber);
  };

  const handleQuickRequest = (contact: typeof frequentRequesters[0]) => {
    setValue('phoneNumber', contact.phone);
    setValue('amount', contact.avgAmount);
    toast.success(`Quick request setup for ${contact.name}`);
  };

  const onSubmit = async (data: RequestMoneyForm) => {
    if (step === 1) {
      // Check if approval is needed
      if (!isContactApproved(data.phoneNumber)) {
        // Request approval for this contact
        toast('This contact needs approval for payment requests');
        setRequestData(data);
        return;
      }
      
      setRequestData(data);
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Payment request sent successfully!');
      setStep(3);
    } catch (error) {
      toast.error('Failed to send payment request');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const sharePaymentLink = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Payment Request',
        text: `Please pay ${formatAmount(requestData?.amount || 0)} using this link:`,
        url: requestLink,
      });
    } else {
      copyToClipboard(requestLink);
    }
  };

  const resetForm = () => {
    setStep(1);
    setRequestData(null);
  };

  if (step === 3) {
    return (
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
        <div className="p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center pt-20"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-10 h-10 text-green-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Sent!</h1>
            <p className="text-gray-600 mb-8">
              Your payment request has been sent to {requestData?.phoneNumber}
            </p>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Requested Amount</span>
                  <span className="font-semibold">{formatAmount(requestData?.amount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">From</span>
                  <span className="font-semibold">{requestData?.phoneNumber}</span>
                </div>
                {requestData?.message && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Message</span>
                    <span className="font-semibold">{requestData.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Link Sharing */}
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Payment Link</h3>
              <p className="text-sm text-gray-600 mb-3">
                Share this link for easy payment
              </p>
              
              <div className="flex items-center space-x-2 bg-white p-3 rounded-lg border">
                <span className="text-sm text-gray-600 flex-1 truncate">{requestLink}</span>
                <button
                  onClick={() => copyToClipboard(requestLink)}
                  className="p-2 text-momo-blue hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              
              <button
                onClick={sharePaymentLink}
                className="w-full mt-3 bg-white border border-gray-300 py-2 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Payment Link</span>
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={resetForm}
                className="w-full btn-primary"
              >
                Create Another Request
              </button>
              
              <Link
                to="/"
                className="block w-full text-center py-3 text-momo-blue font-semibold"
              >
                Back to Home
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-xl font-semibold text-gray-900">
            {step === 1 ? 'Request Money' : 'Confirm Request'}
          </h1>
        </div>
      </div>

      <div className="p-6">
        {step === 1 ? (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* Payer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Request From Phone Number
              </label>
              <input
                type="tel"
                {...register('phoneNumber', {
                  required: 'Phone number is required',
                  pattern: {
                    value: /^\+256[0-9]{9}$/,
                    message: 'Enter a valid Ugandan phone number (+256XXXXXXXXX)'
                  }
                })}
                placeholder="+256 781 234 567"
                className="input-field"
              />
              {errors.phoneNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.phoneNumber.message}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-2" />
                Amount (UGX)
              </label>
              <input
                type="number"
                {...register('amount', {
                  required: 'Amount is required',
                  min: {
                    value: 1000,
                    message: 'Minimum amount is UGX 1,000'
                  },
                  max: {
                    value: 2000000,
                    message: 'Maximum amount is UGX 2,000,000'
                  }
                })}
                placeholder="50,000"
                className="input-field"
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
              )}
              
              {/* AI Smart Suggestions */}
              <div className="mt-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Brain className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Smart Suggestions</span>
                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">AI Powered</span>
                </div>
                
                <div className="grid grid-cols-1 gap-2 mb-3">
                  {smartAmountSuggestions.map((suggestion, index) => (
                    <motion.button
                      key={index}
                      type="button"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setValue('amount', suggestion.amount)}
                      className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg hover:from-purple-100 hover:to-blue-100 transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{suggestion.icon}</span>
                          <div className="text-left">
                            <p className="font-semibold text-gray-900">{formatAmount(suggestion.amount)}</p>
                            <p className="text-sm text-gray-600">{suggestion.reason}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <Target className="w-3 h-3 text-green-500" />
                            <span className="text-xs text-green-600 font-medium">{suggestion.confidence}%</span>
                          </div>
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                            <Zap className="w-4 h-4 text-purple-600" />
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setValue('amount', amount)}
                      className="py-2 px-3 text-sm border border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                    >
                      {formatAmount(amount)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="w-4 h-4 inline mr-2" />
                Message (Optional)
              </label>
              <textarea
                {...register('message')}
                placeholder="What is this payment for?"
                rows={3}
                className="input-field resize-none"
              />
            </div>

            {/* Enhanced QR Code & Smart Features */}
            <div className="space-y-4">
              {/* QR Code Option */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Generate QR Code</h3>
                    <p className="text-sm text-gray-600">Let others scan to pay you directly</p>
                  </div>
                  <div className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                    Instant
                  </div>
                </div>
              </motion.div>

              {/* Smart Request Analytics */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Smart Analytics</h3>
                    <p className="text-sm text-gray-600">Your request patterns</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-gray-600">Success Rate</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">94%</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-600">Avg. Response</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">12m</p>
                  </div>
                </div>
              </motion.div>

              {/* Advanced Options Toggle */}
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Advanced Options</span>
                </div>
                <motion.div
                  animate={{ rotate: showAdvancedOptions ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  ↓
                </motion.div>
              </motion.button>

              {/* Advanced Options Panel */}
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ 
                  height: showAdvancedOptions ? 'auto' : 0,
                  opacity: showAdvancedOptions ? 1 : 0 
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-700">Auto-remind</span>
                    </div>
                    <div className="w-12 h-6 bg-blue-500 rounded-full relative">
                      <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-700">Payment protection</span>
                    </div>
                    <div className="w-12 h-6 bg-gray-300 rounded-full relative">
                      <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Summary */}
            {watchedAmount && (
              <div className="bg-green-50 p-4 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-2">Request Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount to Request</span>
                    <span className="font-semibold">{formatAmount(watchedAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processing Fee</span>
                    <span className="font-semibold text-green-600">UGX 0</span>
                  </div>
                </div>
              </div>
            )}

            {/* Smart Frequent Requesters Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Frequent Contacts</h2>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  AI Powered
                </span>
              </div>
              
              <div className="space-y-3">
                {frequentRequesters.map((contact, index) => (
                  <motion.div
                    key={contact.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg hover:shadow-md transition-all duration-300 cursor-pointer group"
                    onClick={() => handleQuickRequest(contact)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                        contact.trustScore > 85 ? 'bg-green-500' :
                        contact.trustScore > 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}>
                        {contact.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {contact.name}
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Success: {contact.successRate}%</span>
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-400" />
                            <span className="text-xs text-gray-500">{contact.trustScore}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-700">
                        ${contact.avgAmount}
                      </span>
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors"
                      >
                        <Send className="w-4 h-4 text-white" />
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Recent Request History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <HistoryIcon className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Recent Requests</h2>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View All
                </button>
              </div>
              
              <div className="space-y-3">
                {requestHistory.slice(0, 3).map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0 + index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        request.status === 'paid' ? 'bg-green-500' :
                        request.status === 'pending' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-900">${request.amount}</p>
                        <p className="text-xs text-gray-500">from {request.from}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{request.date}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        request.status === 'paid' ? 'bg-green-100 text-green-700' :
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Enhanced Continue Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center space-x-2">
                <Send className="w-5 h-5" />
                <span>{loading ? 'Processing...' : 'Continue with Smart Request'}</span>
                {!loading && <Award className="w-4 h-4 opacity-70" />}
              </div>
            </motion.button>
          </motion.form>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Confirm Payment Request</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600">Request From</label>
                  <p className="font-semibold">{requestData?.phoneNumber}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-600">Amount</label>
                  <p className="font-semibold text-2xl text-green-600">
                    {formatAmount(requestData?.amount || 0)}
                  </p>
                </div>
                
                {requestData?.message && (
                  <div>
                    <label className="text-sm text-gray-600">Message</label>
                    <p className="font-medium">{requestData.message}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={loading}
                className="w-full btn-primary"
              >
                {loading ? 'Sending Request...' : 'Send Payment Request'}
              </button>
              
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-3 text-gray-600 font-semibold hover:text-gray-800 transition-colors"
              >
                Back to Edit
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};