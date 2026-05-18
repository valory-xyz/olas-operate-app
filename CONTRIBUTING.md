# Contributing to Pearl

Thank you for your interest in contributing to Pearl! This document provides guidelines and information for contributors.

## Table of Contents

- [Project Overview](#project-overview)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Quality](#code-quality)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Project Overview

Pearl is a cross-platform desktop application for running autonomous agents powered by the OLAS Network. The project consists of three main components:

- **Electron App** (CommonJS): Main desktop application wrapper
- **Next.js Frontend** (TypeScript): React-based user interface
- **Python Backend** (Poetry): Middleware and agent operations (separate repo)

## Getting Started

Before contributing, please:

1. Review the [README](README.md) for setup instructions and development commands
2. Check the [Issues](https://github.com/valory-xyz/olas-operate-app/issues) page for open tasks
3. Look for issues labeled `good first issue` or `help wanted` if you're new to the project

## Development Workflow

### 1. Choose an Issue

- Find an issue you'd like to work on
- Comment on the issue to indicate you're working on it to avoid duplicate efforts
- If you're proposing a new feature, open an issue first to discuss it

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

### 5. Submit a Pull Request

- Push your branch to GitHub
- Create a pull request with a clear description
- Reference any related issues
- Ensure all CI checks pass

## Code Quality

### TypeScript/JavaScript

- **ESLint**: Configured with Prettier integration
- **TypeScript**: Strict type checking enabled

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

### Before Submitting

1. **Run code quality checks** 
  ```bash
  yarn lint:frontend
  yarn typequality-check:frontend
  ```
2. **Test on multiple platforms** if applicable

### Supply-chain checks

Two CI gates protect the dep tree. Both run on every PR; both block merge.

#### Audit gate — high/critical CVE detection

A blocking `yarn audit` gate runs against both `package.json` trees (root and `frontend/`). Adding a new dependency or bumping an existing one will trip the gate if the change pulls in (directly or transitively) a known high- or critical-severity npm advisory. To clear the gate, in order of preference:

1. **Wait for the upstream fix.** If a patched version exists, bump the offending direct dep — or add an exact-version `resolutions` entry if it's only reachable transitively. This is always the right first answer.
2. **Bump to a fixed version.** Update `package.json` (with an exact pin) so the resolved version sits in the `patched_versions` range from the advisory.
3. **Pin a transitive via Yarn `resolutions`.** Add the safe version to `resolutions` in the affected tree's `package.json`.
4. **Allowlist the advisory.** Only when the above are infeasible. Add an entry to `.supply-chain/audit-allowlist.json` (root) or `frontend/.supply-chain/audit-allowlist.json` (frontend). Every entry requires `id`, `reason`, `added` (YYYY-MM-DD), and `review` (YYYY-MM-DD, 90 days out from `added`). Expired `review` dates emit a `::warning::` in CI but don't fail the job — they're your reminder to re-justify.

To reproduce CI behaviour locally:

```bash
# Root tree
yarn audit:prod

# Frontend tree
cd frontend && yarn audit:prod
```

Both calls share the same wrapper (`scripts/audit.mjs` is duplicated under `frontend/scripts/audit.mjs` so each tree can be audited from its own working directory). Each consults the allowlist sitting next to it.

#### Install-hook gate — new postinstall detection

A separate per-tree allowlist tracks every dependency that declares a non-trivial `preinstall` / `install` / `postinstall` script. Adding a new dependency — or bumping an existing one to a version whose maintainer introduced a new install hook — will trip the gate until the new package is reviewed and added to the allowlist.

This is distinct from `.npmrc`'s `ignore-scripts=true` (which *prevents execution*); the install-hook gate *detects new additions* so a transitive package quietly gaining a `postinstall` in its latest version fails CI rather than running silently on a contributor machine.

To regenerate the allowlist after an intentional dep change:

```bash
# Root tree
yarn install
yarn audit:install-hooks:update
git add .supply-chain/install-hooks.allowlist

# Frontend tree
cd frontend && yarn install && yarn audit:install-hooks:update
git add .supply-chain/install-hooks.allowlist
```

Then **edit the inline comment on each new entry** in the regenerated `.supply-chain/install-hooks.allowlist` to answer "what does this hook do, and why is it safe to run on a contributor machine?" — a bare `package  # ?` will pass the script's parse but fails the review intent. Examples in the checked-in file show the expected level of detail (e.g. `keccak  # node-gyp-build for the Keccak hash native binding ...`).

To reproduce CI locally:

```bash
yarn audit:install-hooks
cd frontend && yarn audit:install-hooks
```

### PR Review Process

1. **Automated checks** run on CI/CD
2. **Code review** by maintainers
3. **Testing** by maintainers
4. **Approval and merge** by maintainers


## Release Process

### Version Management

- Versions follow [Semantic Versioning](https://semver.org/)

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
