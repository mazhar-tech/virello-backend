const https = require('https');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Create a simple test image (1x1 pixel PNG)
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const testImageBuffer = Buffer.from(testImageBase64, 'base64');

// Write test image to file
const testImagePath = path.join(__dirname, 'test-image.png');
fs.writeFileSync(testImagePath, testImageBuffer);

console.log('🔧 Created test image:', testImagePath);
console.log('🔧 Image size:', testImageBuffer.length, 'bytes');

// Test upload to production
const form = new FormData();
form.append('image', fs.createReadStream(testImagePath), {
  filename: 'test-image.png',
  contentType: 'image/png'
});

console.log('🔧 Testing upload to production...');

const uploadUrl = 'https://virello-backend.onrender.com/api/products/test-upload';

const options = {
  method: 'POST',
  headers: {
    ...form.getHeaders()
  }
};

const req = https.request(uploadUrl, options, (res) => {
  console.log('🔧 Response status:', res.statusCode);
  console.log('🔧 Response headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('✅ Upload response:', data);
    try {
      const jsonData = JSON.parse(data);
      if (jsonData.imageUrl && jsonData.imageUrl.includes('cloudinary.com')) {
        console.log('🎉 SUCCESS: Image uploaded to Cloudinary!');
        console.log('   URL:', jsonData.imageUrl);
      } else {
        console.log('⚠️  Image uploaded to local storage instead');
        console.log('   URL:', jsonData.imageUrl);
      }
    } catch (e) {
      console.log('📄 Raw response:', data);
    }
    
    // Clean up test file
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log('🧹 Cleaned up test file');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Upload failed:', error.message);
  console.error('❌ Error details:', error);
  
  // Clean up test file
  if (fs.existsSync(testImagePath)) {
    fs.unlinkSync(testImagePath);
    console.log('🧹 Cleaned up test file');
  }
});

form.pipe(req);
