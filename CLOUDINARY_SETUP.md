# Cloudinary Setup Guide

## Overview
Cloudinary provides cloud-based image storage, optimization, and delivery. This will replace local file storage and provide better performance.

## Required Environment Variables

Add these variables to your Render project:

### Option 1: Using CLOUDINARY_URL (Recommended)
```bash
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

### Option 2: Using Individual Variables
```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## How to Get Cloudinary Credentials

1. **Sign up at Cloudinary.com**
2. **Go to Dashboard**
3. **Copy credentials from the dashboard**

## Benefits of Cloudinary

✅ **Automatic Image Optimization**
- WebP format conversion
- Responsive image sizing
- Quality optimization

✅ **Global CDN**
- Fast image delivery worldwide
- Reduced server load

✅ **Image Transformations**
- Resize, crop, rotate
- Filters and effects
- Format conversion

✅ **Reliable Storage**
- No file system dependencies
- Automatic backups
- High availability

## Current Configuration

The system is configured to:
- Use Cloudinary in production (`NODE_ENV=production`)
- Fall back to local storage in development
- Store images in `virello-products` folder
- Apply automatic optimizations (800x600, auto quality)

## Testing

After adding environment variables:
1. Upload a new product image
2. Check that the image URL starts with `https://res.cloudinary.com/`
3. Verify images load quickly and are optimized

## Migration

Existing local images will continue to work. New uploads will use Cloudinary.
