const mongoose = require('mongoose');

const scheduledMessageSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  insertedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
scheduledMessageSchema.index({ scheduledDate: 1 });
scheduledMessageSchema.index({ status: 1 });

module.exports = mongoose.model('ScheduledMessage', scheduledMessageSchema);