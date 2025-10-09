# MoMo Transfer Backend

A comprehensive backend service for the MoMo Transfer application built with Node.js, TypeScript, Express, MQTT, RethinkDB, and gRPC.

## 🏗️ Architecture

The backend follows a microservices architecture with the following components:

- **HTTP API Server**: Express.js REST API for client-server communication
- **gRPC Server**: High-performance API for service-to-service communication
- **MQTT Service**: Real-time messaging for payment notifications and events
- **Database**: RethinkDB for data persistence with real-time capabilities
- **Caching**: Redis for session management and caching
- **Authentication**: JWT-based authentication with refresh tokens

## 🚀 Features

### Core Services
- **User Management**: Registration, authentication, profile management
- **Transaction Processing**: Send/receive money, deposits, withdrawals
- **Real-time Notifications**: MQTT-based payment notifications
- **Security**: JWT authentication, bcrypt password hashing, rate limiting
- **Logging**: Comprehensive logging with Winston
- **Error Handling**: Graceful error handling and recovery

### Smart Features
- **Country Detection**: Phone number and GPS-based country detection
- **QR Code Payments**: Mobile-to-mobile payment information exchange
- **Multi-currency Support**: Support for different African currencies
- **Payment Providers**: Integration-ready for MTN MoMo, M-Pesa, and other providers

### Infrastructure
- **Docker Support**: Complete containerization with docker-compose
- **Health Checks**: Application health monitoring
- **Graceful Shutdown**: Proper resource cleanup on termination
- **TypeScript**: Full type safety and developer experience

## 📋 Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- RethinkDB
- Redis
- Eclipse Mosquitto (MQTT Broker)

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=28015
DB_NAME=momo_transfer

# MQTT
MQTT_HOST=localhost
MQTT_PORT=1883

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
```

### 3. Start Infrastructure Services

Using Docker Compose (recommended):

```bash
# Start all services (RethinkDB, MQTT, Redis)
docker-compose up -d

# Check service status
docker-compose ps
```

Or install services manually:
- [RethinkDB Installation](https://rethinkdb.com/docs/install/)
- [Redis Installation](https://redis.io/download)
- [Eclipse Mosquitto Installation](https://mosquitto.org/download/)

### 4. Build and Start the Application

```bash
# Build TypeScript
npm run build

# Start production server
npm start

# Or start development server with hot reload
npm run dev
```

## 🐳 Docker Development

The complete application stack can be run with Docker:

```bash
# Start all services including the backend
docker-compose up

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down
```

## 📡 API Endpoints

### Authentication
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User authentication

### User Management
- `GET /api/users/:userId` - Get user profile
- `PUT /api/users/:userId` - Update user profile
- `POST /api/users/:userId/balance` - Update user balance
- `POST /api/users/:userId/verify` - Verify user account

### Transactions
- `POST /api/transactions` - Create new transaction
- `GET /api/transactions/:transactionId` - Get transaction details
- `GET /api/transactions/user/:userId` - Get user transactions
- `POST /api/transactions/:transactionId/process` - Process transaction
- `POST /api/transactions/:transactionId/cancel` - Cancel transaction

### Health Check
- `GET /health` - Application health status

## 🔌 gRPC Services

The application exposes the following gRPC services:

### UserService
- `CreateUser` - Create new user account
- `AuthenticateUser` - User authentication
- `GetUser` - Retrieve user information
- `UpdateUser` - Update user profile
- `UpdateBalance` - Update user balance
- `VerifyUser` - Verify user account

### TransactionService
- `CreateTransaction` - Create new transaction
- `ProcessTransaction` - Process pending transaction
- `GetTransaction` - Get transaction details
- `GetUserTransactions` - Get user transaction history
- `CancelTransaction` - Cancel pending transaction

### PaymentService
- `InitiatePayment` - Start payment process
- `ConfirmPayment` - Confirm payment
- `GetPaymentStatus` - Check payment status

## 📨 MQTT Topics

### User Notifications
- `notifications/{userId}` - User-specific notifications
- `payments/status/{transactionId}` - Payment status updates
- `system/broadcasts` - System-wide announcements

### Example MQTT Message
```json
{
  "userId": "user_123",
  "transactionId": "txn_456",
  "amount": 100.00,
  "currency": "XOF",
  "type": "send",
  "status": "completed",
  "message": "Payment sent successfully"
}
```

## 🗄️ Database Schema

### Users Table
```typescript
interface User {
  id: string;
  phoneNumber: string;
  email?: string;
  firstName: string;
  lastName: string;
  country: string;
  currency: string;
  balance: number;
  pin: string; // hashed
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Transactions Table
```typescript
interface Transaction {
  id: string;
  fromUserId: string;
  toUserId?: string;
  recipientPhone?: string;
  amount: number;
  currency: string;
  type: 'send' | 'receive' | 'deposit' | 'withdrawal';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run dev:watch        # Start with file watching

# Building
npm run build           # Build TypeScript to JavaScript
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run test            # Run tests
npm run test:watch      # Run tests in watch mode

# Protocol Buffers
npm run proto:generate  # Generate TypeScript from .proto files

# Database
npm run db:migrate      # Run database migrations
npm run db:seed         # Seed database with test data
```

### Development Workflow

1. **Make Changes**: Edit TypeScript files in `src/`
2. **Test Locally**: Use `npm run dev` for hot reload
3. **Build**: Run `npm run build` to compile TypeScript
4. **Test**: Run tests with `npm test`
5. **Deploy**: Use Docker or build production bundle

## 🔒 Security Features

- **Authentication**: JWT tokens with refresh mechanism
- **Password Security**: bcrypt hashing with salt rounds
- **Rate Limiting**: Express rate limiting middleware
- **CORS**: Configurable CORS policies
- **Helmet**: Security headers middleware
- **Input Validation**: Request validation and sanitization

## 📊 Logging

The application uses Winston for comprehensive logging:

- **Console Logging**: Development-friendly console output
- **File Logging**: Persistent log files for production
- **Structured Logging**: JSON-formatted logs with metadata
- **Log Levels**: Error, warn, info, debug levels

Example log entry:
```json
{
  "level": "info",
  "message": "User authenticated successfully",
  "userId": "user_123",
  "phoneNumber": "+237123456789",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | HTTP server port | `3001` |
| `DB_HOST` | RethinkDB host | `localhost` |
| `DB_PORT` | RethinkDB port | `28015` |
| `MQTT_HOST` | MQTT broker host | `localhost` |
| `MQTT_PORT` | MQTT broker port | `1883` |
| `GRPC_PORT` | gRPC server port | `50051` |
| `JWT_SECRET` | JWT signing secret | - |
| `REDIS_HOST` | Redis host | `localhost` |

## 🚀 Production Deployment

### Docker Deployment

```bash
# Build production image
docker build -t momo-transfer-backend .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

```bash
# Install dependencies
npm ci --only=production

# Build application
npm run build

# Start with PM2
pm2 start dist/index.js --name momo-backend
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- --testNamePattern="UserService"
```

## 📈 Monitoring

### Health Checks

The `/health` endpoint provides application status:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

### Service Status

Monitor individual services:
- Database connectivity
- MQTT broker connection
- Redis availability
- gRPC server status

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the documentation
- Review the API examples
- Check the Docker logs for debugging

## 🗺️ Roadmap

- [ ] MTN MoMo API integration
- [ ] M-Pesa API integration
- [ ] Advanced fraud detection
- [ ] Multi-language support
- [ ] Analytics dashboard
- [ ] Webhook notifications
- [ ] Mobile SDK
- [ ] Merchant payment gateway