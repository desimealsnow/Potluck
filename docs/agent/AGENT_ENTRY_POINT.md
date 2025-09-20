# 🤖 AI Agent Entry Point - Potluck Project

> **CRITICAL**: Read this file FIRST before exploring the codebase
> **Last Updated**: 2025-09-20
> **Purpose**: Guide AI agents to the most important project files

## 🎯 Start Here - Essential Files (Read in Order)

### 1. **Project Overview & Architecture**
- **`docs/agent-knowledge-base.md`** - Central AI agent hub with complete project context
- **`docs/core/architecture.md`** - System design and bounded contexts
- **`README.md`** - Project overview and setup instructions

### 2. **Database & API Context**
- **`db/schema.json`** - Complete database schema with relationships and functions
- **`docs/api-spec.yaml`** - OpenAPI specification for all endpoints
- **`docs/core/rls-policies.md`** - Database security policies

### 3. **Machine-Readable Code Catalog**
- **`.agent/repo.catalog.json`** - Complete file index with imports, exports, and relationships
- **`.agent/routes.index.json`** - All API routes mapped to controllers and services
- **`.agent/tests.index.json`** - Test coverage mapping
- **`.agent/deps.graph.mmd`** - Module dependency visualization

## 🚀 Quick Start Workflow

### For New AI Agents:
1. **Read** `docs/agent-knowledge-base.md` for complete context
2. **Check** `db/schema.json` for database understanding
3. **Review** `docs/api-spec.yaml` for API surface
4. **Explore** `.agent/repo.catalog.json` for code structure
5. **Use** `.agent/routes.index.json` for endpoint mapping

### For Specific Tasks:
- **Database queries** → `db/schema.json` + `docs/core/rls-policies.md`
- **API development** → `docs/api-spec.yaml` + `.agent/routes.index.json`
- **Code navigation** → `.agent/repo.catalog.json` + `.agent/deps.graph.mmd`
- **Test understanding** → `.agent/tests.index.json`
- **Feature implementation** → `docs/features/` + relevant READMEs

## 📋 Project Context Summary

### **Project Type**: Event Management Platform
- **Tech Stack**: React Native (Expo) + Node.js + PostgreSQL (Supabase)
- **Architecture**: Cross-platform mobile app with Node.js API
- **Key Features**: Event management, user profiles, real-time notifications, location services, payments

### **Main Directories**:
```
apps/
├── mobile/          # React Native app (iOS/Android)
├── server/          # Node.js API server
└── web/            # Web dashboard (future)

packages/
├── payments/        # Payment processing
└── common/         # Shared utilities

docs/
├── core/           # System architecture and API specs
├── features/       # Feature-specific documentation
├── development/    # Development guides and testing
└── scripts/        # Documentation utilities

.agent/
├── repo.catalog.json    # Machine-readable codebase index
├── routes.index.json    # API routes mapping
├── tests.index.json     # Test coverage mapping
└── deps.graph.mmd       # Module dependency graph
```

## 🔍 File Priority Guide

### **High Priority** (Read First)
1. `docs/agent-knowledge-base.md` - Complete project context
2. `db/schema.json` - Database structure
3. `docs/api-spec.yaml` - API specification
4. `.agent/repo.catalog.json` - Code structure

### **Medium Priority** (Read as Needed)
1. `docs/core/architecture.md` - System design
2. `.agent/routes.index.json` - Route mapping
3. `docs/core/rls-policies.md` - Security policies
4. `.agent/tests.index.json` - Test coverage

### **Low Priority** (Reference Only)
1. Individual feature READMEs
2. Development guides
3. Test files
4. Configuration files

## 🎯 Common AI Agent Tasks

### **Database Work**
- Start with `db/schema.json` for table relationships
- Check `docs/core/rls-policies.md` for security
- Use `.agent/repo.catalog.json` to find related code

### **API Development**
- Review `docs/api-spec.yaml` for endpoint definitions
- Use `.agent/routes.index.json` for implementation mapping
- Check `.agent/tests.index.json` for test coverage

### **Feature Implementation**
- Read relevant `docs/features/` documentation
- Use `.agent/repo.catalog.json` for code navigation
- Check `.agent/deps.graph.mmd` for dependencies

### **Code Navigation**
- Use `.agent/repo.catalog.json` for file relationships
- Check `.agent/routes.index.json` for API mapping
- Review `.agent/deps.graph.mmd` for module dependencies

## ⚠️ Important Notes

- **Source code is ground truth** - catalogs are generated automatically
- **Always regenerate** catalogs after significant code changes
- **Use `npm run agent:update`** to refresh all documentation and catalogs
- **Don't manually edit** `.agent/` files - they're auto-generated
- **Check timestamps** in generated files to ensure they're current

## 🔄 Maintenance Commands

```bash
# Update everything (recommended)
npm run agent:update

# Update documentation only
npm run docs:update

# Update code catalog only
npm run catalog:generate

# View current status
npm run agent:view
```

## 📞 Need Help?

If you're unsure about the project structure or need guidance:
1. **Read** `docs/agent-knowledge-base.md` completely
2. **Check** the generated catalogs in `.agent/`
3. **Use** the search functionality in documentation files
4. **Refer** to the OpenAPI spec for API details

---

**Remember**: This project has comprehensive documentation and machine-readable catalogs. Use them to understand the codebase efficiently and accurately.
