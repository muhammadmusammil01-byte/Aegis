const express = require('express');
const router = express.Router();
const ContentLink = require('../models/ContentLink');
const LicenseRecord = require('../models/LicenseRecord');

/**
 * GET /api/marketplace
 * Get all active content links in the marketplace
 */
router.get('/', async (req, res) => {
  try {
    const { platform, minPrice, maxPrice, page = 1, limit = 20 } = req.query;

    const query = { status: 'Active' };

    if (platform) {
      query.platform = platform;
    }

    if (minPrice || maxPrice) {
      query.currentPrice = {};
      if (minPrice) query.currentPrice.$gte = parseFloat(minPrice);
      if (maxPrice) query.currentPrice.$lte = parseFloat(maxPrice);
    }

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
 * GET /api/marketplace/resale
 * Get all licenses available for resale
 */
router.get('/resale', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const licenses = await LicenseRecord.find({ isForResale: true })
      .populate('buyerId', 'username email')
      .populate('contentId')
      .sort({ purchasedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LicenseRecord.countDocuments({ isForResale: true });

    res.json({
      success: true,
      data: {
        licenses,
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
 * GET /api/marketplace/:contentId
 * Get details of a specific content link
 */
router.get('/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;

    const contentLink = await ContentLink.findById(contentId)
      .populate('originalCreatorId', 'username email verifiedSocialHandles');

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

module.exports = router;
