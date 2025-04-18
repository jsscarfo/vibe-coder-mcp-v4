/**
 * Automatic Contextual Retrieval System (ACRS)
 * 
 * This module provides contextual memory and retrieval services for enhancing AI assistant capabilities.
 * It integrates vector-based semantic search with advanced caching and contextual memory management.
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { pipeline } from '@xenova/transformers';
import { IndexFlatL2, IndexFlatIP } from 'faiss-node';
import { registerTool } from '../index';
import { logger } from '../../logger';
import { performDirectLlmCall } from '../../utils/llmProvider';

// Constants
const MEMORY_CATEGORIES = [
  'general',         // General knowledge and facts
  'concepts',        // Abstract concepts, theories, and explanations
  'code',            // Code snippets, patterns, and programming info
  'procedures',      // Step-by-step procedures and workflows
  'decisions',       // Decision records and rationales
  'preferences',     // User preferences and history
  'metadata'         // System metadata and control information
];

// Configuration
const MAX_CONTEXT_ITEMS = 15;
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIMENSION = 384;
const SIMILARITY_THRESHOLD = 0.75;
const CACHE_LIFETIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CATEGORY_WEIGHTS = {
  general: 1.0,
  concepts: 1.2,
  code: 1.3,
  procedures: 1.1,
  decisions: 1.4,
  preferences: 1.5,
  metadata: 0.5
};

// Type definitions
interface MemoryItem {
  id: string;
  embedding: number[];
  content: string;
  category: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface QueryResult {
  item: MemoryItem;
  score: number;
}

interface ContextualizeResult {
  enhancedPrompt: string;
  contextItems: MemoryItem[];
  originalPrompt: string;
}

interface RetrievalMetrics {
  totalQueries: number;
  averageRetrievalTime: number;
  cacheHitRate: number;
  contextUtilization: number;
  categoryDistribution: Record<string, number>;
}

// Cache systems
const embeddingCache = new Map<string, number[]>();
const retrievalCache = new Map<string, { results: QueryResult[], timestamp: number }>();
const llmResponseCache = new Map<string, { response: string, timestamp: number }>();

// State - Vector stores for each category
const vectorStores: Record<string, any> = {};
const memoryItems: Record<string, MemoryItem[]> = {};
const metrics = {
  queryCount: 0,
  retrievalTimes: [] as number[],
  cacheHits: 0,
  cacheQueries: 0,
  contextItemsUsed: [] as number[],
  categoryCounts: {} as Record<string, number>
};

// Initialize memory categories
MEMORY_CATEGORIES.forEach(category => {
  vectorStores[category] = new IndexFlatIP(EMBEDDING_DIMENSION);
  memoryItems[category] = [];
  metrics.categoryCounts[category] = 0;
});

// Initialize embedding model (lazy loading)
let embeddingModel: any = null;
let isEmbeddingModelLoading = false;
const embeddingModelQueue: { text: string, resolve: (value: number[]) => void, reject: (reason: any) => void }[] = [];

/**
 * Initializes the embedding model
 */
async function initializeEmbeddingModel() {
  if (embeddingModel || isEmbeddingModelLoading) return;
  
  isEmbeddingModelLoading = true;
  
  try {
    logger.info('Initializing embedding model...');
    embeddingModel = await pipeline('feature-extraction', EMBEDDING_MODEL);
    logger.info('Embedding model initialized successfully.');
    
    // Process queued embedding requests
    while (embeddingModelQueue.length > 0) {
      const request = embeddingModelQueue.shift()!;
      try {
        const embedding = await generateEmbedding(request.text);
        request.resolve(embedding);
      } catch (error) {
        request.reject(error);
      }
    }
  } catch (error) {
    logger.error('Failed to initialize embedding model:', error);
    isEmbeddingModelLoading = false;
    
    // Reject all queued requests
    while (embeddingModelQueue.length > 0) {
      const request = embeddingModelQueue.shift()!;
      request.reject(new Error('Failed to initialize embedding model'));
    }
    
    throw error;
  }
  
  isEmbeddingModelLoading = false;
}

/**
 * Generates an embedding vector for the given text
 * 
 * @param text - Text to embed
 * @returns Embedding vector
 */
async function generateEmbedding(text: string): Promise<number[]> {
  // Check cache first
  const cacheKey = text.trim().toLowerCase();
  if (embeddingCache.has(cacheKey)) {
    metrics.cacheHits++;
    metrics.cacheQueries++;
    return embeddingCache.get(cacheKey)!;
  }
  
  metrics.cacheQueries++;
  
  // Initialize model if needed
  if (!embeddingModel) {
    // If model is loading, queue this request
    if (isEmbeddingModelLoading) {
      return new Promise((resolve, reject) => {
        embeddingModelQueue.push({ text, resolve, reject });
      });
    }
    
    await initializeEmbeddingModel();
  }
  
  try {
    // Generate embedding
    const output = await embeddingModel(text, { pooling: 'mean', normalize: true });
    const embedding = Array.from(output.data);
    
    // Cache the result
    embeddingCache.set(cacheKey, embedding);
    
    return embedding;
  } catch (error) {
    logger.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Adds a memory item to the vector store
 * 
 * @param content - Content to store
 * @param category - Category to store the content in
 * @param metadata - Optional metadata for the item
 * @returns The created memory item
 */
async function addMemoryItem(content: string, category = 'general', metadata?: Record<string, any>): Promise<MemoryItem> {
  if (!MEMORY_CATEGORIES.includes(category)) {
    logger.warn(`Invalid category: ${category}. Defaulting to 'general'.`);
    category = 'general';
  }
  
  const embedding = await generateEmbedding(content);
  
  const memoryItem: MemoryItem = {
    id: uuidv4(),
    embedding,
    content,
    category,
    timestamp: Date.now(),
    metadata
  };
  
  // Add to vector store
  vectorStores[category].add(embedding);
  memoryItems[category].push(memoryItem);
  
  // Update metrics
  metrics.categoryCounts[category] = (metrics.categoryCounts[category] || 0) + 1;
  
  return memoryItem;
}

/**
 * Searches for relevant memory items across all categories
 * 
 * @param query - Query text
 * @param maxResults - Maximum number of results to return
 * @returns Ranked list of memory items
 */
async function searchMemory(query: string, maxResults = MAX_CONTEXT_ITEMS): Promise<QueryResult[]> {
  const startTime = Date.now();
  
  // Check cache first
  const cacheKey = query.trim().toLowerCase();
  if (retrievalCache.has(cacheKey)) {
    const cached = retrievalCache.get(cacheKey)!;
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp < CACHE_LIFETIME) {
      metrics.cacheHits++;
      metrics.cacheQueries++;
      return cached.results;
    }
    
    // Cache expired, remove it
    retrievalCache.delete(cacheKey);
  }
  
  metrics.cacheQueries++;
  metrics.queryCount++;
  
  try {
    const queryEmbedding = await generateEmbedding(query);
    const allResults: QueryResult[] = [];
    
    // Search each category
    for (const category of MEMORY_CATEGORIES) {
      if (memoryItems[category].length === 0) continue;
      
      const store = vectorStores[category];
      const categoryResults = store.search(queryEmbedding, Math.min(maxResults, memoryItems[category].length));
      
      // Map results to memory items
      for (let i = 0; i < categoryResults.length; i++) {
        if (categoryResults.distances[i] < SIMILARITY_THRESHOLD) continue;
        
        const item = memoryItems[category][categoryResults.neighbors[i]];
        const score = categoryResults.distances[i] * CATEGORY_WEIGHTS[category as keyof typeof CATEGORY_WEIGHTS];
        
        allResults.push({ item, score });
      }
    }
    
    // Sort and limit results
    const sortedResults = allResults
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
    
    // Cache results
    retrievalCache.set(cacheKey, {
      results: sortedResults,
      timestamp: Date.now()
    });
    
    // Update metrics
    const retrievalTime = Date.now() - startTime;
    metrics.retrievalTimes.push(retrievalTime);
    metrics.contextItemsUsed.push(sortedResults.length);
    
    return sortedResults;
  } catch (error) {
    logger.error('Error searching memory:', error);
    return [];
  }
}

/**
 * Enhances a prompt with contextual information
 * 
 * @param prompt - Original prompt
 * @returns Enhanced prompt with contextual information
 */
async function enhancePrompt(prompt: string): Promise<ContextualizeResult> {
  // Search for relevant context
  const results = await searchMemory(prompt);
  
  if (results.length === 0) {
    return {
      enhancedPrompt: prompt,
      contextItems: [],
      originalPrompt: prompt
    };
  }
  
  // Format context items
  const contextStrings = results.map(result => {
    const { content, category } = result.item;
    return `[${category.toUpperCase()}] ${content}`;
  });
  
  // Create enhanced prompt
  const enhancedPrompt = `
I'll provide you with some relevant information to help answer the following question.
Please consider this contextual information when formulating your response.

RELEVANT CONTEXT:
${contextStrings.join('\n\n')}

USER QUESTION:
${prompt}

Please answer the question based on all of the information above. If the contextual information is not relevant or sufficient, rely on your own knowledge.
`.trim();
  
  return {
    enhancedPrompt,
    contextItems: results.map(r => r.item),
    originalPrompt: prompt
  };
}

/**
 * Gets retrieval metrics
 * 
 * @returns Current retrieval metrics
 */
function getMetrics(): RetrievalMetrics {
  const avgRetrievalTime = metrics.retrievalTimes.length > 0
    ? metrics.retrievalTimes.reduce((acc, val) => acc + val, 0) / metrics.retrievalTimes.length
    : 0;
  
  const cacheHitRate = metrics.cacheQueries > 0
    ? metrics.cacheHits / metrics.cacheQueries
    : 0;
  
  const avgContextUsed = metrics.contextItemsUsed.length > 0
    ? metrics.contextItemsUsed.reduce((acc, val) => acc + val, 0) / metrics.contextItemsUsed.length
    : 0;
  
  const contextUtilization = avgContextUsed / MAX_CONTEXT_ITEMS;
  
  return {
    totalQueries: metrics.queryCount,
    averageRetrievalTime: avgRetrievalTime,
    cacheHitRate,
    contextUtilization,
    categoryDistribution: { ...metrics.categoryCounts }
  };
}

/**
 * Process a request using the ACRS to enhance it with relevant information
 */
registerTool({
  name: 'acrs_process',
  description: 'Process a request using the Automatic Contextual Retrieval System to enhance it with relevant information from vector memory.',
  schema: z.object({
    requestText: z.string().describe('The request text to process'),
  }),
  execute: async ({ requestText }) => {
    const result = await enhancePrompt(requestText);
    
    // Check cache for LLM response
    const cacheKey = result.enhancedPrompt.trim();
    if (llmResponseCache.has(cacheKey)) {
      const cached = llmResponseCache.get(cacheKey)!;
      
      // Check if cache is still valid
      if (Date.now() - cached.timestamp < CACHE_LIFETIME) {
        return {
          response: cached.response,
          context: `Used ${result.contextItems.length} context items and returned cached response.`,
          fromCache: true
        };
      }
      
      // Cache expired, remove it
      llmResponseCache.delete(cacheKey);
    }
    
    // Call LLM with enhanced prompt
    const response = await performDirectLlmCall({
      model: 'auto',
      messages: [{ role: 'user', content: result.enhancedPrompt }],
      options: { temperature: 0.7 }
    });
    
    // Cache the response
    llmResponseCache.set(cacheKey, {
      response: response.choices[0].message.content,
      timestamp: Date.now()
    });
    
    return {
      response: response.choices[0].message.content,
      context: `Used ${result.contextItems.length} context items from memory.`,
      fromCache: false
    };
  }
});

/**
 * Enhance a prompt with contextual information for use with an LLM
 */
registerTool({
  name: 'acrs_enhance_prompt',
  description: 'Enhance a prompt with contextual information for use with an LLM.',
  schema: z.object({
    prompt: z.string().describe('The prompt to enhance with context'),
  }),
  execute: async ({ prompt }) => {
    const result = await enhancePrompt(prompt);
    
    return {
      enhancedPrompt: result.enhancedPrompt,
      contextCount: result.contextItems.length,
      contextCategories: result.contextItems.map(item => item.category)
    };
  }
});

/**
 * Get performance metrics for the contextual retrieval system
 */
registerTool({
  name: 'acrs_get_metrics',
  description: 'Get performance metrics for the contextual retrieval system.',
  schema: z.object({}),
  execute: async () => {
    return getMetrics();
  }
});

/**
 * Submit feedback on the usefulness of contextual information
 */
registerTool({
  name: 'acrs_submit_feedback',
  description: 'Submit feedback on the usefulness of contextual information.',
  schema: z.object({
    requestText: z.string().describe('The request that was processed'),
    useful: z.boolean().describe('Whether the context was useful'),
    feedback: z.string().optional().describe('Additional feedback')
  }),
  execute: async ({ requestText, useful, feedback }) => {
    // Store feedback as metadata for future improvements
    await addMemoryItem(
      `Feedback on request: "${requestText.substring(0, 100)}..."`,
      'metadata',
      { useful, feedback, type: 'feedback' }
    );
    
    return {
      message: 'Feedback recorded successfully',
      useful
    };
  }
});

/**
 * Add a memory entry with content to the vector store
 */
registerTool({
  name: 'acrs_add_memory',
  description: 'Adds a memory entry with categorized content to the vector store.',
  schema: z.object({
    content: z.string().describe('The content to add to memory'),
    category: z.enum(MEMORY_CATEGORIES).default('general').describe('The category of the content'),
    metadata: z.record(z.any()).optional().describe('Additional metadata about the content')
  }),
  execute: async ({ content, category, metadata }) => {
    const item = await addMemoryItem(content, category, metadata);
    
    return {
      message: 'Memory item added successfully',
      id: item.id,
      category: item.category,
      timestamp: new Date(item.timestamp).toISOString()
    };
  }
});

/**
 * Test the context categories by adding sample content and retrieving it
 */
registerTool({
  name: 'acrs_test_categories',
  description: 'Tests the context categories by adding sample content and retrieving it.',
  schema: z.object({}),
  execute: async () => {
    const testResults: Record<string, any> = {};
    
    // Add test items to each category
    for (const category of MEMORY_CATEGORIES) {
      const testContent = `This is a test memory item for the ${category} category. It contains specific knowledge related to ${category}.`;
      await addMemoryItem(testContent, category, { test: true });
      
      // Test retrieval
      const results = await searchMemory(`Tell me about ${category}`, 3);
      testResults[category] = {
        found: results.length > 0,
        topScore: results.length > 0 ? results[0].score : 0,
        matchCount: results.filter(r => r.item.category === category).length
      };
    }
    
    return {
      message: 'Category test completed',
      results: testResults,
      categoryStatus: MEMORY_CATEGORIES.map(category => ({
        category,
        itemCount: memoryItems[category].length,
        status: testResults[category].found ? 'working' : 'issue detected'
      }))
    };
  }
});

// Initialize the embedding model in the background
initializeEmbeddingModel().catch(error => {
  logger.warn('Background initialization of embedding model failed:', error);
});

// Export for testing
export {
  addMemoryItem,
  searchMemory,
  enhancePrompt,
  getMetrics,
  MEMORY_CATEGORIES
};