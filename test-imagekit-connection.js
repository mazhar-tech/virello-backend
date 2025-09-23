/**
 * Test ImageKit Connection
 * This script tests the ImageKit integration
 */

require('dotenv').config();
const imagekitUtils = require('./utils/imagekit');

async function testImageKitConnection() {
  console.log('🧪 Testing ImageKit Connection...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('  IMAGEKIT_PUBLIC_KEY:', process.env.IMAGEKIT_PUBLIC_KEY ? '✅ Set' : '❌ Missing');
  console.log('  IMAGEKIT_PRIVATE_KEY:', process.env.IMAGEKIT_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
  console.log('  IMAGEKIT_URL_ENDPOINT:', process.env.IMAGEKIT_URL_ENDPOINT ? '✅ Set' : '❌ Missing');
  console.log('');
  
  if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) {
    console.log('❌ Missing required environment variables. Please set:');
    console.log('   IMAGEKIT_PUBLIC_KEY');
    console.log('   IMAGEKIT_PRIVATE_KEY');
    console.log('   IMAGEKIT_URL_ENDPOINT');
    return;
  }
  
  try {
    // Test connection
    console.log('🔗 Testing ImageKit connection...');
    const isConnected = await imagekitUtils.testImageKitConnection();
    
    if (isConnected) {
      console.log('✅ ImageKit connection successful!');
    } else {
      console.log('❌ ImageKit connection failed!');
      return;
    }
    
    // Test URL generation
    console.log('\n🔗 Testing URL generation...');
    const testFileId = 'https://ik.imagekit.io/ikt0s0io9a/test-file-id';
    const testUrl = imagekitUtils.generateTransformationUrl(testFileId, {
      width: 400,
      height: 300,
      crop: 'maintain_ratio',
      quality: 80
    });
    console.log('✅ Generated URL:', testUrl);
    
    console.log('\n🎉 All tests passed! ImageKit is ready to use.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testImageKitConnection();
