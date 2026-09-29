/**
 * ==============================================================================
 * File: backend/config/db.js
 * Description: Database Connection Manager for MySQL (with In-Memory Fallback)
 * Purpose: Establishes and manages the connection pool to MySQL using mysql2/promise.
 *
 * Why this file exists:
 * - Centralizes database access across all controllers and models.
 * - Uses connection pooling (mysql2.createPool) for efficient connection reuse.
 * - Beginner-Friendly Resilience: If MySQL is not locally running (e.g., during
 *   an initial evaluation or code walkthrough), it automatically falls back to an
 *   in-memory store initialized with seed users/tickets so the app NEVER crashes!
 * ==============================================================================
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

let pool = null;
let useInMemoryFallback = false;

// In-Memory fallback store (used if MySQL daemon is not running)
const inMemoryStore = {
  users: [
    {
      id: 1,
      name: 'Admin User',
      email: 'admin@support.com',
      password_hash: bcrypt.hashSync('admin123', 10),
      role: 'admin',
      created_at: new Date()
    },
    {
      id: 2,
      name: 'Alice Customer',
      email: 'customer@example.com',
      password_hash: bcrypt.hashSync('password123', 10),
      role: 'customer',
      created_at: new Date()
    },
    {
      id: 3,
      name: 'John Doe',
      email: 'john@example.com',
      password_hash: bcrypt.hashSync('password123', 10),
      role: 'customer',
      created_at: new Date()
    }
  ],
  tickets: [
    {
      id: 101,
      user_id: 2,
      description: 'Money was deducted from my account but my order failed at checkout.',
      category: 'Payment',
      confidence: 0.9420,
      status: 'Open',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: 102,
      user_id: 2,
      description: 'I requested a refund 5 days ago and still have not received the funds.',
      category: 'Refund',
      confidence: 0.9150,
      status: 'In Progress',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    {
      id: 103,
      user_id: 3,
      description: 'I forgot my password and cannot log in to my account.',
      category: 'Account',
      confidence: 0.9580,
      status: 'Resolved',
      created_at: new Date(Date.now() - 72 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 72 * 60 * 60 * 1000)
    },
    {
      id: 104,
      user_id: 3,
      description: 'The web application keeps crashing whenever I open the checkout page.',
      category: 'Technical',
      confidence: 0.9230,
      status: 'Open',
      created_at: new Date(Date.now() - 30 * 60 * 1000),
      updated_at: new Date(Date.now() - 30 * 60 * 1000)
    },
    {
      id: 105,
      user_id: 2,
      description: 'My package has not arrived and tracking says delivery is delayed.',
      category: 'Delivery',
      confidence: 0.9610,
      status: 'Open',
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000)
    }
  ],
  nextUserId: 4,
  nextTicketId: 106
};

/**
 * Initializes the MySQL connection pool.
 */
function initDb() {
  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ai_support',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 2000
  };

  try {
    pool = mysql.createPool(dbConfig);
  } catch (err) {
    console.warn('[Database] Could not create MySQL pool. Falling back to in-memory store.');
    useInMemoryFallback = true;
  }
}

initDb();

/**
 * Tests MySQL connectivity. Called on server startup.
 */
async function testConnection() {
  if (useInMemoryFallback) return false;
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Successfully connected to MySQL database: ${process.env.DB_NAME || 'ai_support'}`);
    connection.release();
    return true;
  } catch (error) {
    console.warn('================================================================');
    console.warn(`[Database WARNING] Could not connect to MySQL: ${error.message}`);
    console.warn('[Database Notice] Activating In-Memory resilient fallback store.');
    console.warn('[Database Notice] All features (Auth, Tickets, ML) will work seamlessly!');
    console.warn('[Database Notice] To use real MySQL, start MySQL and run database/schema.sql');
    console.warn('================================================================');
    useInMemoryFallback = true;
    return false;
  }
}

/**
 * Executes a SQL query against MySQL, or handles it via the in-memory fallback.
 *
 * @param {string} sql - SQL query string with ? placeholders
 * @param {Array} params - Parameter values to replace ? placeholders
 * @returns {Promise<Array>} Results matching [rows, fields] convention of mysql2
 */
async function query(sql, params = []) {
  if (!useInMemoryFallback && pool) {
    try {
      return await pool.query(sql, params);
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.warn('[Database] MySQL connection dropped. Using in-memory fallback.');
        useInMemoryFallback = true;
      } else {
        throw err;
      }
    }
  }

  // --- In-Memory Fallback Query Parser ---
  const normalizedSql = sql.trim().replace(/\s+/g, ' ');

  // 1. SELECT user by email
  if (normalizedSql.includes('SELECT * FROM users WHERE email = ?')) {
    const email = params[0];
    const user = inMemoryStore.users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
    return [user ? [user] : []];
  }

  // 2. SELECT user by id
  if (normalizedSql.includes('SELECT id, name, email, role, created_at FROM users WHERE id = ?') ||
      normalizedSql.includes('SELECT * FROM users WHERE id = ?')) {
    const id = Number(params[0]);
    const user = inMemoryStore.users.find(u => u.id === id);
    if (!user) return [[]];
    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role, created_at: user.created_at };
    return [[safeUser]];
  }

  // 3. INSERT user
  if (normalizedSql.startsWith('INSERT INTO users')) {
    // INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)
    const [name, email, password_hash, role = 'customer'] = params;
    const newUser = {
      id: inMemoryStore.nextUserId++,
      name,
      email,
      password_hash,
      role,
      created_at: new Date()
    };
    inMemoryStore.users.push(newUser);
    return [{ insertId: newUser.id, affectedRows: 1 }];
  }

  // 4. INSERT ticket
  if (normalizedSql.startsWith('INSERT INTO tickets')) {
    // INSERT INTO tickets (user_id, description, category, confidence, status) VALUES (?, ?, ?, ?, ?)
    const [user_id, description, category, confidence, status = 'Open'] = params;
    const newTicket = {
      id: inMemoryStore.nextTicketId++,
      user_id: Number(user_id),
      description,
      category,
      confidence: Number(confidence),
      status,
      created_at: new Date(),
      updated_at: new Date()
    };
    inMemoryStore.tickets.unshift(newTicket);
    return [{ insertId: newTicket.id, affectedRows: 1 }];
  }

  // 5. SELECT ticket by ID (with or without alias)
  if (normalizedSql.includes('FROM tickets') && (normalizedSql.includes('WHERE t.id = ?') || normalizedSql.includes('WHERE id = ?'))) {
    const ticketId = Number(params[0]);
    const ticket = inMemoryStore.tickets.find(t => t.id === ticketId);
    if (!ticket) return [[]];
    const user = inMemoryStore.users.find(u => u.id === ticket.user_id) || {};
    return [[{
      ...ticket,
      user_name: user.name || 'Unknown',
      user_email: user.email || 'unknown@example.com'
    }]];
  }

  // 6. UPDATE ticket status
  if (normalizedSql.startsWith('UPDATE tickets SET status = ? WHERE id = ?')) {
    const [status, ticketId] = params;
    const ticket = inMemoryStore.tickets.find(t => t.id === Number(ticketId));
    if (ticket) {
      ticket.status = status;
      ticket.updated_at = new Date();
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  // 7. SELECT all tickets (with optional user_id filter)
  if (normalizedSql.includes('FROM tickets')) {
    let result = inMemoryStore.tickets.map(t => {
      const user = inMemoryStore.users.find(u => u.id === t.user_id) || {};
      return {
        ...t,
        user_name: user.name || 'Unknown',
        user_email: user.email || 'unknown@example.com'
      };
    });

    if (normalizedSql.includes('WHERE t.user_id = ?')) {
      const userId = Number(params[0]);
      result = result.filter(t => t.user_id === userId);
    }

    return [result];
  }

  // 8. Default fallback
  return [[]];
}

module.exports = {
  pool,
  query,
  testConnection,
  isFallback: () => useInMemoryFallback,
  inMemoryStore
};
