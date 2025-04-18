#!/usr/bin/env node
/**
 * Vibe Coder MCP Server - Entry Point
 * 
 * This is the main entry point for the MCP server.
 * It initializes the server, registers tools, and starts listening for requests.
 */

import { createMCPServer } from '@modelcontextprotocol/sdk/server/index.js';
import { logger } from './logger';
import { getAllTools, executeTool } from './tools';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Start initialization
logger.info(`
===============================================================
⚡ Vibe Coder MCP Server v1.2.0 - Final v4 Release ⚡
===============================================================
`);

// Parse command-line arguments
const useSSE = process.argv.includes('--sse');

// Create and configure the MCP server
logger.info(`Creating MCP server in ${useSSE ? 'SSE/HTTP' : 'stdio'} mode...`);

const server = createMCPServer({
  transport: useSSE ? 'sse' : 'stdio',
  logger: {
    info: (message) => logger.info(message),
    error: (message) => logger.error(message),
    warn: (message) => logger.warn(message),
    debug: (message) => logger.debug(message),
  }
});

// Register all tools with the MCP server
logger.info('Registering tools...');
const tools = getAllTools();

tools.forEach(tool => {
  try {
    server.tool(tool.name, tool.description, async (params, context) => {
      try {
        logger.info(`Executing tool: ${tool.name}`);
        logger.debug('Tool params:', params);
        logger.debug('Tool context:', context);
        
        const result = await executeTool(tool.name, params);
        
        logger.debug(`Tool ${tool.name} completed successfully`);
        return result;
      } catch (error: any) {
        logger.error(`Error executing tool ${tool.name}:`, error);
        throw new Error(`Tool execution error: ${error.message}`);
      }
    });
    
    logger.debug(`Registered tool: ${tool.name}`);
  } catch (error: any) {
    logger.error(`Failed to register tool ${tool.name}:`, error);
  }
});

logger.info(`Registered ${tools.length} tools successfully.`);

// Configure error handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// Start the server
logger.info('Starting MCP server...');

try {
  server.start({
    port: useSSE ? (process.env.PORT ? parseInt(process.env.PORT) : 3000) : undefined
  });
  
  if (useSSE) {
    logger.info(`MCP server started in SSE mode on port ${process.env.PORT || 3000}`);
  } else {
    logger.info('MCP server started in stdio mode');
  }
  
  logger.info(`
===============================================================
🚀 Vibe Coder MCP Server is ready!
===============================================================
${useSSE ? `Access at: http://localhost:${process.env.PORT || 3000}` : ''}
Available tools: ${tools.map(t => t.name).join(', ')}
Log level: ${process.env.LOG_LEVEL || 'info'}
Environment: ${process.env.NODE_ENV || 'development'}
===============================================================
`);
} catch (error) {
  logger.error('Failed to start MCP server:', error);
  process.exit(1);
}