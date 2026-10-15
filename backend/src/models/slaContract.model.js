import mongoose from 'mongoose';

const slaContractSchema = new mongoose.Schema({
  contractNumber: {
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
  tier: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Custom'],
    default: 'Gold'
  },
  coverageType: {
    type: String,
    enum: ['24x7', 'Business Hours (9x5)', 'Extended (12x6)'],
    default: 'Business Hours (9x5)'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Pending Renewal', 'Expired', 'Terminated'],
    default: 'Active'
  },
  monthlyFee: {
    type: Number,
    default: 0
  },
  responseTimes: {
    criticalHours: { type: Number, default: 1 },
    highHours: { type: Number, default: 4 },
    mediumHours: { type: Number, default: 8 },
    lowHours: { type: Number, default: 24 }
  },
  resolutionTimes: {
    criticalHours: { type: Number, default: 4 },
    highHours: { type: Number, default: 16 },
    mediumHours: { type: Number, default: 48 },
    lowHours: { type: Number, default: 72 }
  },
  terms: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  renewalReminderDays: {
    type: Number,
    default: 30
  },
  renewalReminderSent: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'taskattachments',
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

slaContractSchema.index({ client: 1, status: 1 });
slaContractSchema.index({ project: 1, status: 1 });
slaContractSchema.index({ endDate: 1, status: 1 });

const SLAContract = mongoose.model('SLAContract', slaContractSchema);
export default SLAContract;
