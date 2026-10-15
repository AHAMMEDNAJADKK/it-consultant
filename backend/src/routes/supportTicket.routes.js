import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import {
  getSupportTickets,
  getSupportTicketStats,
  getSupportTicketById,
  createSupportTicket,
  updateSupportTicket,
  addTicketComment,
  deleteSupportTicket
} from '../controllers/supportTicket.controller.js';

const router = Router();

router.use(protectRoute);

router.get('/', getSupportTickets);
router.get('/stats', getSupportTicketStats);
router.get('/:id', getSupportTicketById);
router.post('/', createSupportTicket);
router.put('/:id', updateSupportTicket);
router.post('/:id/comments', addTicketComment);
router.delete('/:id', deleteSupportTicket);

export default router;
