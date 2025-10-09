import winston from 'winston';
import { config } from '../config';

// Extend winston Logger with custom methods
interface CustomLogger extends winston.Logger {
  logRequest: (req: any, res: any, responseTime: number) => void;
  logMQTT: (event: string, topic: string, data?: any) => void;
  logGRPC: (method: string, request?: any, response?: any, error?: any) => void;
  logDB: (operation: string, table?: string, data?: any, error?: any) => void;
}

// Create custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Create console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss',
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    }`;
  })
);

// Create winston logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'momo-transfer-backend' },
  transports: [
    // Write all logs to file
    new winston.transports.File({
      filename: config.logging.filePath,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write errors to separate file
    new winston.transports.File({
      filename: config.logging.filePath.replace('.log', '-error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
}) as CustomLogger;

// Add console transport for development
if (config.server.nodeEnv !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Add method to log HTTP requests
logger.logRequest = (req: any, res: any, responseTime: number) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('user-agent'),
    ip: req.ip,
  });
};

// Add method to log MQTT events
logger.logMQTT = (event: string, topic: string, data?: any) => {
  logger.info('MQTT Event', {
    event,
    topic,
    data: data ? JSON.stringify(data) : undefined,
  });
};

// Add method to log gRPC calls
logger.logGRPC = (method: string, request?: any, response?: any, error?: any) => {
  if (error) {
    logger.error('gRPC Error', {
      method,
      error: error.message,
      stack: error.stack,
      request: request ? JSON.stringify(request) : undefined,
    });
  } else {
    logger.info('gRPC Call', {
      method,
      request: request ? JSON.stringify(request) : undefined,
      response: response ? JSON.stringify(response) : undefined,
    });
  }
};

// Add method to log database operations
logger.logDB = (operation: string, table?: string, data?: any, error?: any) => {
  if (error) {
    logger.error('Database Error', {
      operation,
      table,
      error: error.message,
      data: data ? JSON.stringify(data) : undefined,
    });
  } else {
    logger.debug('Database Operation', {
      operation,
      table,
      data: data ? JSON.stringify(data) : undefined,
    });
  }
};

export default logger;
export { logger };