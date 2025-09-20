#!/usr/bin/env node

/**
 * Background Agent Setup Script
 * Ensures all packages are built and available before starting background agents
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const PACKAGES_DIR = 'packages';
const PAYMENTS_PACKAGE = 'payments';
const DIST_DIR = 'dist';

console.log('🚀 Setting up background agent environment...');

// Check if payments package exists
const paymentsPath = join(PACKAGES_DIR, PAYMENTS_PACKAGE);
if (!existsSync(paymentsPath)) {
  console.error('❌ Payments package not found at:', paymentsPath);
  process.exit(1);
}

// Check if payments package is built
const distPath = join(paymentsPath, DIST_DIR);
if (!existsSync(distPath)) {
  console.log('📦 Building payments package...');
  try {
    execSync('npm run build -w packages/payments', { stdio: 'inherit' });
    console.log('✅ Payments package built successfully');
  } catch (error) {
    console.error('❌ Failed to build payments package:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Payments package already built');
}

// Install dependencies if needed
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

console.log('🎉 Background agent environment ready!');
console.log('💡 You can now start background agents safely');
