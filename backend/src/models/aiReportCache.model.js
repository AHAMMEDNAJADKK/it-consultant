import mongoose from 'mongoose';

const aiReportCacheSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true // 'daily' or 'monthly'
  },
  departmentId: {
    type: String,
    default: 'all'
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  report: {
    type: String,
    required: true
  },
  stats: {
    type: Object,
    required: true
  },
  lastGenerated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model('AiReportCache', aiReportCacheSchema);
