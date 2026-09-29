-- ==============================================================================
-- File: database/seed.sql
-- Description: Sample initial data for AI Customer Support System
-- Purpose: Populates the database with test users (admin and customer) and sample tickets.
--
-- Passwords:
-- admin@support.com    -> admin123
-- customer@example.com -> password123
-- john@example.com     -> password123
-- ==============================================================================

USE ai_support;

-- 1. Insert Initial Users
INSERT INTO users (id, name, email, password_hash, role) VALUES
(1, 'Admin User', 'admin@support.com', '$2b$10$IP9L.hhTbk12lfVBXIDs4uS5K4ClShFbrZHEN7q2MIo8Jw1sTfAPK', 'admin'),
(2, 'Alice Customer', 'customer@example.com', '$2b$10$fKW6OObrU255ouE2cESA/eIJrlZS6ZYIsgoAroJ1edSxYeyWtQmRu', 'customer'),
(3, 'John Doe', 'john@example.com', '$2b$10$fKW6OObrU255ouE2cESA/eIJrlZS6ZYIsgoAroJ1edSxYeyWtQmRu', 'customer')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. Insert Initial Support Tickets
INSERT INTO tickets (id, user_id, description, category, confidence, status, created_at) VALUES
(101, 2, 'Money was deducted from my account but my order failed at checkout.', 'Payment', 0.9420, 'Open', NOW() - INTERVAL 2 HOUR),
(102, 2, 'I requested a refund 5 days ago and still have not received the funds.', 'Refund', 0.9150, 'In Progress', NOW() - INTERVAL 1 DAY),
(103, 3, 'I forgot my password and cannot log in to my account.', 'Account', 0.9580, 'Resolved', NOW() - INTERVAL 3 DAY),
(104, 3, 'The web application keeps crashing whenever I open the checkout page.', 'Technical', 0.9230, 'Open', NOW() - INTERVAL 30 MINUTE),
(105, 2, 'My package has not arrived and tracking says delivery is delayed.', 'Delivery', 0.9610, 'Open', NOW() - INTERVAL 4 HOUR)
ON DUPLICATE KEY UPDATE description=VALUES(description);
