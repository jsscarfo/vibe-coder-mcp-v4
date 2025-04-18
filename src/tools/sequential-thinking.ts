/**
 * Sequential Thinking Tool
 * 
 * This module provides a sequential thinking capability that breaks down complex
 * problems into manageable steps, used as a fallback for the semantic router.
 * It integrates with the ACRS system for enhanced contextual awareness.
 */

import { z } from 'zod';
import { logger } from '../logger';
import { enhancePrompt } from './contextual-retrieval';
import { registerTool } from './index';
import { performDirectLlmCall } from '../utils/llmProvider';

// Constants
const MAX_THOUGHTS = 6;
const THINKING_TEMPERATURE = 0.7;

// System prompts
const SYSTEM_PROMPT = `You are a planning assistant that thinks through problems step-by-step.
Given a request, break it down into a sequence of thoughts that lead to the appropriate action.
Each thought should build on previous thoughts, analyzing different aspects of the problem.
Your final thought should identify which specific tool should be used to handle the request.`;

const PROMPT_TEMPLATE = `REQUEST: {request}

Think about this request systematically. What tool would be the most appropriate to handle it?
Analyze the request by considering:
1. The primary task or goal
2. Required information or context
3. Appropriate tools for this type of task
4. Any constraints or special requirements

THOUGHTS:`;

/**
 * Thought type representation
 */
type ThoughtType = 'standard' | 'revision' | 'branch' | 'conclusion';

/**
 * Represents a single thought in the sequential thinking process
 */
interface Thought {
  number: number;
  content: string;
  type: ThoughtType;
}

/**
 * Interface for sequential thinking result
 */
interface SequentialThinkingResult {
  thoughts: Thought[];
  selectedTool: string;
  explanation: string;
}

/**
 * Generates sequential thoughts for a given request
 * 
 * @param request - User request text
 * @returns Sequential thinking result with selected tool
 */
async function generateSequentialThinking(request: string): Promise<SequentialThinkingResult> {
  logger.debug('Starting sequential thinking for:', request);
  
  // Enhanced with contextual information from ACRS
  const enhancedContext = await enhancePrompt(request);
  let enhancedRequest = request;
  
  if (enhancedContext.contextItems.length > 0) {
    // If we have contextual information, enhance the request
    const contextInfo = enhancedContext.contextItems.map(item => 
      `[${item.category}]: ${item.content.substring(0, 200)}...`
    ).join('\n');
    
    enhancedRequest = `${request}\n\nRELEVANT CONTEXT:\n${contextInfo}`;
  }
  
  const prompt = PROMPT_TEMPLATE.replace('{request}', enhancedRequest);
  const thoughts: Thought[] = [];
  
  try {
    // Generate thinking chain using the LLM
    const response = await performDirectLlmCall({
      model: 'auto',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      options: {
        temperature: THINKING_TEMPERATURE,
        maxTokens: 2500
      }
    });
    
    const thinking = response.choices[0].message.content;
    logger.debug('Generated thinking:', thinking);
    
    // Parse thoughts from the response
    const thoughtLines = thinking.split('\n');
    let currentThought = '';
    let thoughtType: ThoughtType = 'standard';
    let thoughtNumber = 0;
    
    for (const line of thoughtLines) {
      const trimmedLine = line.trim();
      
      // Check for thought number pattern (e.g., "1." or "Thought 1:")
      const numberMatch = trimmedLine.match(/^(?:Thought\s*)?(\d+)[:.]/);
      
      if (numberMatch && numberMatch[1]) {
        // Save previous thought if exists
        if (currentThought) {
          thoughts.push({
            number: thoughtNumber,
            content: currentThought.trim(),
            type: thoughtType
          });
        }
        
        // Start new thought
        thoughtNumber = parseInt(numberMatch[1]);
        currentThought = trimmedLine.substring(trimmedLine.indexOf(numberMatch[0]) + numberMatch[0].length);
        thoughtType = 'standard';
        
        // Check thought type based on content
        if (trimmedLine.toLowerCase().includes('revis')) {
          thoughtType = 'revision';
        } else if (trimmedLine.toLowerCase().includes('branch') || 
                 trimmedLine.toLowerCase().includes('alternat')) {
          thoughtType = 'branch';
        } else if (trimmedLine.toLowerCase().includes('conclu') || 
                 trimmedLine.toLowerCase().includes('final') ||
                 thoughtNumber === MAX_THOUGHTS) {
          thoughtType = 'conclusion';
        }
      } else {
        // Continue current thought
        currentThought += ' ' + trimmedLine;
      }
    }
    
    // Add the last thought
    if (currentThought) {
      thoughts.push({
        number: thoughtNumber,
        content: currentThought.trim(),
        type: thoughts.length > 0 ? 'conclusion' : 'standard'
      });
    }
    
    // Extract selected tool from conclusion
    const conclusion = thoughts.find(t => t.type === 'conclusion') || thoughts[thoughts.length - 1];
    
    // Look for tool names in the conclusion
    const toolPatterns = [
      /use (?:the )?"?([a-zA-Z0-9_-]+)"? tool/i,
      /(?:the )?"?([a-zA-Z0-9_-]+)"? tool would be best/i,
      /(?:the )?"?([a-zA-Z0-9_-]+)"? would be the appropriate tool/i,
      /(?:recommended|suggest|choose|select|appropriate|best) tool is "?([a-zA-Z0-9_-]+)"?/i,
      /tool: "?([a-zA-Z0-9_-]+)"?/i
    ];
    
    let selectedTool = '';
    let explanation = conclusion.content;
    
    for (const pattern of toolPatterns) {
      const match = conclusion.content.match(pattern);
      if (match && match[1]) {
        selectedTool = match[1].toLowerCase().trim();
        break;
      }
    }
    
    // Handle specific tool name fixes
    if (selectedTool === 'research') selectedTool = 'research-manager';
    if (selectedTool === 'git') selectedTool = 'git-summary';
    if (selectedTool === 'acrs' || selectedTool === 'context') selectedTool = 'acrs_process';
    
    if (!selectedTool) {
      // Fallback to research-manager if no tool identified
      selectedTool = 'research-manager';
      explanation += "\n(No specific tool was clearly identified, defaulting to research-manager)";
    }
    
    return {
      thoughts,
      selectedTool,
      explanation
    };
  } catch (error) {
    logger.error('Error in sequential thinking:', error);
    
    // Create a fallback thought
    thoughts.push({
      number: 1,
      content: `Error in generating thoughts: ${error}. Defaulting to research-manager tool.`,
      type: 'conclusion'
    });
    
    return {
      thoughts,
      selectedTool: 'research-manager',
      explanation: 'Error occurred in sequential thinking process. Defaulting to research-manager.'
    };
  }
}

/**
 * Sequential thinking tool for handling complex requests
 */
registerTool({
  name: 'sequential-thinking',
  description: 'Breaks down complex problems into manageable steps, identifying the appropriate tool for the request.',
  schema: z.object({
    request: z.string().describe('The request to analyze')
  }),
  execute: async ({ request }) => {
    return await generateSequentialThinking(request);
  }
});

export { generateSequentialThinking };