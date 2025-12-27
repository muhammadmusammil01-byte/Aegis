const mongoose = require('mongoose');

const licenseRecordSchema = new mongoose.Schema({
  licenseId: {
    type: String,
    required: true,
    unique: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContentLink',
    required: true
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 0
  },
  royaltyPercentage: {
    type: Number,
    default: 10,
    min: 0,
    max: 100
  },
  isForResale: {
    type: Boolean,
    default: false
  },
  resalePrice: {
    type: Number,
    default: 0
  },
  certificatePath: String,
  purchasedAt: {
    type: Date,
    default: Date.now
  },
  transactionHistory: [{
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: Number,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
});

licenseRecordSchema.index({ buyerId: 1 });
licenseRecordSchema.index({ contentId: 1 });
licenseRecordSchema.index({ licenseId: 1 });

module.exports = mongoose.model('LicenseRecord', licenseRecordSchema);
