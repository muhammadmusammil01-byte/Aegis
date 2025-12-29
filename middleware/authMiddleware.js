const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nexushub-jwt-secret-change-in-production';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied. No token provided.',
      redirectTo: '/login.html'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    // Update last activity
    req.user.lastActivity = Date.now();
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired. Please login again.',
        redirectTo: '/login.html'
      });
    }
    
    return res.status(403).json({ 
      error: 'Invalid token.',
      redirectTo: '/login.html'
    });
  }
};

// Middleware to check user role
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        redirectTo: '/login.html'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        requiredRole: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Generate JWT token
const generateToken = (user) => {
  const payload = {
    userId: user.user_id,
    email: user.email,
    role: user.role,
    fullName: user.full_name
  };

  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
  });
};

// Verify and decode token without middleware
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Role-based dashboard redirect helper
const getDashboardPath = (role) => {
  const dashboardMap = {
    'system_admin': '/dashboards/system-admin.html',
    'center_admin': '/dashboards/center-admin.html',
    'mentor': '/dashboards/mentor.html',
    'student': '/dashboards/student.html'
  };
  
  return dashboardMap[role] || '/login.html';
};

module.exports = {
  authenticateToken,
  checkRole,
  generateToken,
  verifyToken,
  getDashboardPath,
  JWT_SECRET
};
