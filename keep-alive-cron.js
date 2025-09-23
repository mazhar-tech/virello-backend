#!/usr/bin/env node

/**
 * Simple Keep-Alive Script for Render Backend
 * This script makes a single ping to the health endpoint
 * Designed to be run by cron every 4 minutes
 * 
 * Usage:
 *   node keep-alive-cron.js
 *   # Add to crontab: */4 * * * * /path/to/node /path/to/keep-alive-cron.js
 */

const axios = require('axios');

// Configuration
const CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'https://virello-backend.onrender.com',
  HEALTH_ENDPOINT: '/health',
  TIMEOUT: 30000, // 30 seconds
};

async function pingBackend() {
  try {
    const url = `${CONFIG.BACKEND_URL}${CONFIG.HEALTH_ENDPOINT}`;
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] Pinging: ${url}`);
    
    const response = await axios.get(url, {
      timeout: CONFIG.TIMEOUT,
      headers: {
        'User-Agent': 'Keep-Alive-Cron/1.0',
      }
    });

    if (response.status === 200) {
      console.log(`[${timestamp}] ✅ Success: ${response.status} - ${JSON.stringify(response.data)}`);
      return true;
    } else {
      console.log(`[${timestamp}] ⚠️  Unexpected status: ${response.status}`);
      return false;
    }
  } catch (error) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ❌ Error: ${error.message}`);
    
    if (error.response) {
      console.log(`[${timestamp}] 📊 Status: ${error.response.status}`);
    } else if (error.request) {
      console.log(`[${timestamp}] 🚨 No response - server may be down or network issue`);
    }
    
    return false;
  }
}

// Main execution
async function main() {
  const success = await pingBackend();
  process.exit(success ? 0 : 1);
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { pingBackend };
