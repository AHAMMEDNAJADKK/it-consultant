import Project from '../models/project.model.js';
import ProjectMilestone from '../models/projectMilestone.model.js';
import Task from '../models/task.model.js';
import ClientLead from '../models/clientLead.model.js';
import Client from '../models/client.model.js';
import Income from '../models/income.model.js';
import Expense from '../models/expense.model.js';
import SupportTicket from '../models/supportTicket.model.js';
import SLAContract from '../models/slaContract.model.js';
import DeveloperReport from '../models/developerReport.model.js';
import User from '../models/user.model.js';

/**
 * GET /api/v1/dashboard/metrics
 * Comprehensive IT Services ERP Dashboard Metrics
 */
export const getERPDashboardMetrics = async (req, res, next) => {
  try {
    const now = new Date();
    const twoWeeksAhead = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const user = req.user || {};
    const roleStr = String(user.role || user.role_id || '').toLowerCase().trim();
    const isSuperAdminOrAdmin = user.isSuperAdmin === true || ['0', '1', '2', 'admin', 'hr', 'superadmin', 'md', 'coo'].includes(roleStr);
    const isClient = roleStr === 'client' || !!user.clientId || !!user.client;
    const clientId = user.clientId || user.client || null;
    const isDeveloper = !isSuperAdminOrAdmin && !isClient;
    const currentUserId = user.id || user._id;

    // Scoped filters
    const projectFilter = {};
    const taskFilter = {};
    if (isClient && clientId) {
      projectFilter.client = clientId;
    }
    if (isDeveloper && currentUserId) {
      taskFilter.assigned_to = currentUserId;
    }

    // 1. Projects Metrics
    const [
      totalProjects,
      activeProjects,
      completedProjects,
      recentProjects,
      allProjects
    ] = await Promise.all([
      Project.countDocuments(projectFilter),
      Project.countDocuments({ ...projectFilter, status: { $in: ['In Progress', 'Development', 'Testing', 'Planning', 'Changes'] } }),
      Project.countDocuments({ ...projectFilter, status: 'Completed' }),
      Project.find(projectFilter)
        .populate('client', 'companyName clientName')
        .populate('projectManager', 'name email avatar')
        .sort({ updatedAt: -1 })
        .limit(6)
        .lean(),
      Project.find({ ...projectFilter, status: { $ne: 'Completed' } }).select('deadline progress projectName projectCode').lean()
    ]);

    const overdueProjects = allProjects.filter(p => p.deadline && new Date(p.deadline) < now);
    const avgProgress = allProjects.length > 0
      ? Math.round(allProjects.reduce((sum, p) => sum + (p.progress || 0), 0) / allProjects.length)
      : 0;

    // 2. Tasks Metrics
    const [
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      blockedTasks,
      allActiveTasks
    ] = await Promise.all([
      Task.countDocuments(taskFilter),
      Task.countDocuments({ ...taskFilter, status: 'pending' }),
      Task.countDocuments({ ...taskFilter, status: { $in: ['in-progress', 'in_progress', 'current'] } }),
      Task.countDocuments({ ...taskFilter, status: { $in: ['completed', 'done'] } }),
      Task.countDocuments({ ...taskFilter, sprintStatus: 'Backlog', status: 'pending' }),
      Task.find({ ...taskFilter, status: { $nin: ['completed', 'done', 'cancelled'] } }).select('dueDate priority title assigned_to project').lean()
    ]);

    const overdueTasks = allActiveTasks.filter(t => t.dueDate && new Date(t.dueDate) < now);

    // 3. Upcoming Milestones & Deadlines
    const upcomingMilestones = await ProjectMilestone.find({
      status: { $ne: 'Completed' },
      dueDate: { $gte: now, $lte: twoWeeksAhead }
    })
      .populate('project', 'projectName projectCode')
      .sort({ dueDate: 1 })
      .limit(6)
      .lean();

    const delayedMilestones = await ProjectMilestone.find({
      status: { $ne: 'Completed' },
      dueDate: { $lt: now }
    })
      .populate('project', 'projectName projectCode')
      .sort({ dueDate: 1 })
      .limit(6)
      .lean();

    // 4. Developer Workload & Daily Progress
    const developers = await User.find({
      $or: [
        { role: { $regex: /developer|dev|software|engineer/i } },
        { designation: { $regex: /developer|dev|software|engineer/i } },
        { department: { $regex: /dev|r&d|development/i } }
      ]
    }).select('name email avatar designation').limit(10).lean();

    const developerWorkload = await Promise.all(
      developers.map(async (dev) => {
        const [devTasks, activeDevTasks, completedDevTasks] = await Promise.all([
          Task.countDocuments({ assigned_to: dev._id }),
          Task.countDocuments({ assigned_to: dev._id, status: { $in: ['in-progress', 'in_progress', 'current'] } }),
          Task.countDocuments({ assigned_to: dev._id, status: { $in: ['completed', 'done'] } })
        ]);

        return {
          id: dev._id,
          name: dev.name,
          email: dev.email,
          avatar: dev.avatar,
          designation: dev.designation || 'Developer',
          totalTasks: devTasks,
          activeTasks: activeDevTasks,
          completedTasks: completedDevTasks
        };
      })
    );

    // 5. Project Delivery Risks & Blockers
    const deliveryRisks = [];
    overdueProjects.forEach(p => {
      deliveryRisks.push({
        id: p._id,
        project: p.projectName,
        projectCode: p.projectCode,
        type: 'Overdue Deadline',
        severity: 'High',
        description: `Project deadline passed on ${new Date(p.deadline).toLocaleDateString()} with progress at ${p.progress || 0}%.`
      });
    });

    delayedMilestones.forEach(m => {
      deliveryRisks.push({
        id: m._id,
        project: m.project?.projectName || 'Project',
        projectCode: m.project?.projectCode || '',
        type: 'Delayed Milestone',
        severity: 'Medium',
        description: `Milestone "${m.title}" was due on ${new Date(m.dueDate).toLocaleDateString()}.`
      });
    });

    // 6. Client Enquiries & Leads
    const [
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      recentLeads
    ] = await Promise.all([
      ClientLead.countDocuments({ isArchived: { $ne: true } }),
      ClientLead.countDocuments({ status: 'New', isArchived: { $ne: true } }),
      ClientLead.countDocuments({ status: { $in: ['Qualified', 'Proposal', 'Won', 'Interested', 'Follow Up', 'Contacted'] }, isArchived: { $ne: true } }),
      ClientLead.countDocuments({ status: 'Converted' }),
      ClientLead.find({ isArchived: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    // 7. Revenue, Expenses, Invoices
    const invoices = await Income.find({ isDeleted: { $ne: true } }).select('amount totalAmount status payments dueDate referenceNo title client').lean();
    let totalInvoiced = 0;
    let totalReceived = 0;
    let outstandingBalance = 0;

    invoices.forEach(inv => {
      const amt = Number(inv.totalAmount || inv.amount) || 0;
      totalInvoiced += amt;
      const paid = (inv.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
      if (inv.status === 'Paid') {
        totalReceived += amt;
      } else {
        totalReceived += paid;
        outstandingBalance += Math.max(0, amt - paid);
      }
    });

    const expensesAgg = await Expense.aggregate([
      { $match: { status: { $ne: 'REJECTED' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalExpenses = expensesAgg[0]?.total || 0;

    // 8. Open Support Tickets & SLA Alerts
    const [
      totalTickets,
      openTickets,
      criticalTickets,
      slaBreachedTickets,
      approachingBreaches
    ] = await Promise.all([
      SupportTicket.countDocuments(),
      SupportTicket.countDocuments({ status: { $in: ['Open', 'Under Review', 'In Progress'] } }),
      SupportTicket.countDocuments({ priority: 'Critical', status: { $nin: ['Resolved', 'Closed'] } }),
      SupportTicket.countDocuments({ slaStatus: 'Breached' }),
      SupportTicket.find({
        status: { $nin: ['Resolved', 'Closed'] },
        slaDeadline: { $gte: now, $lte: new Date(Date.now() + 6 * 60 * 60 * 1000) } // within 6 hours
      })
        .populate('client', 'companyName clientName')
        .populate('project', 'projectName projectCode')
        .limit(5)
        .lean()
    ]);

    // 9. SLA Contracts Overview
    // Defensive SLA metrics (SLA UI removed, keeping safe non-blocking query for backend compatibility)
    let activeSLAContracts = 0;
    let expiringContracts = 0;
    try {
      [activeSLAContracts, expiringContracts] = await Promise.all([
        SLAContract.countDocuments({ status: 'Active' }),
        SLAContract.countDocuments({ status: 'Active', endDate: { $gte: now, $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } })
      ]);
    } catch (_) {}

    return res.status(200).json({
      success: true,
      data: {
        projects: {
          total: totalProjects,
          active: activeProjects,
          completed: completedProjects,
          overdue: overdueProjects.length,
          avgProgress,
          recent: recentProjects
        },
        tasks: {
          total: totalTasks,
          pending: pendingTasks,
          inProgress: inProgressTasks,
          completed: completedTasks,
          blocked: blockedTasks,
          overdue: overdueTasks.length,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        },
        milestones: {
          upcoming: upcomingMilestones,
          delayed: delayedMilestones
        },
        developerWorkload,
        deliveryRisks: deliveryRisks.slice(0, 8),
        leads: {
          total: totalLeads,
          newCount: newLeads,
          qualified: qualifiedLeads,
          converted: convertedLeads,
          recent: recentLeads
        },
        finance: {
          totalInvoiced,
          totalReceived,
          outstandingBalance,
          totalExpenses,
          netProfit: totalReceived - totalExpenses
        },
        support: {
          total: totalTickets,
          open: openTickets,
          critical: criticalTickets,
          breached: slaBreachedTickets,
          approachingBreaches
        },
        sla: {
          activeContracts: activeSLAContracts,
          expiringContracts
        }
      }
    });
  } catch (error) {
    console.error('Error in getERPDashboardMetrics:', error);
    next(error);
  }
};
