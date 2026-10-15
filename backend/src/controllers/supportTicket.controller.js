import SupportTicket from '../models/supportTicket.model.js';
import SLAContract from '../models/slaContract.model.js';
import Client from '../models/client.model.js';
import Project from '../models/project.model.js';

/**
 * Helper to generate sequential ticket number like TIC-2026-0001
 */
const generateTicketNumber = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `TIC-${currentYear}-`;
  const latestTicket = await SupportTicket.findOne({ ticketNumber: { $regex: `^${prefix}` } })
    .sort({ createdAt: -1 })
    .exec();

  if (!latestTicket || !latestTicket.ticketNumber) {
    return `${prefix}0001`;
  }

  const parts = latestTicket.ticketNumber.split('-');
  const seq = parseInt(parts[2], 10) || 0;
  const nextSeq = String(seq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
};

/**
 * GET /api/v1/support-tickets
 * List support tickets with role-based filtering (clients can only see their own tickets)
 */
export const getSupportTickets = async (req, res, next) => {
  try {
    const { client, project, status, priority, category, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    const user = req.user;
    const isClient = user?.role === 'client' || user?.role_id === 'client';

    if (isClient) {
      // Force filter to client's assigned client ID
      filter.client = user.clientId || user.client;
      filter.clientVisible = true;
    } else {
      if (client) filter.client = client;
    }

    if (project) filter.project = project;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    if (search) {
      filter.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .populate('client', 'companyName clientName email phone')
        .populate('project', 'projectName projectCode')
        .populate('assignedTo', 'name email avatar designation')
        .populate('reportedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      SupportTicket.countDocuments(filter)
    ]);

    // Sanitization: hide internal comments if requesting user is a client
    const sanitizedTickets = tickets.map(t => {
      if (isClient && t.comments) {
        t.comments = t.comments.filter(c => !c.isInternal);
      }
      return t;
    });

    return res.status(200).json({
      success: true,
      data: sanitizedTickets,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error in getSupportTickets:', error);
    next(error);
  }
};

/**
 * GET /api/v1/support-tickets/stats
 */
export const getSupportTicketStats = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user?.role === 'client') {
      filter.client = req.user.clientId;
    }

    const [total, open, inProgress, resolved, critical, breached] = await Promise.all([
      SupportTicket.countDocuments(filter),
      SupportTicket.countDocuments({ ...filter, status: 'Open' }),
      SupportTicket.countDocuments({ ...filter, status: { $in: ['In Progress', 'Under Review'] } }),
      SupportTicket.countDocuments({ ...filter, status: { $in: ['Resolved', 'Closed'] } }),
      SupportTicket.countDocuments({ ...filter, priority: 'Critical', status: { $nin: ['Resolved', 'Closed'] } }),
      SupportTicket.countDocuments({ ...filter, slaStatus: 'Breached' })
    ]);

    return res.status(200).json({
      success: true,
      data: { total, open, inProgress, resolved, critical, breached }
    });
  } catch (error) {
    console.error('Error in getSupportTicketStats:', error);
    next(error);
  }
};

/**
 * GET /api/v1/support-tickets/:id
 */
export const getSupportTicketById = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('client', 'companyName clientName email phone')
      .populate('project', 'projectName projectCode')
      .populate('assignedTo', 'name email avatar designation')
      .populate('reportedBy', 'name email')
      .populate('slaContract')
      .lean();

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    const isClient = req.user?.role === 'client';
    if (isClient && ticket.comments) {
      ticket.comments = ticket.comments.filter(c => !c.isInternal);
    }

    return res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Error in getSupportTicketById:', error);
    next(error);
  }
};

/**
 * POST /api/v1/support-tickets
 * Create a new support ticket & automatically calculate SLA deadline if SLA contract exists
 */
export const createSupportTicket = async (req, res, next) => {
  try {
    const { title, description, client, project, category, priority = 'Medium', attachments } = req.body;

    if (!title || !description || !client) {
      return res.status(400).json({ success: false, message: 'Title, description, and client are required.' });
    }

    const currentUserId = req.user?.id || req.user?._id;
    const ticketNumber = await generateTicketNumber();

    // Check SLA contract for client/project
    let slaContract = await SLAContract.findOne({
      client,
      status: 'Active',
      endDate: { $gte: new Date() }
    });

    if (!slaContract && project) {
      slaContract = await SLAContract.findOne({
        project,
        status: 'Active',
        endDate: { $gte: new Date() }
      });
    }

    let slaDeadline = null;
    if (slaContract && slaContract.responseTimes) {
      const priorityHoursMap = {
        'Critical': slaContract.responseTimes.criticalHours || 1,
        'High': slaContract.responseTimes.highHours || 4,
        'Medium': slaContract.responseTimes.mediumHours || 8,
        'Low': slaContract.responseTimes.lowHours || 24
      };
      const hours = priorityHoursMap[priority] || 8;
      slaDeadline = new Date(Date.now() + hours * 60 * 60 * 1000);
    } else {
      // Default SLA: Critical 4h, High 12h, Medium 24h, Low 48h
      const defaultHours = { 'Critical': 4, 'High': 12, 'Medium': 24, 'Low': 48 }[priority] || 24;
      slaDeadline = new Date(Date.now() + defaultHours * 60 * 60 * 1000);
    }

    const ticket = new SupportTicket({
      ticketNumber,
      title,
      description,
      client,
      project: project || null,
      category: category || 'Bug',
      priority,
      status: 'Open',
      reportedBy: currentUserId,
      reporterName: req.user?.name || 'User',
      reporterEmail: req.user?.email || '',
      attachments: attachments || [],
      slaContract: slaContract ? slaContract._id : null,
      slaDeadline,
      slaStatus: 'Within SLA'
    });

    await ticket.save();

    return res.status(201).json({
      success: true,
      message: `Support ticket ${ticketNumber} created successfully`,
      data: ticket
    });
  } catch (error) {
    console.error('Error in createSupportTicket:', error);
    next(error);
  }
};

/**
 * PUT /api/v1/support-tickets/:id
 * Update status, assignment, resolution
 */
export const updateSupportTicket = async (req, res, next) => {
  try {
    const { title, description, priority, status, category, assignedTo, resolutionNotes } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    if (title) ticket.title = title;
    if (description) ticket.description = description;
    if (priority) ticket.priority = priority;
    if (category) ticket.category = category;
    if (assignedTo !== undefined) ticket.assignedTo = assignedTo || null;
    if (resolutionNotes !== undefined) ticket.resolutionNotes = resolutionNotes;

    if (status && status !== ticket.status) {
      ticket.status = status;
      if (status === 'Resolved' || status === 'Closed') {
        ticket.resolvedAt = new Date();
        // Check if resolution was within SLA
        if (ticket.slaDeadline) {
          ticket.slaStatus = ticket.resolvedAt <= ticket.slaDeadline ? 'Met' : 'Breached';
        }
      }
    }

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: 'Support ticket updated successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Error in updateSupportTicket:', error);
    next(error);
  }
};

/**
 * POST /api/v1/support-tickets/:id/comments
 * Add comment / activity note with internal team privacy option
 */
export const addTicketComment = async (req, res, next) => {
  try {
    const { message, isInternal = false } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    const currentUserId = req.user?.id || req.user?._id;
    const isClient = req.user?.role === 'client';

    ticket.comments.push({
      user: currentUserId,
      authorName: req.user?.name || 'Support Staff',
      authorRole: req.user?.role || req.user?.designation || 'Staff',
      message,
      isInternal: isClient ? false : Boolean(isInternal),
      createdAt: new Date()
    });

    // Record first response timestamp if staff commented
    if (!ticket.firstResponseAt && !isClient) {
      ticket.firstResponseAt = new Date();
    }

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: 'Comment added successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Error in addTicketComment:', error);
    next(error);
  }
};

/**
 * DELETE /api/v1/support-tickets/:id
 */
export const deleteSupportTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }
    return res.status(200).json({ success: true, message: 'Support ticket deleted successfully' });
  } catch (error) {
    console.error('Error in deleteSupportTicket:', error);
    next(error);
  }
};
