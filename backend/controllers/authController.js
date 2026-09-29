/**
 * ==============================================================================
 * File: backend/controllers/authController.js
 * Description: Controller for User Authentication (Register, Login, Me)
 * Purpose: Handles user sign up, password hashing via bcrypt, and JWT token issuance.
 *
 * Why this file exists:
 * - Separates authentication business logic from route definitions.
 * - Protects passwords using one-way bcrypt cryptographic hashing with salt rounds.
 * - Issues signed JWT tokens so the React frontend can maintain user sessions.
 * ==============================================================================
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { isValidEmail, isValidPassword } = require('../utils/validator');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_customer_support_system_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generates a signed JSON Web Token containing basic user payload.
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * POST /api/auth/register
 * Registers a new user account.
 */
async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    // 1. Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name is required.'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Role safety: allow 'admin' or 'customer', defaulting to 'customer'
    const assignedRole = (role === 'admin') ? 'admin' : 'customer';

    // 2. Check if email is already taken
    const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // 3. Hash the password with bcrypt (10 salt rounds)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Insert user into MySQL
    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), passwordHash, assignedRole]
    );

    const newUserId = result.insertId;
    const userPayload = {
      id: newUserId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: assignedRole
    };

    // 5. Generate JWT token
    const token = generateToken(userPayload);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: userPayload
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Authenticates user credentials and returns JWT token.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // 1. Input Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    // 2. Find user by email in database
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = users[0];

    // 3. Compare password with stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // 4. Generate JWT
    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    const token = generateToken(userPayload);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: userPayload
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile.
 */
async function getMe(req, res, next) {
  try {
    // req.user was populated by verifyToken middleware
    const [rows] = await db.query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.'
      });
    }

    return res.status(200).json({
      success: true,
      user: rows[0]
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  getMe
};
