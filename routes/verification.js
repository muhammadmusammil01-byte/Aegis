const express = require('express');
const router = express.Router();
const verificationService = require('../services/verificationService');
const ContentLink = require('../models/ContentLink');

/**
 * POST /api/verify/initiate
 * Initiate verification process for a social media link
 */
router.post('/initiate', async (req, res) => {
  try {
    const { userId, sourceUrl } = req.body;

    if (!userId || !sourceUrl) {
      return res.status(400).json({ 
        error: 'userId and sourceUrl are required' 
      });
    }

    const result = await verificationService.initiateVerification(userId, sourceUrl);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  }
});

/**
 * POST /api/verify/complete
 * Complete verification by checking if token exists in bio
 */
router.post('/complete', async (req, res) => {
  try {
    const { contentId } = req.body;

    if (!contentId) {
      return res.status(400).json({ 
        error: 'contentId is required' 
      });
    }

    const result = await verificationService.completeVerification(contentId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  }
});

/**
 * GET /api/verify/status/:contentId
 * Check verification status of a content link
 */
router.get('/status/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;

    const contentLink = await ContentLink.findById(contentId);
    
    if (!contentLink) {
      return res.status(404).json({ 
        error: 'Content link not found' 
      });
    }

    res.json({
      success: true,
      data: {
        status: contentLink.status,
        verificationToken: contentLink.verificationToken,
        verifiedAt: contentLink.verifiedAt
      }
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  }
});

module.exports = router;
