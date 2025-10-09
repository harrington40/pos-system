export interface User {
    id: string;
    phoneNumber: string;
    email?: string;
    firstName: string;
    lastName: string;
    country: string;
    currency: string;
    balance: number;
    pin: string;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateUserRequest {
    phoneNumber: string;
    email?: string;
    firstName: string;
    lastName: string;
    country: string;
    currency: string;
    pin: string;
}
export interface LoginRequest {
    phoneNumber: string;
    pin: string;
}
export interface LoginResponse {
    user: Omit<User, 'pin'>;
    token: string;
    refreshToken: string;
}
export interface Transaction {
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
export interface CreateTransactionRequest {
    fromUserId: string;
    toUserId?: string;
    recipientPhone?: string;
    amount: number;
    currency: string;
    type: 'send' | 'receive' | 'deposit' | 'withdrawal';
    description?: string;
    metadata?: Record<string, any>;
}
export interface MqttMessage {
    topic: string;
    payload: any;
    userId?: string;
    timestamp: Date;
}
export interface MqttSubscription {
    topic: string;
    callback: (message: MqttMessage) => void;
}
export interface PaymentNotification {
    userId: string;
    transactionId: string;
    amount: number;
    currency: string;
    type: 'send' | 'receive';
    status: 'pending' | 'completed' | 'failed';
    message: string;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface DatabaseConfig {
    host: string;
    port: number;
    db: string;
    user?: string;
    password?: string;
}
export interface MqttConfig {
    host: string;
    port: number;
    username?: string;
    password?: string;
    clientId: string;
}
export interface GrpcConfig {
    host: string;
    port: number;
    protoPath: string;
}
export interface JwtConfig {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
}
export interface AppConfig {
    port: number;
    env: 'development' | 'production' | 'test';
    database: DatabaseConfig;
    mqtt: MqttConfig;
    grpc: GrpcConfig;
    jwt: JwtConfig;
    redis: {
        host: string;
        port: number;
        password?: string;
    };
}
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export interface LogMessage {
    level: LogLevel;
    message: string;
    timestamp: Date;
    service?: string;
    userId?: string;
    metadata?: Record<string, any>;
}
//# sourceMappingURL=index.d.ts.map