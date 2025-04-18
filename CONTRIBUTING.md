# Contributing to Vibe Coder MCP

Thank you for your interest in contributing to Vibe Coder MCP! This document provides guidelines and instructions for contributing to this project.

## Important Notice

This is the v4 release of Vibe Coder MCP, and active development has moved to v5. While we welcome bug fixes and minor improvements to this version, major feature development should be directed to the v5 repository.

## Getting Started

1. **Fork the Repository**: Start by forking the repository to your GitHub account.

2. **Clone Your Fork**: Clone your forked repository to your local machine.
   ```bash
   git clone https://github.com/your-username/vibe-coder-mcp-v4.git
   cd vibe-coder-mcp-v4
   ```

3. **Install Dependencies**: Run the setup script to install dependencies.
   ```bash
   # Windows
   setup.bat
   
   # macOS/Linux
   chmod +x setup.sh
   ./setup.sh
   ```

4. **Create a Branch**: Create a new branch for your contribution.
   ```bash
   git checkout -b fix/your-feature-or-bugfix
   ```

## Development Workflow

1. **Make Changes**: Make your changes to the codebase. Ensure that your code follows the project's style and conventions.

2. **Run Tests**: Before submitting your changes, run the tests to ensure everything works correctly.
   ```bash
   npm test
   ```

3. **Lint Your Code**: Run the linter to ensure your code meets the project's style guidelines.
   ```bash
   npm run lint
   ```

4. **Commit Your Changes**: Commit your changes with a clear and descriptive commit message.
   ```bash
   git commit -m "Fix: description of your fix or enhancement"
   ```

5. **Push to Your Fork**: Push your changes to your forked repository.
   ```bash
   git push origin fix/your-feature-or-bugfix
   ```

6. **Submit a Pull Request**: Create a pull request from your branch to the original repository's main branch.

## Pull Request Guidelines

1. **Description**: Provide a clear description of the changes, including the problem addressed and how your solution resolves it.

2. **Issue Reference**: If your PR is related to an issue, reference it in the description (e.g., "Fixes #123").

3. **Test Coverage**: Ensure your changes are covered by tests. If you add new functionality, include tests that verify it works correctly.

4. **Documentation**: Update documentation to reflect any changes, especially if you modify the API or user-facing features.

5. **Code Quality**: Make sure your code is clean, well-commented, and follows the project's style guidelines.

## Bug Reports

If you find a bug, please create an issue in the repository with the following information:

1. **Title**: A concise, descriptive title.
2. **Description**: A clear description of the issue.
3. **Steps to Reproduce**: Detailed steps to reproduce the bug.
4. **Expected Behavior**: What you expected to happen.
5. **Actual Behavior**: What actually happened.
6. **Environment**: Your operating system, Node.js version, and any other relevant details.

## Feature Requests

For feature requests, please create an issue with the following information:

1. **Title**: A concise, descriptive title.
2. **Description**: A clear description of the feature.
3. **Use Case**: How this feature would be used and why it would be valuable.
4. **Alternatives**: Any alternative solutions or features you've considered.

## Code of Conduct

Please note that this project adheres to a Code of Conduct. By participating, you are expected to uphold this code.

## License

By contributing to Vibe Coder MCP, you agree that your contributions will be licensed under the project's MIT License.

## Questions?

If you have any questions about contributing, please create an issue, and we'll be happy to help.

Thank you for your contributions to Vibe Coder MCP!