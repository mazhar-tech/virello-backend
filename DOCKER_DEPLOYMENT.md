# Docker Deployment Guide for Virello Food Backend

## Files Created

### 1. Dockerfile
- **Location**: `virello-backend/Dockerfile`
- **Purpose**: Multi-stage Docker build for production deployment
- **Features**:
  - Node.js 18 Alpine base image
  - Multi-stage build for optimization
  - Non-root user for security
  - Health check endpoint
  - Production dependencies only

### 2. .dockerignore
- **Location**: `virello-backend/.dockerignore`
- **Purpose**: Exclude unnecessary files from Docker build context
- **Excludes**: node_modules, logs, test files, IDE files, etc.

### 3. docker-compose.yml
- **Location**: `virello-backend/docker-compose.yml`
- **Purpose**: Local development and testing
- **Features**: Environment variables, volume mounts, health checks

## Deployment Steps

### For Container Platforms (Azure Container Apps, AWS ECS, etc.)

1. **Place Dockerfile in Project Root**
   ```
   virello-backend/
   ├── Dockerfile          ← Place here
   ├── .dockerignore
   ├── package.json
   ├── start.js
   └── ... (other files)
   ```

2. **Required Environment Variables**
   Set these in your container platform:
   ```env
   NODE_ENV=production
   PORT=8080
   MONGODB_URI=mongodb+srv://...
   EMAIL_SERVICE=gmail
   EMAIL_USER=virellofoods@gmail.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_FROM=Virello Food <virellofoods@gmail.com>
   FRONTEND_URL=https://your-frontend-domain.com
   CORS_ORIGINS=https://your-frontend-domain.com,https://your-admin-domain.com
   ```

3. **Deploy Container**
   - Use the platform's container deployment feature
   - Point to the Dockerfile location
   - Set environment variables
   - Configure port 8080

### Local Testing

1. **Build Docker Image**
   ```bash
   cd virello-backend
   docker build -t virello-backend .
   ```

2. **Run Container**
   ```bash
   docker run -p 8080:8080 \
     -e MONGODB_URI="your-mongodb-uri" \
     -e EMAIL_USER="your-email" \
     -e EMAIL_PASSWORD="your-password" \
     virello-backend
   ```

3. **Or Use Docker Compose**
   ```bash
   cd virello-backend
   docker-compose up -d
   ```

## Dockerfile Features

### Security
- ✅ Non-root user (nodejs:1001)
- ✅ Minimal Alpine Linux base
- ✅ Production dependencies only
- ✅ No unnecessary files in final image

### Performance
- ✅ Multi-stage build
- ✅ Layer caching optimization
- ✅ npm cache cleanup
- ✅ Health check endpoint

### Reliability
- ✅ Health check every 30 seconds
- ✅ Graceful startup (40s start period)
- ✅ Automatic restart on failure
- ✅ Proper signal handling

## Health Check

The container includes a health check that:
- Checks `/health` endpoint every 30 seconds
- Times out after 3 seconds
- Retries 3 times before marking unhealthy
- Waits 40 seconds before first check

## Volume Mounts

For persistent storage:
```yaml
volumes:
  - ./public/uploads:/app/public/uploads
  - ./public/images:/app/public/images
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Ensure port 8080 is available
   - Check if another service is using the port

2. **Environment Variables**
   - Verify all required env vars are set
   - Check MongoDB connection string format

3. **Health Check Fails**
   - Check application logs
   - Verify `/health` endpoint responds
   - Ensure MongoDB is accessible

### Logs
```bash
# View container logs
docker logs <container-id>

# Follow logs in real-time
docker logs -f <container-id>
```

## Production Recommendations

1. **Use Environment-Specific Configs**
   - Separate configs for dev/staging/production
   - Use secrets management for sensitive data

2. **Resource Limits**
   ```yaml
   deploy:
     resources:
       limits:
         memory: 512M
         cpus: '0.5'
   ```

3. **Monitoring**
   - Set up application monitoring
   - Configure log aggregation
   - Monitor health check status

4. **Scaling**
   - Configure horizontal pod autoscaling
   - Set up load balancing
   - Use container orchestration (Kubernetes, Docker Swarm)
