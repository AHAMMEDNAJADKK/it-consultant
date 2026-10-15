import mongoose from 'mongoose';

const gitEventSchema = new mongoose.Schema({
  integration: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GitIntegration'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  provider: {
    type: String,
    enum: ['github', 'gitlab', 'bitbucket'],
    default: 'github'
  },
  eventType: {
    type: String,
    enum: ['push', 'pull_request', 'commit', 'branch', 'tag', 'ping'],
    required: true
  },
  action: {
    type: String,
    default: ''
  },
  ref: {
    type: String,
    default: ''
  },
  commitId: {
    type: String,
    default: ''
  },
  commitMessage: {
    type: String,
    default: ''
  },
  commitUrl: {
    type: String,
    default: ''
  },
  prNumber: {
    type: Number,
    default: null
  },
  prTitle: {
    type: String,
    default: ''
  },
  prUrl: {
    type: String,
    default: ''
  },
  prState: {
    type: String,
    default: ''
  },
  author: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    username: { type: String, default: '' },
    avatarUrl: { type: String, default: '' }
  },
  linkedTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  rawEventId: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'auditlogs',
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

gitEventSchema.index({ project: 1, createdAt: -1 });
gitEventSchema.index({ linkedTask: 1 });
gitEventSchema.index({ commitId: 1 });
gitEventSchema.index({ rawEventId: 1 });

const GitEvent = mongoose.model('GitEvent', gitEventSchema);
export default GitEvent;
