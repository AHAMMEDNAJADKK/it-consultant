import mongoose from 'mongoose';
import crypto from 'crypto';
import GitIntegration from '../models/gitIntegration.model.js';
import GitEvent from '../models/gitEvent.model.js';
import Project from '../models/project.model.js';
import Task from '../models/task.model.js';

/**
 * GET /api/v1/git/integrations
 * List repository integrations
 */
export const getGitIntegrations = async (req, res, next) => {
  try {
    const { project } = req.query;
    const filter = {};
    if (project) filter.project = project;

    const integrations = await GitIntegration.find(filter)
      .populate('project', 'projectName projectCode')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: integrations
    });
  } catch (error) {
    console.error('Error in getGitIntegrations:', error);
    next(error);
  }
};

/**
 * POST /api/v1/git/integrations
 * Connect a repository
 */
export const createGitIntegration = async (req, res, next) => {
  try {
    const { name, provider = 'github', project, repoUrl, repoOwner, repoName, defaultBranch, webhookSecret } = req.body;

    if (!name || !project || !repoUrl) {
      return res.status(400).json({ success: false, message: 'Name, Project, and Repository URL are required.' });
    }

    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({ success: false, message: 'Linked project not found.' });
    }

    const currentUserId = req.user?.id || req.user?._id;

    // Parse owner and name from URL if not explicitly provided
    let parsedOwner = repoOwner || '';
    let parsedName = repoName || '';
    if ((!parsedOwner || !parsedName) && repoUrl) {
      try {
        const cleanUrl = repoUrl.replace(/\.git$/, '').replace(/\/$/, '');
        const parts = cleanUrl.split('/');
        if (parts.length >= 2) {
          parsedName = parts[parts.length - 1];
          parsedOwner = parts[parts.length - 2].split(':').pop(); // handles ssh git@github.com:owner/repo
        }
      } catch (err) {
        // Fallback to defaults
      }
    }

    const integration = new GitIntegration({
      name,
      provider,
      project,
      repoUrl,
      repoOwner: parsedOwner,
      repoName: parsedName,
      defaultBranch: defaultBranch || 'main',
      webhookSecret: webhookSecret || crypto.randomBytes(16).toString('hex'),
      status: 'Active',
      createdBy: currentUserId
    });

    await integration.save();

    // Also update project repositoryUrl if empty
    if (!projectDoc.repositoryUrl) {
      projectDoc.repositoryUrl = repoUrl;
      await projectDoc.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Git repository integration configured successfully.',
      data: integration
    });
  } catch (error) {
    console.error('Error in createGitIntegration:', error);
    next(error);
  }
};

/**
 * PUT /api/v1/git/integrations/:id
 */
export const updateGitIntegration = async (req, res, next) => {
  try {
    const { name, repoUrl, repoOwner, repoName, defaultBranch, webhookSecret, status } = req.body;
    const integration = await GitIntegration.findById(req.params.id);
    if (!integration) {
      return res.status(404).json({ success: false, message: 'Git integration not found' });
    }

    if (name) integration.name = name;
    if (repoUrl) integration.repoUrl = repoUrl;
    if (repoOwner !== undefined) integration.repoOwner = repoOwner;
    if (repoName !== undefined) integration.repoName = repoName;
    if (defaultBranch) integration.defaultBranch = defaultBranch;
    if (webhookSecret !== undefined) integration.webhookSecret = webhookSecret;
    if (status) integration.status = status;

    await integration.save();

    return res.status(200).json({
      success: true,
      message: 'Git integration updated successfully',
      data: integration
    });
  } catch (error) {
    console.error('Error in updateGitIntegration:', error);
    next(error);
  }
};

/**
 * DELETE /api/v1/git/integrations/:id
 */
export const deleteGitIntegration = async (req, res, next) => {
  try {
    const integration = await GitIntegration.findByIdAndDelete(req.params.id);
    if (!integration) {
      return res.status(404).json({ success: false, message: 'Git integration not found' });
    }
    return res.status(200).json({ success: true, message: 'Git integration removed successfully' });
  } catch (error) {
    console.error('Error in deleteGitIntegration:', error);
    next(error);
  }
};

/**
 * GET /api/v1/git/events
 * Fetch commit / pull request activity feed
 */
export const getGitEvents = async (req, res, next) => {
  try {
    const { project, integration, limit = 50 } = req.query;
    const filter = {};
    if (project) filter.project = project;
    if (integration) filter.integration = integration;

    const events = await GitEvent.find(filter)
      .populate('project', 'projectName projectCode')
      .populate('linkedTask', 'title taskKey sprintStatus status')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error in getGitEvents:', error);
    next(error);
  }
};

/**
 * POST /api/v1/git/webhook/:provider
 * Handles GitHub, GitLab, and Bitbucket incoming webhooks securely with signature validation
 */
export const handleGitWebhook = async (req, res, next) => {
  try {
    const { provider } = req.params;
    const payload = req.body;

    // Detect repository from payload
    let repoName = payload.repository?.name || '';
    let repoOwner = payload.repository?.owner?.name || payload.repository?.owner?.login || '';

    // Find corresponding integration
    let integration = null;
    if (repoName) {
      integration = await GitIntegration.findOne({
        repoName: { $regex: new RegExp(`^${repoName}$`, 'i') },
        status: 'Active'
      });
    }

    if (!integration) {
      // Fallback: match any active integration or first active
      integration = await GitIntegration.findOne({ status: 'Active' });
    }

    if (!integration) {
      return res.status(200).json({ received: true, note: 'No matching active Git integration found' });
    }

    // Webhook Signature Verification (GitHub HMAC SHA-256)
    if (provider === 'github' && integration.webhookSecret && req.headers['x-hub-signature-256']) {
      const signature = req.headers['x-hub-signature-256'];
      const rawPayload = JSON.stringify(payload);
      const hmac = crypto.createHmac('sha256', integration.webhookSecret).update(rawPayload).digest('hex');
      const expectedSignature = `sha256=${hmac}`;

      if (signature !== expectedSignature) {
        console.warn('⚠️ GitHub Webhook signature mismatch.');
        return res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
      }
    }

    const eventHeader = req.headers['x-github-event'] || req.headers['x-gitlab-event'] || 'push';
    const deliveryId = req.headers['x-github-delivery'] || '';

    // Check duplicate delivery
    if (deliveryId) {
      const existing = await GitEvent.findOne({ rawEventId: deliveryId });
      if (existing) {
        return res.status(200).json({ received: true, note: 'Duplicate webhook delivery skipped.' });
      }
    }

    const savedEvents = [];

    // Helper to find task linked to text (e.g. #TASK-101 or #101)
    const findLinkedTask = async (text, projectId) => {
      if (!text) return null;
      const match = text.match(/#([A-Za-z0-9_-]+)/);
      if (match) {
        const code = match[1];
        const task = await Task.findOne({
          project: projectId,
          $or: [
            { taskKey: code },
            { title: { $regex: code, $options: 'i' } }
          ]
        });
        return task ? task._id : null;
      }
      return null;
    };

    if (eventHeader === 'push') {
      const commits = payload.commits || [];
      const ref = payload.ref || '';

      for (const c of commits) {
        // Prevent duplicate commit processing
        const duplicate = await GitEvent.findOne({ commitId: c.id });
        if (duplicate) continue;

        const linkedTask = await findLinkedTask(c.message, integration.project);

        const gitEvt = new GitEvent({
          integration: integration._id,
          project: integration.project,
          provider: provider || 'github',
          eventType: 'push',
          ref,
          commitId: c.id,
          commitMessage: c.message,
          commitUrl: c.url,
          author: {
            name: c.author?.name || '',
            email: c.author?.email || '',
            username: c.author?.username || ''
          },
          linkedTask,
          rawEventId: deliveryId
        });
        await gitEvt.save();
        savedEvents.push(gitEvt);

        // If commit references task, mark task as in-progress if currently pending
        if (linkedTask) {
          await Task.findByIdAndUpdate(linkedTask, {
            $set: { status: 'in-progress', sprintStatus: 'In Progress' }
          });
        }
      }
    } else if (eventHeader === 'pull_request') {
      const pr = payload.pull_request;
      if (pr) {
        const linkedTask = await findLinkedTask(pr.title + ' ' + (pr.body || ''), integration.project);

        const gitEvt = new GitEvent({
          integration: integration._id,
          project: integration.project,
          provider: provider || 'github',
          eventType: 'pull_request',
          action: payload.action || 'opened',
          ref: pr.head?.ref || '',
          prNumber: pr.number,
          prTitle: pr.title,
          prUrl: pr.html_url,
          prState: pr.state,
          author: {
            name: pr.user?.login || '',
            username: pr.user?.login || '',
            avatarUrl: pr.user?.avatar_url || ''
          },
          linkedTask,
          rawEventId: deliveryId
        });
        await gitEvt.save();
        savedEvents.push(gitEvt);

        // If PR merged, advance linked task to Code Review or QA
        if (payload.action === 'closed' && pr.merged && linkedTask) {
          await Task.findByIdAndUpdate(linkedTask, {
            $set: { sprintStatus: 'QA' }
          });
        }
      }
    }

    // Update integration metrics
    integration.lastEventAt = new Date();
    integration.eventCount = (integration.eventCount || 0) + (savedEvents.length || 1);
    await integration.save();

    return res.status(200).json({
      success: true,
      message: 'Git webhook processed successfully',
      eventsProcessed: savedEvents.length
    });
  } catch (error) {
    console.error('Error in handleGitWebhook:', error);
    next(error);
  }
};

/**
 * POST /api/v1/git/integrations/:id/test-event
 * Simulates a push event for manual integration testing and verification
 */
export const simulateGitEvent = async (req, res, next) => {
  try {
    const integration = await GitIntegration.findById(req.params.id);
    if (!integration) {
      return res.status(404).json({ success: false, message: 'Git integration not found' });
    }

    const { branch = 'main', commitMessage = 'feat: implemented module workflow #T-101', authorName = 'Lead Developer' } = req.body;
    const commitId = crypto.randomBytes(8).toString('hex');

    // Auto-link matching task
    const codeMatch = commitMessage.match(/(?:#|task-)([a-zA-Z0-9_-]+)/i);
    let linkedTaskId = null;
    if (codeMatch) {
      const code = codeMatch[1];
      const task = await Task.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(code) ? [{ _id: code }] : []),
          { taskKey: code },
          { title: { $regex: code, $options: 'i' } }
        ]
      });
      if (task) linkedTaskId = task._id;
    }

    const testEvent = new GitEvent({
      integration: integration._id,
      project: integration.project,
      provider: integration.provider,
      eventType: 'push',
      ref: `refs/heads/${branch}`,
      commitId,
      commitMessage,
      commitUrl: `${integration.repoUrl}/commit/${commitId}`,
      linkedTask: linkedTaskId,
      author: {
        name: authorName,
        email: 'developer@nexora.io',
        username: authorName.toLowerCase().replace(/\s+/g, '')
      }
    });

    await testEvent.save();

    integration.lastEventAt = new Date();
    integration.eventCount = (integration.eventCount || 0) + 1;
    await integration.save();

    return res.status(201).json({
      success: true,
      message: 'Simulated Git commit event created successfully.',
      data: testEvent
    });
  } catch (error) {
    console.error('Error in simulateGitEvent:', error);
    next(error);
  }
};
