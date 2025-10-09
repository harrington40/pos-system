import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Lock,
  Smartphone,
  Key,
  AlertTriangle,
  Fingerprint,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SecuritySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecuritySettings = ({ isOpen, onClose }: SecuritySettingsProps) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loginNotifications, setLoginNotifications] = useState(true);
  const [autoLock, setAutoLock] = useState(true);
  const [autoLockTime, setAutoLockTime] = useState(5);

  const securityScore = () => {
    let score = 0;
    if (newPin.length >= 4) score += 25;
    if (biometricEnabled) score += 25;
    if (twoFactorEnabled) score += 25;
    if (loginNotifications) score += 15;
    if (autoLock) score += 10;
    return Math.min(score, 100);
  };

  const handlePinChange = async () => {
    if (newPin !== confirmPin) {
      toast.error('PINs do not match');
      return;
    }
    if (newPin.length < 4) {
      toast.error('PIN must be at least 4 digits');
      return;
    }
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('PIN updated successfully');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
  };

  const toggleBiometric = async () => {
    if (!biometricEnabled) {
      // Simulate biometric setup
      toast.success('Biometric authentication enabled');
    } else {
      toast.success('Biometric authentication disabled');
    }
    setBiometricEnabled(!biometricEnabled);
  };

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
          className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Security & Privacy</h2>
                <p className="text-red-100 text-sm">Protect your account and data</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Security Score */}
            <div className="mt-4 bg-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Security Score</span>
                <span className="text-lg font-bold">{securityScore()}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <motion.div
                  className="bg-white h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${securityScore()}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <p className="text-xs text-red-100 mt-1">
                {securityScore() >= 80 ? 'Excellent security' : 
                 securityScore() >= 60 ? 'Good security' : 'Improve your security'}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* PIN Management */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">PIN Management</h3>
                  <p className="text-sm text-gray-600">Change your transaction PIN</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current PIN</label>
                  <div className="relative">
                    <input
                      type={showPin ? "text" : "password"}
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value)}
                      maxLength={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter current PIN"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New PIN</label>
                  <input
                    type={showPin ? "text" : "password"}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    maxLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter new PIN"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New PIN</label>
                  <input
                    type={showPin ? "text" : "password"}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    maxLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Confirm new PIN"
                  />
                </div>

                <button
                  onClick={handlePinChange}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update PIN
                </button>
              </div>
            </div>

            {/* Biometric Authentication */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Fingerprint className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Biometric Authentication</h3>
                    <p className="text-sm text-gray-600">Use fingerprint or face ID</p>
                  </div>
                </div>
                <button onClick={toggleBiometric}>
                  {biometricEnabled ? 
                    <ToggleRight className="w-8 h-8 text-green-500" /> : 
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  }
                </button>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-600">Extra security via SMS</p>
                  </div>
                </div>
                <button onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}>
                  {twoFactorEnabled ? 
                    <ToggleRight className="w-8 h-8 text-green-500" /> : 
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  }
                </button>
              </div>
            </div>

            {/* Login Notifications */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Login Notifications</h3>
                    <p className="text-sm text-gray-600">Get notified of new logins</p>
                  </div>
                </div>
                <button onClick={() => setLoginNotifications(!loginNotifications)}>
                  {loginNotifications ? 
                    <ToggleRight className="w-8 h-8 text-green-500" /> : 
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  }
                </button>
              </div>
            </div>

            {/* Auto-Lock */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Key className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Auto-Lock</h3>
                    <p className="text-sm text-gray-600">Lock app after inactivity</p>
                  </div>
                </div>
                <button onClick={() => setAutoLock(!autoLock)}>
                  {autoLock ? 
                    <ToggleRight className="w-8 h-8 text-green-500" /> : 
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  }
                </button>
              </div>

              {autoLock && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auto-lock after {autoLockTime} minutes
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={autoLockTime}
                    onChange={(e) => setAutoLockTime(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 min</span>
                    <span>30 min</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};