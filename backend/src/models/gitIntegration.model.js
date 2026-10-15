import mongoose from 'mongoose';

const gitIntegrationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  provider: {
    type: String,
    enum: ['github', 'gitlab', 'bitbucket'],
    default: 'github',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  repoUrl: {
    type: String,
    required: true,
    trim: true
  },
  repoOwner: {
    type: String,
    default: '',
    trim: true
  },
  repoName: {
    type: String,
    default: '',
    trim: true
  },
  defaultBranch: {
    type: String,
    default: 'main'
  },
  webhookSecret: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Active', 'Disconnected', 'Error'],
    default: 'Active'
  },
  lastEventAt: {
    type: Date,
    default: null
  },
  eventCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'projectcomments',
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

gitIntegrationSchema.index({ project: 1 });
gitIntegrationSchema.index({ repoOwner: 1, repoName: 1 });

const GitIntegration = mongoose.model('GitIntegration', gitIntegrationSchema);
export default GitIntegration;
