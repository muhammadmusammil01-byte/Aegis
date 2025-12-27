const express = require('express');
const router = express.Router();
const transactionService = require('../services/transactionService');
const certificateService = require('../services/certificateService');
const LicenseRecord = require('../models/LicenseRecord');
const User = require('../models/User');
const ContentLink = require('../models/ContentLink');

/**
 * POST /api/transactions/purchase
 * Purchase a content license (primary or resale)
 */
router.post('/purchase', async (req, res) => {
  try {
    const { buyerId, contentId, sellerId } = req.body;

    if (!buyerId || !contentId) {
      return res.status(400).json({ 
        error: 'buyerId and contentId are required' 
      });
    }

    const result = await transactionService.executeTransaction(
      buyerId, 
      contentId, 
      sellerId
    );

    // Generate certificate
    const license = await LicenseRecord.findOne({ licenseId: result.licenseId })
      .populate('buyerId')
      .populate('contentId');

    const certificatePath = await certificateService.generateCertificate(
      license,
      license.buyerId,
      license.contentId
    );

    // Update license with certificate path
    license.certificatePath = certificatePath;
    await license.save();

    res.json({
      success: true,
      data: {
        licenseId: result.licenseId,
        purchasePrice: result.purchasePrice,
        certificatePath
      }
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  }
});

/**
 * POST /api/transactions/resale/list
 * List a license for resale
 */
router.post('/resale/list', async (req, res) => {
  try {
    const { licenseId, resalePrice } = req.body;

    if (!licenseId || !resalePrice) {
      return res.status(400).json({ 
        error: 'licenseId and resalePrice are required' 
      });
    }

    const license = await transactionService.listForResale(licenseId, resalePrice);

    res.json({
      success: true,
      data: license
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  }
});

/**
 * POST /api/transactions/resale/remove
 * Remove a license from resale
 */
router.post('/resale/remove', async (req, res) => {
  try {
    const { licenseId } = req.body;

    if (!licenseId) {
      return res.status(400).json({ 
        error: 'licenseId is required' 
      });
    }

    const license = await transactionService.removeFromResale(licenseId);

    res.json({
      success: true,
      data: license
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  }
});

/**
 * GET /api/transactions/certificate/:licenseId
 * Get certificate as JSON
 */
router.get('/certificate/:licenseId', async (req, res) => {
  try {
    const { licenseId } = req.params;

    const license = await LicenseRecord.findOne({ licenseId })
      .populate('buyerId')
      .populate('contentId');

    if (!license) {
      return res.status(404).json({ 
        error: 'License not found' 
      });
    }

    const certificate = await certificateService.generateJsonCertificate(
      license,
      license.buyerId,
      license.contentId
    );

    res.json({
      success: true,
      data: certificate
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  }
});

module.exports = router;
