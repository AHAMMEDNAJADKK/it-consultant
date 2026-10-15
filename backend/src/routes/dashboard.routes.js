import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import { getERPDashboardMetrics } from '../controllers/dashboard.controller.js';

const router = Router();

router.use(protectRoute);

router.get('/metrics', getERPDashboardMetrics);

export default router;
