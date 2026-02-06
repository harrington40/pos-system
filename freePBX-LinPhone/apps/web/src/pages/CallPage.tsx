import { useState, useEffect, useMemo } from 'react';
import { Phone, MessageSquare, Video, Clock, Search, PhoneCall, TrendingUp, Zap, Star, Award, Activity, Users, Filter, SortAsc, Sparkles, Brain, Target } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  extension: string;
  status: 'available' | 'busy' | 'away' | 'offline';
  avatar?: string;
  queue?: string;
  callDuration?: string;
  skillLevel?: number; // 1-5 rating
  avgCallTime?: number; // in seconds
  successRate?: number; // 0-100%
  totalCalls?: number;
  rating?: number; // 1-5 stars
  languages?: string[];
  currentWorkload?: number; // 0-100%
}

type SortOption = 'name' | 'availability' | 'performance' | 'skillLevel';
type FilterOption = 'all' | 'available' | 'busy' | 'away' | 'offline';

export function CallPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('performance');
  const [filterStatus, setFilterStatus] = useState<FilterOption>('all');
  const [showAiSuggestions, setShowAiSuggestions] = useState(true);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  
  const [agents] = useState<Agent[]>([
    { id: '1', name: 'Anthony Freeman', extension: '020', status: 'available', queue: 'Sales', skillLevel: 5, avgCallTime: 240, successRate: 96, totalCalls: 1247, rating: 4.9, languages: ['EN', 'ES'], currentWorkload: 15 },
    { id: '2', name: 'Sara Jones', extension: '028', status: 'busy', queue: 'Support', callDuration: '00:15', skillLevel: 4, avgCallTime: 320, successRate: 92, totalCalls: 892, rating: 4.7, languages: ['EN'], currentWorkload: 85 },
    { id: '3', name: 'Chandler Maler', extension: '021', status: 'available', queue: 'Sales', skillLevel: 5, avgCallTime: 210, successRate: 98, totalCalls: 1834, rating: 5.0, languages: ['EN', 'FR'], currentWorkload: 25 },
    { id: '4', name: 'Harley Johnson', extension: '037', status: 'busy', queue: 'Support', callDuration: '01:23', skillLevel: 3, avgCallTime: 450, successRate: 88, totalCalls: 634, rating: 4.3, languages: ['EN'], currentWorkload: 90 },
    { id: '5', name: 'John Lewis', extension: '116', status: 'available', queue: 'Sales', skillLevel: 4, avgCallTime: 280, successRate: 94, totalCalls: 1156, rating: 4.8, languages: ['EN', 'DE'], currentWorkload: 10 },
    { id: '6', name: 'Dianne Nicholson', extension: '014', status: 'away', queue: 'Support', skillLevel: 5, avgCallTime: 190, successRate: 97, totalCalls: 2103, rating: 4.9, languages: ['EN', 'ES', 'FR'], currentWorkload: 0 },
    { id: '7', name: 'Marvin Shah', extension: '023', status: 'available', queue: 'Sales', skillLevel: 4, avgCallTime: 260, successRate: 93, totalCalls: 987, rating: 4.6, languages: ['EN', 'HI'], currentWorkload: 35 },
    { id: '8', name: 'Jasline Richards', extension: '021', status: 'offline', queue: 'Support', skillLevel: 3, avgCallTime: 380, successRate: 85, totalCalls: 445, rating: 4.1, languages: ['EN'], currentWorkload: 0 },
    { id: '9', name: 'Rosalie Mckinney', extension: '046', status: 'available', queue: 'Sales', skillLevel: 5, avgCallTime: 220, successRate: 95, totalCalls: 1523, rating: 4.8, languages: ['EN', 'ES'], currentWorkload: 20 },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-red-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'busy': return 'On Call';
      case 'away': return 'Away';
      case 'offline': return 'Offline';
      default: return status;
    }
  };

  // Advanced AI-powered agent matching algorithm
  const getAgentScore = (agent: Agent): number => {
    let score = 0;
    
    // Performance metrics (40% weight)
    score += (agent.successRate || 0) * 0.2;
    score += (agent.skillLevel || 0) * 4;
    score += (agent.rating || 0) * 4;
    
    // Availability (30% weight)
    if (agent.status === 'available') score += 30;
    else if (agent.status === 'away') score += 10;
    
    // Workload optimization (20% weight)
    const workloadScore = 20 - ((agent.currentWorkload || 0) * 0.2);
    score += Math.max(0, workloadScore);
    
    // Experience (10% weight)
    score += Math.min(10, (agent.totalCalls || 0) / 200);
    
    return score;
  };
  
  // Smart filtering with fuzzy search
  const filteredAgents = useMemo(() => {
    let filtered = agents.filter(agent => {
      const matchesSearch = searchQuery === '' || 
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.extension.includes(searchQuery) ||
        agent.queue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.languages?.some(lang => lang.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesFilter = filterStatus === 'all' || agent.status === filterStatus;
      
      return matchesSearch && matchesFilter;
    });
    
    // Advanced sorting algorithms
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'availability':
          const statusOrder = { available: 0, away: 1, busy: 2, offline: 3 };
          return statusOrder[a.status] - statusOrder[b.status];
        case 'performance':
          return getAgentScore(b) - getAgentScore(a);
        case 'skillLevel':
          return (b.skillLevel || 0) - (a.skillLevel || 0);
        default:
          return 0;
      }
    });
  }, [agents, searchQuery, filterStatus, sortBy]);
  
  // AI-powered agent recommendations
  const recommendedAgents = useMemo(() => {
    return [...agents]
      .filter(a => a.status === 'available')
      .sort((a, b) => getAgentScore(b) - getAgentScore(a))
      .slice(0, 3);
  }, [agents]);
  
  // Real-time stats
  const stats = useMemo(() => {
    const available = agents.filter(a => a.status === 'available').length;
    const avgSuccessRate = agents.reduce((sum, a) => sum + (a.successRate || 0), 0) / agents.length;
    const totalActiveCalls = agents.filter(a => a.status === 'busy').length;
    const avgWorkload = agents.reduce((sum, a) => sum + (a.currentWorkload || 0), 0) / agents.length;
    
    return { available, avgSuccessRate, totalActiveCalls, avgWorkload };
  }, [agents]);

  const makeCall = (agent: Agent) => {
    console.log(`Calling ${agent.name} at extension ${agent.extension}`);
    // Implement actual call logic here
  };

  return (
    <div className="h-full flex flex-col">
      {/* Modern Header with Glassmorphism */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Phone className="w-6 h-6" />
              </div>
              Smart Agent Directory
            </h2>
            <p className="text-gray-400 mt-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              AI-Powered Routing & Real-time Analytics
            </p>
          </div>
          
          {/* Smart Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAiSuggestions(!showAiSuggestions)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                showAiSuggestions 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Brain className="w-4 h-4" />
              AI Assist
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 backdrop-blur-lg rounded-lg border border-gray-700">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">System Active</span>
            </div>
          </div>
        </div>
        
        {/* Advanced Search & Filter Bar */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, extension, queue, or language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterOption)}
              className="px-4 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="busy">On Call</option>
              <option value="away">Away</option>
              <option value="offline">Offline</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="performance">🎯 Best Performance</option>
              <option value="availability">🟢 Availability</option>
              <option value="skillLevel">⭐ Skill Level</option>
              <option value="name">📝 Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Analytics Dashboard */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-700/30 backdrop-blur-lg relative overflow-hidden group hover:scale-105 transition-transform">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-green-400 text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Available Agents
              </p>
              <p className="text-3xl font-bold text-white mt-1">{stats.available}</p>
              <p className="text-xs text-gray-400 mt-1">Ready to assist</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            </div>
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-700/30 backdrop-blur-lg relative overflow-hidden group hover:scale-105 transition-transform">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-blue-400 text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Active Calls
              </p>
              <p className="text-3xl font-bold text-white mt-1">{stats.totalActiveCalls}</p>
              <p className="text-xs text-gray-400 mt-1">In progress</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <PhoneCall className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-700/30 backdrop-blur-lg relative overflow-hidden group hover:scale-105 transition-transform">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-purple-400 text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Success Rate
              </p>
              <p className="text-3xl font-bold text-white mt-1">{stats.avgSuccessRate.toFixed(1)}%</p>
              <p className="text-xs text-gray-400 mt-1">Team average</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Award className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border border-yellow-700/30 backdrop-blur-lg relative overflow-hidden group hover:scale-105 transition-transform">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-yellow-400 text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Avg Workload
              </p>
              <p className="text-3xl font-bold text-white mt-1">{stats.avgWorkload.toFixed(0)}%</p>
              <p className="text-xs text-gray-400 mt-1">System capacity</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Recommendations Panel */}
      {showAiSuggestions && recommendedAgents.length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/30 via-blue-900/30 to-purple-900/30 border border-purple-500/30 rounded-xl backdrop-blur-lg">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold">AI Recommended Agents</h3>
            <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded-full">Smart Routing</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {recommendedAgents.map((agent, index) => (
              <div key={agent.id} className="bg-gray-800/50 backdrop-blur-lg rounded-lg p-3 border border-gray-700 hover:border-purple-500 transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                      {agent.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    {index === 0 && <Star className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 fill-yellow-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm truncate">{agent.name}</p>
                      {index === 0 && <span className="text-xs text-yellow-400">Best Match</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>Score: {getAgentScore(agent).toFixed(0)}/100</span>
                      <span>•</span>
                      <span>{agent.successRate}% SR</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modern Agent Grid with Performance Metrics */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto pr-2 space-y-3">
          {filteredAgents.length === 0 ? (
            <div className="card bg-gray-800/50 backdrop-blur-lg border border-gray-700 text-center py-16">
              <div className="opacity-50 mb-4">
                <Users className="w-16 h-16 mx-auto text-gray-600" />
              </div>
              <p className="text-gray-400 text-lg">No agents found</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting your filters or search query</p>
            </div>
          ) : (
            filteredAgents.map((agent) => (
              <div
                key={agent.id}
                onMouseEnter={() => setHoveredAgent(agent.id)}
                onMouseLeave={() => setHoveredAgent(null)}
                className={`card bg-gray-800/50 backdrop-blur-lg border transition-all duration-300 relative overflow-hidden group ${
                  hoveredAgent === agent.id 
                    ? 'border-blue-500 shadow-lg shadow-blue-500/20 scale-[1.02]' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                {/* Animated background gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative flex items-center gap-4">
                  {/* Avatar with animated ring */}
                  <div className="relative">
                    <div className={`absolute inset-0 rounded-full ${
                      agent.status === 'available' ? 'bg-green-500/20 animate-ping' :
                      agent.status === 'busy' ? 'bg-red-500/20' : ''
                    }`}></div>
                    <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      {agent.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full ${getStatusColor(agent.status)} border-2 border-gray-800 shadow-lg`}>
                      {agent.status === 'available' && <div className="w-full h-full rounded-full bg-green-400 animate-pulse"></div>}
                    </div>
                  </div>
                  
                  {/* Agent Info & Metrics */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-bold text-lg">{agent.name}</h3>
                      <span className="text-gray-400 font-mono text-sm">Ext {agent.extension}</span>
                      
                      {/* Skill Stars */}
                      {agent.skillLevel && (
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < agent.skillLevel!
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                      
                      {/* Languages */}
                      {agent.languages && agent.languages.length > 0 && (
                        <div className="flex gap-1">
                          {agent.languages.map((lang) => (
                            <span key={lang} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                              {lang}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Status & Queue Info */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          agent.status === 'available' ? 'text-green-400' :
                          agent.status === 'busy' ? 'text-red-400' :
                          agent.status === 'away' ? 'text-yellow-400' :
                          'text-gray-500'
                        }`}>
                          {getStatusText(agent.status)}
                        </span>
                        {agent.callDuration && (
                          <span className="text-blue-400 text-sm flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" /> {agent.callDuration}
                          </span>
                        )}
                      </div>
                      
                      {agent.queue && (
                        <span className="text-sm text-gray-400 bg-gray-700/50 px-3 py-0.5 rounded-full">
                          📋 {agent.queue}
                        </span>
                      )}
                    </div>
                    
                    {/* Performance Metrics */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-gray-900/50 rounded-lg p-2 border border-gray-700/50">
                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                          <TrendingUp className="w-3 h-3" />
                          Success
                        </div>
                        <div className="text-lg font-bold text-green-400">{agent.successRate}%</div>
                      </div>
                      
                      <div className="bg-gray-900/50 rounded-lg p-2 border border-gray-700/50">
                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                          <Clock className="w-3 h-3" />
                          Avg Time
                        </div>
                        <div className="text-lg font-bold text-blue-400">{Math.floor((agent.avgCallTime || 0) / 60)}m</div>
                      </div>
                      
                      <div className="bg-gray-900/50 rounded-lg p-2 border border-gray-700/50">
                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                          <Activity className="w-3 h-3" />
                          Workload
                        </div>
                        <div className={`text-lg font-bold ${
                          (agent.currentWorkload || 0) < 50 ? 'text-green-400' :
                          (agent.currentWorkload || 0) < 75 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {agent.currentWorkload}%
                        </div>
                      </div>
                      
                      <div className="bg-gray-900/50 rounded-lg p-2 border border-gray-700/50">
                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                          <Award className="w-3 h-3" />
                          Rating
                        </div>
                        <div className="text-lg font-bold text-yellow-400 flex items-center gap-1">
                          {agent.rating} <Star className="w-3 h-3 fill-yellow-400" />
                        </div>
                      </div>
                    </div>
                    
                    {/* AI Performance Score */}
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500"
                          style={{ width: `${getAgentScore(agent)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">
                        AI Score: {getAgentScore(agent).toFixed(0)}/100
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => makeCall(agent)}
                      disabled={agent.status === 'offline'}
                      className={`group/btn relative overflow-hidden p-3 rounded-xl transition-all transform hover:scale-105 active:scale-95 disabled:scale-100 ${
                        agent.status === 'offline'
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : agent.status === 'busy'
                          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-lg hover:shadow-red-500/50'
                          : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-lg hover:shadow-green-500/50'
                      }`}
                      title={agent.status === 'busy' ? 'Transfer/Join Call' : 'Call Agent'}
                    >
                      <div className="absolute inset-0 bg-white/20 transform -translate-x-full group-hover/btn:translate-x-full transition-transform duration-500"></div>
                      {agent.status === 'busy' ? (
                        <PhoneCall className="w-6 h-6 relative z-10" />
                      ) : (
                        <Phone className="w-6 h-6 relative z-10" />
                      )}
                    </button>
                    
                    <div className="flex gap-2">
                      <button
                        disabled={agent.status === 'offline'}
                        className={`p-2 rounded-lg transition-all hover:scale-110 active:scale-95 ${
                          agent.status === 'offline'
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-700 text-gray-300 hover:bg-blue-600 hover:text-white'
                        }`}
                        title="Send Message"
                      >
                        <MessageSquare className="w-5 h-5" />
                      </button>
                      
                      <button
                        disabled={agent.status === 'offline'}
                        className={`p-2 rounded-lg transition-all hover:scale-110 active:scale-95 ${
                          agent.status === 'offline'
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-700 text-gray-300 hover:bg-purple-600 hover:text-white'
                        }`}
                        title="Video Call"
                      >
                        <Video className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
