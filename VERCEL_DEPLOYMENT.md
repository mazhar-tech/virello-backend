# Vercel Deployment Guide for Virello Food Backend

## Prerequisites
1. Vercel account (free tier available)
2. MongoDB Atlas account (for cloud database)
3. GitHub repository with your backend code

## Step 1: Prepare Your Backend

### Option A: Use the Vercel-compatible version
1. Use the `api/index.js` file I created (serverless-optimized)
2. Keep your existing `vercel.json` configuration

### Option B: Modify your existing server.js
If you prefer to keep your current structure, make these changes:

1. **Remove the server.listen() call** - Vercel handles this
2. **Export the app** instead of starting the server:
   ```javascript
   module.exports = app;
   ```

## Step 2: Environment Variables Setup

In your Vercel dashboard, add these environment variables:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/virello-food
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.vercel.app
CORS_ORIGINS=https://your-frontend-domain.vercel.app,https://your-custom-domain.com
JWT_SECRET=your-jwt-secret-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Step 3: Deploy to Vercel

### Method 1: Vercel CLI
```bash
cd backend
npm install -g vercel
vercel login
vercel --prod
```

### Method 2: GitHub Integration
1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Set the root directory to `backend`
4. Deploy

## Step 4: Configure Custom Domain (Optional)
1. Go to your Vercel project settings
2. Add your custom domain
3. Update CORS_ORIGINS environment variable

## Important Notes

### File Uploads
- Static file serving won't work the same way
- Consider using cloud storage (AWS S3, Cloudinary) for file uploads
- Or use Vercel's `/tmp` directory for temporary files

### Database Connection
- The serverless version handles MongoDB connections efficiently
- Connections are cached between function invocations
- Consider using MongoDB Atlas for better performance

### Performance Considerations
- Cold starts may cause initial delays
- Consider upgrading to Vercel Pro for better performance
- Optimize your database queries for serverless

## Testing Your Deployment
1. Check health endpoint: `https://your-backend.vercel.app/health`
2. Test API endpoints: `https://your-backend.vercel.app/api/products`
3. Verify CORS settings with your frontend

## Troubleshooting
- Check Vercel function logs for errors
- Ensure all environment variables are set
- Verify MongoDB Atlas connection string
- Test CORS configuration with your frontend domain
