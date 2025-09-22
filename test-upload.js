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

// Test upload
const form = new FormData();
form.append('image', fs.createReadStream(testImagePath), {
  filename: 'test-image.png',
  contentType: 'image/png'
});

console.log('🔧 Testing upload to Cloudinary...');

const fetch = require('node-fetch');
const uploadUrl = 'http://localhost:5000/api/products/upload-image';

fetch(uploadUrl, {
  method: 'POST',
  body: form,
  headers: {
    ...form.getHeaders(),
    'Authorization': 'Bearer your-test-token' // You'll need a valid token
  }
})
.then(response => response.json())
.then(data => {
  console.log('✅ Upload response:', data);
  if (data.imageUrl && data.imageUrl.includes('cloudinary.com')) {
    console.log('🎉 SUCCESS: Image uploaded to Cloudinary!');
    console.log('   URL:', data.imageUrl);
  } else {
    console.log('⚠️  Image uploaded to local storage instead');
    console.log('   URL:', data.imageUrl);
  }
})
.catch(error => {
  console.error('❌ Upload failed:', error.message);
})
.finally(() => {
  // Clean up test file
  if (fs.existsSync(testImagePath)) {
    fs.unlinkSync(testImagePath);
    console.log('🧹 Cleaned up test file');
  }
});
