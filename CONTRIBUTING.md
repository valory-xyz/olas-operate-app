# Contributing to Pearl

Thank you for your interest in contributing to Pearl! This document provides guidelines and information for contributors.

## Table of Contents

- [Project Overview](#project-overview)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Code Quality](#code-quality)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Project Overview

Pearl is a cross-platform desktop application for running autonomous agents powered by the OLAS Network. The project consists of three main components:

- **Electron App** (CommonJS): Main desktop application wrapper
- **Next.js Frontend** (TypeScript): React-based user interface
- **Python Backend** (Poetry): Middleware and agent operations (separate repo)

## Development Setup

### Prerequisites

- **Node.js**: Version 20.18.1 (use nvm for version management)
- **Python**: Version 3.10-3.11
- **Yarn**: Package manager for Node.js dependencies
- **Poetry**: Python dependency management

### Platform-Specific Setup

Follow the appropriate setup guide for your operating system:

- [Ubuntu Setup Guide](docs/dev/ubuntu-setup.md)
- [MacOS Setup Guide](docs/dev/macos-setup.md)
- [Windows Setup Guide](docs/dev/windows-setup.md)

### Quick Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/valory-xyz/olas-operate-app.git
   cd olas-operate-app
   ```

2. **Install Node.js and Yarn**
   ```bash
   nvm install
   nvm use
   npm install --global yarn
   ```

3. **Install Python and Poetry**
   ```bash
   # Ubuntu/Debian
   sudo apt install python3.10 pipx
   pipx install poetry==1.8.5

   # macOS
   brew install python@3.10 pipx
   pipx install poetry==1.8.5
   ```

4. **Install all dependencies**
   ```bash
   yarn install-deps
   ```

5. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```

   Configure the following RPC endpoints in your `.env` file:
   - `GNOSIS_RPC`
   - `BASE_RPC`
   - `OPTIMISM_RPC`
   - `ETHEREUM_RPC`
   - `MODE_RPC`
   - `CELO_RPC`

6. **Start development server**
   ```bash
   # : Electron app
   yarn dev
   ```

### Development Commands

| Command | Description |
|---------|-------------|
| `yarn dev` | Start the full Electron application |
| `yarn dev:frontend` | Start Next.js frontend in development mode |
| `yarn build:frontend` | Build the frontend for production |
| `yarn lint:frontend` | Run ESLint on frontend code |

## Development Workflow

### 1. Choose an Issue

- Check the [Issues](https://github.com/valory-xyz/olas-operate-app/issues) page
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to indicate you're working on it

### 2. Create a Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 3. Make Changes

- Write clear, focused commits
- Test your changes thoroughly
- Follow the code quality guidelines below

### 4. Test Your Changes

- Run the application locally
- Test on multiple platforms if possible
- Run the test suite

### 5. Submit a Pull Request

- Push your branch to GitHub
- Create a pull request with a clear description
- Reference any related issues

## Code Quality

### TypeScript/JavaScript

- **ESLint**: Configured with Prettier integration
- **TypeScript**: Strict type checking enabled
- **Prettier**: Code formatting

### Git Hooks

The project uses Husky for Git hooks to ensure code quality:

- Pre-commit hooks run linting and formatting
- Pre-push hooks run tests

### Code Style

- Use descriptive variable and function names
- Add comments for complex logic
- Keep functions small and focused
- Use TypeScript interfaces for data structures
- Follow existing patterns in the codebase

## Pull Request Process

### Before Submitting

1. **Update documentation** if your changes affect user-facing features
2. **Test on multiple platforms** if applicable

### PR Template

Use the provided PR template and fill out:

- **Proposed changes**: Clear description of what was changed
- **Types of changes**: Check the appropriate boxes
  - [ ] Bugfix
  - [ ] New feature
  - [ ] Breaking change

### PR Review Process

1. **Automated checks** run on CI/CD
2. **Code review** by maintainers
3. **Testing** on different platforms
4. **Approval** and merge

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Testing
- `chore`: Maintenance

## Release Process

### Version Management

- Versions follow [Semantic Versioning](https://semver.org/)
- Release branches are created automatically
- Production releases go through thorough testing

### Release Types

- **Feature releases**: New functionality
- **Patch releases**: Bug fixes
- **RC releases**: Release candidates for testing

### Building Releases

- Releases are created by maintainers via GH Actions

## Getting Help

- **Documentation**: Check the `docs/` folder
- **Issues**: Search existing issues or create new ones
- **Discussions**: Use GitHub Discussions for questions
- **Security**: See [SECURITY.md](SECURITY.md) for security issues

## License

By contributing to this project, you agree that your contributions will be licensed under the Apache 2.0 License.

Thank you for contributing to Pearl! 🚀
