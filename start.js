#!/usr/bin/env node

/**
 * Simple startup script for Virello Food Backend
 * This script helps prevent lock issues by properly managing the process
 */

const fs = require('fs');
const path = require('path');

// Clean up any existing lock files
function cleanupLockFiles() {
  const lockFiles = ['.pid', '.lock', 'server.pid', 'app.lock'];
  
  lockFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`✅ Removed lock file: ${file}`);
      } catch (error) {
        console.log(`⚠️  Could not remove ${file}: ${error.message}`);
      }
    }
  });
}

// Check if port is available
function checkPort(port) {
  const net = require('net');
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

// Main startup function
async function startApp() {
  console.log('🚀 Starting Virello Food Backend...');
  
  // Clean up lock files
  cleanupLockFiles();
  
  // Check if we can use the default port
  const port = process.env.PORT || 5000;
  const portAvailable = await checkPort(port);
  
  if (!portAvailable) {
    console.log(`⚠️  Port ${port} is not available, trying alternative ports...`);
    
    // Try alternative ports
    const alternativePorts = [3000, 3001, 8080, 8000, 4000];
    let availablePort = null;
    
    for (const altPort of alternativePorts) {
      if (await checkPort(altPort)) {
        availablePort = altPort;
        break;
      }
    }
    
    if (availablePort) {
      process.env.PORT = availablePort;
      console.log(`✅ Using port ${availablePort}`);
    } else {
      console.log('❌ No available ports found');
      process.exit(1);
    }
  }
  
  // Start the main application
  try {
    require('./server.js');
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down...');
  cleanupLockFiles();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down...');
  cleanupLockFiles();
  process.exit(0);
});

// Start the application
startApp().catch(error => {
  console.error('❌ Startup failed:', error);
  process.exit(1);
});
