const TEST_PORT = 5098;
const TEST_DB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/it_consultant_crm';

process.env.MONGODB_URI = TEST_DB_URI;
process.env.MONGODB_DB_NAME = 'it_consultant_crm';

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from './src/models/user.model.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runAuthSuite() {
  console.log('================================================================');
  console.log('  🔒 IT CONSULTANT AUTHENTICATION & SECURITY VERIFICATION SUITE');
  console.log('================================================================\n');

  // Step 1: Connect to the test database
  console.log('--- Step 1: Connect to local test database ---');
  const { default: app, connectToDatabase } = await import('./app.js');
  await connectToDatabase();
  assert(mongoose.connection.readyState === 1, 'Mongoose connected to student_attendance_db (readyState: 1)');

  // Step 2: Verify test account exists and is active
  console.log('\n--- Step 2: Verify Super Admin test account ---');
  const superadmin = await User.findOne({ email: 'superadmin@gmail.com' });
  assert(!!superadmin, 'Account superadmin@gmail.com exists in database');
  assert(superadmin.status === 'active' && superadmin.isActive === true, 'Account is active (status: active, isActive: true)');
  assert(superadmin.role === 'superadmin' && String(superadmin.role_id) === '0', 'Account has role: superadmin, role_id: 0');
  assert(superadmin.isSuperAdmin === true, 'Account has isSuperAdmin === true');

  // Step 3: Start ephemeral test server
  const server = app.listen(TEST_PORT);
  const baseUrl = `http://localhost:${TEST_PORT}`;
  console.log(`\n--- Step 3: Ephemeral test server active on ${baseUrl} ---`);

  try {
    // Test A: Valid credentials
    console.log('\n--- Test A: Login with valid credentials ---');
    const validRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@gmail.com', password: 'superadmin@111' })
    });
    const validBody = await validRes.json();
    assert(validRes.status === 200, `Valid login returned 200 OK (got ${validRes.status})`);
    assert(!!validBody.token, 'Response contains valid JWT token');
    assert(validBody.user?.email === 'superadmin@gmail.com', 'Response user email matches');
    assert(validBody.user?.role === 'superadmin', 'Response user role is superadmin');
    assert(validBody.user?.isSuperAdmin === true, 'Response user isSuperAdmin is true');
    const validToken = validBody.token;

    // Test B: Case-insensitive email normalization
    console.log('\n--- Test B: Case-insensitive email normalization ---');
    const caseRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '  SUPERADMIN@gmail.com  ', password: 'superadmin@111' })
    });
    const caseBody = await caseRes.json();
    assert(caseRes.status === 200, `Case/whitespace normalized email login succeeded with 200 OK`);
    assert(caseBody.user?.email === 'superadmin@gmail.com', 'Normalized email returned');

    // Test C: Invalid password
    console.log('\n--- Test C: Login with incorrect password ---');
    const wrongPassRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@gmail.com', password: 'incorrect-password-123' })
    });
    const wrongPassBody = await wrongPassRes.json();
    assert(wrongPassRes.status === 401, `Incorrect password returned 401 Unauthorized (got ${wrongPassRes.status})`);
    assert(wrongPassBody.detail === 'Invalid credentials provided.', `Safe generic error message returned (${wrongPassBody.detail})`);

    // Test D: Unknown email
    console.log('\n--- Test D: Login with non-existent email ---');
    const unknownRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent_user_999@domain.com', password: 'anyPassword123' })
    });
    const unknownBody = await unknownRes.json();
    assert(unknownRes.status === 401, `Non-existent user returned 401 Unauthorized (got ${unknownRes.status})`);
    assert(unknownBody.detail === 'Invalid credentials provided.', `Safe generic error message returned (${unknownBody.detail})`);

    // Test E: Missing credentials
    console.log('\n--- Test E: Login with missing fields ---');
    const emptyRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '', password: '' })
    });
    assert(emptyRes.status === 400, `Empty credentials returned 400 Bad Request (got ${emptyRes.status})`);

    // Test F: Protected endpoint with valid token
    console.log('\n--- Test F: Access protected endpoint with valid JWT ---');
    const protectedRes = await fetch(`${baseUrl}/api/v1/users/${superadmin._id}`, {
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    const protectedBody = await protectedRes.json();
    assert(protectedRes.status === 200, `Protected GET /api/v1/users/:id returned 200 OK (got ${protectedRes.status})`);
    assert(protectedBody.data?.email === 'superadmin@gmail.com', 'Protected user profile retrieved successfully');

    // Test G: Plural route aliases (/api/users, /users, /api/v1/users)
    console.log('\n--- Test G: Verify plural route mounting aliases ---');
    const aliasRes1 = await fetch(`${baseUrl}/api/users/${superadmin._id}`, {
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    assert(aliasRes1.status === 200, `GET /api/users/:id returned 200 OK`);

    const aliasRes2 = await fetch(`${baseUrl}/users/${superadmin._id}`, {
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    assert(aliasRes2.status === 200, `GET /users/:id returned 200 OK`);

    // Test H: Protected endpoint without authorization header
    console.log('\n--- Test H: Access protected endpoint without token ---');
    const noTokenRes = await fetch(`${baseUrl}/api/v1/users/${superadmin._id}`);
    assert(noTokenRes.status === 401, `Missing token returned 401 Unauthorized (got ${noTokenRes.status})`);

    // Test I: Protected endpoint with expired / invalid token
    console.log('\n--- Test I: Access protected endpoint with invalid token ---');
    const badTokenRes = await fetch(`${baseUrl}/api/v1/users/${superadmin._id}`, {
      headers: { 'Authorization': 'Bearer invalid.bogus.jwt.token' }
    });
    assert(badTokenRes.status === 401, `Invalid token returned 401 Unauthorized (got ${badTokenRes.status})`);

    console.log('\n================================================================');
    console.log(` 🎉 ALL ${passed}/${total} AUTHENTICATION & SECURITY TESTS PASSED 100%!`);
    console.log('================================================================\n');

  } finally {
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

runAuthSuite().catch(err => {
  console.error('\n❌ Test Suite Aborted:', err.message);
  process.exit(1);
});
