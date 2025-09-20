#!/usr/bin/env node

/**
 * Documentation Consolidation Script
 * 
 * This script consolidates scattered markdown files into an AI-agent-friendly format.
 * It creates a comprehensive knowledge base and maintains individual docs for humans.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');

// Documentation categories - Updated for centralized docs structure
const DOC_CATEGORIES = {
  'core': {
    title: 'Core System Documentation',
    files: [
      'README.md',
      'docs/core/architecture.md',
      'docs/core/api-spec.md',
      'docs/core/rls-policies.md',
      'docs/api-spec.yaml',  // Keep in root docs/ for code generation
      'docs/deployment.md'
    ]
  },
  'agent': {
    title: 'AI Agent Documentation',
    files: [
      'docs/agent/README.md',
      'docs/agent/AGENT_ENTRY_POINT.md',
      'docs/agent/agent-knowledge-base.md',
      'docs/agent/AI_AGENT_QUICK_REFERENCE.md',
      'docs/agent/AGENT_ARCHITECTURE.md',
      'docs/agent/AGENT_CATALOG_IMPLEMENTATION.md'
    ]
  },
  'features': {
    title: 'Feature Documentation',
    files: [
      'docs/features/INTEGRATED_LOCATION_SEARCH_README.md',
      'docs/features/LOCATION_DISCOVERY_README.md',
      'docs/features/USER_LOCATION_SIGNUP_README.md',
      'docs/features/LEMONSQUEEZY_CONFIG.md',
      'docs/features/README.PAYMENTS-CONSUMER.md',
      'docs/features/PAYMENT_PROVIDERS_SETUP.md',
      'docs/features/TESTING_README.md',
      'docs/features/TEST_BILLING_README.md',
      'docs/features/NOTIFICATIONS.md'
    ]
  },
  'development': {
    title: 'Development Documentation',
    files: [
      'docs/development/COMPREHENSIVE_BILLING_TESTS_SUMMARY.md',
      'docs/development/LEMONSQUEEZY_COMPLETE_TESTING_GUIDE.md',
      'docs/development/LEMONSQUEEZY_TEST_SETUP.md',
      'docs/development/PAYMENT_TESTING_GUIDE.md',
      'docs/development/REACT_NATIVE_PAPER_DATES_SETUP.md',
      'docs/development/README.md',
      'docs/development/SUPABASE_AUTH_GUIDE.md',
      'docs/development/SUPABASE_SETUP.md',
      'docs/development/TEST_COMPLETION_SUMMARY.md',
      'docs/development/TEST_FIXES_SUMMARY.md',
      'docs/development/TEST_PLAN.md'
    ]
  },
  'scripts': {
    title: 'Script Documentation',
    files: [
      'docs/scripts/SCHEMA_CAPTURE_README.md',
      'docs/scripts/SCHEMA_VALIDATION_README.md'
    ]
  }
};

// Function to read and process markdown file
function readMarkdownFile(filePath) {
  try {
    const fullPath = path.join(rootDir, filePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    
    // Extract title (first # heading)
    const title = lines.find(line => line.startsWith('# '))?.replace('# ', '') || path.basename(filePath, '.md');
    
    // Extract summary (first paragraph after title)
    const titleIndex = lines.findIndex(line => line.startsWith('# '));
    const summaryStart = titleIndex + 1;
    const summaryEnd = lines.findIndex((line, index) => 
      index > summaryStart && (line.startsWith('##') || line.startsWith('---') || line.trim() === '')
    );
    
    const summary = lines.slice(summaryStart, summaryEnd === -1 ? summaryStart + 3 : summaryEnd)
      .filter(line => line.trim() !== '')
      .join(' ')
      .substring(0, 200) + '...';
    
    return {
      title,
      summary,
      path: filePath,
      size: content.length,
      lines: content.split('\n').length
    };
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}: ${error.message}`);
    return null;
  }
}

// Function to generate consolidated documentation
function generateConsolidatedDocs() {
  console.log('🔍 Scanning documentation files...');
  
  const consolidated = {
    metadata: {
      generated_at: new Date().toISOString(),
      total_files: 0,
      total_size: 0
    },
    categories: {}
  };
  
  // Process each category
  for (const [categoryKey, category] of Object.entries(DOC_CATEGORIES)) {
    console.log(`📂 Processing ${category.title}...`);
    
    const files = [];
    let categorySize = 0;
    
    for (const filePath of category.files) {
      const fileInfo = readMarkdownFile(filePath);
      if (fileInfo) {
        files.push(fileInfo);
        categorySize += fileInfo.size;
        consolidated.metadata.total_files++;
        consolidated.metadata.total_size += fileInfo.size;
      }
    }
    
    consolidated.categories[categoryKey] = {
      title: category.title,
      files: files.sort((a, b) => a.title.localeCompare(b.title)),
      total_size: categorySize,
      file_count: files.length
    };
  }
  
  return consolidated;
}

// Function to generate AI agent summary
function generateAgentSummary(consolidated) {
  const summary = {
    project_overview: {
      name: "Potluck - Event Management Platform",
      type: "Cross-platform mobile app + Node.js API",
      tech_stack: ["React Native (Expo)", "Node.js", "PostgreSQL (Supabase)", "TypeScript"],
      main_features: [
        "Event management with capacity control",
        "User profiles with location and preferences",
        "Real-time notifications",
        "Location-based discovery",
        "Payment and subscription management"
      ]
    },
    documentation_stats: {
      total_files: consolidated.metadata.total_files,
      total_size_kb: Math.round(consolidated.metadata.total_size / 1024),
      categories: Object.keys(consolidated.categories).length
    },
    quick_access: {
      most_important: [
        "README.md - Project overview",
        "docs/architecture.md - System design",
        "docs/api-spec.yaml - API reference",
        "apps/server/SCHEMA_MANAGEMENT_SUMMARY.md - Database schema",
        "apps/server/TESTING_README.md - Testing guide"
      ],
      feature_docs: Object.values(consolidated.categories.features.files)
        .slice(0, 5)
        .map(f => `${f.title} (${f.path})`)
    },
    ai_agent_tips: [
      "Start with docs/agent-knowledge-base.md for overview",
      "Use db/schema.json for database queries (agent-friendly format)",
      "Check docs/api-spec.yaml for API endpoints",
      "Look in apps/server/tests/ for usage examples",
      "Reference individual READMEs for feature-specific details"
    ]
  };
  
  return summary;
}

// Main execution
async function main() {
  console.log('📚 Potluck Documentation Consolidation Tool');
  console.log('==========================================\n');
  
  // Generate consolidated documentation
  const consolidated = generateConsolidatedDocs();
  
  // Generate AI agent summary
  const agentSummary = generateAgentSummary(consolidated);
  
  // Write consolidated documentation
  const outputPath = path.join(rootDir, 'docs', 'consolidated-documentation.json');
  fs.writeFileSync(outputPath, JSON.stringify(consolidated, null, 2));
  
  // Write AI agent summary
  const agentPath = path.join(rootDir, 'docs', 'ai-agent-summary.json');
  fs.writeFileSync(agentPath, JSON.stringify(agentSummary, null, 2));
  
  // Generate human-readable summary
  const humanSummary = `# Documentation Consolidation Summary

Generated: ${new Date().toISOString()}

## 📊 Statistics
- **Total Files**: ${consolidated.metadata.total_files}
- **Total Size**: ${Math.round(consolidated.metadata.total_size / 1024)} KB
- **Categories**: ${Object.keys(consolidated.categories).length}

## 📂 Categories

${Object.entries(consolidated.categories).map(([key, cat]) => 
  `### ${cat.title}\n- Files: ${cat.file_count}\n- Size: ${Math.round(cat.total_size / 1024)} KB\n- Files: ${cat.files.map(f => `  - [${f.title}](${f.path}) (${Math.round(f.size / 1024)} KB)`).join('\n')}`
).join('\n\n')}

## 🤖 AI Agent Quick Start

1. **Start with**: \`docs/agent-knowledge-base.md\`
2. **Database queries**: Use \`db/schema.json\`
3. **API reference**: Check \`docs/api-spec.yaml\`
4. **Feature details**: See individual READMEs in \`apps/server/\`

## 📁 Generated Files

- \`docs/consolidated-documentation.json\` - Complete documentation index
- \`docs/ai-agent-summary.json\` - AI agent quick reference
- \`docs/agent-knowledge-base.md\` - Centralized agent knowledge base
`;

  const summaryPath = path.join(rootDir, 'docs', 'documentation-summary.md');
  fs.writeFileSync(summaryPath, humanSummary);
  
  console.log('✅ Documentation consolidation complete!');
  console.log(`📄 Generated files:`);
  console.log(`   - docs/consolidated-documentation.json`);
  console.log(`   - docs/ai-agent-summary.json`);
  console.log(`   - docs/documentation-summary.md`);
  console.log(`   - docs/agent-knowledge-base.md`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Total files: ${consolidated.metadata.total_files}`);
  console.log(`   - Total size: ${Math.round(consolidated.metadata.total_size / 1024)} KB`);
  console.log(`   - Categories: ${Object.keys(consolidated.categories).length}`);
}

main().catch(console.error);
