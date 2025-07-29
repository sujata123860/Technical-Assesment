const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  policyNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  policyStartDate: {
    type: Date,
    required: true
  },
  policyEndDate: {
    type: Date,
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PolicyCategory',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PolicyCarrier',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
policySchema.index({ policyNumber: 1 });
policySchema.index({ userId: 1 });
policySchema.index({ categoryId: 1 });
policySchema.index({ companyId: 1 });
policySchema.index({ policyStartDate: 1, policyEndDate: 1 });

module.exports = mongoose.model('Policy', policySchema);