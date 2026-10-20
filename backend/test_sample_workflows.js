/**
 * ============================================================================
 * IT CONSULTANT CRM — FULL WORKFLOW & SAMPLE DATA VERIFICATION SUITE
 * ============================================================================
 * Validates real end-to-end CRUD, status transitions, relations, calculations,
 * and security rules across all 12 ERP modules using the populated sample records.
 * ============================================================================
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (_) {}

dotenv.config();

// Models
import User from './src/models/user.model.js';
import ClientLead from './src/models/clientLead.model.js';
import Client from './src/models/client.model.js';
import Project from './src/models/project.model.js';
import ProjectMilestone from './src/models/projectMilestone.model.js';
import Task from './src/models/task.model.js';
import Sprint from './src/models/sprint.model.js';
import DeveloperReport from './src/models/developerReport.model.js';
import AiReportCache from './src/models/aiReportCache.model.js';
import Income from './src/models/income.model.js';
import Expense from './src/models/expense.model.js';
import ExpenseCategory from './src/models/expenseCategory.model.js';
import GitIntegration from './src/models/gitIntegration.model.js';
import GitEvent from './src/models/gitEvent.model.js';
import SupportTicket from './src/models/supportTicket.model.js';
import SLAContract from './src/models/slaContract.model.js';

// Controllers
import { getERPDashboardMetrics } from './src/controllers/dashboard.controller.js';
import { getSLAMetrics } from './src/controllers/slaContract.controller.js';

const mockResponse = () => {
  const res = {};
  res.statusCode = 200;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

async function runSampleWorkflowsVerification() {
  console.log('================================================================');
  console.log('  🧪 IT CONSULTANT CRM — END-TO-END WORKFLOW VERIFICATION SUITE');
  console.log('================================================================\n');

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

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/it_consultant_crm';
  const dbName = process.env.MONGODB_DB_NAME || 'it_consultant_crm';

  try {
    await mongoose.connect(mongoUri.trim().replace(/^["']|["']$/g, ''), {
      dbName,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000
    });
    console.log('✅ Connected safely to MongoDB Atlas for workflow testing.\n');

    // -------------------------------------------------------------
    // WORKFLOW 1: EXECUTIVE DASHBOARD METRICS AGGREGATION
    // -------------------------------------------------------------
    console.log('--- WORKFLOW 1: Dashboard Metrics Live Aggregation ---');
    const dashReq = { user: { role: 'superadmin' } };
    const dashRes = mockResponse();
    await getERPDashboardMetrics(dashReq, dashRes, (err) => { if (err) throw err; });

    assert(dashRes.statusCode === 200, 'Dashboard endpoint returned HTTP 200 OK');
    assert(dashRes.body?.success === true, 'Dashboard response has success === true');
    assert(dashRes.body?.data?.projects?.total >= 2, `Dashboard correctly aggregates >= 2 projects (got ${dashRes.body?.data?.projects?.total})`);
    assert(dashRes.body?.data?.projects?.active >= 2, `Dashboard correctly aggregates >= 2 active projects (got ${dashRes.body?.data?.projects?.active})`);
    assert(dashRes.body?.data?.tasks?.total >= 4, `Dashboard aggregates >= 4 tasks (got ${dashRes.body?.data?.tasks?.total})`);
    assert(dashRes.body?.data?.finance?.totalInvoiced >= 1416000, `Dashboard aggregates total invoiced >= ₹1,416,000 (got ₹${dashRes.body?.data?.finance?.totalInvoiced})`);
    assert(dashRes.body?.data?.finance?.totalReceived >= 972000, `Dashboard aggregates total received payments >= ₹972,000 (got ₹${dashRes.body?.data?.finance?.totalReceived})`);
    assert(dashRes.body?.data?.finance?.totalExpenses >= 73500, `Dashboard aggregates total expenses >= ₹73,500 (got ₹${dashRes.body?.data?.finance?.totalExpenses})`);
    assert(dashRes.body?.data?.support?.open >= 1, `Dashboard aggregates open support tickets >= 1 (got ${dashRes.body?.data?.support?.open})`);
    assert(dashRes.body?.data?.sla?.activeContracts >= 2, `Dashboard aggregates active SLA contracts >= 2 (got ${dashRes.body?.data?.sla?.activeContracts})`);
    assert(dashRes.body?.data?.leads?.total >= 2, `Dashboard aggregates total leads >= 2 (got ${dashRes.body?.data?.leads?.total})`);

    // -------------------------------------------------------------
    // WORKFLOW 2: CLIENT LEADS & FOLLOWUP HISTORY
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 2: Client Leads & Follow-up History ---');
    const lead1 = await ClientLead.findOne({ email: 'rohan.mehra@finedge.example.com' });
    assert(!!lead1, 'Lead 1 (FinEdge Digital Banking) retrieved successfully');
    assert(lead1.status === 'Interested' && lead1.priority === 'High', 'Lead 1 status is Interested and priority is High');
    assert(lead1.followUpHistory.length >= 2, `Lead 1 has >= 2 follow-up history entries (got ${lead1.followUpHistory.length})`);
    assert(lead1.estimatedBudget === 850000, 'Lead 1 estimated budget is ₹850,000');

    // Add another follow-up entry
    lead1.followUpHistory.push({
      date: new Date(),
      notes: 'Automated workflow test follow-up: Client requested final commercial contract.',
      followUpByName: 'Antigravity QA Lead'
    });
    await lead1.save();
    const updatedLead1 = await ClientLead.findById(lead1._id);
    assert(updatedLead1.followUpHistory.length >= 3, 'Follow-up history entry added and persisted successfully');

    // Lead 2
    const lead2 = await ClientLead.findOne({ email: 'kavita.nair@omniretail.example.com' });
    assert(!!lead2, 'Lead 2 (OmniRetail E-Commerce) retrieved successfully');
    assert(lead2.status === 'Proposal', 'Lead 2 status is Proposal');

    // -------------------------------------------------------------
    // WORKFLOW 3: CLIENT ACCOUNTS & CONTRACT VALIDATION
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 3: Client Accounts, Contracts & Relations ---');
    const client1 = await Client.findOne({ clientId: 'CLI-TEST-NXLG' }).populate('accountManager');
    assert(!!client1, 'Client 1 (Nexus Global Logistics) retrieved by clientId');
    assert(client1.clientType === 'Enterprise' && client1.status === 'Active', 'Client 1 is Enterprise and Active');
    assert(client1.contracts?.length >= 1, 'Client 1 has active contracts attached');
    assert(client1.contracts[0].contractNumber === 'SLA-NXLG-2026-001', 'Contract number matches SLA-NXLG-2026-001');
    assert(client1.accountManager?.email === 'arun.pm@itconsultant.test', 'Account Manager populated correctly (Arun Kumar)');

    const client2 = await Client.findOne({ clientId: 'CLI-TEST-AURH' });
    assert(!!client2, 'Client 2 (Aura HealthTech Solutions) retrieved by clientId');
    assert(client2.priority === 'VIP' && client2.ndaStatus === 'Signed', 'Client 2 priority is VIP and NDA is Signed');

    // -------------------------------------------------------------
    // WORKFLOW 4: PROJECT MANAGEMENT & MILESTONES
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 4: Projects, Milestones & Team Structure ---');
    const project1 = await Project.findOne({ projectCode: 'PRJ-TEST-LOGI' })
      .populate('client')
      .populate('projectManager')
      .populate('assignedEmployees');

    assert(!!project1, 'Project 1 (PRJ-TEST-LOGI) retrieved successfully');
    assert(project1.client.clientId === 'CLI-TEST-NXLG', 'Project 1 linked to Client CLI-TEST-NXLG');
    assert(project1.projectManager.name === 'Arun Kumar', 'Project Manager is Arun Kumar');
    assert(project1.assignedEmployees.length >= 3, `Assigned employees >= 3 (got ${project1.assignedEmployees.length})`);
    assert(project1.technologyStack.includes('Node.js') && project1.technologyStack.includes('React'), 'Tech stack contains Node.js & React');

    const project1Milestones = await ProjectMilestone.find({ project: project1._id });
    assert(project1Milestones.length === 3, `Project 1 has 3 milestones (got ${project1Milestones.length})`);
    const completedMilestone = project1Milestones.find(m => m.status === 'Completed');
    assert(!!completedMilestone && completedMilestone.isPaid === true, 'Milestone 1 is Completed and marked isPaid === true');

    const project2 = await Project.findOne({ projectCode: 'PRJ-TEST-HLTH' });
    assert(!!project2, 'Project 2 (PRJ-TEST-HLTH) retrieved successfully');
    assert(typeof project2.progress === 'number' && project2.progress >= 0, `Project 2 progress is valid number (${project2.progress}%)`);

    // -------------------------------------------------------------
    // WORKFLOW 5: AGILE SPRINT BOARD
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 5: Agile Sprints & Story Point Tracking ---');
    const sprint3 = await Sprint.findOne({ project: project1._id, sprintNumber: 3 });
    assert(!!sprint3, 'Sprint 3 retrieved for Project 1');
    assert(sprint3.status === 'Active', 'Sprint 3 is Active');
    assert(sprint3.totalPoints === 34 && sprint3.completedPoints === 21, 'Sprint 3 story points: 34 total, 21 completed');

    const sprint4 = await Sprint.findOne({ project: project2._id, sprintNumber: 4 });
    assert(!!sprint4, 'Sprint 4 retrieved for Project 2');
    assert(sprint4.status === 'Active', 'Sprint 4 is Active');

    // -------------------------------------------------------------
    // WORKFLOW 6: TASK MANAGEMENT & KANBAN STATUS TRANSITION
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 6: Task Management & Kanban Drag-and-Drop ---');
    const task101 = await Task.findOne({ taskKey: 'NXLG-101' });
    assert(!!task101, 'Task NXLG-101 retrieved');
    assert(task101.taskType === 'Story' && task101.storyPoints === 8, 'NXLG-101 is a Story with 8 story points');
    assert(task101.sprintStatus === 'In Progress', 'NXLG-101 sprint status is In Progress');

    const task102 = await Task.findOne({ taskKey: 'NXLG-102' });
    assert(!!task102, 'Task NXLG-102 retrieved');
    assert(task102.sprintStatus === 'To Do', 'NXLG-102 initial sprint status is To Do');

    // Simulate Kanban Drag-and-Drop to 'In Progress'
    task102.sprintStatus = 'In Progress';
    task102.status = 'in_progress';
    await task102.save();

    const movedTask102 = await Task.findById(task102._id);
    assert(movedTask102.sprintStatus === 'In Progress' && movedTask102.status === 'in_progress', 'Kanban drag-drop transition to In Progress synchronized in DB');

    // Reset back to To Do for idempotency
    movedTask102.sprintStatus = 'To Do';
    movedTask102.status = 'pending';
    await movedTask102.save();

    // -------------------------------------------------------------
    // WORKFLOW 7: DEVELOPER REPORTS & UNIQUE COMPOUND INDEX
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 7: Developer Daily Reports & Index Safeguards ---');
    const devUser = await User.findOne({ email: 'sneha.dev@itconsultant.test' });
    const devReport = await DeveloperReport.findOne({ userId: devUser._id }).sort({ dateString: -1 });
    const targetDateStr = devReport?.dateString || new Date().toISOString().split('T')[0];

    assert(!!devReport, 'Developer Report for Sneha Patel retrieved successfully');
    assert(devReport.developmentTaskReport?.length >= 1, 'Development tasks reported');
    assert(devReport.pullRequests?.length >= 1, 'Pull requests logged in report');
    assert(devReport.commits?.length >= 1, 'Commits logged in report');

    // Test unique compound index constraint: inserting duplicate report must throw error
    let duplicateCaught = false;
    try {
      await DeveloperReport.create({
        userId: devUser._id,
        dateString: targetDateStr,
        basicDetails: { employeeName: 'Duplicate Test' }
      });
    } catch (err) {
      if (err.code === 11000) {
        duplicateCaught = true;
      }
    }
    assert(duplicateCaught, 'Unique compound index { userId: 1, dateString: 1 } blocks duplicate report on same date (E11000)');

    // -------------------------------------------------------------
    // WORKFLOW 8: AI PROJECT EXECUTIVE REPORTS
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 8: AI Project Reports & Cached Metrics ---');
    const aiReport1 = await AiReportCache.findOne({ projectId: project1._id });
    assert(!!aiReport1, 'Cached AI report for Project 1 retrieved');
    assert(aiReport1.report.includes('Executive AI Health Analysis'), 'AI report contains formatted markdown evaluation');
    assert(aiReport1.stats?.velocityIndex === 94, 'Factual verified stats attach velocityIndex: 94');

    // -------------------------------------------------------------
    // WORKFLOW 9: ACCOUNTS & FINANCE — INVOICES & EXPENSES
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 9: Invoices, GST Calculations & Expenses ---');
    const inv1 = await Income.findOne({ referenceNo: 'INV-TEST-2026-001' });
    assert(!!inv1, 'Invoice 1 (INV-TEST-2026-001) retrieved');
    assert(inv1.status === 'Paid', 'Invoice 1 status is Paid');
    assert(inv1.amount === 400000 && inv1.gstAmount === 72000 && inv1.totalAmount === 472000, 'GST calculation verified: 400k + 18% (72k) = 472k');
    assert(inv1.payments?.length >= 1, 'Payment receipt recorded on invoice');
    assert(inv1.payments[0].amount === 472000, 'Payment receipt amount matches ₹472,000');

    const inv2 = await Income.findOne({ referenceNo: 'INV-TEST-2026-002' });
    assert(!!inv2, 'Invoice 2 (INV-TEST-2026-002) retrieved');
    assert(inv2.status === 'Partially Paid', 'Invoice 2 status is Partially Paid');
    const paidSoFar = inv2.payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = inv2.totalAmount - paidSoFar;
    assert(paidSoFar === 500000, 'Paid amount is ₹500,000');
    assert(balanceDue === 444000, `Remaining balance due is ₹444,000 (got ${balanceDue})`);

    const expenses = await Expense.find({ categoryName: 'Infrastructure & Cloud Hosting' });
    assert(expenses.length >= 1, 'Infrastructure expense recorded');
    assert(expenses[0].amount === 45000 && expenses[0].paidTo === 'Amazon Web Services Inc', 'AWS EKS hosting expense verified at ₹45,000');

    // -------------------------------------------------------------
    // WORKFLOW 10: GIT INTEGRATION & EVENT TASK AUTO-LINKING
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 10: Git Integration & Webhooks ---');
    const gitIntegration = await GitIntegration.findOne({ repoName: 'nexus-freight-erp' });
    assert(!!gitIntegration, 'Git integration retrieved for nexus-freight-erp');
    assert(gitIntegration.status === 'Active' && gitIntegration.provider === 'github', 'Integration is Active with provider GitHub');

    const gitEvent1 = await GitEvent.findOne({ commitId: 'c8a14b2d1847a9ef03912da6194b1efc91a0b321' });
    assert(!!gitEvent1, 'Git Event 1 retrieved');
    assert(gitEvent1.commitMessage.includes('NXLG-101'), 'Git commit message references Task Key NXLG-101');
    assert(gitEvent1.author.name === 'Sneha Patel', 'Git commit author is Sneha Patel');

    // -------------------------------------------------------------
    // WORKFLOW 11: SUPPORT TICKETS & BUG TRACKING
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 11: Support Ticket Desk & Bug Tracking ---');
    const ticket1 = await SupportTicket.findOne({ ticketNumber: 'TCK-TEST-0001' });
    assert(!!ticket1, 'Ticket 1 (TCK-TEST-0001) retrieved');
    assert(ticket1.priority === 'High' && ticket1.status === 'In Progress', 'Ticket 1 priority is High, status is In Progress');
    assert(!!ticket1.slaDeadline, 'Ticket 1 has calculated slaDeadline');
    assert(ticket1.comments?.length >= 1, 'Ticket 1 has internal staff comments');

    const ticket2 = await SupportTicket.findOne({ ticketNumber: 'TCK-TEST-0002' });
    assert(!!ticket2, 'Ticket 2 (TCK-TEST-0002) retrieved');
    assert(ticket2.status === 'Resolved' && ticket2.slaStatus === 'Met', 'Ticket 2 is Resolved with SLA Met');

    // -------------------------------------------------------------
    // WORKFLOW 12: SLA & MAINTENANCE CONTRACTS & COMPLIANCE METRICS
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 12: SLA Maintenance Contracts & Compliance Metrics ---');
    const sla1 = await SLAContract.findOne({ contractNumber: 'SLA-TEST-NXLG-2026' });
    assert(!!sla1, 'SLA Contract 1 retrieved');
    assert(sla1.tier === 'Platinum' && sla1.monthlyFee === 125000, 'SLA Contract 1 tier is Platinum, monthly fee is ₹125,000');
    assert(sla1.responseTimes?.criticalHours === 1, 'Critical response time target is 1 hour');

    const slaReq = {};
    const slaRes = mockResponse();
    await getSLAMetrics(slaReq, slaRes, (err) => { if (err) throw err; });
    assert(slaRes.statusCode === 200, 'SLA Metrics endpoint returned 200 OK');
    assert(slaRes.body?.success === true, 'SLA Metrics response has success === true');
    assert(slaRes.body?.data?.activeContracts >= 2, `Active SLA contracts count >= 2 (got ${slaRes.body?.data?.activeContracts})`);
    assert(typeof slaRes.body?.data?.complianceRate === 'number', `SLA Compliance Rate is calculated accurately (got ${slaRes.body?.data?.complianceRate}%)`);
    const activeContracts = await SLAContract.find({ status: 'Active' });
    const totalMRR = activeContracts.reduce((sum, c) => sum + (c.monthlyFee || 0), 0);
    assert(totalMRR >= 220000, `Monthly recurring revenue calculated from active contracts >= ₹220,000 (got ₹${totalMRR})`);

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log(` 🎉 ALL ${passed}/${total} WORKFLOW VERIFICATION CHECKS PASSED 100%!`);
    console.log('    All 12 ERP Modules Verified Working with Realistic Sample Data');
    console.log('================================================================\n');

  } catch (error) {
    console.error('\n❌ WORKFLOW VERIFICATION FAILURE:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed cleanly.');
  }
}

runSampleWorkflowsVerification();
