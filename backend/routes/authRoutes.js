/**
 * ==============================================================================
 * File: backend/routes/authRoutes.js
 * Description: Authentication Routes
 * Purpose: Connects /api/auth HTTP endpoints to controller actions.
 * ==============================================================================
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// Public endpoints
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected endpoint
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
