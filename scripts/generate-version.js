#!/usr/bin/env node

/**
 * Generate version.json file for runtime version checking
 * This script should run after build to create a version file in dist/
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Read package.json
  const packageJsonPath = join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  
  // Create buildId
  const buildId = process.env.VERCEL_GIT_COMMIT_SHA || `build-${Date.now()}`;
  
  // Create version object
  const versionData = {
    version: packageJson.version,
    buildId,
    buildTime: new Date().toISOString(),
    name: packageJson.name
  };
  
  // Write to public/version.json
  const publicPath = join(__dirname, '..', 'public', 'version.json');
  writeFileSync(publicPath, JSON.stringify(versionData, null, 2));
  
  console.log('✅ version.json generated successfully in public/');
  console.log(`   Version: ${versionData.version}`);
  console.log(`   Build ID: ${versionData.buildId}`);
  console.log(`   Build time: ${versionData.buildTime}`);
} catch (error) {
  console.error('❌ Failed to generate version.json:', error.message);
  process.exit(1);
}
