import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import {
  getGitIntegrations,
  createGitIntegration,
  updateGitIntegration,
  deleteGitIntegration,
  getGitEvents,
  handleGitWebhook,
  simulateGitEvent
} from '../controllers/git.controller.js';

const router = Router();

// Public webhook receiver for GitHub / GitLab / Bitbucket
router.post('/webhook/:provider', handleGitWebhook);

// Protected Management Endpoints
router.get('/integrations', protectRoute, getGitIntegrations);
router.post('/integrations', protectRoute, createGitIntegration);
router.put('/integrations/:id', protectRoute, updateGitIntegration);
router.delete('/integrations/:id', protectRoute, deleteGitIntegration);
router.post('/integrations/:id/test-event', protectRoute, simulateGitEvent);
router.get('/events', protectRoute, getGitEvents);

export default router;
