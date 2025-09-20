import { Project, SourceFile } from 'ts-morph';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

interface CodeMetrics {
  complexity: number;
  lines_of_code: number;
  cyclomatic_complexity: number;
  maintainability_index: number;
  technical_debt: string[];
  security_concerns: string[];
  performance_issues: string[];
}

interface FileAnalysis {
  path: string;
  metrics: CodeMetrics;
  dependencies: string[];
  dependents: string[];
  test_coverage: boolean;
  documentation_coverage: boolean;
}

(async () => {
  console.log('🔍 Running enhanced code analysis...');
  
  const project = new Project({
    tsConfigFilePath: resolve('tsconfig.json'),
    skipAddingFilesFromTsConfig: false
  });

  const files = project.getSourceFiles().filter(sf => 
    sf.getFilePath().includes('apps/') || 
    sf.getFilePath().includes('packages/')
  );

  const analysis: FileAnalysis[] = [];

  for (const file of files) {
    const content = file.getFullText();
    const lines = content.split('\n').length;
    
    // Calculate cyclomatic complexity (simplified)
    const complexity = calculateComplexity(content);
    
    // Check for common issues
    const technicalDebt = identifyTechnicalDebt(content);
    const securityConcerns = identifySecurityIssues(content);
    const performanceIssues = identifyPerformanceIssues(content);
    
    // Calculate maintainability index (simplified)
    const maintainabilityIndex = Math.max(0, 100 - (complexity * 2) - (technicalDebt.length * 5));
    
    const fileAnalysis: FileAnalysis = {
      path: file.getFilePath().replace(process.cwd(), '').replace(/\\/g, '/'),
      metrics: {
        complexity,
        lines_of_code: lines,
        cyclomatic_complexity: complexity,
        maintainability_index: maintainabilityIndex,
        technical_debt: technicalDebt,
        security_concerns: securityConcerns,
        performance_issues: performanceIssues
      },
      dependencies: file.getImportDeclarations().map(d => d.getModuleSpecifierValue()),
      dependents: [], // Would need reverse analysis
      test_coverage: file.getFilePath().includes('test') || file.getFilePath().includes('spec'),
      documentation_coverage: content.includes('/**') || content.includes('//')
    };
    
    analysis.push(fileAnalysis);
  }

  // Generate analysis report
  const report = {
    generated_at: new Date().toISOString(),
    total_files: analysis.length,
    summary: {
      average_complexity: analysis.reduce((sum, f) => sum + f.metrics.complexity, 0) / analysis.length,
      average_maintainability: analysis.reduce((sum, f) => sum + f.metrics.maintainability_index, 0) / analysis.length,
      files_with_technical_debt: analysis.filter(f => f.metrics.technical_debt.length > 0).length,
      files_with_security_concerns: analysis.filter(f => f.metrics.security_concerns.length > 0).length,
      files_with_performance_issues: analysis.filter(f => f.metrics.performance_issues.length > 0).length
    },
    files: analysis
  };

  mkdirSync('.agent', { recursive: true });
  writeFileSync('.agent/code-analysis.json', JSON.stringify(report, null, 2));
  
  console.log('✅ Code analysis complete!');
  console.log(`📊 Analyzed ${analysis.length} files`);
  console.log(`⚠️  ${report.summary.files_with_technical_debt} files with technical debt`);
  console.log(`🔒 ${report.summary.files_with_security_concerns} files with security concerns`);
  console.log(`⚡ ${report.summary.files_with_performance_issues} files with performance issues`);
})();

function calculateComplexity(content: string): number {
  const complexityKeywords = [
    'if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||', '?', ':'
  ];
  
  let complexity = 1; // Base complexity
  for (const keyword of complexityKeywords) {
    // Escape special regex characters
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = content.match(new RegExp(`\\b${escapedKeyword}\\b`, 'g'));
    if (matches) {
      complexity += matches.length;
    }
  }
  
  return complexity;
}

function identifyTechnicalDebt(content: string): string[] {
  const issues: string[] = [];
  
  if (content.includes('TODO') || content.includes('FIXME')) {
    issues.push('Contains TODO/FIXME comments');
  }
  
  if (content.includes('any')) {
    issues.push('Uses "any" type (consider proper typing)');
  }
  
  if (content.includes('console.log')) {
    issues.push('Contains console.log statements (consider proper logging)');
  }
  
  const functionMatches = content.match(/function\s+\w+.*\{[\s\S]*?\}/g);
  if (functionMatches && functionMatches.length > 50) {
    issues.push('Large function detected (consider breaking down)');
  }
  
  return issues;
}

function identifySecurityIssues(content: string): string[] {
  const issues: string[] = [];
  
  if (content.includes('eval(')) {
    issues.push('Uses eval() - potential security risk');
  }
  
  if (content.includes('innerHTML')) {
    issues.push('Uses innerHTML - potential XSS risk');
  }
  
  if (content.includes('process.env') && !content.includes('REACT_APP_')) {
    issues.push('Uses process.env in client code - potential security leak');
  }
  
  return issues;
}

function identifyPerformanceIssues(content: string): string[] {
  const issues: string[] = [];
  
  if (content.includes('setInterval') || content.includes('setTimeout')) {
    issues.push('Uses timers - consider cleanup');
  }
  
  if (content.includes('.map(') && content.includes('.map(')) {
    issues.push('Multiple map operations - consider combining');
  }
  
  if (content.includes('useEffect') && !content.includes('[]')) {
    issues.push('useEffect without dependency array - potential infinite loop');
  }
  
  return issues;
}
