# Vibe Coder MCP Server - v4 Final Release

> **IMPORTANT NOTICE**: This is the final v4 release of the Vibe Coder MCP Server, which includes the Automatic Contextual Retrieval System (ACRS) tools. Development has moved to v5 in a separate repository. This version is being made available to the community as a stable, feature-complete release.

## New in v4: Automatic Contextual Retrieval System (ACRS)

The v4 release introduces the Automatic Contextual Retrieval System, which enhances AI assistant capabilities through:

- **Contextual memory**: Stores and retrieves relevant information based on the current context
- **Advanced caching**: Reduces redundant LLM calls and improves response times
- **Semantic search**: Finds related content based on meaning rather than exact text matching
- **Sequential thinking**: Breaks down complex problems into manageable steps

These tools enable more coherent, context-aware interactions with LLM-based assistants.

## Getting Started with GitHub Version

### Quick Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jsscarfo/vibe-coder-mcp-v4.git
   cd vibe-coder-mcp-v4
   ```

2. **Setup**:
   - For Windows: `setup.bat`
   - For macOS/Linux: 
     ```bash
     chmod +x setup.sh
     ./setup.sh
     ```

3. **Configure OpenRouter API Key**:
   - Create a `.env` file by copying `.env.example`
   - Add your OpenRouter API key to the `.env` file

4. **Integrate with your AI Assistant**:
   - Update your AI assistant's MCP configuration to include Vibe Coder
   - See the full Setup Guide below for detailed instructions

### ACRS Tools Usage

To use the Automatic Contextual Retrieval System tools:

1. **Add memory entries**:
   ```
   Add to memory: [content to remember]
   ```

2. **Process requests with contextual enhancement**:
   ```
   Process request [your request] with context
   ```

3. **Enhance prompts for LLMs**:
   ```
   Enhance prompt: [your prompt]
   ```

4. **Get performance metrics**:
   ```
   Get retrieval metrics
   ```

See the detailed documentation below for more information.