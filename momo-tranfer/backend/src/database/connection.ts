import r from 'rethinkdb';
import { config } from '../config';
import { logger } from '../utils/logger';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private connection: r.Connection | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<r.Connection> {
    if (this.connection) {
      return this.connection;
    }

    try {
      const dbConfig = config.database.rethinkdb;
      
      // Add connection timeout
      const connectionPromise = r.connect({
        host: dbConfig.host,
        port: dbConfig.port,
        db: dbConfig.db,
        timeout: 5, // 5 second timeout
      });

      // Add a timeout wrapper
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      );

      this.connection = await Promise.race([connectionPromise, timeoutPromise]) as r.Connection;

      logger.info('Connected to RethinkDB successfully');
      
      // Setup database and tables if they don't exist
      await this.setupDatabase();
      
      return this.connection;
    } catch (error) {
      logger.error('Failed to connect to RethinkDB:', error);
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
      logger.info('Disconnected from RethinkDB');
    }
  }

  public getConnection(): r.Connection {
    if (!this.connection) {
      throw new Error('Database not connected');
    }
    return this.connection;
  }

  private async setupDatabase(): Promise<void> {
    const dbName = config.database.rethinkdb.db;
    
    try {
      // Create database if it doesn't exist
      const dbList = await r.dbList().run(this.connection!);
      if (!dbList.includes(dbName)) {
        await r.dbCreate(dbName).run(this.connection!);
        logger.info(`Database '${dbName}' created`);
      }

      // Create tables
      await this.createTables();
      await this.createIndexes();
      
      logger.info('Database setup completed');
    } catch (error) {
      logger.error('Database setup failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    const tables = [
      'users',
      'payments',
      'transactions',
      'notifications',
      'sessions',
      'balances',
      'payment_requests',
      'system_logs',
      'api_keys',
      'webhooks'
    ];

    const existingTables = await r.db(config.database.rethinkdb.db).tableList().run(this.connection!);

    for (const table of tables) {
      if (!existingTables.includes(table)) {
        await r.db(config.database.rethinkdb.db).tableCreate(table, {
          primary_key: 'id',
          durability: 'hard',
        }).run(this.connection!);
        logger.info(`Table '${table}' created`);
      }
    }
  }

  private async createIndexes(): Promise<void> {
    const indexes = [
      // Users table indexes
      { table: 'users', index: 'phone_number' },
      { table: 'users', index: 'email' },
      { table: 'users', index: 'created_at' },
      { table: 'users', index: 'status' },

      // Payments table indexes
      { table: 'payments', index: 'sender_id' },
      { table: 'payments', index: 'recipient_phone' },
      { table: 'payments', index: 'status' },
      { table: 'payments', index: 'created_at' },
      { table: 'payments', index: 'reference' },
      { table: 'payments', index: 'provider' },

      // Transactions table indexes
      { table: 'transactions', index: 'user_id' },
      { table: 'transactions', index: 'type' },
      { table: 'transactions', index: 'status' },
      { table: 'transactions', index: 'created_at' },
      { table: 'transactions', index: 'reference' },

      // Notifications table indexes
      { table: 'notifications', index: 'user_id' },
      { table: 'notifications', index: 'type' },
      { table: 'notifications', index: 'is_read' },
      { table: 'notifications', index: 'created_at' },

      // Sessions table indexes
      { table: 'sessions', index: 'user_id' },
      { table: 'sessions', index: 'token' },
      { table: 'sessions', index: 'expires_at' },

      // Balances table indexes
      { table: 'balances', index: 'user_id' },
      { table: 'balances', index: 'currency' },

      // Payment requests table indexes
      { table: 'payment_requests', index: 'requester_id' },
      { table: 'payment_requests', index: 'payer_phone' },
      { table: 'payment_requests', index: 'status' },
      { table: 'payment_requests', index: 'expires_at' },

      // System logs indexes
      { table: 'system_logs', index: 'level' },
      { table: 'system_logs', index: 'service' },
      { table: 'system_logs', index: 'created_at' },

      // Compound indexes
      { table: 'payments', index: ['sender_id', 'created_at'] },
      { table: 'transactions', index: ['user_id', 'created_at'] },
      { table: 'notifications', index: ['user_id', 'is_read'] },
    ];

    for (const { table, index } of indexes) {
      try {
        const existingIndexes = await r.table(table).indexList().run(this.connection!);
        const indexName = Array.isArray(index) ? index.join('_') : index;
        
        if (!existingIndexes.includes(indexName)) {
          if (Array.isArray(index)) {
            await r.table(table).indexCreate(indexName, (row: any) => index.map(field => row(field))).run(this.connection!);
          } else {
            await r.table(table).indexCreate(index).run(this.connection!);
          }
          logger.info(`Index '${indexName}' created on table '${table}'`);
        }
      } catch (error) {
        logger.warn(`Failed to create index '${index}' on table '${table}':`, error);
      }
    }

    // Wait for all indexes to be ready
    for (const { table } of indexes) {
      try {
        await r.table(table).indexWait().run(this.connection!);
      } catch (error) {
        logger.warn(`Failed to wait for indexes on table '${table}':`, error);
      }
    }
  }

  // CRUD Operations
  public async insert(table: string, document: any): Promise<any> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    try {
      const result = await r.table(table).insert(document).run(this.connection);
      return result;
    } catch (error) {
      logger.error(`Error inserting document into ${table}:`, error);
      throw error;
    }
  }

  public async getById(table: string, id: string): Promise<any> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    try {
      const result = await r.table(table).get(id).run(this.connection);
      return result;
    } catch (error) {
      logger.error(`Error getting document by ID from ${table}:`, error);
      throw error;
    }
  }

  public async findOne(table: string, filter: any): Promise<any> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    try {
      const result = await r.table(table).filter(filter).nth(0).default(null).run(this.connection);
      return result;
    } catch (error) {
      logger.error(`Error finding document in ${table}:`, error);
      throw error;
    }
  }

  public async find(table: string, filter: any = {}, options: any = {}): Promise<any[]> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    try {
      let query: any = r.table(table);
      
      if (Object.keys(filter).length > 0) {
        query = query.filter(filter);
      }

      if (options.sort) {
        query = query.orderBy(options.sort);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.skip(options.offset);
      }

      const result = await query.run(this.connection);
      return await result.toArray();
    } catch (error) {
      logger.error(`Error finding documents in ${table}:`, error);
      throw error;
    }
  }

  public async update(table: string, id: string, updates: any): Promise<any> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    try {
      const result = await r.table(table).get(id).update(updates).run(this.connection);
      return result;
    } catch (error) {
      logger.error(`Error updating document in ${table}:`, error);
      throw error;
    }
  }

  public async delete(table: string, id: string): Promise<any> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    try {
      const result = await r.table(table).get(id).delete().run(this.connection);
      return result;
    } catch (error) {
      logger.error(`Error deleting document from ${table}:`, error);
      throw error;
    }
  }

  public async count(table: string, filter: any = {}): Promise<number> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    try {
      let query: any = r.table(table);
      
      if (Object.keys(filter).length > 0) {
        query = query.filter(filter);
      }

      const result = await query.count().run(this.connection);
      return result;
    } catch (error) {
      logger.error(`Error counting documents in ${table}:`, error);
      throw error;
    }
  }
}

export const database = DatabaseConnection.getInstance();