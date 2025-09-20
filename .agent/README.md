# Repo Catalog (for agents)

This directory contains machine-readable catalogs of the codebase structure, generated automatically from the source code.

## Files

- **repo.catalog.json** - Main index: files, imports, exports, environment variable usage, and content hashes
- **routes.index.json** - Express routes mapped to controllers and service calls
- **tests.index.json** - Test files mapped to the routes/services they cover
- **deps.graph.mmd** - Mermaid diagram showing module dependency relationships

## Usage for AI Agents

Use these files as structured context when:
- Understanding the codebase architecture
- Finding related files and dependencies
- Mapping API endpoints to their implementations
- Understanding test coverage
- Analyzing module relationships

## Ground Truth

The source code is the ground truth. These catalogs are generated automatically and should be regenerated when:
- New routes are added
- Controllers or services are refactored
- Test files are added or moved
- Dependencies change

## Regeneration

Run `npm run catalog:generate` to regenerate all catalog files.

Do not manually edit these files - they will be overwritten on the next generation.
