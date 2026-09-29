-- ==============================================================================
-- File: database/schema.sql
-- Description: MySQL Database Schema for AI Customer Support System
-- Purpose: Creates the database, tables, relationships, and indexes.
--
-- Why it exists:
-- Stores persistent data for registered users (customers and admins) and
-- customer-submitted support tickets with their ML-predicted category and confidence.
-- ==============================================================================

-- 1. Create database if it does not already exist
CREATE DATABASE IF NOT EXISTS ai_support;
USE ai_support;

-- 2. Drop existing tables if re-initializing (tickets first due to foreign key)
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS users;

-- 3. Users Table
-- Stores user accounts with role-based access ('customer' or 'admin').
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,       -- 191 is max recommended for utf8mb4 indexing
    password_hash VARCHAR(255) NOT NULL,      -- Stores bcrypt-hashed password (never plaintext)
    role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tickets Table
-- Stores customer support inquiries, along with the ML predicted category & confidence.
CREATE TABLE tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,                     -- Foreign key reference to users.id
    description TEXT NOT NULL,                -- The problem description typed by the customer
    category VARCHAR(50) NOT NULL DEFAULT 'Other', -- Predicted by ML model (Payment, Refund, Account, Technical, Delivery, Other)
    confidence DECIMAL(5, 4) NOT NULL DEFAULT 0.0000, -- Confidence score between 0.0000 and 1.0000 (e.g., 0.9123)
    status ENUM('Open', 'In Progress', 'Resolved') NOT NULL DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraint:
    -- If a user is deleted, their associated tickets are cleaned up automatically (CASCADE).
    CONSTRAINT fk_tickets_user_id
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
        
    -- Indexes for fast query lookup when filtering tickets
    INDEX idx_user_id (user_id),
    INDEX idx_category (category),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
