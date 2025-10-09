import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Phone, 
  X, 
  CheckCheck,
  DollarSign,
  User
} from 'lucide-react';
import type { ChatMessage } from '../services/smartPaymentService';
import { smartPaymentService } from '../services/smartPaymentService';

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  currentUserId: string;
  onSendPayment?: (amount: number) => void;
}

export const ChatInterface = ({ 
  isOpen, 
  onClose, 
  recipientId, 
  recipientName, 
  currentUserId,
  onSendPayment 
}: ChatInterfaceProps) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const conversation = smartPaymentService.getConversation(currentUserId, recipientId);
      setMessages(conversation);
    }
  }, [isOpen, currentUserId, recipientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const newMessage = await smartPaymentService.sendMessage(
      currentUserId,
      recipientId,
      message,
      'text'
    );

    setMessages(prev => [...prev, newMessage]);
    setMessage('');

    // Simulate recipient typing
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      // Simulate auto-response for demo
      const autoResponse = smartPaymentService.sendMessage(
        recipientId,
        currentUserId,
        'Thanks for your message!',
        'text'
      );
      autoResponse.then(response => {
        setMessages(prev => [...prev, response]);
      });
    }, 1500);
  };

  const sendPaymentRequest = async (amount: number) => {
    const paymentMessage = await smartPaymentService.sendMessage(
      currentUserId,
      recipientId,
      `Payment request for UGX ${amount.toLocaleString()}`,
      'payment_request',
      { amount, currency: 'UGX', reference: Date.now().toString() }
    );

    setMessages(prev => [...prev, paymentMessage]);
  };

  const quickReplies = [
    'Thanks!',
    'Sure thing',
    'How much?',
    'When do you need it?',
    'Sending now'
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white w-full max-w-md h-[90vh] md:h-[600px] md:rounded-2xl shadow-2xl flex flex-col"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 md:rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{recipientName}</h3>
                  <p className="text-blue-100 text-sm">{recipientId}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Phone className="w-5 h-5" />
                </button>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${msg.senderId === currentUserId ? 'order-2' : 'order-1'}`}>
                  {msg.type === 'payment_request' ? (
                    <div className={`p-4 rounded-2xl ${
                      msg.senderId === currentUserId 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="flex items-center space-x-2 mb-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-semibold">Payment Request</span>
                      </div>
                      <p className="text-sm">{msg.message}</p>
                      {msg.paymentData && (
                        <div className="mt-3 p-3 bg-white/10 rounded-lg">
                          <p className="font-bold text-lg">
                            {msg.paymentData.currency} {msg.paymentData.amount.toLocaleString()}
                          </p>
                        </div>
                      )}
                      {msg.senderId !== currentUserId && (
                        <div className="mt-3 flex space-x-2">
                          <button 
                            onClick={() => onSendPayment?.(msg.paymentData?.amount || 0)}
                            className="flex-1 bg-green-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                          >
                            Pay Now
                          </button>
                          <button className="flex-1 bg-gray-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors">
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`p-3 rounded-2xl ${
                      msg.senderId === currentUserId 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md' 
                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    }`}>
                      <p>{msg.message}</p>
                    </div>
                  )}
                  <div className={`flex items-center mt-1 text-xs text-gray-500 ${
                    msg.senderId === currentUserId ? 'justify-end' : 'justify-start'
                  }`}>
                    <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    {msg.senderId === currentUserId && (
                      <CheckCheck className="w-3 h-3 ml-1 text-blue-500" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-gray-100 p-3 rounded-2xl rounded-bl-md">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          <div className="p-2 border-t border-gray-200">
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  onClick={() => setMessage(reply)}
                  className="flex-shrink-0 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                >
                  {reply}
                </button>
              ))}
              <button
                onClick={() => sendPaymentRequest(25000)}
                className="flex-shrink-0 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors flex items-center space-x-1"
              >
                <DollarSign className="w-3 h-3" />
                <span>Request 25k</span>
              </button>
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <motion.button
                onClick={sendMessage}
                disabled={!message.trim()}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};