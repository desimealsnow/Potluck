import { readFileSync, existsSync, mkdirSync, statSync, writeFileSync as fsWrite } from 'fs';
import { resolve } from 'path';

interface ValidationResult {
  file: string;
  exists: boolean;
  last_modified?: string;
  size?: number;
  content_valid?: boolean;
  issues: string[];
}

interface ContextValidation {
  generated_at: string;
  overall_health: 'excellent' | 'good' | 'warning' | 'critical';
  validation_results: ValidationResult[];
  recommendations: string[];
  critical_files_missing: string[];
}

(async () => {
  console.log('🔍 Validating agent context...');
  
  const criticalFiles = [
    'docs/agent/AGENT_ENTRY_POINT.md',
    'docs/agent/agent-knowledge-base.md',
    'docs/agent/README.md',
    'docs/api-spec.yaml',
    '.agent/repo.catalog.json',
    '.agent/routes.index.json',
    '.agent/tests.index.json',
    '.agent/deps.graph.mmd'
  ];
  
  const validationResults: ValidationResult[] = [];
  let criticalFilesMissing: string[] = [];
  
  for (const file of criticalFiles) {
    const result = validateFile(file);
    validationResults.push(result);
    
    if (!result.exists) {
      criticalFilesMissing.push(file);
    }
  }
  // Special case: database schema may live in either location
  const dbSchemaAlt = ['apps/server/db/schema.json', 'db/schema.json'];
  const dbExists = dbSchemaAlt.some(p => existsSync(resolve(p)));
  const dbResult: ValidationResult = {
    file: 'apps/server/db/schema.json | db/schema.json',
    exists: dbExists,
    last_modified: dbExists ? newestMtime(dbSchemaAlt) : undefined,
    size: dbExists ? safeStatSize(dbSchemaAlt) : undefined,
    content_valid: dbExists,
    issues: dbExists ? [] : ['File does not exist in either path']
  };
  validationResults.push(dbResult);
  if (!dbExists) criticalFilesMissing.push('apps/server/db/schema.json|db/schema.json');
  
  // Determine overall health
  const overallHealth = determineOverallHealth(validationResults, criticalFilesMissing);
  
  // Generate recommendations
  const recommendations = generateRecommendations(validationResults, criticalFilesMissing);
  
  const validation: ContextValidation = {
    generated_at: new Date().toISOString(),
    overall_health: overallHealth,
    validation_results: validationResults,
    recommendations,
    critical_files_missing: criticalFilesMissing
  };
  
  // Write validation report
  const report = generateValidationReport(validation);
  ensureAgentDir();
  writeFileSafe('.agent/context-validation.json', JSON.stringify(validation, null, 2));
  writeFileSafe('.agent/CONTEXT_VALIDATION_REPORT.md', report);
  
  console.log(`✅ Context validation complete!`);
  console.log(`📊 Overall Health: ${overallHealth.toUpperCase()}`);
  console.log(`⚠️  Critical files missing: ${criticalFilesMissing.length}`);
  console.log(`📁 Generated .agent/context-validation.json`);
  console.log(`📁 Generated .agent/CONTEXT_VALIDATION_REPORT.md`);
  if (criticalFilesMissing.length > 0) {
    console.error('🚫 Critical context files missing. Run: npm run agent:update');
    process.exit(1);
  }
})();

function validateFile(filePath: string): ValidationResult {
  const fullPath = resolve(filePath);
  const exists = existsSync(fullPath);
  
  const result: ValidationResult = {
    file: filePath,
    exists,
    issues: []
  };
  
  if (!exists) {
    result.issues.push('File does not exist');
    return result;
  }
  
  try {
    const stats = statSync(fullPath);
    result.last_modified = stats.mtime.toISOString();
    result.size = stats.size;
    
    // Check if file is readable
    const content = readFileSync(fullPath, 'utf8');
    result.content_valid = true;
    
    // File-specific validations
    if (filePath.endsWith('.json')) {
      try {
        JSON.parse(content);
      } catch (e) {
        result.content_valid = false;
        result.issues.push('Invalid JSON format');
      }
    }
    
    if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      // Basic YAML validation (simplified)
      if (content.includes('---') && content.split('---').length < 2) {
        result.issues.push('Potential YAML formatting issue');
      }
    }
    
    // Check file size
    if (stats.size === 0) {
      result.issues.push('File is empty');
    } else if (stats.size > 10 * 1024 * 1024) { // 10MB
      result.issues.push('File is very large (>10MB)');
    }
    
    // Check if file is too old (older than 7 days)
    const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceModified > 7) {
      result.issues.push('File has not been updated in over 7 days');
    }
    
  } catch (error) {
    result.issues.push(`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return result;
}

function determineOverallHealth(results: ValidationResult[], criticalMissing: string[]): 'excellent' | 'good' | 'warning' | 'critical' {
  if (criticalMissing.length > 0) {
    return 'critical';
  }
  
  const filesWithIssues = results.filter(r => r.issues.length > 0).length;
  const totalFiles = results.length;
  const issueRatio = filesWithIssues / totalFiles;
  
  if (issueRatio === 0) {
    return 'excellent';
  } else if (issueRatio < 0.2) {
    return 'good';
  } else if (issueRatio < 0.5) {
    return 'warning';
  } else {
    return 'critical';
  }
}

function generateRecommendations(results: ValidationResult[], criticalMissing: string[]): string[] {
  const recommendations: string[] = [];
  
  if (criticalMissing.length > 0) {
    recommendations.push(`CRITICAL: Generate missing files: ${criticalMissing.join(', ')}`);
  }
  
  const oldFiles = results.filter(r => r.issues.some(issue => issue.includes('not been updated')));
  if (oldFiles.length > 0) {
    recommendations.push(`Update stale files: ${oldFiles.map(f => f.file).join(', ')}`);
  }
  
  const emptyFiles = results.filter(r => r.issues.some(issue => issue.includes('empty')));
  if (emptyFiles.length > 0) {
    recommendations.push(`Fix empty files: ${emptyFiles.map(f => f.file).join(', ')}`);
  }
  
  const invalidJson = results.filter(r => r.issues.some(issue => issue.includes('Invalid JSON')));
  if (invalidJson.length > 0) {
    recommendations.push(`Fix JSON formatting: ${invalidJson.map(f => f.file).join(', ')}`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('All context files are healthy and up-to-date');
  }
  
  return recommendations;
}

function generateValidationReport(validation: ContextValidation): string {
  let markdown = `# Agent Context Validation Report\n\n`;
  markdown += `Generated: ${validation.generated_at}\n\n`;
  
  markdown += `## Overall Health: ${validation.overall_health.toUpperCase()}\n\n`;
  
  if (validation.critical_files_missing.length > 0) {
    markdown += `## 🚨 Critical Issues\n\n`;
    markdown += `The following critical files are missing:\n`;
    validation.critical_files_missing.forEach(file => {
      markdown += `- \`${file}\`\n`;
    });
    markdown += `\n`;
  }
  
  markdown += `## File Validation Results\n\n`;
  markdown += `| File | Status | Issues | Last Modified |\n`;
  markdown += `|------|--------|--------|---------------|\n`;
  
  validation.validation_results.forEach(result => {
    const status = result.exists ? '✅' : '❌';
    const issues = result.issues.length > 0 ? result.issues.join(', ') : 'None';
    const lastModified = result.last_modified ? new Date(result.last_modified).toLocaleDateString() : 'N/A';
    
    markdown += `| \`${result.file}\` | ${status} | ${issues} | ${lastModified} |\n`;
  });
  
  markdown += `\n## Recommendations\n\n`;
  validation.recommendations.forEach((rec, index) => {
    markdown += `${index + 1}. ${rec}\n`;
  });
  
  return markdown;
}

function writeFileSafe(path: string, content: string) {
  fsWrite(path, content);
}

function ensureAgentDir() {
  try { mkdirSync('.agent', { recursive: true }); } catch {}
}

function newestMtime(paths: string[]): string | undefined {
  const times = paths
    .map(p => resolve(p))
    .filter(p => existsSync(p))
    .map(p => statSync(p).mtime.getTime());
  if (!times.length) return undefined;
  return new Date(Math.max(...times)).toISOString();
}

function safeStatSize(paths: string[]): number | undefined {
  for (const p of paths) {
    const abs = resolve(p);
    if (existsSync(abs)) return statSync(abs).size;
  }
  return undefined;
}
