const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Test endpoint to check if uploads directory exists and is accessible
app.get('/test-uploads', (req, res) => {
  const uploadsDir = path.join(__dirname, 'public/uploads');
  
  try {
    const files = fs.readdirSync(uploadsDir);
    res.json({
      message: 'Uploads directory accessible',
      path: uploadsDir,
      files: files,
      fileCount: files.length
    });
  } catch (error) {
    res.json({
      message: 'Uploads directory not accessible',
      error: error.message,
      path: uploadsDir
    });
  }
});

// Test endpoint to serve a specific file
app.get('/test-image/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'public/uploads', filename);
  
  try {
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({
        message: 'File not found',
        path: filePath
      });
    }
  } catch (error) {
    res.status(500).json({
      message: 'Error serving file',
      error: error.message
    });
  }
});

module.exports = app;
