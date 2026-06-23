import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, URL } from 'url';
import handler from './api/cars.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // Handle API requests
  if (req.url.startsWith('/api/')) {
    try {
      // Parse URL and query parameters
      const baseUrl = `http://${req.headers.host || 'localhost:4001'}`;
      const fullUrl = new URL(req.url, baseUrl);
      const query = {};
      for (const [key, value] of fullUrl.searchParams) {
        query[key] = value;
      }
      
      console.log(`[API] ${req.url} -> query:`, query);
      
      // Add parsed query to req object
      req.query = query;
      req.url = fullUrl.pathname;
      
      // Add helper methods to res
      res.status = function(code) {
        this.statusCode = code;
        return this;
      };
      res.json = function(data) {
        this.setHeader('Content-Type', 'application/json');
        this.end(JSON.stringify(data));
      };
      res.end = function(data) {
        if (data && !this.writableEnded) {
          http.OutgoingMessage.prototype.end.call(this, data);
        } else if (!this.writableEnded) {
          http.OutgoingMessage.prototype.end.call(this);
        }
      };
      
      await handler(req, res);
    } catch (err) {
      console.error('[API Error]', err.message, err.stack);
      if (!res.writableEnded) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    }
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      const ext = path.extname(filePath);
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json'
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      res.end(data);
    }
  });
});

server.listen(4001, () => {
  console.log('✅ Server running on http://localhost:4001');
});
