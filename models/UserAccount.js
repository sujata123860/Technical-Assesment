const mongoose = require('mongoose');

const userAccountSchema = new mongoose.Schema({
  accountName: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for faster lookups
userAccountSchema.index({ userId: 1 });

module.exports = mongoose.model('UserAccount', userAccountSchema);