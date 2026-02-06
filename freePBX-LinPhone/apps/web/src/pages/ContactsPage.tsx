import { useState, useMemo } from 'react';
import {
  Users, UserPlus, Search, Mail, Phone, MapPin, Building2,
  Star, MoreVertical, Download,
  Upload, LayoutGrid, List, MessageSquare,
  Clock, TrendingUp, CheckCircle
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  countryCode: string;
  avatar: string;
  company?: string;
  position?: string;
  location?: string;
  tags: string[];
  favorite: boolean;
  lastContact?: Date;
  callCount: number;
  emailCount: number;
  smsCount: number;
  notes?: string;
  source: 'manual' | 'email' | 'sms' | 'call';
}

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [showFavorites, setShowFavorites] = useState(false);

  // Sample contacts with comprehensive data
  const contacts: Contact[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@techcorp.com',
      phone: '+1 (555) 123-4567',
      country: 'United States',
      countryCode: '🇺🇸',
      avatar: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=6366f1&color=fff',
      company: 'TechCorp Industries',
      position: 'VP of Sales',
      location: 'New York, NY',
      tags: ['VIP', 'Sales', 'Partner'],
      favorite: true,
      lastContact: new Date('2026-02-05T10:30:00'),
      callCount: 45,
      emailCount: 127,
      smsCount: 23,
      notes: 'Key decision maker for enterprise accounts',
      source: 'email'
    },
    {
      id: '2',
      name: 'Michael Chen',
      email: 'm.chen@innovate.io',
      phone: '+1 (555) 234-5678',
      country: 'United States',
      countryCode: '🇺🇸',
      avatar: 'https://ui-avatars.com/api/?name=Michael+Chen&background=8b5cf6&color=fff',
      company: 'Innovate Solutions',
      position: 'CTO',
      location: 'San Francisco, CA',
      tags: ['Technical', 'Partner'],
      favorite: true,
      lastContact: new Date('2026-02-04T15:20:00'),
      callCount: 32,
      emailCount: 89,
      smsCount: 12,
      notes: 'Technical integration contact',
      source: 'call'
    },
    {
      id: '3',
      name: 'Emma Williams',
      email: 'emma.w@support.example.com',
      phone: '+44 20 7123 4567',
      country: 'United Kingdom',
      countryCode: '🇬🇧',
      avatar: 'https://ui-avatars.com/api/?name=Emma+Williams&background=ec4899&color=fff',
      company: 'Support Services Ltd',
      position: 'Support Manager',
      location: 'London, UK',
      tags: ['Support', 'Active'],
      favorite: false,
      lastContact: new Date('2026-02-05T09:15:00'),
      callCount: 18,
      emailCount: 234,
      smsCount: 56,
      notes: 'Primary support escalation contact',
      source: 'email'
    },
    {
      id: '4',
      name: 'David Kumar',
      email: 'd.kumar@global.in',
      phone: '+91 98765 43210',
      country: 'India',
      countryCode: '🇮🇳',
      avatar: 'https://ui-avatars.com/api/?name=David+Kumar&background=10b981&color=fff',
      company: 'Global Tech India',
      position: 'Regional Director',
      location: 'Mumbai, India',
      tags: ['International', 'Partner'],
      favorite: false,
      lastContact: new Date('2026-02-03T12:00:00'),
      callCount: 27,
      emailCount: 156,
      smsCount: 8,
      source: 'sms'
    },
    {
      id: '5',
      name: 'Lisa Martinez',
      email: 'lisa.m@enterprise.com',
      phone: '+1 (555) 345-6789',
      country: 'United States',
      countryCode: '🇺🇸',
      avatar: 'https://ui-avatars.com/api/?name=Lisa+Martinez&background=f59e0b&color=fff',
      company: 'Enterprise Corp',
      position: 'Account Executive',
      location: 'Chicago, IL',
      tags: ['Sales', 'Active'],
      favorite: true,
      lastContact: new Date('2026-02-05T11:45:00'),
      callCount: 53,
      emailCount: 298,
      smsCount: 42,
      notes: 'Handles all Midwest accounts',
      source: 'email'
    },
    {
      id: '6',
      name: 'James Thompson',
      email: 'j.thompson@consulting.com',
      phone: '+1 (555) 456-7890',
      country: 'United States',
      countryCode: '🇺🇸',
      avatar: 'https://ui-avatars.com/api/?name=James+Thompson&background=ef4444&color=fff',
      company: 'Thompson Consulting',
      position: 'Senior Consultant',
      location: 'Boston, MA',
      tags: ['Consultant', 'VIP'],
      favorite: false,
      callCount: 21,
      emailCount: 67,
      smsCount: 15,
      source: 'call'
    }
  ];

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    contacts.forEach(contact => contact.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, [contacts]);

  // Filter and search contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const matchesSearch = 
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone.includes(searchQuery) ||
        contact.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.location?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTag = filterTag === 'all' || contact.tags.includes(filterTag);
      const matchesFavorite = !showFavorites || contact.favorite;

      return matchesSearch && matchesTag && matchesFavorite;
    });
  }, [searchQuery, filterTag, showFavorites, contacts]);

  // Calculate stats
  const stats = {
    total: contacts.length,
    favorites: contacts.filter(c => c.favorite).length,
    recentlyAdded: contacts.filter(c => c.source !== 'manual').length,
    active: contacts.filter(c => c.lastContact && 
      (Date.now() - c.lastContact.getTime()) < 7 * 24 * 60 * 60 * 1000).length
  };

  const formatLastContact = (date?: Date) => {
    if (!date) return 'Never';
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Users className="text-blue-500" size={40} />
              Address Book
            </h1>
            <p className="text-gray-400">Manage your contacts with SMS and email integration</p>
          </div>
          <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-blue-500/50 flex items-center gap-2">
            <UserPlus size={20} />
            Add Contact
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/10 backdrop-blur-lg border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-sm font-medium">Total Contacts</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
              </div>
              <Users className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-500/10 backdrop-blur-lg border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400 text-sm font-medium">Favorites</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.favorites}</p>
              </div>
              <Star className="text-yellow-500" size={32} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-600/20 to-green-500/10 backdrop-blur-lg border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 text-sm font-medium">Active (7 days)</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.active}</p>
              </div>
              <TrendingUp className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-500/10 backdrop-blur-lg border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-400 text-sm font-medium">Auto-Captured</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.recentlyAdded}</p>
              </div>
              <CheckCircle className="text-purple-500" size={32} />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, email, phone, company, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="px-4 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">🏷️ All Tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>

          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className={`px-4 py-3 backdrop-blur-lg border rounded-lg transition-all flex items-center gap-2 ${
              showFavorites 
                ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400' 
                : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:text-white hover:border-blue-500'
            }`}
          >
            <Star size={20} fill={showFavorites ? 'currentColor' : 'none'} />
            Favorites
          </button>

          <div className="flex gap-2">
            <button className="px-4 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-blue-500 transition-all">
              <Upload size={20} />
            </button>
            <button className="px-4 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-blue-500 transition-all">
              <Download size={20} />
            </button>
          </div>

          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="px-4 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-blue-500 transition-all"
          >
            {viewMode === 'grid' ? <List size={20} /> : <LayoutGrid size={20} />}
          </button>
        </div>
      </div>

      {/* Contacts Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="group relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-2xl p-6 hover:border-blue-500 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1 cursor-pointer"
            >
              {/* Favorite Star */}
              {contact.favorite && (
                <Star className="absolute top-4 right-4 text-yellow-500 fill-yellow-500" size={20} />
              )}

              {/* Avatar and Basic Info */}
              <div className="flex items-start gap-4 mb-4">
                <div className="relative">
                  <img
                    src={contact.avatar}
                    alt={contact.name}
                    className="w-16 h-16 rounded-full ring-2 ring-blue-500/50"
                  />
                  <div className="absolute -bottom-1 -right-1 text-2xl">{contact.countryCode}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-white truncate mb-1">{contact.name}</h3>
                  {contact.position && (
                    <p className="text-sm text-gray-400 truncate">{contact.position}</p>
                  )}
                </div>
              </div>

              {/* Company and Location */}
              {contact.company && (
                <div className="flex items-center gap-2 text-gray-300 mb-2">
                  <Building2 size={16} className="text-purple-400" />
                  <span className="text-sm truncate">{contact.company}</span>
                </div>
              )}

              {contact.location && (
                <div className="flex items-center gap-2 text-gray-300 mb-3">
                  <MapPin size={16} className="text-green-400" />
                  <span className="text-sm truncate">{contact.location}</span>
                </div>
              )}

              {/* Contact Methods */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-gray-300">
                  <Phone size={14} className="text-blue-400" />
                  <span className="text-sm">{contact.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Mail size={14} className="text-purple-400" />
                  <span className="text-sm truncate">{contact.email}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                  <Phone size={14} className="text-blue-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">{contact.callCount} calls</p>
                </div>
                <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                  <Mail size={14} className="text-purple-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">{contact.emailCount} emails</p>
                </div>
                <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                  <MessageSquare size={14} className="text-green-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">{contact.smsCount} SMS</p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {contact.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Last Contact */}
              <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>Last: {formatLastContact(contact.lastContact)}</span>
                </div>
                <span className="px-2 py-1 bg-gray-700/50 rounded">
                  {contact.source}
                </span>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-2">
                <button className="p-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500 rounded-lg transition-all">
                  <Phone size={16} className="text-blue-400 mx-auto" />
                </button>
                <button className="p-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 hover:border-purple-500 rounded-lg transition-all">
                  <Mail size={16} className="text-purple-400 mx-auto" />
                </button>
                <button className="p-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 hover:border-green-500 rounded-lg transition-all">
                  <MessageSquare size={16} className="text-green-400 mx-auto" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List View
        <div className="space-y-3">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-gradient-to-r from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-xl p-4 hover:border-blue-500 transition-all duration-300 hover:shadow-lg cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="w-12 h-12 rounded-full ring-2 ring-blue-500/50"
                />
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold">{contact.name}</h3>
                      {contact.favorite && <Star className="text-yellow-500 fill-yellow-500" size={14} />}
                    </div>
                    <p className="text-sm text-gray-400">{contact.position || 'No position'}</p>
                  </div>

                  <div>
                    <p className="text-white text-sm flex items-center gap-1">
                      <Phone size={12} className="text-blue-400" />
                      {contact.phone}
                    </p>
                    <p className="text-gray-400 text-xs truncate">{contact.email}</p>
                  </div>

                  <div>
                    <p className="text-white text-sm flex items-center gap-1">
                      <Building2 size={12} className="text-purple-400" />
                      {contact.company || 'No company'}
                    </p>
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      <MapPin size={12} className="text-green-400" />
                      {contact.location || 'No location'}
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="text-white text-sm font-semibold">{contact.callCount}</p>
                      <p className="text-xs text-gray-400">Calls</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white text-sm font-semibold">{contact.emailCount}</p>
                      <p className="text-xs text-gray-400">Emails</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white text-sm font-semibold">{contact.smsCount}</p>
                      <p className="text-xs text-gray-400">SMS</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-gray-700 rounded-lg transition-all">
                      <Phone size={16} className="text-blue-400" />
                    </button>
                    <button className="p-2 hover:bg-gray-700 rounded-lg transition-all">
                      <Mail size={16} className="text-purple-400" />
                    </button>
                    <button className="p-2 hover:bg-gray-700 rounded-lg transition-all">
                      <MessageSquare size={16} className="text-green-400" />
                    </button>
                    <button className="p-2 hover:bg-gray-700 rounded-lg transition-all">
                      <MoreVertical size={16} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredContacts.length === 0 && (
        <div className="text-center py-16">
          <Users className="mx-auto text-gray-600 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-white mb-2">No contacts found</h3>
          <p className="text-gray-400 mb-6">Try adjusting your search or filters</p>
          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all">
            <UserPlus className="inline mr-2" size={20} />
            Add Your First Contact
          </button>
        </div>
      )}
    </div>
  );
}
