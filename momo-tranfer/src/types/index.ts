// MTN MoMo API Types
export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  email?: string;
  balance: number;
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'request';
  amount: number;
  currency: string;
  recipient?: {
    phoneNumber: string;
    name: string;
  };
  sender?: {
    phoneNumber: string;
    name: string;
  };
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  description?: string;
  fee: number;
}

export interface TransferRequest {
  amount: number;
  currency: string;
  payeePartyId: string;
  payeePartyIdType: 'PHONE_NUMBER' | 'EMAIL';
  payerMessage?: string;
  payeeNote?: string;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  externalId: string;
  payer: {
    partyIdType: 'PHONE_NUMBER';
    partyId: string;
  };
  payerMessage?: string;
  payeeNote?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface Country {
  code: string;
  name: string;
  currency: string;
  flag: string;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: string;
}