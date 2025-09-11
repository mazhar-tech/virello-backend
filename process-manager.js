#!/usr/bin/env node

/**
 * Process Manager for Virello Food Backend
 * Helps manage Node.js processes and prevents lock issues
 */

const fs = require('fs');
const path = require('path');

class ProcessManager {
  constructor() {
    this.pidFile = path.join(__dirname, '.pid');
    this.lockFile = path.join(__dirname, '.lock');
  }

  // Create PID file when starting
  createPidFile() {
    try {
      fs.writeFileSync(this.pidFile, process.pid.toString());
      console.log(`✅ PID file created: ${process.pid}`);
    } catch (error) {
      console.error('❌ Failed to create PID file:', error.message);
    }
  }

  // Remove PID file when stopping
  removePidFile() {
    try {
      if (fs.existsSync(this.pidFile)) {
        fs.unlinkSync(this.pidFile);
        console.log('✅ PID file removed');
      }
    } catch (error) {
      console.error('❌ Failed to remove PID file:', error.message);
    }
  }

  // Check if another instance is running
  isAlreadyRunning() {
    try {
      if (fs.existsSync(this.pidFile)) {
        const pid = parseInt(fs.readFileSync(this.pidFile, 'utf8'));
        
        // Check if process is actually running
        try {
          process.kill(pid, 0); // Signal 0 just checks if process exists
          console.log(`⚠️  Process ${pid} is already running`);
          return true;
        } catch (error) {
          // Process doesn't exist, remove stale PID file
          fs.unlinkSync(this.pidFile);
          console.log('🧹 Removed stale PID file');
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('❌ Error checking PID file:', error.message);
      return false;
    }
  }

  // Cleanup on exit
  cleanup() {
    this.removePidFile();
    if (fs.existsSync(this.lockFile)) {
      fs.unlinkSync(this.lockFile);
    }
  }

  // Setup graceful shutdown handlers
  setupGracefulShutdown() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
        this.cleanup();
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      this.cleanup();
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      this.cleanup();
      process.exit(1);
    });
  }
}

module.exports = ProcessManager;
