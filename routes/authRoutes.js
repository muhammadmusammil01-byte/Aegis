const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { query } = require('../config/database');
const { generateToken, getDashboardPath } = require('../middleware/authMiddleware');

// Register new user
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('fullName').trim().notEmpty(),
  body('role').isIn(['center_admin', 'mentor', 'student'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, fullName, role, phone } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, ip_address) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING user_id, email, full_name, role, created_at`,
      [email, passwordHash, fullName, role, phone || null, req.ip]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        userId: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      },
      token,
      dashboardPath: getDashboardPath(user.role)
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const result = await query(
      'SELECT user_id, email, password_hash, full_name, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive. Please contact support.' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP, ip_address = $1 WHERE user_id = $2',
      [req.ip, user.user_id]
    );

    // Generate JWT token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: {
        userId: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      },
      token,
      dashboardPath: getDashboardPath(user.role)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Get current user info
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { verifyToken } = require('../middleware/authMiddleware');
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const result = await query(
      'SELECT user_id, email, full_name, role, phone, profile_image, created_at, last_login FROM users WHERE user_id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info', details: error.message });
  }
});

// Logout (client-side token removal, but we can log it)
router.post('/logout', (req, res) => {
  // In a stateless JWT system, logout is primarily handled client-side
  // But we can track it for analytics
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
