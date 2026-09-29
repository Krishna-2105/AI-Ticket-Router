/**
 * ==============================================================================
 * File: backend/middleware/errorHandler.js
 * Description: Centralized Global Error Handling Middleware
 * Purpose: Catches unhandled asynchronous errors and returns standardized JSON responses.
 * ==============================================================================
 */

function errorHandler(err, req, res, next) {
  console.error('[Global Error Handler]', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      status: statusCode,
      timestamp: new Date().toISOString()
    }
  });
}

// 404 Route Not Found handler
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: {
      message: `Endpoint ${req.method} ${req.originalUrl} not found.`,
      status: 404
    }
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
