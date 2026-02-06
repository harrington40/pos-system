import { useState } from 'react';
import {
  Users, UserPlus, Search,
  Phone, Clock, Target, Star,
  CheckCircle,
  Eye, Edit, MoreVertical, LayoutGrid, List
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  email: string;
  extension: string;
  status: 'online' | 'busy' | 'break' | 'offline';
  avatar?: string;
  department: string;
  skillLevel: number;
  callsToday: number;
  avgHandleTime: number;
  successRate: number;
  lastActivity: string;
  rating: number;
  skills: string[];
}

type FilterType = 'all' | 'online' | 'busy' | 'break' | 'offline';
type SortType = 'name' | 'performance' | 'calls' | 'rating';

export function AgentsPage() {
  const [filterStatus, setFilterStatus] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('performance');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [agents] = useState<Agent[]>([
    { id: '1', name: 'Sarah Johnson', email: 'sarah@company.com', extension: '101', status: 'online', department: 'Sales', skillLevel: 5, callsToday: 28, avgHandleTime: 245, successRate: 96, lastActivity: '2 min ago', rating: 4.9, skills: ['Sales', 'Support', 'Spanish'] },
    { id: '2', name: 'Michael Chen', email: 'michael@company.com', extension: '102', status: 'busy', department: 'Support', skillLevel: 4, callsToday: 35, avgHandleTime: 320, successRate: 92, lastActivity: 'On call', rating: 4.7, skills: ['Technical', 'Support'] },
    { id: '3', name: 'Emily Davis', email: 'emily@company.com', extension: '103', status: 'online', department: 'Sales', skillLevel: 5, callsToday: 42, avgHandleTime: 210, successRate: 98, lastActivity: '5 min ago', rating: 5.0, skills: ['Sales', 'VIP', 'German'] },
    { id: '4', name: 'James Wilson', email: 'james@company.com', extension: '104', status: 'break', department: 'Support', skillLevel: 3, callsToday: 18, avgHandleTime: 380, successRate: 88, lastActivity: '10 min ago', rating: 4.3, skills: ['Support'] },
    { id: '5', name: 'Lisa Anderson', email: 'lisa@company.com', extension: '105', status: 'online', department: 'Sales', skillLevel: 4, callsToday: 31, avgHandleTime: 265, successRate: 94, lastActivity: '1 min ago', rating: 4.8, skills: ['Sales', 'French'] },
    { id: '6', name: 'David Martinez', email: 'david@company.com', extension: '106', status: 'offline', department: 'Support', skillLevel: 4, callsToday: 0, avgHandleTime: 290, successRate: 91, lastActivity: '2 hours ago', rating: 4.6, skills: ['Technical', 'Billing'] },
  ]);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500/30' };
      case 'busy': return { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/30' };
      case 'break': return { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500/30' };
      case 'offline': return { bg: 'bg-gray-500', text: 'text-gray-400', border: 'border-gray-500/30' };
      default: return { bg: 'bg-gray-500', text: 'text-gray-400', border: 'border-gray-500/30' };
    }
  };
  
  const filteredAgents = agents
    .filter(agent => {
      const matchesSearch = searchQuery === '' || 
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.extension.includes(searchQuery);
      const matchesFilter = filterStatus === 'all' || agent.status === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'performance': return b.successRate - a.successRate;
        case 'calls': return b.callsToday - a.callsToday;
        case 'rating': return b.rating - a.rating;
        default: return 0;
      }
    });
  
  const stats = {
    total: agents.length,
    online: agents.filter(a => a.status === 'online').length,
    busy: agents.filter(a => a.status === 'busy').length,
    avgSuccessRate: agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length,
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              Agent Management
            </h2>
            <p className="text-gray-400 mt-1">Monitor and manage your team performance</p>
          </div>
          
          <button className="btn bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-purple-500/50 transform hover:scale-105 transition-all flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add Agent
          </button>
        </div>
        
        {/* Search and Filters */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search agents by name, email, or extension..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterType)}
              className="px-4 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="online">🟢 Online</option>
              <option value="busy">🔴 Busy</option>
              <option value="break">🟡 On Break</option>
              <option value="offline">⚫ Offline</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="px-4 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="performance">📊 Performance</option>
              <option value="calls">📞 Most Calls</option>
              <option value="rating">⭐ Rating</option>
              <option value="name">📝 Name</option>
            </select>
            
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="px-4 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-purple-500 transition-all"
            >
              {viewMode === 'grid' ? <List size={20} /> : <LayoutGrid size={20} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-700/30 backdrop-blur-lg hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-400 text-sm font-medium">Total Agents</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-700/30 backdrop-blur-lg hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-400 text-sm font-medium">Online Now</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.online}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-700/30 backdrop-blur-lg hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-400 text-sm font-medium">On Calls</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.busy}</p>
            </div>
            <Phone className="w-8 h-8 text-red-400" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-700/30 backdrop-blur-lg hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-400 text-sm font-medium">Avg Success</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.avgSuccessRate.toFixed(0)}%</p>
            </div>
            <Target className="w-8 h-8 text-blue-400" />
          </div>
        </div>
      </div>
      
      {/* Agents Grid/List */}
      <div className="flex-1 overflow-hidden">
        <div className={`h-full overflow-y-auto pr-2 ${viewMode === 'grid' ? 'grid grid-cols-3 gap-4' : 'space-y-3'}`}>
          {filteredAgents.map((agent) => {
            const statusColor = getStatusColor(agent.status);
            return (
              <div
                key={agent.id}
                className="card bg-gray-800/50 backdrop-blur-lg border border-gray-700 hover:border-purple-500 transition-all hover:scale-105 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-pink-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="relative">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 via-pink-600 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                          {agent.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full ${statusColor.bg} border-2 border-gray-800`}></div>
                      </div>
                      <div>
                        <h3 className="text-white font-bold">{agent.name}</h3>
                        <p className="text-gray-400 text-sm">{agent.department} • Ext {agent.extension}</p>
                      </div>
                    </div>
                    
                    <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  
                  {/* Status Badge */}
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${statusColor.text} bg-${agent.status === 'online' ? 'green' : agent.status === 'busy' ? 'red' : agent.status === 'break' ? 'yellow' : 'gray'}-500/10 border ${statusColor.border} text-sm mb-4`}>
                    <div className={`w-2 h-2 rounded-full ${statusColor.bg} ${agent.status === 'online' ? 'animate-pulse' : ''}`}></div>
                    {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                  </div>
                  
                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                        <Phone className="w-3 h-3" /> Calls
                      </div>
                      <div className="text-xl font-bold text-white">{agent.callsToday}</div>
                    </div>
                    
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                        <Target className="w-3 h-3" /> Success
                      </div>
                      <div className="text-xl font-bold text-green-400">{agent.successRate}%</div>
                    </div>
                    
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                        <Clock className="w-3 h-3" /> Avg Time
                      </div>
                      <div className="text-xl font-bold text-blue-400">{Math.floor(agent.avgHandleTime / 60)}m</div>
                    </div>
                    
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                        <Star className="w-3 h-3" /> Rating
                      </div>
                      <div className="text-xl font-bold text-yellow-400">{agent.rating}</div>
                    </div>
                  </div>
                  
                  {/* Skills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {agent.skills.map((skill) => (
                      <span key={skill} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full border border-purple-500/30">
                        {skill}
                      </span>
                    ))}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm transition-all flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" /> View
                    </button>
                    <button className="flex-1 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-sm transition-all flex items-center justify-center gap-2">
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
