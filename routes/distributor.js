const express = require('express');
const router = express.Router();
const ContentLink = require('../models/ContentLink');
const { authenticateToken, checkRole } = require('../middleware/auth');

/**
 * GET /api/distributor/queue
 * Get content pending distributor review
 */
router.get('/queue', authenticateToken, checkRole('Distributor'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Get all verified content that's not yet active (pending distributor approval)
    const queue = await ContentLink.find({ 
      status: 'Pending',
      verifiedAt: { $exists: true } // Only verified content
    })
      .populate('originalCreatorId', 'username email')
      .sort({ verifiedAt: 1 }) // Oldest first
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await ContentLink.countDocuments({ 
      status: 'Pending',
      verifiedAt: { $exists: true }
    });
    
    res.json({
      success: true,
      data: {
        queue,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/distributor/approve/:contentId
 * Approve content and publish to marketplace
 */
router.post('/approve/:contentId', authenticateToken, checkRole('Distributor'), async (req, res) => {
  try {
    const { contentId } = req.params;
    const { finalPrice } = req.body; // Optional: distributor can adjust price
    
    const content = await ContentLink.findById(contentId);
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    if (content.status !== 'Pending') {
      return res.status(400).json({ error: 'Content is not pending approval' });
    }
    
    // Update content status to Active
    content.status = 'Active';
    if (finalPrice && finalPrice > 0) {
      content.currentPrice = finalPrice;
    }
    content.updatedAt = new Date();
    
    await content.save();
    
    res.json({
      success: true,
      message: 'Content approved and published to marketplace',
      data: content
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/distributor/reject/:contentId
 * Reject content
 */
router.post('/reject/:contentId', authenticateToken, checkRole('Distributor'), async (req, res) => {
  try {
    const { contentId } = req.params;
    const { reason } = req.body;
    
    const content = await ContentLink.findById(contentId);
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    if (content.status !== 'Pending') {
      return res.status(400).json({ error: 'Content is not pending approval' });
    }
    
    content.status = 'Rejected';
    content.updatedAt = new Date();
    
    await content.save();
    
    res.json({
      success: true,
      message: 'Content rejected',
      data: content
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/distributor/stats
 * Get distributor performance statistics
 */
router.get('/stats', authenticateToken, checkRole('Distributor'), async (req, res) => {
  try {
    const pendingCount = await ContentLink.countDocuments({ 
      status: 'Pending',
      verifiedAt: { $exists: true }
    });
    
    const totalReviewed = await ContentLink.countDocuments({
      status: { $in: ['Active', 'Rejected'] }
    });
    
    const approvedCount = await ContentLink.countDocuments({ status: 'Active' });
    const rejectedCount = await ContentLink.countDocuments({ status: 'Rejected' });
    
    res.json({
      success: true,
      data: {
        pendingReview: pendingCount,
        totalReviewed,
        approved: approvedCount,
        rejected: rejectedCount,
        approvalRate: totalReviewed > 0 ? ((approvedCount / totalReviewed) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
