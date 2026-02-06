import { useState } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Activity, Clock, Phone,
  Users, Target, Award, Zap, Calendar, Download, Filter,
  PhoneIncoming, PhoneOutgoing, PhoneMissed, Timer, Star,
  CheckCircle, XCircle, AlertCircle, DollarSign, Percent
} from 'lucide-react';

type TimeRange = 'today' | 'week' | 'month' | 'year';
type MetricType = 'calls' | 'duration' | 'quality' | 'revenue';

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('calls');
  
  // Sample data - would come from API in production
  const metrics = {
    totalCalls: { value: 1247, change: 12.5, trend: 'up' },
    avgDuration: { value: 4.2, change: -3.2, trend: 'down' },
    successRate: { value: 94.3, change: 2.1, trend: 'up' },
    customerSatisfaction: { value: 4.7, change: 0.3, trend: 'up' },
  };
  
  const hourlyData = [
    { hour: '00', calls: 12, answered: 10, missed: 2 },
    { hour: '01', calls: 8, answered: 7, missed: 1 },
    { hour: '02', calls: 5, answered: 5, missed: 0 },
    { hour: '03', calls: 3, answered: 3, missed: 0 },
    { hour: '04', calls: 7, answered: 6, missed: 1 },
    { hour: '05', calls: 15, answered: 14, missed: 1 },
    { hour: '06', calls: 45, answered: 42, missed: 3 },
    { hour: '07', calls: 78, answered: 73, missed: 5 },
    { hour: '08', calls: 125, answered: 118, missed: 7 },
    { hour: '09', calls: 142, answered: 135, missed: 7 },
    { hour: '10', calls: 156, answered: 148, missed: 8 },
    { hour: '11', calls: 134, answered: 128, missed: 6 },
    { hour: '12', calls: 98, answered: 92, missed: 6 },
    { hour: '13', calls: 112, answered: 107, missed: 5 },
    { hour: '14', calls: 128, answered: 122, missed: 6 },
    { hour: '15', calls: 98, answered: 94, missed: 4 },
    { hour: '16', calls: 76, answered: 72, missed: 4 },
    { hour: '17', calls: 54, answered: 51, missed: 3 },
    { hour: '18', calls: 32, answered: 30, missed: 2 },
    { hour: '19', calls: 23, answered: 22, missed: 1 },
    { hour: '20', calls: 18, answered: 17, missed: 1 },
    { hour: '21', calls: 14, answered: 13, missed: 1 },
    { hour: '22', calls: 10, answered: 9, missed: 1 },
    { hour: '23', calls: 8, answered: 7, missed: 1 },
  ];
  
  const topAgents = [
    { name: 'Emily Davis', calls: 89, avgTime: 3.5, satisfaction: 4.9, revenue: 12400 },
    { name: 'Michael Chen', calls: 76, avgTime: 4.2, satisfaction: 4.7, revenue: 10800 },
    { name: 'Sarah Johnson', calls: 72, avgTime: 3.8, satisfaction: 4.8, revenue: 9600 },
    { name: 'James Wilson', calls: 68, avgTime: 4.5, satisfaction: 4.6, revenue: 8900 },
    { name: 'Lisa Anderson', calls: 65, avgTime: 3.9, satisfaction: 4.7, revenue: 8500 },
  ];
  
  const maxCalls = Math.max(...hourlyData.map(d => d.calls));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              Analytics & Reports
            </h2>
            <p className="text-gray-400 mt-1">Insights and performance metrics</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <div className="flex items-center gap-1 bg-gray-800/50 backdrop-blur-lg rounded-lg border border-gray-700 p-1">
              {(['today', 'week', 'month', 'year'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    timeRange === range
                      ? 'bg-cyan-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
            
            <button className="btn bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-cyan-500/50 transform hover:scale-105 transition-all flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export Report
            </button>
          </div>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-700/30 backdrop-blur-lg hover:scale-105 transition-transform group">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Phone className="w-6 h-6 text-blue-400" />
            </div>
            <div className={`flex items-center gap-1 text-sm ${metrics.totalCalls.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
              {metrics.totalCalls.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(metrics.totalCalls.change)}%
            </div>
          </div>
          <p className="text-blue-400 text-sm font-medium mb-1">Total Calls</p>
          <p className="text-3xl font-bold text-white">{metrics.totalCalls.value.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-2">vs. previous period</p>
        </div>
        
        <div className="card bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-700/30 backdrop-blur-lg hover:scale-105 transition-transform group">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6 text-purple-400" />
            </div>
            <div className={`flex items-center gap-1 text-sm ${metrics.avgDuration.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
              {metrics.avgDuration.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(metrics.avgDuration.change)}%
            </div>
          </div>
          <p className="text-purple-400 text-sm font-medium mb-1">Avg Duration</p>
          <p className="text-3xl font-bold text-white">{metrics.avgDuration.value.toFixed(1)} min</p>
          <p className="text-xs text-gray-400 mt-2">per call</p>
        </div>
        
        <div className="card bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-700/30 backdrop-blur-lg hover:scale-105 transition-transform group">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Target className="w-6 h-6 text-green-400" />
            </div>
            <div className={`flex items-center gap-1 text-sm ${metrics.successRate.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
              {metrics.successRate.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(metrics.successRate.change)}%
            </div>
          </div>
          <p className="text-green-400 text-sm font-medium mb-1">Success Rate</p>
          <p className="text-3xl font-bold text-white">{metrics.successRate.value}%</p>
          <p className="text-xs text-gray-400 mt-2">resolution rate</p>
        </div>
        
        <div className="card bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border border-yellow-700/30 backdrop-blur-lg hover:scale-105 transition-transform group">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Star className="w-6 h-6 text-yellow-400" />
            </div>
            <div className={`flex items-center gap-1 text-sm ${metrics.customerSatisfaction.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
              {metrics.customerSatisfaction.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(metrics.customerSatisfaction.change)}
            </div>
          </div>
          <p className="text-yellow-400 text-sm font-medium mb-1">Satisfaction</p>
          <p className="text-3xl font-bold text-white">{metrics.customerSatisfaction.value}</p>
          <p className="text-xs text-gray-400 mt-2">out of 5.0</p>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 flex-1 overflow-hidden">
        {/* Call Volume Chart */}
        <div className="col-span-2 card bg-gray-800/50 backdrop-blur-lg border border-gray-700 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Hourly Call Volume
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-400">Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-400">Missed</span>
              </div>
            </div>
          </div>
          
          {/* Simple Bar Chart */}
          <div className="flex-1 flex items-end gap-1 px-2">
            {hourlyData.map((data) => (
              <div key={data.hour} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col-reverse gap-0.5">
                  {/* Answered calls bar */}
                  <div
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm hover:from-blue-500 hover:to-blue-300 transition-all cursor-pointer relative group"
                    style={{ height: `${(data.answered / maxCalls) * 200}px` }}
                  >
                    <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap transition-opacity">
                      {data.answered} calls
                    </span>
                  </div>
                  {/* Missed calls bar */}
                  {data.missed > 0 && (
                    <div
                      className="w-full bg-gradient-to-t from-red-600 to-red-400 rounded-t-sm hover:from-red-500 hover:to-red-300 transition-all cursor-pointer"
                      style={{ height: `${(data.missed / maxCalls) * 200}px` }}
                    ></div>
                  )}
                </div>
                <span className="text-xs text-gray-500 font-mono">{data.hour}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Top Performers */}
        <div className="col-span-1 card bg-gray-800/50 backdrop-blur-lg border border-gray-700 overflow-hidden flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            Top Performers
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-3">
            {topAgents.map((agent, index) => (
              <div key={agent.name} className="p-3 bg-gray-900/50 border border-gray-700/30 rounded-lg hover:border-cyan-500/50 transition-all group">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    index === 1 ? 'bg-gray-500/20 text-gray-400' :
                    index === 2 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-gray-700/20 text-gray-500'
                  }`}>
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{agent.name}</p>
                    <p className="text-gray-400 text-xs">{agent.calls} calls handled</p>
                  </div>
                  {index === 0 && <Award className="w-5 h-5 text-yellow-400" />}
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-400">Avg Time</p>
                    <p className="text-sm font-bold text-blue-400">{agent.avgTime}m</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Rating</p>
                    <p className="text-sm font-bold text-yellow-400">{agent.satisfaction}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Revenue</p>
                    <p className="text-sm font-bold text-green-400">${(agent.revenue / 1000).toFixed(1)}k</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Additional Stats Row */}
      <div className="grid grid-cols-6 gap-4 mt-4">
        <div className="card bg-gray-800/30 border border-gray-700/50 p-4 hover:border-cyan-500/50 transition-all">
          <div className="flex items-center gap-3">
            <PhoneIncoming className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-xs text-gray-400">Incoming</p>
              <p className="text-xl font-bold text-white">845</p>
            </div>
          </div>
        </div>
        
        <div className="card bg-gray-800/30 border border-gray-700/50 p-4 hover:border-cyan-500/50 transition-all">
          <div className="flex items-center gap-3">
            <PhoneOutgoing className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-xs text-gray-400">Outgoing</p>
              <p className="text-xl font-bold text-white">324</p>
            </div>
          </div>
        </div>
        
        <div className="card bg-gray-800/30 border border-gray-700/50 p-4 hover:border-cyan-500/50 transition-all">
          <div className="flex items-center gap-3">
            <PhoneMissed className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-xs text-gray-400">Missed</p>
              <p className="text-xl font-bold text-white">78</p>
            </div>
          </div>
        </div>
        
        <div className="card bg-gray-800/30 border border-gray-700/50 p-4 hover:border-cyan-500/50 transition-all">
          <div className="flex items-center gap-3">
            <Timer className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-xs text-gray-400">Total Time</p>
              <p className="text-xl font-bold text-white">87.5h</p>
            </div>
          </div>
        </div>
        
        <div className="card bg-gray-800/30 border border-gray-700/50 p-4 hover:border-cyan-500/50 transition-all">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-xs text-gray-400">Resolved</p>
              <p className="text-xl font-bold text-white">1,169</p>
            </div>
          </div>
        </div>
        
        <div className="card bg-gray-800/30 border border-gray-700/50 p-4 hover:border-cyan-500/50 transition-all">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-xs text-gray-400">Revenue</p>
              <p className="text-xl font-bold text-white">$50.2k</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
