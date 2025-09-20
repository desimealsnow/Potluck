# Potluck Documentation

> **Centralized documentation hub for the Potluck event management platform**

## 📁 Structure

```
docs/
├── README.md                          # This file - Documentation overview
├── agent-knowledge-base.md            # 🤖 AI agent knowledge base
├── documentation-index.md             # 📚 Human-readable documentation index
├── documentation-index.json           # 🔍 Machine-readable documentation index
├── consolidated-documentation.json    # 📊 Complete documentation metadata
├── ai-agent-summary.json             # ⚡ Quick AI agent reference
├── documentation-summary.md           # 📋 Documentation summary
│
├── features/                          # 🎯 Feature-specific documentation
│   ├── LOCATION_DISCOVERY_README.md
│   ├── PAYMENT_PROVIDERS_SETUP.md
│   ├── USER_LOCATION_SIGNUP_README.md
│   └── ...
│
├── development/                       # 🛠️ Development guides
│   ├── TESTING_README.md
│   ├── SUPABASE_SETUP.md
│   ├── PAYMENT_TESTING_GUIDE.md
│   └── ...
│
├── scripts/                          # 📜 Script documentation
│   ├── SCHEMA_CAPTURE_README.md
│   └── SCHEMA_VALIDATION_README.md
│
└── [core docs]                       # 📋 Core system documentation
    ├── architecture.md
    ├── api-spec.yaml
    ├── rls-policies.md
    └── ...
```

## 🚀 Quick Start

### **For Humans**
1. **Start here**: [agent-knowledge-base.md](agent-knowledge-base.md) for project overview
2. **Browse**: [documentation-index.md](documentation-index.md) for organized documentation
3. **Search**: Use the index to find specific topics
4. **Read**: Individual documentation files for detailed information

### **For AI Agents**
1. **Entry point**: [agent-knowledge-base.md](agent-knowledge-base.md)
2. **Database**: Use `apps/server/db/schema.json` for queries
3. **API**: Check `docs/api-spec.yaml` for endpoints
4. **Search**: Use `docs/documentation-index.json` for structured search

## 🛠️ Documentation Management

### **Adding New Documentation**
1. **Place** new docs in appropriate subfolder:
   - `docs/features/` - Feature-specific guides
   - `docs/development/` - Development and testing guides
   - `docs/scripts/` - Script documentation
   - `docs/` - Core system documentation

2. **Update** documentation indices:
   ```bash
   npm run docs:update
   ```

3. **Commit** both the docs and generated index files

### **Available Scripts**
```bash
# Update all documentation (run after adding new docs)
npm run docs:update

# Individual commands
npm run docs:consolidate    # Consolidate scattered docs
npm run docs:index          # Generate searchable index
npm run docs:view           # View documentation index
```

### **When to Update Documentation**
- ✅ After adding new documentation files
- ✅ After moving documentation files
- ✅ Before major releases
- ✅ When AI agents need updated information
- ✅ After significant feature changes

## 📊 Documentation Statistics

- **Total Files**: 38 markdown files
- **Total Size**: ~270 KB
- **Categories**: 6 (Core, Features, Development, Scripts, API, Deployment)
- **Search Tags**: 8 (api, testing, database, mobile, payments, location, notifications, deployment)

## 🔍 Search Capabilities

### **By Category**
- **Core**: Essential project documentation
- **Features**: Feature-specific guides and implementations
- **Development**: Development, testing, and setup documentation
- **Scripts**: Documentation for utility scripts and tools
- **API**: API specifications and integration guides
- **Deployment**: Deployment, configuration, and operational guides

### **By Tags**
- `api` - API-related documentation
- `testing` - Testing guides and strategies
- `database` - Database schema and queries
- `mobile` - Mobile app development
- `payments` - Payment system integration
- `location` - Location services and geolocation
- `notifications` - Real-time notification system
- `deployment` - Production deployment guides

## 🤖 AI Agent Integration

The documentation system is optimized for AI agents with:

- **Structured data**: JSON indices for programmatic access
- **Quick reference**: Pre-categorized information by use case
- **Search capabilities**: Tag-based and content-based search
- **Maintenance**: Automated updates when documentation changes
- **Database integration**: Direct links to schema files

## 📝 Maintenance

This documentation system is designed to be self-maintaining:

1. **Add docs** to appropriate folders
2. **Run** `npm run docs:update`
3. **Commit** changes
4. **AI agents** automatically get updated information

The system automatically:
- Categorizes new documentation
- Updates search indices
- Maintains cross-references
- Generates machine-readable metadata

---

*This documentation system provides both human-readable individual docs and AI-agent-optimized consolidated knowledge base for the Potluck platform.*
