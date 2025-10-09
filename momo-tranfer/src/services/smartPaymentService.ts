import type { Transaction } from '../types';

export interface SmartRecommendation {
  type: 'frequent_contact' | 'recurring_payment' | 'split_bill' | 'request_pattern';
  confidence: number;
  suggestion: string;
  amount?: number;
  recipient?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'payment_request' | 'payment_sent' | 'approval_request';
  paymentData?: {
    amount: number;
    currency: string;
    reference: string;
  };
}

export interface ApprovalRequest {
  id: string;
  requesterId: string;
  approverId: string;
  type: 'payment_request_permission' | 'recurring_payment_setup';
  status: 'pending' | 'approved' | 'denied';
  details: {
    amount?: number;
    frequency?: 'daily' | 'weekly' | 'monthly';
    description: string;
  };
  timestamp: Date;
}

class SmartPaymentService {
  private userTransactionHistory: Map<string, Transaction[]> = new Map();
  private approvedContacts: Map<string, Set<string>> = new Map();
  // private userPreferences: Map<string, any> = new Map(); // For future use
  private chatMessages: Map<string, ChatMessage[]> = new Map();

  // Smart Algorithm: Analyze transaction patterns
  analyzeTransactionPatterns(userId: string): SmartRecommendation[] {
    const history = this.userTransactionHistory.get(userId) || [];
    const recommendations: SmartRecommendation[] = [];

    // Frequent contacts analysis
    const contactFrequency = new Map<string, number>();
    const contactAmounts = new Map<string, number[]>();

    history.forEach(transaction => {
      const contact = transaction.recipient?.phoneNumber || transaction.sender?.phoneNumber || '';
      if (contact) {
        contactFrequency.set(contact, (contactFrequency.get(contact) || 0) + 1);
        
        if (!contactAmounts.has(contact)) {
          contactAmounts.set(contact, []);
        }
        contactAmounts.get(contact)!.push(transaction.amount);
      }
    });

    // Recommend frequent contacts
    contactFrequency.forEach((frequency, contact) => {
      if (frequency >= 3) {
        const amounts = contactAmounts.get(contact) || [];
        const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
        
        recommendations.push({
          type: 'frequent_contact',
          confidence: Math.min(frequency / 10, 1),
          suggestion: `Quick send to ${contact}`,
          amount: Math.round(avgAmount),
          recipient: contact
        });
      }
    });

    // Recurring payment detection
    this.detectRecurringPatterns(history, recommendations);

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  private detectRecurringPatterns(history: Transaction[], recommendations: SmartRecommendation[]) {
    // Group transactions by recipient and amount
    const patterns = new Map<string, Date[]>();
    
    history.forEach(transaction => {
      const contact = transaction.recipient?.phoneNumber || transaction.sender?.phoneNumber || '';
      if (contact) {
        const key = `${contact}-${transaction.amount}`;
        if (!patterns.has(key)) {
          patterns.set(key, []);
        }
        patterns.get(key)!.push(new Date(transaction.timestamp));
      }
    });

    patterns.forEach((dates, key) => {
      if (dates.length >= 3) {
        const [recipient, amount] = key.split('-');
        const intervals = [];
        
        for (let i = 1; i < dates.length; i++) {
          const interval = dates[i].getTime() - dates[i-1].getTime();
          intervals.push(interval);
        }
        
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const daysBetween = avgInterval / (1000 * 60 * 60 * 24);
        
        if (daysBetween >= 7 && daysBetween <= 35) {
          recommendations.push({
            type: 'recurring_payment',
            confidence: 0.8,
            suggestion: `Set up recurring payment to ${recipient}`,
            amount: parseInt(amount),
            recipient: recipient
          });
        }
      }
    });
  }

  // Communication system
  async sendMessage(senderId: string, receiverId: string, message: string, type: ChatMessage['type'] = 'text', paymentData?: any): Promise<ChatMessage> {
    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId,
      receiverId,
      message,
      timestamp: new Date(),
      type,
      paymentData
    };

    const conversationKey = [senderId, receiverId].sort().join('-');
    if (!this.chatMessages.has(conversationKey)) {
      this.chatMessages.set(conversationKey, []);
    }
    this.chatMessages.get(conversationKey)!.push(chatMessage);

    return chatMessage;
  }

  getConversation(userId1: string, userId2: string): ChatMessage[] {
    const conversationKey = [userId1, userId2].sort().join('-');
    return this.chatMessages.get(conversationKey) || [];
  }

  // Approval system
  async requestPaymentPermission(requesterId: string, approverId: string, details: ApprovalRequest['details']): Promise<ApprovalRequest> {
    const request: ApprovalRequest = {
      id: Date.now().toString(),
      requesterId,
      approverId,
      type: 'payment_request_permission',
      status: 'pending',
      details,
      timestamp: new Date()
    };

    // Send notification to approver
    await this.sendMessage(
      requesterId,
      approverId,
      `Requesting permission to send payment requests for ${details.description}`,
      'approval_request'
    );

    return request;
  }

  async approveRequest(requestId: string, approved: boolean): Promise<void> {
    // In a real app, this would update the database
    console.log(`Request ${requestId} ${approved ? 'approved' : 'denied'}`);
  }

  isApprovedContact(userId: string, contactId: string): boolean {
    const approved = this.approvedContacts.get(userId);
    return approved ? approved.has(contactId) : false;
  }

  addApprovedContact(userId: string, contactId: string): void {
    if (!this.approvedContacts.has(userId)) {
      this.approvedContacts.set(userId, new Set());
    }
    this.approvedContacts.get(userId)!.add(contactId);
  }

  // Smart amount suggestions
  suggestAmount(userId: string, recipientId: string): number[] {
    const history = this.userTransactionHistory.get(userId) || [];
    const recipientTransactions = history.filter(t => 
      t.recipient?.phoneNumber === recipientId || t.sender?.phoneNumber === recipientId
    );
    
    if (recipientTransactions.length === 0) {
      return [5000, 10000, 25000, 50000]; // Default suggestions
    }

    const amounts = recipientTransactions.map(t => t.amount);
    const uniqueAmounts = [...new Set(amounts)].sort((a, b) => b - a);
    
    return uniqueAmounts.slice(0, 4);
  }

  // Contact nickname system
  private contactNicknames: Map<string, string> = new Map();

  setContactNickname(phoneNumber: string, nickname: string): void {
    this.contactNicknames.set(phoneNumber, nickname);
  }

  getContactNickname(phoneNumber: string): string | null {
    return this.contactNicknames.get(phoneNumber) || null;
  }

  // Split bill feature
  calculateSplitBill(totalAmount: number, participants: string[], customSplits?: Map<string, number>): Map<string, number> {
    const splits = new Map<string, number>();
    
    if (customSplits) {
      return customSplits;
    }
    
    const amountPerPerson = totalAmount / participants.length;
    participants.forEach(participant => {
      splits.set(participant, amountPerPerson);
    });
    
    return splits;
  }
}

export const smartPaymentService = new SmartPaymentService();