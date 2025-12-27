const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['Admin', 'Creator', 'Distributor', 'Consumer'],
    default: 'Consumer'
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  verifiedSocialHandles: [{
    platform: {
      type: String,
      enum: ['Instagram', 'YouTube', 'TikTok', 'Twitter', 'Facebook']
    },
    handle: String,
    profileUrl: String,
    verifiedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Active', 'Frozen', 'Suspended'],
    default: 'Active'
  }
});

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
