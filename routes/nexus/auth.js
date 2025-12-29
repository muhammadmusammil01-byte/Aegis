/**
 * Authentication Routes
 * Handles login, registration, and token management
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/database');
const jwtConfig = require('../../config/jwt');
const { authenticateJWT } = require('../../middleware/rbac');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  const client = await db.getClient();
  
  try {
    const { email, username, password, role, fullName } = req.body;
    
    // Validation
    if (!email || !username || !password || !role) {
      return res.status(400).json({ 
        error: 'Email, username, password, and role are required.' 
      });
    }
    
    // Validate role
    const validRoles = ['SYSTEM_ADMIN', 'CENTER_ADMIN', 'MENTOR', 'STUDENT'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role. Must be one of: ' + validRoles.join(', ')
      });
    }
    
    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: 'User with this email or username already exists.' 
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Insert user
    await client.query('BEGIN');
    
    const result = await client.query(
      `INSERT INTO users (email, username, password_hash, role, full_name, account_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, username, role, full_name, created_at`,
      [email, username, passwordHash, role, fullName || username, 'ACTIVE']
    );
    
    const user = result.rows[0];
    
    // If Center Admin, create center entry
    if (role === 'CENTER_ADMIN') {
      await client.query(
        `INSERT INTO centers (admin_id, name, status)
         VALUES ($1, $2, $3)`,
        [user.id, `${fullName || username}'s Center`, 'PENDING_APPROVAL']
      );
    }
    
    // If Mentor, create mentor entry (without center initially)
    if (role === 'MENTOR') {
      await client.query(
        `INSERT INTO mentors (user_id, is_active)
         VALUES ($1, $2)`,
        [user.id, false]
      );
    }
    
    await client.query('COMMIT');
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        fullName: user.full_name
      },
      token
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed. Please try again.' 
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required.' 
      });
    }
    
    // Find user
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid email or password.' 
      });
    }
    
    const user = result.rows[0];
    
    // Check account status
    if (user.account_status !== 'ACTIVE') {
      return res.status(403).json({ 
        error: `Account is ${user.account_status}. Please contact support.` 
      });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid email or password.' 
      });
    }
    
    // Update last login
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP, last_ip_address = $1 WHERE id = $2',
      [req.ip, user.id]
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        fullName: user.full_name
      },
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed. Please try again.' 
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, email, username, role, full_name, profile_image_url, 
              bio, account_status, created_at, last_login
       FROM users 
       WHERE id = $1`,
      [req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user: result.rows[0]
    });
    
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', authenticateJWT, (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // Here we just confirm the action
  res.json({ 
    message: 'Logout successful. Please remove the token from client.' 
  });
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', authenticateJWT, (req, res) => {
  try {
    const newToken = jwt.sign(
      { userId: req.user.userId, role: req.user.role },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
    
    res.json({
      message: 'Token refreshed',
      token: newToken
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

module.exports = router;
