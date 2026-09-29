/**
 * ==============================================================================
 * File: backend/controllers/ticketController.js
 * Description: Controller for Support Ticket Management & ML Integration
 * Purpose: Handles ticket creation, listing, details, status updates, and stats.
 *
 * Detailed Ticket Flow:
 * 1. Customer fills out form on React frontend.
 * 2. POST /api/tickets request reaches this controller.
 * 3. Controller sends ticket description to FastAPI ML microservice via mlService.
 * 4. Model predicts category & calculates confidence score.
 * 5. Controller inserts record into MySQL with user_id, description, category, confidence, status='Open'.
 * 6. React receives created ticket data and immediately displays prediction to customer.
 * ==============================================================================
 */

const db = require('../config/db');
const mlService = require('../services/mlService');
const { isValidStatus } = require('../utils/validator');

/**
 * POST /api/tickets
 * Creates a new support ticket and runs ML categorization.
 */
async function createTicket(req, res, next) {
  try {
    const { description } = req.body;
    const userId = req.user.id;

    // 1. Validation
    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Ticket description must be at least 5 characters long.'
      });
    }

    const cleanDescription = description.trim();

    // 2. Call FastAPI ML service to predict category and confidence
    const mlResult = await mlService.predictTicketCategory(cleanDescription);
    const category = mlResult.category;
    const confidence = mlResult.confidence;

    // 3. Save ticket to MySQL database
    const [insertResult] = await db.query(
      `INSERT INTO tickets (user_id, description, category, confidence, status)
       VALUES (?, ?, ?, ?, 'Open')`,
      [userId, cleanDescription, category, confidence]
    );

    const ticketId = insertResult.insertId;

    // 4. Retrieve created ticket record
    const [tickets] = await db.query(
      `SELECT t.id, t.user_id, t.description, t.category, t.confidence, t.status, t.created_at, t.updated_at,
              u.name AS user_name, u.email AS user_email
       FROM tickets t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [ticketId]
    );

    return res.status(201).json({
      success: true,
      message: 'Ticket created and categorized successfully.',
      ticket: tickets[0],
      ml_service_available: mlResult.ml_available
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/tickets
 * Retrieves tickets:
 * - Admin users view ALL tickets.
 * - Customer users view ONLY their own tickets.
 * Supports optional ?status=... and ?category=... filters.
 */
async function getTickets(req, res, next) {
  try {
    const { status, category } = req.query;
    const isAdmin = req.user.role === 'admin';
    const userId = req.user.id;

    let sql = `
      SELECT t.id, t.user_id, t.description, t.category, t.confidence, t.status, t.created_at, t.updated_at,
             u.name AS user_name, u.email AS user_email
      FROM tickets t
      JOIN users u ON t.user_id = u.id
    `;
    const conditions = [];
    const params = [];

    // Role-based visibility
    if (!isAdmin) {
      conditions.push('t.user_id = ?');
      params.push(userId);
    }

    // Optional status filter
    if (status && isValidStatus(status)) {
      conditions.push('t.status = ?');
      params.push(status);
    }

    // Optional category filter
    if (category) {
      conditions.push('t.category = ?');
      params.push(category);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY t.created_at DESC';

    const [tickets] = await db.query(sql, params);

    return res.status(200).json({
      success: true,
      count: tickets.length,
      tickets
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/tickets/:id
 * Retrieves a single ticket by ID.
 * Enforces ownership: customers can only view their own ticket.
 */
async function getTicketById(req, res, next) {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket ID.'
      });
    }

    const [rows] = await db.query(
      `SELECT t.id, t.user_id, t.description, t.category, t.confidence, t.status, t.created_at, t.updated_at,
              u.name AS user_name, u.email AS user_email
       FROM tickets t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [ticketId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.'
      });
    }

    const ticket = rows[0];

    // Authorization check
    if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to view this ticket.'
      });
    }

    return res.status(200).json({
      success: true,
      ticket
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/tickets/:id/status
 * Updates ticket status ('Open', 'In Progress', 'Resolved').
 * Restricted to admin users.
 */
async function updateTicketStatus(req, res, next) {
  try {
    const ticketId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (isNaN(ticketId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket ID.'
      });
    }

    if (!isValidStatus(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be one of: 'Open', 'In Progress', 'Resolved'."
      });
    }

    // Verify ticket exists
    const [existing] = await db.query('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.'
      });
    }

    // Update status
    await db.query(
      'UPDATE tickets SET status = ? WHERE id = ?',
      [status, ticketId]
    );

    // Fetch updated ticket
    const [updated] = await db.query(
      `SELECT t.id, t.user_id, t.description, t.category, t.confidence, t.status, t.created_at, t.updated_at,
              u.name AS user_name, u.email AS user_email
       FROM tickets t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [ticketId]
    );

    return res.status(200).json({
      success: true,
      message: `Ticket status updated to '${status}'.`,
      ticket: updated[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/tickets/stats
 * Provides ticket statistics for customer or admin dashboards.
 */
async function getTicketStats(req, res, next) {
  try {
    const isAdmin = req.user.role === 'admin';
    const userId = req.user.id;

    // Fetch relevant tickets
    let sql = 'SELECT id, user_id, category, status, created_at FROM tickets';
    const params = [];
    if (!isAdmin) {
      sql += ' WHERE user_id = ?';
      params.push(userId);
    }

    const [allTickets] = await db.query(sql, params);

    const total = allTickets.length;
    let openCount = 0;
    let inProgressCount = 0;
    let resolvedCount = 0;

    const byCategory = {
      Payment: 0,
      Refund: 0,
      Account: 0,
      Technical: 0,
      Delivery: 0,
      Other: 0
    };

    allTickets.forEach(t => {
      if (t.status === 'Open') openCount++;
      else if (t.status === 'In Progress') inProgressCount++;
      else if (t.status === 'Resolved') resolvedCount++;

      if (byCategory.hasOwnProperty(t.category)) {
        byCategory[t.category]++;
      } else {
        byCategory['Other'] = (byCategory['Other'] || 0) + 1;
      }
    });

    return res.status(200).json({
      success: true,
      stats: {
        total,
        open: openCount,
        in_progress: inProgressCount,
        resolved: resolvedCount,
        by_category: byCategory
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicketStatus,
  getTicketStats
};
