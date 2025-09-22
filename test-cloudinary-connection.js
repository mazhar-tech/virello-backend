#!/usr/bin/env node

/**
 * Test Cloudinary Connection
 * This script tests the Cloudinary configuration and connection
 */

require('dotenv').config();
const cloudinary = require('cloudinary');

console.log('🔧 Testing Cloudinary Connection...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  CLOUDINARY_URL exists:', !!process.env.CLOUDINARY_URL);
console.log('  CLOUDINARY_CLOUD_NAME exists:', !!process.env.CLOUDINARY_CLOUD_NAME);
console.log('  CLOUDINARY_API_KEY exists:', !!process.env.CLOUDINARY_API_KEY);
console.log('  CLOUDINARY_API_SECRET exists:', !!process.env.CLOUDINARY_API_SECRET);
console.log('');

// Configure Cloudinary
if (process.env.CLOUDINARY_URL) {
  console.log('🔧 Using CLOUDINARY_URL format');
  cloudinary.config();
} else {
  console.log('🔧 Using individual environment variables');
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Test connection
console.log('🔧 Testing Cloudinary API connection...');
cloudinary.api.ping()
  .then(result => {
    console.log('✅ Cloudinary connection test successful!');
    console.log('  Status:', result.status);
    console.log('  Service:', result.service);
    console.log('');
    
    // Test upload with a simple image
    console.log('🔧 Testing image upload...');
    return cloudinary.uploader.upload('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', {
      folder: 'virello-test',
      public_id: 'test-connection-' + Date.now(),
      overwrite: true
    });
  })
  .then(uploadResult => {
    console.log('✅ Test image upload successful!');
    console.log('  Public ID:', uploadResult.public_id);
    console.log('  URL:', uploadResult.secure_url);
    console.log('  Format:', uploadResult.format);
    console.log('  Size:', uploadResult.bytes, 'bytes');
    console.log('');
    
    // Clean up test image
    console.log('🔧 Cleaning up test image...');
    return cloudinary.uploader.destroy(uploadResult.public_id);
  })
  .then(deleteResult => {
    console.log('✅ Test image cleanup successful!');
    console.log('  Result:', deleteResult.result);
    console.log('');
    console.log('🎉 All Cloudinary tests passed! Your configuration is working correctly.');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Cloudinary test failed:', error.message);
    console.error('  Error details:', error);
    console.log('');
    console.log('🔧 Troubleshooting tips:');
    console.log('  1. Check your Cloudinary credentials');
    console.log('  2. Verify your internet connection');
    console.log('  3. Check if your Cloudinary account is active');
    console.log('  4. Ensure environment variables are set correctly');
    process.exit(1);
  });
