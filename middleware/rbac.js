/**
 * Role-Based Access Control (RBAC) Middleware
 * Handles JWT authentication and role authorization
 */

const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const db = require('../config/database');

/**
 * Verify JWT token and attach user to request
 */
const authenticateJWT = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, jwtConfig.secret);
    
    // Fetch user from database to ensure they still exist and are active
    const result = await db.query(
      'SELECT id, email, username, role, account_status, full_name FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid token. User not found.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    const user = result.rows[0];
    
    // Check if account is active
    if (user.account_status !== 'ACTIVE') {
      return res.status(403).json({ 
        error: `Account is ${user.account_status}. Please contact support.`,
        code: 'ACCOUNT_INACTIVE'
      });
    }
    
    // Attach user to request
    req.user = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      fullName: user.full_name
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    console.error('JWT authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication failed.',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Check if user has required role(s)
 * @param {...string} allowedRoles - Roles that are allowed
 * @returns {Function} Middleware function
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'NOT_AUTHENTICATED'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        code: 'FORBIDDEN',
        required: allowedRoles,
        current: req.user.role
      });
    }
    
    next();
  };
};

/**
 * Optional authentication - attaches user if token present but doesn't fail
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtConfig.secret);
    
    const result = await db.query(
      'SELECT id, email, username, role, account_status FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length > 0 && result.rows[0].account_status === 'ACTIVE') {
      req.user = {
        userId: result.rows[0].id,
        email: result.rows[0].email,
        username: result.rows[0].username,
        role: result.rows[0].role
      };
    }
    
    next();
  } catch (error) {
    // Silent fail - just continue without user
    next();
  }
};

/**
 * Check if user is System Admin
 */
const isSystemAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'SYSTEM_ADMIN') {
    return res.status(403).json({ 
      error: 'System Admin access required.',
      code: 'ADMIN_ONLY'
    });
  }
  next();
};

/**
 * Check if user is Center Admin
 */
const isCenterAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'CENTER_ADMIN') {
    return res.status(403).json({ 
      error: 'Center Admin access required.',
      code: 'CENTER_ADMIN_ONLY'
    });
  }
  next();
};

/**
 * Check if user is Mentor
 */
const isMentor = (req, res, next) => {
  if (!req.user || req.user.role !== 'MENTOR') {
    return res.status(403).json({ 
      error: 'Mentor access required.',
      code: 'MENTOR_ONLY'
    });
  }
  next();
};

/**
 * Check if user is Student
 */
const isStudent = (req, res, next) => {
  if (!req.user || req.user.role !== 'STUDENT') {
    return res.status(403).json({ 
      error: 'Student access required.',
      code: 'STUDENT_ONLY'
    });
  }
  next();
};

/**
 * Audit log middleware - logs all authenticated actions
 */
const auditLog = async (req, res, next) => {
  if (req.user) {
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.userId,
          `${req.method} ${req.path}`,
          req.baseUrl.split('/').pop(),
          req.ip,
          req.get('user-agent')
        ]
      );
    } catch (error) {
      console.error('Audit log error:', error);
      // Don't fail the request if audit logging fails
    }
  }
  next();
};

module.exports = {
  authenticateJWT,
  authorizeRoles,
  optionalAuth,
  isSystemAdmin,
  isCenterAdmin,
  isMentor,
  isStudent,
  auditLog
};
