/**
 * ==============================================================================
 * File: backend/middleware/authMiddleware.js
 * Description: JWT Authentication & Role-Based Authorization Middleware
 * Purpose: Protects private routes and enforces role permissions (customer vs admin).
 *
 * Why this file exists:
 * - Intercepts incoming requests before reaching route handlers.
 * - Extracts and verifies JWT from the HTTP Authorization header.
 * - Enforces security boundaries: customers cannot alter other users' tickets,
 *   and only admins can access the admin dashboard or change ticket status.
 * ==============================================================================
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_customer_support_system_key_2026';

/**
 * Middleware: Verifies the JSON Web Token in the Authorization header.
 * If valid, attaches decoded user payload to `req.user`.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, name, email, role, iat, exp }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired. Please log in again.'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.'
    });
  }
}

/**
 * Middleware factory: Enforces specific role requirements.
 *
 * @param {Array<string>|string} roles - Permitted roles (e.g., 'admin' or ['admin'])
 */
function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. This action requires one of the following roles: [${allowedRoles.join(', ')}]`
      });
    }

    next();
  };
}

// Convenient helper for Admin-only routes
const requireAdmin = requireRole(['admin']);

module.exports = {
  verifyToken,
  requireRole,
  requireAdmin
};
