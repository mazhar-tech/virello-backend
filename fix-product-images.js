const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Fix existing product image URLs
const fixProductImages = async () => {
  try {
    console.log('🔧 Starting image URL fix...');
    
    // Find products with localhost image URLs
    const productsWithLocalhostImages = await Product.find({
      $or: [
        { imageUrl: { $regex: /localhost/ } },
        { 'images.main': { $regex: /localhost/ } },
        { 'images.gallery': { $regex: /localhost/ } }
      ]
    });

    console.log(`📊 Found ${productsWithLocalhostImages.length} products with localhost image URLs`);

    for (const product of productsWithLocalhostImages) {
      console.log(`🔧 Fixing product: ${product.name} (${product._id})`);
      
      // Clear localhost image URLs
      if (product.imageUrl && product.imageUrl.includes('localhost')) {
        console.log(`  - Clearing imageUrl: ${product.imageUrl}`);
        product.imageUrl = null;
      }
      
      if (product.images && product.images.main && product.images.main.includes('localhost')) {
        console.log(`  - Clearing images.main: ${product.images.main}`);
        product.images.main = null;
      }
      
      if (product.images && product.images.gallery) {
        product.images.gallery = product.images.gallery.filter(url => !url.includes('localhost'));
        console.log(`  - Filtered gallery images`);
      }
      
      // Save the updated product
      await product.save();
      console.log(`  ✅ Updated product: ${product.name}`);
    }

    console.log('🎉 Image URL fix completed!');
    
    // Show summary
    const remainingProducts = await Product.find({
      $or: [
        { imageUrl: { $regex: /localhost/ } },
        { 'images.main': { $regex: /localhost/ } },
        { 'images.gallery': { $regex: /localhost/ } }
      ]
    });
    
    console.log(`📊 Remaining products with localhost URLs: ${remainingProducts.length}`);
    
  } catch (error) {
    console.error('❌ Error fixing product images:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the fix
const runFix = async () => {
  await connectDB();
  await fixProductImages();
};

runFix();
