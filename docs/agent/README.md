# 🤖 AI Agent Documentation Hub

> **Purpose**: Centralized documentation for AI agents working with the Potluck project
> **Last Updated**: 2025-09-20
> **Version**: 1.0

## 🚨 **START HERE - Essential Reading Order**

### **1. Entry Point & Quick Start**
- **[`AGENT_ENTRY_POINT.md`](AGENT_ENTRY_POINT.md)** - **CRITICAL**: Master entry point - read this FIRST
- **[`AI_AGENT_QUICK_REFERENCE.md`](AI_AGENT_QUICK_REFERENCE.md)** - Quick reference card for immediate context

### **2. Core Knowledge Base**
- **[`agent-knowledge-base.md`](agent-knowledge-base.md)** - Central AI agent hub with complete project context
- **[`AGENT_ARCHITECTURE.md`](AGENT_ARCHITECTURE.md)** - Comprehensive system architecture guide

### **3. Implementation Details**
- **[`AGENT_CATALOG_IMPLEMENTATION.md`](AGENT_CATALOG_IMPLEMENTATION.md)** - Technical implementation details

## 📋 **Quick Navigation**

### **For New AI Agents**
1. **Read** [`AGENT_ENTRY_POINT.md`](AGENT_ENTRY_POINT.md) for complete context
2. **Follow** the file priority guide
3. **Use** [`AI_AGENT_QUICK_REFERENCE.md`](AI_AGENT_QUICK_REFERENCE.md) for quick lookups
4. **Reference** [`agent-knowledge-base.md`](agent-knowledge-base.md) for detailed information

### **For Specific Tasks**
- **Database work** → Start with `db/schema.json` + `docs/core/rls-policies.md`
- **API development** → Use `docs/api-spec.yaml` + `.agent/routes.index.json`
- **Code navigation** → Use `.agent/repo.catalog.json` + `.agent/deps.graph.mmd`
- **Test understanding** → Use `.agent/tests.index.json`

### **For System Understanding**
- **Architecture** → [`AGENT_ARCHITECTURE.md`](AGENT_ARCHITECTURE.md)
- **Implementation** → [`AGENT_CATALOG_IMPLEMENTATION.md`](AGENT_CATALOG_IMPLEMENTATION.md)
- **Project Context** → [`agent-knowledge-base.md`](agent-knowledge-base.md)

## 🎯 **File Descriptions**

| File | Purpose | When to Use |
|------|---------|-------------|
| **`AGENT_ENTRY_POINT.md`** | Master entry point with file priorities | **Always read first** |
| **`AI_AGENT_QUICK_REFERENCE.md`** | Quick reference card | Quick lookups and reminders |
| **`agent-knowledge-base.md`** | Central knowledge hub | Detailed project information |
| **`AGENT_ARCHITECTURE.md`** | System architecture guide | Understanding the system design |
| **`AGENT_CATALOG_IMPLEMENTATION.md`** | Technical implementation | Understanding how it works |

## 🔧 **Maintenance Commands**

```bash
# Update everything (recommended)
npm run agent:update

# Update documentation only
npm run docs:update

# Update code catalog only
npm run catalog:generate

# View current status
npm run agent:view

# Full system update with monitoring
npm run agent:full
```

## 🤖 **Background Agent Setup**

### **Before Starting Background Agents**

**CRITICAL**: Always run this command before starting any background agents:

```bash
npm run agent:setup
```

This ensures:
- ✅ Payments package is built and ready
- ✅ All dependencies are installed
- ✅ Background agents can access pre-built files
- ✅ No compilation needed during agent startup

### **What This Fixes**

- **Problem**: Background agents run in separate VMs and can't compile private npm packages
- **Solution**: Pre-build packages and make them available as compiled files
- **Result**: Background agents work seamlessly with local workspace packages

### **Package Access**

- **Local Development**: Uses `@payments/core` workspace package
- **Background Agents**: Access pre-built files in `packages/payments/dist/`
- **External Projects**: Can install `payment-core` from NPM

### **Troubleshooting**

If background agents can't find the payments package:
1. Run `npm run agent:setup`
2. Verify `packages/payments/dist/` exists
3. Check that dependencies are installed: `npm install`

## 📊 **System Status**

- **Entry Point**: ✅ Ready
- **Knowledge Base**: ✅ Updated
- **Code Catalog**: ✅ Generated (381 files, 282 routes, 192 tests)
- **Health Score**: 80/100
- **Last Updated**: 2025-09-20

## ⚠️ **Important Notes**

- **Source code is ground truth** - catalogs are generated automatically
- **Always regenerate** catalogs after significant code changes
- **Don't manually edit** `.agent/` files - they're auto-generated
- **Check timestamps** in generated files to ensure they're current

## 🚀 **Quick Start Checklist**

- [ ] Read [`AGENT_ENTRY_POINT.md`](AGENT_ENTRY_POINT.md)
- [ ] Review [`AI_AGENT_QUICK_REFERENCE.md`](AI_AGENT_QUICK_REFERENCE.md)
- [ ] Check `db/schema.json` for database context
- [ ] Review `docs/api-spec.yaml` for API surface
- [ ] Explore `.agent/repo.catalog.json` for code structure
- [ ] Use `.agent/routes.index.json` for endpoint mapping

---

**Remember**: This project has comprehensive documentation and machine-readable catalogs. Use them efficiently to understand the codebase and provide accurate assistance!
