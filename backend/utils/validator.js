/**
 * ==============================================================================
 * File: backend/utils/validator.js
 * Description: Input Validation Utilities
 * Purpose: Provides simple, clean validators for authentication and ticket payloads.
 * ==============================================================================
 */

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function isValidPassword(password) {
  return typeof password === 'string' && password.trim().length >= 6;
}

const ALLOWED_STATUSES = ['Open', 'In Progress', 'Resolved'];

function isValidStatus(status) {
  return typeof status === 'string' && ALLOWED_STATUSES.includes(status);
}

const ALLOWED_CATEGORIES = ['Payment', 'Refund', 'Account', 'Technical', 'Delivery', 'Other'];

function isValidCategory(category) {
  return typeof category === 'string' && ALLOWED_CATEGORIES.includes(category);
}

module.exports = {
  isValidEmail,
  isValidPassword,
  isValidStatus,
  isValidCategory,
  ALLOWED_STATUSES,
  ALLOWED_CATEGORIES
};
