@echo off
ECHO Starting Vibe Coder MCP setup...

REM Check Node.js version
ECHO Checking Node.js version...
node -v > nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO ERROR: Node.js is not installed or not in PATH. Please install Node.js v18.0.0 or higher.
    EXIT /B 1
)

FOR /F "tokens=1,2,3 delims=." %%a IN ('node -v') DO (
    SET NODE_MAJOR=%%a
    SET NODE_MINOR=%%b
    SET NODE_PATCH=%%c
)
SET NODE_MAJOR=%NODE_MAJOR:~1%

IF %NODE_MAJOR% LSS 18 (
    ECHO ERROR: Node.js v18.0.0 or higher is required. Current version: %NODE_MAJOR%.%NODE_MINOR%.%NODE_PATCH%
    EXIT /B 1
)

ECHO Node.js version %NODE_MAJOR%.%NODE_MINOR%.%NODE_PATCH% detected.

REM Install dependencies
ECHO Installing dependencies...
call npm install
IF %ERRORLEVEL% NEQ 0 (
    ECHO ERROR: Failed to install dependencies.
    EXIT /B 1
)

REM Create output directories
ECHO Creating output directories...
mkdir VibeCoderOutput 2>nul
mkdir VibeCoderOutput\research 2>nul
mkdir VibeCoderOutput\code-stubs 2>nul
mkdir VibeCoderOutput\prd 2>nul
mkdir VibeCoderOutput\user-stories 2>nul
mkdir VibeCoderOutput\task-lists 2>nul
mkdir VibeCoderOutput\rules 2>nul
mkdir VibeCoderOutput\refactored-code 2>nul
mkdir VibeCoderOutput\dependency-reports 2>nul
mkdir VibeCoderOutput\git-summaries 2>nul
mkdir VibeCoderOutput\starter-kits 2>nul

REM Create .env file if it doesn't exist
IF NOT EXIST .env (
    ECHO Creating .env file from template...
    copy .env.example .env
    IF %ERRORLEVEL% NEQ 0 (
        ECHO WARNING: Failed to create .env file from template. Please create it manually.
    ) ELSE (
        ECHO Created .env file from template. Please edit it to add your API keys.
    )
)

REM Build the project
ECHO Building the project...
call npm run build
IF %ERRORLEVEL% NEQ 0 (
    ECHO ERROR: Failed to build the project.
    EXIT /B 1
)

ECHO.
ECHO ======================================================
ECHO Vibe Coder MCP setup complete!
ECHO.
ECHO Next steps:
ECHO 1. Edit the .env file to set your OpenRouter API key and other configuration options.
ECHO 2. Configure your AI assistant to use this MCP server.
ECHO 3. Start using the tools by running commands like "Research modern JavaScript frameworks"
ECHO ======================================================