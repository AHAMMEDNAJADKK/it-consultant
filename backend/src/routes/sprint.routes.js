import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import {
  getSprints,
  getSprintById,
  createSprint,
  updateSprint,
  deleteSprint,
  updateTaskSprintStatus,
  addTaskToSprint
} from '../controllers/sprint.controller.js';

const router = Router();

router.use(protectRoute);

router.get('/', getSprints);
router.get('/:id', getSprintById);
router.post('/', createSprint);
router.put('/:id', updateSprint);
router.delete('/:id', deleteSprint);
router.post('/:id/tasks', addTaskToSprint);
router.patch('/:id/tasks/:taskId/status', updateTaskSprintStatus);

export default router;
