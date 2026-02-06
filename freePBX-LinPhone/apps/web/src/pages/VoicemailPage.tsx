import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Voicemail, Play, Pause, Download, Trash2, Archive, Star,
  Phone, Clock, MessageSquare, Search,
  Volume2, VolumeX, SkipBack, SkipForward, RotateCcw, Share2,
  AlertCircle, Mic
} from 'lucide-react';

interface VoicemailMessage {
  id: string;
  from: string;
  fromName: string;
  fromAvatar: string;
  duration: number;
  timestamp: Date;
  isNew: boolean;
  isUrgent: boolean;
  starred: boolean;
  transcription?: string;
  transcriptionConfidence?: number;
  audioUrl: string;
  category: 'sales' | 'support' | 'personal' | 'unknown';
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  priority: 'high' | 'medium' | 'low';
}

export default function VoicemailPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [selectedVoicemail, setSelectedVoicemail] = useState<VoicemailMessage | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Sample voicemail data
  const voicemails: VoicemailMessage[] = [
    {
      id: '1',
      from: '+1 (555) 123-4567',
      fromName: 'John Smith',
      fromAvatar: 'https://ui-avatars.com/api/?name=John+Smith&background=3b82f6&color=fff',
      duration: 45,
      timestamp: new Date('2026-02-05T10:30:00'),
      isNew: true,
      isUrgent: true,
      starred: false,
      transcription: 'Hi, this is John Smith from TechCorp. I\'m calling about the integration project we discussed. We need to move forward quickly as our deadline is approaching. Please call me back as soon as possible at this number. Thank you.',
      transcriptionConfidence: 0.95,
      audioUrl: '/audio/voicemail1.mp3',
      category: 'sales',
      sentiment: 'neutral',
      keywords: ['integration', 'project', 'deadline', 'urgent'],
      priority: 'high'
    },
    {
      id: '2',
      from: '+44 20 7123 4567',
      fromName: 'Emma Williams',
      fromAvatar: 'https://ui-avatars.com/api/?name=Emma+Williams&background=8b5cf6&color=fff',
      duration: 32,
      timestamp: new Date('2026-02-05T09:15:00'),
      isNew: true,
      isUrgent: false,
      starred: true,
      transcription: 'Hello, Emma Williams here from London office. Just wanted to confirm our meeting scheduled for tomorrow at 3 PM. Looking forward to discussing the new features. Have a great day!',
      transcriptionConfidence: 0.92,
      audioUrl: '/audio/voicemail2.mp3',
      category: 'personal',
      sentiment: 'positive',
      keywords: ['meeting', 'confirm', 'tomorrow', 'features'],
      priority: 'medium'
    },
    {
      id: '3',
      from: '+1 (555) 234-5678',
      fromName: 'Support Request',
      fromAvatar: 'https://ui-avatars.com/api/?name=Support+Request&background=ef4444&color=fff',
      duration: 67,
      timestamp: new Date('2026-02-05T08:45:00'),
      isNew: false,
      isUrgent: true,
      starred: false,
      transcription: 'This is an urgent support request. Our phone system has been down for the past hour and we can\'t receive any customer calls. We need immediate assistance. Please contact Michael Brown at extension 3456 or call back on this number immediately.',
      transcriptionConfidence: 0.88,
      audioUrl: '/audio/voicemail3.mp3',
      category: 'support',
      sentiment: 'negative',
      keywords: ['urgent', 'down', 'support', 'immediate'],
      priority: 'high'
    },
    {
      id: '4',
      from: '+1 (555) 345-6789',
      fromName: 'Lisa Martinez',
      fromAvatar: 'https://ui-avatars.com/api/?name=Lisa+Martinez&background=10b981&color=fff',
      duration: 28,
      timestamp: new Date('2026-02-04T16:20:00'),
      isNew: false,
      isUrgent: false,
      starred: true,
      transcription: 'Hi there, Lisa Martinez calling. I received your proposal and it looks fantastic. Let\'s schedule a call next week to discuss the implementation details. Thanks!',
      transcriptionConfidence: 0.96,
      audioUrl: '/audio/voicemail4.mp3',
      category: 'sales',
      sentiment: 'positive',
      keywords: ['proposal', 'schedule', 'implementation'],
      priority: 'medium'
    },
    {
      id: '5',
      from: '+1 (555) 456-7890',
      fromName: 'Unknown Caller',
      fromAvatar: 'https://ui-avatars.com/api/?name=Unknown&background=6b7280&color=fff',
      duration: 15,
      timestamp: new Date('2026-02-04T14:10:00'),
      isNew: false,
      isUrgent: false,
      starred: false,
      transcription: 'Hello, please call me back regarding your service. Thank you.',
      transcriptionConfidence: 0.78,
      audioUrl: '/audio/voicemail5.mp3',
      category: 'unknown',
      sentiment: 'neutral',
      keywords: ['callback', 'service'],
      priority: 'low'
    },
    {
      id: '6',
      from: '+91 98765 43210',
      fromName: 'David Kumar',
      fromAvatar: 'https://ui-avatars.com/api/?name=David+Kumar&background=f59e0b&color=fff',
      duration: 52,
      timestamp: new Date('2026-02-04T11:30:00'),
      isNew: true,
      isUrgent: false,
      starred: false,
      transcription: 'Good morning, this is David Kumar from Global Tech India. We are very interested in your cloud telephony solution for our Mumbai and Delhi offices. We have about 200 agents and need a scalable solution. Please send me more information and pricing details.',
      transcriptionConfidence: 0.91,
      audioUrl: '/audio/voicemail6.mp3',
      category: 'sales',
      sentiment: 'positive',
      keywords: ['interested', 'cloud', 'telephony', 'scalable', 'pricing'],
      priority: 'high'
    }
  ];

  // Filter voicemails
  const filteredVoicemails = useMemo(() => {
    return voicemails.filter(vm => {
      const matchesSearch = 
        vm.fromName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vm.from.includes(searchQuery) ||
        vm.transcription?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vm.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = filterCategory === 'all' || vm.category === filterCategory;
      const matchesNew = !showNewOnly || vm.isNew;

      return matchesSearch && matchesCategory && matchesNew;
    });
  }, [searchQuery, filterCategory, showNewOnly, voicemails]);

  // Calculate stats
  const stats = {
    total: voicemails.length,
    new: voicemails.filter(vm => vm.isNew).length,
    urgent: voicemails.filter(vm => vm.isUrgent).length,
    starred: voicemails.filter(vm => vm.starred).length,
    totalDuration: voicemails.reduce((acc, vm) => acc + vm.duration, 0)
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😟';
      default: return '😐';
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      const updateTime = () => setCurrentTime(audio.currentTime);
      const handleEnded = () => setIsPlaying(false);
      
      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('ended', handleEnded);
      
      return () => {
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Voicemail className="text-blue-500" size={40} />
              Voicemail
            </h1>
            <p className="text-gray-400">Visual voicemail with AI transcription & sentiment analysis</p>
          </div>
          <div className="flex gap-3">
            <button className="px-6 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 hover:border-blue-500 text-white rounded-lg font-medium transition-all flex items-center gap-2">
              <Mic size={20} />
              Record Greeting
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/10 backdrop-blur-lg border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-xs font-medium">Total</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Voicemail className="text-blue-500" size={28} />
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-red-600/20 to-red-500/10 backdrop-blur-lg border border-red-500/30 rounded-xl p-4 overflow-hidden">
            {stats.new > 0 && (
              <div className="absolute -top-1 -right-1">
                <span className="relative flex h-8 w-8">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-8 w-8 bg-red-500 items-center justify-center text-white text-xs font-bold">
                    {stats.new}
                  </span>
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-400 text-xs font-medium">New</p>
                <p className="text-2xl font-bold text-white">{stats.new}</p>
              </div>
              <AlertCircle className="text-red-500" size={28} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-600/20 to-orange-500/10 backdrop-blur-lg border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-400 text-xs font-medium">Urgent</p>
                <p className="text-2xl font-bold text-white">{stats.urgent}</p>
              </div>
              <AlertCircle className="text-orange-500" size={28} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-500/10 backdrop-blur-lg border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400 text-xs font-medium">Starred</p>
                <p className="text-2xl font-bold text-white">{stats.starred}</p>
              </div>
              <Star className="text-yellow-500 fill-yellow-500" size={28} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-500/10 backdrop-blur-lg border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-400 text-xs font-medium">Duration</p>
                <p className="text-2xl font-bold text-white">{Math.floor(stats.totalDuration / 60)}m</p>
              </div>
              <Clock className="text-purple-500" size={28} />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search voicemails by name, number, transcription, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-3 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">📁 All Categories</option>
            <option value="sales">💼 Sales</option>
            <option value="support">🛠️ Support</option>
            <option value="personal">👤 Personal</option>
            <option value="unknown">❓ Unknown</option>
          </select>

          <button
            onClick={() => setShowNewOnly(!showNewOnly)}
            className={`px-4 py-3 backdrop-blur-lg border rounded-lg transition-all flex items-center gap-2 ${
              showNewOnly
                ? 'bg-red-600/20 border-red-500 text-red-400'
                : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <AlertCircle size={20} />
            New Only
          </button>
        </div>
      </div>

      {/* Voicemail List and Player */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Voicemail List */}
        <div className="lg:col-span-1 space-y-3 max-h-[800px] overflow-y-auto custom-scrollbar">
          {filteredVoicemails.map((voicemail) => (
            <div
              key={voicemail.id}
              onClick={() => setSelectedVoicemail(voicemail)}
              className={`relative group bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                selectedVoicemail?.id === voicemail.id
                  ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'border-gray-700 hover:border-blue-500/50'
              }`}
            >
              {/* New Indicator */}
              {voicemail.isNew && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-gradient-to-b from-red-500 to-orange-500 rounded-r"></div>
              )}

              {/* Urgent Badge */}
              {voicemail.isUrgent && (
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-1 bg-red-600/30 border border-red-500 text-red-400 text-xs font-semibold rounded-full animate-pulse">
                    URGENT
                  </span>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="relative">
                  <img
                    src={voicemail.fromAvatar}
                    alt={voicemail.fromName}
                    className="w-12 h-12 rounded-full ring-2 ring-blue-500/50"
                  />
                  <Voicemail className="absolute -bottom-1 -right-1 text-blue-500 bg-gray-900 rounded-full p-1" size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`text-white truncate font-semibold ${voicemail.isNew ? 'font-bold' : ''}`}>
                      {voicemail.fromName}
                    </h3>
                    {voicemail.starred && <Star className="text-yellow-500 fill-yellow-500" size={14} />}
                  </div>

                  <p className="text-sm text-gray-400 mb-2 truncate">{voicemail.from}</p>

                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDuration(voicemail.duration)}
                    </span>
                    <span>{formatTime(voicemail.timestamp)}</span>
                  </div>

                  {voicemail.transcription && (
                    <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                      {voicemail.transcription}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${getSentimentColor(voicemail.sentiment)}`}>
                      {getSentimentIcon(voicemail.sentiment)} {voicemail.sentiment}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-700/50 text-gray-400 rounded text-xs">
                      {voicemail.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredVoicemails.length === 0 && (
            <div className="text-center py-12">
              <Voicemail className="mx-auto text-gray-600 mb-4" size={48} />
              <p className="text-gray-400">No voicemails found</p>
            </div>
          )}
        </div>

        {/* Voicemail Player and Details */}
        <div className="lg:col-span-2">
          {selectedVoicemail ? (
            <div className="space-y-6">
              {/* Player Card */}
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start gap-4">
                    <img
                      src={selectedVoicemail.fromAvatar}
                      alt={selectedVoicemail.fromName}
                      className="w-16 h-16 rounded-full ring-2 ring-blue-500/50"
                    />
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">{selectedVoicemail.fromName}</h2>
                      <p className="text-gray-400 mb-2">{selectedVoicemail.from}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">{formatTime(selectedVoicemail.timestamp)}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-500 text-sm">{formatDuration(selectedVoicemail.duration)}</span>
                        {selectedVoicemail.isNew && (
                          <>
                            <span className="text-gray-500">•</span>
                            <span className="px-2 py-0.5 bg-red-600/20 border border-red-500/30 text-red-400 text-xs rounded-full font-semibold">
                              NEW
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-gray-700 rounded-lg transition-all">
                      <Star className={selectedVoicemail.starred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'} size={20} />
                    </button>
                    <button className="p-2 hover:bg-gray-700 rounded-lg transition-all">
                      <Download className="text-gray-400" size={20} />
                    </button>
                    <button className="p-2 hover:bg-gray-700 rounded-lg transition-all">
                      <Archive className="text-gray-400" size={20} />
                    </button>
                    <button className="p-2 hover:bg-gray-700 rounded-lg transition-all">
                      <Trash2 className="text-gray-400" size={20} />
                    </button>
                  </div>
                </div>

                {/* Audio Player */}
                <div className="bg-gray-800/50 rounded-xl p-6 mb-6">
                  <div className="flex items-center gap-4 mb-4">
                    <button onClick={togglePlayPause} className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full transition-all shadow-lg">
                      {isPlaying ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white ml-1" />}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                        <span>{formatDuration(Math.floor(currentTime))}</span>
                        <span>{formatDuration(selectedVoicemail.duration)}</span>
                      </div>
                      <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                          style={{ width: `${(currentTime / selectedVoicemail.duration) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button className="p-2 hover:bg-gray-700 rounded-lg transition-all">
                        <SkipBack size={18} className="text-gray-400" />
                      </button>
                      <button className="p-2 hover:bg-gray-700 rounded-lg transition-all">
                        <RotateCcw size={18} className="text-gray-400" />
                      </button>
                      <button className="p-2 hover:bg-gray-700 rounded-lg transition-all">
                        <SkipForward size={18} className="text-gray-400" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Speed Control */}
                      <select
                        value={playbackSpeed}
                        onChange={(e) => handleSpeedChange(Number(e.target.value))}
                        className="px-3 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="0.5">0.5x</option>
                        <option value="1">1x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2">2x</option>
                      </select>

                      {/* Volume Control */}
                      <div className="flex items-center gap-2">
                        {volume > 0 ? <Volume2 className="text-gray-400" size={18} /> : <VolumeX className="text-gray-400" size={18} />}
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={volume}
                          onChange={(e) => handleVolumeChange(Number(e.target.value))}
                          className="w-20 accent-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-3">
                  <button className="px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500 text-blue-400 rounded-lg transition-all flex items-center justify-center gap-2">
                    <Phone size={18} />
                    Call Back
                  </button>
                  <button className="px-4 py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 hover:border-purple-500 text-purple-400 rounded-lg transition-all flex items-center justify-center gap-2">
                    <MessageSquare size={18} />
                    Reply SMS
                  </button>
                  <button className="px-4 py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 hover:border-green-500 text-green-400 rounded-lg transition-all flex items-center justify-center gap-2">
                    <Share2 size={18} />
                    Forward
                  </button>
                </div>
              </div>

              {/* Transcription Card */}
              {selectedVoicemail.transcription && (
                <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                      <MessageSquare className="text-blue-500" size={24} />
                      AI Transcription
                    </h3>
                    {selectedVoicemail.transcriptionConfidence && (
                      <span className="px-3 py-1 bg-green-600/20 border border-green-500/30 text-green-400 text-sm rounded-full">
                        {Math.floor(selectedVoicemail.transcriptionConfidence * 100)}% confidence
                      </span>
                    )}
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                    <p className="text-gray-300 leading-relaxed">{selectedVoicemail.transcription}</p>
                  </div>

                  {/* Meta Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm mb-2">Category</p>
                      <span className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm rounded-lg inline-block">
                        {selectedVoicemail.category}
                      </span>
                    </div>

                    <div>
                      <p className="text-gray-400 text-sm mb-2">Sentiment</p>
                      <span className={`px-3 py-1 bg-gray-700/50 border border-gray-600 text-sm rounded-lg inline-flex items-center gap-1 ${getSentimentColor(selectedVoicemail.sentiment)}`}>
                        {getSentimentIcon(selectedVoicemail.sentiment)} {selectedVoicemail.sentiment}
                      </span>
                    </div>

                    <div>
                      <p className="text-gray-400 text-sm mb-2">Priority</p>
                      <span className={`px-3 py-1 text-sm rounded-lg inline-block ${
                        selectedVoicemail.priority === 'high'
                          ? 'bg-red-600/20 border border-red-500/30 text-red-400'
                          : selectedVoicemail.priority === 'medium'
                          ? 'bg-yellow-600/20 border border-yellow-500/30 text-yellow-400'
                          : 'bg-gray-600/20 border border-gray-500/30 text-gray-400'
                      }`}>
                        {selectedVoicemail.priority}
                      </span>
                    </div>
                  </div>

                  {/* Keywords */}
                  {selectedVoicemail.keywords.length > 0 && (
                    <div className="mt-4">
                      <p className="text-gray-400 text-sm mb-2">Keywords</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedVoicemail.keywords.map((keyword) => (
                          <span key={keyword} className="px-3 py-1 bg-purple-600/20 border border-purple-500/30 text-purple-400 text-sm rounded-full">
                            #{keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-2xl p-12 text-center h-full flex items-center justify-center">
              <div>
                <Voicemail className="mx-auto text-gray-600 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-white mb-2">Select a voicemail</h3>
                <p className="text-gray-400">Choose a voicemail from the list to play and view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={selectedVoicemail?.audioUrl} />
    </div>
  );
}
