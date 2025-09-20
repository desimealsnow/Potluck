# 🚀 NPM Package Management - Quick Reference

> **Quick reference for creating and publishing npm packages in the Potluck monorepo**

## 📦 Create New Package

```bash
# 1. Create directory
mkdir packages/your-package-name
cd packages/your-package-name

# 2. Initialize package
npm init -y

# 3. Configure package.json (see template below)
# 4. Create tsconfig.build.json
# 5. Create src/ structure
# 6. Add to root package.json scripts
```

## 🔧 Essential package.json Template

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

## 🏗️ Build Commands

```bash
# Build specific package
npm run build -w packages/your-package-name

# Build all packages
npm run build

# Type check
npm run typecheck -w packages/your-package-name

# Test
npm test -w packages/your-package-name
```

## 🏷️ Versioning Commands

```bash
# Add to root package.json scripts:
"version:your-package:patch": "npm version patch -w packages/your-package",
"version:your-package:minor": "npm version minor -w packages/your-package",
"version:your-package:major": "npm version major -w packages/your-package"

# Use:
npm run version:your-package:patch   # 0.1.0 → 0.1.1
npm run version:your-package:minor   # 0.1.0 → 0.2.0
npm run version:your-package:major   # 0.1.0 → 1.0.0
```

## 📤 Publishing Commands

```bash
# Add to root package.json scripts:
"publish:your-package:npm": "npm publish -w packages/your-package --access public",
"publish:your-package:generic": "cd packages/your-package && npm pkg set name=your-package-name && npm publish --access public && npm pkg set name=@your-scope/your-package"

# For external use (generic name)
npm run version:your-package:patch
npm run publish:your-package:generic

# For internal use (scoped name)
npm run version:your-package:patch
npm run publish:your-package:npm
```

## 🤖 Background Agent Setup

```bash
# Before starting background agents
npm run agent:setup

# This ensures:
# ✅ Packages are built
# ✅ Dependencies are installed
# ✅ Agents can access pre-built files
```

## 📝 Required Documentation Files

### 1. README.md
- Complete package documentation
- Installation instructions
- API reference
- Examples

### 2. GETTING_STARTED.md
- Quick start guide
- Basic usage examples
- Next steps

### 3. example.js
- Working code examples
- Copy-paste ready
- Shows all major features

## ✅ Pre-Publish Checklist

- [ ] Package builds successfully (`npm run build`)
- [ ] TypeScript types generated (`.d.ts` files exist)
- [ ] Tests pass (`npm test`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Documentation is complete (README, examples)
- [ ] Version is updated (`npm run version:your-package:patch`)
- [ ] Package.json is correct (name, description, keywords)
- [ ] Files are included (dist, README, examples)

## 🚨 Common Issues & Quick Fixes

### "Package not found" when publishing
```bash
npm view your-package-name  # Check if name is available
```

### "Cannot publish over previously published versions"
```bash
npm run version:your-package:patch  # Update version first
```

### Background agents can't find package
```bash
npm run agent:setup  # Run setup script
```

### TypeScript compilation errors
```bash
npm run typecheck -w packages/your-package-name  # Check types
```

### Missing files in published package
Check `files` array in package.json:
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

## 🔗 Full Documentation

For complete details, see [NPM Package Management Guide](NPM_PACKAGE_MANAGEMENT.md).

---

**Remember**: Always test your package in a fresh project before publishing!
