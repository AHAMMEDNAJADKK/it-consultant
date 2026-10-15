import mongoose from 'mongoose';
import Sprint from '../models/sprint.model.js';
import Task from '../models/task.model.js';
import Project from '../models/project.model.js';

/**
 * GET /api/v1/sprints
 * List sprints optionally filtered by project and status
 */
export const getSprints = async (req, res, next) => {
  try {
    const { project, status } = req.query;
    const filter = {};
    if (project) filter.project = project;
    if (status) filter.status = status;

    const sprints = await Sprint.find(filter)
      .populate('project', 'projectName projectCode status')
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 });

    // Calculate live points for each sprint
    const sprintsWithMetrics = await Promise.all(
      sprints.map(async (sprint) => {
        const tasks = await Task.find({ sprint: sprint._id }).select('storyPoints sprintStatus status');
        const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 1), 0);
        const completedPoints = tasks
          .filter(t => t.sprintStatus === 'Done' || t.status === 'completed' || t.status === 'done')
          .reduce((sum, t) => sum + (t.storyPoints || 1), 0);
        const taskCount = tasks.length;
        const completedTaskCount = tasks.filter(t => t.sprintStatus === 'Done' || t.status === 'completed' || t.status === 'done').length;

        const obj = sprint.toJSON();
        obj.totalPoints = totalPoints;
        obj.completedPoints = completedPoints;
        obj.taskCount = taskCount;
        obj.completedTaskCount = completedTaskCount;
        obj.progress = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;
        return obj;
      })
    );

    return res.status(200).json({
      success: true,
      data: sprintsWithMetrics
    });
  } catch (error) {
    console.error('Error in getSprints:', error);
    next(error);
  }
};

/**
 * GET /api/v1/sprints/:id
 * Get single sprint with its tasks categorized into Kanban columns
 */
export const getSprintById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid sprint ID format' });
    }
    const sprint = await Sprint.findById(req.params.id)
      .populate('project', 'projectName projectCode technologyStack projectManager')
      .populate('createdBy', 'name email');

    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    const tasks = await Task.find({ sprint: sprint._id })
      .populate('assigned_to', 'name email avatar designation')
      .populate('created_by', 'name email')
      .sort({ updatedAt: -1 });

    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 1), 0);
    const completedPoints = tasks
      .filter(t => t.sprintStatus === 'Done' || t.status === 'completed' || t.status === 'done')
      .reduce((sum, t) => sum + (t.storyPoints || 1), 0);

    const sprintObj = sprint.toJSON();
    sprintObj.totalPoints = totalPoints;
    sprintObj.completedPoints = completedPoints;
    sprintObj.progress = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;
    sprintObj.tasks = tasks;

    return res.status(200).json({
      success: true,
      data: sprintObj
    });
  } catch (error) {
    console.error('Error in getSprintById:', error);
    next(error);
  }
};

/**
 * POST /api/v1/sprints
 * Create a new sprint
 */
export const createSprint = async (req, res, next) => {
  try {
    const { name, project, goal, startDate, endDate, sprintNumber } = req.body;
    if (!name || !project || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Name, Project, Start Date, and End Date are required.'
      });
    }

    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({ success: false, message: 'Linked project not found.' });
    }

    const currentUserId = req.user?.id || req.user?._id;

    // Determine sprint number if not provided
    let calculatedSprintNumber = sprintNumber;
    if (!calculatedSprintNumber) {
      const existingCount = await Sprint.countDocuments({ project });
      calculatedSprintNumber = existingCount + 1;
    }

    const sprint = new Sprint({
      name,
      project,
      goal: goal || '',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      sprintNumber: calculatedSprintNumber,
      status: 'Planning',
      createdBy: currentUserId
    });

    await sprint.save();

    // Link sprint to project currentSprint name
    projectDoc.currentSprint = sprint.name;
    await projectDoc.save();

    return res.status(201).json({
      success: true,
      message: 'Sprint created successfully',
      data: sprint
    });
  } catch (error) {
    console.error('Error in createSprint:', error);
    next(error);
  }
};

/**
 * PUT /api/v1/sprints/:id
 * Update sprint metadata or status
 */
export const updateSprint = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid sprint ID format' });
    }
    const { name, goal, startDate, endDate, status, retrospectiveNotes } = req.body;
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    if (name) sprint.name = name;
    if (goal !== undefined) sprint.goal = goal;
    if (startDate) sprint.startDate = new Date(startDate);
    if (endDate) sprint.endDate = new Date(endDate);
    if (status) sprint.status = status;
    if (retrospectiveNotes !== undefined) sprint.retrospectiveNotes = retrospectiveNotes;

    await sprint.save();

    return res.status(200).json({
      success: true,
      message: 'Sprint updated successfully',
      data: sprint
    });
  } catch (error) {
    console.error('Error in updateSprint:', error);
    next(error);
  }
};

/**
 * DELETE /api/v1/sprints/:id
 * Delete sprint and detach sprint references from tasks
 */
export const deleteSprint = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid sprint ID format' });
    }
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    // Unassign tasks from this sprint safely without deleting tasks
    await Task.updateMany({ sprint: sprint._id }, { $set: { sprint: null, sprintStatus: 'Backlog' } });
    await Sprint.findByIdAndDelete(sprint._id);

    return res.status(200).json({
      success: true,
      message: 'Sprint deleted successfully; associated tasks moved back to backlog.'
    });
  } catch (error) {
    console.error('Error in deleteSprint:', error);
    next(error);
  }
};

/**
 * PATCH /api/v1/sprints/:id/tasks/:taskId/status
 * Update Kanban column for a task within the sprint
 */
export const updateTaskSprintStatus = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid taskId format' });
    }
    const { sprintStatus, storyPoints } = req.body;

    const normalizedStatusMap = {
      'backlog': 'Backlog',
      'to do': 'To Do',
      'todo': 'To Do',
      'in progress': 'In Progress',
      'in_progress': 'In Progress',
      'code review': 'Code Review',
      'code_review': 'Code Review',
      'qa': 'QA',
      'done': 'Done'
    };
    const targetStatus = sprintStatus ? (normalizedStatusMap[String(sprintStatus).toLowerCase()] || sprintStatus) : null;
    const validStatuses = ['Backlog', 'To Do', 'In Progress', 'Code Review', 'QA', 'Done'];
    if (targetStatus && !validStatuses.includes(targetStatus)) {
      return res.status(400).json({ success: false, message: `Invalid sprint status: ${sprintStatus}` });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (targetStatus) {
      task.sprintStatus = targetStatus;
      // Sync with primary task status
      if (targetStatus === 'Done') {
        task.status = 'done';
      } else if (targetStatus === 'In Progress' || targetStatus === 'Code Review' || targetStatus === 'QA') {
        task.status = 'in-progress';
      } else {
        task.status = 'pending';
      }
    }

    if (storyPoints !== undefined) {
      task.storyPoints = Number(storyPoints) || 1;
    }

    await task.save();

    return res.status(200).json({
      success: true,
      message: 'Task sprint status updated successfully',
      data: task
    });
  } catch (error) {
    console.error('Error in updateTaskSprintStatus:', error);
    next(error);
  }
};

/**
 * POST /api/v1/sprints/:id/tasks
 * Add a task to this sprint or create new task under sprint
 */
export const addTaskToSprint = async (req, res, next) => {
  try {
    const { id: sprintId } = req.params;
    const { taskId, title, description, assigned_to, priority, storyPoints, taskType, sprintStatus } = req.body;

    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    let task;
    if (taskId) {
      // Existing task being attached to sprint
      task = await Task.findById(taskId);
      if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
      task.sprint = sprint._id;
      task.project = sprint.project;
      if (storyPoints !== undefined) task.storyPoints = storyPoints;
      if (sprintStatus) task.sprintStatus = sprintStatus;
      await task.save();
    } else {
      // Create new task directly in this sprint
      if (!title) return res.status(400).json({ success: false, message: 'Task title is required' });
      const currentUserId = req.user?.id || req.user?._id;

      task = new Task({
        title,
        description: description || '',
        sprint: sprint._id,
        project: sprint.project,
        assigned_to: assigned_to || [],
        priority: priority || 'medium',
        storyPoints: storyPoints || 1,
        taskType: taskType || 'Task',
        sprintStatus: sprintStatus || 'To Do',
        status: 'pending',
        created_by: currentUserId,
        user_id: currentUserId
      });
      await task.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Task added to sprint successfully',
      data: task
    });
  } catch (error) {
    console.error('Error in addTaskToSprint:', error);
    next(error);
  }
};
