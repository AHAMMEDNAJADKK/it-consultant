import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import {
  getClientLeads,
  getClientLeadStats,
  getClientLeadById,
  createClientLead,
  updateClientLead,
  deleteClientLead,
  importClientLeads,
  convertLeadToClient,
  addFollowUp,
  archiveClientLead
} from '../controllers/clientLead.controller.js';

const router = Router();

router.use(protectRoute);

router.get('/', getClientLeads);
router.get('/stats', getClientLeadStats);
router.get('/:id', getClientLeadById);
router.post('/', createClientLead);
router.put('/:id', updateClientLead);
router.delete('/:id', deleteClientLead);
router.post('/import', importClientLeads);
router.post('/:id/convert', convertLeadToClient);
router.post('/:id/follow-up', addFollowUp);
router.patch('/:id/archive', archiveClientLead);

export default router;
