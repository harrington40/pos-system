import { useState } from 'react';
import {
  Clock, Users, Phone, PhoneIncoming, PhoneMissed, TrendingUp,
  AlertCircle, CheckCircle, Activity, BarChart3, Timer,
  Pause, Play, Settings, PlusCircle, Search, Filter, Zap
} from 'lucide-react';

interface Queue {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'offline';
  callsWaiting: number;
  availableAgents: number;
  totalAgents: number;
  avgWaitTime: number;
  longestWait: number;
  callsToday: number;
  answeredToday: number;
  abandonedToday: number;
  serviceLevel: number;
  color: string;
}

interface QueueCall {
  id: string;
  queueName: string;
  callerNumber: string;
  callerName: string;
  waitTime: number;
  position: number;
  priority: 'high' | 'normal' | 'low';
}

export function QueuesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all');
  
  const [queues] = useState<Queue[]>([
    {
      id: '1',
      name: 'Sales Support',
      status: 'active',
      callsWaiting: 5,
      availableAgents: 3,
      totalAgents: 5,
      avgWaitTime: 45,
      longestWait: 125,
      callsToday: 147,
      answeredToday: 132,
      abandonedToday: 15,
      serviceLevel: 89,
      color: 'blue'
    },
    {
      id: '2',
      name: 'Technical Support',
      status: 'active',
      callsWaiting: 8,
      availableAgents: 2,
      totalAgents: 6,
      avgWaitTime: 85,
      longestWait: 245,
      callsToday: 203,
      answeredToday: 182,
      abandonedToday: 21,
      serviceLevel: 82,
      color: 'purple'
    },
    {
      id: '3',
      name: 'VIP Customer Service',
      status: 'active',
      callsWaiting: 2,
      availableAgents: 4,
      totalAgents: 4,
      avgWaitTime: 15,
      longestWait: 32,
      callsToday: 68,
      answeredToday: 67,
      abandonedToday: 1,
      serviceLevel: 98,
      color: 'yellow'
    },
    {
      id: '4',
      name: 'General Inquiries',
      status: 'paused',
      callsWaiting: 0,
      availableAgents: 0,
      totalAgents: 3,
      avgWaitTime: 0,
      longestWait: 0,
      callsToday: 89,
      answeredToday: 89,
      abandonedToday: 0,
      serviceLevel: 95,
      color: 'green'
    },
  ]);
  
  const [waitingCalls] = useState<QueueCall[]>([
    { id: '1', queueName: 'Sales Support', callerNumber: '+1 (555) 123-4567', callerName: 'John Doe', waitTime: 125, position: 1, priority: 'high' },
    { id: '2', queueName: 'Technical Support', callerNumber: '+1 (555) 234-5678', callerName: 'Jane Smith', waitTime: 245, position: 1, priority: 'high' },
    { id: '3', queueName: 'Sales Support', callerNumber: '+1 (555) 345-6789', callerName: 'Mike Johnson', waitTime: 85, position: 2, priority: 'normal' },
    { id: '4', queueName: 'Technical Support', callerNumber: '+1 (555) 456-7890', callerName: 'Sarah Williams', waitTime: 156, position: 2, priority: 'normal' },
    { id: '5', queueName: 'VIP Customer Service', callerNumber: '+1 (555) 567-8901', callerName: 'David Brown', waitTime: 32, position: 1, priority: 'high' },
  ]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500/30' };
      case 'paused': return { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500/30' };
      case 'offline': return { bg: 'bg-gray-500', text: 'text-gray-400', border: 'border-gray-500/30' };
      default: return { bg: 'bg-gray-500', text: 'text-gray-400', border: 'border-gray-500/30' };
    }
  };
  
  const filteredQueues = queues.filter(queue => {
    const matchesSearch = searchQuery === '' || queue.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || queue.status === filterStatus;
    return matchesSearch && matchesFilter;
  });
  
  const totalStats = {
    callsWaiting: queues.reduce((sum, q) => sum + q.callsWaiting, 0),
    totalCalls: queues.reduce((sum, q) => sum + q.callsToday, 0),
    answered: queues.reduce((sum, q) => sum + q.answeredToday, 0),
    abandoned: queues.reduce((sum, q) => sum + q.abandonedToday, 0),
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              Queue Management
            </h2>
            <p className="text-gray-400 mt-1">Monitor call queues and wait times</p>
          </div>
          
          <button className="btn bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-orange-500/50 transform hover:scale-105 transition-all flex items-center gap-2">
            <PlusCircle className="w-5 h-5" />
            Create Queue
          </button>
        </div>
        
        {/* Search and Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search queues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="all">All Queues</option>
            <option value="active">🟢 Active</option>
            <option value="paused">⏸️ Paused</option>
          </select>
        </div>
      </div>
      
      {/* Global Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card bg-gradient-to-br from-orange-900/20 to-orange-800/10 border border-orange-700/30 backdrop-blur-lg hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-400 text-sm font-medium">Calls Waiting</p>
              <p className="text-3xl font-bold text-white mt-1">{totalStats.callsWaiting}</p>
            </div>
            <PhoneIncoming className="w-8 h-8 text-orange-400 animate-pulse" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-700/30 backdrop-blur-lg hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-400 text-sm font-medium">Total Today</p>
              <p className="text-3xl font-bold text-white mt-1">{totalStats.totalCalls}</p>
            </div>
            <Phone className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-700/30 backdrop-blur-lg hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-400 text-sm font-medium">Answered</p>
              <p className="text-3xl font-bold text-white mt-1">{totalStats.answered}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-700/30 backdrop-blur-lg hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-400 text-sm font-medium">Abandoned</p>
              <p className="text-3xl font-bold text-white mt-1">{totalStats.abandoned}</p>
            </div>
            <PhoneMissed className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 flex-1 overflow-hidden">
        {/* Queue Cards */}
        <div className="col-span-2 overflow-y-auto pr-2 space-y-4">
          {filteredQueues.map((queue) => {
            const statusColor = getStatusColor(queue.status);
            return (
              <div
                key={queue.id}
                className="card bg-gray-800/50 backdrop-blur-lg border border-gray-700 hover:border-orange-500 transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-600/5 via-red-600/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="relative">
                  {/* Queue Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-white">{queue.name}</h3>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusColor.text} bg-${queue.status === 'active' ? 'green' : 'yellow'}-500/10 border ${statusColor.border}`}>
                          <div className={`w-2 h-2 rounded-full ${statusColor.bg} ${queue.status === 'active' ? 'animate-pulse' : ''}`}></div>
                          {queue.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">
                        {queue.availableAgents} of {queue.totalAgents} agents available
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                        <Settings className="w-4 h-4 text-gray-300" />
                      </button>
                      {queue.status === 'active' ? (
                        <button className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors">
                          <Pause className="w-4 h-4" />
                        </button>
                      ) : (
                        <button className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors">
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Real-time Metrics */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                        <PhoneIncoming className="w-3 h-3" /> Waiting
                      </div>
                      <div className={`text-2xl font-bold ${queue.callsWaiting > 5 ? 'text-red-400' : queue.callsWaiting > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {queue.callsWaiting}
                      </div>
                    </div>
                    
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                        <Timer className="w-3 h-3" /> Avg Wait
                      </div>
                      <div className="text-2xl font-bold text-blue-400">
                        {formatTime(queue.avgWaitTime)}
                      </div>
                    </div>
                    
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                        <AlertCircle className="w-3 h-3" /> Longest
                      </div>
                      <div className={`text-2xl font-bold ${queue.longestWait > 180 ? 'text-red-400' : queue.longestWait > 60 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {formatTime(queue.longestWait)}
                      </div>
                    </div>
                    
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                        <Zap className="w-3 h-3" /> SLA
                      </div>
                      <div className={`text-2xl font-bold ${queue.serviceLevel >= 90 ? 'text-green-400' : queue.serviceLevel >= 75 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {queue.serviceLevel}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Today's Performance */}
                  <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg border border-gray-700/30">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-xs text-gray-400">Total Calls</p>
                        <p className="text-lg font-bold text-white">{queue.callsToday}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Answered</p>
                        <p className="text-lg font-bold text-green-400">{queue.answeredToday}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Abandoned</p>
                        <p className="text-lg font-bold text-red-400">{queue.abandonedToday}</p>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="flex-1 ml-6">
                      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                          style={{ width: `${(queue.answeredToday / queue.callsToday) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Answer Rate: {((queue.answeredToday / queue.callsToday) * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Waiting Calls Panel */}
        <div className="col-span-1 card bg-gray-800/50 backdrop-blur-lg border border-gray-700 overflow-hidden flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-400" />
            Calls in Queue
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-2">
            {waitingCalls.map((call) => (
              <div
                key={call.id}
                className={`p-3 rounded-lg border transition-all hover:scale-105 cursor-pointer ${
                  call.priority === 'high' 
                    ? 'bg-red-500/10 border-red-500/30 hover:border-red-500' 
                    : 'bg-gray-900/50 border-gray-700/30 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-medium text-sm">{call.callerName}</p>
                    <p className="text-gray-400 text-xs">{call.callerNumber}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    call.priority === 'high' 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    #{call.position}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">{call.queueName}</p>
                  <p className={`text-sm font-bold font-mono ${
                    call.waitTime > 180 ? 'text-red-400' : 
                    call.waitTime > 60 ? 'text-yellow-400' : 
                    'text-green-400'
                  }`}>
                    {formatTime(call.waitTime)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
