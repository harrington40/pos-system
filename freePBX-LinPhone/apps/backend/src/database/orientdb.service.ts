import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OrientDB from 'orientjs';

@Injectable()
export class OrientDBService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrientDBService.name);
  private server: any;
  private db: any;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      // Connect to OrientDB server
      this.server = OrientDB({
        host: this.configService.get('ORIENTDB_HOST', 'localhost'),
        port: this.configService.get('ORIENTDB_PORT', 2424),
        username: this.configService.get('ORIENTDB_USERNAME', 'root'),
        password: this.configService.get('ORIENTDB_PASSWORD', 'root')
      });

      const dbName = this.configService.get('ORIENTDB_DATABASE', 'smart_sip');

      // Check if database exists
      const databases = await this.server.list();
      const dbExists = databases.some((db: any) => db.name === dbName);

      if (!dbExists) {
        this.logger.log(`Creating database: ${dbName}`);
        await this.server.create({
          name: dbName,
          type: 'graph',
          storage: 'plocal'
        });
      }

      // Connect to database
      this.db = this.server.use({
        name: dbName,
        username: this.configService.get('ORIENTDB_USERNAME', 'admin'),
        password: this.configService.get('ORIENTDB_PASSWORD', 'admin')
      });

      this.logger.log('Connected to OrientDB');

      // Initialize schema
      await this.initializeSchema();
    } catch (error) {
      this.logger.error('Failed to connect to OrientDB', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.db) {
      await this.db.close();
    }
    if (this.server) {
      await this.server.close();
    }
    this.logger.log('Disconnected from OrientDB');
  }

  private async initializeSchema() {
    try {
      // Create Agent class
      await this.db.class.get('Agent').catch(async () => {
        await this.db.class.create('Agent', 'V');
        this.logger.log('Created Agent class');
      });

      // Create Call class
      await this.db.class.get('Call').catch(async () => {
        await this.db.class.create('Call', 'V');
        this.logger.log('Created Call class');
      });

      // Create Queue class
      await this.db.class.get('Queue').catch(async () => {
        await this.db.class.create('Queue', 'V');
        this.logger.log('Created Queue class');
      });

      // Create Skill class
      await this.db.class.get('Skill').catch(async () => {
        await this.db.class.create('Skill', 'V');
        this.logger.log('Created Skill class');
      });

      // Create edge classes
      await this.db.class.get('HandledBy').catch(async () => {
        await this.db.class.create('HandledBy', 'E');
        this.logger.log('Created HandledBy edge class');
      });

      await this.db.class.get('HasSkill').catch(async () => {
        await this.db.class.create('HasSkill', 'E');
        this.logger.log('Created HasSkill edge class');
      });

      await this.db.class.get('InQueue').catch(async () => {
        await this.db.class.create('InQueue', 'E');
        this.logger.log('Created InQueue edge class');
      });

      this.logger.log('Schema initialized');
    } catch (error) {
      this.logger.error('Failed to initialize schema', error);
    }
  }

  getDatabase() {
    return this.db;
  }

  async query(sql: string, params?: any) {
    return this.db.query(sql, params);
  }

  async execute(sql: string, params?: any) {
    return this.db.exec(sql, params);
  }

  async select(className: string, where?: any) {
    let query = `SELECT FROM ${className}`;
    if (where) {
      const conditions = Object.entries(where)
        .map(([key, value]) => `${key} = :${key}`)
        .join(' AND ');
      query += ` WHERE ${conditions}`;
    }
    return this.db.select().from(className).where(where || {}).all();
  }

  async insert(className: string, data: any) {
    return this.db.insert().into(className).set(data).one();
  }

  async update(className: string, data: any, where: any) {
    return this.db.update(className).set(data).where(where).scalar();
  }

  async delete(className: string, where: any) {
    return this.db.delete().from(className).where(where).scalar();
  }

  async createVertex(className: string, data: any) {
    return this.db.create('VERTEX', className).set(data).one();
  }

  async createEdge(edgeClass: string, from: string, to: string, data?: any) {
    let query = `CREATE EDGE ${edgeClass} FROM ${from} TO ${to}`;
    if (data) {
      query += ` SET ${Object.entries(data)
        .map(([key, value]) => `${key} = "${value}"`)
        .join(', ')}`;
    }
    return this.db.query(query);
  }
}
