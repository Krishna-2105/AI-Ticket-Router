/**
 * ==============================================================================
 * File: backend/test_backend.js
 * Description: Automated Test Suite for Express Backend
 * Purpose: Tests all authentication and ticket management endpoints end-to-end.
 * ==============================================================================
 */

const axios = require('axios');
const { app, startServer } = require('./server');

const TEST_PORT = 5055;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runTests() {
  console.log('=' .repeat(60));
  console.log('       RUNNING BACKEND AUTOMATED TEST SUITE');
  console.log('='.repeat(60));

  let server;
  try {
    // Start temporary test server
    server = app.listen(TEST_PORT);
    console.log(`[Test Setup] Test server listening on ${BASE_URL}`);

    // Test 1: Health check
    const healthRes = await axios.get(`${BASE_URL}/api/health`);
    console.log('✓ Health check passed:', healthRes.data.status);

    // Test 2: Register a new customer
    const timestamp = Date.now();
    const testEmail = `tester_${timestamp}@test.com`;
    const regRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Test Customer',
      email: testEmail,
      password: 'password123',
      role: 'customer'
    });
    console.log('✓ Register customer passed: ID =', regRes.data.user.id);
    const customerToken = regRes.data.token;

    // Test 3: Login with customer
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testEmail,
      password: 'password123'
    });
    console.log('✓ Login customer passed: Role =', loginRes.data.user.role);

    // Test 4: Auth /me
    const meRes = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    console.log('✓ GET /me passed for:', meRes.data.user.email);

    // Test 5: Login with Admin (from seed data)
    const adminLoginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@support.com',
      password: 'admin123'
    });
    console.log('✓ Admin login passed: Role =', adminLoginRes.data.user.role);
    const adminToken = adminLoginRes.data.token;

    // Test 6: Create ticket as customer
    const ticketRes = await axios.post(
      `${BASE_URL}/api/tickets`,
      { description: 'Money was deducted from my account but order failed' },
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    const createdTicket = ticketRes.data.ticket;
    console.log('✓ Create ticket passed: ID =', createdTicket.id, '| Category =', createdTicket.category);

    // Test 7: Customer lists tickets (should see created ticket)
    const custTicketsRes = await axios.get(`${BASE_URL}/api/tickets`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    console.log('✓ Customer tickets list passed: Count =', custTicketsRes.data.count);

    // Test 8: Get ticket details by ID
    const singleTicketRes = await axios.get(`${BASE_URL}/api/tickets/${createdTicket.id}`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    console.log('✓ Ticket details by ID passed: Status =', singleTicketRes.data.ticket.status);

    // Test 9: Admin updates ticket status to 'In Progress'
    const statusUpdateRes = await axios.patch(
      `${BASE_URL}/api/tickets/${createdTicket.id}/status`,
      { status: 'In Progress' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('✓ Admin update status passed: New status =', statusUpdateRes.data.ticket.status);

    // Test 10: Get stats
    const statsRes = await axios.get(`${BASE_URL}/api/tickets/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✓ Admin stats passed: Total tickets =', statsRes.data.stats.total);

    console.log('='.repeat(60));
    console.log('         ALL 10 BACKEND TESTS PASSED SUCCESSFULLY! ✓');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ Test failed:', error.response ? error.response.data : error.message);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
      console.log('[Test Teardown] Test server closed.');
    }
  }
}

runTests();
