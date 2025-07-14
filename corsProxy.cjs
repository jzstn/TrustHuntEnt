const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3001;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'CORS proxy is running' });
});

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Proxy middleware for Salesforce
app.use('/salesforce', createProxyMiddleware({
  target: 'https://login.salesforce.com',
  changeOrigin: true,
  pathRewrite: {
    '^/salesforce': ''
  },
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('X-Forwarded-For', req.ip);
  }
}));

// Proxy for any Salesforce instance
app.use('/proxy', createProxyMiddleware({
  router: (req) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      throw new Error('Target URL is required');
    }
    return targetUrl;
  },
  changeOrigin: true,
  pathRewrite: (path, req) => {
    return req.query.path || '/';
  },
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('X-Forwarded-For', req.ip);
  }
}));

app.listen(PORT, () => {
  console.log(`CORS Proxy server running on port ${PORT}`);
});