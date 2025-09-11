#!/usr/bin/env node

/**
 * Dependency Cleanup Script for Virello Food Backend
 * This script helps resolve dependency conflicts and lock issues
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Starting dependency cleanup...');

// Files to remove for clean reinstall
const filesToRemove = [
  'package-lock.json',
  'node_modules',
  '.npm',
  '.yarn',
  'yarn-error.log',
  'npm-debug.log'
];

// Lock files to clean
const lockFiles = [
  '.pid',
  '.lock',
  'server.pid',
  'app.lock'
];

function removeFileOrDir(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
        console.log(`✅ Removed directory: ${filePath}`);
      } else {
        fs.unlinkSync(filePath);
        console.log(`✅ Removed file: ${filePath}`);
      }
    }
  } catch (error) {
    console.log(`⚠️  Could not remove ${filePath}: ${error.message}`);
  }
}

// Clean up files
console.log('📁 Cleaning up dependency files...');
filesToRemove.forEach(removeFileOrDir);

console.log('🔒 Cleaning up lock files...');
lockFiles.forEach(removeFileOrDir);

// Check package.json integrity
console.log('📦 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Validate required fields
  const requiredFields = ['name', 'version', 'main', 'scripts', 'dependencies'];
  const missingFields = requiredFields.filter(field => !packageJson[field]);
  
  if (missingFields.length > 0) {
    console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
  } else {
    console.log('✅ package.json is valid');
  }
  
  // Check main entry point
  if (packageJson.main && fs.existsSync(packageJson.main)) {
    console.log(`✅ Main entry point exists: ${packageJson.main}`);
  } else {
    console.log(`⚠️  Main entry point not found: ${packageJson.main}`);
  }
  
} catch (error) {
  console.log(`❌ Error reading package.json: ${error.message}`);
}

console.log('🎉 Cleanup completed!');
console.log('📝 Next steps:');
console.log('   1. Go to cPanel Node.js Apps');
console.log('   2. Click "NPM Install" to reinstall dependencies');
console.log('   3. Try starting your application');
