import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Bell, 
  Volume2,
  Smartphone,
  Mail,
  MessageSquare,
  DollarSign,
  Shield,
  Clock,
  ToggleLeft,
  ToggleRight,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NotificationSetting {
  id: string;
  category: string;
  title: string;
  description: string;
  enabled: boolean;
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  icon: any;
  color: string;
}

export const NotificationSettings = ({ isOpen, onClose }: NotificationSettingsProps) => {
  const [masterNotifications, setMasterNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');

  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    {
      id: '1',
      category: 'Transactions',
      title: 'Money Received',
      description: 'When someone sends you money',
      enabled: true,
      channels: { push: true, email: true, sms: false },
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      id: '2',
      category: 'Transactions',
      title: 'Money Sent',
      description: 'Confirmation of sent payments',
      enabled: true,
      channels: { push: true, email: false, sms: true },
      icon: DollarSign,
      color: 'bg-blue-500'
    },
    {
      id: '3',
      category: 'Security',
      title: 'Login Alerts',
      description: 'New device or location logins',
      enabled: true,
      channels: { push: true, email: true, sms: true },
      icon: Shield,
      color: 'bg-red-500'
    },
    {
      id: '4',
      category: 'Security',
      title: 'Failed Login Attempts',
      description: 'Multiple failed login attempts',
      enabled: true,
      channels: { push: true, email: true, sms: false },
      icon: Shield,
      color: 'bg-orange-500'
    },
    {
      id: '5',
      category: 'Social',
      title: 'Payment Requests',
      description: 'Someone requests money from you',
      enabled: true,
      channels: { push: true, email: false, sms: false },
      icon: MessageSquare,
      color: 'bg-purple-500'
    },
    {
      id: '6',
      category: 'Social',
      title: 'Chat Messages',
      description: 'New messages in payment chats',
      enabled: true,
      channels: { push: true, email: false, sms: false },
      icon: MessageSquare,
      color: 'bg-indigo-500'
    },
    {
      id: '7',
      category: 'System',
      title: 'System Updates',
      description: 'App updates and maintenance',
      enabled: false,
      channels: { push: true, email: true, sms: false },
      icon: Settings,
      color: 'bg-gray-500'
    }
  ]);

  const toggleNotification = (id: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === id ? { ...notif, enabled: !notif.enabled } : notif
    ));
  };

  const toggleChannel = (id: string, channel: 'push' | 'email' | 'sms') => {
    setNotifications(prev => prev.map(notif => 
      notif.id === id 
        ? { 
            ...notif, 
            channels: { 
              ...notif.channels, 
              [channel]: !notif.channels[channel] 
            } 
          }
        : notif
    ));
  };

  const enableAllForCategory = (category: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.category === category ? { ...notif, enabled: true } : notif
    ));
    toast.success(`All ${category} notifications enabled`);
  };

  const disableAllForCategory = (category: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.category === category ? { ...notif, enabled: false } : notif
    ));
    toast.success(`All ${category} notifications disabled`);
  };

  const testNotification = () => {
    toast.success('Test notification sent!');
  };

  const categories = [...new Set(notifications.map(n => n.category))];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Notification Settings</h2>
                <p className="text-purple-100 text-sm">Customize your notification preferences</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Master Controls */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Master Controls</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Bell className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">All Notifications</p>
                      <p className="text-sm text-gray-600">Master notification switch</p>
                    </div>
                  </div>
                  <button onClick={() => setMasterNotifications(!masterNotifications)}>
                    {masterNotifications ? 
                      <ToggleRight className="w-8 h-8 text-green-500" /> : 
                      <ToggleLeft className="w-8 h-8 text-gray-400" />
                    }
                  </button>
                </div>

                {masterNotifications && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Volume2 className="w-5 h-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900">Sound</p>
                          <p className="text-sm text-gray-600">Play sound for notifications</p>
                        </div>
                      </div>
                      <button onClick={() => setSoundEnabled(!soundEnabled)}>
                        {soundEnabled ? 
                          <ToggleRight className="w-8 h-8 text-green-500" /> : 
                          <ToggleLeft className="w-8 h-8 text-gray-400" />
                        }
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Smartphone className="w-5 h-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900">Vibration</p>
                          <p className="text-sm text-gray-600">Vibrate for notifications</p>
                        </div>
                      </div>
                      <button onClick={() => setVibrationEnabled(!vibrationEnabled)}>
                        {vibrationEnabled ? 
                          <ToggleRight className="w-8 h-8 text-green-500" /> : 
                          <ToggleLeft className="w-8 h-8 text-gray-400" />
                        }
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900">Quiet Hours</p>
                          <p className="text-sm text-gray-600">Silent during specified hours</p>
                        </div>
                      </div>
                      <button onClick={() => setQuietHoursEnabled(!quietHoursEnabled)}>
                        {quietHoursEnabled ? 
                          <ToggleRight className="w-8 h-8 text-green-500" /> : 
                          <ToggleLeft className="w-8 h-8 text-gray-400" />
                        }
                      </button>
                    </div>

                    {quietHoursEnabled && (
                      <div className="ml-8 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                            <input
                              type="time"
                              value={quietStart}
                              onChange={(e) => setQuietStart(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                            <input
                              type="time"
                              value={quietEnd}
                              onChange={(e) => setQuietEnd(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Test Notification */}
            <div className="mb-6">
              <button
                onClick={testNotification}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-colors"
              >
                Send Test Notification
              </button>
            </div>

            {/* Notification Categories */}
            {categories.map((category) => (
              <div key={category} className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => enableAllForCategory(category)}
                      className="px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Enable All
                    </button>
                    <button
                      onClick={() => disableAllForCategory(category)}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Disable All
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {notifications
                    .filter(notif => notif.category === category)
                    .map((notif) => {
                      const Icon = notif.icon;
                      return (
                        <motion.div
                          key={notif.id}
                          className={`bg-white border rounded-xl p-4 ${
                            notif.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'
                          }`}
                          whileHover={{ scale: 1.01 }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 ${notif.color} rounded-lg flex items-center justify-center`}>
                                <Icon className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{notif.title}</h4>
                                <p className="text-sm text-gray-600">{notif.description}</p>
                              </div>
                            </div>
                            <button onClick={() => toggleNotification(notif.id)}>
                              {notif.enabled ? 
                                <ToggleRight className="w-8 h-8 text-green-500" /> : 
                                <ToggleLeft className="w-8 h-8 text-gray-400" />
                              }
                            </button>
                          </div>

                          {notif.enabled && (
                            <div className="ml-13 grid grid-cols-3 gap-4">
                              <div className="flex items-center space-x-2">
                                <Smartphone className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-600">Push</span>
                                <button onClick={() => toggleChannel(notif.id, 'push')}>
                                  {notif.channels.push ? 
                                    <ToggleRight className="w-6 h-6 text-green-500" /> : 
                                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                                  }
                                </button>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Mail className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-600">Email</span>
                                <button onClick={() => toggleChannel(notif.id, 'email')}>
                                  {notif.channels.email ? 
                                    <ToggleRight className="w-6 h-6 text-green-500" /> : 
                                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                                  }
                                </button>
                              </div>
                              <div className="flex items-center space-x-2">
                                <MessageSquare className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-600">SMS</span>
                                <button onClick={() => toggleChannel(notif.id, 'sms')}>
                                  {notif.channels.sms ? 
                                    <ToggleRight className="w-6 h-6 text-green-500" /> : 
                                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                                  }
                                </button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};