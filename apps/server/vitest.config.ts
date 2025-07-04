// apps/server/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // So you can use describe/it/expect without imports
    environment: 'node',
    setupFiles: ['./tests/setup.ts'], // Same as your jest setup
    include: ['tests/**/*.spec.ts'],
    coverage: {
      provider: 'istanbul', // or 'v8'
    },
  },
});
