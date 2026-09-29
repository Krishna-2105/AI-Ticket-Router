/**
 * ==============================================================================
 * File: backend/server.js
 * Description: Express Main Entry Point for AI Customer Support Backend
 * Purpose: Configures middleware, mounts API routes, connects to database,
 *          and starts the HTTP server.
 *
 * Why this file exists:
 * - Serves as the central backend orchestrator.
 * - Coordinates authentication, database queries, and ML service communication.
 * ==============================================================================
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

const { testConnection, isFallback } = require('./config/db');
const { checkMlServiceHealth } = require('./services/mlService');
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// ------------------------------------------------------------------------------
// Middleware Setup
// ------------------------------------------------------------------------------

// Enable CORS for frontend requests
app.use(cors({
  origin: '*', // Allows requests from React development server (Vite on port 5173, etc.)
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
  next();
});

// ------------------------------------------------------------------------------
// Health & System Info Endpoint
// ------------------------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  const mlHealthy = await checkMlServiceHealth();

  res.status(200).json({
    status: 'ok',
    service: 'AI Customer Support Backend',
    database: {
      connected: !isFallback(),
      mode: isFallback() ? 'in-memory-fallback' : 'mysql-connected'
    },
    ml_service: {
      url: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000',
      online: mlHealthy
    },
    timestamp: new Date().toISOString()
  });
});

// ------------------------------------------------------------------------------
// Mount Application Routes
// ------------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'AI Customer Support System API is running.',
    endpoints: {
      auth: '/api/auth',
      tickets: '/api/tickets',
      health: '/api/health'
    }
  });
});

// ------------------------------------------------------------------------------
// Error Handlers
// ------------------------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

// ------------------------------------------------------------------------------
// Start Server
// ------------------------------------------------------------------------------
async function startServer() {
  // Test database connection
  await testConnection();

  const server = app.listen(PORT, () => {
    console.log('='.repeat(65));
    console.log(`  AI CUSTOMER SUPPORT BACKEND RUNNING ON PORT ${PORT}`);
    console.log(`  - Local URL   : http://localhost:${PORT}`);
    console.log(`  - Health Check: http://localhost:${PORT}/api/health`);
    console.log(`  - ML Service  : ${process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000'}`);
    console.log('='.repeat(65));
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
