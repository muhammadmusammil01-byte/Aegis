const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ContentLink = require('../models/ContentLink');
const LicenseRecord = require('../models/LicenseRecord');

/**
 * GET /api/users
 * Get all users (admin only)
 */
router.get('/', async (req, res) => {
  try {
    const { role, status, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
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
 * POST /api/users
 * Create a new user
 */
router.post('/', async (req, res) => {
  try {
    const { email, username, role } = req.body;

    if (!email || !username) {
      return res.status(400).json({ 
        error: 'email and username are required' 
      });
    }

    const user = new User({
      email,
      username,
      role: role || 'Consumer'
    });

    await user.save();

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  }
});

/**
 * GET /api/users/:userId
 * Get user by ID
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  }
});

/**
 * PUT /api/users/:userId
 * Update user (role elevation, balance, status)
 */
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  }
});

/**
 * DELETE /api/users/:userId
 * Delete user (admin only)
 */
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  }
});

/**
 * GET /api/users/:userId/licenses
 * Get all licenses owned by a user
 */
router.get('/:userId/licenses', async (req, res) => {
  try {
    const { userId } = req.params;

    const licenses = await LicenseRecord.find({ buyerId: userId })
      .populate('contentId')
      .sort({ purchasedAt: -1 });

    res.json({
      success: true,
      data: licenses
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  }
});

/**
 * GET /api/users/:userId/content
 * Get all content created by a user
 */
router.get('/:userId/content', async (req, res) => {
  try {
    const { userId } = req.params;

    const contentLinks = await ContentLink.find({ originalCreatorId: userId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: contentLinks
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  }
});

module.exports = router;
