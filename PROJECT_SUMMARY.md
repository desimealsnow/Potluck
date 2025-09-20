# Potluck Project Summary

> **For AI agents starting new chats about this project**

## 🤖 AI Agent Instructions

**CRITICAL**: Before exploring the codebase, read these files in order:

1. **`docs/agent/README.md`** - Master entry point with complete project context
2. **`docs/agent/agent-knowledge-base.md`** - Central AI agent hub with detailed information
3. **`db/schema.json`** - Complete database schema and relationships
4. **`docs/api-spec.yaml`** - OpenAPI specification for all endpoints
5. **`.agent/repo.catalog.json`** - Machine-readable codebase index

## 📋 Project Overview

- **Name**: Potluck - Event Management Platform
- **Type**: Cross-platform mobile app + Node.js API
- **Tech Stack**: React Native (Expo) + Node.js + PostgreSQL (Supabase)
- **Key Features**: Event management, user profiles, real-time notifications, location services, payments

## 🏗️ Architecture

### Backend (Node.js + Express)
- REST API with OpenAPI documentation
- PostgreSQL with PostGIS for location data
- Supabase Auth with JWT tokens
- Real-time updates via Supabase Realtime
- LemonSqueezy integration for payments

### Frontend (React Native + Expo)
- Cross-platform mobile app (iOS/Android)
- TypeScript throughout
- Real-time notifications
- Location-based discovery
- Subscription management

## 📁 Key Directories

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

## 🎯 Common AI Agent Tasks

### Database Work
- Start with `db/schema.json` for table relationships
- Check `docs/core/rls-policies.md` for security policies
- Use `.agent/repo.catalog.json` to find related code

### API Development
- Review `docs/api-spec.yaml` for endpoint definitions
- Use `.agent/routes.index.json` for implementation mapping
- Check `.agent/tests.index.json` for test coverage

### Feature Implementation
- Read relevant `docs/features/` documentation
- Use `.agent/repo.catalog.json` for code navigation
- Check `.agent/deps.graph.mmd` for dependencies

### Code Navigation
- Use `.agent/repo.catalog.json` for file relationships
- Check `.agent/routes.index.json` for API mapping
- Review `.agent/deps.graph.mmd` for module dependencies

## 🔧 Maintenance Commands

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

## ⚠️ Important Notes

- **Source code is ground truth** - catalogs are generated automatically
- **Always regenerate** catalogs after significant code changes
- **Use `npm run agent:update`** to refresh all documentation and catalogs
- **Don't manually edit** `.agent/` files - they're auto-generated
- **Check timestamps** in generated files to ensure they're current

## 📞 Need Help?

If you're unsure about the project structure or need guidance:
1. **Read** `docs/AGENT_ENTRY_POINT.md` completely
2. **Check** the generated catalogs in `.agent/`
3. **Use** the search functionality in documentation files
4. **Refer** to the OpenAPI spec for API details

---

**Remember**: This project has comprehensive documentation and machine-readable catalogs. Use them to understand the codebase efficiently and accurately.
