import { useState, useMemo } from 'react';
import {
  MessageSquare, Mail, Send, Search, Inbox, Star,
  Archive, Trash2, MoreVertical,
  Phone, User, AlertCircle,
  ArrowDownToLine, RefreshCw, Zap, Target
} from 'lucide-react';

interface Message {
  id: string;
  type: 'email' | 'sms';
  from: string;
  fromName: string;
  fromAvatar: string;
  subject?: string;
  body: string;
  timestamp: Date;
  read: boolean;
  starred: boolean;
  category: 'support' | 'sales' | 'general' | 'urgent';
  attachments?: number;
  status: 'delivered' | 'read' | 'replied' | 'pending';
  capturedContact?: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
  };
  sentiment: 'positive' | 'neutral' | 'negative';
  priority: 'high' | 'medium' | 'low';
  tags: string[];
}

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'email' | 'sms'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showStarred, setShowStarred] = useState(false);

  // Sample messages with captured contact data
  const messages: Message[] = [
    {
      id: '1',
      type: 'email',
      from: 'support@techcorp.com',
      fromName: 'TechCorp Support',
      fromAvatar: 'https://ui-avatars.com/api/?name=TechCorp+Support&background=3b82f6&color=fff',
      subject: 'Product Integration Question',
      body: 'Hi, I need help integrating your API with our system. Can we schedule a call? My direct number is +1 (555) 123-4567. Thanks, John Smith - Senior Developer at TechCorp',
      timestamp: new Date('2026-02-05T10:30:00'),
      read: false,
      starred: true,
      category: 'support',
      status: 'pending',
      capturedContact: {
        name: 'John Smith',
        email: 'support@techcorp.com',
        phone: '+1 (555) 123-4567',
        company: 'TechCorp'
      },
      sentiment: 'neutral',
      priority: 'high',
      tags: ['API', 'Integration', 'New Contact']
    },
    {
      id: '2',
      type: 'sms',
      from: '+1 (555) 234-5678',
      fromName: 'Unknown',
      fromAvatar: 'https://ui-avatars.com/api/?name=Unknown&background=8b5cf6&color=fff',
      body: 'Hi, this is Sarah from Innovate Solutions. I saw your demo and we\'re interested in a partnership. Please call me back at this number.',
      timestamp: new Date('2026-02-05T09:15:00'),
      read: false,
      starred: false,
      category: 'sales',
      status: 'delivered',
      capturedContact: {
        name: 'Sarah',
        phone: '+1 (555) 234-5678',
        company: 'Innovate Solutions'
      },
      sentiment: 'positive',
      priority: 'high',
      tags: ['Sales', 'Partnership', 'New Contact']
    },
    {
      id: '3',
      type: 'email',
      from: 'info@enterprise.com',
      fromName: 'Enterprise Corp',
      fromAvatar: 'https://ui-avatars.com/api/?name=Enterprise+Corp&background=10b981&color=fff',
      subject: 'Request for Proposal',
      body: 'We are looking for a communication solution for our 500+ employee organization. Please send your latest pricing and feature details. Contact: Lisa Martinez, VP Technology, lisa.m@enterprise.com, Office: +1 (555) 345-6789',
      timestamp: new Date('2026-02-05T08:45:00'),
      read: true,
      starred: true,
      category: 'sales',
      attachments: 2,
      status: 'replied',
      capturedContact: {
        name: 'Lisa Martinez',
        email: 'lisa.m@enterprise.com',
        phone: '+1 (555) 345-6789',
        company: 'Enterprise Corp'
      },
      sentiment: 'positive',
      priority: 'high',
      tags: ['RFP', 'Enterprise', 'Contact Saved']
    },
    {
      id: '4',
      type: 'sms',
      from: '+44 20 7123 4567',
      fromName: 'Unknown',
      fromAvatar: 'https://ui-avatars.com/api/?name=UK&background=ec4899&color=fff',
      body: 'Your service has been excellent! Just wanted to say thank you. - David from London Office',
      timestamp: new Date('2026-02-04T16:20:00'),
      read: true,
      starred: false,
      category: 'general',
      status: 'read',
      capturedContact: {
        name: 'David',
        phone: '+44 20 7123 4567'
      },
      sentiment: 'positive',
      priority: 'low',
      tags: ['Feedback', 'Positive']
    },
    {
      id: '5',
      type: 'email',
      from: 'urgent@client.com',
      fromName: 'Urgent Client',
      fromAvatar: 'https://ui-avatars.com/api/?name=Urgent+Client&background=ef4444&color=fff',
      subject: 'URGENT: System Down',
      body: 'Our phone system is not working. We need immediate assistance! Contact: Michael Brown, IT Manager, m.brown@client.com, Mobile: +1 (555) 456-7890',
      timestamp: new Date('2026-02-05T11:00:00'),
      read: false,
      starred: true,
      category: 'urgent',
      status: 'pending',
      capturedContact: {
        name: 'Michael Brown',
        email: 'm.brown@client.com',
        phone: '+1 (555) 456-7890'
      },
      sentiment: 'negative',
      priority: 'high',
      tags: ['Urgent', 'Technical', 'New Contact']
    },
    {
      id: '6',
      type: 'email',
      from: 'marketing@company.com',
      fromName: 'Marketing Team',
      fromAvatar: 'https://ui-avatars.com/api/?name=Marketing+Team&background=f59e0b&color=fff',
      subject: 'Monthly Newsletter Subscription',
      body: 'Thanks for subscribing to our newsletter. We\'ll keep you updated on the latest features and updates.',
      timestamp: new Date('2026-02-04T14:30:00'),
      read: true,
      starred: false,
      category: 'general',
      status: 'read',
      sentiment: 'neutral',
      priority: 'low',
      tags: ['Newsletter']
    }
  ];

  // Filter messages
  const filteredMessages = useMemo(() => {
    return messages.filter(message => {
      const matchesTab = activeTab === 'all' || message.type === activeTab;
      const matchesSearch = 
        message.fromName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        message.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
        message.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        message.from.includes(searchQuery);
      const matchesCategory = filterCategory === 'all' || message.category === filterCategory;
      const matchesStarred = !showStarred || message.starred;

      return matchesTab && matchesSearch && matchesCategory && matchesStarred;
    });
  }, [activeTab, searchQuery, filterCategory, showStarred, messages]);

  // Calculate stats
  const stats = {
    total: messages.length,
    unread: messages.filter(m => !m.read).length,
    emails: messages.filter(m => m.type === 'email').length,
    sms: messages.filter(m => m.type === 'sms').length,
    captured: messages.filter(m => m.capturedContact).length,
    urgent: messages.filter(m => m.category === 'urgent').length
  };

  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="text-red-500" size={16} />;
      case 'medium': return <Target className="text-yellow-500" size={16} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <MessageSquare className="text-purple-500" size={40} />
              Messages
            </h1>
            <p className="text-gray-400">SMS & Email integration with smart contact capture</p>
          </div>
          <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-purple-500/50 flex items-center gap-2">
            <Send size={20} />
            Compose
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/10 backdrop-blur-lg border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-xs font-medium">Total</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Inbox className="text-blue-500" size={24} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-600/20 to-red-500/10 backdrop-blur-lg border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-400 text-xs font-medium">Unread</p>
                <p className="text-2xl font-bold text-white">{stats.unread}</p>
              </div>
              <AlertCircle className="text-red-500" size={24} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-500/10 backdrop-blur-lg border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-400 text-xs font-medium">Emails</p>
                <p className="text-2xl font-bold text-white">{stats.emails}</p>
              </div>
              <Mail className="text-purple-500" size={24} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-600/20 to-green-500/10 backdrop-blur-lg border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 text-xs font-medium">SMS</p>
                <p className="text-2xl font-bold text-white">{stats.sms}</p>
              </div>
              <MessageSquare className="text-green-500" size={24} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-500/10 backdrop-blur-lg border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400 text-xs font-medium">Captured</p>
                <p className="text-2xl font-bold text-white">{stats.captured}</p>
              </div>
              <ArrowDownToLine className="text-yellow-500" size={24} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-600/20 to-orange-500/10 backdrop-blur-lg border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-400 text-xs font-medium">Urgent</p>
                <p className="text-2xl font-bold text-white">{stats.urgent}</p>
              </div>
              <Zap className="text-orange-500" size={24} />
            </div>
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="flex flex-wrap gap-4 items-center mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-800/50 text-gray-400 hover:text-white'
              }`}
            >
              All Messages
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeTab === 'email'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-gray-800/50 text-gray-400 hover:text-white'
              }`}
            >
              <Mail size={16} />
              Email ({stats.emails})
            </button>
            <button
              onClick={() => setActiveTab('sms')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeTab === 'sms'
                  ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg'
                  : 'bg-gray-800/50 text-gray-400 hover:text-white'
              }`}
            >
              <MessageSquare size={16} />
              SMS ({stats.sms})
            </button>
          </div>

          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">📁 All Categories</option>
            <option value="support">🛠️ Support</option>
            <option value="sales">💼 Sales</option>
            <option value="urgent">🚨 Urgent</option>
            <option value="general">📋 General</option>
          </select>

          <button
            onClick={() => setShowStarred(!showStarred)}
            className={`px-4 py-3 backdrop-blur-lg border rounded-lg transition-all flex items-center gap-2 ${
              showStarred
                ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400'
                : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <Star size={20} fill={showStarred ? 'currentColor' : 'none'} />
          </button>

          <button className="px-4 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-purple-500 transition-all">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message List */}
        <div className="lg:col-span-1 space-y-3 max-h-[800px] overflow-y-auto custom-scrollbar">
          {filteredMessages.map((message) => (
            <div
              key={message.id}
              onClick={() => setSelectedMessage(message)}
              className={`relative group bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                selectedMessage?.id === message.id
                  ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                  : 'border-gray-700 hover:border-purple-500/50'
              } ${!message.read ? 'font-semibold' : ''}`}
            >
              {/* Unread Indicator */}
              {!message.read && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-purple-500 rounded-r"></div>
              )}

              <div className="flex items-start gap-3">
                <div className="relative">
                  <img
                    src={message.fromAvatar}
                    alt={message.fromName}
                    className="w-12 h-12 rounded-full ring-2 ring-purple-500/50"
                  />
                  {message.type === 'email' ? (
                    <Mail className="absolute -bottom-1 -right-1 text-purple-500 bg-gray-900 rounded-full p-1" size={20} />
                  ) : (
                    <MessageSquare className="absolute -bottom-1 -right-1 text-green-500 bg-gray-900 rounded-full p-1" size={20} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`text-white truncate ${!message.read ? 'font-bold' : ''}`}>
                      {message.fromName}
                    </h3>
                    <div className="flex items-center gap-1">
                      {getPriorityIcon(message.priority)}
                      {message.starred && <Star className="text-yellow-500 fill-yellow-500" size={14} />}
                    </div>
                  </div>

                  {message.subject && (
                    <p className={`text-sm mb-1 truncate ${!message.read ? 'text-white' : 'text-gray-300'}`}>
                      {message.subject}
                    </p>
                  )}

                  <p className="text-sm text-gray-400 line-clamp-2 mb-2">{message.body}</p>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{formatTime(message.timestamp)}</span>
                    <div className="flex items-center gap-2">
                      {message.capturedContact && (
                        <span className="px-2 py-1 bg-green-600/20 border border-green-500/30 text-green-400 rounded-full text-xs flex items-center gap-1">
                          <User size={10} />
                          Captured
                        </span>
                      )}
                      <span className={`px-2 py-1 bg-gray-700/50 rounded-full ${getSentimentColor(message.sentiment)}`}>
                        {message.sentiment}
                      </span>
                    </div>
                  </div>

                  {message.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {message.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredMessages.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto text-gray-600 mb-4" size={48} />
              <p className="text-gray-400">No messages found</p>
            </div>
          )}
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-xl p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-4">
                  <img
                    src={selectedMessage.fromAvatar}
                    alt={selectedMessage.fromName}
                    className="w-16 h-16 rounded-full ring-2 ring-purple-500/50"
                  />
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{selectedMessage.fromName}</h2>
                    <p className="text-gray-400 text-sm mb-2">{selectedMessage.from}</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        selectedMessage.type === 'email'
                          ? 'bg-purple-600/20 border border-purple-500/30 text-purple-400'
                          : 'bg-green-600/20 border border-green-500/30 text-green-400'
                      }`}>
                        {selectedMessage.type.toUpperCase()}
                      </span>
                      <span className="text-gray-500 text-sm">{formatTime(selectedMessage.timestamp)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-700 rounded-lg transition-all">
                    <Star className={selectedMessage.starred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'} size={20} />
                  </button>
                  <button className="p-2 hover:bg-gray-700 rounded-lg transition-all">
                    <Archive className="text-gray-400" size={20} />
                  </button>
                  <button className="p-2 hover:bg-gray-700 rounded-lg transition-all">
                    <Trash2 className="text-gray-400" size={20} />
                  </button>
                  <button className="p-2 hover:bg-gray-700 rounded-lg transition-all">
                    <MoreVertical className="text-gray-400" size={20} />
                  </button>
                </div>
              </div>

              {/* Subject */}
              {selectedMessage.subject && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-white">{selectedMessage.subject}</h3>
                </div>
              )}

              {/* Body */}
              <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
                <p className="text-gray-300 whitespace-pre-wrap">{selectedMessage.body}</p>
              </div>

              {/* Captured Contact Info */}
              {selectedMessage.capturedContact && (
                <div className="mb-6 p-4 bg-gradient-to-r from-green-600/10 to-blue-600/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="text-green-500" size={20} />
                    <h4 className="text-white font-semibold">Contact Automatically Captured</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Name</p>
                      <p className="text-white font-medium">{selectedMessage.capturedContact.name}</p>
                    </div>
                    {selectedMessage.capturedContact.email && (
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Email</p>
                        <p className="text-white font-medium">{selectedMessage.capturedContact.email}</p>
                      </div>
                    )}
                    {selectedMessage.capturedContact.phone && (
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Phone</p>
                        <p className="text-white font-medium">{selectedMessage.capturedContact.phone}</p>
                      </div>
                    )}
                    {selectedMessage.capturedContact.company && (
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Company</p>
                        <p className="text-white font-medium">{selectedMessage.capturedContact.company}</p>
                      </div>
                    )}
                  </div>
                  <button className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all flex items-center gap-2">
                    <User size={16} />
                    Add to Address Book
                  </button>
                </div>
              )}

              {/* Tags and Meta */}
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedMessage.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all shadow-lg flex items-center justify-center gap-2">
                  <Send size={20} />
                  Reply
                </button>
                {selectedMessage.capturedContact?.phone && (
                  <button className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center gap-2">
                    <Phone size={20} />
                    Call
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-xl p-12 text-center">
              <MessageSquare className="mx-auto text-gray-600 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-white mb-2">Select a message</h3>
              <p className="text-gray-400">Choose a message from the list to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
