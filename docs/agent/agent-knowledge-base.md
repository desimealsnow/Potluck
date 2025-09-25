# Potluck AI Agent Knowledge Base

> **Purpose**: Centralized, structured documentation optimized for AI agents
> **Last Updated**: 2025-09-21
> **Version**: 1.1

## 🚨 NEW AI AGENTS: Start Here!

> **CRITICAL**: If you're a new AI agent, read **[`docs/AGENT_ENTRY_POINT.md`](AGENT_ENTRY_POINT.md)** FIRST for complete project context and file priorities.

> Also see the lightweight machine-friendly manifest: **`docs/agent/ai-context.json`** for quick entry points and key flows.

## 🎯 Quick Reference

### **Project Overview**
- **Name**: Potluck - Event Management Platform
- **Type**: Cross-platform mobile app + Node.js API
- **Tech Stack**: React Native (Expo) + Node.js + PostgreSQL (Supabase)
- **Main Features**: Event management, user profiles, real-time notifications, location services, payments

### **Key Directories**
```
apps/
├── mobile/          # React Native app (iOS/Android)
│   ├── src/
│   │   ├── core/           # Core application logic
│   │   ├── features/       # Feature-based modules
│   │   ├── shared/         # Shared components & utilities
│   │   └── assets/         # Static assets
│   ├── tsconfig.json       # TypeScript with absolute imports
│   ├── metro.config.js     # Metro bundler configuration
│   └── babel.config.js     # Babel transpilation config
├── server/          # Node.js API server
└── web/            # Web dashboard (future)

packages/
├── payments/        # Payment processing
└── common/         # Shared utilities

docs/
├── api-spec.yaml   # OpenAPI specification
├── architecture.md # System architecture
├── development/    # Development guides
│   └── PROJECT_STRUCTURE_AND_IMPORTS.md # Absolute imports guide
└── agent-knowledge-base.md # This file

.agent/
├── repo.catalog.json    # Machine-readable codebase index
├── routes.index.json    # API routes mapping
├── tests.index.json     # Test coverage mapping
├── deps.graph.mmd       # Module dependency graph
└── README.md           # Agent usage guide
```

## 🗂️ Documentation Index

### **Core System Documentation**
- [Architecture Overview](architecture.md) - System design and bounded contexts
- [API Specification](api-spec.yaml) - Complete API reference
- [Database Schema](rls-policies.md) - Database structure and policies
- [Deployment Guide](deployment.md) - Production deployment
- [Notifications](NOTIFICATIONS.md) - Real-time notification system

### **Feature Documentation**
- [Location Services](features/LOCATION_DISCOVERY_README.md) - Location and discovery
- [Payment System](features/PAYMENT_PROVIDERS_SETUP.md) - Billing and payments
- [User Management](features/USER_LOCATION_SIGNUP_README.md) - User profiles and location
- [Integrated Search](features/INTEGRATED_LOCATION_SEARCH_README.md) - Location-based search

### **Development Documentation**
- [Project Structure & Imports](development/PROJECT_STRUCTURE_AND_IMPORTS.md) - Absolute imports and project organization
- [Testing Guide](development/TESTING_README.md) - Testing strategies
- [Mobile Setup](development/SUPABASE_SETUP.md) - Mobile app configuration
- [Payment Testing](development/PAYMENT_TESTING_GUIDE.md) - Payment system testing
- [LemonSqueezy Setup](development/LEMONSQUEEZY_TEST_SETUP.md) - Payment provider setup

### **Script Documentation**
- [Schema Capture](scripts/SCHEMA_CAPTURE_README.md) - Database schema capture
- [Schema Validation](scripts/SCHEMA_VALIDATION_README.md) - Schema validation tools

## 🔧 Technical Details

### **Mobile App Structure (NEW)**
- **Architecture**: Feature-based organization with absolute imports
- **Entry Point**: `apps/mobile/index.ts` → `App.tsx`
- **Configuration**: TypeScript path mappings, Metro aliases, Babel module resolver
- **Import System**: Drag-and-drop workflow with config-only updates
- **Key Files**: `tsconfig.json`, `metro.config.js`, `babel.config.js`

### **Database Schema**
- **Location**: `apps/server/db/schema.sql` (SQL) + `apps/server/db/schema.json` (JSON for agents)
- **Functions**: 11 application functions (e.g., `process_join_request`)
- **Triggers**: 5 application triggers
- **Views**: 2 application views
- **Tables**: 54 tables across public, auth, storage schemas

### **API Endpoints**
- **Base URL**: `/api/v1`
- **Authentication**: Supabase JWT tokens
- **Documentation**: OpenAPI 3.0 spec in `docs/api-spec.yaml` (includes phone verification endpoints)
- **Validation**: Zod schemas in `apps/server/src/validators.ts`

### **Key Functions for AI Agents**
```sql
-- Event management
process_join_request(uuid, uuid, integer, text, integer, boolean)
availability_for_event(uuid)
create_event_with_items(uuid, jsonb)

-- Location services
find_nearby_events(double precision, double precision, integer, integer, integer)
find_nearby_users_for_latlon(double precision, double precision, integer)

-- User management
update_user_location(uuid, double precision, double precision)
update_request_status(uuid, text)
-- Phone verification is handled at the API layer; see `/user-profile/phone/send` and `/user-profile/phone/verify`.
```

## 📚 Documentation Management

### **Centralized Documentation Structure**
```
docs/
├── agent-knowledge-base.md          # 🤖 This file - AI agent hub
├── documentation-index.json         # 🔍 Machine-readable index
├── documentation-index.md           # 📚 Human-readable index
├── features/                        # 🎯 Feature documentation
├── development/                     # 🛠️ Development guides
├── scripts/                         # 📜 Script documentation
└── [core docs]                      # 📋 Core system docs
```

### **Documentation Scripts**
```bash
# Update all documentation and code catalog (recommended)
npm run agent:update

# Documentation only
npm run docs:update
npm run docs:consolidate    # Consolidate scattered docs
npm run docs:index          # Generate searchable index
npm run docs:view           # View documentation index

# Code catalog only
npm run catalog:generate    # Generate machine-readable code catalog
npm run catalog:view        # View code catalog info

# View everything
npm run agent:view          # View both docs and catalog
```

### **When to Run Documentation Scripts**
- **After adding new documentation files**
- **After moving documentation files**
- **After adding new routes, controllers, or services**
- **Before major releases**
- **When AI agents need updated information**

### **Documentation Maintenance Workflow**
1. **Add new docs** to appropriate `docs/` subfolder
2. **Run** `npm run agent:update` to update both docs and code catalog
3. **Commit** both the docs and generated index files
4. **AI agents** automatically get updated information

## 🤖 Machine-Readable Code Catalog

The `.agent/` directory contains automatically generated, machine-readable catalogs of the codebase:

### **Files Generated**
- **`repo.catalog.json`** - Complete file index with imports, exports, environment variables, and content hashes
- **`routes.index.json`** - All Express routes mapped to controllers and service calls
- **`tests.index.json`** - Test files mapped to the routes/services they cover
- **`deps.graph.mmd`** - Mermaid diagram showing module dependency relationships

### **Usage for AI Agents**
These catalogs provide structured context for:
- Understanding codebase architecture and relationships
- Finding related files and dependencies
- Mapping API endpoints to their implementations
- Understanding test coverage and relationships
- Analyzing module dependencies and data flow

### **Regeneration**
The catalog is automatically regenerated when you run `npm run catalog:generate` or `npm run agent:update`. The source code remains the ground truth - these files are generated automatically and should not be manually edited.

## 🚀 Common AI Agent Tasks

### **1. Database Queries**
- Use `db/schema.json` for table relationships and function signatures
- Reference `db/schema.sql` for complete DDL
- Check `docs/rls-policies.md` for security policies

### **2. API Integration**
- Use `docs/api-spec.yaml` for endpoint definitions
- Reference `apps/server/src/validators.ts` for request/response schemas
- Check `apps/server/src/controllers/` for implementation details

### **3. Feature Implementation**
- Check feature-specific READMEs in `apps/server/` for implementation guides
- Use `docs/architecture.md` for system context
- Reference test files for usage examples

## 📋 Quick Commands

### **Schema Analysis**
```bash
# View database stats
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('db/schema.json', 'utf8')); console.log('Tables:', data.schemas.length, 'Functions:', data.functions.length);"

# Find specific function
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('db/schema.json', 'utf8')); console.log(JSON.stringify(data.functions.find(f => f.name === 'process_join_request'), null, 2));"
```

### **API Testing**
```bash
# Start development server
cd apps/server && npm run dev

# Run tests
npm run test

# Generate API docs
npm run schema:generate
```

## 🔍 Search Strategy

When looking for specific information:

1. **Start here**: This knowledge base for overview
2. **Feature-specific**: Check `apps/server/*README.md` files
3. **Technical details**: Use `docs/` directory
4. **Code examples**: Check test files in `tests/`
5. **Database**: Use `db/schema.json` for agent-friendly queries

## 📝 Maintenance

- **Update frequency**: After major feature changes
- **Version control**: All docs are in Git
- **AI agent optimization**: This file is designed for agent consumption
- **Human readability**: Individual READMEs remain human-friendly

---

*This knowledge base is designed to be the first stop for AI agents working with the Potluck codebase. It provides quick access to the most important information while maintaining links to detailed documentation.*
