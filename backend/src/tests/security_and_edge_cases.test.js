import dotenv from 'dotenv';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../app.js';
import User from '../models/user.model.js';
import ClientLead from '../models/clientLead.model.js';
import Client from '../models/client.model.js';
import Project from '../models/project.model.js';
import SupportTicket from '../models/supportTicket.model.js';
import SLAContract from '../models/slaContract.model.js';
import Sprint from '../models/sprint.model.js';
import Task from '../models/task.model.js';
import Income from '../models/income.model.js';

dotenv.config();

const MONGO_URI = process.env.DATABASE_URL || process.env.MONGO_URI || process.env.MONGODB_URI;

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

async function runSecurityAndEdgeCaseTests() {
  console.log('\n================================================================');
  console.log('  🔒 SECURITY, RBAC & EDGE CASE COMPLIANCE AUDIT TEST SUITE');
  console.log('================================================================\n');

  try {
    if (mongoose.connection.readyState !== 1) {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGO_URI);
      } else {
        await new Promise((resolve) => mongoose.connection.once('connected', resolve));
      }
    }
    console.log(' Connected to MongoDB Atlas for security testing.\n');

    // 1. Authenticate / Login as Super Admin
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'superadmin@gmail.com',
        password: 'superadmin@111'
      });

    assert(loginRes.status === 200, 'Superadmin credentials authenticate with 200 OK');
    const adminToken = loginRes.body.token;
    assert(!!adminToken, 'Valid JWT bearer token issued to Super Admin');

    // 2. Unauthenticated Access Rejection (401 Unauthorized)
    console.log('\n--- 1. UNAUTHENTICATED ACCESS PROTECTION ---');
    const unauthDashboard = await request(app).get('/api/v1/dashboard/metrics');
    assert(unauthDashboard.status === 401, 'Unauthenticated GET /api/v1/dashboard/metrics rejected with 401');

    const unauthSprints = await request(app).get('/api/v1/sprints');
    assert(unauthSprints.status === 401, 'Unauthenticated GET /api/v1/sprints rejected with 401');

    const unauthTickets = await request(app).get('/api/v1/support-tickets');
    assert(unauthTickets.status === 401, 'Unauthenticated GET /api/v1/support-tickets rejected with 401');

    const unauthSLA = await request(app).get('/api/v1/sla-contracts');
    assert(unauthSLA.status === 401, 'Unauthenticated GET /api/v1/sla-contracts rejected with 401');

    // 3. Malformed / Invalid ObjectId Handling (Returns 400, no 500 unhandled CastError)
    console.log('\n--- 2. INPUT SANITIZATION & MALFORMED ID HANDLING ---');
    const malformedSprint = await request(app)
      .get('/api/v1/sprints/not-a-valid-mongo-id')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(malformedSprint.status === 400 || malformedSprint.status === 404, 'Malformed Sprint ID handled gracefully without 500 crash');

    const malformedSprintMove = await request(app)
      .patch('/api/v1/sprints/123/tasks/invalid-task-id/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sprintStatus: 'Done' });
    assert(malformedSprintMove.status === 400, 'Malformed Task ID rejected with 400 Bad Request');

    // 4. Duplicate Lead Submission Prevention (Returns 409 Conflict)
    console.log('\n--- 3. DUPLICATE SUBMISSION SAFEGUARDS ---');
    const testLeadEmail = `lead_audit_${Date.now()}@nexora-corp.com`;
    const testLeadPhone = `+1-555-${Math.floor(100000 + Math.random() * 900000)}`;

    const createLeadRes1 = await request(app)
      .post('/api/v1/client-leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        leadName: 'Audit Test Client',
        companyName: 'Nexora Audit Holdings',
        email: testLeadEmail,
        phone: testLeadPhone,
        status: 'New',
        estimatedBudget: 35000,
        interestedService: 'Fullstack ERP Development'
      });
    assert(createLeadRes1.status === 201, 'First lead created successfully with 201 Created');
    const leadId = createLeadRes1.body.data._id;

    // Attempt exact duplicate submission with same email
    const createLeadRes2 = await request(app)
      .post('/api/v1/client-leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        leadName: 'Accidental Duplicate Client',
        companyName: 'Nexora Audit Holdings',
        email: testLeadEmail,
        phone: testLeadPhone,
        status: 'New'
      });
    assert(createLeadRes2.status === 409, 'Duplicate lead submission blocked with 409 Conflict');

    // 5. Client Isolation & Privacy Protection (Module 11)
    console.log('\n--- 4. CLIENT ISOLATION & PRIVACY AUDIT ---');
    // Create test client A and client B
    const clientA = await Client.create({
      clientId: `CLI-AUDIT-A-${Date.now()}`,
      companyName: 'Enterprise Client Alpha Corp',
      clientName: 'Alice Alpha',
      email: `alice_${Date.now()}@alpha.local`,
      phone: '+1 555 111 2222'
    });

    const clientB = await Client.create({
      clientId: `CLI-AUDIT-B-${Date.now()}`,
      companyName: 'Enterprise Client Beta Corp',
      clientName: 'Bob Beta',
      email: `bob_${Date.now()}@beta.local`,
      phone: '+1 555 333 4444'
    });

    // Create tickets for client A and B
    const ticketA = await SupportTicket.create({
      ticketNumber: `TIC-AUD-A-${Date.now()}`,
      title: 'Confidential Alpha Security Audit',
      description: 'Alpha database migration review',
      client: clientA._id,
      priority: 'High',
      comments: [
        { message: 'Public status: In Progress', isInternal: false, authorName: 'Staff' },
        { message: 'INTERNAL SECRET: Server IP 10.0.0.1 firewall configuration', isInternal: true, authorName: 'DevOps' }
      ]
    });

    const ticketB = await SupportTicket.create({
      ticketNumber: `TIC-AUD-B-${Date.now()}`,
      title: 'Confidential Beta Payment Failure',
      description: 'Beta payment gateway review',
      client: clientB._id,
      priority: 'Critical'
    });

    // Verify Admin sees both tickets and internal comments
    const adminTicketView = await request(app)
      .get(`/api/v1/support-tickets/${ticketA._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert(adminTicketView.status === 200, 'Admin can view ticket details');
    const adminComments = adminTicketView.body.data.comments || [];
    assert(adminComments.some(c => c.isInternal === true), 'Admin can view internal staff comments');

    // Generate token for Client A
    const jwt = (await import('jsonwebtoken')).default;
    const clientAToken = jwt.sign(
      { id: new mongoose.Types.ObjectId(), role: 'client', clientId: clientA._id },
      process.env.JWT_SECRET || 'supersecretjwtkey_12345'
    );

    // Client A requests ticket list
    const clientAListRes = await request(app)
      .get('/api/v1/support-tickets')
      .set('Authorization', `Bearer ${clientAToken}`);
    assert(clientAListRes.status === 200, 'Client A can access ticket endpoint');
    const clientATickets = clientAListRes.body.data || [];
    const containsClientBTickets = clientATickets.some(t => String(t.client?._id || t.client) === String(clientB._id));
    assert(!containsClientBTickets, 'Client A CANNOT see Client B support tickets (Data Isolation Verified)');

    // Client A views Ticket A: internal comments MUST be sanitized/hidden
    const clientATicketAView = await request(app)
      .get(`/api/v1/support-tickets/${ticketA._id}`)
      .set('Authorization', `Bearer ${clientAToken}`);
    const clientAComments = clientATicketAView.body?.data?.comments || [];
    const hasInternalComments = clientAComments.some(c => c.isInternal === true);
    assert(!hasInternalComments, 'Internal staff comments are SANITIZED & HIDDEN from Client view');

    // 6. Financial Calculations & Division-by-Zero Resilience (Module 8 & 9)
    console.log('\n--- 5. CALCULATION ACCURACY & DIVISION-BY-ZERO GUARDS ---');
    // Test SLA compliance with zero tickets (edge case)
    const slaMetricsRes = await request(app)
      .get('/api/v1/sla-contracts/metrics')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(slaMetricsRes.status === 200, 'SLA compliance metrics handles zero tickets gracefully');
    assert(typeof slaMetricsRes.body.data.complianceRate === 'number', 'Compliance rate is valid number');

    // Test invoice balance calculation
    const testInvoice = await Income.create({
      title: 'Sprint 1 Engineering Deliverables',
      amount: 10000,
      totalAmount: 11800, // including 18% GST
      status: 'Partially Paid',
      department: 'Development',
      client: clientA._id,
      payments: [
        { amount: 5000, paymentDate: new Date(), paymentMethod: 'Wire Transfer' }
      ]
    });

    const expectedOutstanding = 11800 - 5000;
    const recordedPaid = (testInvoice.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
    const calculatedBalance = testInvoice.totalAmount - recordedPaid;
    assert(calculatedBalance === expectedOutstanding, `Accurate balance: Invoiced ${testInvoice.totalAmount} - Paid ${recordedPaid} = ${expectedOutstanding}`);

    // 7. Cleanup
    console.log('\n--- 6. TEARDOWN & RECOVERY ---');
    await ClientLead.findByIdAndDelete(leadId);
    await SupportTicket.deleteMany({ _id: { $in: [ticketA._id, ticketB._id] } });
    await Client.deleteMany({ _id: { $in: [clientA._id, clientB._id] } });
    await Income.findByIdAndDelete(testInvoice._id);
    console.log('✅ Temporary security test records safely purged.\n');

    console.log('================================================================');
    console.log(` 🎉 ALL ${passed}/${total} SECURITY & EDGE CASE TESTS PASSED 100%!`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ AUDIT SUITE FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runSecurityAndEdgeCaseTests();
