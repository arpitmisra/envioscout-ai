#!/usr/bin/env node

/**
 * Envio HyperSync Setup Helper
 * Checks your configuration and provides guidance
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

console.log('\n🔍 Envio HyperSync Configuration Check\n');
console.log('━'.repeat(50));

let hasIssues = false;

// Check for API token
if (process.env.HYPERSYNC_BEARER_TOKEN && 
    process.env.HYPERSYNC_BEARER_TOKEN !== 'your_hypersync_bearer_token_here') {
  console.log('✅ HYPERSYNC_BEARER_TOKEN found');
} else {
  console.log('❌ HYPERSYNC_BEARER_TOKEN missing or not configured');
  console.log('   → Get your token at: https://envio.dev/app/api-tokens');
  console.log('   → Add to backend/.env: HYPERSYNC_BEARER_TOKEN=your_token');
  hasIssues = true;
}

// Check .env file exists
const envPath = join(__dirname, '../.env');
if (existsSync(envPath)) {
  console.log('✅ .env file exists');
} else {
  console.log('❌ .env file not found');
  console.log('   → Copy .env.example to .env');
  console.log('   → cp backend/.env.example backend/.env');
  hasIssues = true;
}

// Check package.json for correct dependency
const packagePath = join(__dirname, '../package.json');
if (existsSync(packagePath)) {
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  if (pkg.dependencies['@envio-dev/hypersync-client']) {
    console.log(`✅ @envio-dev/hypersync-client v${pkg.dependencies['@envio-dev/hypersync-client']}`);
  } else {
    console.log('❌ @envio-dev/hypersync-client not installed');
    hasIssues = true;
  }
}

console.log('━'.repeat(50));

if (hasIssues) {
  console.log('\n⚠️  Configuration issues detected!');
  console.log('\n📝 Quick Setup Steps:');
  console.log('   1. Visit https://envio.dev/app/api-tokens');
  console.log('   2. Sign in and create a new API token');
  console.log('   3. Copy backend/.env.example to backend/.env');
  console.log('   4. Add your token to HYPERSYNC_BEARER_TOKEN');
  console.log('   5. Restart your server: npm run dev\n');
} else {
  console.log('\n✅ Configuration looks good!');
  console.log('   You should not see timeout errors anymore.\n');
  console.log('📊 Test the dashboard at: http://localhost:3001/api/dashboard/stats/eth\n');
}
