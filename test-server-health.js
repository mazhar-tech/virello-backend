/**
 * Test Server Health
 * This script tests if the server can start without errors
 */

require('dotenv').config();

console.log('🧪 Testing Server Health...\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  PORT:', process.env.PORT);
console.log('  MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
console.log('  IMAGEKIT_PUBLIC_KEY:', process.env.IMAGEKIT_PUBLIC_KEY ? '✅ Set' : '❌ Missing');
console.log('  IMAGEKIT_PRIVATE_KEY:', process.env.IMAGEKIT_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
console.log('  IMAGEKIT_URL_ENDPOINT:', process.env.IMAGEKIT_URL_ENDPOINT ? '✅ Set' : '❌ Missing');
console.log('');

// Test ImageKit utils
try {
  console.log('🔗 Testing ImageKit utils...');
  const imagekitUtils = require('./utils/imagekit');
  console.log('✅ ImageKit utils loaded successfully');
} catch (error) {
  console.error('❌ ImageKit utils error:', error.message);
}

// Test server startup
try {
  console.log('🔗 Testing server startup...');
  const app = require('./server');
  console.log('✅ Server can be loaded successfully');
} catch (error) {
  console.error('❌ Server startup error:', error.message);
  console.error('Full error:', error);
}

console.log('\n🎉 Health check complete!');
