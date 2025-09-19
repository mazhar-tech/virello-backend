#!/usr/bin/env node

/**
 * Keep-Alive Service for Render Backend
 * 
 * This script pings the backend health endpoint every 10 minutes
 * to prevent Render from going idle (which happens after 10 minutes of inactivity).
 * 
 * Usage:
 *   node keep-alive.js
 *   npm run keep-alive
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Backend URL - Update this with your Render backend URL
  BACKEND_URL: process.env.BACKEND_URL || 'https://virello-backend.onrender.com',
  
  // Ping interval in milliseconds (10 minutes = 600,000 ms)
  PING_INTERVAL: 9 * 60 * 1000, // 10 minutes
  
  // Health endpoint path
  HEALTH_ENDPOINT: '/health',
  
  // Log file path
  LOG_FILE: path.join(__dirname, 'keep-alive.log'),
  
  // Maximum retry attempts for failed requests
  MAX_RETRIES: 3,
  
  // Retry delay in milliseconds
  RETRY_DELAY: 5000, // 5 seconds
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class KeepAliveService {
  constructor() {
    this.isRunning = false;
    this.pingCount = 0;
    this.failedCount = 0;
    this.lastSuccessfulPing = null;
    this.intervalId = null;
    
    // Ensure log file exists
    this.ensureLogFile();
    
    // Handle graceful shutdown
    this.setupGracefulShutdown();
  }

  /**
   * Ensure log file exists and is writable
   */
  ensureLogFile() {
    try {
      if (!fs.existsSync(CONFIG.LOG_FILE)) {
        fs.writeFileSync(CONFIG.LOG_FILE, '');
      }
    } catch (error) {
      console.error(`${colors.red}Error creating log file: ${error.message}${colors.reset}`);
    }
  }

  /**
   * Log message to both console and file
   */
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    // Console output with colors
    const color = level === 'ERROR' ? colors.red : 
                  level === 'WARN' ? colors.yellow : 
                  level === 'SUCCESS' ? colors.green : colors.cyan;
    
    console.log(`${color}${logMessage}${colors.reset}`);
    
    // File output
    try {
      fs.appendFileSync(CONFIG.LOG_FILE, logMessage + '\n');
    } catch (error) {
      console.error(`${colors.red}Error writing to log file: ${error.message}${colors.reset}`);
    }
  }

  /**
   * Ping the backend health endpoint
   */
  async pingBackend(retryCount = 0) {
    try {
      const url = `${CONFIG.BACKEND_URL}${CONFIG.HEALTH_ENDPOINT}`;
      
      this.log(`Pinging backend: ${url} (attempt ${retryCount + 1})`);
      
      const response = await axios.get(url, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'Keep-Alive-Service/1.0',
        },
      });

      if (response.status === 200) {
        this.pingCount++;
        this.lastSuccessfulPing = new Date();
        this.log(`✅ Ping successful! Status: ${response.status}, Response: ${JSON.stringify(response.data)}`, 'SUCCESS');
        return true;
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      this.failedCount++;
      
      if (retryCount < CONFIG.MAX_RETRIES) {
        this.log(`❌ Ping failed (attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES + 1}): ${error.message}`, 'WARN');
        await this.sleep(CONFIG.RETRY_DELAY);
        return this.pingBackend(retryCount + 1);
      } else {
        this.log(`❌ Ping failed after ${CONFIG.MAX_RETRIES + 1} attempts: ${error.message}`, 'ERROR');
        return false;
      }
    }
  }

  /**
   * Sleep utility function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start the keep-alive service
   */
  async start() {
    if (this.isRunning) {
      this.log('Keep-alive service is already running', 'WARN');
      return;
    }

    this.log('🚀 Starting Keep-Alive Service for Render Backend');
    this.log(`📡 Backend URL: ${CONFIG.BACKEND_URL}`);
    this.log(`⏰ Ping interval: ${CONFIG.PING_INTERVAL / 1000} seconds`);
    this.log(`📝 Log file: ${CONFIG.LOG_FILE}`);

    // Perform initial ping
    this.log('🔍 Performing initial ping...');
    await this.pingBackend();

    // Set up interval for regular pings
    this.isRunning = true;
    this.intervalId = setInterval(async () => {
      await this.pingBackend();
    }, CONFIG.PING_INTERVAL);

    this.log('✅ Keep-alive service started successfully!', 'SUCCESS');
    this.log('Press Ctrl+C to stop the service');
  }

  /**
   * Stop the keep-alive service
   */
  stop() {
    if (!this.isRunning) {
      this.log('Keep-alive service is not running', 'WARN');
      return;
    }

    this.log('🛑 Stopping Keep-Alive Service...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    
    // Log final statistics
    this.log('📊 Final Statistics:');
    this.log(`   Total successful pings: ${this.pingCount}`);
    this.log(`   Total failed pings: ${this.failedCount}`);
    this.log(`   Last successful ping: ${this.lastSuccessfulPing || 'Never'}`);
    
    this.log('✅ Keep-alive service stopped', 'SUCCESS');
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const shutdown = (signal) => {
      this.log(`\n${signal} received, shutting down gracefully...`);
      this.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  /**
   * Display current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      pingCount: this.pingCount,
      failedCount: this.failedCount,
      lastSuccessfulPing: this.lastSuccessfulPing,
      backendUrl: CONFIG.BACKEND_URL,
      pingInterval: CONFIG.PING_INTERVAL,
    };
  }
}

// Main execution
async function main() {
  const keepAlive = new KeepAliveService();
  
  // Check if BACKEND_URL is properly configured
  if (!CONFIG.BACKEND_URL || CONFIG.BACKEND_URL === 'https://your-render-backend-url.onrender.com') {
    console.log(`${colors.red}❌ Error: Please configure your Render backend URL!${colors.reset}`);
    console.log(`${colors.yellow}💡 Set the BACKEND_URL environment variable or update the CONFIG.BACKEND_URL in this file${colors.reset}`);
    console.log(`${colors.cyan}Example: BACKEND_URL=https://your-app-name.onrender.com node keep-alive.js${colors.reset}`);
    process.exit(1);
  }

  try {
    await keepAlive.start();
  } catch (error) {
    console.error(`${colors.red}❌ Failed to start keep-alive service: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = KeepAliveService;
