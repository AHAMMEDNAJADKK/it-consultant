import ClientLead from '../models/clientLead.model.js';
import Client from '../models/client.model.js';
import User from '../models/user.model.js';
import { generateClientId } from '../services/client.service.js';

/**
 * GET /api/v1/client-leads
 * Fetch client leads with filtering, search, and pagination
 */
export const getClientLeads = async (req, res, next) => {
  try {
    const {
      search,
      status,
      priority,
      city,
      assignedTo,
      interestedService,
      startDate,
      endDate,
      page = 1,
      limit = 100
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { leadName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (city) query.city = { $regex: city, $options: 'i' };
    if (assignedTo) query.assignedTo = assignedTo;
    if (interestedService) query.interestedService = { $regex: interestedService, $options: 'i' };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [clientLeads, total] = await Promise.all([
      ClientLead.find(query)
        .populate('assignedTo', 'name email employeeId designation role_id department')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ClientLead.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: clientLeads,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error in getClientLeads:', error);
    next(error);
  }
};

/**
 * GET /api/v1/client-leads/stats
 * Overview stats for Client Leads
 */
export const getClientLeadStats = async (req, res, next) => {
  try {
    const [
      total,
      newCount,
      contactedCount,
      followUpCount,
      interestedCount,
      convertedCount,
      lostCount,
      pendingMeetings,
      onboardingCount
    ] = await Promise.all([
      ClientLead.countDocuments(),
      ClientLead.countDocuments({ status: 'New' }),
      ClientLead.countDocuments({ status: 'Contacted' }),
      ClientLead.countDocuments({ status: 'Follow Up' }),
      ClientLead.countDocuments({ status: 'Interested' }),
      ClientLead.countDocuments({ status: 'Converted' }),
      ClientLead.countDocuments({ status: 'Lost' }),
      ClientLead.countDocuments({ clientMeetingFixed: 'Yes' }),
      ClientLead.countDocuments({ clientOnboarding: 'Yes' })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total,
        new: newCount,
        contacted: contactedCount,
        followUp: followUpCount,
        interested: interestedCount,
        converted: convertedCount,
        lost: lostCount,
        pendingMeetings,
        onboardingCount
      }
    });
  } catch (error) {
    console.error('Error in getClientLeadStats:', error);
    next(error);
  }
};

/**
 * GET /api/v1/client-leads/:id
 */
export const getClientLeadById = async (req, res, next) => {
  try {
    const clientLead = await ClientLead.findById(req.params.id)
      .populate('assignedTo', 'name email employeeId designation role_id department')
      .populate('createdBy', 'name email');

    if (!clientLead) {
      return res.status(404).json({ success: false, message: 'Client lead not found' });
    }

    return res.status(200).json({ success: true, data: clientLead });
  } catch (error) {
    console.error('Error in getClientLeadById:', error);
    next(error);
  }
};

/**
 * POST /api/v1/client-leads
 */
export const createClientLead = async (req, res, next) => {
  try {
    const currentUserId = req.user.id || req.user._id;
    const userObj = await User.findById(currentUserId).populate('departmentId designationId').lean();
    const deptName = String(userObj?.department || userObj?.departmentId?.name || '').toLowerCase().trim();
    const desigName = String(userObj?.designation || userObj?.designationId?.name || '').toLowerCase().trim();
    const isMarketer = deptName.includes('marketing') || desigName.includes('marketing');

    let leadSource = req.body.source;
    if (isMarketer || !leadSource) {
      leadSource = 'MARKETING';
    }

    const newLead = new ClientLead({
      ...req.body,
      source: leadSource,
      createdBy: currentUserId
    });

    await newLead.save();

    const populated = await ClientLead.findById(newLead._id)
      .populate('assignedTo', 'name email employeeId designation role_id department')
      .populate('createdBy', 'name email');

    return res.status(201).json({
      success: true,
      message: 'Client lead created successfully',
      data: populated
    });
  } catch (error) {
    console.error('Error in createClientLead:', error);
    next(error);
  }
};

/**
 * PUT /api/v1/client-leads/:id
 */
export const updateClientLead = async (req, res, next) => {
  try {
    const updatedLead = await ClientLead.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name email employeeId designation role_id department')
      .populate('createdBy', 'name email');

    if (!updatedLead) {
      return res.status(404).json({ success: false, message: 'Client lead not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Client lead updated successfully',
      data: updatedLead
    });
  } catch (error) {
    console.error('Error in updateClientLead:', error);
    next(error);
  }
};

/**
 * DELETE /api/v1/client-leads/:id
 */
export const deleteClientLead = async (req, res, next) => {
  try {
    const lead = await ClientLead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Client lead not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Client lead deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteClientLead:', error);
    next(error);
  }
};

/**
 * POST /api/v1/client-leads/import
 */
export const importClientLeads = async (req, res, next) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or empty leads array' });
    }

    const currentUserId = req.user.id || req.user._id;
    const userObj = await User.findById(currentUserId).populate('departmentId designationId').lean();
    const deptName = String(userObj?.department || userObj?.departmentId?.name || '').toLowerCase().trim();
    const desigName = String(userObj?.designation || userObj?.designationId?.name || '').toLowerCase().trim();
    const isMarketer = deptName.includes('marketing') || desigName.includes('marketing');

    const formattedLeads = leads.map(l => ({
      leadName: l.leadName || l.name || 'Unnamed Lead',
      companyName: l.companyName || l.company || '',
      email: l.email || '',
      phone: l.phone || l.mobile || '',
      city: l.city || '',
      source: isMarketer ? 'MARKETING' : (l.source || 'MARKETING'),
      interestedService: l.interestedService || l.course || '',
      campaignName: l.campaignName || l.campaign || '',
      leadPlatform: l.leadPlatform || l.platform || '',
      status: l.status || 'New',
      priority: l.priority || 'Medium',
      clientMeetingFixed: l.clientMeetingFixed || 'Pending',
      clientOnboarding: l.clientOnboarding || 'Pending',
      remarks: l.remarks || '',
      createdBy: currentUserId
    }));

    const inserted = await ClientLead.insertMany(formattedLeads);

    return res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} client leads`,
      data: inserted
    });
  } catch (error) {
    console.error('Error in importClientLeads:', error);
    next(error);
  }
};

/**
 * POST /api/v1/client-leads/:id/convert
 * Converts a qualified lead into a Client Account without duplication
 */
export const convertLeadToClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await ClientLead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Client lead not found' });
    }

    if (lead.convertedClientId) {
      const existingClient = await Client.findById(lead.convertedClientId);
      if (existingClient) {
        return res.status(200).json({
          success: true,
          message: 'Lead is already converted to a client account',
          data: { client: existingClient, lead }
        });
      }
    }

    // Check if client with matching email or companyName already exists to avoid duplication
    let existingClient = null;
    if (lead.email) {
      existingClient = await Client.findOne({ email: lead.email.toLowerCase().trim() });
    }
    if (!existingClient && lead.companyName) {
      existingClient = await Client.findOne({ companyName: { $regex: new RegExp(`^${lead.companyName.trim()}$`, 'i') } });
    }

    if (existingClient) {
      lead.status = 'Converted';
      lead.convertedAt = new Date();
      lead.convertedClientId = existingClient._id;
      await lead.save();

      return res.status(200).json({
        success: true,
        message: 'Lead linked to existing client record successfully without duplicate creation',
        data: { client: existingClient, lead }
      });
    }

    const currentUserId = req.user?.id || req.user?._id;
    const clientId = await generateClientId();

    const newClient = new Client({
      clientId,
      companyName: lead.companyName || lead.leadName,
      clientName: lead.leadName,
      email: lead.email || `${lead.leadName.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.local`,
      phone: lead.phone || 'N/A',
      city: lead.city || '',
      leadSource: lead.source || 'Lead Pipeline',
      leadSourceId: lead._id,
      industry: 'Technology',
      status: 'Active',
      expectedMonthlyRevenue: lead.estimatedBudget || 0,
      notes: lead.remarks || `Converted from Lead ${lead.leadName}`,
      createdBy: currentUserId
    });

    await newClient.save();

    lead.status = 'Converted';
    lead.convertedAt = new Date();
    lead.convertedClientId = newClient._id;
    await lead.save();

    return res.status(201).json({
      success: true,
      message: 'Lead converted to Client Account successfully without duplicate records',
      data: { client: newClient, lead }
    });
  } catch (error) {
    console.error('Error in convertLeadToClient:', error);
    next(error);
  }
};

/**
 * POST /api/v1/client-leads/:id/follow-up
 */
export const addFollowUp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes, nextFollowUpDate, status } = req.body;
    if (!notes) {
      return res.status(400).json({ success: false, message: 'Follow-up notes are required' });
    }

    const lead = await ClientLead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Client lead not found' });
    }

    const currentUserId = req.user?.id || req.user?._id;
    const userName = req.user?.name || 'Staff';

    lead.followUpHistory.push({
      date: new Date(),
      notes,
      followUpBy: currentUserId,
      followUpByName: userName
    });

    if (nextFollowUpDate) {
      lead.nextFollowUpDate = new Date(nextFollowUpDate);
    }
    if (status) {
      lead.status = status;
    } else if (lead.status === 'New') {
      lead.status = 'Contacted';
    }

    await lead.save();

    return res.status(200).json({
      success: true,
      message: 'Follow-up recorded successfully',
      data: lead
    });
  } catch (error) {
    console.error('Error in addFollowUp:', error);
    next(error);
  }
};

/**
 * PATCH /api/v1/client-leads/:id/archive
 */
export const archiveClientLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await ClientLead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Client lead not found' });
    }

    lead.isArchived = !lead.isArchived;
    await lead.save();

    return res.status(200).json({
      success: true,
      message: `Lead ${lead.isArchived ? 'archived' : 'unarchived'} successfully`,
      data: lead
    });
  } catch (error) {
    console.error('Error in archiveClientLead:', error);
    next(error);
  }
};

