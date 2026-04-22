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
  
  // Create version object
  const versionData = {
    version: packageJson.version,
    buildTime: new Date().toISOString(),
    name: packageJson.name
  };
  
  // Write to dist/version.json
  const distPath = join(__dirname, '..', 'dist', 'version.json');
  writeFileSync(distPath, JSON.stringify(versionData, null, 2));
  
  console.log('✅ version.json generated successfully');
  console.log(`   Version: ${versionData.version}`);
  console.log(`   Build time: ${versionData.buildTime}`);
} catch (error) {
  console.error('❌ Failed to generate version.json:', error.message);
  process.exit(1);
}
