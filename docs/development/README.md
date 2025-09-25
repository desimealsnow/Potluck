# 🛠️ Development Guide

> **Purpose**: Comprehensive development documentation for the Potluck project
> **Last Updated**: 2025-09-20
> **Version**: 1.0

## 📚 Development Documentation

### **Core Development**
- **[Project Structure & Imports](PROJECT_STRUCTURE_AND_IMPORTS.md)** - Absolute imports and project organization
- **[NPM Package Management](NPM_PACKAGE_MANAGEMENT.md)** - Complete guide for creating, building, and publishing npm packages
- **[NPM Quick Reference](NPM_QUICK_REFERENCE.md)** - Quick reference card for common NPM operations
- **[TypeScript Configuration](typescript.md)** - TypeScript setup and best practices
- **[Testing Strategy](testing.md)** - Testing approaches and frameworks
- **[Database Development](database.md)** - Database development and migrations

### **Specialized Topics**
- **[RLS Testing](README.md)** - Row-Level Security testing with pgTap
- **[API Development](api-development.md)** - REST API development guidelines
- **[Mobile Development](mobile-development.md)** - React Native development
- **[Background Agents](background-agents.md)** - AI agent development and setup

## 🚀 Quick Start

### **For New Developers**

1. **Read the [NPM Package Management Guide](NPM_PACKAGE_MANAGEMENT.md)** - Essential for understanding our monorepo structure
2. **Set up your environment** - Follow the main [README.md](../../README.md)
3. **Understand the architecture** - Review [docs/core/architecture.md](../core/architecture.md)
4. **Start with a simple task** - Pick an issue labeled "good first issue"

### **For Package Development**

1. **Create a new package** - Follow [NPM Package Management](NPM_PACKAGE_MANAGEMENT.md)
2. **Set up TypeScript** - Use the provided templates
3. **Write tests** - Follow our testing strategy
4. **Document everything** - Include README, examples, and API docs
5. **Publish carefully** - Test locally before publishing

### **For Background Agent Development**

1. **Run setup script** - `npm run agent:setup`
2. **Understand the catalog system** - Review [docs/agent/README.md](../agent/README.md)
3. **Test with real agents** - Use the provided test environment
4. **Update documentation** - Keep agent docs current

## 🔧 Development Tools

### **Essential Commands**

```bash
# Package management
npm run build                    # Build all packages
npm run typecheck               # Type check all packages
npm run test                    # Run all tests

# Agent management
npm run agent:setup             # Setup for background agents
npm run agent:update            # Update agent documentation
npm run agent:view              # View agent status

# Documentation
npm run docs:update             # Update documentation
npm run docs:view               # View documentation index
```

### **Package-Specific Commands**

```bash
# Build specific package
npm run build -w packages/your-package

# Test specific package
npm test -w packages/your-package

# Type check specific package
npm run typecheck -w packages/your-package
```

## 📋 Development Workflow

### **1. Planning**
- Review requirements and acceptance criteria
- Check existing packages for similar functionality
- Plan the package structure and API design
- Consider backward compatibility

### **2. Development**
- Create package following the template
- Implement core functionality
- Write comprehensive tests
- Document everything thoroughly

### **3. Testing**
- Run unit tests locally
- Test with background agents
- Verify TypeScript compilation
- Check documentation accuracy

### **4. Publishing**
- Update version appropriately
- Test package installation in fresh project
- Publish to NPM
- Update related documentation

### **5. Maintenance**
- Monitor package usage
- Address issues promptly
- Keep dependencies updated
- Maintain backward compatibility

## 🎯 Best Practices

### **Package Design**
- **Single Responsibility** - Each package should have one clear purpose
- **Minimal Dependencies** - Keep external dependencies to a minimum
- **TypeScript First** - Always provide complete type definitions
- **Comprehensive Documentation** - Include examples and API references
- **Backward Compatibility** - Maintain API stability across versions

### **Code Quality**
- **Follow TypeScript best practices** - Use strict mode and proper typing
- **Write meaningful tests** - Cover both happy path and edge cases
- **Document as you code** - Don't leave documentation for later
- **Use consistent naming** - Follow established conventions
- **Handle errors gracefully** - Provide meaningful error messages

### **Documentation**
- **Start with README** - Every package needs a clear README
- **Include examples** - Show how to use the package
- **Document APIs** - Use JSDoc for complex functions
- **Keep it current** - Update docs with code changes
- **Make it discoverable** - Use proper keywords and descriptions

## 🚨 Common Pitfalls

### **Package Development**
- **Forgetting to build** - Always run `npm run build` before publishing
- **Missing type definitions** - Ensure `.d.ts` files are generated
- **Incomplete documentation** - Users need examples to get started
- **Version conflicts** - Be careful with dependency versions
- **Breaking changes** - Use major version bumps for breaking changes

### **Background Agents**
- **Not running setup** - Always run `npm run agent:setup` first
- **Missing built files** - Agents need pre-built packages
- **Outdated documentation** - Keep agent docs current
- **Version mismatches** - Ensure package versions are compatible

### **Publishing**
- **Wrong package name** - Double-check the package name
- **Missing files** - Verify the `files` array in package.json
- **Incomplete metadata** - Include description, keywords, and repository
- **Version conflicts** - Don't republish existing versions

## 📞 Getting Help

### **Documentation**
- **Check this guide first** - Most questions are answered here
- **Review package examples** - Look at existing packages for patterns
- **Read the main README** - General project information
- **Check agent documentation** - For background agent questions

### **Community**
- **Open an issue** - For bugs or feature requests
- **Start a discussion** - For questions or ideas
- **Review pull requests** - Learn from others' work
- **Ask in chat** - For quick questions

### **Resources**
- **TypeScript Handbook** - For TypeScript questions
- **NPM Documentation** - For package publishing
- **Jest Documentation** - For testing questions
- **React Native Docs** - For mobile development

## 🔗 Related Documentation

- **[Main README](../../README.md)** - Project overview and setup
- **[Architecture Guide](../core/architecture.md)** - System architecture
- **[API Documentation](../api-spec.yaml)** - API specifications
- **[Agent Documentation](../agent/README.md)** - AI agent guides
- **[Database Schema](../../db/schema.json)** - Database structure

---

**Remember**: Good documentation is as important as good code. Take time to document your work properly - it will save time for everyone in the long run!