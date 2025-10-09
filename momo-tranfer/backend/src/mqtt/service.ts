import mqtt, { MqttClient } from 'mqtt';
import { config } from '../config';
import { EventEmitter } from 'events';

export interface MQTTMessage {
  topic: string;
  payload: any;
  timestamp: number;
  messageId?: string;
}

export interface PaymentEvent {
  type: 'PAYMENT_INITIATED' | 'PAYMENT_COMPLETED' | 'PAYMENT_FAILED' | 'PAYMENT_CANCELLED';
  paymentId: string;
  userId: string;
  amount: number;
  currency: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface NotificationEvent {
  type: 'TRANSACTION' | 'SYSTEM' | 'PROMOTION' | 'SECURITY';
  userId: string;
  title: string;
  message: string;
  timestamp: number;
  data?: Record<string, any>;
}

export interface UserStatusEvent {
  type: 'ONLINE' | 'OFFLINE' | 'ACTIVE' | 'INACTIVE';
  userId: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class MQTTService extends EventEmitter {
  private static instance: MQTTService;
  private client: MqttClient | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  private constructor() {
    super();
  }

  public static getInstance(): MQTTService {
    if (!MQTTService.instance) {
      MQTTService.instance = new MQTTService();
    }
    return MQTTService.instance;
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const options = {
          clientId: config.mqtt.clientId,
          username: config.mqtt.username || undefined,
          password: config.mqtt.password || undefined,
          clean: true,
          reconnectPeriod: 5000,
          connectTimeout: 30000,
          will: {
            topic: `${config.mqtt.topics.systemEvents}/offline`,
            payload: JSON.stringify({
              clientId: config.mqtt.clientId,
              timestamp: Date.now(),
              message: 'Backend server offline'
            }),
            qos: 1 as 0 | 1 | 2,
            retain: false
          }
        };

        this.client = mqtt.connect(config.mqtt.brokerUrl, options);

        this.client.on('connect', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('Connected to MQTT broker successfully');
          
          // Subscribe to essential topics
          this.subscribeToTopics();
          
          // Publish online status
          this.publishSystemEvent('BACKEND_ONLINE', {
            clientId: config.mqtt.clientId,
            timestamp: Date.now()
          });

          resolve();
        });

        this.client.on('error', (error) => {
          console.error('MQTT connection error:', error);
          this.isConnected = false;
          
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        });

        this.client.on('offline', () => {
          this.isConnected = false;
          console.warn('MQTT client offline');
        });

        this.client.on('reconnect', () => {
          this.reconnectAttempts++;
          console.log(`MQTT reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.client?.end();
          }
        });

        this.client.on('message', (topic, message) => {
          this.handleIncomingMessage(topic, message);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      // Publish offline status
      this.publishSystemEvent('BACKEND_OFFLINE', {
        clientId: config.mqtt.clientId,
        timestamp: Date.now()
      });

      await this.client.endAsync();
      this.client = null;
      this.isConnected = false;
      console.log('Disconnected from MQTT broker');
    }
  }

  private subscribeToTopics(): void {
    if (!this.client || !this.isConnected) return;

    const topics = [
      `${config.mqtt.topics.payments}/+/status`,
      `${config.mqtt.topics.notifications}/+`,
      `${config.mqtt.topics.userStatus}/+`,
      `${config.mqtt.topics.systemEvents}/+`
    ];

    topics.forEach(topic => {
      this.client!.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          console.error(`Failed to subscribe to topic ${topic}:`, error);
        } else {
          console.log(`Subscribed to topic: ${topic}`);
        }
      });
    });
  }

  private handleIncomingMessage(topic: string, message: Buffer): void {
    try {
      const payload = JSON.parse(message.toString());
      const mqttMessage: MQTTMessage = {
        topic,
        payload,
        timestamp: Date.now()
      };

      // Emit event based on topic pattern
      if (topic.includes('/payments/')) {
        this.emit('paymentEvent', payload as PaymentEvent);
      } else if (topic.includes('/notifications/')) {
        this.emit('notificationEvent', payload as NotificationEvent);
      } else if (topic.includes('/users/status/')) {
        this.emit('userStatusEvent', payload as UserStatusEvent);
      } else if (topic.includes('/system/events/')) {
        this.emit('systemEvent', payload);
      }

      // Emit generic message event
      this.emit('message', mqttMessage);

    } catch (error) {
      console.error('Error parsing MQTT message:', error);
    }
  }

  // Payment Events
  public publishPaymentEvent(event: PaymentEvent): void {
    const topic = `${config.mqtt.topics.payments}/${event.paymentId}/status`;
    this.publish(topic, event);
  }

  public publishPaymentInitiated(paymentId: string, userId: string, amount: number, currency: string): void {
    this.publishPaymentEvent({
      type: 'PAYMENT_INITIATED',
      paymentId,
      userId,
      amount,
      currency,
      timestamp: Date.now()
    });
  }

  public publishPaymentCompleted(paymentId: string, userId: string, amount: number, currency: string): void {
    this.publishPaymentEvent({
      type: 'PAYMENT_COMPLETED',
      paymentId,
      userId,
      amount,
      currency,
      timestamp: Date.now()
    });
  }

  public publishPaymentFailed(paymentId: string, userId: string, amount: number, currency: string, error: string): void {
    this.publishPaymentEvent({
      type: 'PAYMENT_FAILED',
      paymentId,
      userId,
      amount,
      currency,
      timestamp: Date.now(),
      metadata: { error }
    });
  }

  // Notification Events
  public publishNotification(notification: NotificationEvent): void {
    const topic = `${config.mqtt.topics.notifications}/${notification.userId}`;
    this.publish(topic, notification);
  }

  public publishTransactionNotification(userId: string, title: string, message: string, data?: Record<string, any>): void {
    this.publishNotification({
      type: 'TRANSACTION',
      userId,
      title,
      message,
      timestamp: Date.now(),
      data
    });
  }

  // User Status Events
  public publishUserStatus(userId: string, status: 'ONLINE' | 'OFFLINE' | 'ACTIVE' | 'INACTIVE'): void {
    const topic = `${config.mqtt.topics.userStatus}/${userId}`;
    const event: UserStatusEvent = {
      type: status,
      userId,
      timestamp: Date.now()
    };
    this.publish(topic, event);
  }

  // System Events
  public publishSystemEvent(type: string, data: Record<string, any>): void {
    const topic = `${config.mqtt.topics.systemEvents}/${type.toLowerCase()}`;
    this.publish(topic, {
      type,
      timestamp: Date.now(),
      ...data
    });
  }

  // Generic publish method
  public publish(topic: string, payload: any, options: { qos?: 0 | 1 | 2; retain?: boolean } = {}): void {
    if (!this.client || !this.isConnected) {
      console.warn('MQTT client not connected, cannot publish message');
      return;
    }

    const message = JSON.stringify(payload);
    
    this.client.publish(topic, message, {
      qos: options.qos || 1,
      retain: options.retain || false
    }, (error) => {
      if (error) {
        console.error(`Failed to publish to topic ${topic}:`, error);
      } else {
        console.log(`Published to topic: ${topic}`);
      }
    });
  }

  public isClientConnected(): boolean {
    return this.isConnected && this.client !== null;
  }
}

export const mqttService = MQTTService.getInstance();