# 🤖 AI Agent Quick Reference Card

> **For new AI agents starting work on this project**

## 🚨 START HERE - Read These Files First

1. **`docs/AGENT_ENTRY_POINT.md`** - Master entry point with complete project context
2. **`docs/agent-knowledge-base.md`** - Central AI agent hub with detailed information  
3. **`db/schema.json`** - Complete database schema and relationships
4. **`docs/api-spec.yaml`** - OpenAPI specification for all endpoints
5. **`.agent/repo.catalog.json`** - Machine-readable codebase index

## 📋 Project Summary

- **Type**: Event Management Platform
- **Tech**: React Native (Expo) + Node.js + PostgreSQL (Supabase)
- **Features**: Events, users, notifications, location, payments

## 🎯 Common Tasks & File Mapping

| Task | Primary Files | Secondary Files |
|------|---------------|-----------------|
| **Database queries** | `db/schema.json` | `docs/core/rls-policies.md` |
| **API development** | `docs/api-spec.yaml` | `.agent/routes.index.json` |
| **Code navigation** | `.agent/repo.catalog.json` | `.agent/deps.graph.mmd` |
| **Test understanding** | `.agent/tests.index.json` | `docs/features/TESTING_README.md` |
| **Feature implementation** | `docs/features/` | `.agent/repo.catalog.json` |

## 🔧 Maintenance Commands

```bash
npm run agent:update    # Update everything (recommended)
npm run docs:update     # Update documentation only  
npm run catalog:generate # Update code catalog only
npm run agent:view      # View current status
```

## ⚠️ Important Notes

- **Source code is ground truth** - catalogs are generated automatically
- **Don't edit** `.agent/` files manually
- **Always regenerate** catalogs after code changes
- **Check timestamps** in generated files

## 📁 Key Directories

```
docs/           # All documentation
├── core/       # System architecture & API specs
├── features/   # Feature-specific docs
└── development/ # Development guides

.agent/         # Machine-readable catalogs
├── repo.catalog.json    # File index & relationships
├── routes.index.json    # API routes mapping
├── tests.index.json     # Test coverage
└── deps.graph.mmd       # Module dependencies

db/             # Database schema
└── schema.json # Complete DB structure
```

## 🚀 Quick Start Checklist

- [ ] Read `docs/AGENT_ENTRY_POINT.md`
- [ ] Review `docs/agent-knowledge-base.md`
- [ ] Check `db/schema.json` for database context
- [ ] Review `docs/api-spec.yaml` for API surface
- [ ] Explore `.agent/repo.catalog.json` for code structure
- [ ] Use `.agent/routes.index.json` for endpoint mapping

---

**Remember**: This project has comprehensive documentation and machine-readable catalogs. Use them efficiently!
