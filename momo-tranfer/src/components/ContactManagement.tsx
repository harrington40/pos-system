import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  User, 
  Shield, 
  Check, 
  Clock,
  Search,
  Star,
  MessageCircle
} from 'lucide-react';
import { smartPaymentService, type ApprovalRequest } from '../services/smartPaymentService';

interface ContactManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  isApproved: boolean;
  lastTransactionDate?: string;
  totalTransactions: number;
  nickname?: string;
}

export const ContactManagement = ({ isOpen, onClose }: ContactManagementProps) => {
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: '1',
      name: 'John Doe',
      phoneNumber: '+256781234567',
      isApproved: true,
      lastTransactionDate: '2024-01-15',
      totalTransactions: 15,
      nickname: 'Johnny'
    },
    {
      id: '2',
      name: 'Jane Smith',
      phoneNumber: '+256789876543',
      isApproved: false,
      totalTransactions: 3
    },
    {
      id: '3',
      name: 'Mike Johnson',
      phoneNumber: '+256777123456',
      isApproved: true,
      lastTransactionDate: '2024-01-20',
      totalTransactions: 8
    }
  ]);

  const [pendingRequests, setPendingRequests] = useState<ApprovalRequest[]>([
    {
      id: '1',
      requesterId: '+256781234567',
      approverId: 'current_user_id',
      type: 'payment_request_permission',
      status: 'pending',
      details: {
        description: 'Permission to send payment requests for lunch money'
      },
      timestamp: new Date()
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'contacts' | 'requests'>('contacts');

  const approveContact = (contactId: string) => {
    setContacts(prev => prev.map(contact => 
      contact.id === contactId 
        ? { ...contact, isApproved: true }
        : contact
    ));
    smartPaymentService.addApprovedContact('current_user_id', contactId);
  };

  const approveRequest = (requestId: string) => {
    setPendingRequests(prev => prev.filter(req => req.id !== requestId));
    smartPaymentService.approveRequest(requestId, true);
  };

  const denyRequest = (requestId: string) => {
    setPendingRequests(prev => prev.filter(req => req.id !== requestId));
    smartPaymentService.approveRequest(requestId, false);
  };

  const setNickname = (contactId: string, nickname: string) => {
    setContacts(prev => prev.map(contact => 
      contact.id === contactId 
        ? { ...contact, nickname }
        : contact
    ));
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phoneNumber.includes(searchTerm)
  );

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
          className="bg-white w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl flex flex-col"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Smart Contact Management</h2>
                <p className="text-blue-100 text-sm">Manage payment permissions and contacts</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 mt-4 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('contacts')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'contacts' ? 'bg-white text-blue-600' : 'text-blue-100 hover:text-white'
                }`}
              >
                Contacts ({contacts.length})
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors relative ${
                  activeTab === 'requests' ? 'bg-white text-blue-600' : 'text-blue-100 hover:text-white'
                }`}
              >
                Requests ({pendingRequests.length})
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'contacts' ? (
              <>
                {/* Search */}
                <div className="p-4 border-b border-gray-200">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search contacts..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Contacts List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {filteredContacts.map((contact) => (
                    <motion.div
                      key={contact.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-50 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {contact.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                              {contact.isApproved && (
                                <Shield className="w-4 h-4 text-green-500" />
                              )}
                              {contact.totalTransactions >= 10 && (
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{contact.phoneNumber}</p>
                            {contact.nickname && (
                              <p className="text-xs text-blue-600">"{contact.nickname}"</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {!contact.isApproved && (
                            <button
                              onClick={() => approveContact(contact.id)}
                              className="px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const nickname = prompt('Enter nickname:', contact.nickname || '');
                              if (nickname !== null) {
                                setNickname(contact.id, nickname);
                              }
                            }}
                            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            <User className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                        <span>{contact.totalTransactions} transactions</span>
                        {contact.lastTransactionDate && (
                          <span>Last: {new Date(contact.lastTransactionDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              /* Approval Requests */
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Requests</h3>
                    <p className="text-gray-600">All payment requests have been handled</p>
                  </div>
                ) : (
                  pendingRequests.map((request) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                            <Clock className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Payment Permission Request</h3>
                            <p className="text-sm text-gray-600">From: {request.requesterId}</p>
                            <p className="text-sm text-gray-700 mt-1">{request.details.description}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(request.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex space-x-3">
                        <button
                          onClick={() => approveRequest(request.id)}
                          className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => denyRequest(request.id)}
                          className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Deny
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};