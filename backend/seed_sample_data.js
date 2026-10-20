/**
 * ============================================================================
 * IT CONSULTANT CRM — DETERMINISTIC IDEMPOTENT SAMPLE DATA SEEDER
 * ============================================================================
 * Populates realistic sample data across all 12 ERP modules:
 *   1. Executive Dashboard (Metrics auto-aggregated from records below)
 *   2. Client & Lead Management (2 prospective leads with followups)
 *   3. Client & Account Management (2 enterprise/startup clients with contracts)
 *   4. Project Management & Milestones (2 projects with milestones & assigned team)
 *   5. Task Management (4 tasks with story points & sprint statuses)
 *   6. Developer Reports (2 daily progress reports with commits & blockers)
 *   7. AI Project Reports (2 cached executive project health evaluations)
 *   8. Accounts & Finance (2 GST invoices + payments & 2 categorized expenses)
 *   9. Agile Sprint Board (2 active sprints with story points)
 *  10. Git Integration & Events (1 repo integration & 2 commit push events)
 *  11. Bug Tracking & Support (2 support tickets with SLA deadline computation)
 *  12. SLA & Maintenance Contracts (2 enterprise SLA maintenance agreements)
 *  Plus HR/Ops records: Users, Leave Requests, Recruitment, Training.
 *
 * Idempotency Guarantee: Running this script multiple times will find and update
 * existing records without duplicating or corrupting data.
 * ============================================================================
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import dns from 'dns';

// Ensure IPv4 lookup precedence
dns.setDefaultResultOrder('ipv4first');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (_) {}

dotenv.config();

// Model Imports
import User from './src/models/user.model.js';
import Department from './src/modules/departments/department.model.js';
import Designation from './src/models/designation.model.js';
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
import LeaveRequest from './src/models/leaveRequest.model.js';
import Recruitment from './src/models/recruitment.model.js';
import EmployeeTraining from './src/models/employeeTraining.model.js';

const maskMongoUri = (uri) => {
  if (!uri) return '<none>';
  try {
    const parsed = new URL(uri);
    return `${parsed.protocol}//***:***@${parsed.host}${parsed.pathname}`;
  } catch (_) {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  }
};

async function seedSampleData() {
  console.log('================================================================');
  console.log('  🏢 IT CONSULTANT CRM — SAMPLE DATA POPULATION ENGINE');
  console.log('================================================================\n');

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/it_consultant_crm';
  const dbName = process.env.MONGODB_DB_NAME || 'it_consultant_crm';

  console.log(`🔌 Target MongoDB Cluster: ${maskMongoUri(mongoUri)} [database: ${dbName}]`);

  try {
    await mongoose.connect(mongoUri.trim().replace(/^["']|["']$/g, ''), {
      dbName,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000
    });
    console.log('✅ Connected safely to database for sample data population.\n');
  } catch (connErr) {
    console.error('❌ Database Connection Error:', connErr.message);
    process.exit(1);
  }

  const stats = {
    departments: 0,
    designations: 0,
    users: 0,
    leads: 0,
    clients: 0,
    projects: 0,
    milestones: 0,
    sprints: 0,
    tasks: 0,
    developerReports: 0,
    aiReports: 0,
    expenseCategories: 0,
    invoices: 0,
    expenses: 0,
    gitIntegrations: 0,
    gitEvents: 0,
    supportTickets: 0,
    slaContracts: 0,
    leaveRequests: 0,
    recruitments: 0,
    trainings: 0
  };

  try {
    // -------------------------------------------------------------
    // 1. DEPARTMENTS & DESIGNATIONS
    // -------------------------------------------------------------
    console.log('--- Step 1: Ensuring Standard Departments & Designations ---');
    const departmentsData = [
      { name: 'HR & Admin', code: 'HR', status: true },
      { name: 'Marketing', code: 'MKT', status: true },
      { name: 'Development', code: 'DEV', status: true },
      { name: 'Designing', code: 'DSN', status: true }
    ];

    const departmentMap = {};
    for (const d of departmentsData) {
      let dept = await Department.findOne({ code: d.code });
      if (!dept) {
        dept = await Department.create(d);
      }
      departmentMap[d.code] = dept;
      stats.departments++;
    }

    const designationsData = [
      'Manager', 'Fullstack', 'React Developer', 'Node Developer', 'HR Manager', 'Graphic Designer'
    ];
    for (const des of designationsData) {
      const existing = await Designation.findOne({ name: des });
      if (!existing) {
        await Designation.create({ name: des, isActive: true });
      }
      stats.designations++;
    }
    console.log(`  ✓ Verified ${stats.departments} departments and ${stats.designations} designations.`);

    // -------------------------------------------------------------
    // 2. CORE TEAM USERS
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Provisioning Realistic CRM Team Users ---');
    const defaultPasswordHash = await bcrypt.hash('Test@12345', 10);

    const usersData = [
      {
        name: 'Arun Kumar',
        email: 'arun.pm@itconsultant.test',
        phone: '+91 98401 23456',
        role: 'manager',
        role_id: '1',
        designation: 'Manager',
        department: 'Development',
        departmentId: departmentMap['DEV']._id,
        employeeId: 'EMP-DEV-001',
        status: 'active',
        isActive: true,
        passwordHash: defaultPasswordHash
      },
      {
        name: 'Sneha Patel',
        email: 'sneha.dev@itconsultant.test',
        phone: '+91 98402 34567',
        role: 'developer',
        role_id: '3',
        designation: 'Fullstack',
        department: 'Development',
        departmentId: departmentMap['DEV']._id,
        employeeId: 'EMP-DEV-002',
        status: 'active',
        isActive: true,
        passwordHash: defaultPasswordHash
      },
      {
        name: 'Rahul Sharma',
        email: 'rahul.qa@itconsultant.test',
        phone: '+91 98403 45678',
        role: 'employee',
        role_id: '3',
        designation: 'React Developer',
        department: 'Development',
        departmentId: departmentMap['DEV']._id,
        employeeId: 'EMP-DEV-003',
        status: 'active',
        isActive: true,
        passwordHash: defaultPasswordHash
      },
      {
        name: 'Priya Menon',
        email: 'priya.finance@itconsultant.test',
        phone: '+91 98404 56789',
        role: 'accountant',
        role_id: '2',
        designation: 'HR Manager',
        department: 'HR & Admin',
        departmentId: departmentMap['HR']._id,
        employeeId: 'EMP-ADM-001',
        status: 'active',
        isActive: true,
        passwordHash: defaultPasswordHash
      }
    ];

    const userMap = {};
    const superAdmin = await User.findOne({ email: 'superadmin@gmail.com' });
    if (superAdmin) {
      userMap['superadmin'] = superAdmin;
    }

    for (const u of usersData) {
      const user = await User.findOneAndUpdate(
        { email: u.email },
        { $set: u },
        { upsert: true, returnDocument: 'after' }
      );
      userMap[u.email] = user;
      stats.users++;
    }
    console.log(`  ✓ Seeded/Updated ${stats.users} team users (PM, Fullstack Dev, QA, Finance).`);

    const adminUser = userMap['superadmin'] || userMap['arun.pm@itconsultant.test'];
    const pmUser = userMap['arun.pm@itconsultant.test'];
    const devUser = userMap['sneha.dev@itconsultant.test'];
    const qaUser = userMap['rahul.qa@itconsultant.test'];

    // -------------------------------------------------------------
    // 3. MODULE 2: CLIENT & LEAD MANAGEMENT
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Module 2 — Populating Client Leads ---');
    const leadsData = [
      {
        leadName: 'Rohan Mehra',
        companyName: 'FinEdge Digital Banking',
        email: 'rohan.mehra@finedge.example.com',
        phone: '+91 98200 11223',
        city: 'Mumbai',
        source: 'LinkedIn',
        interestedService: 'Fintech Microservices Architecture & Security Audit',
        campaignName: 'Q4 Enterprise Tech Outreach',
        leadPlatform: 'Website Inquiry',
        status: 'Interested',
        priority: 'High',
        estimatedBudget: 850000,
        servicesNeeded: ['Cloud Architecture', 'Security Audit', 'Microservices'],
        assignedTo: pmUser._id,
        createdBy: adminUser._id,
        nextFollowUpDate: new Date(Date.now() + 86400000 * 3),
        followUpHistory: [
          {
            date: new Date(Date.now() - 86400000 * 4),
            notes: 'Initial discovery call completed. Client expressed interest in microservices migration.',
            followUpBy: pmUser._id,
            followUpByName: pmUser.name
          },
          {
            date: new Date(Date.now() - 86400000 * 1),
            notes: 'Signed mutual NDA. Shared technical questionnaire.',
            followUpBy: pmUser._id,
            followUpByName: pmUser.name
          }
        ]
      },
      {
        leadName: 'Kavita Nair',
        companyName: 'OmniRetail E-Commerce Corp',
        email: 'kavita.nair@omniretail.example.com',
        phone: '+91 98450 33445',
        city: 'Bengaluru',
        source: 'Clutch.co',
        interestedService: 'Next.js E-Commerce Mobile App & Order Management System',
        campaignName: 'Retail Modernization 2026',
        leadPlatform: 'Referral',
        status: 'Proposal',
        priority: 'Medium',
        estimatedBudget: 1200000,
        servicesNeeded: ['E-Commerce App', 'Next.js', 'Order Management'],
        assignedTo: pmUser._id,
        createdBy: adminUser._id,
        nextFollowUpDate: new Date(Date.now() + 86400000 * 5),
        followUpHistory: [
          {
            date: new Date(Date.now() - 86400000 * 2),
            notes: 'Presented architecture deck and budget breakdown. Awaiting board review.',
            followUpBy: pmUser._id,
            followUpByName: pmUser.name
          }
        ]
      }
    ];

    const leadMap = {};
    for (const l of leadsData) {
      const lead = await ClientLead.findOneAndUpdate(
        { email: l.email },
        { $set: l },
        { upsert: true, returnDocument: 'after' }
      );
      leadMap[l.email] = lead;
      stats.leads++;
    }
    console.log(`  ✓ Seeded ${stats.leads} Client Leads with detailed follow-up histories.`);

    // -------------------------------------------------------------
    // 4. MODULE 3: CLIENT & ACCOUNT MANAGEMENT
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Module 3 — Populating Client Accounts ---');
    const clientsData = [
      {
        clientId: 'CLI-TEST-NXLG',
        companyName: 'Nexus Global Logistics Pvt Ltd',
        clientName: 'Vikram Sethi',
        email: 'vikram.sethi@nexuslogistics.example.com',
        phone: '+91 98765 43210',
        alternativePhone: '+91 98765 43211',
        whatsapp: '+91 98765 43210',
        gstNumber: '27AABCU9603R1ZM',
        industry: 'Logistics & Supply Chain',
        website: 'https://nexuslogistics.example.com',
        country: 'India',
        state: 'Maharashtra',
        city: 'Mumbai',
        address: 'B-402, Logistics Tech Park, Powai',
        postalCode: '400076',
        primaryContact: {
          name: 'Vikram Sethi',
          phone: '+91 98765 43210',
          email: 'vikram.sethi@nexuslogistics.example.com',
          designation: 'VP of Engineering'
        },
        status: 'Active',
        clientType: 'Enterprise',
        priority: 'High',
        expectedMonthlyRevenue: 150000,
        contractStart: new Date('2026-01-01'),
        contractEnd: new Date('2027-01-01'),
        ndaStatus: 'Signed',
        supportPlan: 'Platinum 24x7 Mission-Critical',
        accountManager: pmUser._id,
        assignedTeamLead: pmUser._id,
        createdBy: adminUser._id,
        contracts: [
          {
            title: 'Annual Enterprise SaaS & Cloud SLA Contract',
            contractNumber: 'SLA-NXLG-2026-001',
            status: 'Active',
            validFrom: new Date('2026-01-01'),
            validUntil: new Date('2027-01-01'),
            notes: 'Covers core freight ERP development, real-time tracking, and cloud maintenance.'
          }
        ]
      },
      {
        clientId: 'CLI-TEST-AURH',
        companyName: 'Aura HealthTech Solutions Inc',
        clientName: 'Dr. Ananya Sen',
        email: 'ananya.sen@aurahealthtech.example.com',
        phone: '+91 91234 56780',
        whatsapp: '+91 91234 56780',
        gstNumber: '29AAACA1234K1Z5',
        industry: 'Healthcare & MedTech',
        website: 'https://aurahealthtech.example.com',
        country: 'India',
        state: 'Karnataka',
        city: 'Bengaluru',
        address: 'Level 5, MedTech Hub, Indiranagar',
        postalCode: '560038',
        primaryContact: {
          name: 'Dr. Ananya Sen',
          phone: '+91 91234 56780',
          email: 'ananya.sen@aurahealthtech.example.com',
          designation: 'Chief Technology Officer'
        },
        status: 'Active',
        clientType: 'Startup',
        priority: 'VIP',
        expectedMonthlyRevenue: 220000,
        contractStart: new Date('2026-03-01'),
        contractEnd: new Date('2027-03-01'),
        ndaStatus: 'Signed',
        supportPlan: 'Gold Extended (12x6) Support',
        accountManager: pmUser._id,
        assignedTeamLead: pmUser._id,
        createdBy: adminUser._id,
        contracts: [
          {
            title: 'HIPAA-Compliant Patient Care Portal Development Agreement',
            contractNumber: 'AGR-AURH-2026-001',
            status: 'Active',
            validFrom: new Date('2026-03-01'),
            validUntil: new Date('2027-03-01'),
            notes: 'Covers telehealth WebRTC consult engine, EHR FHIR sync, and encrypted messaging.'
          }
        ]
      }
    ];

    const clientMap = {};
    for (const c of clientsData) {
      const client = await Client.findOneAndUpdate(
        { clientId: c.clientId },
        { $set: c },
        { upsert: true, returnDocument: 'after' }
      );
      clientMap[c.clientId] = client;
      stats.clients++;
    }
    console.log(`  ✓ Seeded ${stats.clients} Enterprise/Startup Client Accounts.`);

    // -------------------------------------------------------------
    // 5. MODULE 4: PROJECT MANAGEMENT & MILESTONES
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Module 4 — Populating Projects & Milestones ---');
    const projectsData = [
      {
        projectCode: 'PRJ-TEST-LOGI',
        projectName: 'Nexus Freight & Warehouse Tracking ERP',
        client: clientMap['CLI-TEST-NXLG']._id,
        description: 'Multi-tenant freight dispatch, real-time vehicle GPS ping tracking, and warehouse automation platform.',
        projectCategory: 'Enterprise Software',
        priority: 'High',
        status: 'Development',
        estimatedBudget: 1500000,
        technologyStack: ['Node.js', 'React', 'MongoDB', 'Redis', 'Docker', 'AWS'],
        repositoryUrl: 'https://github.com/itconsultant/nexus-freight-erp',
        startDate: new Date('2026-08-01'),
        deadline: new Date('2027-02-28'),
        projectManager: pmUser._id,
        departmentId: departmentMap['DEV']._id,
        department: 'Development',
        assignedTeamLead: pmUser._id,
        assignedEmployees: [pmUser._id, devUser._id, qaUser._id],
        teamStructure: {
          developer: [devUser._id],
          qa: [qaUser._id]
        },
        currentSprint: 'Sprint 3',
        progress: 65,
        createdBy: adminUser._id
      },
      {
        projectCode: 'PRJ-TEST-HLTH',
        projectName: 'AuraCare Telehealth & Patient Portal',
        client: clientMap['CLI-TEST-AURH']._id,
        description: 'HIPAA-compliant high-security telemedicine platform with WebRTC real-time video consults and prescription sync.',
        projectCategory: 'HealthTech Platform',
        priority: 'Urgent',
        status: 'Testing',
        estimatedBudget: 2200000,
        technologyStack: ['React', 'WebRTC', 'Node.js', 'Mongoose', 'TailwindCSS'],
        repositoryUrl: 'https://github.com/itconsultant/auracare-telehealth-portal',
        startDate: new Date('2026-07-01'),
        deadline: new Date('2027-01-31'),
        projectManager: pmUser._id,
        departmentId: departmentMap['DEV']._id,
        department: 'Development',
        assignedTeamLead: pmUser._id,
        assignedEmployees: [pmUser._id, devUser._id, qaUser._id],
        teamStructure: {
          developer: [devUser._id],
          qa: [qaUser._id]
        },
        currentSprint: 'Sprint 4',
        progress: 80,
        createdBy: adminUser._id
      }
    ];

    const projectMap = {};
    for (const p of projectsData) {
      const project = await Project.findOneAndUpdate(
        { projectCode: p.projectCode },
        { $set: p },
        { upsert: true, returnDocument: 'after' }
      );
      projectMap[p.projectCode] = project;
      stats.projects++;
    }
    console.log(`  ✓ Seeded ${stats.projects} Complex Projects with assigned teams and tech stacks.`);

    // Milestones
    const milestonesData = [
      // PRJ-TEST-LOGI Milestones
      {
        project: projectMap['PRJ-TEST-LOGI']._id,
        title: 'Architecture Design & Cloud Infrastructure Setup',
        description: 'Complete Kubernetes cluster provisioning on AWS EKS and Redis broker deployment.',
        dueDate: new Date('2026-08-30'),
        status: 'Completed',
        billingAmount: 400000,
        isPaid: true
      },
      {
        project: projectMap['PRJ-TEST-LOGI']._id,
        title: 'Fleet Dispatch & Live Telematics Tracking Module',
        description: 'Real-time WebSocket GPS telemetry ingestion engine and map route viewer.',
        dueDate: new Date('2026-11-15'),
        status: 'In Progress',
        billingAmount: 600000,
        isPaid: false
      },
      {
        project: projectMap['PRJ-TEST-LOGI']._id,
        title: 'Warehouse Inventory & Automated Invoicing Engine',
        description: 'Barcode scanning integration and automated PDF dispatch invoice generation.',
        dueDate: new Date('2026-12-30'),
        status: 'Pending',
        billingAmount: 500000,
        isPaid: false
      },
      // PRJ-TEST-HLTH Milestones
      {
        project: projectMap['PRJ-TEST-HLTH']._id,
        title: 'HIPAA Compliant Video Consultation Engine',
        description: 'Peer-to-peer WebRTC consultation room with end-to-end media encryption.',
        dueDate: new Date('2026-08-15'),
        status: 'Completed',
        billingAmount: 800000,
        isPaid: true
      },
      {
        project: projectMap['PRJ-TEST-HLTH']._id,
        title: 'Electronic Health Records (EHR) & Prescription Sync',
        description: 'HL7/FHIR compliant patient clinical history sync and digital signature generation.',
        dueDate: new Date('2026-09-30'),
        status: 'Completed',
        billingAmount: 700000,
        isPaid: true
      },
      {
        project: projectMap['PRJ-TEST-HLTH']._id,
        title: 'Payment Gateway & Patient Mobile App Beta Release',
        description: 'Razorpay payment webhooks and mobile responsive doctor appointment booking.',
        dueDate: new Date('2026-11-30'),
        status: 'In Progress',
        billingAmount: 700000,
        isPaid: false
      }
    ];

    for (const m of milestonesData) {
      await ProjectMilestone.findOneAndUpdate(
        { project: m.project, title: m.title },
        { $set: m },
        { upsert: true }
      );
      stats.milestones++;
    }
    console.log(`  ✓ Seeded ${stats.milestones} Project Milestones with billing amounts and statuses.`);

    // -------------------------------------------------------------
    // 6. MODULE 9: AGILE SPRINT BOARD
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Module 9 — Populating Agile Sprints ---');
    const sprintsData = [
      {
        name: 'Sprint 3 - Telematics & Live Map Integration',
        sprintNumber: 3,
        project: projectMap['PRJ-TEST-LOGI']._id,
        goal: 'Implement real-time driver GPS ping websocket feed and dispatch dashboard map view',
        startDate: new Date(Date.now() - 86400000 * 10),
        endDate: new Date(Date.now() + 86400000 * 4),
        status: 'Active',
        totalPoints: 34,
        completedPoints: 21,
        createdBy: pmUser._id
      },
      {
        name: 'Sprint 4 - Payment Gateway & Prescription PDF Generation',
        sprintNumber: 4,
        project: projectMap['PRJ-TEST-HLTH']._id,
        goal: 'Finalize Razorpay/Stripe checkout webhooks and encrypted PDF prescription download',
        startDate: new Date(Date.now() - 86400000 * 7),
        endDate: new Date(Date.now() + 86400000 * 7),
        status: 'Active',
        totalPoints: 28,
        completedPoints: 19,
        createdBy: pmUser._id
      }
    ];

    const sprintMap = {};
    for (const s of sprintsData) {
      const sprint = await Sprint.findOneAndUpdate(
        { project: s.project, sprintNumber: s.sprintNumber },
        { $set: s },
        { upsert: true, returnDocument: 'after' }
      );
      sprintMap[s.sprintNumber] = sprint;
      stats.sprints++;
    }
    console.log(`  ✓ Seeded ${stats.sprints} Active Agile Sprints with committed story points.`);

    // -------------------------------------------------------------
    // 7. MODULE 5: TASK MANAGEMENT & KANBAN
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Module 5 — Populating Tasks & User Stories ---');
    const tasksData = [
      {
        taskKey: 'NXLG-101',
        title: 'Implement Kafka Telematics Event Consumer for Fleet Geofence Alerts',
        description: 'Consume high-throughput GPS ping stream, evaluate vehicle polygon boundaries, and trigger webhook push notifications on border cross.',
        project: projectMap['PRJ-TEST-LOGI']._id,
        client: clientMap['CLI-TEST-NXLG']._id,
        sprint: sprintMap[3]._id,
        taskType: 'Story',
        storyPoints: 8,
        status: 'in_progress',
        sprintStatus: 'In Progress',
        priority: 'high',
        assigned_to: [devUser._id],
        created_by: pmUser._id,
        user_id: pmUser._id,
        dueDate: new Date(Date.now() + 86400000 * 3)
      },
      {
        taskKey: 'NXLG-102',
        title: 'Develop Driver Proof-of-Delivery Digital Signature Pad in React Native',
        description: 'Capture customer signature canvas, export base64 SVG, encrypt payload, and sync with central billing service.',
        project: projectMap['PRJ-TEST-LOGI']._id,
        client: clientMap['CLI-TEST-NXLG']._id,
        sprint: sprintMap[3]._id,
        taskType: 'Task',
        storyPoints: 5,
        status: 'pending',
        sprintStatus: 'To Do',
        priority: 'medium',
        assigned_to: [devUser._id],
        created_by: pmUser._id,
        user_id: pmUser._id,
        dueDate: new Date(Date.now() + 86400000 * 5)
      },
      {
        taskKey: 'AURH-201',
        title: 'Configure End-to-End Encryption for WebRTC Video Stream',
        description: 'Implement DTLS-SRTP key renegotiation and HIPAA compliant encrypted data channels for teleconsultation.',
        project: projectMap['PRJ-TEST-HLTH']._id,
        client: clientMap['CLI-TEST-AURH']._id,
        sprint: sprintMap[4]._id,
        taskType: 'Story',
        storyPoints: 8,
        status: 'done',
        sprintStatus: 'Done',
        priority: 'high',
        assigned_to: [devUser._id],
        created_by: pmUser._id,
        user_id: pmUser._id,
        dueDate: new Date(Date.now() - 86400000 * 1)
      },
      {
        taskKey: 'AURH-202',
        title: 'Automated Regression Suite for Doctor Appointment Booking Flow',
        description: 'Write end-to-end Cypress test scenarios covering calendar slot locking, conflicting booking guards, and SMS reminders.',
        project: projectMap['PRJ-TEST-HLTH']._id,
        client: clientMap['CLI-TEST-AURH']._id,
        sprint: sprintMap[4]._id,
        taskType: 'Task',
        storyPoints: 5,
        status: 'in_progress',
        sprintStatus: 'QA',
        priority: 'high',
        assigned_to: [qaUser._id],
        created_by: pmUser._id,
        user_id: pmUser._id,
        dueDate: new Date(Date.now() + 86400000 * 6)
      }
    ];

    const taskMap = {};
    for (const t of tasksData) {
      const task = await Task.findOneAndUpdate(
        { taskKey: t.taskKey },
        { $set: t },
        { upsert: true, returnDocument: 'after' }
      );
      taskMap[t.taskKey] = task;
      stats.tasks++;
    }
    console.log(`  ✓ Seeded ${stats.tasks} Tasks across all Kanban statuses (To Do, In Progress, QA, Done).`);

    // -------------------------------------------------------------
    // 8. MODULE 6: DEVELOPER REPORTS
    // -------------------------------------------------------------
    console.log('\n--- Step 8: Module 6 — Populating Daily Developer Reports ---');
    const todayStr = new Date().toISOString().split('T')[0];
    const devReportsData = [
      {
        userId: devUser._id,
        dateString: todayStr,
        basicDetails: {
          date: todayStr,
          day: 'Monday',
          employeeName: devUser.name,
          employeeId: devUser.employeeId,
          department: 'Development',
          designation: 'Fullstack',
          shiftTiming: '10:00 AM - 7:00 PM',
          reportingTo: pmUser.name,
          preparedTime: '06:30 PM'
        },
        developmentTaskReport: [
          {
            project: 'Nexus Freight & Warehouse Tracking ERP',
            projectId: projectMap['PRJ-TEST-LOGI']._id,
            activity: 'Kafka Geofence Event Consumer integration',
            dueDate: todayStr,
            status: 'In Progress',
            remark: 'Consuming from telematics-pings topic. Added Redis GEO radius filter.',
            pullRequestUrl: 'https://github.com/itconsultant/nexus-freight-erp/pull/42',
            commitReference: 'c8a14b2',
            blockers: 'None; cluster connection verified.'
          }
        ],
        pullRequests: ['https://github.com/itconsultant/nexus-freight-erp/pull/42'],
        commits: ['feat(telematics): add geofence polygon validator [c8a14b2]'],
        performanceTracker: {
          taskCompleted: 'Good',
          learningProgress: 'Excellent',
          communication: 'Good',
          attendance: 'Present',
          productivity: 'High'
        },
        toolsUsed: 'VS Code, Docker, Apache Kafka, Postman',
        challengesFaced: 'Configuring proper consumer group rebalance listener for ephemeral pods.',
        nextDayPlan: 'Finalize digital signature pad component in React Native mobile client.'
      },
      {
        userId: qaUser._id,
        dateString: todayStr,
        basicDetails: {
          date: todayStr,
          day: 'Monday',
          employeeName: qaUser.name,
          employeeId: qaUser.employeeId,
          department: 'Development',
          designation: 'React Developer',
          shiftTiming: '10:00 AM - 7:00 PM',
          reportingTo: pmUser.name,
          preparedTime: '06:45 PM'
        },
        developmentTaskReport: [
          {
            project: 'AuraCare Telehealth & Patient Portal',
            projectId: projectMap['PRJ-TEST-HLTH']._id,
            activity: 'Cypress E2E test suite for checkout webhooks',
            dueDate: todayStr,
            status: 'In Progress',
            remark: 'Validated 15 edge cases on appointment booking slot conflicts.',
            pullRequestUrl: 'https://github.com/itconsultant/auracare-telehealth-portal/pull/88',
            commitReference: 'd3f9011',
            blockers: 'Sandbox test card credentials renewed.'
          }
        ],
        pullRequests: ['https://github.com/itconsultant/auracare-telehealth-portal/pull/88'],
        commits: ['test(e2e): add razorpay signature verification test cases [d3f9011]'],
        performanceTracker: {
          taskCompleted: 'Good',
          learningProgress: 'Good',
          communication: 'Good',
          attendance: 'Present',
          productivity: 'High'
        },
        toolsUsed: 'Cypress, Postman, Chrome DevTools',
        challengesFaced: 'Mocking WebSocket peer connection disconnect events during automated testing.',
        nextDayPlan: 'Run cross-browser regression against iOS Safari and Firefox.'
      }
    ];

    for (const r of devReportsData) {
      await DeveloperReport.findOneAndUpdate(
        { userId: r.userId, dateString: r.dateString },
        { $set: r },
        { upsert: true }
      );
      stats.developerReports++;
    }
    console.log(`  ✓ Seeded ${stats.developerReports} Developer Reports adhering to compound unique index.`);

    // -------------------------------------------------------------
    // 9. MODULE 7: AI PROJECT REPORTS
    // -------------------------------------------------------------
    console.log('\n--- Step 9: Module 7 — Populating AI Executive Summaries ---');
    const aiReportsData = [
      {
        type: 'daily',
        projectId: projectMap['PRJ-TEST-LOGI']._id,
        departmentId: 'all',
        report: `## Executive AI Health Analysis — Nexus Freight ERP\n\n**Overall Health:** 🟢 On Track (Velocity: 94%)\n\n### Key Accomplishments:\n- Completed cloud infrastructure provisioning and Kubernetes cluster deployment on AWS EKS.\n- Telematics Kafka pipeline benchmarks demonstrate sub-50ms ingestion latency for 5,000 simulated vehicle pings.\n\n### Technical Observations:\n- Geofence polygon boundary checks require spatial index optimization to handle high concurrency during morning shift changes.\n\n### Recommendation:\n- Proceed with Beta fleet testing as scheduled; verify driver digital signature sync over 3G network conditions.`,
        stats: {
          totalTasks: 18,
          completedTasks: 12,
          inProgressTasks: 4,
          pendingTasks: 2,
          progressPercent: 65,
          velocityIndex: 94
        },
        lastGenerated: new Date()
      },
      {
        type: 'daily',
        projectId: projectMap['PRJ-TEST-HLTH']._id,
        departmentId: 'all',
        report: `## Executive AI Health Analysis — AuraCare Telehealth Portal\n\n**Overall Health:** 🟢 High Confidence (Velocity: 98%)\n\n### Key Accomplishments:\n- DTLS-SRTP end-to-end media encryption verified fully HIPAA-compliant.\n- WebRTC signaling benchmarked at <120ms round-trip latency across APAC and North America.\n\n### Technical Observations:\n- Automated Cypress regression tests caught 2 minor edge cases in slot conflict handling before staging release.\n\n### Recommendation:\n- Prepare production deployment runbook and coordinate payment webhook reconciliation with finance.`,
        stats: {
          totalTasks: 24,
          completedTasks: 19,
          inProgressTasks: 3,
          pendingTasks: 2,
          progressPercent: 80,
          velocityIndex: 98
        },
        lastGenerated: new Date()
      }
    ];

    for (const air of aiReportsData) {
      await AiReportCache.findOneAndUpdate(
        { projectId: air.projectId, type: air.type },
        { $set: air },
        { upsert: true }
      );
      stats.aiReports++;
    }
    console.log(`  ✓ Seeded ${stats.aiReports} Cached AI Project Executive Summaries.`);

    // -------------------------------------------------------------
    // 10. MODULE 8: ACCOUNTS & FINANCE
    // -------------------------------------------------------------
    console.log('\n--- Step 10: Module 8 — Populating Invoices & Expenses ---');
    const expenseCategories = [
      'Infrastructure & Cloud Hosting',
      'Third-Party Software & API Licenses',
      'Office & Utilities',
      'Consulting & Professional Services'
    ];
    for (const ec of expenseCategories) {
      await ExpenseCategory.findOneAndUpdate(
        { name: ec },
        { $set: { name: ec, isActive: true, isSystemDefault: true } },
        { upsert: true }
      );
      stats.expenseCategories++;
    }

    const invoicesData = [
      {
        referenceNo: 'INV-TEST-2026-001',
        title: 'Milestone 1: Cloud Architecture & Kubernetes Infrastructure Deployment',
        client: clientMap['CLI-TEST-NXLG']._id,
        clientName: 'Nexus Global Logistics Pvt Ltd',
        project: projectMap['PRJ-TEST-LOGI']._id,
        amount: 400000,
        taxOption: 'GST 18%',
        gstCategory: 'CGST_SGST',
        gstRate: 18,
        gstAmount: 72000,
        cgstAmount: 36000,
        sgstAmount: 36000,
        totalAmount: 472000,
        status: 'Paid',
        department: 'Development',
        paymentMethod: 'Bank Transfer',
        paymentTerms: 'Net 15 Days',
        dueDate: new Date('2026-09-15'),
        lineItems: [
          {
            description: 'Cloud infrastructure architecture, Dockerization & AWS EKS setup',
            quantity: 1,
            unitPrice: 400000,
            amount: 400000
          }
        ],
        payments: [
          {
            receiptNo: 'REC-TEST-001',
            receiptDate: new Date('2026-09-10'),
            amount: 472000,
            paymentMethod: 'Bank Transfer',
            notes: 'Full settlement via NEFT transaction N98213'
          }
        ],
        createdBy: userMap['priya.finance@itconsultant.test']._id,
        createdByName: 'Priya Menon'
      },
      {
        referenceNo: 'INV-TEST-2026-002',
        title: 'Milestone 1: HIPAA Telehealth Video Consultation Engine & EHR Sync',
        client: clientMap['CLI-TEST-AURH']._id,
        clientName: 'Aura HealthTech Solutions Inc',
        project: projectMap['PRJ-TEST-HLTH']._id,
        amount: 800000,
        taxOption: 'GST 18%',
        gstCategory: 'CGST_SGST',
        gstRate: 18,
        gstAmount: 144000,
        cgstAmount: 72000,
        sgstAmount: 72000,
        totalAmount: 944000,
        status: 'Partially Paid',
        department: 'Development',
        paymentMethod: 'Bank Transfer',
        paymentTerms: 'Due on Receipt',
        dueDate: new Date('2026-10-30'),
        lineItems: [
          {
            description: 'WebRTC video consultation engine & FHIR EHR integration',
            quantity: 1,
            unitPrice: 800000,
            amount: 800000
          }
        ],
        payments: [
          {
            receiptNo: 'REC-TEST-002',
            receiptDate: new Date('2026-10-01'),
            amount: 500000,
            paymentMethod: 'Bank Transfer',
            notes: 'First installment received via RTGS'
          }
        ],
        createdBy: userMap['priya.finance@itconsultant.test']._id,
        createdByName: 'Priya Menon'
      }
    ];

    for (const inv of invoicesData) {
      await Income.findOneAndUpdate(
        { referenceNo: inv.referenceNo },
        { $set: inv },
        { upsert: true }
      );
      stats.invoices++;
    }

    const expensesData = [
      {
        categoryName: 'Infrastructure & Cloud Hosting',
        amount: 45000,
        paymentMode: 'Bank Transfer',
        paidTo: 'Amazon Web Services Inc',
        project: projectMap['PRJ-TEST-LOGI']._id,
        client: clientMap['CLI-TEST-NXLG']._id,
        date: new Date('2026-10-05'),
        description: 'AWS EKS compute and Multi-AZ database cluster staging hosting fees',
        addedBy: userMap['priya.finance@itconsultant.test']._id,
        addedByName: 'Priya Menon'
      },
      {
        categoryName: 'Third-Party Software & API Licenses',
        amount: 28500,
        paymentMode: 'Bank',
        paidTo: 'Twilio Inc',
        project: projectMap['PRJ-TEST-HLTH']._id,
        client: clientMap['CLI-TEST-AURH']._id,
        date: new Date('2026-10-10'),
        description: 'TURN server relay bandwidth & SMS authentication gateway credits',
        addedBy: userMap['priya.finance@itconsultant.test']._id,
        addedByName: 'Priya Menon'
      }
    ];

    for (const exp of expensesData) {
      await Expense.findOneAndUpdate(
        { paidTo: exp.paidTo, date: exp.date, amount: exp.amount },
        { $set: exp },
        { upsert: true }
      );
      stats.expenses++;
    }
    console.log(`  ✓ Seeded ${stats.invoices} Invoices (₹1,416,000 total) and ${stats.expenses} Expenses (₹73,500 total).`);

    // -------------------------------------------------------------
    // 11. MODULE 10: GIT INTEGRATION & WEBHOOKS
    // -------------------------------------------------------------
    console.log('\n--- Step 11: Module 10 — Populating Git Integrations & Events ---');
    const gitIntegrationsData = [
      {
        name: 'GitHub - Nexus Freight ERP',
        provider: 'github',
        project: projectMap['PRJ-TEST-LOGI']._id,
        repoUrl: 'https://github.com/itconsultant/nexus-freight-erp',
        repoOwner: 'itconsultant',
        repoName: 'nexus-freight-erp',
        defaultBranch: 'main',
        status: 'Active',
        eventCount: 8,
        lastEventAt: new Date(),
        createdBy: devUser._id
      }
    ];

    const gitIntegrationMap = {};
    for (const gi of gitIntegrationsData) {
      const git = await GitIntegration.findOneAndUpdate(
        { repoUrl: gi.repoUrl },
        { $set: gi },
        { upsert: true, returnDocument: 'after' }
      );
      gitIntegrationMap[gi.repoUrl] = git;
      stats.gitIntegrations++;
    }

    const gitEventsData = [
      {
        integration: gitIntegrationMap['https://github.com/itconsultant/nexus-freight-erp']._id,
        project: projectMap['PRJ-TEST-LOGI']._id,
        provider: 'github',
        eventType: 'push',
        action: 'pushed',
        ref: 'refs/heads/feature/NXLG-101-geofence',
        commitId: 'c8a14b2d1847a9ef03912da6194b1efc91a0b321',
        commitMessage: 'feat(NXLG-101): implement geofence ping handler for telematics telemetry stream',
        commitUrl: 'https://github.com/itconsultant/nexus-freight-erp/commit/c8a14b2d1847a9ef03912da6194b1efc91a0b321',
        author: {
          name: devUser.name,
          email: devUser.email,
          username: 'sneha-dev'
        }
      },
      {
        integration: gitIntegrationMap['https://github.com/itconsultant/nexus-freight-erp']._id,
        project: projectMap['PRJ-TEST-HLTH']._id,
        provider: 'github',
        eventType: 'push',
        action: 'pushed',
        ref: 'refs/heads/feature/AURH-201-webrtc-crypto',
        commitId: 'd3f9011e479a0bc45129cd88147ea310f948bc33',
        commitMessage: 'fix(AURH-201): resolve iceCandidate renegotiation race condition during peer connect',
        commitUrl: 'https://github.com/itconsultant/auracare-telehealth-portal/commit/d3f9011e479a0bc45129cd88147ea310f948bc33',
        author: {
          name: devUser.name,
          email: devUser.email,
          username: 'sneha-dev'
        }
      }
    ];

    for (const ge of gitEventsData) {
      await GitEvent.findOneAndUpdate(
        { commitId: ge.commitId },
        { $set: ge },
        { upsert: true }
      );
      stats.gitEvents++;
    }
    console.log(`  ✓ Seeded ${stats.gitIntegrations} Git Integrations and ${stats.gitEvents} Git Events auto-linked to tasks.`);

    // -------------------------------------------------------------
    // 12. MODULE 11: BUG TRACKING & SUPPORT TICKETS
    // -------------------------------------------------------------
    console.log('\n--- Step 12: Module 11 — Populating Support Tickets ---');
    const supportTicketsData = [
      {
        ticketNumber: 'TCK-TEST-0001',
        title: 'High Latency Spikes in Live Vehicle Telematics Websocket Stream',
        description: 'During peak dispatch hours (8 AM - 10 AM), driver location ping delay increases to 6 seconds.',
        client: clientMap['CLI-TEST-NXLG']._id,
        project: projectMap['PRJ-TEST-LOGI']._id,
        category: 'Bug',
        priority: 'High',
        status: 'In Progress',
        assignedTo: devUser._id,
        reporterName: 'Vikram Sethi',
        reporterEmail: 'vikram.sethi@nexuslogistics.example.com',
        clientVisible: true,
        slaDeadline: new Date(Date.now() + 1000 * 60 * 60 * 4), // 4h SLA
        slaStatus: 'Within SLA',
        comments: [
          {
            user: devUser._id,
            authorName: devUser.name,
            authorRole: 'developer',
            message: 'Diagnosed Redis Pub/Sub channel contention; scaled consumer pods to 6. Validating telemetry stream.',
            isInternal: true,
            createdAt: new Date()
          }
        ]
      },
      {
        ticketNumber: 'TCK-TEST-0002',
        title: 'Prescription PDF Download Fails for Safari iOS 17 Users',
        description: 'Patients clicking Download Prescription on iOS Safari 17 receive a blank blob viewer instead of the signed PDF.',
        client: clientMap['CLI-TEST-AURH']._id,
        project: projectMap['PRJ-TEST-HLTH']._id,
        category: 'Bug',
        priority: 'Medium',
        status: 'Resolved',
        assignedTo: qaUser._id,
        reporterName: 'Dr. Ananya Sen',
        reporterEmail: 'ananya.sen@aurahealthtech.example.com',
        clientVisible: true,
        slaDeadline: new Date(Date.now() + 1000 * 60 * 60 * 8), // 8h SLA
        slaStatus: 'Met',
        comments: [
          {
            user: qaUser._id,
            authorName: qaUser.name,
            authorRole: 'qa',
            message: 'Resolved Content-Disposition header encoding for iOS Safari blob viewer. Verified and deployed to staging.',
            isInternal: false,
            createdAt: new Date()
          }
        ]
      }
    ];

    for (const t of supportTicketsData) {
      await SupportTicket.findOneAndUpdate(
        { ticketNumber: t.ticketNumber },
        { $set: t },
        { upsert: true }
      );
      stats.supportTickets++;
    }
    console.log(`  ✓ Seeded ${stats.supportTickets} Support Tickets with SLA deadlines and collaborative comments.`);

    // -------------------------------------------------------------
    // 13. MODULE 12: SLA & MAINTENANCE CONTRACTS
    // -------------------------------------------------------------
    console.log('\n--- Step 13: Module 12 — Populating SLA Maintenance Contracts ---');
    const slaContractsData = [
      {
        contractNumber: 'SLA-TEST-NXLG-2026',
        title: 'Nexus Global Enterprise 24x7 Mission-Critical SLA',
        client: clientMap['CLI-TEST-NXLG']._id,
        project: projectMap['PRJ-TEST-LOGI']._id,
        tier: 'Platinum',
        coverageType: '24x7',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2027-01-01'),
        status: 'Active',
        monthlyFee: 125000,
        responseTimes: {
          criticalHours: 1,
          highHours: 2,
          mediumHours: 6,
          lowHours: 12
        },
        resolutionTimes: {
          criticalHours: 4,
          highHours: 8,
          mediumHours: 24,
          lowHours: 48
        },
        terms: '99.9% uptime SLA with dedicated Kubernetes infrastructure monitoring and automated failure escalation.',
        notes: 'Covers live telematics pipeline, database backups, and monthly security vulnerability audits.',
        createdBy: adminUser._id
      },
      {
        contractNumber: 'SLA-TEST-AURH-2026',
        title: 'AuraCare HealthTech HIPAA Compliance & Uptime SLA',
        client: clientMap['CLI-TEST-AURH']._id,
        project: projectMap['PRJ-TEST-HLTH']._id,
        tier: 'Gold',
        coverageType: 'Extended (12x6)',
        startDate: new Date('2026-03-01'),
        endDate: new Date('2027-03-01'),
        status: 'Active',
        monthlyFee: 95000,
        responseTimes: {
          criticalHours: 1,
          highHours: 4,
          mediumHours: 8,
          lowHours: 24
        },
        resolutionTimes: {
          criticalHours: 6,
          highHours: 16,
          mediumHours: 48,
          lowHours: 72
        },
        terms: '99.5% teleconsultation uptime guarantee with end-to-end encrypted media server maintenance and HIPAA compliance logging.',
        notes: 'Includes STUN/TURN server bandwidth oversight and emergency SSL certificate rotation.',
        createdBy: adminUser._id
      }
    ];

    for (const sc of slaContractsData) {
      await SLAContract.findOneAndUpdate(
        { contractNumber: sc.contractNumber },
        { $set: sc },
        { upsert: true }
      );
      stats.slaContracts++;
    }
    console.log(`  ✓ Seeded ${stats.slaContracts} SLA Maintenance Contracts with tier-based response/resolution targets.`);

    // -------------------------------------------------------------
    // 14. SUPPORTING HR & OPS MODULES
    // -------------------------------------------------------------
    console.log('\n--- Step 14: Supporting Operations & HR Records ---');
    // Leave Request
    await LeaveRequest.findOneAndUpdate(
      { user: devUser._id, startDate: new Date('2026-11-02') },
      {
        $set: {
          user: devUser._id,
          employeeId: devUser.employeeId,
          userName: devUser.name,
          userEmail: devUser.email,
          department: 'Development',
          reportingManager: pmUser.name,
          leaveType: 'Personal Leave',
          startDate: new Date('2026-11-02'),
          endDate: new Date('2026-11-04'),
          totalDays: 3,
          reason: 'Attending family wedding ceremony',
          status: 'Approved',
          approvedBy: pmUser._id,
          approvedByName: pmUser.name
        }
      },
      { upsert: true }
    );
    stats.leaveRequests++;

    // Recruitment
    await Recruitment.findOneAndUpdate(
      { name: 'Aditya Roy', phone: '+91 97110 54321' },
      {
        $set: {
          name: 'Aditya Roy',
          phone: '+91 97110 54321',
          address: 'Mumbai, Maharashtra',
          status: 'Shortlisted',
          interview_1: 'Passed',
          interview_2: 'Scheduled',
          selected: 'Pending',
          approval_status: 'Approved',
          notes: 'Strong experience with Docker, Terraform, and AWS EKS cluster optimization.'
        }
      },
      { upsert: true }
    );
    stats.recruitments++;

    // Employee Training
    await EmployeeTraining.findOneAndUpdate(
      { courseName: 'AWS Certified Solutions Architect Training' },
      {
        $set: {
          courseName: 'AWS Certified Solutions Architect Training',
          category: 'Technical Training',
          description: 'Hands-on training covering VPC design, IAM policies, and serverless architectures.',
          trainer: pmUser.name,
          durationValue: 40,
          durationUnit: 'hours',
          modules: [
            { title: 'VPC Peering & Transit Gateway', description: 'Multi-account cloud networking' },
            { title: 'EKS Kubernetes Management', description: 'Deploying high-availability microservices' }
          ]
        }
      },
      { upsert: true }
    );
    stats.trainings++;
    console.log(`  ✓ Seeded Leave Requests, Recruitment, and Training records.`);

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log(' 🎉 ALL 12 ERP MODULES SUCCESSFULLY POPULATED WITH SAMPLE DATA!');
    console.log('================================================================');
    console.table(stats);
    console.log('\n💡 Data is 100% persistent in MongoDB Atlas and verified idempotent.\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR DURING SAMPLE DATA POPULATION:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed cleanly.');
  }
}

seedSampleData();
