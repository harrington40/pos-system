import mqtt, { MqttClient } from 'mqtt';
import { EventEmitter } from 'events';
import { config } from '../config';
import { logger } from '../utils/logger';
import { 
  MqttMessage, 
  MqttSubscription, 
  PaymentNotification 
} from '../types';

export class MqttService extends EventEmitter {
  private static instance: MqttService;
  private client: MqttClient | null = null;
  private subscriptions: Map<string, MqttSubscription[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  private constructor() {
    super();
  }

  public static getInstance(): MqttService {
    if (!MqttService.instance) {
      MqttService.instance = new MqttService();
    }
    return MqttService.instance;
  }

  public async connect(): Promise<void> {
    try {
      const mqttConfig = config.mqtt;
      
      this.client = mqtt.connect(mqttConfig.brokerUrl, {
        clientId: mqttConfig.clientId,
        username: mqttConfig.username || undefined,
        password: mqttConfig.password || undefined,
        keepalive: 60,
        reconnectPeriod: 5000,
        connectTimeout: 5000, // Reduced to 5 seconds
        clean: true,
      });

      return new Promise((resolve, reject) => {
        if (!this.client) {
          reject(new Error('MQTT client not initialized'));
          return;
        }

        // Add a timeout
        const timeout = setTimeout(() => {
          reject(new Error('MQTT connection timeout'));
        }, 5000);

        this.client.on('connect', () => {
          clearTimeout(timeout);
          logger.info('MQTT connected successfully', {
            broker: mqttConfig.brokerUrl,
            clientId: mqttConfig.clientId,
          });
          this.reconnectAttempts = 0;
          this.setupEventHandlers();
          resolve();
        });

        this.client.on('error', (error) => {
          clearTimeout(timeout);
          logger.error('MQTT connection error', error);
          reject(error);
        });
      });

    } catch (error) {
      logger.error('Failed to connect to MQTT broker', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('message', (topic, payload) => {
      try {
        const message: MqttMessage = {
          topic,
          payload: JSON.parse(payload.toString()),
          timestamp: new Date(),
        };

        logger.debug('MQTT message received', {
          topic,
          payload: message.payload,
        });

        // Handle subscriptions
        const topicSubscriptions = this.subscriptions.get(topic) || [];
        topicSubscriptions.forEach(subscription => {
          try {
            subscription.callback(message);
          } catch (error) {
            logger.error('Error in MQTT subscription callback', {
              topic,
              error,
            });
          }
        });

        // Emit event for global listeners
        this.emit('message', message);

      } catch (error) {
        logger.error('Error processing MQTT message', {
          topic,
          error,
        });
      }
    });

    this.client.on('disconnect', () => {
      logger.warn('MQTT disconnected');
      this.emit('disconnect');
    });

    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      logger.info('MQTT reconnecting', {
        attempt: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
      });

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.error('MQTT max reconnection attempts reached');
        this.client?.end();
      }
    });

    this.client.on('offline', () => {
      logger.warn('MQTT client offline');
      this.emit('offline');
    });
  }

  public async publish(topic: string, payload: any): Promise<void> {
    if (!this.client || !this.client.connected) {
      throw new Error('MQTT client not connected');
    }

    try {
      const message = JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString(),
      });

      return new Promise((resolve, reject) => {
        this.client!.publish(topic, message, { qos: 1 }, (error) => {
          if (error) {
            logger.error('MQTT publish error', {
              topic,
              error,
            });
            reject(error);
          } else {
            logger.debug('MQTT message published', {
              topic,
              payload,
            });
            resolve();
          }
        });
      });

    } catch (error) {
      logger.error('Error publishing MQTT message', {
        topic,
        payload,
        error,
      });
      throw error;
    }
  }

  public async subscribe(topic: string, callback: (message: MqttMessage) => void): Promise<void> {
    if (!this.client || !this.client.connected) {
      throw new Error('MQTT client not connected');
    }

    try {
      const subscription: MqttSubscription = {
        topic,
        callback,
      };

      // Add to subscriptions map
      if (!this.subscriptions.has(topic)) {
        this.subscriptions.set(topic, []);
      }
      this.subscriptions.get(topic)!.push(subscription);

      // Subscribe to topic
      return new Promise((resolve, reject) => {
        this.client!.subscribe(topic, { qos: 1 }, (error) => {
          if (error) {
            logger.error('MQTT subscribe error', {
              topic,
              error,
            });
            reject(error);
          } else {
            logger.info('MQTT subscribed to topic', { topic });
            resolve();
          }
        });
      });

    } catch (error) {
      logger.error('Error subscribing to MQTT topic', {
        topic,
        error,
      });
      throw error;
    }
  }

  public async unsubscribe(topic: string): Promise<void> {
    if (!this.client || !this.client.connected) {
      throw new Error('MQTT client not connected');
    }

    try {
      // Remove from subscriptions map
      this.subscriptions.delete(topic);

      // Unsubscribe from topic
      return new Promise((resolve, reject) => {
        this.client!.unsubscribe(topic, (error) => {
          if (error) {
            logger.error('MQTT unsubscribe error', {
              topic,
              error,
            });
            reject(error);
          } else {
            logger.info('MQTT unsubscribed from topic', { topic });
            resolve();
          }
        });
      });

    } catch (error) {
      logger.error('Error unsubscribing from MQTT topic', {
        topic,
        error,
      });
      throw error;
    }
  }

  public async publishNotification(notification: PaymentNotification): Promise<void> {
    const topic = `notifications/${notification.userId}`;
    await this.publish(topic, notification);
  }

  public async subscribeToUserNotifications(
    userId: string, 
    callback: (notification: PaymentNotification) => void
  ): Promise<void> {
    const topic = `notifications/${userId}`;
    await this.subscribe(topic, (message) => {
      if (message.payload && message.payload.userId === userId) {
        callback(message.payload as PaymentNotification);
      }
    });
  }

  public async publishSystemMessage(message: any): Promise<void> {
    const topic = 'system/broadcasts';
    await this.publish(topic, message);
  }

  public async subscribeToSystemMessages(
    callback: (message: any) => void
  ): Promise<void> {
    const topic = 'system/broadcasts';
    await this.subscribe(topic, (mqttMessage) => {
      callback(mqttMessage.payload);
    });
  }

  public isConnected(): boolean {
    return this.client ? this.client.connected : false;
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      return new Promise((resolve) => {
        this.client!.end(false, () => {
          logger.info('MQTT client disconnected');
          this.client = null;
          this.subscriptions.clear();
          resolve();
        });
      });
    }
  }

  public getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    subscriptions: string[];
  } {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: Array.from(this.subscriptions.keys()),
    };
  }
}