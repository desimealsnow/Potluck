#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface TestConfig {
  name: string;
  command: string;
  description: string;
  timeout?: number;
}

const TEST_CONFIGS: TestConfig[] = [
  {
    name: 'smoke',
    command: 'npx playwright test --grep "smoke"',
    description: 'Run smoke tests (basic functionality)',
    timeout: 300000 // 5 minutes
  },
  {
    name: 'multi-user',
    command: 'npx playwright test multi-user-scenarios.spec.ts',
    description: 'Run multi-user interaction tests',
    timeout: 600000 // 10 minutes
  },
  {
    name: 'event-lifecycle',
    command: 'npx playwright test event-lifecycle.spec.ts',
    description: 'Run event lifecycle management tests',
    timeout: 600000 // 10 minutes
  },
  {
    name: 'join-requests',
    command: 'npx playwright test join-request-workflow.spec.ts',
    description: 'Run join request workflow tests',
    timeout: 600000 // 10 minutes
  },
  {
    name: 'item-management',
    command: 'npx playwright test item-management.spec.ts',
    description: 'Run item management and claiming tests',
    timeout: 600000 // 10 minutes
  },
  {
    name: 'edge-cases',
    command: 'npx playwright test edge-cases.spec.ts',
    description: 'Run edge case and error handling tests',
    timeout: 600000 // 10 minutes
  },
  {
    name: 'all',
    command: 'npx playwright test',
    description: 'Run all tests',
    timeout: 1800000 // 30 minutes
  },
  {
    name: 'ui-only',
    command: 'npx playwright test --project=chromium',
    description: 'Run tests on desktop Chrome only',
    timeout: 1200000 // 20 minutes
  },
  {
    name: 'mobile-only',
    command: 'npx playwright test --project=mobile-chrome',
    description: 'Run tests on mobile Chrome only',
    timeout: 1200000 // 20 minutes
  },
  {
    name: 'tablet-only',
    command: 'npx playwright test --project=tablet-chrome',
    description: 'Run tests on tablet Chrome only',
    timeout: 1200000 // 20 minutes
  }
];

function createTestResultsDir(): void {
  const testResultsDir = join(process.cwd(), 'test-results');
  if (!existsSync(testResultsDir)) {
    mkdirSync(testResultsDir, { recursive: true });
    console.log(`📁 Created test results directory: ${testResultsDir}`);
  }
}

function runTest(config: TestConfig): boolean {
  console.log(`\n🚀 Running ${config.name} tests...`);
  console.log(`📝 Description: ${config.description}`);
  console.log(`⏱️  Timeout: ${config.timeout ? Math.round(config.timeout / 1000) : 'default'} seconds`);
  console.log(`💻 Command: ${config.command}`);
  
  const startTime = Date.now();
  
  try {
    execSync(config.command, {
      stdio: 'inherit',
      timeout: config.timeout,
      cwd: process.cwd()
    });
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log(`✅ ${config.name} tests completed successfully in ${duration} seconds`);
    return true;
    
  } catch (error) {
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.error(`❌ ${config.name} tests failed after ${duration} seconds`);
    console.error('Error:', error);
    return false;
  }
}

function showHelp(): void {
  console.log('\n🎭 Potluck Playwright Test Runner');
  console.log('=====================================\n');
  console.log('Usage: npm run test:playwright [test-suite]');
  console.log('\nAvailable test suites:');
  
  TEST_CONFIGS.forEach(config => {
    console.log(`  ${config.name.padEnd(15)} - ${config.description}`);
  });
  
  console.log('\nExamples:');
  console.log('  npm run test:playwright smoke          # Run smoke tests');
  console.log('  npm run test:playwright multi-user     # Run multi-user tests');
  console.log('  npm run test:playwright all            # Run all tests');
  console.log('  npm run test:playwright mobile-only    # Run mobile tests only');
  
  console.log('\nEnvironment Variables:');
  console.log('  MOBILE_WEB_URL    - Override the mobile app URL (default: http://localhost:8081)');
  console.log('  CI                - Set to true for CI environment (enables headless mode)');
  console.log('  DEBUG             - Set to true for debug mode');
}

function main(): void {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const testSuite = args[0];
  const config = TEST_CONFIGS.find(c => c.name === testSuite);
  
  if (!config) {
    console.error(`❌ Unknown test suite: ${testSuite}`);
    console.error('Run with --help to see available test suites');
    process.exit(1);
  }
  
  // Create test results directory
  createTestResultsDir();
  
  // Set environment variables
  process.env.PLAYWRIGHT_TEST_TIMEOUT = config.timeout?.toString() || '120000';
  
  console.log('🎭 Potluck Playwright Test Runner');
  console.log('=====================================');
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🌍 Environment: ${process.env.CI ? 'CI' : 'Local'}`);
  console.log(`🔗 Mobile URL: ${process.env.MOBILE_WEB_URL || 'http://localhost:8081'}`);
  
  // Run the test
  const success = runTest(config);
  
  console.log('\n📊 Test Summary');
  console.log('================');
  console.log(`📅 Completed at: ${new Date().toISOString()}`);
  console.log(`✅ Status: ${success ? 'PASSED' : 'FAILED'}`);
  
  if (success) {
    console.log('\n🎉 All tests passed! Check test-results/ for detailed reports.');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed. Check test-results/ for detailed reports.');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test execution interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test execution terminated');
  process.exit(1);
});

// Run the main function
main();

