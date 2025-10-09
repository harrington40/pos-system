import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { config } from '../config';
import { DatabaseConnection } from '../database/connection';
import { 
  User, 
  CreateUserRequest, 
  LoginRequest, 
  LoginResponse, 
  ApiResponse 
} from '../types';
import { logger } from '../utils/logger';

export class UserService {
  private static instance: UserService;
  private db: DatabaseConnection;

  private constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  public async createUser(request: CreateUserRequest): Promise<ApiResponse<Omit<User, 'pin'>>> {
    try {
      // Validate input
      if (!request.phoneNumber || !request.firstName || !request.lastName || !request.pin) {
        return { success: false, error: 'Missing required fields' };
      }

      // Check if user already exists
      const existingUser = await this.getUserByPhone(request.phoneNumber);
      if (existingUser) {
        return { success: false, error: 'User already exists with this phone number' };
      }

      // Hash the PIN
      const hashedPin = await bcrypt.hash(request.pin, 12);

      // Create user object
      const user: User = {
        id: nanoid(),
        phoneNumber: request.phoneNumber,
        email: request.email,
        firstName: request.firstName,
        lastName: request.lastName,
        country: request.country,
        currency: request.currency,
        balance: 0,
        pin: hashedPin,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      const result = await this.db.insert('users', user);
      if (!result) {
        return { success: false, error: 'Failed to create user' };
      }

      // Remove PIN from response
      const { pin, ...userResponse } = user;
      
      logger.info('User created successfully', { userId: user.id, phoneNumber: user.phoneNumber });
      
      return { 
        success: true, 
        data: userResponse,
        message: 'User created successfully' 
      };

    } catch (error) {
      logger.error('Error creating user', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  public async authenticateUser(request: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      // Validate input
      if (!request.phoneNumber || !request.pin) {
        return { success: false, error: 'Phone number and PIN are required' };
      }

      // Get user from database
      const user = await this.getUserByPhone(request.phoneNumber);
      if (!user) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Verify PIN
      const isValidPin = await bcrypt.compare(request.pin, user.pin);
      if (!isValidPin) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id);

      // Remove PIN from response
      const { pin, ...userResponse } = user;

      const loginResponse: LoginResponse = {
        user: userResponse,
        token: accessToken,
        refreshToken: refreshToken
      };

      logger.info('User authenticated successfully', { userId: user.id, phoneNumber: user.phoneNumber });

      return { 
        success: true, 
        data: loginResponse,
        message: 'Authentication successful' 
      };

    } catch (error) {
      logger.error('Error authenticating user', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  public async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await this.db.getById('users', userId);
      return result as User;
    } catch (error) {
      logger.error('Error getting user by ID', { userId, error });
      return null;
    }
  }

  public async getUserByPhone(phoneNumber: string): Promise<User | null> {
    try {
      const result = await this.db.findOne('users', { phoneNumber });
      return result as User;
    } catch (error) {
      logger.error('Error getting user by phone', { phoneNumber, error });
      return null;
    }
  }

  public async updateUser(userId: string, updates: Partial<User>): Promise<ApiResponse<Omit<User, 'pin'>>> {
    try {
      // Don't allow updating certain fields
      const { id, pin, createdAt, ...allowedUpdates } = updates;
      
      allowedUpdates.updatedAt = new Date();

      const result = await this.db.update('users', userId, allowedUpdates);
      if (!result) {
        return { success: false, error: 'User not found or update failed' };
      }

      const updatedUser = await this.getUserById(userId);
      if (!updatedUser) {
        return { success: false, error: 'Failed to retrieve updated user' };
      }

      const { pin: userPin, ...userResponse } = updatedUser;

      logger.info('User updated successfully', { userId });

      return { 
        success: true, 
        data: userResponse,
        message: 'User updated successfully' 
      };

    } catch (error) {
      logger.error('Error updating user', { userId, error });
      return { success: false, error: 'Internal server error' };
    }
  }

  public async updateBalance(userId: string, amount: number): Promise<ApiResponse<{ balance: number }>> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const newBalance = user.balance + amount;
      if (newBalance < 0) {
        return { success: false, error: 'Insufficient balance' };
      }

      const result = await this.db.update('users', userId, { 
        balance: newBalance, 
        updatedAt: new Date() 
      });

      if (!result) {
        return { success: false, error: 'Failed to update balance' };
      }

      logger.info('User balance updated', { userId, previousBalance: user.balance, newBalance, amount });

      return { 
        success: true, 
        data: { balance: newBalance },
        message: 'Balance updated successfully' 
      };

    } catch (error) {
      logger.error('Error updating user balance', { userId, amount, error });
      return { success: false, error: 'Internal server error' };
    }
  }

  public async verifyUser(userId: string): Promise<ApiResponse<{ isVerified: boolean }>> {
    try {
      const result = await this.db.update('users', userId, { 
        isVerified: true, 
        updatedAt: new Date() 
      });

      if (!result) {
        return { success: false, error: 'User not found or verification failed' };
      }

      logger.info('User verified successfully', { userId });

      return { 
        success: true, 
        data: { isVerified: true },
        message: 'User verified successfully' 
      };

    } catch (error) {
      logger.error('Error verifying user', { userId, error });
      return { success: false, error: 'Internal server error' };
    }
  }

  private generateAccessToken(userId: string): string {
    const payload = { userId, type: 'access' };
    return jwt.sign(payload, config.jwt.secret as string, { expiresIn: '7d' });
  }

  private generateRefreshToken(userId: string): string {
    const payload = { userId, type: 'refresh' };
    return jwt.sign(payload, config.jwt.refreshSecret as string, { expiresIn: '30d' });
  }

  public verifyToken(token: string, type: 'access' | 'refresh' = 'access'): { userId: string } | null {
    try {
      const secret = type === 'access' ? config.jwt.secret as string : config.jwt.refreshSecret as string;
      const decoded = jwt.verify(token, secret) as any;
      
      if (decoded.type !== type) {
        return null;
      }

      return { userId: decoded.userId };
    } catch (error) {
      logger.error('Error verifying token', { error });
      return null;
    }
  }
}
