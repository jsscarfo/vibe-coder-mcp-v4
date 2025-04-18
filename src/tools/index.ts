/**
 * Tools Management System
 * 
 * This module provides a central registry for all tools in the MCP server.
 * It handles tool registration, validation, and execution.
 */

import { z } from 'zod';
import { logger } from '../logger';

// Tool registry to store all registered tools
const toolRegistry = new Map<string, ToolDefinition<any>>();

/**
 * Type definition for a tool
 */
export interface ToolDefinition<T extends z.ZodType> {
  name: string;
  description: string;
  schema: T;
  execute: (input: z.infer<T>) => Promise<any>;
}

/**
 * Registers a tool with the registry
 * 
 * @param tool - Tool definition to register
 */
export function registerTool<T extends z.ZodType>(tool: ToolDefinition<T>) {
  if (toolRegistry.has(tool.name)) {
    logger.warn(`Tool with name "${tool.name}" is already registered. Overwriting...`);
  }
  
  toolRegistry.set(tool.name, tool);
  logger.debug(`Registered tool: ${tool.name}`);
}

/**
 * Gets a tool from the registry by name
 * 
 * @param name - Name of the tool to get
 * @returns Tool definition or undefined if not found
 */
export function getTool(name: string): ToolDefinition<any> | undefined {
  return toolRegistry.get(name);
}

/**
 * Gets all registered tools
 * 
 * @returns Array of all registered tools
 */
export function getAllTools(): ToolDefinition<any>[] {
  return Array.from(toolRegistry.values());
}

/**
 * Executes a tool with the given input
 * 
 * @param name - Name of the tool to execute
 * @param input - Input to pass to the tool
 * @returns Result of tool execution
 * @throws Error if tool not found or input validation fails
 */
export async function executeTool(name: string, input: any): Promise<any> {
  const tool = getTool(name);
  
  if (!tool) {
    throw new Error(`Tool "${name}" not found`);
  }
  
  try {
    // Validate input using tool's schema
    const validatedInput = tool.schema.parse(input);
    
    // Execute the tool
    const result = await tool.execute(validatedInput);
    
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Input validation error
      const formattedError = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('; ');
      
      throw new Error(`Input validation failed: ${formattedError}`);
    }
    
    // Re-throw other errors
    throw error;
  }
}

// Import all tool modules to register them
import './sequential-thinking';
import './contextual-retrieval';

// Additional imports for other tools would go here
// import './code-stub-generator';
// import './code-refactor-generator';
// etc.

export default {
  registerTool,
  getTool,
  getAllTools,
  executeTool
};