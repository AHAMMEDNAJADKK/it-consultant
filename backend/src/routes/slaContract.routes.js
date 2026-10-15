import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import {
  getSLAContracts,
  getSLAMetrics,
  getSLAContractById,
  createSLAContract,
  updateSLAContract,
  renewSLAContract,
  deleteSLAContract
} from '../controllers/slaContract.controller.js';

const router = Router();

router.use(protectRoute);

router.get('/', getSLAContracts);
router.get('/metrics', getSLAMetrics);
router.get('/:id', getSLAContractById);
router.post('/', createSLAContract);
router.put('/:id', updateSLAContract);
router.post('/:id/renew', renewSLAContract);
router.delete('/:id', deleteSLAContract);

export default router;
