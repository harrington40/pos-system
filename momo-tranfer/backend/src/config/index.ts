import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '3001'),
  env: process.env.NODE_ENV || 'development',
  host: process.env.HOST || 'localhost',
  server: {
    port: parseInt(process.env.PORT || '3001'),
    host: process.env.HOST || 'localhost',
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // Database Configuration
  database: {
    rethinkdb: {
      host: process.env.RETHINKDB_HOST || 'localhost',
      port: parseInt(process.env.RETHINKDB_PORT || '28015'),
      db: process.env.RETHINKDB_DB || 'momo_transfer',
      authKey: process.env.RETHINKDB_AUTH_KEY || '',
    },
  },

  // MQTT Configuration
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
    clientId: process.env.MQTT_CLIENT_ID || 'momo-backend-server',
    topics: {
      payments: 'momo/payments',
      notifications: 'momo/notifications',
      transactions: 'momo/transactions',
      userStatus: 'momo/users/status',
      systemEvents: 'momo/system/events',
    },
  },

  // gRPC Configuration
  grpc: {
    port: parseInt(process.env.GRPC_PORT || '50051'),
    host: process.env.GRPC_HOST || 'localhost',
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-jwt-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // API Configuration
  api: {
    version: process.env.API_VERSION || 'v1',
    prefix: process.env.API_PREFIX || '/api',
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    },
  },

  // Mobile Money Provider APIs
  providers: {
    mtn: {
      apiUrl: process.env.MTN_MOMO_API_URL || 'https://sandbox.momodeveloper.mtn.com',
      apiKey: process.env.MTN_MOMO_API_KEY || '',
      apiSecret: process.env.MTN_MOMO_API_SECRET || '',
      subscriptionKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY || '',
    },
    mpesa: {
      apiUrl: process.env.MPESA_API_URL || 'https://sandbox.safaricom.co.ke',
      consumerKey: process.env.MPESA_CONSUMER_KEY || '',
      consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    },
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs/app.log',
  },

  // Security Configuration
  security: {
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
  },

  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },

  // Application Constants
  constants: {
    defaultCurrency: 'UGX',
    supportedCurrencies: ['UGX', 'KES', 'TZS', 'RWF', 'GHS', 'NGN', 'ZAR'],
    transactionTypes: {
      SEND: 'SEND',
      RECEIVE: 'RECEIVE',
      DEPOSIT: 'DEPOSIT',
      WITHDRAWAL: 'WITHDRAWAL',
      FEE: 'FEE',
    },
    paymentStatuses: {
      PENDING: 'PENDING',
      PROCESSING: 'PROCESSING',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
      CANCELLED: 'CANCELLED',
    },
    userStatuses: {
      ACTIVE: 'ACTIVE',
      INACTIVE: 'INACTIVE',
      SUSPENDED: 'SUSPENDED',
      VERIFIED: 'VERIFIED',
    },
  },
};

export default config;