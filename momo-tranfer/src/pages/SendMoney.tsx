import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Phone, 
  DollarSign, 
  MessageSquare,
  User,
  Send,
  Loader2,
  Lightbulb,
  Users,
  MessageCircle,
  Star,
  Clock,
  Brain,
  Target,
  Award,
  TrendingUp,
  History as HistoryIcon,
  Shield,
  Bell,
  Sparkles,
  Calculator,
  UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import momoApi from '../services/momoApi';
import { smartPaymentService, type SmartRecommendation } from '../services/smartPaymentService';
import { ChatInterface } from '../components/ChatInterface';
import type { TransferRequest } from '../types';

interface SendMoneyForm {
  phoneNumber: string;
  amount: number;
  message: string;
  recipientName?: string;
}

export const SendMoney = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [transferData, setTransferData] = useState<SendMoneyForm | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [smartRecommendations, setSmartRecommendations] = useState<SmartRecommendation[]>([]);
  const [frequentContacts, setFrequentContacts] = useState<Array<{
    id: string;
    name: string;
    phone: string;
    lastAmount: number;
    frequency: number;
    trustScore: number;
    relationshipType: string;
  }>>([]);
  const [showSplitBill, setShowSplitBill] = useState(false);
  const [splitParticipants, setSplitParticipants] = useState<string[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<Array<{
    amount: number;
    reason: string;
    confidence: number;
    icon: string;
    category: string;
  }>>([]);
  const [recentTransactions, setRecentTransactions] = useState<Array<{
    id: string;
    amount: number;
    recipient: string;
    date: string;
    status: 'completed' | 'pending' | 'failed';
    category: string;
  }>>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [aiInsights, setAiInsights] = useState<{
    spendingPattern: string;
    recommendation: string;
    riskLevel: 'low' | 'medium' | 'high';
    confidenceScore: number;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<SendMoneyForm>();

  const watchedAmount = watch('amount');
  const watchedPhone = watch('phoneNumber');

  const quickAmounts = [10000, 25000, 50000, 100000, 200000, 500000];

  // Load smart recommendations when component mounts
  useEffect(() => {
    const currentUserId = 'current_user_id'; // In real app, get from auth context
    const recommendations = smartPaymentService.analyzeTransactionPatterns(currentUserId);
    setSmartRecommendations(recommendations);
    
    // Enhanced frequent contacts with AI data
    setFrequentContacts([
      { 
        id: '1',
        name: 'John Doe', 
        phone: '+256781234567', 
        lastAmount: 25000,
        frequency: 15,
        trustScore: 95,
        relationshipType: 'Family'
      },
      { 
        id: '2',
        name: 'Jane Smith', 
        phone: '+256789876543', 
        lastAmount: 50000,
        frequency: 8,
        trustScore: 88,
        relationshipType: 'Friend'
      },
      { 
        id: '3',
        name: 'Mike Johnson', 
        phone: '+256777123456', 
        lastAmount: 15000,
        frequency: 12,
        trustScore: 92,
        relationshipType: 'Colleague'
      }
    ]);

    // Initialize smart suggestions
    setSmartSuggestions([
      { amount: 25000, reason: "Your usual lunch budget", confidence: 94, icon: "🍽️", category: "Food" },
      { amount: 50000, reason: "Weekend activity pattern", confidence: 87, icon: "🎉", category: "Entertainment" },
      { amount: 10000, reason: "Transport allowance", confidence: 92, icon: "🚗", category: "Transport" },
      { amount: 75000, reason: "Bill splitting tendency", confidence: 83, icon: "📊", category: "Bills" }
    ]);

    // Initialize recent transactions
    setRecentTransactions([
      { 
        id: '1',
        amount: 25000, 
        recipient: "John Doe", 
        date: "2 hours ago",
        status: "completed",
        category: "Food"
      },
      { 
        id: '2',
        amount: 50000, 
        recipient: "Jane Smith", 
        date: "1 day ago",
        status: "completed",
        category: "Entertainment"
      },
      { 
        id: '3',
        amount: 15000, 
        recipient: "Mike Johnson", 
        date: "2 days ago",
        status: "pending",
        category: "Transport"
      }
    ]);

    // Initialize AI insights
    setAiInsights({
      spendingPattern: "Moderate spender with consistent patterns",
      recommendation: "Consider setting up auto-payments for recurring transfers",
      riskLevel: "low",
      confidenceScore: 89
    });
  }, []);

  // Smart amount suggestions based on recipient
  useEffect(() => {
    if (watchedPhone) {
      // In a real app, this would update suggestions based on the recipient
      // For now, we use the static suggestions loaded in the main useEffect
      console.log('Phone number changed:', watchedPhone);
    }
  }, [watchedPhone]);

  const onSubmit = async (data: SendMoneyForm) => {
    if (step === 1) {
      setTransferData(data);
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      const transferRequest: TransferRequest = {
        amount: data.amount,
        currency: 'UGX',
        payeePartyId: data.phoneNumber,
        payeePartyIdType: 'PHONE_NUMBER',
        payerMessage: data.message,
        payeeNote: `Payment from MoMo Transfer App`
      };

      const response = await momoApi.mockSendMoney(transferRequest);
      
      if (response.success) {
        toast.success('Money sent successfully!');
        setStep(3);
      } else {
        toast.error(response.error || 'Transfer failed');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
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

  const resetForm = () => {
    setStep(1);
    setTransferData(null);
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
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Send className="w-10 h-10 text-green-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Transfer Successful!</h1>
            <p className="text-gray-600 mb-8">
              Your money has been sent successfully to {transferData?.phoneNumber}
            </p>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Sent</span>
                  <span className="font-semibold">{formatAmount(transferData?.amount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">To</span>
                  <span className="font-semibold">{transferData?.phoneNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fee</span>
                  <span className="font-semibold text-green-600">UGX 0</span>
                </div>
                <hr />
                <div className="flex justify-between">
                  <span className="text-gray-600">Total</span>
                  <span className="font-bold text-lg">{formatAmount(transferData?.amount || 0)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={resetForm}
                className="w-full btn-primary"
              >
                Send Another Transfer
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
            {step === 1 ? 'Send Money' : 'Confirm Transfer'}
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
            {/* Smart Recommendations */}
            {smartRecommendations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200"
              >
                <div className="flex items-center space-x-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Smart Suggestions</h3>
                </div>
                <div className="space-y-2">
                  {smartRecommendations.slice(0, 2).map((rec, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        if (rec.recipient && rec.amount) {
                          setValue('phoneNumber', rec.recipient);
                          setValue('amount', rec.amount);
                        }
                      }}
                      className="w-full text-left p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{rec.suggestion}</p>
                          <p className="text-sm text-gray-600">
                            {rec.amount && `UGX ${rec.amount.toLocaleString()}`}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm text-gray-500">
                            {Math.round(rec.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Frequent Contacts */}
            {frequentContacts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl p-4 border border-gray-200"
              >
                <div className="flex items-center space-x-2 mb-3">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Recent Contacts</h3>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {frequentContacts.slice(0, 3).map((contact, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setValue('phoneNumber', contact.phone);
                        setValue('recipientName', contact.name);
                        setValue('amount', contact.lastAmount);
                      }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {contact.name.charAt(0)}
                          </span>
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{contact.name}</p>
                          <p className="text-sm text-gray-600">{contact.phone}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          UGX {contact.lastAmount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">Last sent</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Split Bill Option */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-amber-50 rounded-xl p-4 border border-amber-200"
            >
              <button
                type="button"
                onClick={() => setShowSplitBill(!showSplitBill)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-900">Split Bill</span>
                </div>
                <span className="text-yellow-700">
                  {showSplitBill ? '−' : '+'}
                </span>
              </button>
              
              {showSplitBill && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 space-y-3"
                >
                  <p className="text-sm text-yellow-700">
                    Split the bill among multiple people
                  </p>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Add participant phone"
                      className="flex-1 px-3 py-2 border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          setSplitParticipants([...splitParticipants, e.currentTarget.value]);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {splitParticipants.length > 0 && (
                    <div className="space-y-1">
                      {splitParticipants.map((participant, index) => (
                        <div key={index} className="flex items-center justify-between bg-white rounded-lg p-2">
                          <span className="text-sm">{participant}</span>
                          <button
                            type="button"
                            onClick={() => setSplitParticipants(splitParticipants.filter((_, i) => i !== index))}
                            className="text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>

            {/* Recipient */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Recipient Phone Number
              </label>
              <div className="relative">
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
                  className="input-field pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowChat(true)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
              {errors.phoneNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.phoneNumber.message}</p>
              )}
            </div>

            {/* Recipient Name (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Recipient Name (Optional)
              </label>
              <input
                type="text"
                {...register('recipientName')}
                placeholder="John Doe"
                className="input-field"
              />
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
                  <span className="text-sm font-medium text-gray-700">AI Smart Suggestions</span>
                  <span className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                    Powered by ML
                  </span>
                </div>
                
                <div className="grid grid-cols-1 gap-2 mb-3">
                  {smartSuggestions.map((suggestion, index) => (
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
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                {suggestion.category}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <Target className="w-3 h-3 text-green-500" />
                            <span className="text-xs text-green-600 font-medium">{suggestion.confidence}%</span>
                          </div>
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Enhanced Quick Amount Buttons */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Quick Amounts</span>
                  </div>
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
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="w-4 h-4 inline mr-2" />
                Message (Optional)
              </label>
              <textarea
                {...register('message')}
                placeholder="Enter a message for the recipient"
                rows={3}
                className="input-field resize-none"
              />
            </div>

            {/* Summary */}
            {watchedAmount && (
              <div className="bg-blue-50 p-4 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-2">Transfer Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount</span>
                    <span className="font-semibold">{formatAmount(watchedAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transfer Fee</span>
                    <span className="font-semibold text-green-600">UGX 0</span>
                  </div>
                  <hr />
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total</span>
                    <span className="font-bold">{formatAmount(watchedAmount)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* AI Insights Panel */}
            {aiInsights && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">AI Insights</h3>
                    <p className="text-sm text-gray-600">Smart spending analysis</p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    aiInsights.riskLevel === 'low' ? 'bg-green-100 text-green-700' :
                    aiInsights.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-red-100 text-red-700'
                  }`}>
                    {aiInsights.riskLevel} risk
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-white p-3 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-700">Spending Pattern</span>
                    </div>
                    <p className="text-sm text-gray-600">{aiInsights.spendingPattern}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium text-gray-700">Recommendation</span>
                    </div>
                    <p className="text-sm text-gray-600">{aiInsights.recommendation}</p>
                    <div className="flex items-center space-x-1 mt-1">
                      <span className="text-xs text-gray-500">Confidence:</span>
                      <div className="flex items-center space-x-1">
                        <Star className="w-3 h-3 text-yellow-400" />
                        <span className="text-xs text-gray-500">{aiInsights.confidenceScore}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Recent Transactions Analytics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <HistoryIcon className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Recent Activity</h3>
                </div>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  Last 7 days
                </span>
              </div>
              
              <div className="space-y-2">
                {recentTransactions.slice(0, 3).map((transaction, index) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        transaction.status === 'completed' ? 'bg-emerald-500' :
                        transaction.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-900">{formatAmount(transaction.amount)}</p>
                        <p className="text-xs text-gray-500">to {transaction.recipient}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{transaction.date}</p>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {transaction.category}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Advanced Security Options */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gray-50 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Security Options</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showAdvancedOptions ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showAdvancedOptions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-700">Transaction notifications</span>
                    </div>
                    <div className="w-12 h-6 bg-teal-500 rounded-full relative">
                      <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-700">Recipient verification</span>
                    </div>
                    <div className="w-12 h-6 bg-gray-300 rounded-full relative">
                      <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5"></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Enhanced Send Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center space-x-2">
                <Send className="w-5 h-5" />
                <span>{loading ? 'Processing...' : 'Continue with Smart Transfer'}</span>
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
              <h3 className="font-semibold text-gray-900 mb-4">Confirm Transfer Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600">Recipient</label>
                  <p className="font-semibold">{transferData?.phoneNumber}</p>
                  {transferData?.recipientName && (
                    <p className="text-sm text-gray-600">{transferData.recipientName}</p>
                  )}
                </div>
                
                <div>
                  <label className="text-sm text-gray-600">Amount</label>
                  <p className="font-semibold text-2xl text-momo-blue">
                    {formatAmount(transferData?.amount || 0)}
                  </p>
                </div>
                
                {transferData?.message && (
                  <div>
                    <label className="text-sm text-gray-600">Message</label>
                    <p className="font-medium">{transferData.message}</p>
                  </div>
                )}
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Transfer Fee</span>
                    <span className="text-green-600 font-semibold">UGX 0</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send Money</span>
                  </>
                )}
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

      {/* Chat Interface */}
      {showChat && transferData && (
        <ChatInterface
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          recipientId={transferData.phoneNumber}
          recipientName={transferData.recipientName || 'Unknown'}
          currentUserId="current_user_id"
          onSendPayment={(amount) => {
            setValue('amount', amount);
            setShowChat(false);
            handleSubmit(onSubmit)();
          }}
        />
      )}
    </div>
  );
};