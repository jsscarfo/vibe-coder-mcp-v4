#!/bin/bash
echo "Starting Vibe Coder MCP setup..."

# Check Node.js version
echo "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH. Please install Node.js v18.0.0 or higher."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d '.' -f 1)

if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "ERROR: Node.js v18.0.0 or higher is required. Current version: $NODE_VERSION"
    exit 1
fi

echo "Node.js version $NODE_VERSION detected."

# Install dependencies
echo "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies."
    exit 1
fi

# Create output directories
echo "Creating output directories..."
mkdir -p VibeCoderOutput/research
mkdir -p VibeCoderOutput/code-stubs
mkdir -p VibeCoderOutput/prd
mkdir -p VibeCoderOutput/user-stories
mkdir -p VibeCoderOutput/task-lists
mkdir -p VibeCoderOutput/rules
mkdir -p VibeCoderOutput/refactored-code
mkdir -p VibeCoderOutput/dependency-reports
mkdir -p VibeCoderOutput/git-summaries
mkdir -p VibeCoderOutput/starter-kits

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "Created .env file from template. Please edit it to add your API keys."
    else
        echo "WARNING: .env.example not found. Please create a .env file manually."
    fi
fi

# Set executable permissions for scripts
echo "Setting executable permissions..."
chmod +x setup.sh

# Build the project
echo "Building the project..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to build the project."
    exit 1
fi

echo ""
echo "======================================================"
echo "Vibe Coder MCP setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit the .env file to set your OpenRouter API key and other configuration options."
echo "2. Configure your AI assistant to use this MCP server."
echo "3. Start using the tools by running commands like \"Research modern JavaScript frameworks\""
echo "======================================================"