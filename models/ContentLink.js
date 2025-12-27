const mongoose = require('mongoose');

const contentLinkSchema = new mongoose.Schema({
  sourceUrl: {
    type: String,
    required: true,
    unique: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['Instagram', 'YouTube', 'TikTok', 'Twitter', 'Facebook']
  },
  originalCreatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Active', 'TakenDown', 'Rejected'],
    default: 'Pending'
  },
  verificationToken: {
    type: String,
    unique: true,
    sparse: true
  },
  tokenGeneratedAt: Date,
  verifiedAt: Date,
  aiPriceSuggested: {
    type: Number,
    default: 0
  },
  currentPrice: {
    type: Number,
    default: 0
  },
  vaultPath: String,
  snapshottedAt: Date,
  metadata: {
    title: String,
    description: String,
    thumbnailUrl: String,
    views: Number,
    likes: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

contentLinkSchema.index({ status: 1 });
contentLinkSchema.index({ originalCreatorId: 1 });
contentLinkSchema.index({ platform: 1 });

module.exports = mongoose.model('ContentLink', contentLinkSchema);
