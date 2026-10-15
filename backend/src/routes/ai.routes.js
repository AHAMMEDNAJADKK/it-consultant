import { Router } from 'express';
import { getDailyReport, getMonthlyReport, chatWithAi, getProjectAIReport } from '../controllers/ai.controller.js';
import protectRoute from '../middleware/auth.middleware.js';

const router = Router();

router.use(protectRoute);

router.get('/daily', getDailyReport);
router.get('/monthly', getMonthlyReport);
router.get('/project/:projectId', getProjectAIReport);
router.post('/chat', chatWithAi);

export default router;
