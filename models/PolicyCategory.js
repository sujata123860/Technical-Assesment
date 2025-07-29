const mongoose = require('mongoose');

const policyCategorySchema = new mongoose.Schema({
  categoryName: {
    type: String,
    required: true,
    trim: true,
    unique: true
  }
}, {
  timestamps: true
});

// Index for faster searches
policyCategorySchema.index({ categoryName: 1 });

module.exports = mongoose.model('PolicyCategory', policyCategorySchema);