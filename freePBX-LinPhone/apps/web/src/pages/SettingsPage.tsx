import { useState } from 'react';
import {
  Settings, Phone, Users, MessageSquare, Voicemail, User,
  Clock, BarChart3, Bell, Palette, Volume2,
  Mic, Mail, Download, Upload, Save,
  Flag, X, Plus, Trash2, Edit3,
  RefreshCw, Lock, Eye, EyeOff, Server, Database,
  Headphones, Radio, Waves, Signal, CheckCircle,
  Zap, Share2, Play
} from 'lucide-react';

type SettingsTab = 'sip' | 'calls' | 'contacts' | 'messages' | 'voicemail' | 
  'agents' | 'queues' | 'analytics' | 'appearance' | 'notifications' | 'advanced';

interface SIPAccount {
  id: string;
  name: string;
  uri: string;
  server: string;
  username: string;
  password: string;
  status: 'connected' | 'disconnected' | 'connecting';
  primary: boolean;
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('sip');
  const [showPassword, setShowPassword] = useState(false);

  // Sample SIP accounts
  const [sipAccounts] = useState<SIPAccount[]>([
    {
      id: '1',
      name: 'Primary Account',
      uri: 'sip:user@pbx.company.com',
      server: 'wss://pbx.company.com:8089/ws',
      username: 'user123',
      password: '••••••••',
      status: 'connected',
      primary: true
    }
  ]);

  const tabs = [
    { id: 'sip', label: 'SIP Accounts', icon: Phone, color: 'blue', description: 'Core PBX configuration' },
    { id: 'calls', label: 'Call Settings', icon: Phone, color: 'green', description: 'Call behavior & audio' },
    { id: 'contacts', label: 'Contacts', icon: User, color: 'purple', description: 'Contact management' },
    { id: 'messages', label: 'Messages', icon: MessageSquare, color: 'pink', description: 'SMS & Email integration' },
    { id: 'voicemail', label: 'Voicemail', icon: Voicemail, color: 'blue', description: 'Voicemail preferences' },
    { id: 'agents', label: 'Agents', icon: Users, color: 'orange', description: 'Agent configuration' },
    { id: 'queues', label: 'Queues', icon: Clock, color: 'yellow', description: 'Queue management' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'indigo', description: 'Reports & dashboards' },
    { id: 'appearance', label: 'Appearance', icon: Palette, color: 'rose', description: 'Theme & layout' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'red', description: 'Alerts & sounds' },
    { id: 'advanced', label: 'Advanced', icon: Settings, color: 'gray', description: 'System settings' }
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Settings className="text-blue-500" size={40} />
              Settings & Configuration
            </h1>
            <p className="text-gray-400">Configure all aspects of your SIP phone system</p>
          </div>
          <button className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-green-500/50 flex items-center gap-2">
            <Save size={20} />
            Save All Changes
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`relative p-4 rounded-xl border backdrop-blur-lg transition-all duration-300 hover:scale-105 ${
                isActive
                  ? `bg-gradient-to-br from-${tab.color}-600/20 to-${tab.color}-500/10 border-${tab.color}-500 shadow-lg shadow-${tab.color}-500/20`
                  : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <Icon 
                  className={isActive ? `text-${tab.color}-400` : 'text-gray-400'} 
                  size={24} 
                />
                <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </div>
              {isActive && (
                <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-${tab.color}-500 rounded-full`}></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-2xl p-8">
        {/* SIP Accounts Tab */}
        {activeTab === 'sip' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <Phone className="text-blue-500" />
                  SIP Account Configuration
                </h2>
                <p className="text-gray-400">Core PBX settings - Configure your SIP accounts and connections</p>
              </div>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center gap-2">
                <Plus size={18} />
                Add Account
              </button>
            </div>

            {/* SIP Accounts List */}
            {sipAccounts.map((account) => (
              <div key={account.id} className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${
                      account.status === 'connected' ? 'bg-green-600/20' :
                      account.status === 'connecting' ? 'bg-yellow-600/20' :
                      'bg-red-600/20'
                    }`}>
                      <Phone className={
                        account.status === 'connected' ? 'text-green-500' :
                        account.status === 'connecting' ? 'text-yellow-500' :
                        'text-red-500'
                      } size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold text-white">{account.name}</h3>
                        {account.primary && (
                          <span className="px-2 py-1 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs rounded-full font-semibold">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-sm ${
                          account.status === 'connected' ? 'text-green-400' :
                          account.status === 'connecting' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          <Signal size={14} />
                          {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-400 text-sm">{account.uri}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-gray-700 rounded-lg transition-all">
                      <Edit3 className="text-gray-400" size={18} />
                    </button>
                    <button className="p-2 hover:bg-gray-700 rounded-lg transition-all">
                      <Trash2 className="text-red-400" size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Connection Settings */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                      <Server size={16} />
                      Connection Settings
                    </h4>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">SIP URI</label>
                      <input 
                        type="text" 
                        value={account.uri}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">WebSocket Server</label>
                      <input 
                        type="text" 
                        value={account.server}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Display Name</label>
                      <input 
                        type="text" 
                        value={account.name}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Authentication */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                      <Lock size={16} />
                      Authentication
                    </h4>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Username</label>
                      <input 
                        type="text" 
                        value={account.username}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Password</label>
                      <div className="relative">
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          value={account.password}
                          className="w-full px-4 py-3 pr-12 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Auth Username (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="Leave empty if same as username"
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Advanced SIP Options */}
                <details className="mt-6">
                  <summary className="cursor-pointer text-blue-400 hover:text-blue-300 font-medium flex items-center gap-2">
                    <Settings size={16} />
                    Advanced SIP Options
                  </summary>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Transport Protocol</label>
                      <select className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>WSS (Secure WebSocket)</option>
                        <option>WS (WebSocket)</option>
                        <option>UDP</option>
                        <option>TCP</option>
                        <option>TLS</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Registration Expiry (seconds)</label>
                      <input 
                        type="number" 
                        defaultValue="600"
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">ICE Servers</label>
                      <input 
                        type="text" 
                        placeholder="stun:stun.l.google.com:19302"
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </details>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <button className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2">
                    <RefreshCw size={18} />
                    Test Connection
                  </button>
                  <button className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2">
                    <Save size={18} />
                    Save Account
                  </button>
                </div>
              </div>
            ))}

            {/* Audio Codecs */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Waves className="text-green-500" />
                Audio Codecs Priority
              </h3>
              <p className="text-gray-400 text-sm mb-4">Drag to reorder codec priority</p>
              
              <div className="space-y-2">
                {[
                  { name: 'G.722', quality: 'HD Audio', bitrate: '64 kbps', enabled: true },
                  { name: 'Opus', quality: 'Adaptive', bitrate: '6-510 kbps', enabled: true },
                  { name: 'PCMU (G.711μ)', quality: 'Standard', bitrate: '64 kbps', enabled: true },
                  { name: 'PCMA (G.711a)', quality: 'Standard', bitrate: '64 kbps', enabled: true },
                  { name: 'G.729', quality: 'Compressed', bitrate: '8 kbps', enabled: false }
                ].map((codec, index) => (
                  <div key={codec.name} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600 hover:border-gray-500 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-gray-500 text-xs">#{index + 1}</span>
                        <div className="flex flex-col gap-1">
                          <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                          <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                          <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        </div>
                      </div>
                      <div>
                        <p className="text-white font-semibold">{codec.name}</p>
                        <p className="text-sm text-gray-400">{codec.quality} • {codec.bitrate}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={codec.enabled} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Call Settings Tab */}
        {activeTab === 'calls' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Phone className="text-green-500" />
                Call Settings
              </h2>
              <p className="text-gray-400">Configure call behavior, audio devices, and call features</p>
            </div>

            {/* Call Behavior */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Phone className="text-green-500" />
                Call Behavior
              </h3>
              
              <div className="space-y-4">
                {[
                  { label: 'Auto-Answer Calls', description: 'Automatically answer incoming calls', enabled: false },
                  { label: 'Call Waiting', description: 'Allow call waiting notifications', enabled: true },
                  { label: 'Do Not Disturb', description: 'Block all incoming calls', enabled: false },
                  { label: 'Auto-Record Calls', description: 'Automatically record all calls', enabled: false },
                  { label: 'Call Transfer Enabled', description: 'Allow call transfers', enabled: true },
                  { label: 'Conference Calls', description: 'Enable conference calling', enabled: true }
                ].map((setting) => (
                  <div key={setting.label} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{setting.label}</p>
                      <p className="text-sm text-gray-400">{setting.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={setting.enabled} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Audio Devices */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Headphones className="text-blue-500" />
                Audio Devices
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <Mic size={16} />
                    Microphone Input
                  </label>
                  <select className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Default - Built-in Microphone</option>
                    <option>USB Headset</option>
                    <option>Bluetooth Device</option>
                  </select>
                  <button className="mt-2 text-sm text-blue-400 hover:text-blue-300">Test Microphone</button>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <Volume2 size={16} />
                    Speaker Output
                  </label>
                  <select className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Default - Built-in Speakers</option>
                    <option>USB Headset</option>
                    <option>Bluetooth Device</option>
                  </select>
                  <button className="mt-2 text-sm text-blue-400 hover:text-blue-300">Test Speakers</button>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Ring Tone</label>
                  <select className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Classic Ring</option>
                    <option>Modern Tone</option>
                    <option>Beep Beep</option>
                    <option>Silent</option>
                    <option>Custom...</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Ring Volume</label>
                  <input type="range" min="0" max="100" defaultValue="80" className="w-full accent-green-500" />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Silent</span>
                    <span>80%</span>
                    <span>Loud</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Call Forward */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Share2 className="text-purple-500" />
                Call Forwarding
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Forward All Calls To</label>
                  <input 
                    type="text" 
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Forward When Busy</label>
                  <input 
                    type="text" 
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Forward When No Answer</label>
                  <input 
                    type="text" 
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contacts Settings Tab */}
        {activeTab === 'contacts' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <User className="text-purple-500" />
                Contact Settings
              </h2>
              <p className="text-gray-400">Configure contact management and auto-capture settings</p>
            </div>

            {/* Auto-Capture Settings */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Zap className="text-yellow-500" />
                Auto-Capture Contacts
              </h3>
              
              <div className="space-y-4">
                {[
                  { label: 'Capture from Incoming Emails', description: 'Automatically extract contact info from emails', enabled: true },
                  { label: 'Capture from Incoming SMS', description: 'Save phone numbers from text messages', enabled: true },
                  { label: 'Capture from Incoming Calls', description: 'Add caller IDs to address book', enabled: true },
                  { label: 'Auto-Generate Avatars', description: 'Create profile pictures for new contacts', enabled: true },
                  { label: 'Deduplicate Contacts', description: 'Merge duplicate contact entries automatically', enabled: true }
                ].map((setting) => (
                  <div key={setting.label} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{setting.label}</p>
                      <p className="text-sm text-gray-400">{setting.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={setting.enabled} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Default Settings */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-6">Default Contact Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <Flag size={16} />
                    Default Country Code
                  </label>
                  <select className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>🇺🇸 United States (+1)</option>
                    <option>🇬🇧 United Kingdom (+44)</option>
                    <option>🇨🇦 Canada (+1)</option>
                    <option>🇦🇺 Australia (+61)</option>
                    <option>🇮🇳 India (+91)</option>
                    <option>🇩🇪 Germany (+49)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Phone Number Format</label>
                  <select className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>International (+1 555-123-4567)</option>
                    <option>National ((555) 123-4567)</option>
                    <option>Compact (5551234567)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Contact Sort Order</label>
                  <select className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>First Name, Last Name</option>
                    <option>Last Name, First Name</option>
                    <option>Recently Added</option>
                    <option>Most Contacted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Default View</label>
                  <select className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Grid View</option>
                    <option>List View</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Import/Export */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Database className="text-blue-500" />
                Import & Export
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="p-6 bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600 hover:border-blue-500 rounded-lg transition-all flex flex-col items-center gap-3">
                  <Upload className="text-blue-400" size={32} />
                  <div className="text-center">
                    <p className="text-white font-semibold">Import Contacts</p>
                    <p className="text-sm text-gray-400">CSV, vCard, or JSON</p>
                  </div>
                </button>

                <button className="p-6 bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600 hover:border-green-500 rounded-lg transition-all flex flex-col items-center gap-3">
                  <Download className="text-green-400" size={32} />
                  <div className="text-center">
                    <p className="text-white font-semibold">Export Contacts</p>
                    <p className="text-sm text-gray-400">Backup all contacts</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages Settings Tab */}
        {activeTab === 'messages' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <MessageSquare className="text-pink-500" />
                Message & Email Settings
              </h2>
              <p className="text-gray-400">Configure SMS and email integration settings</p>
            </div>

            {/* Email Integration */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Mail className="text-purple-500" />
                Email Integration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Incoming Mail (IMAP)</h4>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">IMAP Server</label>
                    <input 
                      type="text" 
                      placeholder="imap.gmail.com"
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Port</label>
                    <input 
                      type="number" 
                      defaultValue="993"
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="support@company.com"
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Password</label>
                    <input 
                      type="password" 
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider">Outgoing Mail (SMTP)</h4>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">SMTP Server</label>
                    <input 
                      type="text" 
                      placeholder="smtp.gmail.com"
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Port</label>
                    <input 
                      type="number" 
                      defaultValue="587"
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">From Name</label>
                    <input 
                      type="text" 
                      placeholder="Company Support"
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-700/30 rounded-lg">
                    <input type="checkbox" id="ssl" checked className="w-4 h-4 accent-green-500" />
                    <label htmlFor="ssl" className="text-white">Use SSL/TLS encryption</label>
                  </div>
                </div>
              </div>

              <button className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center gap-2">
                <CheckCircle size={18} />
                Test Email Connection
              </button>
            </div>

            {/* SMS Gateway */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <MessageSquare className="text-green-500" />
                SMS Gateway
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">SMS Provider</label>
                  <select className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Twilio</option>
                    <option>Nexmo/Vonage</option>
                    <option>Plivo</option>
                    <option>MessageBird</option>
                    <option>Custom Gateway</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">SMS Number</label>
                  <input 
                    type="text" 
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">API Key</label>
                  <input 
                    type="text" 
                    placeholder="sk_live_..."
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">API Secret</label>
                  <input 
                    type="password" 
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Message Preferences */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-6">Message Preferences</h3>
              
              <div className="space-y-4">
                {[
                  { label: 'Auto-Reply to Messages', description: 'Send automatic responses when unavailable', enabled: false },
                  { label: 'Read Receipts', description: 'Let senders know when you read messages', enabled: true },
                  { label: 'Smart Categorization', description: 'Auto-categorize messages (support, sales, etc.)', enabled: true },
                  { label: 'Sentiment Analysis', description: 'Detect emotion in incoming messages', enabled: true },
                  { label: 'Priority Detection', description: 'Automatically flag urgent messages', enabled: true }
                ].map((setting) => (
                  <div key={setting.label} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{setting.label}</p>
                      <p className="text-sm text-gray-400">{setting.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={setting.enabled} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Voicemail Settings Tab */}
        {activeTab === 'voicemail' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Voicemail className="text-blue-500" />
                Voicemail Settings
              </h2>
              <p className="text-gray-400">Configure voicemail preferences and transcription</p>
            </div>

            {/* Voicemail Behavior */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-6">Voicemail Behavior</h3>
              
              <div className="space-y-4">
                {[
                  { label: 'Enable Voicemail', description: 'Accept voicemail messages', enabled: true },
                  { label: 'AI Transcription', description: 'Automatically transcribe voicemail to text', enabled: true },
                  { label: 'Sentiment Analysis', description: 'Detect caller sentiment and urgency', enabled: true },
                  { label: 'Visual Voicemail', description: 'See transcripts before listening', enabled: true },
                  { label: 'Email Notifications', description: 'Send voicemail notifications to email', enabled: true },
                  { label: 'SMS Notifications', description: 'Send voicemail alerts via SMS', enabled: false }
                ].map((setting) => (
                  <div key={setting.label} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{setting.label}</p>
                      <p className="text-sm text-gray-400">{setting.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={setting.enabled} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Voicemail Greeting */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Mic className="text-red-500" />
                Voicemail Greeting
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Greeting Type</label>
                  <select className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Default System Greeting</option>
                    <option>Custom Recorded Greeting</option>
                    <option>Text-to-Speech Greeting</option>
                    <option>Out of Office Greeting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Text-to-Speech Message</label>
                  <textarea 
                    rows={3}
                    placeholder="You've reached John Doe. I'm unable to take your call right now. Please leave a message and I'll get back to you soon."
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                </div>

                <div className="flex gap-3">
                  <button className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all flex items-center gap-2">
                    <Radio className="animate-pulse" size={18} />
                    Record Greeting
                  </button>
                  <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center gap-2">
                    <Play size={18} />
                    Play Current Greeting
                  </button>
                </div>
              </div>
            </div>

            {/* Voicemail PIN */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Lock className="text-yellow-500" />
                Security Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Voicemail PIN</label>
                  <input 
                    type="password" 
                    placeholder="Enter 4-6 digit PIN"
                    maxLength={6}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Auto-Delete After (days)</label>
                  <input 
                    type="number" 
                    defaultValue="30"
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs would continue similarly... */}
        {activeTab === 'agents' && (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-600 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-white mb-2">Agent Settings</h3>
            <p className="text-gray-400">Configure agent profiles, skills, and permissions</p>
          </div>
        )}

        {activeTab === 'queues' && (
          <div className="text-center py-12">
            <Clock className="mx-auto text-gray-600 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-white mb-2">Queue Settings</h3>
            <p className="text-gray-400">Configure queue behavior, SLA targets, and routing</p>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto text-gray-600 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-white mb-2">Analytics Settings</h3>
            <p className="text-gray-400">Configure reports, data retention, and export preferences</p>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="text-center py-12">
            <Palette className="mx-auto text-gray-600 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-white mb-2">Appearance Settings</h3>
            <p className="text-gray-400">Customize theme, colors, and layout preferences</p>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="text-center py-12">
            <Bell className="mx-auto text-gray-600 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-white mb-2">Notification Settings</h3>
            <p className="text-gray-400">Configure alerts, sounds, and notification preferences</p>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="text-center py-12">
            <Settings className="mx-auto text-gray-600 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-white mb-2">Advanced Settings</h3>
            <p className="text-gray-400">System configuration, logs, and developer options</p>
          </div>
        )}
      </div>

      {/* Save Button Footer */}
      <div className="mt-8 flex justify-end gap-4">
        <button className="px-6 py-3 bg-gray-800/50 hover:bg-gray-700 border border-gray-700 text-white rounded-lg font-medium transition-all flex items-center gap-2">
          <X size={20} />
          Reset Changes
        </button>
        <button className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-green-500/50 flex items-center gap-2">
          <Save size={20} />
          Save All Settings
        </button>
      </div>
    </div>
  );
}
