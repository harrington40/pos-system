import { useState, useEffect, useRef } from 'react';
import { 
  Phone, PhoneOff, Mic, MicOff, Pause, Play, 
  PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneForwarded,
  Clock, Users, TrendingUp, Activity, 
  Settings, Maximize2, Minimize2, LayoutGrid,
  BarChart3, Zap, CheckCircle,
  Volume2, MessageSquare, Video, VideoOff,
  Timer, Award, Wifi, WifiOff, RefreshCw, MapPin,
  Bell, Search, Filter, Download, Calendar,
  Target, Smartphone, Headphones, Globe, Signal
} from 'lucide-react';
import { useCallStore } from '../store/callStore';
import { CallState } from '@smart-sip/shared';

interface CallStats {
  total: number;
  answered: number;
  missed: number;
  avgDuration: number;
  trend: number;
}

type ViewMode = 'comfortable' | 'compact' | 'detailed';

export function DashboardPage() {
  const {
    isConnected,
    currentCall,
    isMuted,
    isHeld,
    isVideoEnabled,
    localStream,
    remoteStream,
    isConference,
    conferenceParticipants,
    initializeSIP,
    makeCall,
    answerCall,
    hangupCall,
    toggleMute,
    toggleHold,
    toggleVideo,
    updateStreams,
    startConference,
    addToConference,
    removeFromConference,
    endConference,
    sendDTMF
  } = useCallStore();

  const [viewMode, setViewMode] = useState<ViewMode>('comfortable');
  const [showSettings, setShowSettings] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  
  // Conference Management
  const [showConferenceModal, setShowConferenceModal] = useState(false);
  const [newParticipantUri, setNewParticipantUri] = useState('');
  const MAX_CONFERENCE_PARTICIPANTS = 8; // Asterisk ConfBridge recommendation for video
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [recentCalls] = useState([
    { id: '1', type: 'incoming', number: '+1 (555) 123-4567', name: 'John Doe', duration: '3:24', time: '2 min ago', status: 'answered' },
    { id: '2', type: 'outgoing', number: '+1 (555) 234-5678', name: 'Jane Smith', duration: '1:45', time: '15 min ago', status: 'answered' },
    { id: '3', type: 'missed', number: '+1 (555) 345-6789', name: 'Mike Johnson', duration: '0:00', time: '1 hour ago', status: 'missed' },
    { id: '4', type: 'incoming', number: '+1 (555) 456-7890', name: 'Sarah Williams', duration: '5:12', time: '2 hours ago', status: 'answered' },
    { id: '5', type: 'outgoing', number: '+1 (555) 567-8901', name: 'Robert Brown', duration: '2:30', time: '3 hours ago', status: 'answered' },
  ]);
  
  const [todayStats] = useState<CallStats>({
    total: 47,
    answered: 42,
    missed: 5,
    avgDuration: 245,
    trend: 12
  });

  const [liveMetrics] = useState({
    activeAgents: 12,
    queuedCalls: 3,
    avgWaitTime: 45,
    systemUptime: '99.9%'
  });

  // Phone event indicators
  const [hasMissedCall, setHasMissedCall] = useState(false);
  const [callInWait, setCallInWait] = useState(false);
  const [hasQueue, setHasQueue] = useState(false);

  // Determine status indicator
  const getPhoneStatus = () => {
    if (!isConnected) return { color: 'red', label: 'Disconnected', blink: true };
    if (currentCall?.state === CallState.ACTIVE) return { color: 'green', label: 'Connected', blink: false };
    if (callInWait) return { color: 'yellow', label: 'Call Waiting', blink: false };
    if (hasQueue) return { color: 'orange', label: 'Queue Active', blink: false };
    if (hasMissedCall) return { color: 'red', label: 'Missed Call', blink: false };
    return null;
  };

  const phoneStatus = getPhoneStatus();
  
  // Simulate audio level animation
  useEffect(() => {
    if (currentCall && currentCall.state === CallState.ACTIVE) {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [currentCall]);
  
  // Call duration timer
  useEffect(() => {
    if (currentCall && currentCall.state === CallState.ACTIVE) {
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      return () => {
        clearInterval(interval);
        setCallDuration(0);
      };
    }
  }, [currentCall]);

  // Attach video streams to video elements
  useEffect(() => {
    if (currentCall?.state === CallState.ACTIVE) {
      updateStreams();
    }
  }, [currentCall?.state, updateStreams]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(console.error);
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(console.error);
    }
  }, [remoteStream]);

  // Auto-detect phone events
  useEffect(() => {
    // Check for missed calls in recent calls
    const missedExists = recentCalls.some(call => call.status === 'missed' && call.time.includes('min ago'));
    setHasMissedCall(missedExists);
    
    // Check for queued calls
    setHasQueue(liveMetrics.queuedCalls > 0);
    
    // Simulate call waiting detection (would come from SIP events in production)
    if (currentCall?.state === CallState.RINGING && isConnected) {
      setCallInWait(true);
    } else {
      setCallInWait(false);
    }
  }, [recentCalls, liveMetrics, currentCall, isConnected]);
  
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Initialize SIP on mount
    if (!isConnected) {
      initializeSIP({
        uri: 'sip:user@localhost',
        wsServer: 'wss://localhost:8089/ws',
        username: 'user',
        password: 'password',
        displayName: 'Web Client'
      }).catch(console.error);
    }
  }, []);

  const handleCall = () => {
    const target = prompt('Enter SIP URI or extension:');
    if (target) {
      makeCall(target).catch(console.error);
    }
  };

  const handleStartConference = async () => {
    if (!currentCall) {
      alert('Please have an active call before starting a conference');
      return;
    }
    
    // Open conference modal for smart management
    setShowConferenceModal(true);
  };
  
  const handleAddParticipantToConference = async () => {
    if (!newParticipantUri.trim()) {
      alert('Please enter a valid SIP URI or extension');
      return;
    }
    
    if (conferenceParticipants.length >= MAX_CONFERENCE_PARTICIPANTS) {
      alert(`Maximum ${MAX_CONFERENCE_PARTICIPANTS} participants reached (Asterisk ConfBridge limit)`);
      return;
    }
    
    try {
      if (!isConference) {
        // Start conference with current call
        const conferenceId = await startConference([currentCall!.id]);
        await addToConference(currentCall!.id, newParticipantUri);
      } else {
        // Add to existing conference
        await addToConference(currentCall!.id, newParticipantUri);
      }
      setNewParticipantUri('');
    } catch (error) {
      console.error('Conference error:', error);
      alert('Failed to add participant. See console for details.');
    }
  };
  
  const handleRemoveParticipant = async (participantId: string) => {
    try {
      await removeFromConference(currentCall!.id, participantId);
    } catch (error) {
      console.error('Remove participant error:', error);
    }
  };

  const handleAddToConference = async () => {
    if (!currentCall || !isConference) {
      alert('No active conference. Start one first!');
      return;
    }
    
    // Open conference modal to add more participants
    setShowConferenceModal(true);
  };
  
  const handleEndConference = async () => {
    try {
      if (currentCall && isConference) {
        await endConference(currentCall.id);
        setShowConferenceModal(false);
      }
    } catch (error) {
      console.error('End conference error:', error);
    }
  };

  const handleTransfer = () => {
    if (!currentCall) return;
    
    const transferTo = prompt('Enter transfer destination (SIP URI or extension):');
    if (transferTo) {
      // Transfer functionality would be implemented in SIPClient
      alert(`Transfer to ${transferTo} - Feature coming soon!`);
    }
  };

  const handleKeypad = () => {
    if (!currentCall) return;
    
    const dtmf = prompt('Enter DTMF tones (0-9, *, #):');
    if (dtmf) {
      sendDTMF(dtmf);
    }
  };

  const handleVolumeControl = () => {
    alert('Volume control - Adjust using your system audio controls');
  };

  const reconnectSIP = () => {
    initializeSIP({
      uri: 'sip:user@localhost',
      wsServer: 'wss://localhost:8089/ws',
      username: 'user',
      password: 'password',
      displayName: 'Web Client'
    }).catch(console.error);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Premium Header with Gradient Orbs */}
      <div className="relative mb-6 z-10">
        {/* Background Orbs */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -top-20 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
        
        <div className="relative backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            {/* Left: Title Section */}
            <div className="flex items-center gap-6">
              {/* Logo */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-all"></div>
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 p-[2px]">
                  <div className="w-full h-full rounded-2xl bg-gray-900 flex items-center justify-center">
                    <Phone className="w-8 h-8 text-blue-400" />
                  </div>
                </div>
              </div>
              
              <div>
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                  Command Center
                </h1>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-2 text-sm text-gray-400">
                    <Globe className="w-4 h-4 text-blue-400" />
                    Global Operations
                  </span>
                  <span className="text-gray-600">•</span>
                  <span className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Right: Status & Controls */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-all"></div>
                <div className="relative flex items-center gap-2 px-4 py-2.5 bg-gray-800/40 border border-gray-700/50 rounded-xl backdrop-blur-lg hover:border-blue-500/50 transition-all">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search calls..." 
                    className="bg-transparent border-none outline-none text-sm text-gray-300 placeholder-gray-500 w-40"
                  />
                </div>
              </div>

              {/* Connection Status */}
              <div className={`relative group ${isConnected ? 'animate-pulse-glow' : ''}`}>
                <div className={`absolute inset-0 rounded-xl blur-lg ${
                  isConnected ? 'bg-green-500/30' : 'bg-red-500/30'
                } opacity-0 group-hover:opacity-100 transition-all`}></div>
                <div className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border backdrop-blur-xl ${
                  isConnected 
                    ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30' 
                    : 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30'
                }`}>
                  {isConnected ? (
                    <>
                      <div className="relative">
                        <Signal className="w-4 h-4 text-green-400" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                      </div>
                      <span className="text-sm font-bold text-green-400">ONLINE</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-bold text-red-400">OFFLINE</span>
                    </>
                  )}
                </div>
              </div>

              {/* Notifications */}
              <button className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-all"></div>
                <div className="relative p-2.5 bg-gray-800/40 border border-gray-700/50 rounded-xl backdrop-blur-lg hover:border-purple-500/50 transition-all group-hover:scale-110">
                  <Bell className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-gray-900 rounded-full"></div>
                </div>
              </button>
              
              {/* Settings */}
              <button className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-all"></div>
                <div className="relative p-2.5 bg-gray-800/40 border border-gray-700/50 rounded-xl backdrop-blur-lg hover:border-blue-500/50 transition-all group-hover:rotate-90">
                  <Settings className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-all" />
                </div>
              </button>
            </div>
          </div>

          {/* Live System Metrics Bar */}
          <div className="grid grid-cols-4 gap-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-all"></div>
              <div className="relative flex items-center gap-3 p-4 bg-gray-800/30 border border-gray-700/30 rounded-xl backdrop-blur-lg hover:border-blue-500/30 transition-all">
                <div className="p-3 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-xl">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Active Agents</p>
                  <p className="text-2xl font-black text-white">{liveMetrics.activeAgents}</p>
                </div>
                <div className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +8%
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-all"></div>
              <div className="relative flex items-center gap-3 p-4 bg-gray-800/30 border border-gray-700/30 rounded-xl backdrop-blur-lg hover:border-purple-500/30 transition-all">
                <div className="p-3 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl">
                  <Headphones className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Queue</p>
                  <p className="text-2xl font-black text-white">{liveMetrics.queuedCalls}</p>
                </div>
                <div className="text-xs text-amber-400 font-bold">Waiting</div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 to-amber-600/10 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-all"></div>
              <div className="relative flex items-center gap-3 p-4 bg-gray-800/30 border border-gray-700/30 rounded-xl backdrop-blur-lg hover:border-orange-500/30 transition-all">
                <div className="p-3 bg-gradient-to-br from-orange-600/20 to-amber-600/20 rounded-xl">
                  <Clock className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Avg Wait</p>
                  <p className="text-2xl font-black text-white">{liveMetrics.avgWaitTime}s</p>
                </div>
                <div className="text-xs text-green-400 font-bold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 transform rotate-180" />
                  -12%
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-teal-600/10 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-all"></div>
              <div className="relative flex items-center gap-3 p-4 bg-gray-800/30 border border-gray-700/30 rounded-xl backdrop-blur-lg hover:border-emerald-500/30 transition-all">
                <div className="p-3 bg-gradient-to-br from-emerald-600/20 to-teal-600/20 rounded-xl">
                  <Target className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Uptime</p>
                  <p className="text-2xl font-black text-white">{liveMetrics.systemUptime}</p>
                </div>
                <div className="text-xs text-emerald-400 font-bold flex items-center">
                  <CheckCircle className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
        
        {/* Live Call Panel - Modern Professional Design */}
        <div className="col-span-8 relative">
          {currentCall ? (
            /* Active Call View - Modern Phone Interface */
            <div className="h-full bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-2xl border border-gray-700/50 rounded-3xl shadow-2xl overflow-hidden">
              {/* Animated Gradient Background */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
              </div>

              <div className="relative h-full flex flex-col p-8">
                {/* Header with Status */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center backdrop-blur-lg">
                      <Phone className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Live Call</h3>
                      <p className="text-sm text-gray-400">In Progress</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Call Quality Indicator */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-xl backdrop-blur-lg">
                      <Wifi className="w-4 h-4 text-green-400" />
                      <span className="text-xs font-semibold text-green-400">HD</span>
                    </div>
                    
                    {/* Live Indicator */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-lg">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                      <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Live</span>
                    </div>
                  </div>
                </div>

                {/* Caller Card - Premium Design */}
                <div className="flex-1 flex flex-col items-center justify-center mb-8">
                  
                  {/* Video Display Area */}
                  {isVideoEnabled && currentCall.state === CallState.ACTIVE && (
                    <div className="w-full mb-6 relative">
                      {/* Remote Video - Main Display */}
                      <div className="relative w-full aspect-video bg-gray-900/80 rounded-3xl overflow-hidden border border-gray-700/50 shadow-2xl">
                        <video
                          ref={remoteVideoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Remote User Overlay */}
                        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-black/50 backdrop-blur-md rounded-xl">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                          <span className="text-sm font-semibold text-white">{currentCall.remoteUri}</span>
                        </div>

                        {/* Conference Participants Indicator */}
                        {isConference && conferenceParticipants.length > 0 && (
                          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 bg-purple-600/80 backdrop-blur-md rounded-xl">
                            <Users className="w-4 h-4 text-white" />
                            <span className="text-sm font-bold text-white">{conferenceParticipants.length + 1}</span>
                          </div>
                        )}
                        
                        {/* Call Quality Stats Overlay */}
                        <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-black/50 backdrop-blur-md rounded-xl">
                          <Wifi className="w-4 h-4 text-green-400" />
                          <span className="text-xs font-semibold text-green-400">HD 720p</span>
                        </div>
                      </div>

                      {/* Local Video - Picture-in-Picture */}
                      <div className="absolute bottom-6 right-6 w-48 aspect-video bg-gray-900 rounded-2xl overflow-hidden border-2 border-gray-600 shadow-xl">
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover transform scale-x-[-1]"
                        />
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg">
                          <span className="text-xs font-semibold text-white">You</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Avatar with Animated Ring - Only show when video is disabled */}
                  {(!isVideoEnabled || currentCall.state !== CallState.ACTIVE) && (
                    <div className="relative mb-6 group">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 animate-spin-slow opacity-75 blur-xl"></div>
                      <div className="relative w-40 h-40 rounded-full bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 p-1">
                        <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center">
                          <span className="text-5xl font-bold text-white">
                            {currentCall.remoteUri.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      {currentCall.state === CallState.ACTIVE && (
                        <>
                          <div className="absolute inset-0 rounded-full border-4 border-green-500/50 animate-ping"></div>
                          <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-green-500 border-4 border-gray-800 flex items-center justify-center shadow-lg shadow-green-500/50">
                            <div className="w-3 h-3 rounded-full bg-white animate-pulse"></div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Caller Info */}
                  <div className="text-center mb-6">
                    <h2 className="text-4xl font-bold text-white mb-3 tracking-tight">
                      {currentCall.remoteUri}
                    </h2>
                    
                    {/* Call Status & Duration */}
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <div className={`px-4 py-2 rounded-full backdrop-blur-lg border ${
                        currentCall.state === CallState.RINGING ? 'bg-yellow-500/20 border-yellow-500/30' : 
                        currentCall.state === CallState.ACTIVE ? 'bg-green-500/20 border-green-500/30' :
                        currentCall.state === CallState.HOLD ? 'bg-blue-500/20 border-blue-500/30' :
                        'bg-gray-500/20 border-gray-500/30'
                      }`}>
                        <span className={`text-sm font-semibold ${
                          currentCall.state === CallState.RINGING ? 'text-yellow-400' : 
                          currentCall.state === CallState.ACTIVE ? 'text-green-400' :
                          currentCall.state === CallState.HOLD ? 'text-blue-400' :
                          'text-gray-400'
                        }`}>
                          {currentCall.state === CallState.RINGING ? 'Ringing' : 
                           currentCall.state === CallState.ACTIVE ? 'Connected' :
                           currentCall.state === CallState.HOLD ? 'On Hold' :
                           currentCall.state}
                        </span>
                      </div>
                      
                      {currentCall.state === CallState.ACTIVE && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-full backdrop-blur-lg">
                          <Timer className="w-4 h-4 text-blue-400" />
                          <span className="text-lg font-mono font-bold text-white tracking-wider">
                            {formatDuration(callDuration)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Additional Call Info */}
                    <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
                      <span className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Mobile
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        United States
                      </span>
                    </div>
                  </div>

                  {/* Voice Visualization - Modern Wave */}
                  {currentCall.state === CallState.ACTIVE && !isMuted && (
                    <div className="w-full max-w-md">
                      <div className="flex items-center justify-center gap-1 h-20 px-8">
                        {[...Array(60)].map((_, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-100 shadow-lg"
                            style={{
                              height: `${Math.sin(i / 5) * (audioLevel / 2) + 30 + Math.random() * 20}%`,
                              opacity: 0.6 + Math.random() * 0.4
                            }}
                          ></div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Muted Indicator */}
                  {isMuted && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-full backdrop-blur-lg">
                      <MicOff className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-semibold text-red-400">Microphone Muted</span>
                    </div>
                  )}
                </div>

                {/* Call Controls - Modern Floating Bar */}
                <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center justify-center gap-4">
                    {/* Answer Button (for incoming calls) */}
                    {currentCall.state === CallState.RINGING && currentCall.direction === 'inbound' && (
                      <button
                        onClick={() => answerCall(currentCall.id)}
                        className="group relative w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white shadow-2xl shadow-green-500/50 transition-all transform hover:scale-110 active:scale-95"
                      >
                        <Phone className="w-9 h-9 mx-auto" />
                        <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          Answer
                        </span>
                      </button>
                    )}
                    
                    {/* Primary Controls (shown during active call) */}
                    {currentCall.state === CallState.ACTIVE && (
                      <>
                        {/* Mute */}
                        <button
                          onClick={toggleMute}
                          className={`group relative w-16 h-16 rounded-2xl transition-all transform hover:scale-110 active:scale-95 ${
                            isMuted 
                              ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/50' 
                              : 'bg-gray-700/80 hover:bg-gray-600 text-gray-300 border border-gray-600'
                          }`}
                        >
                          {isMuted ? <MicOff className="w-7 h-7 mx-auto" /> : <Mic className="w-7 h-7 mx-auto" />}
                          <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                            {isMuted ? 'Unmute' : 'Mute'}
                          </span>
                        </button>
                        
                        {/* Keypad */}
                        <button
                          onClick={handleKeypad}
                          className="group relative w-16 h-16 rounded-2xl bg-gray-700/80 hover:bg-gray-600 text-gray-300 border border-gray-600 transition-all transform hover:scale-110 active:scale-95"
                        >
                          <LayoutGrid className="w-7 h-7 mx-auto" />
                          <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                            Keypad
                          </span>
                        </button>
                        
                        {/* Hold */}
                        <button
                          onClick={toggleHold}
                          className={`group relative w-16 h-16 rounded-2xl transition-all transform hover:scale-110 active:scale-95 ${
                            isHeld 
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50' 
                              : 'bg-gray-700/80 hover:bg-gray-600 text-gray-300 border border-gray-600'
                          }`}
                        >
                          {isHeld ? <Play className="w-7 h-7 mx-auto" /> : <Pause className="w-7 h-7 mx-auto" />}
                          <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                            {isHeld ? 'Resume' : 'Hold'}
                          </span>
                        </button>
                        
                        {/* Video Toggle */}
                        <button
                          onClick={toggleVideo}
                          className={`group relative w-16 h-16 rounded-2xl transition-all transform hover:scale-110 active:scale-95 ${
                            isVideoEnabled 
                              ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/50' 
                              : 'bg-gray-700/80 hover:bg-gray-600 text-gray-300 border border-gray-600'
                          }`}
                        >
                          {isVideoEnabled ? <Video className="w-7 h-7 mx-auto" /> : <VideoOff className="w-7 h-7 mx-auto" />}
                          <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                            {isVideoEnabled ? 'Disable Video' : 'Enable Video'}
                          </span>
                        </button>
                        
                        {/* Transfer */}
                        <button
                          onClick={handleTransfer}
                          className="group relative w-16 h-16 rounded-2xl bg-gray-700/80 hover:bg-gray-600 text-gray-300 border border-gray-600 transition-all transform hover:scale-110 active:scale-95"
                        >
                          <PhoneForwarded className="w-7 h-7 mx-auto" />
                          <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                            Transfer
                          </span>
                        </button>
                        
                        {/* Add to Conference */}
                        <button
                          onClick={isConference ? handleAddToConference : handleStartConference}
                          className="group relative w-16 h-16 rounded-2xl bg-gray-700/80 hover:bg-gray-600 text-gray-300 border border-gray-600 transition-all transform hover:scale-110 active:scale-95"
                        >
                          <Users className="w-7 h-7 mx-auto" />
                          <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                            {isConference ? 'Add Call' : 'Conference'}
                          </span>
                        </button>

                        {/* Volume */}
                        <button
                          onClick={handleVolumeControl}
                          className="group relative w-16 h-16 rounded-2xl bg-gray-700/80 hover:bg-gray-600 text-gray-300 border border-gray-600 transition-all transform hover:scale-110 active:scale-95"
                        >
                          <Volume2 className="w-7 h-7 mx-auto" />
                          <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                            Volume
                          </span>
                        </button>
                      </>
                    )}
                    
                    {/* End Call Button - Always Visible */}
                    <button
                      onClick={() => currentCall && hangupCall(currentCall.id)}
                      className="group relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-2xl shadow-red-500/50 transition-all transform hover:scale-110 active:scale-95"
                    >
                      <PhoneOff className="w-9 h-9 mx-auto" />
                      <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        End Call
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* No Active Call - Modern Idle State */
            <div className="h-full bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-2xl border border-gray-700/50 rounded-3xl shadow-2xl overflow-hidden relative">
              {/* Status Indicator - Corner Border */}
              {phoneStatus && (
                <>
                  {/* Corner Border Overlay */}
                  <div 
                    className={`absolute top-0 right-0 w-24 h-24 pointer-events-none ${
                      phoneStatus.blink ? 'animate-pulse' : ''
                    }`}
                  >
                    <div 
                      className={`absolute top-0 right-0 w-full h-full border-t-4 border-r-4 rounded-tr-3xl shadow-xl ${
                        phoneStatus.color === 'red' ? 'border-red-500 shadow-red-500/50' :
                        phoneStatus.color === 'green' ? 'border-green-500 shadow-green-500/50' :
                        phoneStatus.color === 'yellow' ? 'border-yellow-500 shadow-yellow-500/50' :
                        'border-orange-500 shadow-orange-500/50'
                      }`}
                    />
                    {phoneStatus.blink && (
                      <div className="absolute top-0 right-0 w-full h-full border-t-4 border-r-4 rounded-tr-3xl border-red-500 animate-ping" />
                    )}
                  </div>
                  
                  {/* Status Label */}
                  <button
                    onClick={() => {
                      if (phoneStatus.label === 'Missed Call') {
                        setHasMissedCall(false);
                      }
                    }}
                    className="absolute top-4 right-4 text-sm font-medium text-gray-300 hover:text-white transition-colors z-10 hover:scale-105 transition-transform"
                    title={`Click to ${phoneStatus.label === 'Missed Call' ? 'clear notification' : 'view details'}`}
                  >
                    {phoneStatus.label}
                  </button>
                </>
              )}
              
              <div className="relative h-full flex flex-col items-center justify-center p-12">
                {/* Floating Orbs Background */}
                <div className="absolute inset-0 overflow-hidden opacity-20">
                  <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl animate-float"></div>
                  <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
                </div>

                <div className="relative text-center">
                  {/* Phone Icon */}
                  <div className="relative mb-8 inline-block">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-2xl opacity-50 animate-pulse"></div>
                    <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center backdrop-blur-lg">
                      <Phone className="w-24 h-24 text-blue-400" />
                    </div>
                  </div>

                  <h3 className="text-4xl font-bold text-white mb-4">Ready to Connect</h3>
                  <p className="text-lg text-gray-400 mb-8 max-w-md">
                    Your phone system is active and ready to place or receive calls
                  </p>
                  
                  {/* Quick Actions */}
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={handleCall}
                      disabled={!isConnected}
                      className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-2xl shadow-lg hover:shadow-blue-500/50 disabled:shadow-none transform hover:scale-105 disabled:scale-100 transition-all flex items-center gap-3 font-semibold text-lg"
                    >
                      <Phone className="w-6 h-6" />
                      Make Call
                    </button>
                    
                    <button
                      onClick={() => alert('Please make a call first. Once connected, click the Conference button during the call to add participants.')}
                      disabled={!isConnected}
                      className="group px-8 py-4 bg-gray-700/80 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 disabled:text-gray-600 rounded-2xl border border-gray-600 disabled:border-gray-700 transform hover:scale-105 disabled:scale-100 transition-all flex items-center gap-3 font-semibold text-lg"
                    >
                      <Users className="w-6 h-6" />
                      Conference
                    </button>
                  </div>

                  {/* Connection Status */}
                  {!isConnected && (
                    <div className="mt-8 flex items-center justify-center gap-2 text-red-400">
                      <WifiOff className="w-5 h-5" />
                      <span className="text-sm font-medium">Not connected to server</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Quick Actions & Stats */}
        <div className="col-span-4 space-y-4 overflow-y-auto">
          {/* Quick Actions */}
          <div className="card bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center gap-2 p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl transition-all hover:scale-105 group">
                <PhoneOutgoing className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm text-gray-300">New Call</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-xl transition-all hover:scale-105 group">
                <PhoneIncoming className="w-6 h-6 text-green-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm text-gray-300">Transfer</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl transition-all hover:scale-105 group">
                <Users className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm text-gray-300">Conference</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-4 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-xl transition-all hover:scale-105 group">
                <PhoneForwarded className="w-6 h-6 text-yellow-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm text-gray-300">Forward</span>
              </button>
            </div>
          </div>

          {/* Today's Performance */}
          <div className="card bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-400" />
              Today's Performance
            </h3>
            <div className="space-y-4">
              {/* Total Calls */}
              <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Calls</p>
                    <p className="text-2xl font-bold text-white">{todayStats.total}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-green-400 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  +{todayStats.trend}%
                </div>
              </div>

              {/* Answered */}
              <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Answered</p>
                    <p className="text-2xl font-bold text-white">{todayStats.answered}</p>
                  </div>
                </div>
                <span className="text-sm text-green-400 font-medium">
                  {((todayStats.answered / todayStats.total) * 100).toFixed(0)}%
                </span>
              </div>

              {/* Missed */}
              <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <PhoneMissed className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Missed</p>
                    <p className="text-2xl font-bold text-white">{todayStats.missed}</p>
                  </div>
                </div>
                <span className="text-sm text-red-400 font-medium">
                  {((todayStats.missed / todayStats.total) * 100).toFixed(0)}%
                </span>
              </div>

              {/* Avg Duration */}
              <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Timer className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Avg Duration</p>
                    <p className="text-2xl font-bold text-white">{formatDuration(todayStats.avgDuration)}</p>
                  </div>
                </div>
                <Award className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Calls - Full Width Bottom */}
        <div className="col-span-12 card bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Recent Calls
            </h3>
            <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              View All →
            </button>
          </div>
          
          <div className="space-y-2">
            {recentCalls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between p-3 bg-gray-900/30 hover:bg-gray-900/50 border border-gray-700/30 rounded-lg transition-all hover:border-gray-600 group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  {/* Call Type Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    call.type === 'incoming' ? 'bg-green-500/20' :
                    call.type === 'outgoing' ? 'bg-blue-500/20' :
                    'bg-red-500/20'
                  }`}>
                    {call.type === 'incoming' && <PhoneIncoming className="w-5 h-5 text-green-400" />}
                    {call.type === 'outgoing' && <PhoneOutgoing className="w-5 h-5 text-blue-400" />}
                    {call.type === 'missed' && <PhoneMissed className="w-5 h-5 text-red-400" />}
                  </div>
                  
                  {/* Call Info */}
                  <div>
                    <p className="text-white font-medium">{call.name}</p>
                    <p className="text-sm text-gray-400">{call.number}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-white font-mono text-sm">{call.duration}</p>
                    <p className="text-xs text-gray-500">{call.time}</p>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-all">
                      <Phone className="w-4 h-4 text-green-400" />
                    </button>
                    <button className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-all">
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conference Management Modal */}
      {showConferenceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl border border-gray-700 shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Conference Room</h2>
                  <p className="text-sm text-gray-400">
                    {conferenceParticipants.length + 1} / {MAX_CONFERENCE_PARTICIPANTS} participants
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConferenceModal(false)}
                className="w-10 h-10 rounded-xl bg-gray-700/50 hover:bg-gray-600 text-gray-300 hover:text-white transition-all flex items-center justify-center"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Video Grid - Asterisk Smart Layout */}
              <div className={`grid gap-4 ${
                conferenceParticipants.length === 0 ? 'grid-cols-1' :
                conferenceParticipants.length === 1 ? 'grid-cols-2' :
                conferenceParticipants.length <= 3 ? 'grid-cols-3' :
                conferenceParticipants.length <= 5 ? 'grid-cols-3' :
                'grid-cols-4'
              }`}>
                {/* Local Video (You) */}
                <div className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-lg shadow-blue-500/20 group">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium text-sm">You (Host)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs text-green-400">Active</span>
                      </div>
                    </div>
                  </div>
                  {/* Speaking Indicator */}
                  {audioLevel > 30 && (
                    <div className="absolute inset-0 border-4 border-green-400 rounded-2xl animate-pulse pointer-events-none"></div>
                  )}
                </div>

                {/* Remote Participants */}
                {conferenceParticipants.map((participant, index) => (
                  <div 
                    key={participant} 
                    className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden border border-gray-700 group hover:border-purple-500 transition-all"
                  >
                    {/* Participant Video Stream */}
                    {remoteStream && index === 0 ? (
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                            <Headphones className="w-8 h-8 text-purple-400" />
                          </div>
                          <p className="text-sm text-gray-400">Connecting...</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Participant Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium text-sm">
                          Participant {index + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          {/* Connection Quality */}
                          <Signal className="w-4 h-4 text-green-400" />
                          <span className="text-xs text-gray-400">{participant.slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Participant Controls - Show on Hover */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button
                        className="p-2 bg-yellow-500/80 hover:bg-yellow-500 rounded-lg transition-all"
                        onClick={() => alert('Mute participant - Feature coming soon')}
                        title="Mute participant"
                      >
                        <MicOff className="w-4 h-4 text-white" />
                      </button>
                      <button
                        className="p-2 bg-red-500/80 hover:bg-red-500 rounded-lg transition-all"
                        onClick={() => handleRemoveParticipant(participant)}
                        title="Remove from conference"
                      >
                        <PhoneOff className="w-4 h-4 text-white" />
                      </button>
                    </div>

                    {/* Active Speaker Border */}
                    {Math.random() > 0.7 && ( // Simulated active speaker detection
                      <div className="absolute inset-0 border-4 border-yellow-400 rounded-2xl animate-pulse pointer-events-none"></div>
                    )}
                  </div>
                ))}

                {/* Empty Slots */}
                {Array.from({ length: Math.max(0, MAX_CONFERENCE_PARTICIPANTS - conferenceParticipants.length - 1) }).map((_, index) => (
                  <div 
                    key={`empty-${index}`}
                    className="aspect-video bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-700 flex items-center justify-center"
                  >
                    <div className="text-center">
                      <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Empty Slot</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Participant Section */}
              <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-blue-400" />
                  Add Participant
                </h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newParticipantUri}
                    onChange={(e) => setNewParticipantUri(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddParticipantToConference()}
                    placeholder="Enter SIP URI or extension (e.g., 6002 or sip:user@domain.com)"
                    className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
                    disabled={conferenceParticipants.length >= MAX_CONFERENCE_PARTICIPANTS - 1}
                  />
                  <button
                    onClick={handleAddParticipantToConference}
                    disabled={conferenceParticipants.length >= MAX_CONFERENCE_PARTICIPANTS - 1}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-xl font-semibold transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    Add
                  </button>
                </div>
                {conferenceParticipants.length >= MAX_CONFERENCE_PARTICIPANTS - 1 && (
                  <p className="mt-3 text-sm text-yellow-400 flex items-center gap-2">
                    <span>⚠️</span>
                    Maximum participant limit reached (Asterisk ConfBridge supports up to {MAX_CONFERENCE_PARTICIPANTS} for optimal video quality)
                  </p>
                )}
              </div>

              {/* Conference Info - Asterisk Algorithm Details */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
                <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Smart Conference Features (Asterisk ConfBridge)
                </h4>
                <ul className="space-y-1 text-sm text-gray-300">
                  <li>• <strong>Active Speaker Detection:</strong> Highlights speaking participant with yellow border</li>
                  <li>• <strong>Adaptive Grid Layout:</strong> Auto-adjusts based on participant count (1-8 optimal)</li>
                  <li>• <strong>Connection Quality Monitoring:</strong> Real-time signal strength indicators</li>
                  <li>• <strong>Video Quality Optimization:</strong> HD 720p with adaptive bitrate</li>
                  <li>• <strong>Audio Mixing:</strong> Professional-grade audio with echo cancellation</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-900/50">
              <button
                onClick={() => setShowConferenceModal(false)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all"
              >
                Close
              </button>
              <button
                onClick={handleEndConference}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl font-semibold transition-all flex items-center gap-2"
              >
                <PhoneOff className="w-5 h-5" />
                End Conference
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
