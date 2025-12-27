const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ContentLink = require('../models/ContentLink');
const LicenseRecord = require('../models/LicenseRecord');
const { authenticateToken, checkRole } = require('../middleware/auth');

/**
 * GET /api/creator/dashboard
 * Get creator dashboard statistics
 */
router.get('/dashboard', authenticateToken, checkRole('Creator'), async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get creator's content
    const content = await ContentLink.find({ originalCreatorId: userId });
    
    // Get all licenses for this creator's content
    const contentIds = content.map(c => c._id);
    const licenses = await LicenseRecord.find({ 
      contentId: { $in: contentIds } 
    });
    
    // Calculate earnings from primary sales
    const primarySales = licenses.filter(l => 
      l.transactionHistory.some(t => t.toUserId.toString() === userId.toString())
    );
    
    const primaryEarnings = primarySales.reduce((sum, license) => {
      const creatorTransaction = license.transactionHistory.find(
        t => t.toUserId.toString() === userId.toString()
      );
      return sum + (creatorTransaction ? creatorTransaction.amount : 0);
    }, 0);
    
    // Calculate passive royalty earnings (10% from resales)
    const resaleLicenses = licenses.filter(l => l.transactionHistory.length > 1);
    const passiveEarnings = resaleLicenses.reduce((sum, license) => {
      // Find royalty payments to creator
      const royaltyPayments = license.transactionHistory.filter(
        t => t.toUserId.toString() === userId.toString()
      ).slice(1); // Skip the first payment (primary sale)
      
      return sum + royaltyPayments.reduce((s, p) => s + p.amount, 0);
    }, 0);
    
    const totalEarnings = primaryEarnings + passiveEarnings;
    
    res.json({
      success: true,
      data: {
        totalContent: content.length,
        activeContent: content.filter(c => c.status === 'Active').length,
        pendingContent: content.filter(c => c.status === 'Pending').length,
        totalLicensesSold: licenses.length,
        earnings: {
          primary: primaryEarnings,
          passive: passiveEarnings,
          total: totalEarnings
        },
        currentBalance: req.user.balance
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/creator/earnings
 * Get detailed earnings breakdown
 */
router.get('/earnings', authenticateToken, checkRole('Creator'), async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get all content by creator
    const content = await ContentLink.find({ originalCreatorId: userId });
    const contentIds = content.map(c => c._id);
    
    // Get all licenses with full details
    const licenses = await LicenseRecord.find({ 
      contentId: { $in: contentIds } 
    }).populate('contentId').populate('buyerId');
    
    // Build detailed earnings report
    const earningsBreakdown = licenses.map(license => {
      const creatorPayments = license.transactionHistory.filter(
        t => t.toUserId.toString() === userId.toString()
      );
      
      return {
        licenseId: license.licenseId,
        contentTitle: license.contentId?.metadata?.title || 'Untitled',
        buyer: license.buyerId?.username || 'Unknown',
        purchaseDate: license.purchasedAt,
        purchasePrice: license.purchasePrice,
        earnings: creatorPayments.reduce((sum, p) => sum + p.amount, 0),
        type: creatorPayments.length === 1 ? 'Primary Sale' : 'Primary + Resale Royalties',
        paymentsCount: creatorPayments.length
      };
    });
    
    res.json({
      success: true,
      data: earningsBreakdown
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/creator/catalog
 * Get creator's content catalog with performance metrics
 */
router.get('/catalog', authenticateToken, checkRole('Creator'), async (req, res) => {
  try {
    const userId = req.user._id;
    
    const content = await ContentLink.find({ originalCreatorId: userId })
      .sort({ createdAt: -1 });
    
    // Get license count for each content
    const catalogWithMetrics = await Promise.all(
      content.map(async (item) => {
        const licenseCount = await LicenseRecord.countDocuments({ 
          contentId: item._id 
        });
        
        return {
          _id: item._id,
          sourceUrl: item.sourceUrl,
          platform: item.platform,
          status: item.status,
          currentPrice: item.currentPrice,
          aiPriceSuggested: item.aiPriceSuggested,
          metadata: item.metadata,
          createdAt: item.createdAt,
          verifiedAt: item.verifiedAt,
          licensesSold: licenseCount,
          revenue: licenseCount * item.currentPrice * 0.95 // Approximate primary sales
        };
      })
    );
    
    res.json({
      success: true,
      data: catalogWithMetrics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/creator/catalog/:contentId/price
 * Set floor price for content
 */
router.put('/catalog/:contentId/price', authenticateToken, checkRole('Creator'), async (req, res) => {
  try {
    const { contentId } = req.params;
    const { price } = req.body;
    const userId = req.user._id;
    
    if (!price || price < 0) {
      return res.status(400).json({ error: 'Invalid price' });
    }
    
    const content = await ContentLink.findOne({ 
      _id: contentId, 
      originalCreatorId: userId 
    });
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found or access denied' });
    }
    
    content.currentPrice = price;
    content.updatedAt = new Date();
    await content.save();
    
    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
