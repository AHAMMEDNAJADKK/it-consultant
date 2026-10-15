import SLAContract from '../models/slaContract.model.js';
import SupportTicket from '../models/supportTicket.model.js';
import Client from '../models/client.model.js';
import Project from '../models/project.model.js';

/**
 * Generate sequential SLA contract number like SLA-2026-0001
 */
const generateContractNumber = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `SLA-${currentYear}-`;
  const latestContract = await SLAContract.findOne({ contractNumber: { $regex: `^${prefix}` } })
    .sort({ createdAt: -1 })
    .exec();

  if (!latestContract || !latestContract.contractNumber) {
    return `${prefix}0001`;
  }

  const parts = latestContract.contractNumber.split('-');
  const seq = parseInt(parts[2], 10) || 0;
  const nextSeq = String(seq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
};

/**
 * GET /api/v1/sla-contracts
 * List all SLA & Maintenance contracts
 */
export const getSLAContracts = async (req, res, next) => {
  try {
    const { client, project, status, search } = req.query;
    const filter = {};

    if (client) filter.client = client;
    if (project) filter.project = project;
    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { contractNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { tier: { $regex: search, $options: 'i' } }
      ];
    }

    const contracts = await SLAContract.find(filter)
      .populate('client', 'companyName clientName email phone')
      .populate('project', 'projectName projectCode')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: contracts
    });
  } catch (error) {
    console.error('Error in getSLAContracts:', error);
    next(error);
  }
};

/**
 * GET /api/v1/sla-contracts/metrics
 * Compliance rate, active contracts, approaching renewals
 */
export const getSLAMetrics = async (req, res, next) => {
  try {
    const now = new Date();
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [totalContracts, activeContracts, expiringSoon, totalTickets, metTickets, breachedTickets] = await Promise.all([
      SLAContract.countDocuments(),
      SLAContract.countDocuments({ status: 'Active' }),
      SLAContract.countDocuments({ status: 'Active', endDate: { $gte: now, $lte: in30Days } }),
      SupportTicket.countDocuments({ slaDeadline: { $ne: null } }),
      SupportTicket.countDocuments({ slaStatus: 'Met' }),
      SupportTicket.countDocuments({ slaStatus: 'Breached' })
    ]);

    const complianceRate = totalTickets > 0 ? Math.round(((totalTickets - breachedTickets) / totalTickets) * 100) : 100;

    return res.status(200).json({
      success: true,
      data: {
        totalContracts,
        activeContracts,
        expiringSoon,
        totalTrackedTickets: totalTickets,
        metTickets,
        breachedTickets,
        complianceRate
      }
    });
  } catch (error) {
    console.error('Error in getSLAMetrics:', error);
    next(error);
  }
};

/**
 * GET /api/v1/sla-contracts/:id
 */
export const getSLAContractById = async (req, res, next) => {
  try {
    const contract = await SLAContract.findById(req.params.id)
      .populate('client', 'companyName clientName email phone website')
      .populate('project', 'projectName projectCode technologyStack')
      .populate('createdBy', 'name email');

    if (!contract) {
      return res.status(404).json({ success: false, message: 'SLA Contract not found' });
    }

    // Fetch linked tickets
    const linkedTickets = await SupportTicket.find({
      $or: [
        { slaContract: contract._id },
        { client: contract.client._id, project: contract.project?._id }
      ]
    }).sort({ createdAt: -1 }).limit(20);

    return res.status(200).json({
      success: true,
      data: {
        ...contract.toJSON(),
        tickets: linkedTickets
      }
    });
  } catch (error) {
    console.error('Error in getSLAContractById:', error);
    next(error);
  }
};

/**
 * POST /api/v1/sla-contracts
 */
export const createSLAContract = async (req, res, next) => {
  try {
    const {
      title,
      client,
      project,
      tier = 'Gold',
      coverageType = 'Business Hours (9x5)',
      startDate,
      endDate,
      monthlyFee = 0,
      responseTimes,
      resolutionTimes,
      terms,
      notes
    } = req.body;

    if (!title || !client || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, client, start date, and end date are required.'
      });
    }

    const currentUserId = req.user?.id || req.user?._id;
    const contractNumber = await generateContractNumber();

    const contract = new SLAContract({
      contractNumber,
      title,
      client,
      project: project || null,
      tier,
      coverageType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      monthlyFee: Number(monthlyFee) || 0,
      responseTimes: responseTimes || {
        criticalHours: 1,
        highHours: 4,
        mediumHours: 8,
        lowHours: 24
      },
      resolutionTimes: resolutionTimes || {
        criticalHours: 4,
        highHours: 16,
        mediumHours: 48,
        lowHours: 72
      },
      terms: terms || '',
      notes: notes || '',
      status: 'Active',
      createdBy: currentUserId
    });

    await contract.save();

    // Also link contract into Client model contracts array
    await Client.findByIdAndUpdate(client, {
      $push: {
        contracts: {
          title,
          contractNumber,
          validFrom: new Date(startDate),
          validUntil: new Date(endDate),
          status: 'Active',
          notes: `SLA Tier: ${tier}`
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: `SLA Contract ${contractNumber} created successfully`,
      data: contract
    });
  } catch (error) {
    console.error('Error in createSLAContract:', error);
    next(error);
  }
};

/**
 * PUT /api/v1/sla-contracts/:id
 */
export const updateSLAContract = async (req, res, next) => {
  try {
    const { title, tier, coverageType, startDate, endDate, status, monthlyFee, responseTimes, resolutionTimes, terms, notes } = req.body;
    const contract = await SLAContract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ success: false, message: 'SLA Contract not found' });
    }

    if (title) contract.title = title;
    if (tier) contract.tier = tier;
    if (coverageType) contract.coverageType = coverageType;
    if (startDate) contract.startDate = new Date(startDate);
    if (endDate) contract.endDate = new Date(endDate);
    if (status) contract.status = status;
    if (monthlyFee !== undefined) contract.monthlyFee = Number(monthlyFee);
    if (responseTimes) contract.responseTimes = { ...contract.responseTimes, ...responseTimes };
    if (resolutionTimes) contract.resolutionTimes = { ...contract.resolutionTimes, ...resolutionTimes };
    if (terms !== undefined) contract.terms = terms;
    if (notes !== undefined) contract.notes = notes;

    await contract.save();

    return res.status(200).json({
      success: true,
      message: 'SLA Contract updated successfully',
      data: contract
    });
  } catch (error) {
    console.error('Error in updateSLAContract:', error);
    next(error);
  }
};

/**
 * POST /api/v1/sla-contracts/:id/renew
 */
export const renewSLAContract = async (req, res, next) => {
  try {
    const { newEndDate, notes } = req.body;
    if (!newEndDate) {
      return res.status(400).json({ success: false, message: 'New end date is required for contract renewal.' });
    }

    const contract = await SLAContract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ success: false, message: 'SLA Contract not found' });
    }

    contract.endDate = new Date(newEndDate);
    contract.status = 'Active';
    contract.renewalReminderSent = false;
    if (notes) contract.notes = `${contract.notes ? contract.notes + '\n' : ''}Renewed on ${new Date().toISOString().split('T')[0]}: ${notes}`;

    await contract.save();

    return res.status(200).json({
      success: true,
      message: `SLA Contract renewed successfully until ${new Date(newEndDate).toLocaleDateString()}`,
      data: contract
    });
  } catch (error) {
    console.error('Error in renewSLAContract:', error);
    next(error);
  }
};

/**
 * DELETE /api/v1/sla-contracts/:id
 */
export const deleteSLAContract = async (req, res, next) => {
  try {
    const contract = await SLAContract.findByIdAndDelete(req.params.id);
    if (!contract) {
      return res.status(404).json({ success: false, message: 'SLA Contract not found' });
    }
    return res.status(200).json({ success: true, message: 'SLA Contract deleted successfully' });
  } catch (error) {
    console.error('Error in deleteSLAContract:', error);
    next(error);
  }
};
