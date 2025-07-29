const mongoose = require('mongoose');

const policyCarrierSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    trim: true,
    unique: true
  }
}, {
  timestamps: true
});

// Index for faster searches
policyCarrierSchema.index({ companyName: 1 });

module.exports = mongoose.model('PolicyCarrier', policyCarrierSchema);