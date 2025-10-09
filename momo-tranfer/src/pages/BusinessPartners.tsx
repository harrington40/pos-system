import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Filter,
  Star,
  MapPin,
  Clock,
  Users,
  Building,
  ShoppingBag,
  Shield,
  ChevronRight,
  Phone,
  MessageCircle
} from 'lucide-react';

interface BusinessPartner {
  id: string;
  name: string;
  category: string;
  rating: number;
  totalTransactions: number;
  isOnline: boolean;
  avatar: string;
  verified: boolean;
  services: string[];
  location: string;
  lastActive: string;
  description: string;
  memberSince: string;
  responseTime: string;
}

export const BusinessPartners = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const categories = ['All', 'Electronics', 'Agriculture', 'Fashion', 'Automotive', 'Food & Beverage', 'Services'];

  const businessPartners: BusinessPartner[] = [
    {
      id: '1',
      name: 'Kampala Electronics Hub',
      category: 'Electronics',
      rating: 4.8,
      totalTransactions: 1247,
      isOnline: true,
      avatar: '🏪',
      verified: true,
      services: ['Buy', 'Sell', 'Repair', 'Wholesale'],
      location: 'Kampala, Uganda',
      lastActive: '2 minutes ago',
      description: 'Leading electronics retailer with quality products and excellent customer service.',
      memberSince: 'March 2023',
      responseTime: '< 1 hour'
    },
    {
      id: '2',
      name: 'Fresh Market Vendors',
      category: 'Agriculture',
      rating: 4.6,
      totalTransactions: 856,
      isOnline: true,
      avatar: '🥬',
      verified: true,
      services: ['Fresh Produce', 'Wholesale', 'Organic'],
      location: 'Nakawa Market',
      lastActive: '5 minutes ago',
      description: 'Farm-fresh produce directly from local farmers. Best prices guaranteed.',
      memberSince: 'January 2023',
      responseTime: '< 30 minutes'
    },
    {
      id: '3',
      name: 'Fashion Forward Boutique',
      category: 'Fashion',
      rating: 4.9,
      totalTransactions: 634,
      isOnline: false,
      avatar: '👗',
      verified: true,
      services: ['Retail', 'Custom Design', 'Alterations'],
      location: 'Garden City Mall',
      lastActive: '1 hour ago',
      description: 'Trendy fashion items and custom tailoring services for all occasions.',
      memberSince: 'June 2023',
      responseTime: '< 2 hours'
    },
    {
      id: '4',
      name: 'Auto Parts Central',
      category: 'Automotive',
      rating: 4.7,
      totalTransactions: 423,
      isOnline: true,
      avatar: '🚗',
      verified: true,
      services: ['Parts', 'Repair', 'Maintenance'],
      location: 'Industrial Area',
      lastActive: '10 minutes ago',
      description: 'Complete automotive solutions with genuine parts and professional service.',
      memberSince: 'August 2023',
      responseTime: '< 45 minutes'
    },
    {
      id: '5',
      name: 'TechCafe Solutions',
      category: 'Services',
      rating: 4.5,
      totalTransactions: 289,
      isOnline: true,
      avatar: '💻',
      verified: false,
      services: ['IT Support', 'Web Design', 'Training'],
      location: 'Ntinda',
      lastActive: '20 minutes ago',
      description: 'Professional IT services and training for businesses and individuals.',
      memberSince: 'September 2023',
      responseTime: '< 1 hour'
    }
  ];

  const filteredPartners = businessPartners.filter(partner => {
    const matchesSearch = partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         partner.services.some(service => service.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || partner.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/profile"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Business Partners</h1>
              <p className="text-sm text-gray-600">{filteredPartners.length} partners available</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Filter className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search businesses, services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4"
          >
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <motion.button
                  key={category}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Business Partners List */}
      <div className="p-4 space-y-4">
        {filteredPartners.map((partner, index) => (
          <motion.div
            key={partner.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start space-x-4">
              {/* Avatar & Status */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl">
                  {partner.avatar}
                </div>
                {partner.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                )}
                {partner.verified && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <Shield className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Business Info */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900">{partner.name}</h3>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600">{partner.rating}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-2">{partner.description}</p>

                {/* Services */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {partner.services.slice(0, 3).map((service) => (
                    <span
                      key={service}
                      className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-md"
                    >
                      {service}
                    </span>
                  ))}
                  {partner.services.length > 3 && (
                    <span className="text-xs text-gray-500">+{partner.services.length - 3} more</span>
                  )}
                </div>

                {/* Meta Information */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{partner.location}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{partner.totalTransactions}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{partner.lastActive}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Message</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span className="text-sm font-medium">Call</span>
                </motion.button>
              </div>
              <Link
                to={`/business/partner/${partner.id}`}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
              >
                <span className="text-sm font-medium">View Profile</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        ))}

        {filteredPartners.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Partners Found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </motion.div>
        )}
      </div>

      {/* Floating Action Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-6 right-6"
      >
        <Link
          to="/business/register"
          className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-shadow"
        >
          <ShoppingBag className="w-6 h-6" />
        </Link>
      </motion.div>
    </div>
  );
};