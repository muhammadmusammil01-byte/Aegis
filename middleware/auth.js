// Middleware for authentication and role-based access control

/**
 * Mock authentication middleware
 * In production, use JWT tokens or sessions
 */
function authenticateToken(req, res, next) {
  // For now, we'll accept userId from headers or query params
  // In production, validate JWT token here
  const userId = req.headers['x-user-id'] || req.query.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  req.userId = userId;
  next();
}

/**
 * Role-based access control middleware
 */
function checkRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const User = require('../models/User');
      const user = await User.findById(req.userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (user.status !== 'Active') {
        return res.status(403).json({ error: 'Account is not active' });
      }
      
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          error: 'Access denied. Insufficient permissions.',
          requiredRole: allowedRoles,
          userRole: user.role
        });
      }
      
      req.user = user;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Authorization error: ' + error.message });
    }
  };
}

/**
 * Get current user profile
 */
async function getCurrentUser(req, res) {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance,
        status: user.status,
        verifiedSocialHandles: user.verifiedSocialHandles
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  authenticateToken,
  checkRole,
  getCurrentUser
};
