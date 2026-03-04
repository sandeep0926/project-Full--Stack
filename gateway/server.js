import 'dotenv/config';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();
const PORT = process.env.PORT || 4000;
const MONOLITH_URL = process.env.MONOLITH_URL || 'http://localhost:3000';

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    monolithUrl: MONOLITH_URL
  });
});

// Proxy configuration for API requests
const apiProxy = createProxyMiddleware({
  target: MONOLITH_URL,
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  
  // Preserve headers
  onProxyReq: (proxyReq, req, res) => {
    // Add custom headers
    proxyReq.setHeader('X-Forwarded-Host', req.hostname);
    proxyReq.setHeader('X-Gateway', 'api-gateway');
  },
  
  // Handle errors
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(502).json({
      success: false,
      error: 'Bad Gateway',
      message: 'Unable to reach backend service'
    });
  },
  
  // Timeout configuration
  proxyTimeout: 60000,
  timeout: 60000
});

// Proxy all /api/* requests to monolith
app.use('/api', apiProxy);

// Proxy WebSocket connections for Socket.io
app.use('/socket.io', createProxyMiddleware({
  target: MONOLITH_URL,
  changeOrigin: true,
  ws: true,
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  
  onError: (err, req, res) => {
    console.error('WebSocket proxy error:', err.message);
  }
}));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📡 Proxying to: ${MONOLITH_URL}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Gateway server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Gateway server closed');
    process.exit(0);
  });
});

export default app;
