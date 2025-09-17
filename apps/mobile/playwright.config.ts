import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ui',
  timeout: 60_000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: process.env.MOBILE_WEB_URL || 'http://localhost:8081',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },
  projects: [
    { 
      name: 'chromium', 
      use: { 
        ...devices['Desktop Chrome'],
        // Add headless mode for CI environments
        headless: process.env.CI ? true : false,
      } 
    },
    // Disable webkit for now due to system dependencies
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ],
  // Configure test result directory
  outputDir: 'test-results',
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['line'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
});
