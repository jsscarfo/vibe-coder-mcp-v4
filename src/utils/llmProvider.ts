/**
 * LLM Provider Utility
 * 
 * Provides a unified interface for making calls to language models via OpenRouter.
 * Handles configuration, authentication, and error handling.
 */

import axios from 'axios';
import { logger } from '../logger';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration from environment variables
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'openrouter/quasar-alpha';

// Error messages
const API_KEY_ERROR = 'OpenRouter API key not found. Set the OPENROUTER_API_KEY environment variable.';
const NETWORK_ERROR = 'Network error occurred while calling the LLM API: ';
const API_ERROR = 'LLM API returned an error: ';
const TIMEOUT_ERROR = 'LLM API request timed out after 60 seconds.';

// Define message and call types
export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stop?: string[];
  tools?: any[];
  toolChoice?: string | object;
}

export interface LlmRequest {
  model: string | 'auto';
  messages: LlmMessage[];
  options?: LlmOptions;
}

export interface LlmResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
      tool_calls?: any[];
    };
    finish_reason: string;
    index: number;
  }[];
  model: string;
  created: number;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Model mapping (allows for model aliases)
const llm_mapping: Record<string, string> = {
  'auto': GEMINI_MODEL,
  'gemini': GEMINI_MODEL,
  'quasar': 'openrouter/quasar-alpha'
};

/**
 * Makes a direct call to the LLM API
 * 
 * @param request - The LLM request
 * @returns The LLM response
 * @throws Error if the API call fails
 */
export async function performDirectLlmCall(request: LlmRequest): Promise<LlmResponse> {
  if (!OPENROUTER_API_KEY) {
    logger.error(API_KEY_ERROR);
    throw new Error(API_KEY_ERROR);
  }
  
  // Use mapped model or the provided one
  const model = request.model === 'auto' || request.model in llm_mapping
    ? llm_mapping[request.model]
    : request.model;
  
  // Build request body
  const body: any = {
    model,
    messages: request.messages
  };
  
  // Add optional parameters if provided
  if (request.options) {
    if (request.options.temperature !== undefined) body.temperature = request.options.temperature;
    if (request.options.maxTokens !== undefined) body.max_tokens = request.options.maxTokens;
    if (request.options.topP !== undefined) body.top_p = request.options.topP;
    if (request.options.topK !== undefined) body.top_k = request.options.topK;
    if (request.options.presencePenalty !== undefined) body.presence_penalty = request.options.presencePenalty;
    if (request.options.frequencyPenalty !== undefined) body.frequency_penalty = request.options.frequencyPenalty;
    if (request.options.stop !== undefined) body.stop = request.options.stop;
    if (request.options.tools !== undefined) body.tools = request.options.tools;
    if (request.options.toolChoice !== undefined) body.tool_choice = request.options.toolChoice;
  }
  
  try {
    // Make API call with 60-second timeout
    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      body,
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://github.com/jsscarfo/vibe-coder-mcp-v4',
          'X-Title': 'Vibe Coder MCP Server'
        },
        timeout: 60000 // 60 seconds
      }
    );
    
    return response.data as LlmResponse;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        logger.error(TIMEOUT_ERROR);
        throw new Error(TIMEOUT_ERROR);
      }
      
      if (error.response) {
        // API error with response
        const message = `${API_ERROR} ${error.response.status} - ${JSON.stringify(error.response.data)}`;
        logger.error(message);
        throw new Error(message);
      } else if (error.request) {
        // Network error
        logger.error(NETWORK_ERROR + error.message);
        throw new Error(NETWORK_ERROR + error.message);
      }
    }
    
    // Unknown error
    logger.error('Unknown error during LLM API call:', error);
    throw error;
  }
}

/**
 * Wrapper for generating text using the configured LLM
 * 
 * @param prompt - User prompt
 * @param systemPrompt - Optional system prompt
 * @param options - Additional LLM options
 * @returns Generated text
 */
export async function generateText(
  prompt: string,
  systemPrompt?: string,
  options?: LlmOptions
): Promise<string> {
  const messages: LlmMessage[] = [];
  
  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt
    });
  }
  
  messages.push({
    role: 'user',
    content: prompt
  });
  
  try {
    const response = await performDirectLlmCall({
      model: 'auto',
      messages,
      options
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    logger.error('Text generation failed:', error);
    throw error;
  }
}

export default {
  performDirectLlmCall,
  generateText
};