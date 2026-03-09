// Simple static file server for Render Web Service (alternative deployment)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 10000;
const PUBLIC_DIR = __dirname;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let filePath = req.url;
  
  // Default to index.html
  if (filePath === '/' || filePath === '') {
    filePath = '/index.html';
  }
  
  // Remove leading slash
  filePath = filePath.substring(1);
  
  // Handle API calls - forward to RESTful Table API
  if (req.url.startsWith('/tables/')) {
    // The RESTful Table API will handle these requests
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('API endpoints are handled by the RESTful Table API');
    return;
  }
  
  // Handle static files
  const fullPath = path.join(PUBLIC_DIR, filePath);
  const extname = path.extname(fullPath).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      // Try to serve index.html for SPA routing
      if (req.url.startsWith('/js/') || req.url.startsWith('/css/')) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
      } else {
        // Serve index.html for client-side routing
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err, htmlData) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(htmlData);
          }
        });
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Table Tennis Tournament Manager running on port ${PORT}`);
  console.log(`📱 Open your browser to: http://localhost:${PORT}`);
  console.log(`🎯 Ready to manage your tournament!`);
});