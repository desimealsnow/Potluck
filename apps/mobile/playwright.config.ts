import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ui',
  timeout: 120_000, // Increased timeout for complex multi-user scenarios
  expect: {
    timeout: 15000, // Increased expect timeout
  },
  use: {
    baseURL: process.env.MOBILE_WEB_URL || 'http://localhost:8081',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
    // Add action timeout for slow operations
    actionTimeout: 30000,
    // Add navigation timeout
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: process.env.CI ? true : false,
        // Add viewport for consistent testing
        viewport: { width: 1280, height: 720 },
      }
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        headless: process.env.CI ? true : false,
      }
    },
    {
      name: 'tablet-chrome',
      use: {
        ...devices['iPad Pro'],
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
    ['html', { outputFolder: 'playwright-report' }],
    ['line'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
<<<<<<< Current (Your changes)
=======
  // Global setup and teardown
  globalSetup: require.resolve('./tests/ui/global-setup.ts'),
  globalTeardown: require.resolve('./tests/ui/global-teardown.ts'),
  // Retry configuration
  retries: process.env.CI ? 2 : 0,
  // Parallel execution configuration
  workers: process.env.CI ? 2 : 4,
  // Test timeout
  timeout: 120_000,
  // Expect timeout
  expect: {
    timeout: 15000,
  },
  // Test match patterns
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts'
  ],
  // Test ignore patterns
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**'
  ],
  // Web server configuration for local development
  webServer: process.env.CI ? undefined : {
    command: 'npm run start:mobile',
    port: 8081,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
>>>>>>> Incoming (Background Agent changes)
});
