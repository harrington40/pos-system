import axios, { type AxiosInstance } from 'axios';
import type { TransferRequest, PaymentRequest, ApiResponse, Transaction, User } from '../types';

class MoMoApiService {
  private api: AxiosInstance;
  private subscriptionKey: string;
  private baseUrl: string;

  constructor() {
    // Use environment variables in production
    this.subscriptionKey = import.meta.env.VITE_MOMO_SUBSCRIPTION_KEY || 'demo-subscription-key';
    this.baseUrl = import.meta.env.VITE_MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com';
    
    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': this.subscriptionKey,
        'X-Reference-Id': this.generateUUID(),
        'X-Target-Environment': 'sandbox'
      }
    });

    this.setupInterceptors();
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private setupInterceptors() {
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('momo-access-token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('momo-access-token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async authenticate(): Promise<ApiResponse<{ access_token: string }>> {
    try {
      const response = await this.api.post('/collection/token/', {
        grant_type: 'client_credentials'
      });
      
      if (response.data.access_token) {
        localStorage.setItem('momo-access-token', response.data.access_token);
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  // Send Money (Transfer)
  async sendMoney(transferData: TransferRequest): Promise<ApiResponse<{ transactionId: string }>> {
    try {
      const transactionId = this.generateUUID();
      
      await this.api.post(`/disbursement/v1_0/transfer`, {
        ...transferData,
        externalId: transactionId
      }, {
        headers: {
          'X-Reference-Id': transactionId
        }
      });

      return {
        success: true,
        data: { transactionId },
        message: 'Transfer initiated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Transfer failed'
      };
    }
  }

  // Request Payment
  async requestPayment(paymentData: PaymentRequest): Promise<ApiResponse<{ transactionId: string }>> {
    try {
      const transactionId = this.generateUUID();
      
      await this.api.post(`/collection/v1_0/requesttopay`, {
        ...paymentData,
        externalId: transactionId
      }, {
        headers: {
          'X-Reference-Id': transactionId
        }
      });

      return {
        success: true,
        data: { transactionId },
        message: 'Payment request sent successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Payment request failed'
      };
    }
  }

  // Check Transaction Status
  async getTransactionStatus(transactionId: string, type: 'transfer' | 'payment'): Promise<ApiResponse<Transaction>> {
    try {
      const endpoint = type === 'transfer' 
        ? `/disbursement/v1_0/transfer/${transactionId}`
        : `/collection/v1_0/requesttopay/${transactionId}`;
        
      const response = await this.api.get(endpoint);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get transaction status'
      };
    }
  }

  // Get Account Balance
  async getAccountBalance(): Promise<ApiResponse<{ balance: number; currency: string }>> {
    try {
      const response = await this.api.get('/collection/v1_0/account/balance');
      
      return {
        success: true,
        data: {
          balance: parseFloat(response.data.availableBalance),
          currency: response.data.currency
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get balance'
      };
    }
  }

  // Get User Info
  async getUserInfo(phoneNumber: string): Promise<ApiResponse<User>> {
    try {
      const response = await this.api.get(`/collection/v1_0/accountholder/msisdn/${phoneNumber}/basicuserinfo`);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get user info'
      };
    }
  }

  // Demo/Mock methods for development
  async mockSendMoney(_transferData: TransferRequest): Promise<ApiResponse<{ transactionId: string }>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const transactionId = this.generateUUID();
    
    // Simulate success/failure
    const isSuccess = Math.random() > 0.1; // 90% success rate
    
    if (isSuccess) {
      return {
        success: true,
        data: { transactionId },
        message: 'Transfer completed successfully'
      };
    } else {
      return {
        success: false,
        error: 'Insufficient balance or invalid recipient'
      };
    }
  }

  async mockGetBalance(): Promise<ApiResponse<{ balance: number; currency: string }>> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      data: {
        balance: 15000.50,
        currency: 'UGX'
      }
    };
  }
}

export default new MoMoApiService();