# Background Agent Setup Guide

## 🚀 Quick Start

Before starting any background agents, run:

```bash
npm run agent:setup
```

This ensures all packages are built and dependencies are installed.

## 🔧 What This Fixes

### **Problem**: Background agents can't compile private npm packages
- Background agents run in separate VMs
- They don't have access to your monorepo workspace
- Private packages like `@payments/core` aren't available

### **Solution**: Pre-build and commit built files
- Build payments package before starting agents
- Commit the `dist/` folder to git
- Agents can use pre-built files directly

## 📋 Available Commands

```bash
# Setup background agent environment
npm run agent:setup

# Full agent setup + update
npm run agent:ready

# Just build payments package
npm run build -w packages/payments

# Build all packages
npm run build
```

## 🏗️ How It Works

1. **Pre-build**: Payments package is built and committed to git
2. **Dependencies**: All workspace dependencies are installed
3. **Environment**: Node version is locked with `.nvmrc`
4. **Access**: Background agents can access pre-built files

## 🔍 Troubleshooting

### **Error**: "Cannot find module '@payments/core'"
**Solution**: Run `npm run agent:setup` first

### **Error**: "TypeScript compilation failed"
**Solution**: Ensure payments package is built:
```bash
npm run build -w packages/payments
```

### **Error**: "Workspace not found"
**Solution**: Install dependencies:
```bash
npm install
```

## 📁 File Structure

```
packages/payments/
├── dist/           # ← This is committed to git
│   ├── index.js
│   ├── index.d.ts
│   └── ...
├── src/
└── package.json
```

## 🎯 Best Practices

1. **Always run setup first**: `npm run agent:setup`
2. **Keep dist/ in git**: For background agent access
3. **Use consistent Node version**: Via `.nvmrc`
4. **Test locally**: Before starting background agents

## 🚨 Important Notes

- The `packages/payments/dist/` folder is committed to git
- This allows background agents to access pre-built files
- Don't delete the `dist/` folder unless rebuilding
- Always run `npm run agent:setup` after pulling changes
