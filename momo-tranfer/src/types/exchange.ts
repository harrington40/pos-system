export interface ExchangeVendor {
  id: string;
  name: string;
  businessName: string;
  location: string;
  address: string;
  phone: string;
  rating: number;
  totalReviews: number;
  verified: boolean;
  activeHours: string;
  profileImage?: string;
  safetyScore: number;
  trustLevel: 'high' | 'medium' | 'low';
  lastActive: Date;
  specialties: string[];
  isOnline: boolean;
}

export interface ExchangeRate {
  vendorId: string;
  fromCurrency: string;
  toCurrency: string;
  buyRate: number;
  sellRate: number;
  spread: number;
  lastUpdated: Date;
  minimumAmount: number;
  maximumAmount: number;
  availableAmount: number;
}

export interface ExchangeTransaction {
  id: string;
  vendorId: string;
  buyerId: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  status: 'pending' | 'confirmed' | 'meeting' | 'completed' | 'cancelled';
  meetingLocation?: string;
  meetingTime?: Date;
  safetyCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafetyFeatures {
  escrowProtection: boolean;
  identityVerification: boolean;
  locationSharing: boolean;
  emergencyContacts: boolean;
  transactionInsurance: boolean;
  publicMeetingSpots: string[];
}

export interface CurrencyPair {
  from: string;
  to: string;
  flag: string;
  symbol: string;
  name: string;
}