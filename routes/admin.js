const express = require('express');
const router = express.Router();
const ContentLink = require('../models/ContentLink');

/**
 * GET /api/admin/content
 * Get all content links (for moderation)
 */
router.get('/content', async (req, res) => {
  try {
    const { status, platform, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (platform) query.platform = platform;

    const skip = (page - 1) * limit;

    const contentLinks = await ContentLink.find(query)
      .populate('originalCreatorId', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ContentLink.countDocuments(query);

    res.json({
      success: true,
      data: {
        contentLinks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  }
});

/**
 * PUT /api/admin/content/:contentId/status
 * Update content status (approve, reject, take down)
 */
router.put('/content/:contentId/status', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { status } = req.body;

    if (!status || !['Pending', 'Active', 'TakenDown', 'Rejected'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be Pending, Active, TakenDown, or Rejected' 
      });
    }

    const contentLink = await ContentLink.findByIdAndUpdate(
      contentId,
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!contentLink) {
      return res.status(404).json({ 
        error: 'Content not found' 
      });
    }

    res.json({
      success: true,
      data: contentLink
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  }
});

/**
 * DELETE /api/admin/content/:contentId
 * Permanently delete content link
 */
router.delete('/content/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;

    const contentLink = await ContentLink.findByIdAndDelete(contentId);

    if (!contentLink) {
      return res.status(404).json({ 
        error: 'Content not found' 
      });
    }

    res.json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  }
});

/**
 * GET /api/admin/stats
 * Get platform statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const User = require('../models/User');
    const LicenseRecord = require('../models/LicenseRecord');

    const totalUsers = await User.countDocuments();
    const totalCreators = await User.countDocuments({ role: 'Creator' });
    const totalContent = await ContentLink.countDocuments();
    const activeContent = await ContentLink.countDocuments({ status: 'Active' });
    const totalLicenses = await LicenseRecord.countDocuments();

    // Calculate total transaction volume
    const licenses = await LicenseRecord.find();
    const totalVolume = licenses.reduce((sum, license) => sum + license.purchasePrice, 0);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          creators: totalCreators
        },
        content: {
          total: totalContent,
          active: activeContent
        },
        licenses: {
          total: totalLicenses
        },
        revenue: {
          totalVolume
        }
      }
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  }
});

module.exports = router;
