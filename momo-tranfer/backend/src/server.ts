import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { config } from './config';
import { DatabaseConnection } from './database/connection';
import { MqttService } from './mqtt/mqttService';
import { GrpcServer } from './grpc/grpcServer';
import { logger } from './utils/logger';
import { UserService } from './services/UserService';
import { TransactionService } from './services/TransactionService';

class App {
  private app: express.Application;
  private grpcServer: GrpcServer;
  private mqttService: MqttService;
  private database: DatabaseConnection;

  constructor() {
    this.app = express();
    this.grpcServer = new GrpcServer();
    this.mqttService = MqttService.getInstance();
    this.database = DatabaseConnection.getInstance();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // CORS
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
      credentials: true,
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.method === 'POST' ? req.body : undefined,
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.env,
      });
    });

    // API routes
    this.app.use('/api/users', this.createUserRoutes());
    this.app.use('/api/transactions', this.createTransactionRoutes());

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
      });
    });
  }

  private createUserRoutes(): express.Router {
    const router = express.Router();
    const userService = UserService.getInstance();

    // Create user
    router.post('/register', async (req: Request, res: Response) => {
      try {
        const result = await userService.createUser(req.body);
        res.status(result.success ? 201 : 400).json(result);
      } catch (error) {
        logger.error('Error in user registration', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    });

    // Authenticate user
    router.post('/login', async (req: Request, res: Response) => {
      try {
        const result = await userService.authenticateUser(req.body);
        res.status(result.success ? 200 : 401).json(result);
      } catch (error) {
        logger.error('Error in user authentication', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    });

    // Get user profile
    router.get('/:userId', async (req: Request, res: Response) => {
      try {
        const user = await userService.getUserById(req.params.userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found',
          });
        }

        const { pin, ...userResponse } = user;
        res.json({
          success: true,
          data: userResponse,
          message: 'User retrieved successfully',
        });
      } catch (error) {
        logger.error('Error getting user', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    });

    return router;
  }

  private createTransactionRoutes(): express.Router {
    const router = express.Router();
    const transactionService = TransactionService.getInstance();

    // Create transaction
    router.post('/', async (req: Request, res: Response) => {
      try {
        const result = await transactionService.createTransaction(req.body);
        res.status(result.success ? 201 : 400).json(result);
      } catch (error) {
        logger.error('Error creating transaction', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    });

    // Get transaction
    router.get('/:transactionId', async (req: Request, res: Response) => {
      try {
        const transaction = await transactionService.getTransactionById(req.params.transactionId);
        if (!transaction) {
          return res.status(404).json({
            success: false,
            error: 'Transaction not found',
          });
        }

        res.json({
          success: true,
          data: transaction,
          message: 'Transaction retrieved successfully',
        });
      } catch (error) {
        logger.error('Error getting transaction', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    });

    return router;
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
      });

      res.status(500).json({
        success: false,
        error: config.env === 'production' ? 'Internal server error' : error.message,
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      this.gracefulShutdown();
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
      this.gracefulShutdown();
    });

    // Handle termination signals
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received');
      this.gracefulShutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received');
      this.gracefulShutdown();
    });
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info('Starting graceful shutdown...');

    try {
      // Stop accepting new connections
      this.grpcServer.stop();
      
      // Disconnect from MQTT
      await this.mqttService.disconnect();
      
      // Close database connection
      await this.database.disconnect();
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    try {
      // Start HTTP server first
      const port = config.port;
      this.app.listen(port, () => {
        logger.info(`HTTP server started on port ${port}`);
        logger.info(`Environment: ${config.env}`);
        logger.info('Server is ready to accept connections');
      });

      // Try to initialize services but don't fail if they're not available
      try {
        await this.database.connect();
        logger.info('Database connected successfully');
      } catch (error) {
        logger.warn('Database connection failed - continuing without database:', error);
      }

      try {
        await this.mqttService.connect();
        logger.info('MQTT connected successfully');
      } catch (error) {
        logger.warn('MQTT connection failed - continuing without MQTT:', error);
      }

      try {
        this.grpcServer.start();
        logger.info('gRPC server started successfully');
      } catch (error) {
        logger.warn('gRPC server failed to start - continuing without gRPC:', error);
      }

    } catch (error) {
      logger.error('Failed to start HTTP server', error);
      process.exit(1);
    }
  }
}

// Start the application
const app = new App();
app.start().catch((error) => {
  logger.error('Failed to start application', error);
  process.exit(1);
});
