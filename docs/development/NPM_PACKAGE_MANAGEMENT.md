# 📦 NPM Package Management Guide

> **Purpose**: Complete guide for creating, building, and publishing npm packages in the Potluck monorepo
> **Last Updated**: 2025-09-20
> **Version**: 1.0

## 🎯 Overview

This guide covers the complete workflow for managing npm packages in our monorepo, including:
- Creating new packages
- Building and testing
- Versioning and publishing
- Dual package naming strategy
- Background agent compatibility

## 📋 Prerequisites

- Node.js 18+ installed
- NPM account with publish permissions
- Git repository access
- Understanding of monorepo structure

## 🏗️ Package Structure

```
packages/
├── payments/           # Example package
│   ├── src/           # Source TypeScript files
│   ├── dist/          # Compiled JavaScript (generated)
│   ├── package.json   # Package configuration
│   ├── README.md      # Package documentation
│   ├── example.js     # Usage examples
│   └── tsconfig.build.json  # Build configuration
```

## 🚀 Creating a New Package

### Step 1: Create Package Directory

```bash
mkdir packages/your-package-name
cd packages/your-package-name
```

### Step 2: Initialize Package

```bash
npm init -y
```

### Step 3: Configure package.json

```json
{
  "name": "your-package-name",
  "version": "0.1.0",
  "description": "Your package description",
  "keywords": ["keyword1", "keyword2", "typescript"],
  "author": "Potluck Team",
  "license": "MIT",
  "homepage": "https://github.com/yourusername/potluck/tree/main/packages/your-package-name#readme",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/potluck.git",
    "directory": "packages/your-package-name"
  },
  "bugs": {
    "url": "https://github.com/yourusername/potluck/issues"
  },
  "main": "dist/index.js",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "files": [
    "dist",
    "README.md",
    "GETTING_STARTED.md",
    "example.js"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc -p tsconfig.build.json --noEmit"
  },
  "peerDependencies": {
    "express": "^4 || ^5"
  },
  "devDependencies": {
    "typescript": "^5.5.4"
  },
  "publishConfig": {
    "registry": "https://registry.npmjs.org/",
    "access": "public"
  }
}
```

### Step 4: Create TypeScript Configuration

**`tsconfig.build.json`**:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.test.ts", "**/*.spec.ts"]
}
```

### Step 5: Create Source Structure

```
src/
├── index.ts           # Main export file
├── types.ts          # Type definitions
├── services/         # Service implementations
└── utils/            # Utility functions
```

**`src/index.ts`**:
```typescript
export * from './types';
export * from './services';
export * from './utils';
```

## 🔧 Building Packages

### Local Development Build

```bash
# Build specific package
npm run build -w packages/your-package-name

# Build all packages
npm run build
```

### Pre-build for Background Agents

```bash
# Ensure package is built before starting agents
npm run agent:setup
```

### Build Configuration

The build process:
1. **Compiles TypeScript** to JavaScript
2. **Generates type definitions** (.d.ts files)
3. **Creates source maps** for debugging
4. **Outputs to `dist/`** directory

## 📝 Documentation Requirements

### Required Files

1. **`README.md`** - Complete documentation
2. **`GETTING_STARTED.md`** - Quick start guide
3. **`example.js`** - Working code examples

### README.md Template

```markdown
# Your Package Name

Brief description of what the package does.

## Install

```bash
npm install your-package-name
```

## Quick Start

```typescript
import { YourService } from 'your-package-name';

const service = new YourService();
```

## Documentation

- [Getting Started](GETTING_STARTED.md)
- [Examples](example.js)
- [API Reference](#api-reference)

## License

MIT
```

## 🏷️ Versioning Strategy

### Semantic Versioning

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

### Version Commands

```bash
# Patch version (0.1.0 → 0.1.1)
npm run version:your-package:patch

# Minor version (0.1.0 → 0.2.0)
npm run version:your-package:minor

# Major version (0.1.0 → 1.0.0)
npm run version:your-package:major
```

### Adding Version Scripts

Add to root `package.json`:

```json
{
  "scripts": {
    "version:your-package:patch": "npm version patch -w packages/your-package",
    "version:your-package:minor": "npm version minor -w packages/your-package",
    "version:your-package:major": "npm version major -w packages/your-package"
  }
}
```

## 📤 Publishing Strategy

### Dual Package Naming

We use two naming strategies:

1. **Generic Name** (`your-package-name`) - For external projects
2. **Scoped Name** (`@your-scope/your-package`) - For local development

### Publishing Commands

Add to root `package.json`:

```json
{
  "scripts": {
    "publish:your-package:npm": "npm publish -w packages/your-package --access public",
    "publish:your-package:generic": "cd packages/your-package && npm pkg set name=your-package-name && npm publish --access public && npm pkg set name=@your-scope/your-package"
  }
}
```

### Publishing Workflow

#### For External Use (Generic Package)

```bash
# 1. Update version
npm run version:your-package:patch

# 2. Publish as generic package
npm run publish:your-package:generic
```

#### For Internal Use (Scoped Package)

```bash
# 1. Update version
npm run version:your-package:patch

# 2. Publish as scoped package
npm run publish:your-package:npm
```

## 🔄 Background Agent Compatibility

### Setup Script

Create `scripts/setup-background-agent.mjs`:

```javascript
#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const PACKAGES_DIR = 'packages';
const DIST_DIR = 'dist';

console.log('🚀 Setting up background agent environment...');

// Build all packages
console.log('📦 Building packages...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Packages built successfully');
} catch (error) {
  console.error('❌ Failed to build packages:', error.message);
  process.exit(1);
}

// Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

console.log('🎉 Background agent environment ready!');
```

### Package.json Scripts

```json
{
  "scripts": {
    "agent:setup": "node scripts/setup-background-agent.mjs",
    "agent:ready": "npm run agent:setup && npm run agent:full"
  }
}
```

## 🧪 Testing Packages

### Unit Tests

```bash
# Test specific package
npm test -w packages/your-package-name

# Test all packages
npm test
```

### Integration Tests

```bash
# Test package integration
npm run test:integration -w packages/your-package-name
```

### Type Checking

```bash
# Type check specific package
npm run typecheck -w packages/your-package-name

# Type check all packages
npm run typecheck
```

## 📊 Package Quality Checklist

### Before Publishing

- [ ] **Package builds successfully** (`npm run build`)
- [ ] **TypeScript types are generated** (`.d.ts` files exist)
- [ ] **Tests pass** (`npm test`)
- [ ] **Type checking passes** (`npm run typecheck`)
- [ ] **Documentation is complete** (README, examples)
- [ ] **Version is updated** (`npm run version:your-package:patch`)
- [ ] **Package.json is correct** (name, description, keywords)
- [ ] **Files are included** (dist, README, examples)

### After Publishing

- [ ] **Package is available on NPM** (`npm view your-package-name`)
- [ ] **Documentation is accessible** (README shows on NPM)
- [ ] **Examples work** (test installation in new project)
- [ ] **Types are available** (IntelliSense works)

## 🚨 Common Issues & Solutions

### Issue: "Package not found" when publishing

**Solution**: Check package name availability:
```bash
npm view your-package-name
```

### Issue: "Cannot publish over previously published versions"

**Solution**: Update version first:
```bash
npm run version:your-package:patch
```

### Issue: Background agents can't find package

**Solution**: Run setup script:
```bash
npm run agent:setup
```

### Issue: TypeScript compilation errors

**Solution**: Check tsconfig.build.json and fix type issues:
```bash
npm run typecheck -w packages/your-package-name
```

### Issue: Missing files in published package

**Solution**: Check `files` array in package.json:
```json
{
  "files": [
    "dist",
    "README.md",
    "GETTING_STARTED.md",
    "example.js"
  ]
}
```

## 📚 Best Practices

### Package Design

1. **Single Responsibility** - Each package should have one clear purpose
2. **Minimal Dependencies** - Keep dependencies to a minimum
3. **TypeScript First** - Always provide type definitions
4. **Comprehensive Documentation** - Include examples and API docs
5. **Backward Compatibility** - Maintain API stability

### Versioning

1. **Semantic Versioning** - Follow semver strictly
2. **Changelog** - Document changes between versions
3. **Breaking Changes** - Use major version bumps
4. **Deprecation** - Mark deprecated features clearly

### Publishing

1. **Test Before Publish** - Always test locally first
2. **Incremental Publishing** - Publish patch versions frequently
3. **Documentation Updates** - Update docs with each release
4. **Tag Releases** - Tag releases in Git

## 🔗 Related Documentation

- [Background Agent Setup](../agent/README.md#background-agent-setup)
- [Monorepo Structure](../core/architecture.md)
- [TypeScript Configuration](../development/typescript.md)
- [Testing Strategy](../development/testing.md)

## 📞 Support

If you encounter issues:

1. **Check this guide** for common solutions
2. **Review package.json** configuration
3. **Test locally** before publishing
4. **Check NPM documentation** for specific errors
5. **Open an issue** in the repository

---

**Remember**: Always test your package in a fresh project before publishing to ensure everything works correctly!
