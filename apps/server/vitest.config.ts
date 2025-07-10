// apps/server/vitest.config.ts
import { defineConfig } from 'vitest/config';
import { config as loadDotEnv } from 'dotenv';
import { resolve } from 'path';
import logger from '../server/src/logger';

// ①  Load env vars before Vitest spins up
//    - looks for .env.test first; if it doesn’t exist, falls back to .env
const envPath = ['.env.test', '.env']
  .map((f) => resolve(__dirname, f))
  .find((p) => {
    try { return require('fs').existsSync(p); } catch { return false; }
  });
if (envPath) {
  loadDotEnv({ path: envPath });
  console.log('[DEBUG] Loaded env from:', envPath);
  console.log('[DEBUG] TEST_SUPABASE_URL in config:', process.env.TEST_SUPABASE_URL);
}  


export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.spec.ts'],

    // ➜ reporters ────────────────
    reporters: [
      'default',              // pretty CLI
      'junit',                // GitLab / Jenkins / Azure pipelines
      'json',                 // quick machine-parseable
      ['html', { /*  no outputFile  -->  generates index.html  */ }]
    ],

    // tell each reporter where to write its artefact
    outputFile: {
      junit: './test-results/junit.xml',
      json : './test-results/results.json'
      // html path is already in its reporter options above
    },

    // ➜ coverage ────────────────
    coverage: {
      provider: 'istanbul',            // or 'v8'
      reportsDirectory: './coverage',  // <rootDir>/coverage by default
      reporter: ['text', 'lcov', 'html']
    },
    pool: 'threads',          // (default, but explicit is OK)
    fileParallelism: false,   // <--- This disables parallel test file execution for debugging
  },
});
