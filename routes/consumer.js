const express = require('express');
const router = express.Router();
const LicenseRecord = require('../models/LicenseRecord');
const { authenticateToken, checkRole } = require('../middleware/auth');

/**
 * GET /api/consumer/library
 * Get consumer's purchased licenses
 */
router.get('/library', authenticateToken, checkRole('Consumer', 'Creator', 'Distributor'), async (req, res) => {
  try {
    const userId = req.user._id;
    
    const licenses = await LicenseRecord.find({ buyerId: userId })
      .populate('contentId')
      .sort({ purchasedAt: -1 });
    
    res.json({
      success: true,
      data: licenses
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/consumer/dashboard
 * Get consumer dashboard statistics
 */
router.get('/dashboard', authenticateToken, checkRole('Consumer', 'Creator', 'Distributor'), async (req, res) => {
  try {
    const userId = req.user._id;
    
    const licenses = await LicenseRecord.find({ buyerId: userId });
    
    const totalSpent = licenses.reduce((sum, l) => sum + l.purchasePrice, 0);
    const resaleLicenses = licenses.filter(l => l.isForResale);
    const potentialRevenue = resaleLicenses.reduce((sum, l) => sum + l.resalePrice, 0);
    
    res.json({
      success: true,
      data: {
        totalLicenses: licenses.length,
        totalSpent,
        resaleListings: resaleLicenses.length,
        potentialRevenue,
        currentBalance: req.user.balance
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
