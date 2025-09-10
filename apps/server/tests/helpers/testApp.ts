import express, { Application } from 'express';
import cors from 'cors';
import { createApp } from '../../src/app';

/**
 * Create test Express app with in-memory configuration
 */
export function createTestApp(): Application {
  // Use the main app factory but with test-specific middleware
  const app = createApp();
  
  // Ensure CORS is permissive for tests
  app.use(cors({
    origin: true,
    credentials: true
  }));
  
  return app;
}

/**
 * Singleton test app instance
 */
let testAppInstance: Application | null = null;

export function getTestApp(): Application {
  if (!testAppInstance) {
    testAppInstance = createTestApp();
  }
  return testAppInstance;
}

/**
 * Reset the test app (useful for isolation)
 */
export function resetTestApp(): void {
  testAppInstance = null;
}
