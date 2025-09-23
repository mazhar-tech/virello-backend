/**
 * Auto Keep-Alive Service for Render Backend
 * This service runs internally within the backend to prevent Render from sleeping
 * It makes internal requests to keep the server active
 */

const http = require('http');
const https = require('https');

class AutoKeepAlive {
  constructor(port = 5000, isHttps = false) {
    this.port = port;
    this.isHttps = isHttps;
    this.isRunning = false;
    this.intervalId = null;
    this.pingCount = 0;
    this.failedCount = 0;
    this.lastSuccessfulPing = null;
    
    // Configuration
    this.config = {
      PING_INTERVAL: 4 * 60 * 1000, // 4 minutes (less than Render's 5-minute sleep)
      HEALTH_ENDPOINT: '/health',
      TIMEOUT: 10000, // 10 seconds
      MAX_RETRIES: 3,
      RETRY_DELAY: 5000, // 5 seconds
    };
    
    console.log('🔧 Auto Keep-Alive Service initialized');
    console.log(`📡 Port: ${this.port}`);
    console.log(`🔒 HTTPS: ${this.isHttps}`);
    console.log(`⏰ Ping interval: ${this.config.PING_INTERVAL / 1000} seconds`);
  }

  /**
   * Make an internal HTTP request to the health endpoint
   */
  async pingSelf(retryCount = 0) {
    return new Promise((resolve) => {
      const options = {
        hostname: 'localhost',
        port: this.port,
        path: this.config.HEALTH_ENDPOINT,
        method: 'GET',
        timeout: this.config.TIMEOUT,
        headers: {
          'User-Agent': 'Auto-Keep-Alive/1.0',
          'Connection': 'close'
        }
      };

      const client = this.isHttps ? https : http;
      const timestamp = new Date().toISOString();
      
      console.log(`[${timestamp}] 🔍 Auto pinging self (attempt ${retryCount + 1})`);

      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            this.pingCount++;
            this.lastSuccessfulPing = new Date();
            console.log(`[${timestamp}] ✅ Auto ping successful! Status: ${res.statusCode}`);
            resolve(true);
          } else {
            console.log(`[${timestamp}] ⚠️  Auto ping returned status: ${res.statusCode}`);
            resolve(false);
          }
        });
      });

      req.on('error', (error) => {
        this.failedCount++;
        console.log(`[${timestamp}] ❌ Auto ping error: ${error.message}`);
        
        if (retryCount < this.config.MAX_RETRIES) {
          console.log(`[${timestamp}] 🔄 Retrying in ${this.config.RETRY_DELAY / 1000} seconds...`);
          setTimeout(() => {
            this.pingSelf(retryCount + 1).then(resolve);
          }, this.config.RETRY_DELAY);
        } else {
          console.log(`[${timestamp}] ❌ Auto ping failed after ${this.config.MAX_RETRIES + 1} attempts`);
          resolve(false);
        }
      });

      req.on('timeout', () => {
        req.destroy();
        console.log(`[${timestamp}] ⏰ Auto ping timeout after ${this.config.TIMEOUT / 1000} seconds`);
        resolve(false);
      });

      req.end();
    });
  }

  /**
   * Start the auto keep-alive service
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️  Auto keep-alive service is already running');
      return;
    }

    console.log('🚀 Starting Auto Keep-Alive Service...');
    
    // Perform initial ping
    console.log('🔍 Performing initial auto ping...');
    await this.pingSelf();

    // Set up interval for regular pings
    this.isRunning = true;
    this.intervalId = setInterval(async () => {
      await this.pingSelf();
    }, this.config.PING_INTERVAL);

    console.log('✅ Auto keep-alive service started successfully!');
    console.log(`📊 Will ping every ${this.config.PING_INTERVAL / 1000} seconds to prevent Render sleep`);
  }

  /**
   * Stop the auto keep-alive service
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Auto keep-alive service is not running');
      return;
    }

    console.log('🛑 Stopping Auto Keep-Alive Service...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    
    // Log final statistics
    console.log('📊 Auto Keep-Alive Final Statistics:');
    console.log(`   Total successful pings: ${this.pingCount}`);
    console.log(`   Total failed pings: ${this.failedCount}`);
    console.log(`   Last successful ping: ${this.lastSuccessfulPing || 'Never'}`);
    
    console.log('✅ Auto keep-alive service stopped');
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      pingCount: this.pingCount,
      failedCount: this.failedCount,
      lastSuccessfulPing: this.lastSuccessfulPing,
      port: this.port,
      isHttps: this.isHttps,
      pingInterval: this.config.PING_INTERVAL,
    };
  }
}

module.exports = AutoKeepAlive;
