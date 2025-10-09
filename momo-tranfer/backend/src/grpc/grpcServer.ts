import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { UserService } from '../services/UserService';
import { TransactionService } from '../services/TransactionService';
import { logger } from '../utils/logger';
import { config } from '../config';

// Load proto file
const PROTO_PATH = path.join(__dirname, 'proto', 'momo.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const momoProto = grpc.loadPackageDefinition(packageDefinition) as any;

export class GrpcServer {
  private server: grpc.Server;
  private userService: UserService;
  private transactionService: TransactionService;

  constructor() {
    this.server = new grpc.Server();
    this.userService = UserService.getInstance();
    this.transactionService = TransactionService.getInstance();
    
    this.setupServices();
  }

  private setupServices(): void {
    // User Service
    this.server.addService(momoProto.momo.UserService.service, {
      CreateUser: this.createUser.bind(this),
      AuthenticateUser: this.authenticateUser.bind(this),
      GetUser: this.getUser.bind(this),
      UpdateUser: this.updateUser.bind(this),
      UpdateBalance: this.updateBalance.bind(this),
      VerifyUser: this.verifyUser.bind(this),
    });

    // Transaction Service
    this.server.addService(momoProto.momo.TransactionService.service, {
      CreateTransaction: this.createTransaction.bind(this),
      ProcessTransaction: this.processTransaction.bind(this),
      GetTransaction: this.getTransaction.bind(this),
      GetUserTransactions: this.getUserTransactions.bind(this),
      CancelTransaction: this.cancelTransaction.bind(this),
    });

    // Payment Service
    this.server.addService(momoProto.momo.PaymentService.service, {
      InitiatePayment: this.initiatePayment.bind(this),
      ConfirmPayment: this.confirmPayment.bind(this),
      GetPaymentStatus: this.getPaymentStatus.bind(this),
    });
  }

  // User Service Methods
  private async createUser(call: any, callback: any): Promise<void> {
    try {
      const request = call.request;
      const result = await this.userService.createUser({
        phoneNumber: request.phone_number,
        email: request.email,
        firstName: request.first_name,
        lastName: request.last_name,
        country: request.country,
        currency: request.currency,
        pin: request.pin,
      });

      const response = {
        success: result.success,
        message: result.message || '',
        user: result.data ? this.mapUserToProto(result.data) : null,
        error: result.error || '',
      };

      callback(null, response);
    } catch (error) {
      logger.error('gRPC CreateUser error', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal server error',
      });
    }
  }

  private async authenticateUser(call: any, callback: any): Promise<void> {
    try {
      const request = call.request;
      const result = await this.userService.authenticateUser({
        phoneNumber: request.phone_number,
        pin: request.pin,
      });

      const response = {
        success: result.success,
        message: result.message || '',
        user: result.data ? this.mapUserToProto(result.data.user) : null,
        access_token: result.data?.token || '',
        refresh_token: result.data?.refreshToken || '',
        error: result.error || '',
      };

      callback(null, response);
    } catch (error) {
      logger.error('gRPC AuthenticateUser error', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal server error',
      });
    }
  }

  private async getUser(call: any, callback: any): Promise<void> {
    try {
      const request = call.request;
      const user = await this.userService.getUserById(request.user_id);

      if (!user) {
        callback(null, {
          success: false,
          message: '',
          user: null,
          error: 'User not found',
        });
        return;
      }

      const response = {
        success: true,
        message: 'User retrieved successfully',
        user: this.mapUserToProto(user),
        error: '',
      };

      callback(null, response);
    } catch (error) {
      logger.error('gRPC GetUser error', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal server error',
      });
    }
  }

  private async updateUser(call: any, callback: any): Promise<void> {
    try {
      const request = call.request;
      const updates: any = {};
      
      if (request.email) updates.email = request.email;
      if (request.first_name) updates.firstName = request.first_name;
      if (request.last_name) updates.lastName = request.last_name;
      if (request.country) updates.country = request.country;
      if (request.currency) updates.currency = request.currency;

      const result = await this.userService.updateUser(request.user_id, updates);

      const response = {
        success: result.success,
        message: result.message || '',
        user: result.data ? this.mapUserToProto(result.data) : null,
        error: result.error || '',
      };

      callback(null, response);
    } catch (error) {
      logger.error('gRPC UpdateUser error', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal server error',
      });
    }
  }

  private async updateBalance(call: any, callback: any): Promise<void> {
    try {
      const request = call.request;
      const result = await this.userService.updateBalance(request.user_id, request.amount);

      const response = {
        success: result.success,
        message: result.message || '',
        balance: result.data?.balance || 0,
        error: result.error || '',
      };

      callback(null, response);
    } catch (error) {
      logger.error('gRPC UpdateBalance error', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal server error',
      });
    }
  }

  private async verifyUser(call: any, callback: any): Promise<void> {
    try {
      const request = call.request;
      const result = await this.userService.verifyUser(request.user_id);

      const response = {
        success: result.success,
        message: result.message || '',
        is_verified: result.data?.isVerified || false,
        error: result.error || '',
      };

      callback(null, response);
    } catch (error) {
      logger.error('gRPC VerifyUser error', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal server error',
      });
    }
  }

  // Transaction Service Methods
  private async createTransaction(call: any, callback: any): Promise<void> {
    try {
      const request = call.request;
      const result = await this.transactionService.createTransaction({
        fromUserId: request.from_user_id,
        toUserId: request.to_user_id,
        recipientPhone: request.recipient_phone,
        amount: request.amount,
        currency: request.currency,
        type: this.mapProtoToTransactionType(request.type),
        description: request.description,
        metadata: request.metadata,
      });

      const response = {
        success: result.success,
        message: result.message || '',
        transaction: result.data ? this.mapTransactionToProto(result.data) : null,
        error: result.error || '',
      };

      callback(null, response);
    } catch (error) {
      logger.error('gRPC CreateTransaction error', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal server error',
      });
    }
  }

  private async processTransaction(call: any, callback: any): Promise<void> {
    try {
      const request = call.request;
      const result = await this.transactionService.processTransaction(request.transaction_id);

      const response = {
        success: result.success,
        message: result.message || '',
        transaction: result.data ? this.mapTransactionToProto(result.data) : null,
        error: result.error || '',
      };

      callback(null, response);
    } catch (error) {
      logger.error('gRPC ProcessTransaction error', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal server error',
      });
    }
  }

  private async getTransaction(call: any, callback: any): Promise<void> {
    try {
      const request = call.request;
      const transaction = await this.transactionService.getTransactionById(request.transaction_id);

      if (!transaction) {
        callback(null, {
          success: false,
          message: '',
          transaction: null,
          error: 'Transaction not found',
        });
        return;
      }

      const response = {
        success: true,
        message: 'Transaction retrieved successfully',
        transaction: this.mapTransactionToProto(transaction),
        error: '',
      };

      callback(null, response);
    } catch (error) {
      logger.error('gRPC GetTransaction error', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal server error',
      });
    }
  }

  private async getUserTransactions(call: any, callback: any): Promise<void> {
    try {
      const request = call.request;
      const result = await this.transactionService.getTransactionsByUserId(
        request.user_id,
        request.page || 1,
        request.limit || 20
      );

      const response = {
        success: result.success,
        message: result.message || '',
        transactions: result.data?.transactions.map(t => this.mapTransactionToProto(t)) || [],
        total: result.data?.total || 0,
        error: result.error || '',
      };

      callback(null, response);
    } catch (error) {
      logger.error('gRPC GetUserTransactions error', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal server error',
      });
    }
  }

  private async cancelTransaction(call: any, callback: any): Promise<void> {
    try {
      const request = call.request;
      const result = await this.transactionService.cancelTransaction(request.transaction_id);

      const response = {
        success: result.success,
        message: result.message || '',
        transaction: result.data ? this.mapTransactionToProto(result.data) : null,
        error: result.error || '',
      };

      callback(null, response);
    } catch (error) {
      logger.error('gRPC CancelTransaction error', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal server error',
      });
    }
  }

  // Payment Service Methods (placeholder implementations)
  private async initiatePayment(call: any, callback: any): Promise<void> {
    try {
      // This would integrate with actual payment providers
      const response = {
        success: false,
        message: 'Payment service not implemented',
        payment_id: '',
        transaction_id: '',
        status: 'PAYMENT_FAILED',
        error: 'Not implemented',
      };

      callback(null, response);
    } catch (error) {
      logger.error('gRPC InitiatePayment error', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal server error',
      });
    }
  }

  private async confirmPayment(call: any, callback: any): Promise<void> {
    try {
      const response = {
        success: false,
        message: 'Payment service not implemented',
        status: 'PAYMENT_FAILED',
        error: 'Not implemented',
      };

      callback(null, response);
    } catch (error) {
      logger.error('gRPC ConfirmPayment error', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal server error',
      });
    }
  }

  private async getPaymentStatus(call: any, callback: any): Promise<void> {
    try {
      const response = {
        success: false,
        message: 'Payment service not implemented',
        status: 'PAYMENT_FAILED',
        error: 'Not implemented',
      };

      callback(null, response);
    } catch (error) {
      logger.error('gRPC GetPaymentStatus error', error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Internal server error',
      });
    }
  }

  // Helper methods for mapping
  private mapUserToProto(user: any): any {
    return {
      id: user.id,
      phone_number: user.phoneNumber,
      email: user.email || '',
      first_name: user.firstName,
      last_name: user.lastName,
      country: user.country,
      currency: user.currency,
      balance: user.balance,
      is_verified: user.isVerified,
      created_at: user.createdAt.getTime(),
      updated_at: user.updatedAt.getTime(),
    };
  }

  private mapTransactionToProto(transaction: any): any {
    return {
      id: transaction.id,
      from_user_id: transaction.fromUserId,
      to_user_id: transaction.toUserId || '',
      recipient_phone: transaction.recipientPhone || '',
      amount: transaction.amount,
      currency: transaction.currency,
      type: this.mapTransactionTypeToProto(transaction.type),
      status: this.mapTransactionStatusToProto(transaction.status),
      description: transaction.description || '',
      metadata: transaction.metadata || {},
      created_at: transaction.createdAt.getTime(),
      updated_at: transaction.updatedAt.getTime(),
    };
  }

  private mapProtoToTransactionType(protoType: string): 'send' | 'receive' | 'deposit' | 'withdrawal' {
    switch (protoType) {
      case 'SEND': return 'send';
      case 'RECEIVE': return 'receive';
      case 'DEPOSIT': return 'deposit';
      case 'WITHDRAWAL': return 'withdrawal';
      default: return 'send';
    }
  }

  private mapTransactionTypeToProto(type: string): string {
    switch (type) {
      case 'send': return 'SEND';
      case 'receive': return 'RECEIVE';
      case 'deposit': return 'DEPOSIT';
      case 'withdrawal': return 'WITHDRAWAL';
      default: return 'SEND';
    }
  }

  private mapTransactionStatusToProto(status: string): string {
    switch (status) {
      case 'pending': return 'PENDING';
      case 'completed': return 'COMPLETED';
      case 'failed': return 'FAILED';
      case 'cancelled': return 'CANCELLED';
      default: return 'PENDING';
    }
  }

  public start(): void {
    const port = config.grpc.port;
    const host = config.grpc.host;
    
    this.server.bindAsync(
      `${host}:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error, port) => {
        if (error) {
          logger.error('Failed to start gRPC server', error);
          return;
        }
        
        this.server.start();
        logger.info(`gRPC server started on ${host}:${port}`);
      }
    );
  }

  public stop(): void {
    this.server.tryShutdown((error) => {
      if (error) {
        logger.error('Error shutting down gRPC server', error);
      } else {
        logger.info('gRPC server shut down successfully');
      }
    });
  }
}