import { nanoid } from 'nanoid';
import { DatabaseConnection } from '../database/connection';
import { MqttService } from '../mqtt/mqttService';
import { UserService } from './UserService';
import { 
  Transaction, 
  CreateTransactionRequest, 
  ApiResponse,
  PaymentNotification
} from '../types';
import { logger } from '../utils/logger';

export class TransactionService {
  private static instance: TransactionService;
  private db: DatabaseConnection;
  private mqttService: MqttService;
  private userService: UserService;

  private constructor() {
    this.db = DatabaseConnection.getInstance();
    this.mqttService = MqttService.getInstance();
    this.userService = UserService.getInstance();
  }

  public static getInstance(): TransactionService {
    if (!TransactionService.instance) {
      TransactionService.instance = new TransactionService();
    }
    return TransactionService.instance;
  }

  public async createTransaction(request: CreateTransactionRequest): Promise<ApiResponse<Transaction>> {
    try {
      // Validate input
      if (!request.fromUserId || !request.amount || request.amount <= 0) {
        return { success: false, error: 'Invalid transaction data' };
      }

      // Verify sender exists
      const sender = await this.userService.getUserById(request.fromUserId);
      if (!sender) {
        return { success: false, error: 'Sender not found' };
      }

      // For send transactions, check balance
      if (request.type === 'send' && sender.balance < request.amount) {
        return { success: false, error: 'Insufficient balance' };
      }

      // Create transaction object
      const transaction: Transaction = {
        id: nanoid(),
        fromUserId: request.fromUserId,
        toUserId: request.toUserId,
        recipientPhone: request.recipientPhone,
        amount: request.amount,
        currency: request.currency,
        type: request.type,
        status: 'pending',
        description: request.description,
        metadata: request.metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save transaction to database
      const result = await this.db.insert('transactions', transaction);
      if (!result) {
        return { success: false, error: 'Failed to create transaction' };
      }

      logger.info('Transaction created', { 
        transactionId: transaction.id, 
        fromUserId: request.fromUserId,
        amount: request.amount,
        type: request.type
      });

      // Process the transaction
      await this.processTransaction(transaction.id);

      return { 
        success: true, 
        data: transaction,
        message: 'Transaction created successfully' 
      };

    } catch (error) {
      logger.error('Error creating transaction', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  public async processTransaction(transactionId: string): Promise<ApiResponse<Transaction>> {
    try {
      const transaction = await this.getTransactionById(transactionId);
      if (!transaction) {
        return { success: false, error: 'Transaction not found' };
      }

      if (transaction.status !== 'pending') {
        return { success: false, error: 'Transaction already processed' };
      }

      let success = false;
      let errorMessage = '';

      switch (transaction.type) {
        case 'send':
          success = await this.processSendTransaction(transaction);
          break;
        case 'receive':
          success = await this.processReceiveTransaction(transaction);
          break;
        case 'deposit':
          success = await this.processDepositTransaction(transaction);
          break;
        case 'withdrawal':
          success = await this.processWithdrawalTransaction(transaction);
          break;
        default:
          errorMessage = 'Invalid transaction type';
      }

      // Update transaction status
      const newStatus = success ? 'completed' : 'failed';
      await this.updateTransactionStatus(transactionId, newStatus);

      // Send notifications via MQTT
      await this.sendTransactionNotification(transaction, newStatus);

      const updatedTransaction = await this.getTransactionById(transactionId);
      
      logger.info('Transaction processed', { 
        transactionId, 
        status: newStatus,
        success 
      });

      return { 
        success: true, 
        data: updatedTransaction!,
        message: `Transaction ${newStatus}` 
      };

    } catch (error) {
      logger.error('Error processing transaction', { transactionId, error });
      
      // Mark transaction as failed
      await this.updateTransactionStatus(transactionId, 'failed');
      
      return { success: false, error: 'Failed to process transaction' };
    }
  }

  private async processSendTransaction(transaction: Transaction): Promise<boolean> {
    try {
      // Deduct amount from sender
      const senderUpdate = await this.userService.updateBalance(
        transaction.fromUserId, 
        -transaction.amount
      );

      if (!senderUpdate.success) {
        return false;
      }

      // If recipient user ID is provided, credit their account
      if (transaction.toUserId) {
        const recipientUpdate = await this.userService.updateBalance(
          transaction.toUserId, 
          transaction.amount
        );
        return recipientUpdate.success;
      }

      // For phone-based transfers, the money is held until recipient claims it
      return true;

    } catch (error) {
      logger.error('Error processing send transaction', { transactionId: transaction.id, error });
      return false;
    }
  }

  private async processReceiveTransaction(transaction: Transaction): Promise<boolean> {
    try {
      // Credit amount to receiver
      const receiverUpdate = await this.userService.updateBalance(
        transaction.fromUserId, 
        transaction.amount
      );

      return receiverUpdate.success;

    } catch (error) {
      logger.error('Error processing receive transaction', { transactionId: transaction.id, error });
      return false;
    }
  }

  private async processDepositTransaction(transaction: Transaction): Promise<boolean> {
    try {
      // Credit amount to user account
      const userUpdate = await this.userService.updateBalance(
        transaction.fromUserId, 
        transaction.amount
      );

      return userUpdate.success;

    } catch (error) {
      logger.error('Error processing deposit transaction', { transactionId: transaction.id, error });
      return false;
    }
  }

  private async processWithdrawalTransaction(transaction: Transaction): Promise<boolean> {
    try {
      // Deduct amount from user account
      const userUpdate = await this.userService.updateBalance(
        transaction.fromUserId, 
        -transaction.amount
      );

      return userUpdate.success;

    } catch (error) {
      logger.error('Error processing withdrawal transaction', { transactionId: transaction.id, error });
      return false;
    }
  }

  public async getTransactionById(transactionId: string): Promise<Transaction | null> {
    try {
      const result = await this.db.getById('transactions', transactionId);
      return result as Transaction;
    } catch (error) {
      logger.error('Error getting transaction by ID', { transactionId, error });
      return null;
    }
  }

  public async getTransactionsByUserId(
    userId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<ApiResponse<{ transactions: Transaction[]; total: number }>> {
    try {
      const offset = (page - 1) * limit;
      
      // Get transactions where user is sender or receiver
      const query = {
        $or: [
          { fromUserId: userId },
          { toUserId: userId }
        ]
      };

      const transactions = await this.db.find('transactions', query, { 
        sort: { createdAt: -1 }, 
        limit, 
        offset 
      });

      const total = await this.db.count('transactions', query);

      return { 
        success: true, 
        data: { 
          transactions: transactions as Transaction[], 
          total 
        },
        message: 'Transactions retrieved successfully' 
      };

    } catch (error) {
      logger.error('Error getting user transactions', { userId, error });
      return { success: false, error: 'Failed to retrieve transactions' };
    }
  }

  public async updateTransactionStatus(
    transactionId: string, 
    status: Transaction['status']
  ): Promise<ApiResponse<Transaction>> {
    try {
      const result = await this.db.update('transactions', transactionId, { 
        status, 
        updatedAt: new Date() 
      });

      if (!result) {
        return { success: false, error: 'Transaction not found or update failed' };
      }

      const updatedTransaction = await this.getTransactionById(transactionId);

      logger.info('Transaction status updated', { transactionId, status });

      return { 
        success: true, 
        data: updatedTransaction!,
        message: 'Transaction status updated successfully' 
      };

    } catch (error) {
      logger.error('Error updating transaction status', { transactionId, status, error });
      return { success: false, error: 'Failed to update transaction status' };
    }
  }

  private async sendTransactionNotification(
    transaction: Transaction, 
    status: Transaction['status']
  ): Promise<void> {
    try {
      // Notification for sender
      const senderNotification: PaymentNotification = {
        userId: transaction.fromUserId,
        transactionId: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        type: transaction.type,
        status,
        message: this.getNotificationMessage(transaction.type, status, 'sender')
      };

      await this.mqttService.publish(
        `notifications/${transaction.fromUserId}`, 
        senderNotification
      );

      // Notification for receiver (if exists)
      if (transaction.toUserId) {
        const receiverNotification: PaymentNotification = {
          userId: transaction.toUserId,
          transactionId: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
          type: transaction.type === 'send' ? 'receive' : transaction.type,
          status,
          message: this.getNotificationMessage(transaction.type, status, 'receiver')
        };

        await this.mqttService.publish(
          `notifications/${transaction.toUserId}`, 
          receiverNotification
        );
      }

    } catch (error) {
      logger.error('Error sending transaction notification', { 
        transactionId: transaction.id, 
        error 
      });
    }
  }

  private getNotificationMessage(
    type: Transaction['type'], 
    status: Transaction['status'], 
    role: 'sender' | 'receiver'
  ): string {
    const action = role === 'sender' ? 'sent' : 'received';
    
    switch (status) {
      case 'completed':
        return `Payment ${action} successfully`;
      case 'failed':
        return `Payment ${action} failed`;
      case 'pending':
        return `Payment ${action} is being processed`;
      case 'cancelled':
        return `Payment ${action} was cancelled`;
      default:
        return `Payment ${action} status updated`;
    }
  }

  public async cancelTransaction(transactionId: string): Promise<ApiResponse<Transaction>> {
    try {
      const transaction = await this.getTransactionById(transactionId);
      if (!transaction) {
        return { success: false, error: 'Transaction not found' };
      }

      if (transaction.status !== 'pending') {
        return { success: false, error: 'Only pending transactions can be cancelled' };
      }

      // Update status to cancelled
      const result = await this.updateTransactionStatus(transactionId, 'cancelled');
      
      if (result.success) {
        // Send cancellation notification
        await this.sendTransactionNotification(transaction, 'cancelled');
      }

      return result;

    } catch (error) {
      logger.error('Error cancelling transaction', { transactionId, error });
      return { success: false, error: 'Failed to cancel transaction' };
    }
  }
}