#!/usr/bin/env node

/**
 * Documentation Index Generator
 * 
 * Creates a comprehensive index of all documentation files
 * optimized for both humans and AI agents.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');

// Function to scan directory for markdown files
function scanMarkdownFiles(dir, relativePath = '') {
  const files = [];
  const fullDir = path.join(rootDir, dir);
  
  if (!fs.existsSync(fullDir)) {
    return files;
  }
  
  const items = fs.readdirSync(fullDir);
  
  for (const item of items) {
    const itemPath = path.join(fullDir, item);
    const relativeItemPath = path.join(relativePath, item);
    
    if (fs.statSync(itemPath).isDirectory()) {
      // Skip node_modules, .git, etc.
      if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(item)) {
        files.push(...scanMarkdownFiles(path.join(dir, item), relativeItemPath));
      }
    } else if (item.endsWith('.md')) {
      const content = fs.readFileSync(itemPath, 'utf8');
      const lines = content.split('\n');
      
      // Extract metadata
      const title = lines.find(line => line.startsWith('# '))?.replace('# ', '') || item;
      const description = lines.find(line => line.startsWith('> '))?.replace('> ', '') || 
                        lines.slice(1, 5).find(line => line.trim() && !line.startsWith('#')) || 
                        'No description available';
      
      // Extract tags from content
      const tags = [];
      if (content.includes('API') || content.includes('api')) tags.push('api');
      if (content.includes('test') || content.includes('Test')) tags.push('testing');
      if (content.includes('database') || content.includes('schema')) tags.push('database');
      if (content.includes('mobile') || content.includes('React Native')) tags.push('mobile');
      if (content.includes('payment') || content.includes('billing')) tags.push('payments');
      if (content.includes('location') || content.includes('geolocation')) tags.push('location');
      if (content.includes('notification')) tags.push('notifications');
      if (content.includes('deployment') || content.includes('production')) tags.push('deployment');
      
      files.push({
        title,
        description,
        path: relativeItemPath,
        fullPath: itemPath,
        size: content.length,
        lines: lines.length,
        tags: [...new Set(tags)],
        lastModified: fs.statSync(itemPath).mtime.toISOString()
      });
    }
  }
  
  return files;
}

// Function to categorize files - Updated for centralized docs structure
function categorizeFiles(files) {
  const categories = {
    'agent': {
      title: 'AI Agent Documentation',
      description: 'Documentation specifically for AI agents',
      files: []
    },
    'core': {
      title: 'Core Documentation',
      description: 'Essential project documentation',
      files: []
    },
    'features': {
      title: 'Feature Documentation',
      description: 'Feature-specific guides and implementations',
      files: []
    },
    'development': {
      title: 'Development Guides',
      description: 'Development, testing, and setup documentation',
      files: []
    },
    'scripts': {
      title: 'Script Documentation',
      description: 'Documentation for utility scripts and tools',
      files: []
    },
    'api': {
      title: 'API Documentation',
      description: 'API specifications and integration guides',
      files: []
    },
    'deployment': {
      title: 'Deployment & Operations',
      description: 'Deployment, configuration, and operational guides',
      files: []
    }
  };
  
  for (const file of files) {
    // Categorize based on new centralized structure
    if (file.path.startsWith('docs/agent/')) {
      categories.agent.files.push(file);
    } else if (file.path.startsWith('docs/features/')) {
      categories.features.files.push(file);
    } else if (file.path.startsWith('docs/development/')) {
      categories.development.files.push(file);
    } else if (file.path.startsWith('docs/scripts/')) {
      categories.scripts.files.push(file);
    } else if (file.tags.includes('api') || file.path.includes('api-spec')) {
      categories.api.files.push(file);
    } else if (file.tags.includes('deployment') || file.path.includes('deployment')) {
      categories.deployment.files.push(file);
    } else if (file.path.startsWith('docs/') || file.path === 'README.md') {
      categories.core.files.push(file);
    } else {
      // Fallback for any remaining files
      categories.core.files.push(file);
    }
  }
  
  return categories;
}

// Function to generate search index
function generateSearchIndex(files) {
  const searchIndex = {
    by_tag: {},
    by_path: {},
    by_title: {},
    by_content: {}
  };
  
  for (const file of files) {
    // Index by tags
    for (const tag of file.tags) {
      if (!searchIndex.by_tag[tag]) {
        searchIndex.by_tag[tag] = [];
      }
      searchIndex.by_tag[tag].push(file.path);
    }
    
    // Index by path
    const pathParts = file.path.split('/');
    for (let i = 0; i < pathParts.length; i++) {
      const partialPath = pathParts.slice(0, i + 1).join('/');
      if (!searchIndex.by_path[partialPath]) {
        searchIndex.by_path[partialPath] = [];
      }
      searchIndex.by_path[partialPath].push(file.path);
    }
    
    // Index by title words
    const titleWords = file.title.toLowerCase().split(/\s+/);
    for (const word of titleWords) {
      if (word.length > 2) {
        if (!searchIndex.by_title[word]) {
          searchIndex.by_title[word] = [];
        }
        searchIndex.by_title[word].push(file.path);
      }
    }
  }
  
  return searchIndex;
}

// Main execution
async function main() {
  console.log('📚 Generating Documentation Index...\n');
  
  // Scan all markdown files
  const allFiles = scanMarkdownFiles('.');
  console.log(`Found ${allFiles.length} markdown files`);
  
  // Categorize files
  const categories = categorizeFiles(allFiles);
  
  // Generate search index
  const searchIndex = generateSearchIndex(allFiles);
  
  // Create comprehensive index
  const docIndex = {
    metadata: {
      generated_at: new Date().toISOString(),
      total_files: allFiles.length,
      total_size: allFiles.reduce((sum, file) => sum + file.size, 0),
      version: '1.0'
    },
    categories,
    search_index: searchIndex,
    quick_reference: {
      most_important: [
        'README.md',
        'docs/architecture.md',
        'docs/api-spec.yaml',
        'apps/server/SCHEMA_MANAGEMENT_SUMMARY.md',
        'apps/server/TESTING_README.md'
      ],
      by_use_case: {
        'getting_started': ['README.md', 'docs/architecture.md'],
        'api_development': ['docs/api-spec.yaml', 'apps/server/TESTING_README.md'],
        'database_work': ['apps/server/SCHEMA_MANAGEMENT_SUMMARY.md', 'docs/rls-policies.md'],
        'mobile_development': ['apps/mobile/SUPABASE_SETUP.md', 'apps/mobile/SUPABASE_AUTH_GUIDE.md'],
        'testing': ['apps/server/TESTING_README.md', 'apps/server/PAYMENT_TESTING_GUIDE.md'],
        'deployment': ['docs/deployment.md', 'apps/server/PAYMENT_PROVIDERS_SETUP.md']
      }
    },
    ai_agent_guidance: {
      start_here: 'docs/agent-knowledge-base.md',
      database_schema: 'db/schema.json',
      api_spec: 'docs/api-spec.yaml',
      search_strategy: [
        '1. Check docs/agent-knowledge-base.md for overview',
        '2. Use search_index for specific topics',
        '3. Reference individual files for detailed information',
        '4. Check test files for usage examples'
      ]
    }
  };
  
  // Write index files
  const indexPath = path.join(rootDir, 'docs', 'documentation-index.json');
  fs.writeFileSync(indexPath, JSON.stringify(docIndex, null, 2));
  
  // Generate human-readable index
  const humanIndex = `# Documentation Index

Generated: ${new Date().toISOString()}

## 📊 Overview
- **Total Files**: ${allFiles.length}
- **Total Size**: ${Math.round(allFiles.reduce((sum, file) => sum + file.size, 0) / 1024)} KB
- **Categories**: ${Object.keys(categories).length}

## 📂 Categories

${Object.entries(categories).map(([key, category]) => 
  `### ${category.title}
${category.description}

${category.files.map(file => 
  `- [${file.title}](${file.path}) (${Math.round(file.size / 1024)} KB) - ${file.description}`
).join('\n')}`
).join('\n\n')}

## 🔍 Search by Tags

${Object.entries(searchIndex.by_tag).map(([tag, files]) => 
  `### ${tag.toUpperCase()}
${files.map(filePath => `- [${filePath}](${filePath})`).join('\n')}`
).join('\n\n')}

## 🤖 AI Agent Quick Start

1. **Start with**: [docs/agent-knowledge-base.md](docs/agent-knowledge-base.md)
2. **Database**: Use \`db/schema.json\` for queries
3. **API**: Check [docs/api-spec.yaml](docs/api-spec.yaml)
4. **Search**: Use this index to find specific topics

## 📋 Quick Reference

### Most Important Files
${docIndex.quick_reference.most_important.map(file => `- [${file}](${file})`).join('\n')}

### By Use Case
${Object.entries(docIndex.quick_reference.by_use_case).map(([useCase, files]) => 
  `#### ${useCase.replace('_', ' ').toUpperCase()}
${files.map(file => `- [${file}](${file})`).join('\n')}`
).join('\n\n')}
`;

  const humanIndexPath = path.join(rootDir, 'docs', 'documentation-index.md');
  fs.writeFileSync(humanIndexPath, humanIndex);
  
  console.log('✅ Documentation index generated!');
  console.log(`📄 Files created:`);
  console.log(`   - docs/documentation-index.json (machine-readable)`);
  console.log(`   - docs/documentation-index.md (human-readable)`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Files indexed: ${allFiles.length}`);
  console.log(`   - Categories: ${Object.keys(categories).length}`);
  console.log(`   - Tags: ${Object.keys(searchIndex.by_tag).length}`);
}

main().catch(console.error);
