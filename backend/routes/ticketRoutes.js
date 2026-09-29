/**
 * ==============================================================================
 * File: backend/routes/ticketRoutes.js
 * Description: Ticket Management Routes
 * Purpose: Maps /api/tickets endpoints to controller functions with JWT auth middleware.
 * ==============================================================================
 */

const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// All ticket endpoints require authentication
router.use(verifyToken);

// Create a new support ticket (Customer or Admin)
router.post('/', ticketController.createTicket);

// List tickets (Customers see own tickets; Admins see all)
router.get('/', ticketController.getTickets);

// Dashboard statistics (Customers see own stats; Admins see system-wide stats)
router.get('/stats', ticketController.getTicketStats);

// View a specific ticket by ID
router.get('/:id', ticketController.getTicketById);

// Update ticket status (Admin only)
router.patch('/:id/status', requireAdmin, ticketController.updateTicketStatus);

module.exports = router;
