/**
 * Logging Module
 * 
 * Provides a centralized logging system for the application,
 * with configurable log levels and formatting.
 */

import pino from 'pino';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get log level from environment (default to 'info')
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Create logger instance
const logger = pino({
  level: LOG_LEVEL,
  transport: {
    target: 'pino/file',
    options: { destination: process.env.NODE_ENV === 'production' ? 'server.log' : 1 }
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label };
    }
  }
});

export { logger };