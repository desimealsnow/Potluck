# 🤖 AI Agent Documentation Hub

> **Purpose**: Centralized documentation for AI agents working with the Potluck project
> **Last Updated**: 2025-09-21
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
- **Knowledge Base**: ✅ Updated (added phone verification flow)
- **Code Catalog**: ✅ Generated (includes new routes under `/user-profile/phone/*`)
- **Health Score**: 82/100
- **Last Updated**: 2025-09-21

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

## 🤖 AI Co‑Pilot Guide (Onboarding)

### Repo Structure (high‑level)
```
apps/
  mobile/   # Expo React Native app (screens, components, services)
  server/   # Express API (routes, controllers, services)
packages/
  payments/ # Payment providers core lib
  common/   # Shared types/utils
```

### Key Concepts
- Potluck events have hosts, guests, items, and join requests with capacity holds
- Discovery supports nearby/city queries (PostGIS/RPC fallbacks)
- Push notifications via Expo; phone verification gating for hosting

### Entry Points
- Mobile UI: `apps/mobile/src/screens/Auth/EventList.tsx` → `EventDetailsPage.tsx`
- API flow: `apps/server/src/routes/events.routes.ts` → `events.controller.ts` → `events.service.ts`

### AI Navigation Hints
- Start with `.agent/repo.catalog.json` to find files and exports
- Map endpoints with `.agent/routes.index.json` then open the controller/service
- Database relations/functions are in `apps/server/db/schema.json`

### Error Handling Pattern
- Services return `ServiceResult<T>` with `{ ok, data?|error?, code? }`
- Controllers call `handle(res, result)` to map codes to HTTP responses

### Event Lifecycle Mapping (mobile ↔ backend)
- Mobile tabs: `upcoming | past | drafts | deleted`
- API status: `published | completed | draft | purged | cancelled`
- Mapping: `upcoming → published`, `past → completed`, `drafts → draft`, `deleted → purged`
- Note: `cancelled` appears only as a server status; mobile surfaces it via badges/actions

### Events List Query Cheatsheet
- Pagination: `limit`, `offset`
- Search: `q`
- Filters: `status`, `ownership` (all|mine|invited), `diet` (veg,nonveg,mixed)
- Discovery: `lat`, `lon`, `radius_km`, `is_public=true` (includes public + my events)
- Includes: `include=location` to ensure location info is joined

### Feature → Route Map
- List events: `GET /events`
- Event details: `GET /events/{eventId}`
- Publish / Cancel / Complete: `POST /events/{id}/publish|cancel|complete`
- Purge / Restore: `POST /events/{id}/purge|restore`
- Items: `GET/POST /events/{id}/items`, `GET/PUT/DELETE /events/{id}/items/{itemId}`
- Participants: `GET/POST /events/{id}/participants`, `GET/PUT/DELETE /events/{id}/participants/{partId}`
- Join Requests: `POST/GET /events/{id}/requests`, plus approve/decline/waitlist endpoints

### Related Files
- Join Requests: `apps/server/src/modules/requests/*`
- Items: `apps/server/src/routes/items.routes.ts`
- Participants: `apps/server/src/routes/participants.routes.ts`

---

**Remember**: This project has comprehensive documentation and machine-readable catalogs. Use them efficiently to understand the codebase and provide accurate assistance!
