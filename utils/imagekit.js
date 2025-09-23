const ImageKit = require('imagekit');
const multer = require('multer');
const path = require('path');

// Configure ImageKit
console.log('🔧 ImageKit Config - Environment check:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  IMAGEKIT_PUBLIC_KEY exists:', !!process.env.IMAGEKIT_PUBLIC_KEY);
console.log('  IMAGEKIT_PRIVATE_KEY exists:', !!process.env.IMAGEKIT_PRIVATE_KEY);
console.log('  IMAGEKIT_URL_ENDPOINT exists:', !!process.env.IMAGEKIT_URL_ENDPOINT);

// Initialize ImageKit (only if credentials are available)
let imagekit = null;
if (process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT) {
  imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
  });
}

// Test ImageKit connection
const testImageKitConnection = async () => {
  if (!imagekit) {
    console.error('❌ ImageKit not initialized - missing credentials');
    return false;
  }
  
  try {
    // Test with a simple API call
    const result = await imagekit.listFiles({ limit: 1 });
    console.log('✅ ImageKit connection test successful');
    return true;
  } catch (error) {
    console.error('❌ ImageKit connection test failed:', error);
    return false;
  }
};

// Configure multer for memory storage (ImageKit uploads from buffer)
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
    fieldSize: 10 * 1024 * 1024, // 10MB for form fields
    files: 1, // Only one file at a time
    fields: 10, // Maximum number of non-file fields
    parts: 20 // Maximum number of parts (fields + files)
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Add error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  console.error('🔧 Multer error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        details: 'Image file must be less than 2MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        details: 'Only one image file is allowed'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected file field',
        details: 'Please use the correct field name for the image'
      });
    }
    if (error.code === 'LIMIT_FIELD_COUNT') {
      return res.status(400).json({
        error: 'Too many fields',
        details: 'Request has too many form fields'
      });
    }
    if (error.code === 'LIMIT_PART_COUNT') {
      return res.status(400).json({
        error: 'Too many parts',
        details: 'Request has too many parts'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      error: 'Invalid file type',
      details: 'Only image files (jpg, jpeg, png, gif, webp) are allowed'
    });
  }
  
  next(error);
};

// Helper function to upload image to ImageKit
const uploadImage = async (file, folder = 'virello-products') => {
  if (!imagekit) {
    throw new Error('ImageKit not initialized - missing credentials');
  }
  
  try {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = `image-${uniqueSuffix}`;
    
    const result = await imagekit.upload({
      file: file.buffer,
      fileName: fileName,
      folder: folder,
      useUniqueFileName: false,
      tags: ['virello', 'product']
    });
    
    return {
      url: result.url,
      fileId: result.fileId,
      name: result.name,
      size: result.size,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Error uploading image to ImageKit:', error);
    throw error;
  }
};

// Helper function to delete image from ImageKit
const deleteImage = async (fileId) => {
  if (!imagekit) {
    throw new Error('ImageKit not initialized - missing credentials');
  }
  
  try {
    const result = await imagekit.deleteFile(fileId);
    return result;
  } catch (error) {
    console.error('Error deleting image from ImageKit:', error);
    throw error;
  }
};

// Helper function to get optimized image URL
const getOptimizedImageUrl = (fileId, options = {}) => {
  if (!imagekit) {
    throw new Error('ImageKit not initialized - missing credentials');
  }
  
  const defaultOptions = {
    width: 400,
    height: 300,
    crop: 'maintain_ratio',
    quality: 80,
    format: 'auto'
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  return imagekit.url(finalOptions);
};

// Helper function to generate transformation URL
const generateTransformationUrl = (fileId, transformations = {}) => {
  if (!imagekit) {
    throw new Error('ImageKit not initialized - missing credentials');
  }
  
  return imagekit.url({
    src: fileId,
    ...transformations
  });
};

module.exports = {
  imagekit,
  storage,
  upload,
  deleteImage,
  uploadImage,
  getOptimizedImageUrl,
  generateTransformationUrl,
  handleMulterError,
  testImageKitConnection
};
