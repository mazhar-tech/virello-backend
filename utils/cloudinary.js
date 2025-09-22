const cloudinary = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
// Support both individual env vars and CLOUDINARY_URL format
console.log('🔧 Cloudinary Config - Environment check:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  CLOUDINARY_URL exists:', !!process.env.CLOUDINARY_URL);
console.log('  CLOUDINARY_CLOUD_NAME exists:', !!process.env.CLOUDINARY_CLOUD_NAME);
console.log('  CLOUDINARY_API_KEY exists:', !!process.env.CLOUDINARY_API_KEY);
console.log('  CLOUDINARY_API_SECRET exists:', !!process.env.CLOUDINARY_API_SECRET);

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

// Test Cloudinary connection
cloudinary.api.ping()
  .then(result => {
    console.log('✅ Cloudinary connection test successful:', result);
  })
  .catch(error => {
    console.error('❌ Cloudinary connection test failed:', error);
  });

// Configure multer for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'virello-products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 800, height: 600, crop: 'limit' },
      { quality: 'auto' }
    ],
    public_id: (req, file) => {
      // Generate unique filename with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `image-${uniqueSuffix}`;
    }
  }
});

// Set Cloudinary timeout
cloudinary.config({
  timeout: 60000, // 60 seconds timeout
  secure: true
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
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
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        details: 'Image file must be less than 5MB'
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
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      error: 'Invalid file type',
      details: 'Only image files (jpg, jpeg, png, gif, webp) are allowed'
    });
  }
  
  next(error);
};

// Helper function to delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

// Helper function to get optimized image URL
const getOptimizedImageUrl = (publicId, options = {}) => {
  const defaultOptions = {
    width: 400,
    height: 300,
    crop: 'fill',
    quality: 'auto',
    format: 'auto'
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  return cloudinary.url(publicId, finalOptions);
};

module.exports = {
  cloudinary,
  storage,
  upload,
  deleteImage,
  getOptimizedImageUrl,
  handleMulterError
};
