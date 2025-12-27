const mongoose = require('mongoose');
const User = require('../models/User');
const ContentLink = require('../models/ContentLink');
const LicenseRecord = require('../models/LicenseRecord');
const crypto = require('crypto');

class TransactionService {
  /**
   * Generate unique license ID
   */
  generateLicenseId() {
    return `LIC-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  }

  /**
   * Execute a transaction with atomic balance updates
   * Handles primary purchase and secondary resales
   */
  async executeTransaction(buyerId, contentId, sellerId = null) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Fetch buyer
      const buyer = await User.findById(buyerId).session(session);
      if (!buyer) {
        throw new Error('Buyer not found');
      }

      // Fetch content
      const content = await ContentLink.findById(contentId)
        .populate('originalCreatorId')
        .session(session);
      
      if (!content) {
        throw new Error('Content not found');
      }

      if (content.status !== 'Active') {
        throw new Error('Content is not available for purchase');
      }

      let purchasePrice = content.currentPrice;
      let isResale = false;
      let sellerUser = null;
      let originalCreator = content.originalCreatorId;

      // Check if this is a resale
      if (sellerId) {
        // This is a secondary resale
        isResale = true;
        sellerUser = await User.findById(sellerId).session(session);
        
        if (!sellerUser) {
          throw new Error('Seller not found');
        }

        // Find the seller's license record
        const sellerLicense = await LicenseRecord.findOne({
          buyerId: sellerId,
          contentId: contentId,
          isForResale: true
        }).session(session);

        if (!sellerLicense) {
          throw new Error('Content not available for resale');
        }

        purchasePrice = sellerLicense.resalePrice;
      }

      // Check buyer balance
      if (buyer.balance < purchasePrice) {
        throw new Error('Insufficient balance');
      }

      // Deduct from buyer
      buyer.balance -= purchasePrice;
      await buyer.save({ session });

      let transactions = [];

      if (isResale) {
        // Secondary resale split: 85% seller, 10% original creator, 5% platform
        const sellerAmount = Math.round(purchasePrice * 0.85);
        const creatorRoyalty = Math.round(purchasePrice * 0.10);
        const platformFee = Math.round(purchasePrice * 0.05);

        // Pay seller
        sellerUser.balance += sellerAmount;
        await sellerUser.save({ session });
        transactions.push({
          fromUserId: buyerId,
          toUserId: sellerId,
          amount: sellerAmount
        });

        // Pay original creator (passive royalty)
        originalCreator.balance += creatorRoyalty;
        await originalCreator.save({ session });
        transactions.push({
          fromUserId: buyerId,
          toUserId: originalCreator._id,
          amount: creatorRoyalty
        });

        // Platform fee (find admin user)
        const admin = await User.findOne({ role: 'Admin' }).session(session);
        if (admin) {
          admin.balance += platformFee;
          await admin.save({ session });
          transactions.push({
            fromUserId: buyerId,
            toUserId: admin._id,
            amount: platformFee
          });
        }

        // Mark seller's license as no longer for resale
        await LicenseRecord.updateOne(
          { _id: sellerLicense._id },
          { isForResale: false },
          { session }
        );

      } else {
        // Primary purchase - 95% to creator, 5% to platform
        const creatorAmount = Math.round(purchasePrice * 0.95);
        const platformFee = Math.round(purchasePrice * 0.05);

        // Pay creator
        originalCreator.balance += creatorAmount;
        await originalCreator.save({ session });
        transactions.push({
          fromUserId: buyerId,
          toUserId: originalCreator._id,
          amount: creatorAmount
        });

        // Platform fee
        const admin = await User.findOne({ role: 'Admin' }).session(session);
        if (admin) {
          admin.balance += platformFee;
          await admin.save({ session });
          transactions.push({
            fromUserId: buyerId,
            toUserId: admin._id,
            amount: platformFee
          });
        }
      }

      // Create license record for buyer
      const licenseId = this.generateLicenseId();
      const license = new LicenseRecord({
        licenseId,
        buyerId: buyerId,
        contentId: contentId,
        purchasePrice,
        royaltyPercentage: 10,
        isForResale: false,
        transactionHistory: transactions
      });

      await license.save({ session });

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        licenseId,
        purchasePrice,
        license
      };

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * List a license for resale
   */
  async listForResale(licenseId, resalePrice) {
    const license = await LicenseRecord.findOne({ licenseId });
    
    if (!license) {
      throw new Error('License not found');
    }

    license.isForResale = true;
    license.resalePrice = resalePrice;
    await license.save();

    return license;
  }

  /**
   * Remove from resale
   */
  async removeFromResale(licenseId) {
    const license = await LicenseRecord.findOne({ licenseId });
    
    if (!license) {
      throw new Error('License not found');
    }

    license.isForResale = false;
    license.resalePrice = 0;
    await license.save();

    return license;
  }
}

module.exports = new TransactionService();
