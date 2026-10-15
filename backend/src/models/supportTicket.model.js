import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  category: {
    type: String,
    enum: ['Bug', 'Feature Request', 'Enhancement', 'Maintenance', 'Incident', 'Security', 'Other'],
    default: 'Bug'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Open', 'Under Review', 'In Progress', 'Resolved', 'Closed', 'Reopened'],
    default: 'Open'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reporterName: {
    type: String,
    default: ''
  },
  reporterEmail: {
    type: String,
    default: ''
  },
  clientVisible: {
    type: Boolean,
    default: true
  },
  attachments: [{
    name: { type: String },
    url: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    authorName: { type: String, default: '' },
    authorRole: { type: String, default: '' },
    message: { type: String, required: true },
    isInternal: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  slaContract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SLAContract',
    default: null
  },
  slaDeadline: {
    type: Date,
    default: null
  },
  slaStatus: {
    type: String,
    enum: ['Within SLA', 'Approaching Breach', 'Breached', 'Met'],
    default: 'Within SLA'
  },
  firstResponseAt: {
    type: Date,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolutionNotes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'taskcomments',
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

supportTicketSchema.index({ client: 1, status: 1 });
supportTicketSchema.index({ project: 1, status: 1 });
supportTicketSchema.index({ assignedTo: 1 });
supportTicketSchema.index({ slaDeadline: 1 });
supportTicketSchema.index({ priority: 1, status: 1 });

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
export default SupportTicket;
