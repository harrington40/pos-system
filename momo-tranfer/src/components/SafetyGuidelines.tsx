import { motion } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  MapPin,
  Users,
  Eye,
  Lock,
  Phone,
  Camera,
  FileText,
  Clock
} from 'lucide-react';

interface SafetyGuidelinesProps {
  isVisible: boolean;
  onClose: () => void;
}

export const SafetyGuidelines = ({ isVisible, onClose }: SafetyGuidelinesProps) => {
  const safetyTips = [
    {
      icon: MapPin,
      title: "Meet in Public Places",
      description: "Always choose busy, well-lit public locations for exchanges",
      color: "text-blue-600 bg-blue-100"
    },
    {
      icon: Users,
      title: "Bring a Friend",
      description: "Consider bringing a trusted friend, especially for large amounts",
      color: "text-green-600 bg-green-100"
    },
    {
      icon: Eye,
      title: "Verify Identity",
      description: "Check vendor's ID and business registration before exchanging",
      color: "text-purple-600 bg-purple-100"
    },
    {
      icon: Lock,
      title: "Count Carefully",
      description: "Take time to count money thoroughly before completing the exchange",
      color: "text-orange-600 bg-orange-100"
    },
    {
      icon: Phone,
      title: "Share Location",
      description: "Share your location with trusted contacts during the meeting",
      color: "text-red-600 bg-red-100"
    },
    {
      icon: Camera,
      title: "Document Transaction",
      description: "Take photos/videos of the exchange process for security",
      color: "text-indigo-600 bg-indigo-100"
    }
  ];

  const warningFlags = [
    "Vendor asks to meet in isolated locations",
    "Pressure to complete exchange quickly",
    "Rates that seem too good to be true",
    "Vendor refuses to show identification",
    "No physical business location",
    "Poor communication or evasive answers"
  ];

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Safety Guidelines</h2>
                <p className="text-blue-100 text-sm">Stay safe while exchanging money</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Safety Tips */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Essential Safety Tips</h3>
            <div className="grid grid-cols-1 gap-3">
              {safetyTips.map((tip, index) => {
                const Icon = tip.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tip.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{tip.title}</h4>
                      <p className="text-sm text-gray-600">{tip.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Warning Signs */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Red Flags to Watch For</h3>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <ul className="space-y-2">
                {warningFlags.map((flag, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-red-800">{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommended Meeting Spots */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Meeting Spots</h3>
            <div className="grid grid-cols-1 gap-2">
              {[
                { name: "Garden City Mall", location: "Food Court Area", hours: "9 AM - 9 PM" },
                { name: "Shoprite Lugogo", location: "Customer Service Area", hours: "8 AM - 10 PM" },
                { name: "Acacia Mall", location: "Main Entrance Lobby", hours: "9 AM - 9 PM" },
                { name: "Centenary Park", location: "Main Pavilion", hours: "Daylight Hours Only" }
              ].map((spot, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{spot.name}</p>
                    <p className="text-sm text-gray-600">{spot.location}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{spot.hours}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Contacts */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">Emergency Contacts</h4>
            <div className="text-sm text-yellow-700 space-y-1">
              <p>• Police Emergency: 999</p>
              <p>• MoMo Support: 165</p>
              <p>• App Support: +256 700 123 456</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Got It
            </button>
            <button
              onClick={() => {
                // In a real app, this could download a PDF or open a detailed guide
                onClose();
              }}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Download Guide</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};